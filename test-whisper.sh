#!/bin/bash

# Test script for MLX Whisper transcription debugging
# Usage: ./test-whisper.sh [audio_file.webm]

PORT=8001
SERVER_URL="http://localhost:${PORT}"

echo "🧪 MLX Whisper Server Test Script"
echo "=================================="

# Check if server is running
echo "🔍 Checking server status..."
if curl -s "${SERVER_URL}/v1/health" > /dev/null; then
    echo "✅ Server is running on port ${PORT}"
    echo
    echo "📋 Server info:"
    curl -s "${SERVER_URL}/" | python3 -m json.tool
    echo
else
    echo "❌ Server not responding on port ${PORT}"
    echo "💡 Start server with: ./start-whisper-server.sh"
    exit 1
fi

# Test with provided file or create a test file
if [ "$1" ]; then
    AUDIO_FILE="$1"
    if [ ! -f "$AUDIO_FILE" ]; then
        echo "❌ File not found: $AUDIO_FILE"
        exit 1
    fi
    echo "🎵 Testing with provided file: $AUDIO_FILE"
else
    echo "⚠️ No audio file provided"
    echo "📝 Usage: $0 path/to/audio.webm"
    echo "🔧 For now, testing debug endpoint without file..."
    echo
    echo "📊 Debug endpoint test:"
    curl -s "${SERVER_URL}/debug/test-audio" -X POST || echo "No file provided - this is expected"
    exit 0
fi

echo
echo "🧪 Testing file analysis (debug endpoint)..."
echo "============================================="
curl -s -X POST -F "file=@${AUDIO_FILE}" "${SERVER_URL}/debug/test-audio" | python3 -m json.tool

echo
echo "🎙️ Testing actual transcription..."
echo "=================================="
echo "⏳ This may take a moment..."

RESULT=$(curl -s -X POST -F "file=@${AUDIO_FILE}" -F "response_format=text" "${SERVER_URL}/v1/audio/transcriptions")

echo "📝 Transcription result:"
echo "========================"
echo "\"$RESULT\""
echo
echo "📊 Result analysis:"
echo "Length: $(echo -n "$RESULT" | wc -c) characters"
echo "Words: $(echo "$RESULT" | wc -w)"

# Check for suspicious results
if [ "$RESULT" = "thank you" ] || [ "$RESULT" = "Thank you" ] || [ "$RESULT" = "Thank you." ]; then
    echo
    echo "🚨 ALERT: Suspicious result detected!"
    echo "💡 This suggests:"
    echo "   - Audio may be too short or quiet"
    echo "   - File conversion issues"
    echo "   - Model defaulting to common phrases"
    echo
    echo "🔍 File details:"
    ls -la "$AUDIO_FILE"
    file "$AUDIO_FILE"
fi

echo
echo "✅ Test completed"