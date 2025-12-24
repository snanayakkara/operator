#!/bin/bash

# Smoke test for transcription server (MLX Whisper or Google MedASR)
# Usage: ./test-asr.sh path/to/audio.webm

PORT=8001
SERVER_URL="http://localhost:${PORT}"

echo "Transcription Server Smoke Test"
echo "================================"

# Check health
HEALTH=$(curl -s "${SERVER_URL}/v1/health")
if [ -z "$HEALTH" ]; then
    echo "Error: Server not responding on port ${PORT}"
    echo "Start with: ./dev or ./start-whisper-server.sh or ./start-medasr-server.sh"
    exit 1
fi

echo "Server is running"
echo "Health:"
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"

if [ -z "$1" ]; then
    echo
    echo "No audio file provided; skipping transcription test."
    echo "Usage: $0 path/to/audio.webm"
    exit 0
fi

AUDIO_FILE="$1"
if [ ! -f "$AUDIO_FILE" ]; then
    echo "Error: File not found: $AUDIO_FILE"
    exit 1
fi

echo
echo "Testing transcription for: $AUDIO_FILE"
RESULT=$(curl -s -X POST -F "file=@${AUDIO_FILE}" -F "response_format=json" "${SERVER_URL}/v1/audio/transcriptions")

if [ -z "$RESULT" ]; then
    echo "Error: No response from transcription endpoint"
    exit 1
fi

echo "Result summary:"
echo "$RESULT" | python3 - <<'PY'
import sys, json
try:
    data = json.load(sys.stdin)
except Exception:
    print("Raw response:")
    print(sys.stdin.read())
    raise SystemExit(0)
text = data.get("text", "") or ""
print(f"Model: {data.get('model', 'unknown')}")
print(f"Duration: {data.get('duration', 'unknown')}s")
print("Text (first 120 chars):")
print(text[:120])
PY

echo
echo "Smoke test completed"
