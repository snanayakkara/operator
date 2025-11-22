"""Configuration handling for Operator Ingest."""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import List, Optional

CONFIG_DIR = Path.home() / "OperatorIngest"
CONFIG_FILE = CONFIG_DIR / "config.json"
LOG_DIR = CONFIG_DIR / "logs"
def _inbox_candidates() -> List[Path]:
    home = Path.home()
    return [
        home / "Library" / "Mobile Documents" / "com~apple~CloudDocs" / "Operator" / "Inbox",
        home / "Library" / "CloudStorage" / "iCloud Drive" / "Operator" / "Inbox",
    ]


def _path_has_entries(path: Path) -> bool:
    try:
        next(path.iterdir())
        return True
    except (StopIteration, FileNotFoundError, PermissionError):
        return False


def _detect_default_inbox(preferred: Optional[Path] = None) -> Path:
    candidates = _inbox_candidates()
    expanded_preferred = preferred.expanduser() if preferred else None
    if expanded_preferred and str(expanded_preferred) not in {str(p) for p in candidates}:
        candidates.insert(0, expanded_preferred)
    else:
        mobile_candidate = candidates[0]
        cloud_candidate = candidates[1] if len(candidates) > 1 else None
        if (
            expanded_preferred
            and cloud_candidate
            and expanded_preferred == cloud_candidate
            and not _path_has_entries(cloud_candidate)
            and _path_has_entries(mobile_candidate)
        ):
            return mobile_candidate
    seen: set[str] = set()
    for candidate in candidates:
        cand = candidate.expanduser()
        key = str(cand)
        if key in seen:
            continue
        seen.add(key)
        try:
            if cand.exists():
                return cand
        except OSError:
            continue
    return candidates[0]


DEFAULT_INBOX = _detect_default_inbox()


def _default_extensions() -> List[str]:
    return [".m4a", ".wav", ".mp3", ".aac"]


@dataclass
class Config:
    inbox_path: Path = DEFAULT_INBOX
    working_path: Path = CONFIG_DIR / "working"
    processed_path: Path = CONFIG_DIR / "processed"
    jobs_path: Path = CONFIG_DIR / "jobs"
    lm_base_url: str = "http://localhost:1234/v1/chat/completions"
    lm_model: str = "local-operator-triage"
    process_extensions: List[str] = field(default_factory=_default_extensions)
    poll_interval_seconds: int = 10
    auto_process_enabled: bool = True
    auto_run_agents_on_high_confidence: bool = False
    high_confidence_threshold: float = 0.85
    medium_confidence_threshold: float = 0.5
    launch_at_login: bool = False
    whisper_command: str = ""
    whisper_api_url: str = "http://localhost:8001/v1/audio/transcriptions"
    api_host: str = "127.0.0.1"
    api_port: int = 5858

    def to_dict(self) -> dict:
        data = asdict(self)
        # Convert Paths to strings for serialization
        for key in ("inbox_path", "working_path", "processed_path", "jobs_path"):
            data[key] = str(data[key])
        return data

    @staticmethod
    def from_dict(data: dict) -> "Config":
        # Allow Path or str in JSON
        def get_path(key: str, default: Path) -> Path:
            raw = data.get(key)
            if raw:
                return Path(raw).expanduser()
            return default

        preferred_inbox = get_path("inbox_path", DEFAULT_INBOX)
        resolved_inbox = _detect_default_inbox(preferred_inbox)
        return Config(
            inbox_path=resolved_inbox,
            working_path=get_path("working_path", CONFIG_DIR / "working"),
            processed_path=get_path("processed_path", CONFIG_DIR / "processed"),
            jobs_path=get_path("jobs_path", CONFIG_DIR / "jobs"),
            lm_base_url=data.get("lm_base_url", "http://localhost:1234/v1/chat/completions"),
            lm_model=data.get("lm_model", "local-operator-triage"),
            process_extensions=data.get("process_extensions") or _default_extensions(),
            poll_interval_seconds=int(data.get("poll_interval_seconds", 10)),
            auto_process_enabled=bool(data.get("auto_process_enabled", True)),
            auto_run_agents_on_high_confidence=bool(
                data.get("auto_run_agents_on_high_confidence", False)
            ),
            high_confidence_threshold=float(data.get("high_confidence_threshold", 0.85)),
            medium_confidence_threshold=float(data.get("medium_confidence_threshold", 0.5)),
            launch_at_login=bool(data.get("launch_at_login", False)),
            whisper_command=str(data.get("whisper_command", "")),
            whisper_api_url=str(
                data.get("whisper_api_url", "http://localhost:8001/v1/audio/transcriptions")
            ),
            api_host=data.get("api_host", "127.0.0.1"),
            api_port=int(data.get("api_port", 5858)),
        )


def ensure_directories(config: Config) -> None:
    for path in [
        CONFIG_DIR,
        LOG_DIR,
        config.inbox_path,
        config.working_path,
        config.processed_path,
        config.jobs_path,
    ]:
        path.expanduser().mkdir(parents=True, exist_ok=True)


def load_config() -> Config:
    config_data: Optional[dict] = None
    if CONFIG_FILE.exists():
        with CONFIG_FILE.open("r", encoding="utf-8") as fh:
            config_data = json.load(fh)
        config = Config.from_dict(config_data)
    else:
        config = Config()
        save_config(config)
    ensure_directories(config)
    if config_data:
        raw_inbox = config_data.get("inbox_path")
        if raw_inbox and Path(raw_inbox).expanduser() != config.inbox_path:
            logging.getLogger(__name__).info(
                "Updating inbox_path to detected location: %s", config.inbox_path
            )
            save_config(config)
    logging.getLogger(__name__).debug("Config loaded: %s", config)
    return config


def save_config(config: Config) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with CONFIG_FILE.open("w", encoding="utf-8") as fh:
        json.dump(config.to_dict(), fh, indent=2)
