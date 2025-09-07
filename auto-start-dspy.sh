#!/bin/bash
# Auto-Start DSPy Server for Development
#
# Convenience script that starts all required servers for DSPy + GEPA functionality:
# - MLX Whisper Server (localhost:8001) - Audio transcription
# - DSPy Server (localhost:8002) - Prompt optimization and evaluation
# 
# Note: LMStudio (localhost:1234) must be started manually with MedGemma model
#
# Usage:
#   ./auto-start-dspy.sh
#
# This script will:
# 1. Check if MLX Whisper server is running, start if needed
# 2. Check if DSPy server is running, start if needed
# 3. Verify all services are healthy
# 4. Display service status and URLs

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[DSPy Auto-Start]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[DSPy Auto-Start] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[DSPy Auto-Start] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[DSPy Auto-Start] INFO:${NC} $1"
}

# Check if service is running on a port
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i ":$port" > /dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check service health via HTTP
check_service_health() {
    local url=$1
    local timeout=${2:-5}
    
    if curl -s -f --max-time $timeout "$url" > /dev/null 2>&1; then
        return 0  # Service is healthy
    else
        return 1  # Service is unhealthy
    fi
}

# Start MLX Whisper server if needed
ensure_whisper_server() {
    info "Checking MLX Whisper server (localhost:8001)..."
    
    if check_service_health "http://localhost:8001/v1/health"; then
        log "MLX Whisper server is already running and healthy"
        return 0
    fi
    
    if [ -f "./start-whisper-server.sh" ]; then
        info "Starting MLX Whisper server..."
        ./start-whisper-server.sh start > /dev/null 2>&1 &
        
        # Wait for server to start
        local retries=0
        while [ $retries -lt 30 ]; do
            if check_service_health "http://localhost:8001/v1/health"; then
                log "MLX Whisper server started successfully"
                return 0
            fi
            sleep 1
            ((retries++))
        done
        
        error "Failed to start MLX Whisper server"
        return 1
    else
        warn "MLX Whisper startup script not found: ./start-whisper-server.sh"
        warn "Please ensure MLX Whisper server is running manually"
        return 1
    fi
}

# Start DSPy server if needed  
ensure_dspy_server() {
    info "Checking DSPy server (localhost:8002)..."
    
    if check_service_health "http://localhost:8002/v1/health"; then
        log "DSPy server is already running and healthy"
        return 0
    fi
    
    if [ -f "./start-dspy-server.sh" ]; then
        info "Starting DSPy server..."
        ./start-dspy-server.sh start > /dev/null 2>&1
        
        # Wait for server to start
        local retries=0
        while [ $retries -lt 20 ]; do
            if check_service_health "http://localhost:8002/v1/health"; then
                log "DSPy server started successfully"
                return 0
            fi
            sleep 1
            ((retries++))
        done
        
        error "Failed to start DSPy server"
        return 1
    else
        error "DSPy startup script not found: ./start-dspy-server.sh"
        return 1
    fi
}

# Check LMStudio status
check_lmstudio() {
    info "Checking LMStudio server (localhost:1234)..."
    
    if check_service_health "http://localhost:1234/v1/models" 3; then
        log "LMStudio server is running and accessible"
        
        # Try to get model information
        local models_response=$(curl -s "http://localhost:1234/v1/models" 2>/dev/null || echo "")
        if echo "$models_response" | grep -q "medgemma" 2>/dev/null; then
            log "MedGemma model detected in LMStudio"
        else
            warn "MedGemma model may not be loaded in LMStudio"
            warn "Please ensure MedGemma-27b model is loaded"
        fi
        return 0
    else
        warn "LMStudio server is not accessible"
        warn "Please start LMStudio manually and load MedGemma-27b model"
        return 1
    fi
}

# Display comprehensive service status
show_service_status() {
    echo
    info "=== Service Architecture Status ==="
    echo
    
    # LMStudio (Model Serving)
    if check_service_health "http://localhost:1234/v1/models" 3; then
        log "✅ LMStudio (Model Serving): http://localhost:1234"
    else
        warn "❌ LMStudio (Model Serving): http://localhost:1234 - NOT ACCESSIBLE"
    fi
    
    # MLX Whisper (Transcription)
    if check_service_health "http://localhost:8001/v1/health"; then
        log "✅ MLX Whisper (Transcription): http://localhost:8001"
    else
        warn "❌ MLX Whisper (Transcription): http://localhost:8001 - NOT ACCESSIBLE"
    fi
    
    # DSPy Server (Optimization)
    if check_service_health "http://localhost:8002/v1/health"; then
        log "✅ DSPy Server (Optimization): http://localhost:8002"
        
        # Get DSPy server details
        local dspy_status=$(curl -s "http://localhost:8002/v1/health" 2>/dev/null || echo "")
        if [ ! -z "$dspy_status" ]; then
            local enabled_agents=$(echo "$dspy_status" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    agents = data.get('dspy', {}).get('enabled_agents', [])
    print(f'  Enabled agents: {len(agents)} ({', '.join(agents)})')
    print(f'  Requests processed: {data.get('stats', {}).get('requests_processed', 0)}')
except:
    pass
" 2>/dev/null || echo "  Status details unavailable")
            echo -e "${BLUE}$enabled_agents${NC}"
        fi
    else
        warn "❌ DSPy Server (Optimization): http://localhost:8002 - NOT ACCESSIBLE"
    fi
    
    echo
    info "=== Quick Health Checks ==="
    echo "curl http://localhost:1234/v1/models    # Check LMStudio"
    echo "curl http://localhost:8001/v1/health    # Check MLX Whisper"  
    echo "curl http://localhost:8002/v1/health    # Check DSPy Server"
    echo
    info "=== Usage ==="
    echo "Enable DSPy in Chrome extension: localStorage.setItem('USE_DSPY', 'true')"
    echo "Run evaluation: npm run eval:angiogram"
    echo "Run optimization: npm run optim:angiogram"
    echo "Run with human feedback: npm run optim:angiogram:human"
    echo
}

# Main execution
main() {
    log "Starting DSPy + GEPA development environment..."
    echo
    
    local whisper_ok=0
    local dspy_ok=0
    local lmstudio_ok=0
    
    # Start services
    if ensure_whisper_server; then
        whisper_ok=1
    fi
    
    if ensure_dspy_server; then
        dspy_ok=1
    fi
    
    if check_lmstudio; then
        lmstudio_ok=1
    fi
    
    # Show status
    show_service_status
    
    # Summary
    local total_services=3
    local running_services=$((whisper_ok + dspy_ok + lmstudio_ok))
    
    if [ $running_services -eq $total_services ]; then
        log "🎉 All services are running! DSPy + GEPA environment is ready."
        log "You can now use DSPy functionality in the Chrome extension."
    elif [ $running_services -gt 0 ]; then
        warn "⚠️  $running_services/$total_services services running. Some functionality may be limited."
    else
        error "❌ No services are running. Please check the logs and try again."
        exit 1
    fi
}

# Trap signals for clean output
trap 'echo; error "Interrupted"; exit 1' INT TERM

# Run main function
main "$@"