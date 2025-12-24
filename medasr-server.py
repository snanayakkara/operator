#!/usr/bin/env python3
"""
Google MedASR Transcription Server
OpenAI-compatible transcription endpoints using google/medasr via transformers.
"""

import os
import tempfile
import time
import subprocess
import threading

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import soundfile as sf
import torch
from transformers import pipeline

app = Flask(__name__)
CORS(app)

MODEL_ID = os.getenv("MEDASR_MODEL", "google/medasr")
PORT = 8001
HOST = "localhost"

CHUNK_LENGTH_S = float(os.getenv("MEDASR_CHUNK_LENGTH_S", "20"))
STRIDE_LENGTH_S = float(os.getenv("MEDASR_STRIDE_LENGTH_S", "2"))

_PIPELINE = None
_PIPELINE_LOCK = threading.Lock()
_SELECTED_DEVICE = None
tts_model = None
tts_model_loaded = False


def resolve_device():
    pref = os.getenv("OPERATOR_MEDASR_DEVICE", "auto").strip().lower()
    if pref not in ("auto", "mps", "cpu"):
        pref = "auto"

    if pref == "auto":
        return "mps" if torch.backends.mps.is_available() else "cpu"

    if pref == "mps":
        if torch.backends.mps.is_available():
            return "mps"
        print("Warning: OPERATOR_MEDASR_DEVICE=mps but MPS is unavailable; falling back to CPU")
        return "cpu"

    return "cpu"


def get_pipeline():
    global _PIPELINE
    if _PIPELINE is not None:
        return _PIPELINE

    with _PIPELINE_LOCK:
        if _PIPELINE is not None:
            return _PIPELINE

        device = _SELECTED_DEVICE or resolve_device()
        pipe_device = -1 if device == "cpu" else torch.device(device)

        print(f"Loading MedASR pipeline ({MODEL_ID}) on {device}...")
        _PIPELINE = pipeline(
            "automatic-speech-recognition",
            model=MODEL_ID,
            device=pipe_device,
            chunk_length_s=CHUNK_LENGTH_S,
            stride_length_s=STRIDE_LENGTH_S,
        )

    return _PIPELINE


