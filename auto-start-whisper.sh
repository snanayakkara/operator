#!/bin/bash

# Auto-start MLX Whisper Server for Xestro Extension
# This script runs in the background and checks if the Whisper server is running
# If not, it automatically starts it

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
WHISPER_URL="http://localhost:8001/v1/health"
WHISPER_SCRIPT="$SCRIPT_DIR/start-whisper-server.sh"
LOG_FILE="$SCRIPT_DIR/whisper-auto-start.log"
PID_FILE="$SCRIPT_DIR/whisper-auto-start.pid"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if server is running
check_server() {
    curl -s -f "$WHISPER_URL" > /dev/null 2>&1
    return $?
}

# Function to start server
start_server() {
    log "🚀 Starting MLX Whisper server..."
    
    if [[ -x "$WHISPER_SCRIPT" ]]; then
        "$WHISPER_SCRIPT" >> "$LOG_FILE" 2>&1 &
        local server_pid=$!
        log "📝 Started server with PID: $server_pid"
        
        # Wait up to 30 seconds for server to be ready
        for i in {1..30}; do
            if check_server; then
                log "✅ MLX Whisper server is ready"
                return 0
            fi
            sleep 1
        done
        
        log "❌ Server failed to start within 30 seconds"
        return 1
    else
        log "❌ Whisper start script not found or not executable: $WHISPER_SCRIPT"
        return 1
    fi
}

# Function to handle cleanup on exit
cleanup() {
    log "🛑 Auto-start monitor stopping..."
    rm -f "$PID_FILE"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Write PID file
echo $$ > "$PID_FILE"

log "🎙️ Starting MLX Whisper auto-start monitor"
log "📍 Monitoring URL: $WHISPER_URL"
log "📝 Log file: $LOG_FILE"
log "🔧 PID: $$"

# Initial server check and start
if check_server; then
    log "✅ MLX Whisper server already running"
else
    log "⚠️ MLX Whisper server not detected, starting..."
    start_server
fi

# Monitor loop - check every 30 seconds
while true; do
    sleep 30
    
    if ! check_server; then
        log "⚠️ MLX Whisper server stopped, restarting..."
        start_server
    fi
done