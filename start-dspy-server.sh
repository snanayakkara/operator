#!/bin/bash
# DSPy Server Startup Script
# 
# Starts the DSPy HTTP server with auto-restart capability for Chrome extension integration.
# Provides prompt optimization and evaluation services via localhost:8002.
#
# Usage:
#   ./start-dspy-server.sh
#
# Environment Setup:
#   Automatically activates DSPy virtual environment if available
#   Falls back to system Python if no virtual environment found
#
# Architecture:
#   - LMStudio (localhost:1234): Medical model serving  
#   - MLX Whisper (localhost:8001): Audio transcription
#   - DSPy Server (localhost:8002): Prompt optimization and evaluation

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_FILE="dspy-server.py"
REQUIREMENTS_FILE="requirements-dspy.txt"
VENV_DIR="dspy-env"
LOG_FILE="dspy-server.log"
PID_FILE="dspy-server.pid"
MAX_RETRIES=5
RETRY_DELAY=5

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if server is already running
check_server_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            return 0  # Server is running
        else
            # Clean up stale PID file
            rm -f "$PID_FILE"
            return 1  # Server not running
        fi
    fi
    return 1  # No PID file, server not running
}

# Stop existing server
stop_server() {
    if check_server_running; then
        local pid=$(cat "$PID_FILE")
        info "Stopping existing DSPy server (PID: $pid)..."
        kill -TERM $pid 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if ps -p $pid > /dev/null 2>&1; then
            warn "Server still running, force killing..."
            kill -KILL $pid 2>/dev/null || true
        fi
        
        rm -f "$PID_FILE"
        log "DSPy server stopped"
    fi
}

# Check Python environment and dependencies
check_environment() {
    info "Checking DSPy server environment..."

    # Check if server file exists
    if [ ! -f "$SERVER_FILE" ]; then
        error "DSPy server file not found: $SERVER_FILE"
        exit 1
    fi

    # Check for virtual environment
    if [ -d "$VENV_DIR" ]; then
        info "Found DSPy virtual environment: $VENV_DIR"
        source "$VENV_DIR/bin/activate"
        PYTHON_CMD="$VENV_DIR/bin/python"
    else
        warn "DSPy virtual environment not found, using system Python"
        # Check if system Python has required packages
        if ! command -v python3 &> /dev/null; then
            error "Python 3 not found. Please install Python 3."
            exit 1
        fi
        PYTHON_CMD="python3"
    fi

    # Verify Python version
    local python_version=$($PYTHON_CMD --version 2>&1)
    info "Using Python: $python_version"

    # Check if requirements file exists
    if [ -f "$REQUIREMENTS_FILE" ]; then
        info "DSPy requirements file found: $REQUIREMENTS_FILE"
    else
        warn "DSPy requirements file not found: $REQUIREMENTS_FILE"
        warn "You may need to install dependencies manually:"
        warn "  pip install flask flask-cors dspy gepa pyyaml"
    fi

    # Test basic imports
    if ! $PYTHON_CMD -c "import flask, dspy" &>/dev/null; then
        error "Required Python packages not found."
        if [ -f "$REQUIREMENTS_FILE" ]; then
            info "Installing DSPy requirements..."
            $PYTHON_CMD -m pip install -r "$REQUIREMENTS_FILE" || {
                error "Failed to install requirements"
                exit 1
            }
        else
            error "Please install required packages manually:"
            error "  pip install flask flask-cors dspy gepa pyyaml"
            exit 1
        fi
    fi

    log "Environment check completed successfully"
}

# Check server health
check_server_health() {
    local retries=0
    while [ $retries -lt 10 ]; do
        if curl -s -f "http://localhost:8002/v1/health" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
        ((retries++))
    done
    return 1
}

