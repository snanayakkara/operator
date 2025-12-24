"""Shared MLX-Audio Chatterbox loader."""

from typing import Dict, Any


def _require_dependency(module_name: str, install_hint: str) -> None:
    try:
        __import__(module_name)
    except ImportError as exc:
        raise ImportError(
            f"{module_name} is required for Chatterbox Turbo TTS. Install with: {install_hint}"
        ) from exc


def load_chatterbox_model() -> Dict[str, Any]:
    try:
        from mlx_audio.tts.utils import load_model
    except ImportError as exc:
        raise ImportError(
            "mlx_audio is required for Chatterbox Turbo TTS. Install with: pip install mlx-audio"
        ) from exc

    _require_dependency("librosa", "pip install librosa")
    _require_dependency("mlx_lm", "pip install mlx-lm")
    _require_dependency("einops", "pip install einops")

    try:
        import importlib

        importlib.import_module("mlx_audio.tts.models.chatterbox_turbo")
    except ImportError as exc:
        raise ImportError(
            f"Chatterbox Turbo model dependencies failed to import: {exc}. "
            "Install with: pip install mlx-audio mlx-lm librosa einops"
        ) from exc

    model_id = "mlx-community/chatterbox-turbo-4bit"
    try:
        model = load_model(model_id)
    except Exception as exc:
        raise RuntimeError(
            f"Failed to load Chatterbox Turbo model '{model_id}': {exc}"
        ) from exc
    sample_rate = getattr(model, "sample_rate", None) or getattr(model, "sr", 24000)

    return {
        "model": model,
        "sample_rate": sample_rate,
        "model_id": model_id,
    }
