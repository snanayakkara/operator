"""Whisper transcription abstraction."""
from __future__ import annotations

import logging
import os
import shlex
import subprocess
from pathlib import Path
from typing import Any, Dict, Tuple

import requests


class WhisperClient:
    """Wrapper around either the local Whisper HTTP server or a CLI command."""

    def __init__(
        self,
        command_template: str | None = None,
        api_url: str | None = None,
        timeout: int = 120,
    ):
        self.command_template = command_template or os.environ.get("WHISPER_COMMAND")
        self.api_url = api_url
        self.timeout = timeout

    def transcribe(self, audio_path: Path) -> Tuple[str, Dict[str, Any]]:
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        http_error: Exception | None = None
        if self.api_url:
            try:
                return self._transcribe_via_http(audio_path)
            except Exception as exc:  # pragma: no cover - depends on runtime services
                logging.getLogger(__name__).warning(
                    "Whisper HTTP API failed (%s), falling back to CLI if available", exc
                )
                http_error = exc

        if self.command_template:
            return self._transcribe_via_command(audio_path)

        if http_error:
            raise http_error

        logging.getLogger(__name__).warning(
            "No Whisper API URL or command configured; returning placeholder transcript for %s",
            audio_path,
        )
        return (
            f"TRANSCRIPT_PLACEHOLDER for {audio_path.name}",
            {"engine": "placeholder", "audio": str(audio_path)},
        )

    def _transcribe_via_http(self, audio_path: Path) -> Tuple[str, Dict[str, Any]]:
        logging.getLogger(__name__).info("Sending audio to Whisper HTTP API: %s", self.api_url)
        with audio_path.open("rb") as fh:
            files = {"file": (audio_path.name, fh, "application/octet-stream")}
            response = requests.post(
                self.api_url,
                files=files,
                data={"response_format": "json"},
                timeout=self.timeout,
            )
        response.raise_for_status()
        payload = response.json()
        transcript = payload.get("text", "").strip()
        metadata = {
            "engine": "http",
            "api_url": self.api_url,
            "duration": payload.get("duration"),
            "model": payload.get("model"),
        }
        return transcript, metadata

    def _transcribe_via_command(self, audio_path: Path) -> Tuple[str, Dict[str, Any]]:
        command = self.command_template.format(audio=str(audio_path))
        logging.getLogger(__name__).info("Running Whisper command: %s", command)
        try:
            completed = subprocess.run(
                shlex.split(command),
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            logging.getLogger(__name__).error("Whisper command failed: %s", exc.stderr)
            raise RuntimeError(f"Whisper transcription failed: {exc.stderr}") from exc

        transcript = completed.stdout.strip()
        metadata = {"engine": "command", "command": command}
        return transcript, metadata