# Start the DSPy server
start_server() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log "Starting DSPy server (attempt $attempt/$MAX_RETRIES)..."
        
        # Start server in background with USE_DSPY environment variable
        nohup env USE_DSPY=true $PYTHON_CMD "$SERVER_FILE" --host 127.0.0.1 --port 8002 > "$LOG_FILE" 2>&1 &
        local server_pid=$!
        
        # Save PID
        echo $server_pid > "$PID_FILE"
        
        # Wait a moment for server to initialize
        sleep 3
        
        # Check if server started successfully
        if check_server_health; then
            log "DSPy server started successfully (PID: $server_pid)"
            log "Server URL: http://localhost:8002"
            log "Health check: http://localhost:8002/v1/health" 
            log "Logs: $LOG_FILE"
            return 0
        else
            warn "DSPy server failed to start properly (attempt $attempt)"
            
            # Clean up failed attempt
            kill -TERM $server_pid 2>/dev/null || true
            sleep 1
            kill -KILL $server_pid 2>/dev/null || true
            rm -f "$PID_FILE"
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                warn "Retrying in $RETRY_DELAY seconds..."
                sleep $RETRY_DELAY
            fi
        fi
        
        ((attempt++))
    done
    
    error "Failed to start DSPy server after $MAX_RETRIES attempts"
    return 1
}

# Show server status
show_status() {
    echo
    info "=== DSPy Server Status ==="
    
    if check_server_running; then
        local pid=$(cat "$PID_FILE")
        log "DSPy server is running (PID: $pid)"
        
        # Try to get server status
        if command -v curl &> /dev/null; then
            local health_response=$(curl -s "http://localhost:8002/v1/health" 2>/dev/null || echo "")
            if [ ! -z "$health_response" ]; then
                log "Server health check: PASSED"
                echo "$health_response" | python -m json.tool 2>/dev/null || echo "$health_response"
            else
                warn "Server health check: FAILED"
            fi
        fi
    else
        warn "DSPy server is not running"
    fi
    
    echo
    info "=== Service Architecture ==="
    info "LMStudio (Model Serving): http://localhost:1234"
    info "MLX Whisper (Transcription): http://localhost:8001"  
    info "DSPy Server (Optimization): http://localhost:8002"
    echo
}

# Show usage information
show_usage() {
    echo "DSPy Server Management Script"
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  start     Start the DSPy server (default)"
    echo "  stop      Stop the DSPy server"
    echo "  restart   Restart the DSPy server"
    echo "  status    Show server status"
    echo "  logs      Show server logs"
    echo "  health    Check server health"
    echo "  help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0                 # Start server"
    echo "  $0 restart         # Restart server"  
    echo "  $0 status          # Check status"
    echo
    echo "Configuration:"
    echo "  Server file: $SERVER_FILE"
    echo "  Virtual env: $VENV_DIR"
    echo "  Log file: $LOG_FILE"
    echo "  Requirements: $REQUIREMENTS_FILE"
}

# Main execution
main() {
    cd "$SCRIPT_DIR"
    
    local action="${1:-start}"
    
    case "$action" in
        "start")
            if check_server_running; then
                log "DSPy server is already running"
                show_status
                exit 0
            fi
            
            check_environment
            start_server
            if [ $? -eq 0 ]; then
                show_status
            else
                exit 1
            fi
            ;;
            
        "stop")
            stop_server
            ;;
            
        "restart")
            stop_server
            sleep 2
            check_environment
            start_server
            if [ $? -eq 0 ]; then
                show_status
            else
                exit 1
            fi
            ;;
            
        "status")
            show_status
            ;;
            
        "logs")
            if [ -f "$LOG_FILE" ]; then
                log "Showing DSPy server logs (last 50 lines):"
                tail -n 50 "$LOG_FILE"
            else
                warn "Log file not found: $LOG_FILE"
            fi
            ;;
            
        "health")
            if check_server_health; then
                log "DSPy server health check: PASSED"
                curl -s "http://localhost:8002/v1/health" | python -m json.tool 2>/dev/null
            else
                error "DSPy server health check: FAILED"
                exit 1
            fi
            ;;
            
        "help"|"-h"|"--help")
            show_usage
            ;;
            
        *)
            error "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac
}

# Trap signals for clean shutdown
trap 'error "Interrupted"; exit 1' INT TERM

# Run main function
main "$@"