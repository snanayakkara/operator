#!/usr/bin/env python3
"""
Overnight Whisper LoRA fine-tune (time-limited & resumable).

This script:
- Loads corrected transcripts + audio from data/asr/uploaded_corrections.json (expects audioPath per entry).
- Builds a train/val split and fine-tunes a LoRA adapter on Whisper.
- Stops automatically after --max-hours (default 8) and can resume from the last checkpoint.

Dependencies (install in a fresh venv):
  pip install "torch==2.2.*" --index-url https://download.pytorch.org/whl/cpu  # or mps wheels via pip
  pip install transformers datasets peft accelerate evaluate jiwer

Example:
  python whisper_overnight_lora.py \\
    --model-id openai/whisper-large-v3 \\
    --data-dir data/asr \\
    --output-dir data/whisper-lora-large \\
    --max-hours 8 \\
    --per-device-train-batch-size 1 \\
    --gradient-accumulation-steps 4
"""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import torch
from datasets import Audio, Dataset, DatasetDict
from peft import LoraConfig, get_peft_model
from transformers import (
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    TrainerCallback,
    TrainerControl,
    TrainerState,
    WhisperFeatureExtractor,
    WhisperForConditionalGeneration,
    WhisperProcessor,
    WhisperTokenizer,
)


def _log(msg: str) -> None:
    print(f"[whisper-lora] {msg}", flush=True)


def load_corrections(data_dir: Path) -> List[dict]:
    """Load corrections with audio pointers."""
    corrections_file = data_dir / "uploaded_corrections.json"
    if not corrections_file.exists():
        raise FileNotFoundError(f"Corrections file not found: {corrections_file}")

    with corrections_file.open() as f:
        entries = json.load(f)

    samples = []
    for entry in entries:
        audio_path = entry.get("audioPath") or entry.get("audio_path")
        if not audio_path:
            continue
        audio_file = Path(audio_path)
        if not audio_file.exists():
            continue
        text = entry.get("correctedText") or entry.get("corrected") or ""
        if not text.strip():
            continue
        samples.append(
            {
                "id": entry.get("id"),
                "audio": str(audio_file),
                "text": text.strip(),
            }
        )
    return samples


def build_dataset(samples: List[dict], val_ratio: float = 0.1) -> DatasetDict:
    ds = Dataset.from_list(samples)
    ds = ds.cast_column("audio", Audio(sampling_rate=16000))
    if len(ds) < 2:
        raise ValueError("Not enough samples with audio to train.")
    split = ds.train_test_split(test_size=val_ratio, shuffle=True, seed=42)
    return DatasetDict(train=split["train"], validation=split["test"])


def prepare_processor(model_id: str) -> WhisperProcessor:
    tokenizer = WhisperTokenizer.from_pretrained(model_id, language="en", task="transcribe")
    feature_extractor = WhisperFeatureExtractor.from_pretrained(model_id)
    processor = WhisperProcessor.from_pretrained(model_id)
    processor.tokenizer = tokenizer
    processor.feature_extractor = feature_extractor
    processor.tokenizer.pad_token = processor.tokenizer.eos_token
    return processor


def preprocess_fn(processor: WhisperProcessor):
    def _process(batch):
        audio = batch["audio"]
        inputs = processor.feature_extractor(
            audio["array"],
            sampling_rate=audio["sampling_rate"],
            return_tensors="np",
        )
        batch["input_features"] = inputs.input_features[0]
        labels = processor.tokenizer(
            batch["text"],
            return_tensors="np",
        ).input_ids[0]
        batch["labels"] = labels
        return batch

    return _process


@dataclass
class TimeLimitCallback(TrainerCallback):
    max_hours: float

    def __post_init__(self):
        self.deadline = time.time() + self.max_hours * 3600

    def on_step_end(
        self,
        args,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        if time.time() >= self.deadline:
            _log("⏰ Time limit reached; requesting graceful stop and checkpoint.")
            control.should_save = True
            control.should_training_stop = True
        return control


def add_lora(model: WhisperForConditionalGeneration, rank: int = 8, alpha: int = 16, dropout: float = 0.05):
    lora_config = LoraConfig(
        r=rank,
        lora_alpha=alpha,
        lora_dropout=dropout,
        bias="none",
        target_modules=["q_proj", "v_proj", "k_proj", "out_proj"],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    return model


def main():
    parser = argparse.ArgumentParser(description="Overnight Whisper LoRA fine-tune with time limit + resume.")
    parser.add_argument("--model-id", default="openai/whisper-large-v3", help="Base Whisper model ID")
    parser.add_argument("--data-dir", default="data/asr", help="Directory containing uploaded_corrections.json and audio/")
    parser.add_argument("--output-dir", default="data/whisper-lora-output", help="Where to save checkpoints/adapters")
    parser.add_argument("--max-hours", type=float, default=8.0, help="Wall-clock time budget")
    parser.add_argument("--val-ratio", type=float, default=0.1, help="Validation split ratio")
    parser.add_argument("--per-device-train-batch-size", type=int, default=1)
    parser.add_argument("--per-device-eval-batch-size", type=int, default=1)
    parser.add_argument("--gradient-accumulation-steps", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--num-train-epochs", type=int, default=10)
    parser.add_argument("--save-steps", type=int, default=50)
    parser.add_argument("--eval-steps", type=int, default=200)
    parser.add_argument("--resume-from-checkpoint", type=str, default=None)
    parser.add_argument("--rank", type=int, default=8, help="LoRA rank")
    parser.add_argument("--alpha", type=int, default=16, help="LoRA alpha")
    parser.add_argument("--dropout", type=float, default=0.05, help="LoRA dropout")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    _log("Loading corrections and audio...")
    samples = load_corrections(data_dir)
    _log(f"Found {len(samples)} samples with audio.")
    ds = build_dataset(samples, val_ratio=args.val_ratio)

    processor = prepare_processor(args.model_id)
    ds = ds.map(
        preprocess_fn(processor),
        remove_columns=ds["train"].column_names,
        num_proc=os.cpu_count() or 1,
    )

    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device.type in ("mps", "cuda") else torch.float32
    _log(f"Using device: {device}, dtype: {dtype}")

    model = WhisperForConditionalGeneration.from_pretrained(
        args.model_id,
        torch_dtype=dtype,
    )
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []
    model = add_lora(model, rank=args.rank, alpha=args.alpha, dropout=args.dropout)

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(output_dir),
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        learning_rate=args.learning_rate,
        num_train_epochs=args.num_train_epochs,
        save_steps=args.save_steps,
        eval_steps=args.eval_steps,
        logging_steps=10,
        save_total_limit=3,
        fp16=dtype == torch.float16,
        optim="adamw_torch",
        predict_with_generate=False,
        evaluation_strategy="steps",
        save_strategy="steps",
        warmup_steps=50,
        lr_scheduler_type="cosine",
        gradient_checkpointing=True,
        report_to=[],
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=ds["train"],
        eval_dataset=ds["validation"],
        tokenizer=processor.tokenizer,
        data_collator=None,  # Whisper processor already returns ready tensors
        callbacks=[TimeLimitCallback(args.max_hours)],
    )

    _log("Starting training...")
    trainer.train(resume_from_checkpoint=args.resume_from_checkpoint)
    _log("Training finished (time limit or epochs reached). Saving adapter...")
    trainer.model.save_pretrained(output_dir / "lora_adapter")
    processor.save_pretrained(output_dir / "processor")
    _log(f"Saved to {output_dir}")


if __name__ == "__main__":
    main()
