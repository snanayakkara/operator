#!/usr/bin/env python3
"""
DSPy HTTP Server for Chrome Extension Integration

Provides OpenAI-compatible HTTP endpoints for DSPy processing, evaluation, and GEPA optimization.
Runs on localhost:8002 to enable Chrome extension access to DSPy functionality.

Architecture:
- LMStudio (localhost:1234): Medical model serving
- MLX Whisper (localhost:8001): Audio transcription  
- DSPy Server (localhost:8002): Prompt optimization and evaluation

Usage:
    python3 dspy-server.py
    
Health Check:
    curl http://localhost:8002/v1/health
"""

import os
import sys
import json
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import argparse

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from flask import Flask, request, jsonify, Response
    from flask_cors import CORS
    import dspy
    from llm.dspy_config import get_config, configure_lm, is_dspy_enabled
    from llm.predictors import get_predictor, process_with_dspy, PREDICTOR_CLASSES
    from llm.evaluate import run_evaluation, RUBRIC_SCORERS
    from llm.optim_gepa import GEPAOptimizer
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("💡 Install requirements: pip install -r requirements-dspy.txt")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Flask app setup
app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension access

# Global state
server_config = {}
server_stats = {
    'start_time': datetime.now(),
    'requests_processed': 0,
    'errors_encountered': 0,
    'active_optimizations': 0
}

class DSPyServerError(Exception):
    """Custom exception for DSPy server errors."""
    pass

def log_request(endpoint: str, success: bool = True, error: str = None):
    """Log request statistics."""
    server_stats['requests_processed'] += 1
    if not success:
        server_stats['errors_encountered'] += 1
        logger.error(f"Request failed - {endpoint}: {error}")
    else:
        logger.info(f"Request completed - {endpoint}")

def validate_request_data(data: Dict, required_fields: List[str]) -> Optional[str]:
    """Validate request data has required fields."""
    for field in required_fields:
        if field not in data:
            return f"Missing required field: {field}"
        if not data[field]:
            return f"Field cannot be empty: {field}"
    return None

