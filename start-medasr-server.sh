#!/bin/bash

# Google MedASR Server Startup Script

echo "Starting Google MedASR Transcription Server"
echo "==========================================="

OFFLINE_MODE="${OFFLINE_MODE:-0}"
LOCAL_WHEELHOUSE="${LOCAL_WHEELHOUSE:-vendor/wheels}"

if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not available. Please install pip."
    exit 1
fi

if [ ! -d "venv-medasr" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv-medasr
fi

echo "Activating virtual environment..."
source venv-medasr/bin/activate

VENV_PYTHON=$(which python)
echo "   Using Python: $VENV_PYTHON"

if [ "$OFFLINE_MODE" = "1" ]; then
    echo "OFFLINE MODE: Skipping dependency installation"
    echo "   Dependencies must already be installed locally"
else
    echo "Installing dependencies..."

    if [ -d "$LOCAL_WHEELHOUSE" ]; then
        echo "Using local wheelhouse: $LOCAL_WHEELHOUSE"
        python -m pip install --no-index --find-links "$LOCAL_WHEELHOUSE" -r requirements-medasr.txt
    else
        echo "Installing from PyPI (with upgrade)"
        if ! python -m pip install --upgrade -r requirements-medasr.txt; then
            echo "Error: Failed to install dependencies"
            echo "   Try manually: source venv-medasr/bin/activate && python -m pip install -r requirements-medasr.txt"
            exit 1
        fi
        echo "Dependencies installed successfully"

        echo "Verifying critical dependencies..."
        if ! python -c "import soundfile" 2>/dev/null; then
            echo "Error: soundfile not found after installation"
            echo "   Attempting direct install..."
            python -m pip install soundfile
        fi
        if ! python -c "import mlx_audio" 2>/dev/null; then
            echo "Error: mlx-audio not found after installation"
            echo "   Attempting direct install..."
            python -m pip install "mlx-audio>=0.1.0"
        fi
        if ! python -c "import librosa" 2>/dev/null; then
            echo "Error: librosa not found after installation"
            echo "   Attempting direct install..."
            python -m pip install librosa
        fi
        if ! python -c "import mlx_lm" 2>/dev/null; then
            echo "Error: mlx-lm not found after installation"
            echo "   Attempting direct install..."
            python -m pip install mlx-lm
        fi
        if ! python -c "import einops" 2>/dev/null; then
            echo "Error: einops not found after installation"
            echo "   Attempting direct install..."
            python -m pip install einops
        fi
    fi
fi

echo ""
echo "Starting server with configuration:"
echo "  URL: http://localhost:8001"
echo "  Model: ${MEDASR_MODEL:-google/medasr}"
echo "  Device: ${OPERATOR_MEDASR_DEVICE:-auto}"
echo "  Press Ctrl+C to stop"
echo ""

if [ -f "no-dock-python.py" ]; then
    echo "  Using no-dock wrapper to prevent macOS dock icon"
    exec venv-medasr/bin/python no-dock-python.py medasr-server.py
else
    echo "  Warning: no-dock wrapper not found, Python may appear in dock"
    exec venv-medasr/bin/python medasr-server.py
fi
