import json
from pathlib import Path

import pytest

from mac_daemon.config import Config, ensure_directories
from mac_daemon.jobs import JobStatus, JobType, list_jobs
from mac_daemon.pipeline import Pipeline
from mac_daemon.rounds_backend import RoundsBackend
from mac_daemon.watcher import Watcher


class DummyWhisper:
    def transcribe(self, _path):
        return "", {}


class DummyLM:
    def chat(self, _system, _prompt, temperature: float | None = None):
        return "{}"


def build_config(tmp_path: Path, default_ward: str = "1 South") -> Config:
    return Config(
        inbox_path=tmp_path / "inbox",
        working_path=tmp_path / "working",
        processed_path=tmp_path / "processed",
        jobs_path=tmp_path / "jobs",
        rounds_patients_path=tmp_path / "rounds_patients.json",
        default_rounds_ward=default_ward,
        process_extensions=[".m4a"],
    )


def build_watcher(tmp_path: Path, backend: RoundsBackend | None = None, default_ward: str = "1 South") -> tuple[Watcher, RoundsBackend]:
    config = build_config(tmp_path, default_ward=default_ward)
    ensure_directories(config)
    rounds_backend = backend or RoundsBackend(config)
    pipeline = Pipeline(config, DummyWhisper(), DummyLM(), rounds_backend=rounds_backend)
    watcher = Watcher(config, pipeline)
    return watcher, rounds_backend


def write_phone_note_files(inbox: Path, base: str, metadata: dict, text: str) -> None:
    inbox.mkdir(parents=True, exist_ok=True)
    (inbox / f"{base}_phone-note.json").write_text(json.dumps(metadata), encoding="utf-8")
    (inbox / f"{base}_phone-note.txt").write_text(text, encoding="utf-8")


def test_phone_call_note_creates_patient(tmp_path: Path):
    watcher, backend = build_watcher(tmp_path)
    note_text = "Patient Smith called regarding angina symptoms."
    write_phone_note_files(
        watcher.config.inbox_path,
        "2025-12-03T21-20-15",
        {
            "version": 1,
            "type": "phone_call_note",
            "source": "shortcut-text",
            "created_at": "2025-12-03T21:20:15+11:00",
            "clinician": "Shane",
            "patient_hint": "Smith, angina phone call",
            "ward": "1 South",
            "intended_agent": "consultation",
            "status": "pending",
        },
        note_text,
    )

    watcher._scan_inbox()
    assert watcher._process_next_job() is True

    patients = backend.load_patients()
    assert len(patients) == 1
    assert patients[0]["name"] == "Smith, angina phone call"
    assert patients[0]["site"] == "1 South"
    assert patients[0]["intakeNotes"][0]["text"] == note_text

    jobs = list_jobs(watcher.config.jobs_path)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.job_type == JobType.PHONE_CALL_NOTE
    assert job.status == JobStatus.COMPLETED
    assert job.dictation_type == "note"
    assert job.triage_metadata.get("rounds_patient_id")
    assert Path(job.transcript_path).read_text(encoding="utf-8") == note_text


def test_skips_until_text_exists(tmp_path: Path):
    watcher, backend = build_watcher(tmp_path)
    watcher.config.inbox_path.mkdir(parents=True, exist_ok=True)
    (watcher.config.inbox_path / "missing_phone-note.json").write_text(
        json.dumps({"type": "phone_call_note", "patient_hint": "Pending"}), encoding="utf-8"
    )

    watcher._scan_inbox()
    assert watcher._process_next_job() is False
    assert backend.load_patients() == []
    assert list_jobs(watcher.config.jobs_path) == []


def test_invalid_json_marks_job_error(tmp_path: Path):
    watcher, backend = build_watcher(tmp_path)
    inbox = watcher.config.inbox_path
    inbox.mkdir(parents=True, exist_ok=True)
    (inbox / "bad_phone-note.json").write_text("{ this is not json", encoding="utf-8")
    (inbox / "bad_phone-note.txt").write_text("notes", encoding="utf-8")

    watcher._scan_inbox()
    assert watcher._process_next_job() is True

    patients = backend.load_patients()
    assert patients == []
    jobs = list_jobs(watcher.config.jobs_path)
    assert len(jobs) == 1
    assert jobs[0].status == JobStatus.ERROR


def test_ward_fallback(tmp_path: Path):
    watcher, backend = build_watcher(tmp_path, default_ward="Fallback Ward")
    write_phone_note_files(
        watcher.config.inbox_path,
        "no-ward",
        {"type": "phone_call_note", "patient_hint": "Fallback Patient"},
        "note text",
    )
    watcher._scan_inbox()
    watcher._process_next_job()

    patients = backend.load_patients()
    assert patients[0]["site"] == "Fallback Ward"


class FailingBackend(RoundsBackend):
    def __init__(self, config: Config):
        super().__init__(config)

    def quick_add_patient(self, name: str, scratchpad: str = "", ward: str | None = None):
        raise RuntimeError("backend failure")


def test_backend_failure_sets_job_error(tmp_path: Path):
    failing_backend = FailingBackend(build_config(tmp_path))
    watcher, _ = build_watcher(tmp_path, backend=failing_backend)
    write_phone_note_files(
        watcher.config.inbox_path,
        "failing",
        {"type": "phone_call_note", "patient_hint": "Error Patient"},
        "note text",
    )

    watcher._scan_inbox()
    assert watcher._process_next_job() is True

    jobs = list_jobs(watcher.config.jobs_path)
    assert len(jobs) == 1
    assert jobs[0].status == JobStatus.ERROR
    assert jobs[0].error_message
