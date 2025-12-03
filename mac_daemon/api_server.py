"""Simple HTTP server exposing processed job metadata to the Chrome extension."""
from __future__ import annotations

import json
import logging
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

from .config import Config
from .jobs import Job, load_job, list_jobs, save_job, job_processed_dir
from .rounds_backend import RoundsBackend

logger = logging.getLogger(__name__)


def _read_transcript(job: Job) -> str:
    if not job.transcript_path:
        return ""
    path = Path(job.transcript_path)
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except Exception as exc:  # pragma: no cover - filesystem dependent
        logger.error("Failed to read transcript for %s: %s", job.id, exc)
        return ""


def _job_preview(job: Job, max_chars: int = 600) -> str:
    text = _read_transcript(job)
    if not text:
        return ""
    return text[:max_chars]


def _job_summary(job: Job) -> Dict[str, object]:
    return {
        "id": job.id,
        "created_at": job.created_at,
        "audio_filename": job.audio_filename,
        "job_type": getattr(job, "job_type", None),
        "status": job.status,
        "dictation_type": job.dictation_type,
        "confidence": job.confidence,
        "header_text": job.header_text,
        "triage_metadata": job.triage_metadata,
        "workflow_code": job.workflow_code,
        "workflow_label": job.workflow_label,
        "attached_session_id": job.triage_metadata.get("attached_session_id")
        if isinstance(job.triage_metadata, dict)
        else None,
        "attached_at": job.triage_metadata.get("attached_at")
        if isinstance(job.triage_metadata, dict)
        else None,
        "transcript_available": bool(job.transcript_path and Path(job.transcript_path).exists()),
        "transcript_preview": _job_preview(job),
    }


