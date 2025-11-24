"""Polling watcher for Operator Ingest."""
from __future__ import annotations

import json
import logging
import threading
from collections import deque
from pathlib import Path
from typing import Any, Callable, Deque, Dict, Optional, Tuple

from .config import Config, ensure_directories
from .jobs import Job, JobStatus, create_job, job_processed_dir, list_jobs, save_job
from .pipeline import Pipeline

logger = logging.getLogger(__name__)

QueueItem = Tuple[Job, Path, Optional[Dict[str, Any]], Optional[Path]]


class Watcher:
    def __init__(
        self,
        config: Config,
        pipeline: Pipeline,
        on_job_enqueued: Optional[Callable[[Job, Path], None]] = None,
    ):
        self.config = config
        self.pipeline = pipeline
        ensure_directories(config)
        self._queue: Deque[QueueItem] = deque()
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._paused = not config.auto_process_enabled
        self._lock = threading.Lock()
        self._last_job_summary: str = ""
        self._on_job_enqueued = on_job_enqueued

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Watcher started (paused=%s)", self._paused)

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
            logger.info("Watcher stopped")

    def pause(self) -> None:
        self._paused = True
        logger.info("Watcher paused")

    def resume(self) -> None:
        self._paused = False
        logger.info("Watcher resumed")

    def rescan_now(self) -> None:
        logger.info("Manual rescan requested")
        self._scan_inbox()

    @property
    def paused(self) -> bool:
        return self._paused

    @property
    def queued_jobs(self) -> int:
        with self._lock:
            return len(self._queue)

    def needs_review_count(self) -> int:
        jobs = list_jobs(self.config.jobs_path, status_filter=[JobStatus.NEEDS_REVIEW])
        return len(jobs)

    def last_job_summary(self) -> str:
        return self._last_job_summary

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            if not self._paused:
                self._scan_inbox()
                processed = self._process_next_job()
                if processed:
                    continue
            self._stop_event.wait(self.config.poll_interval_seconds)

    def _scan_inbox(self) -> None:
        allowed = {ext.lower() for ext in self.config.process_extensions}
        try:
            inbox_files = sorted(self.config.inbox_path.glob("*"))
        except FileNotFoundError:
            logger.error("Inbox path missing: %s", self.config.inbox_path)
            return
        for audio_file in inbox_files:
            if audio_file.is_dir():
                continue
            if audio_file.suffix.lower() not in allowed:
                continue
            job = create_job(audio_file.name)
            sidecar_path = self._find_sidecar(audio_file)
            metadata: Optional[Dict[str, Any]] = None
            staged_sidecar: Optional[Path] = None
            if sidecar_path:
                logger.info("Found sidecar %s for %s", sidecar_path.name, audio_file.name)
                loaded_metadata = parse_shortcut_metadata(sidecar_path)
                if loaded_metadata:
                    metadata = loaded_metadata
                staged_sidecar = self._stage_sidecar(sidecar_path, job)
            elif logger.isEnabledFor(logging.DEBUG):
                logger.debug("No sidecar found for %s", audio_file.name)

            working_target = self.config.working_path / f"{job.id}{audio_file.suffix.lower()}"
            working_target.parent.mkdir(parents=True, exist_ok=True)
            try:
                audio_file.replace(working_target)
            except OSError as exc:
                logger.error("Failed to move %s to working dir: %s", audio_file, exc)
                continue
            with self._lock:
                self._queue.append((job, working_target, metadata, staged_sidecar))
            logger.info("Enqueued job %s for %s", job.id, audio_file.name)
            if self._on_job_enqueued:
                try:
                    self._on_job_enqueued(job, working_target)
                except Exception as exc:  # pragma: no cover - callbacks external
                    logger.error("Job enqueue callback failed: %s", exc)

    def _process_next_job(self) -> bool:
        with self._lock:
            if not self._queue:
                return False
            job, staged_path, metadata, staged_sidecar = self._queue.popleft()
        try:
            self.pipeline.process_job(job, staged_path, metadata=metadata)
            self._move_staged_sidecar_to_job_dir(job, staged_sidecar)
            self._last_job_summary = f"{job.audio_filename} → {job.status}"
        except Exception as exc:  # pragma: no cover - runtime heavy
            job.status = JobStatus.ERROR
            job.error_message = str(exc)
            save_job(job, self.config.processed_path, self.config.jobs_path)
            self._move_staged_sidecar_to_job_dir(job, staged_sidecar)
            self._last_job_summary = f"{job.audio_filename} failed"
            logger.exception("Job %s failed: %s", job.id, exc)
            if staged_path.exists():
                staged_path.unlink(missing_ok=True)  # type: ignore[arg-type]
        return True

    def _move_staged_sidecar_to_job_dir(self, job: Job, staged_sidecar: Optional[Path]) -> None:
        if not staged_sidecar:
            return
        if not staged_sidecar.exists():
            logger.debug("Staged sidecar missing for job %s at %s", job.id, staged_sidecar)
            return
        job_dir = job_processed_dir(self.config.processed_path, job)
        job_dir.mkdir(parents=True, exist_ok=True)
        destination = job_dir / "shortcut_metadata.json"
        try:
            staged_sidecar.replace(destination)
            logger.info("Moved shortcut sidecar to %s for job %s", destination, job.id)
        except OSError as exc:
            logger.warning(
                "Failed to move sidecar %s for job %s to %s: %s",
                staged_sidecar,
                job.id,
                destination,
                exc,
            )

    def _stage_sidecar(self, sidecar_path: Path, job: Job) -> Optional[Path]:
        """Move a sidecar into the working directory so it is tracked with the job."""
        staged_path = self.config.working_path / f"{job.id}_shortcut_metadata{sidecar_path.suffix}"
        staged_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            sidecar_path.replace(staged_path)
            return staged_path
        except OSError as exc:
            logger.warning("Failed to move sidecar %s to working dir: %s", sidecar_path, exc)
            return None

    def _find_sidecar(self, audio_file: Path) -> Optional[Path]:
        """Prefer .json sidecars, fall back to .txt for legacy shortcuts."""
        for ext in (".json", ".txt"):
            candidate = audio_file.with_suffix(ext)
            if candidate.exists():
                return candidate
        return None


def parse_shortcut_metadata(path: Path) -> Optional[Dict[str, Any]]:
    """Parse metadata from the Shortcut sidecar file, logging on failure."""
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as exc:
        logger.warning("Shortcut metadata %s contained invalid JSON: %s", path, exc)
        return None
    except OSError as exc:
        logger.warning("Unable to read shortcut metadata %s: %s", path, exc)
        return None
    if not isinstance(data, dict):
        logger.warning("Shortcut metadata %s did not contain a JSON object", path)
        return None
    logger.info("Parsed shortcut metadata from %s", path.name)
    return data
