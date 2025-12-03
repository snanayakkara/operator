"""Shared backend storage for Rounds patients."""
from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import Config

_ROUNDS_LOCK = threading.Lock()


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _generate_id(prefix: str) -> str:
    import uuid

    return f"{prefix}-{uuid.uuid4()}"


def _load_json_array(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


class RoundsBackend:
    """Minimal persistence layer shared between the UI and daemon ingestion."""

    def __init__(self, config: Config):
        self.path = config.rounds_patients_path
        self.default_ward = config.default_rounds_ward
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load_patients(self) -> List[Dict[str, Any]]:
        with _ROUNDS_LOCK:
            return _load_json_array(self.path)

    def save_patients(self, patients: List[Dict[str, Any]]) -> None:
        payload = patients if isinstance(patients, list) else []
        with _ROUNDS_LOCK:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2)

    def quick_add_patient(
        self, name: str, scratchpad: str = "", ward: Optional[str] = None
    ) -> Dict[str, Any]:
        if not name.strip():
            raise ValueError("Patient name is required")
        now = _now_iso()
        patient = {
            "id": _generate_id("patient"),
            "name": name.strip(),
            "mrn": "",
            "bed": "",
            "oneLiner": "",
            "status": "active",
            "site": (ward or self.default_ward or "").strip() or "Cabrini",
            "createdAt": now,
            "lastUpdatedAt": now,
            "roundOrder": None,
            "hudEnabled": True,
            "markedForTeaching": False,
            "tags": [],
            "intakeNotes": [],
            "issues": [],
            "investigations": [],
            "tasks": [],
            "wardEntries": [],
            "roundCompletedDate": None,
        }
        scratch = scratchpad.strip()
        if scratch:
            patient["intakeNotes"].append(
                {
                    "id": _generate_id("intake"),
                    "timestamp": now,
                    "text": scratch,
                }
            )
        with _ROUNDS_LOCK:
            patients = _load_json_array(self.path)
            patients.append(patient)
            self.save_patients(patients)
        return patient