class JobAPIServer:
    """Exposes processed job metadata on a localhost HTTP endpoint."""

    def __init__(self, config: Config, rounds_backend: Optional[RoundsBackend] = None):
        self.config = config
        self.rounds_backend = rounds_backend or RoundsBackend(config)
        self._server: Optional[ThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if self._server:
            return
        handler = self._create_handler()
        try:
            self._server = ThreadingHTTPServer((self.config.api_host, self.config.api_port), handler)
        except OSError as exc:
            logger.error("Failed to start job API server on %s:%s - %s", self.config.api_host, self.config.api_port, exc)
            return
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        logger.info("Job API server started on http://%s:%s", self.config.api_host, self.config.api_port)

    def stop(self) -> None:
        if self._server:
            logger.info("Stopping Job API server")
            self._server.shutdown()
            self._server.server_close()
            self._server = None
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None

    def _create_handler(self) -> Callable:
        server = self

        class RequestHandler(BaseHTTPRequestHandler):
            def _set_headers(self, status: int = 200, content_type: str = "application/json") -> None:
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.end_headers()

            def do_OPTIONS(self):  # noqa: N802
                self._set_headers(204)

            def do_GET(self):  # noqa: N802
                parsed = urlparse(self.path)
                if parsed.path == "/health":
                    self._set_headers()
                    self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
                    return
                if parsed.path == "/rounds/patients":
                    self._handle_list_patients()
                    return
                if parsed.path == "/jobs":
                    self._handle_list_jobs()
                    return
                if parsed.path.startswith("/jobs/"):
                    job_id = parsed.path.split("/jobs/")[-1]
                    if job_id:
                        self._handle_get_job(job_id)
                        return
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

            def do_POST(self):  # noqa: N802
                parsed = urlparse(self.path)
                if parsed.path == "/rounds/patients":
                    self._handle_save_patients()
                    return
                if parsed.path == "/rounds/patients/quick_add":
                    self._handle_quick_add_patient()
                    return
                if parsed.path.startswith("/jobs/") and parsed.path.endswith("/attach"):
                    job_id = parsed.path.split("/jobs/")[-1].rsplit("/attach", 1)[0]
                    self._handle_attach_job(job_id)
                    return
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

            def _handle_list_jobs(self) -> None:
                jobs = list_jobs(server.config.jobs_path)
                summaries = [_job_summary(job) for job in jobs]
                self._set_headers()
                self.wfile.write(json.dumps({"jobs": summaries}).encode("utf-8"))

            def _handle_get_job(self, job_id: str) -> None:
                job = load_job(job_id, server.config.jobs_path)
                if not job:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({"error": "Job not found"}).encode("utf-8"))
                    return
                detail = _job_summary(job)
                detail["transcript_text"] = _read_transcript(job)
                self._set_headers()
                self.wfile.write(json.dumps(detail).encode("utf-8"))

            def _handle_attach_job(self, job_id: str) -> None:
                job = load_job(job_id, server.config.jobs_path)
                if not job:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({"error": "Job not found"}).encode("utf-8"))
                    return
                length = int(self.headers.get("Content-Length", "0"))
                payload = {}
                if length:
                    body = self.rfile.read(length)
                    try:
                        payload = json.loads(body)
                    except json.JSONDecodeError:
                        payload = {}
                session_id = payload.get("session_id")
                patient_name = payload.get("patient_name")
                agent_type = payload.get("agent_type")
                if not session_id:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({"error": "session_id is required"}).encode("utf-8"))
                    return
                job.triage_metadata = job.triage_metadata or {}
                job.triage_metadata["attached_session_id"] = session_id
                if patient_name:
                    job.triage_metadata["attached_patient_name"] = patient_name
                if agent_type:
                    job.triage_metadata["selected_agent_type"] = agent_type
                job.triage_metadata["attached_at"] = datetime.utcnow().isoformat() + "Z"
                save_job(job, server.config.processed_path, server.config.jobs_path)
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))

            def _read_json_body(self) -> Dict[str, Any]:
                length = int(self.headers.get("Content-Length", "0"))
                if not length:
                    return {}
                try:
                    raw = self.rfile.read(length)
                    return json.loads(raw.decode("utf-8"))
                except Exception:
                    return {}

            def _handle_list_patients(self) -> None:
                try:
                    patients = server.rounds_backend.load_patients()
                except Exception as exc:  # pragma: no cover - runtime heavy
                    logger.error("Failed to load rounds patients: %s", exc)
                    self._set_headers(500)
                    self.wfile.write(json.dumps({"error": "Failed to load patients"}).encode("utf-8"))
                    return
                self._set_headers()
                self.wfile.write(json.dumps({"patients": patients}).encode("utf-8"))

            def _handle_save_patients(self) -> None:
                payload = self._read_json_body()
                patients = payload.get("patients")
                if not isinstance(patients, list):
                    self._set_headers(400)
                    self.wfile.write(json.dumps({"error": "patients must be a list"}).encode("utf-8"))
                    return
                try:
                    server.rounds_backend.save_patients(patients)
                except Exception as exc:  # pragma: no cover - runtime heavy
                    logger.error("Failed to save rounds patients: %s", exc)
                    self._set_headers(500)
                    self.wfile.write(json.dumps({"error": "Failed to save patients"}).encode("utf-8"))
                    return
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))

            def _handle_quick_add_patient(self) -> None:
                payload = self._read_json_body()
                name = (payload.get("name") or "").strip()
                scratchpad = payload.get("scratchpad") or ""
                ward = payload.get("ward")
                if not name:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({"error": "name is required"}).encode("utf-8"))
                    return
                try:
                    patient = server.rounds_backend.quick_add_patient(name, scratchpad, ward)
                except ValueError as exc:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
                    return
                except Exception as exc:  # pragma: no cover - runtime heavy
                    logger.error("Quick add patient failed: %s", exc)
                    self._set_headers(500)
                    self.wfile.write(json.dumps({"error": "Failed to add patient"}).encode("utf-8"))
                    return
                self._set_headers(200)
                self.wfile.write(json.dumps({"patient": patient}).encode("utf-8"))

            def do_DELETE(self):  # noqa: N802
                parsed = urlparse(self.path)
                if parsed.path.startswith("/jobs/"):
                    job_id = parsed.path.split("/jobs/")[-1]
                    if job_id:
                        self._handle_delete_job(job_id)
                        return
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

            def _handle_delete_job(self, job_id: str) -> None:
                job = load_job(job_id, server.config.jobs_path)
                if not job:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({"error": "Job not found"}).encode("utf-8"))
                    return
                processed_dir = job_processed_dir(server.config.processed_path, job)
                for path in [
                    processed_dir / "job.json",
                    processed_dir / job.audio_filename,
                    processed_dir / "transcript.txt",
                    processed_dir / "outputs",
                ]:
                    if path.exists():
                        if path.is_dir():
                            import shutil
                            shutil.rmtree(path, ignore_errors=True)
                        else:
                            path.unlink(missing_ok=True)  # type: ignore[attr-defined]
                mirror = server.config.jobs_path / f"{job.id}.json"
                mirror.unlink(missing_ok=True)  # type: ignore[attr-defined]
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "deleted"}).encode("utf-8"))

            def log_message(self, format: str, *args) -> None:  # noqa: A003
                logger.debug("Job API: " + format, *args)

        return RequestHandler
