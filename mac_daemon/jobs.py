"""Job data model and persistence helpers for Operator Ingest."""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

ISO_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"


class JobStatus:
    PENDING = "pending"
    TRANSCRIBED = "transcribed"
    TRIAGED = "triaged"
    COMPLETED = "completed"
    NEEDS_REVIEW = "needs_review"
    ERROR = "error"


class JobType:
    AUDIO_DICTATION = "audio_dictation"
    PHONE_CALL_NOTE = "phone_call_note"


class DictationType:
    CLINIC_LETTER = "clinic_letter"
    PROCEDURE_REPORT = "procedure_report"
    ECHO_REPORT = "echo_report"
    TASK = "task"
    NOTE = "note"
    UNKNOWN = "unknown"


@dataclass
class Job:
    id: str
    created_at: str
    audio_filename: str
    job_type: str = JobType.AUDIO_DICTATION
    status: str = JobStatus.PENDING
    dictation_type: str = DictationType.UNKNOWN
    confidence: float = 0.0
    header_text: str = ""
    triage_metadata: Dict[str, Any] = field(default_factory=dict)
    workflow_code: Optional[str] = None
    workflow_label: Optional[str] = None
    external_created_at: Optional[str] = None
    source: Optional[str] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    audio_path: Optional[str] = None
    transcript_path: Optional[str] = None
    pipeline_outputs_path: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Job":
        if "job_type" not in data:
            data = {**data, "job_type": JobType.AUDIO_DICTATION}
        return Job(**data)


def create_job(audio_filename: str, job_id: str | None = None, job_type: str = JobType.AUDIO_DICTATION) -> Job:
    if job_id is None:
        job_id = _generate_job_id()
    timestamp = datetime.utcnow().strftime(ISO_FORMAT)
    return Job(id=job_id, created_at=timestamp, audio_filename=audio_filename, job_type=job_type)


def _generate_job_id() -> str:
    import uuid

    return str(uuid.uuid4())


def job_processed_dir(processed_root: Path, job: Job) -> Path:
    created = datetime.strptime(job.created_at, ISO_FORMAT)
    dated_dir = processed_root / f"{created.year:04d}" / f"{created.month:02d}" / f"{created.day:02d}"
    return dated_dir / job.id


def save_job(job: Job, processed_root: Path, jobs_root: Path) -> Path:
    """Persist job state inside processed directory and mirror JSON under jobs_root."""
    processed_dir = job_processed_dir(processed_root, job)
    processed_dir.mkdir(parents=True, exist_ok=True)
    job_json_path = processed_dir / "job.json"
    with job_json_path.open("w", encoding="utf-8") as fh:
        json.dump(job.to_dict(), fh, indent=2)
    jobs_root.mkdir(parents=True, exist_ok=True)
    mirror_path = jobs_root / f"{job.id}.json"
    with mirror_path.open("w", encoding="utf-8") as fh:
        json.dump(job.to_dict(), fh, indent=2)
    logging.getLogger(__name__).debug("Saved job %s", job.id)
    return job_json_path


def load_job(job_id: str, jobs_root: Path) -> Optional[Job]:
    path = jobs_root / f"{job_id}.json"
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return Job.from_dict(data)


def list_jobs(jobs_root: Path, status_filter: Optional[List[str]] = None) -> List[Job]:
    jobs: List[Job] = []
    if not jobs_root.exists():
        return jobs
    for json_file in sorted(jobs_root.glob("*.json")):
        try:
            with json_file.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
            job = Job.from_dict(data)
            if status_filter and job.status not in status_filter:
                continue
            jobs.append(job)
        except Exception as exc:  # pragma: no cover - defensive
            logging.getLogger(__name__).error("Failed to load job file %s: %s", json_file, exc)
    return jobs