@app.route('/v1/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for service monitoring.
    
    Returns server status, DSPy configuration, and performance metrics.
    """
    try:
        # Check DSPy configuration
        config = get_config()
        dspy_ready = config.config.get('use_dspy', False)
        
        # Check available agents
        available_agents = list(PREDICTOR_CLASSES.keys())
        enabled_agents = []
        
        for agent in available_agents:
            if is_dspy_enabled(agent):
                enabled_agents.append(agent)
        
        # Calculate uptime
        uptime_seconds = (datetime.now() - server_stats['start_time']).total_seconds()
        
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'server': {
                'version': '1.0.0',
                'uptime_seconds': round(uptime_seconds),
                'port': 8002
            },
            'dspy': {
                'ready': dspy_ready,
                'config_loaded': config is not None,
                'available_agents': available_agents,
                'enabled_agents': enabled_agents
            },
            'stats': server_stats,
            'endpoints': {
                'process': '/v1/dspy/process',
                'evaluate': '/v1/dspy/evaluate', 
                'optimize': '/v1/dspy/optimize',
                'health': '/v1/health'
            }
        }
        
        log_request('health', success=True)
        return jsonify(health_status)
        
    except Exception as e:
        error_msg = f"Health check failed: {str(e)}"
        log_request('health', success=False, error=error_msg)
        return jsonify({
            'status': 'unhealthy',
            'error': error_msg,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/v1/dspy/process', methods=['POST'])
def process_with_dspy_endpoint():
    """
    Process transcript using DSPy predictor.
    
    Request:
        {
            "agent_type": "angiogram-pci",
            "transcript": "Patient dictation...",
            "options": {
                "timeout": 300000,
                "fresh_run": false
            }
        }
    
    Response:
        {
            "success": true,
            "result": "Generated medical report...",
            "processing_time": 1234,
            "cached": false,
            "agent_type": "angiogram-pci"
        }
    """
    start_time = datetime.now()
    
    try:
        # Validate request
        data = request.get_json()
        validation_error = validate_request_data(data, ['agent_type', 'transcript'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        agent_type = data['agent_type']
        transcript = data['transcript']
        options = data.get('options', {})
        
        # Check if DSPy enabled for this agent
        if not is_dspy_enabled(agent_type):
            raise DSPyServerError(f"DSPy not enabled for agent type: {agent_type}")
        
        # Configure fresh run if requested
        if options.get('fresh_run'):
            config = get_config()
            config.set_fresh_run()
        
        # Configure language model for agent
        configure_lm(agent_type)
        
        # Process with DSPy
        logger.info(f"Processing with DSPy - Agent: {agent_type}, Length: {len(transcript)}")
        result = process_with_dspy(agent_type, transcript)
        
        if not result:
            raise DSPyServerError("DSPy processing returned empty result")
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'result': result,
            'processing_time': round(processing_time),
            'cached': False,  # TODO: Implement caching detection
            'agent_type': agent_type,
            'timestamp': datetime.now().isoformat()
        }
        
        log_request('process', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        error_msg = f"DSPy processing failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': datetime.now().isoformat()
        }
        
        log_request('process', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/dspy/evaluate', methods=['POST'])
def evaluate_endpoint():
    """
    Run evaluation on development set.
    
    Request:
        {
            "agent_type": "angiogram-pci",
            "options": {
                "dev_set_path": "eval/devset/angiogram-pci/*.json",
                "fresh_run": false
            }
        }
    
    Response:
        {
            "success": true,
            "results": [...],
            "summary": {
                "total_examples": 12,
                "average_score": 87.5,
                "passed": 10,
                "failed": 2
            }
        }
    """
    start_time = datetime.now()
    
    try:
        # Validate request
        data = request.get_json()
        validation_error = validate_request_data(data, ['agent_type'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        agent_type = data['agent_type']
        options = data.get('options', {})
        
        # Check if DSPy enabled
        if not is_dspy_enabled(agent_type):
            raise DSPyServerError(f"DSPy not enabled for agent type: {agent_type}")
        
        # Configure fresh run if requested
        if options.get('fresh_run'):
            config = get_config()
            config.set_fresh_run()
        
        # Configure language model
        configure_lm(agent_type)
        
        # Run evaluation
        logger.info(f"Running evaluation - Agent: {agent_type}")
        dev_set_path = options.get('dev_set_path')
        results = run_evaluation(agent_type, dev_set_path=dev_set_path)
        
        if not results:
            raise DSPyServerError("No evaluation results generated")
        
        # Calculate summary statistics
        total_examples = len(results)
        scores = [r['checks'].get('percentage', 0) for r in results]
        passed = [r['checks'].get('passed', False) for r in results]
        
        summary = {
            'total_examples': total_examples,
            'average_score': round(sum(scores) / len(scores), 1) if scores else 0,
            'passed': sum(passed),
            'failed': total_examples - sum(passed),
            'score_range': [min(scores), max(scores)] if scores else [0, 0]
        }
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'results': results,
            'summary': summary,
            'processing_time': round(processing_time),
            'agent_type': agent_type,
            'timestamp': datetime.now().isoformat()
        }
        
        log_request('evaluate', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        error_msg = f"Evaluation failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': datetime.now().isoformat()
        }
        
        log_request('evaluate', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/dspy/optimize', methods=['POST'])
def optimize_endpoint():
    """
    Run GEPA optimization for agent.
    
    Request:
        {
            "agent_type": "angiogram-pci",
            "options": {
                "iterations": 5,
                "with_human": false,
                "fresh_run": false
            }
        }
    
    Response:
        {
            "success": true,
            "results": {
                "agent_type": "angiogram-pci",
                "iterations_run": 5,
                "baseline_score": 75.2,
                "final_score": 82.1,
                "improvement": 6.9,
                "optimization_successful": true
            }
        }
    """
    start_time = datetime.now()
    
    try:
        # Track active optimization
        server_stats['active_optimizations'] += 1
        
        # Validate request
        data = request.get_json()
        validation_error = validate_request_data(data, ['agent_type'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        agent_type = data['agent_type']
        options = data.get('options', {})
        
        # Check if DSPy enabled
        if not is_dspy_enabled(agent_type):
            raise DSPyServerError(f"DSPy not enabled for agent type: {agent_type}")
        
        # Configure fresh run if requested
        if options.get('fresh_run'):
            config = get_config()
            config.set_fresh_run()
        
        # Configure language model
        configure_lm(agent_type)
        
        # Run GEPA optimization
        iterations = options.get('iterations', 5)
        with_human = options.get('with_human', False)
        
        logger.info(f"Starting GEPA optimization - Agent: {agent_type}, Iterations: {iterations}, Human feedback: {with_human}")
        
        optimizer = GEPAOptimizer(agent_type)
        results = optimizer.run_optimization(iterations, with_human)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'results': results,
            'processing_time': round(processing_time),
            'timestamp': datetime.now().isoformat()
        }
        
        log_request('optimize', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        error_msg = f"Optimization failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': datetime.now().isoformat()
        }
        
        log_request('optimize', success=False, error=error_msg)
        return jsonify(response), 500
    
    finally:
        server_stats['active_optimizations'] = max(0, server_stats['active_optimizations'] - 1)

@app.route('/v1/dspy/agents', methods=['GET'])
def list_agents():
    """
    List available DSPy agents and their configuration.
    
    Response:
        {
            "available_agents": [...],
            "enabled_agents": [...],
            "agent_configs": {...}
        }
    """
    try:
        available_agents = list(PREDICTOR_CLASSES.keys())
        enabled_agents = []
        agent_configs = {}
        
        config = get_config()
        
        for agent in available_agents:
            is_enabled = is_dspy_enabled(agent)
            if is_enabled:
                enabled_agents.append(agent)
            
            agent_config = config.config.get('agents', {}).get(agent, {})
            agent_configs[agent] = {
                'enabled': is_enabled,
                'max_tokens': agent_config.get('max_tokens', 4000),
                'temperature': agent_config.get('temperature', 0.3),
                'has_predictor': agent in PREDICTOR_CLASSES,
                'has_rubric': agent in RUBRIC_SCORERS
            }
        
        response = {
            'available_agents': available_agents,
            'enabled_agents': enabled_agents,
            'agent_configs': agent_configs,
            'timestamp': datetime.now().isoformat()
        }
        
        log_request('agents', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Failed to list agents: {str(e)}"
        log_request('agents', success=False, error=error_msg)
        return jsonify({
            'error': error_msg,
            'timestamp': datetime.now().isoformat()
        }), 500

def initialize_server():
    """Initialize DSPy server configuration and dependencies."""
    try:
        logger.info("Initializing DSPy server...")
        
        # Check DSPy configuration
        config = get_config()
        if not config:
            raise DSPyServerError("Failed to load DSPy configuration")
        
        # Verify required directories exist
        required_dirs = ['eval/devset', 'eval/feedback', 'llm/prompts']
        for dir_path in required_dirs:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
        
        # Log server configuration
        logger.info(f"DSPy server initialized successfully")
        logger.info(f"Available agents: {list(PREDICTOR_CLASSES.keys())}")
        logger.info(f"Available rubrics: {list(RUBRIC_SCORERS.keys())}")
        logger.info(f"DSPy enabled: {config.config.get('use_dspy', False)}")
        
        return True
        
    except Exception as e:
        logger.error(f"Server initialization failed: {e}")
        return False

def main():
    """Main server entry point."""
    parser = argparse.ArgumentParser(description='DSPy HTTP Server for Chrome Extension')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8002, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--threaded', action='store_true', default=True, help='Enable threaded mode')
    
    args = parser.parse_args()
    
    print("🚀 Starting DSPy HTTP Server...")
    print(f"   Host: {args.host}")
    print(f"   Port: {args.port}")
    print(f"   Debug: {args.debug}")
    
    # Initialize server
    if not initialize_server():
        print("❌ Server initialization failed")
        sys.exit(1)
    
    print("✅ Server initialization complete")
    print(f"🔗 Health check: http://{args.host}:{args.port}/v1/health")
    print("📡 Ready for requests...")
    
    try:
        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug,
            threaded=args.threaded
        )
    except KeyboardInterrupt:
        print("\n🛑 Server shutdown requested")
        logger.info("DSPy server shutting down")
    except Exception as e:
        print(f"❌ Server error: {e}")
        logger.error(f"Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()