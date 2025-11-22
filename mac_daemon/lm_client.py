"""LM Studio client wrapper."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict

import requests


@dataclass
class LMClient:
    base_url: str
    model: str
    timeout: int = 60

    def chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }
        logging.getLogger(__name__).debug("Sending chat request to %s", self.base_url)
        try:
            response = requests.post(self.base_url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:  # pragma: no cover - runtime specific
            raise RuntimeError(f"Failed to reach LM Studio at {self.base_url}: {exc}") from exc
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected LM Studio response: {data}") from exc

