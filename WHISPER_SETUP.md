# MLX Whisper Transcription Setup Guide

This guide explains how to set up the MLX Whisper transcription server to work with your Chrome extension.

## Overview

The extension now uses a separate transcription service running on port 8001, which directly accesses your local `whisper-large-v3-turbo` model using Apple's MLX framework for optimal performance on Apple Silicon.

## Quick Setup

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements-whisper.txt

# Or install manually:
pip install mlx-whisper flask flask-cors
```

### 2. Start the Transcription Server

```bash
# Option 1: Use the consolidated startup script (RECOMMENDED - starts all services)
./dev

# Option 2: Start Whisper server only
./start-whisper-server.sh

# Option 3: Run directly
python3 whisper-server.py
```

The server will start on `http://localhost:8001` and automatically use your existing model at:
`/Users/shane/.cache/lm-studio/models/mlx-community/whisper-large-v3-turbo`

### 3. Test the Server

```bash
# Check health
curl http://localhost:8001/v1/health

# Test transcription (if you have an audio file)
curl -X POST -F 'file=@test.webm' http://localhost:8001/v1/audio/transcriptions
```

## MedASR Option (A/B Testing)

You can optionally run Google MedASR (`google/medasr`) for medical vocabulary accuracy testing. This uses the same API and port 8001, so you can switch by restarting `./dev`.

### Install MedASR Dependencies

```bash
pip install -r requirements-medasr.txt
```

### Start MedASR Server

```bash
# Option 1: Use the consolidated startup script (choose MedASR when prompted)
./dev

# Option 2: Start MedASR only
./start-medasr-server.sh

# Option 3: Run directly
python3 medasr-server.py
```

### Device Selection (Apple Silicon)

```bash
# auto (default), mps, or cpu
export OPERATOR_MEDASR_DEVICE=auto
```

### Test MedASR

```bash
curl -X POST http://localhost:8001/v1/audio/transcriptions \
  -F 'file=@audio.webm' \
  -F 'model=google/medasr' \
  -F 'response_format=json'
```

Optional smoke test:

```bash
./test-asr.sh path/to/audio.webm
```

## Server Configuration

### Default Settings
- **Port**: 8001
- **Model**: mlx-community/whisper-large-v3-turbo  
- **Endpoints**: 
  - `/v1/audio/transcriptions` (OpenAI-compatible)
  - `/v1/health` (status check)
  - `/v1/models` (model list)

### Extension Configuration
The extension is already configured to use:
- **Transcription URL**: `http://localhost:8001`
- **Model**: `whisper-large-v3-turbo`
- **Fallback**: If server is unavailable, shows helpful error messages

## Performance

With your Apple Silicon Mac, you can expect:
- **Speed**: ~50x real-time transcription
- **Quality**: State-of-the-art whisper-large-v3-turbo accuracy
- **Latency**: Sub-second response times for typical audio clips
- **Memory**: Model loads once and stays in memory

## Auto-Start Feature

### Consolidated Startup
The `./dev` script provides the recommended way to start all services:
- Starts LMStudio with model loading
- Starts MLX Whisper server (without dock appearance on macOS)
- Starts DSPy optimization server
- Launches support daemons (Operator Ingest, Ward Round watcher)
- Provides health checks and status dashboard

```bash
# Start all services
./dev

# Check service status
./dev --status
```

### Extension Auto-Detection
The extension will automatically:
- Check if the Whisper server is running when you record audio
- Show helpful notifications if the server needs to be started
- Provide clear instructions in the console for manual startup

## Troubleshooting

### Server Won't Start
```bash
# Check if port 8001 is in use
lsof -i :8001

# Kill existing process if needed
kill -9 $(lsof -t -i:8001)
```

### Model Not Found
If the model isn't found in your LM Studio cache, it will be automatically downloaded from Hugging Face on first use. This may take a few minutes.

### Extension Errors
The extension will show helpful error messages if:
- Server is not running
- Port 8001 is not accessible  
- Transcription fails

Look for console messages like:
```
❌ MLX Whisper server error: 500 Connection refused
💡 To fix this:
   1. Run: ./start-whisper-server.sh
   2. Or manually: python3 whisper-server.py
   3. Check that port 8001 is available
```

## Complete Workflow

Once set up, your complete AI pipeline runs locally:

1. **Recording**: Browser captures audio in WebM/Opus format
2. **Transcription**: MLX Whisper (port 8001) → Text
3. **Classification**: MedGemma-4b-it (LMStudio port 1234) → Agent type
4. **Generation**: MedGemma-27b-it (LMStudio port 1234) → Medical report

## API Compatibility

The server provides OpenAI-compatible endpoints, so you can also use it with other applications that expect Whisper API format.

**Request Format:**
```bash
curl -X POST http://localhost:8001/v1/audio/transcriptions \
  -F 'file=@audio.webm' \
  -F 'model=whisper-large-v3-turbo' \
  -F 'response_format=json'
```

**Response Format:**
```json
{
  "text": "Patient underwent transcatheter aortic valve implantation...",
  "duration": 0.45,
  "model": "mlx-community/whisper-large-v3-turbo"
}
```

## Development

To modify the server:
- Edit `whisper-server.py`
- Restart the server
- The extension will automatically use the updated version

The server supports:
- CORS for browser requests
- Multiple audio formats (WebM, MP3, WAV, etc.)
- Language detection and specification
- Both text and JSON response formats
