"""Entry point for Operator Ingest menubar app."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Optional

import rumps

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent.parent))

from mac_daemon.config import Config, CONFIG_FILE, load_config, save_config  # type: ignore  # noqa: E402
from mac_daemon.lm_client import LMClient  # type: ignore  # noqa: E402
from mac_daemon.logging_utils import configure_logging  # type: ignore  # noqa: E402
from mac_daemon.pipeline import Pipeline  # type: ignore  # noqa: E402
from mac_daemon.watcher import Watcher  # type: ignore  # noqa: E402
from mac_daemon.whisper_client import WhisperClient  # type: ignore  # noqa: E402
from mac_daemon.api_server import JobAPIServer  # type: ignore  # noqa: E402
from mac_daemon.rounds_backend import RoundsBackend  # type: ignore  # noqa: E402

APP_VERSION = "0.1.0"


class OperatorIngestApp(rumps.App):
    def __init__(self):
        super().__init__("OI", icon=None, template=True, quit_button=None)
        configure_logging()
        self.config: Config = load_config()
        self.rounds_backend = RoundsBackend(self.config)
        self.whisper = WhisperClient(
            command_template=self.config.whisper_command or None,
            api_url=self.config.whisper_api_url or None,
        )
        self.lm_client = LMClient(self.config.lm_base_url, self.config.lm_model)
        self.pipeline = Pipeline(self.config, self.whisper, self.lm_client, rounds_backend=self.rounds_backend)
        self.watcher = Watcher(self.config, self.pipeline, on_job_enqueued=self._handle_job_enqueued)
        self.api_server = JobAPIServer(self.config, rounds_backend=self.rounds_backend)

        self.status_item = rumps.MenuItem("Status: Initializing")
        self.queue_item = rumps.MenuItem("Queued jobs: 0")
        self.review_item = rumps.MenuItem("Needs review: 0")
        self.last_job_item = rumps.MenuItem("Last job: —")

        self.process_item = rumps.MenuItem("Process Inbox Now", callback=self.handle_process_now)
        self.pause_item = rumps.MenuItem("Pause Processing", callback=self.toggle_pause)
        self.open_jobs_item = rumps.MenuItem("Open Jobs Folder", callback=self.open_jobs_folder)

        self.preferences_menu = rumps.MenuItem("Preferences")
        self.auto_process_item = rumps.MenuItem("Enable automatic processing", callback=self.toggle_auto_process)
        self.auto_run_item = rumps.MenuItem(
            "Auto-run agents on high confidence", callback=self.toggle_auto_run_agents
        )
        self.launch_login_item = rumps.MenuItem(
            "Launch at login (configure manually)", callback=self.toggle_launch_at_login
        )
        self.edit_lm_item = rumps.MenuItem("Update LM Settings…", callback=self.show_preferences_window)
        self.open_config_item = rumps.MenuItem("Open config.json", callback=self.open_config_file)
        self.preferences_menu.menu = [
            self.auto_process_item,
            self.auto_run_item,
            self.launch_login_item,
            self.edit_lm_item,
            self.open_config_item,
        ]

        self.menu = [
            self.status_item,
            self.queue_item,
            self.review_item,
            self.last_job_item,
            rumps.separator,
            self.process_item,
            self.pause_item,
            self.open_jobs_item,
            self.preferences_menu,
            rumps.separator,
            rumps.MenuItem("Quit", callback=self.handle_quit),
        ]

        self._update_toggle_states()
        self.watcher.start()
        self.api_server.start()
        self.update_timer = rumps.Timer(self._update_status, 5)
        self.update_timer.start()
        self._update_status()

    def _update_toggle_states(self) -> None:
        self.auto_process_item.state = int(self.config.auto_process_enabled)
        self.auto_run_item.state = int(self.config.auto_run_agents_on_high_confidence)
        self.launch_login_item.state = int(self.config.launch_at_login)
        self.pause_item.title = "Resume Processing" if self.watcher.paused else "Pause Processing"

    def _update_status(self, _sender: Optional[object] = None) -> None:
        queued = self.watcher.queued_jobs
        needs_review = self.watcher.needs_review_count()
        status = "Paused" if self.watcher.paused else ("Processing" if queued else "Idle")
        self.title = f"OI {queued}" if queued else "OI"
        self.status_item.title = f"Status: {status}"
        self.queue_item.title = f"Queued jobs: {queued}"
        self.review_item.title = f"Needs review: {needs_review}"
        self.last_job_item.title = f"Last job: {self.watcher.last_job_summary() or '—'}"

    def handle_process_now(self, _sender: rumps.MenuItem) -> None:
        self.watcher.rescan_now()
        self._update_status()

    def toggle_pause(self, _sender: rumps.MenuItem) -> None:
        if self.watcher.paused:
            self.watcher.resume()
            self.config.auto_process_enabled = True
        else:
            self.watcher.pause()
            self.config.auto_process_enabled = False
        save_config(self.config)
        self._update_toggle_states()

    def _handle_job_enqueued(self, job, _staged_path) -> None:
        subtitle = f"Processing {job.audio_filename}"
        rumps.notification("Operator Ingest", subtitle, "Queued for transcription")

    def toggle_auto_process(self, _sender: rumps.MenuItem) -> None:
        self.config.auto_process_enabled = not self.config.auto_process_enabled
        save_config(self.config)
        if self.config.auto_process_enabled:
            self.watcher.resume()
        else:
            self.watcher.pause()
        self._update_toggle_states()

    def _set_auto_run_agents(self, enabled: bool) -> None:
        self.config.auto_run_agents_on_high_confidence = enabled
        save_config(self.config)
        self._update_toggle_states()

    def toggle_auto_run_agents(self, _sender: rumps.MenuItem) -> None:
        self._set_auto_run_agents(not self.config.auto_run_agents_on_high_confidence)

    def toggle_launch_at_login(self, _sender: rumps.MenuItem) -> None:
        self.config.launch_at_login = not self.config.launch_at_login
        save_config(self.config)
        self._update_toggle_states()

    def open_jobs_folder(self, _sender: rumps.MenuItem) -> None:
        subprocess.Popen(["open", str(self.config.jobs_path)])

    def open_config_file(self, _sender: rumps.MenuItem) -> None:
        subprocess.Popen(["open", str(CONFIG_FILE)])

    def _reinitialize_clients(self) -> None:
        self.lm_client = LMClient(self.config.lm_base_url, self.config.lm_model)
        self.pipeline.lm = self.lm_client
        self.whisper = WhisperClient(
            command_template=self.config.whisper_command or None,
            api_url=self.config.whisper_api_url or None,
        )
        self.pipeline.whisper = self.whisper

    def show_preferences_window(self, _sender: rumps.MenuItem) -> None:
        message = (
            f"Inbox: {self.config.inbox_path}\n"
            f"Working: {self.config.working_path}\n"
            f"Processed: {self.config.processed_path}\n"
            f"Jobs: {self.config.jobs_path}\n"
            f"Whisper API: {self.config.whisper_api_url or 'disabled'}\n"
            f"Whisper command: {self.config.whisper_command or '(env WHISPER_COMMAND / http)'}\n"
            f"Version: {APP_VERSION}\n\n"
            "Enter LM base URL (line 1), model name (line 2), optional Whisper command (line 3)."
        )
        window = rumps.Window(
            message=message,
            title="Operator Ingest Preferences",
            default_text=f"{self.config.lm_base_url}\n{self.config.lm_model}\n{self.config.whisper_command}",
            ok="Save",
            cancel="Cancel",
        )
        response = window.run()
        if response.clicked:
            lines = [line.strip() for line in response.text.splitlines() if line.strip()]
            if lines:
                self.config.lm_base_url = lines[0]
            if len(lines) > 1:
                self.config.lm_model = lines[1]
            if len(lines) > 2:
                self.config.whisper_command = lines[2]
            else:
                self.config.whisper_command = ""
            save_config(self.config)
            self._reinitialize_clients()
            self._update_toggle_states()

    def handle_quit(self, _sender: rumps.MenuItem) -> None:
        self.watcher.stop()
        self.api_server.stop()
        rumps.quit_application()


def main() -> None:
    OperatorIngestApp().run()


if __name__ == "__main__":
    main()
