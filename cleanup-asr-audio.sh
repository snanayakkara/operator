#!/bin/bash
# Cleanup helper: remove saved ASR audio artifacts after training.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIO_DIR="${ROOT_DIR}/data/asr/audio"

if [ ! -d "${AUDIO_DIR}" ]; then
  echo "No audio directory found at ${AUDIO_DIR} (nothing to clean)."
  exit 0
fi

echo "⚠️  This will delete all files in: ${AUDIO_DIR}"
read -r -p "Proceed? [y/N] " RESP
if [[ "${RESP}" != "y" && "${RESP}" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

rm -rf "${AUDIO_DIR}"
echo "✅ Removed ${AUDIO_DIR}"