def convert_audio_to_wav(input_file):
    output_file = tempfile.mktemp(suffix="_medasr.wav")
    cmd = [
        "ffmpeg",
        "-i",
        input_file,
        "-acodec",
        "pcm_s16le",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-y",
        output_file,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
    except FileNotFoundError:
        return None, "ffmpeg not found. Install with: brew install ffmpeg"

    if result.returncode != 0:
        return None, f"ffmpeg conversion failed: {result.stderr.strip()}"

    return output_file, None


def load_audio(wav_path):
    audio, sample_rate = sf.read(wav_path, dtype="float32")

    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    if sample_rate != 16000:
        resample_ratio = 16000 / sample_rate
        audio = np.interp(
            np.linspace(0, len(audio), int(len(audio) * resample_ratio)),
            np.arange(len(audio)),
            audio,
        ).astype(np.float32)
        sample_rate = 16000

    return audio, sample_rate


def load_tts_model():
    """Load MLX-Audio Chatterbox TTS model."""
    global tts_model, tts_model_loaded

    if tts_model_loaded:
        return True

    try:
        print("Loading MLX-Audio TTS model...")
        print("Model: mlx-community/chatterbox-turbo-4bit (Chatterbox TTS)")
        start_time = time.time()

        try:
            from tts_chatterbox import load_chatterbox_model

            tts_model = load_chatterbox_model()

            load_time = time.time() - start_time
            print(f"MLX-Audio TTS loaded in {load_time:.2f} seconds")
            print("Default voice: af_heart (professional, neutral)")
            tts_model_loaded = True
            return True

        except ImportError as exc:
            print(f"MLX-Audio dependencies not available: {exc}")
            print("TTS features will be disabled (install: pip install mlx-audio librosa mlx-lm einops)")
            tts_model = None
            tts_model_loaded = False
            return False

    except Exception as exc:
        print(f"TTS model loading failed: {exc}")
        print("TTS features will be disabled - continuing with transcription only")
        tts_model = None
        tts_model_loaded = False
        return False


def json_error(message, status=400, error_type="invalid_request_error"):
    return (
        jsonify({"error": {"message": message, "type": error_type}}),
        status,
    )


def cleanup_paths(*paths):
    for path in paths:
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass


@app.route("/", methods=["GET"])
def root():
    return jsonify(
        {
            "service": "Google MedASR Transcription Server",
            "engine": "medasr",
            "model": MODEL_ID,
            "endpoints": {
                "transcribe": "/v1/audio/transcriptions",
                "synthesize": "/v1/audio/synthesis",
                "health": "/v1/health",
                "models": "/v1/models",
            },
        }
    )


@app.route("/v1/health", methods=["GET"])
def health_check():
    tts_status = "loaded" if tts_model_loaded else "not_loaded"
    return jsonify(
        {
            "ok": True,
            "status": "ok",
            "engine": "medasr",
            "model": MODEL_ID,
            "device": _SELECTED_DEVICE or resolve_device(),
            "timestamp": int(time.time()),
            "tts_model": "mlx-community/chatterbox-turbo-4bit" if tts_model_loaded else None,
            "tts_status": tts_status,
            "server": "Google MedASR + MLX-Audio TTS Server",
            "features": {
                "transcription": True,
                "tts_enabled": tts_model_loaded,
            },
        }
    )


@app.route("/v1/models", methods=["GET"])
def list_models():
    return jsonify(
        {
            "object": "list",
            "data": [
                {
                    "id": MODEL_ID,
                    "object": "model",
                    "created": int(time.time()),
                    "owned_by": "google",
                }
            ],
        }
    )


@app.route("/v1/audio/transcriptions", methods=["POST"])
def transcribe_audio():
    start_time = time.time()
    temp_input = None
    temp_wav = None

    try:
        if "file" not in request.files:
            return json_error("No audio file provided")

        audio_file = request.files["file"]
        if audio_file.filename == "":
            return json_error("No audio file selected")

        response_format = request.form.get("response_format", "json")
        language = request.form.get("language", None)

        print(f"MedASR transcription request: {audio_file.filename}")
        if language:
            print(f"Language hint: {language}")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            audio_file.save(temp_file.name)
            temp_input = temp_file.name

        temp_wav, error_message = convert_audio_to_wav(temp_input)
        if error_message:
            cleanup_paths(temp_input)
            return json_error(error_message, status=500, error_type="audio_conversion_error")

        audio_array, sample_rate = load_audio(temp_wav)

        asr = get_pipeline()
        result = asr({"array": audio_array, "sampling_rate": sample_rate})

        if isinstance(result, dict):
            text = result.get("text", "").strip()
        else:
            text = str(result).strip()

        duration = time.time() - start_time
        cleanup_paths(temp_input, temp_wav)

        if response_format == "text":
            return text, 200, {"Content-Type": "text/plain"}

        return jsonify(
            {
                "text": text,
                "duration": duration,
                "model": MODEL_ID,
            }
        )

    except Exception as exc:
        cleanup_paths(temp_input, temp_wav)
        print(f"MedASR transcription error: {exc}")
        return json_error("Transcription failed", status=500, error_type="transcription_error")


@app.route("/v1/audio/synthesis", methods=["POST"])
def synthesize_speech():
    """
    Text-to-Speech endpoint using MLX-Audio (Chatterbox).

    Request JSON:
    {
      "text": "Valve size: 26 millimeter Evolut Pro Plus",
      "speed": 0.9
    }

    Returns: WAV audio (24kHz, mono, PCM)
    """
    try:
        if not tts_model_loaded or tts_model is None:
            return (
                jsonify(
                    {
                        "error": "TTS model not loaded",
                        "message": "MLX-Audio TTS is not available. TTS features disabled.",
                        "features": {"tts_enabled": False},
                    }
                ),
                503,
            )

        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        text = data.get("text", "")
        speed = data.get("speed", 1.0)

        if not text:
            return jsonify({"error": "No text provided"}), 400

        print(f"TTS synthesis request: '{text[:50]}...' (speed: {speed}x)")

        try:
            model = tts_model["model"]
            sample_rate = tts_model["sample_rate"]

            speed = max(0.5, min(2.0, speed))

            audio_chunks = []
            for result in model.generate(text):
                audio = np.array(result.audio)
                if audio.ndim > 1:
                    audio = audio[0]
                audio_chunks.append(audio)

            if len(audio_chunks) == 0:
                audio_array = np.zeros(int(sample_rate * 0.1), dtype=np.float32)
            else:
                audio_array = np.concatenate(audio_chunks)

            import io
            wav_buffer = io.BytesIO()
            sf.write(wav_buffer, audio_array, samplerate=sample_rate, format="WAV")
            wav_buffer.seek(0)

            duration = len(audio_array) / sample_rate
            print(f"TTS synthesis completed ({duration:.1f}s audio, {len(audio_array)} samples)")

            from flask import send_file

            return send_file(
                wav_buffer,
                mimetype="audio/wav",
                as_attachment=False,
                download_name="synthesized.wav",
            )

        except Exception as synthesis_error:
            print(f"TTS synthesis failed: {synthesis_error}")
            return jsonify(
                {
                    "error": "Synthesis failed",
                    "message": str(synthesis_error),
                }
            ), 500

    except Exception as exc:
        print(f"TTS endpoint error: {exc}")
        return jsonify(
            {
                "error": "Server error",
                "message": str(exc),
            }
        ), 500


if __name__ == "__main__":
    _SELECTED_DEVICE = resolve_device()
    print("Starting Google MedASR Transcription Server")
    print(f"  URL: http://{HOST}:{PORT}")
    print(f"  Model: {MODEL_ID}")
    print(f"  Device: {_SELECTED_DEVICE}")
    print(f"  Chunking: {CHUNK_LENGTH_S}s, stride {STRIDE_LENGTH_S}s")
    print("Loading TTS model...")
    tts_loaded = load_tts_model()
    if tts_loaded:
        print("TTS enabled - audio synthesis available")
    else:
        print("TTS disabled - visual proof mode only")
    print("  Press Ctrl+C to stop")

    app.run(host=HOST, port=PORT)
