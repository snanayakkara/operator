"""Processing pipeline for Operator Ingest."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from .config import Config
from .jobs import DictationType, Job, JobStatus, job_processed_dir, save_job
from .lm_client import LMClient
from .whisper_client import WhisperClient

logger = logging.getLogger(__name__)

TRIAGE_SYSTEM_PROMPT = """You are a medical dictation triage assistant.\nReturn a strict JSON object with the following keys: dictation_type, confidence, patient_name, dob, mrn, hospital, raw_header.\n- dictation_type must be one of: clinic_letter, procedure_report, echo_report, task, note, unknown.\n- confidence is 0-1 float.\n- raw_header should echo the header text you received.\n- Extract patient identifiers conservatively; return empty strings when uncertain.\nRespond with JSON only."""

WORKFLOW_HINTS: Dict[str, str] = {
    "quick_letter": DictationType.CLINIC_LETTER,
    "consultation_summary": DictationType.CLINIC_LETTER,
    "background": DictationType.NOTE,
    "investigations": DictationType.NOTE,
    "medications": DictationType.NOTE,
    "angiogram_report": DictationType.PROCEDURE_REPORT,
    "general": DictationType.UNKNOWN,
}

AGENT_PIPELINES: Dict[str, Dict[str, str]] = {
    DictationType.CLINIC_LETTER: {
        "system": "You are a medical scribe drafting polished clinic correspondence. Return a concise, well-formatted letter body ready for review.",
        "filename": "clinic_letter.txt",
    },
    DictationType.PROCEDURE_REPORT: {
        "system": "You are a procedural documentation expert. Produce a structured report with sections: Indication, Procedure, Findings, Plan.",
        "filename": "procedure_report.txt",
    },
    DictationType.ECHO_REPORT: {
        "system": "Summarize this echocardiogram dictation in standard echo report format, including measurements when present.",
        "filename": "echo_report.txt",
    },
    DictationType.TASK: {
        "system": "Create a clear actionable task description with bullet action items and deadlines if mentioned.",
        "filename": "task.txt",
    },
    DictationType.NOTE: {
        "system": "Create a concise SOAP-style note (Subjective, Objective, Assessment, Plan).",
        "filename": "note.txt",
    },
}
DEFAULT_AGENT_PIPELINE = {
    "system": "Provide a concise summary of this dictation for inclusion in the patient's chart.",
    "filename": "summary.txt",
}


class Pipeline:
    def __init__(self, config: Config, whisper: WhisperClient, lm: LMClient):
        self.config = config
        self.whisper = whisper
        self.lm = lm

    def process_job(self, job: Job, staged_audio: Path, metadata: Optional[Dict[str, Any]] = None) -> Job:
        if metadata:
            self._apply_shortcut_metadata(job, metadata)
        job_dir = job_processed_dir(self.config.processed_path, job)
        job_dir.mkdir(parents=True, exist_ok=True)
        audio_dest = job_dir / job.audio_filename
        if staged_audio.exists():
            staged_audio.replace(audio_dest)
        job.audio_path = str(audio_dest)
        self._persist(job)

        transcript_text, metadata = self._run_transcription(audio_dest)
        transcript_path = job_dir / "transcript.txt"
        transcript_path.write_text(transcript_text, encoding="utf-8")
        job.transcript_path = str(transcript_path)
        job.status = JobStatus.TRANSCRIBED
        job.triage_metadata = {"whisper_metadata": metadata}
        self._persist(job)

        header = self._extract_header(transcript_text)
        job.header_text = header
        triage_data = self._triage_header(job, header)
        job.dictation_type = triage_data.get("dictation_type", DictationType.UNKNOWN)
        job.confidence = float(triage_data.get("confidence", 0.0))
        hint_type = self._lookup_workflow_hint(job.workflow_code)
        if hint_type and (job.dictation_type == DictationType.UNKNOWN or job.confidence == 0.0):
            # Fall back to the mobile workflow hint when the LLM could not confidently classify the dictation.
            job.dictation_type = hint_type
        triage_data.setdefault("raw_header", header)
        job.triage_metadata.update(
            {
                "patient_name": triage_data.get("patient_name", ""),
                "dob": triage_data.get("dob", ""),
                "mrn": triage_data.get("mrn", ""),
                "hospital": triage_data.get("hospital", ""),
                "raw_header": triage_data["raw_header"],
            }
        )

        next_status = self._determine_status(job)
        job.status = next_status

        if next_status == JobStatus.COMPLETED:
            logger.info("Job %s completed via auto agent pipeline", job.id)
        elif next_status == JobStatus.TRIAGED:
            logger.info("Job %s triaged, awaiting review", job.id)
        elif next_status == JobStatus.NEEDS_REVIEW:
            logger.info("Job %s needs review (confidence=%.2f)", job.id, job.confidence)

        self._persist(job)
        return job

    def _run_transcription(self, audio_path: Path) -> tuple[str, Dict[str, Any]]:
        logger.info("Transcribing %s", audio_path)
        return self.whisper.transcribe(audio_path)

    def _extract_header(self, transcript: str, char_limit: int = 500) -> str:
        return transcript.strip().split("\n\n", 1)[0][:char_limit]

    def _triage_header(self, job: Job, header: str) -> Dict[str, Any]:
        if not header:
            return {"dictation_type": DictationType.UNKNOWN, "confidence": 0.0, "raw_header": ""}
        logger.info("Running triage on header: %s", header[:120])
        system_prompt = TRIAGE_SYSTEM_PROMPT
        hint_prompt = self._workflow_hint_prompt(job)
        if hint_prompt:
            system_prompt = f"{system_prompt}\n\n{hint_prompt}"
        response = self.lm.chat(system_prompt, f"Header:\n{header}")
        try:
            return json.loads(response)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse triage response: %s", response)
            raise RuntimeError("LM Studio triage response was not valid JSON") from exc

    def _determine_status(self, job: Job) -> str:
        if job.confidence >= self.config.high_confidence_threshold:
            if self.config.auto_run_agents_on_high_confidence:
                self._run_agent_pipeline(job)
                return JobStatus.COMPLETED
            return JobStatus.TRIAGED
        if job.confidence < self.config.medium_confidence_threshold:
            job.dictation_type = DictationType.UNKNOWN
        return JobStatus.NEEDS_REVIEW

    def _run_agent_pipeline(self, job: Job) -> None:
        if not job.transcript_path:
            logger.warning("Cannot run agent pipeline without transcript for job %s", job.id)
            return
        transcript_path = Path(job.transcript_path)
        if not transcript_path.exists():
            logger.warning("Transcript path missing for job %s", job.id)
            return
        transcript_text = transcript_path.read_text(encoding="utf-8")
        if not transcript_text.strip():
            logger.warning("Transcript empty for job %s", job.id)
            return

        pipeline_meta = AGENT_PIPELINES.get(job.dictation_type, DEFAULT_AGENT_PIPELINE)
        outputs_dir = transcript_path.parent / "outputs"
        outputs_dir.mkdir(exist_ok=True)
        system_prompt = pipeline_meta["system"]
        logger.info("Running %s agent pipeline for job %s", job.dictation_type, job.id)
        try:
            response = self.lm.chat(system_prompt, transcript_text, temperature=0.3)
        except Exception as exc:  # pragma: no cover - depends on LM runtime
            logger.error("Agent pipeline failed for job %s: %s", job.id, exc)
            raise

        output_file = outputs_dir / pipeline_meta["filename"]
        output_file.write_text(response.strip(), encoding="utf-8")
        job.pipeline_outputs_path = str(outputs_dir)

    def _persist(self, job: Job) -> None:
        save_job(job, self.config.processed_path, self.config.jobs_path)

    def _apply_shortcut_metadata(self, job: Job, metadata: Dict[str, Any]) -> None:
        """Attach optional metadata supplied by the mobile Shortcut sidecar."""
        def _string_or_none(value: Any) -> Optional[str]:
            if value is None:
                return None
            return str(value).strip() or None

        job.workflow_code = _string_or_none(metadata.get("workflow_code")) or job.workflow_code
        job.workflow_label = _string_or_none(metadata.get("workflow_label")) or job.workflow_label
        job.external_created_at = _string_or_none(metadata.get("created_at")) or job.external_created_at
        job.source = _string_or_none(metadata.get("source")) or job.source

        def _float_or_none(key: str) -> Optional[float]:
            value = metadata.get(key)
            if value is None or value == "":
                return None
            try:
                return float(value)
            except (TypeError, ValueError):
                logger.warning("Shortcut metadata %s had non-numeric value %r", key, value)
                return None

        lat = _float_or_none("location_lat")
        lon = _float_or_none("location_lon")
        if lat is not None:
            job.location_lat = lat
        if lon is not None:
            job.location_lon = lon

        logger.info(
            "Attached shortcut metadata to job %s (workflow_code=%s, workflow_label=%s)",
            job.id,
            job.workflow_code,
            job.workflow_label,
        )

    def _workflow_hint_prompt(self, job: Job) -> Optional[str]:
        hint_type = self._lookup_workflow_hint(job.workflow_code)
        if not job.workflow_code or not hint_type:
            return None
        return (
            "The user's mobile shortcut indicated workflow_code="
            f"'{job.workflow_code}', which roughly corresponds to '{hint_type}' dictation type. "
            "Use this as a hint but override it if the transcript clearly indicates a different type."
        )

    def _lookup_workflow_hint(self, workflow_code: Optional[str]) -> Optional[str]:
        if not workflow_code:
            return None
        return WORKFLOW_HINTS.get(workflow_code)
