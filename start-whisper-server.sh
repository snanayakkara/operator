#!/bin/bash

# MLX Whisper Server Startup Script with Offline Mode Support

echo "🚀 Starting MLX Whisper Transcription Server"
echo "============================================="

# Configuration flags
OFFLINE_MODE="${OFFLINE_MODE:-0}"
LOCAL_WHEELHOUSE="${LOCAL_WHEELHOUSE:-vendor/wheels}"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not available. Please install pip."
    exit 1
fi

# Check if virtual environment exists, create if not
if [ ! -d "venv-whisper" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv-whisper
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv-whisper/bin/activate

# Verify we're using venv Python
VENV_PYTHON=$(which python)
echo "   Using Python: $VENV_PYTHON"

# Install/upgrade dependencies based on mode
if [ "$OFFLINE_MODE" = "1" ]; then
    echo "🔒 OFFLINE MODE: Skipping dependency installation"
    echo "   Dependencies must already be installed locally"
else
    echo "📦 Installing dependencies..."

    # Check for local wheelhouse
    if [ -d "$LOCAL_WHEELHOUSE" ]; then
        echo "🏠 Using local wheelhouse: $LOCAL_WHEELHOUSE"
        python -m pip install --no-index --find-links "$LOCAL_WHEELHOUSE" -r requirements-whisper.txt
    else
        echo "🌐 Installing from PyPI (with upgrade)"
        # Force upgrade to ensure all dependencies are properly installed
        # Use 'python -m pip' to ensure we install to the active venv
        if ! python -m pip install --upgrade -r requirements-whisper.txt; then
            echo "❌ Failed to install dependencies"
            echo "   Try manually: source venv-whisper/bin/activate && python -m pip install -r requirements-whisper.txt"
            exit 1
        fi
        echo "✅ Dependencies installed successfully"

        # Verify critical dependencies
        echo "🔍 Verifying installation..."
        if ! python -c "import soundfile" 2>/dev/null; then
            echo "❌ soundfile not found after installation"
            echo "   Attempting direct install..."
            python -m pip install soundfile
        fi
        if ! python -c "import mlx_whisper" 2>/dev/null; then
            echo "❌ mlx-whisper not found after installation"
            echo "   Attempting direct install..."
            python -m pip install "mlx-whisper>=0.4.2"
        fi
    fi
fi

# Check if the model cache directory exists
MODEL_CACHE="$HOME/.cache/lm-studio/models/mlx-community/whisper-large-v3-turbo"
if [ -d "$MODEL_CACHE" ]; then
    echo "✅ Found existing model cache at: $MODEL_CACHE"
else
    echo "📥 Model cache not found. The model will be downloaded on first use."
    echo "   This may take a few minutes for the initial download."
fi

# Export Whisper server configuration
echo "⚙️ Configuring Whisper server..."
export WHISPER_MODEL="${WHISPER_MODEL:-mlx-community/whisper-large-v3-turbo}"
export WHISPER_NO_CONTEXT="${WHISPER_NO_CONTEXT:-1}"          # 1 => disable prior-text conditioning
export WHISPER_TEMPERATURE="${WHISPER_TEMPERATURE:-0.2}"
export WHISPER_NO_SPEECH_TH="${WHISPER_NO_SPEECH_TH:-0.65}"
export WHISPER_COMP_RATIO_TH="${WHISPER_COMP_RATIO_TH:-2.2}"
export WHISPER_LOGPROB_TH="${WHISPER_LOGPROB_TH:--0.5}"
export VAD_ENABLED="${VAD_ENABLED:-1}"
export VAD_MODE="${VAD_MODE:-2}"                               # 0..3, higher = more aggressive
export VAD_FRAME_MS="${VAD_FRAME_MS:-30}"                      # 10|20|30 per WebRTC VAD rules
export VAD_MIN_SIL_MS="${VAD_MIN_SIL_MS:-200}"                 # used in segment stitcher
export REPEAT_NGRAM="${REPEAT_NGRAM:-2}"                       # bigram repetition detection
export REPEAT_LIMIT="${REPEAT_LIMIT:-6}"                       # max repetitions before collapse

echo ""
echo "🎯 Starting server with configuration:"
echo "   - URL: http://localhost:8001"
echo "   - Model: $WHISPER_MODEL"
echo "   - VAD Enabled: $VAD_ENABLED (Mode: $VAD_MODE)"
echo "   - No Prior Context: $WHISPER_NO_CONTEXT"
echo "   - Temperature: $WHISPER_TEMPERATURE"
echo "   - Press Ctrl+C to stop"
echo ""

# Start the server using venv Python (not system python3)
# After activating venv, use 'python' which correctly points to venv/bin/python
python whisper-server.py