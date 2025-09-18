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
import threading
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
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

# Timezone Utilities for Melbourne
MELBOURNE_TZ = ZoneInfo('Australia/Melbourne')

def now_melbourne() -> datetime:
    """Get current datetime in Melbourne timezone."""
    return datetime.now(MELBOURNE_TZ)

def now_melbourne_iso() -> str:
    """Get current datetime in Melbourne timezone as ISO string."""
    return now_melbourne().isoformat()

def utc_to_melbourne(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to Melbourne timezone."""
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(MELBOURNE_TZ)

def parse_melbourne_time(time_str: str) -> datetime:
    """Parse ISO time string and convert to Melbourne timezone."""
    try:
        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        return utc_to_melbourne(dt)
    except ValueError:
        # If parsing fails, assume it's already Melbourne time
        return datetime.fromisoformat(time_str)

# Flask app setup
app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension access

# Global state
server_config = {}
server_stats = {
    'start_time': now_melbourne(),
    'requests_processed': 0,
    'errors_encountered': 0,
    'active_optimizations': 0
}

# Job processing system
job_queue = []
job_queue_lock = threading.Lock()
job_processor_thread = None
job_processor_running = False

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

def update_job_status(job_id: str, status: str, progress: int = 0, current_phase: str = '', summary: str = '', estimated_completion: str = ''):
    """Update job status in job file."""
    try:
        jobs_dir = Path('data/jobs')
        job_file = jobs_dir / f"{job_id}.json"
        
        if job_file.exists():
            with open(job_file, 'r') as f:
                job = json.load(f)
            
            job['status'] = status
            job['progress'] = progress
            job['current_phase'] = current_phase
            job['summary'] = summary
            job['estimated_completion'] = estimated_completion
            job['last_updated'] = now_melbourne_iso()
            
            if status in ['DONE', 'ERROR']:
                job['completed_at'] = now_melbourne_iso()
            
            with open(job_file, 'w') as f:
                json.dump(job, f, indent=2)
        
    except Exception as e:
        logger.error(f"Failed to update job {job_id}: {str(e)}")

def is_job_cancelled(job_id: str) -> bool:
    """Check if a job has been cancelled."""
    try:
        job_file = Path(f'data/jobs/{job_id}.json')
        if not job_file.exists():
            return True  # Job not found, consider it cancelled
        
        with open(job_file, 'r') as f:
            job = json.load(f)
        
        status = job.get('status', 'UNKNOWN')
        return status == 'ERROR' and 'cancel' in job.get('summary', '').lower()
    except Exception as e:
        logger.error(f"Failed to check job {job_id} cancellation status: {str(e)}")
        return True  # Error checking, assume cancelled for safety

def process_overnight_job(job_data: Dict):
    """Process an overnight optimization job."""
    job_id = job_data['job_id']
    tasks = job_data['tasks']
    iterations = job_data.get('iterations', 5)
    with_human = job_data.get('with_human', False)
    asr_options = job_data.get('asr_options', {})
    
    try:
        logger.info(f"Starting overnight job processing: {job_id}")
        update_job_status(job_id, 'RUNNING', 0, 'Initializing overnight optimization')
        
        # Check for cancellation before starting
        if is_job_cancelled(job_id):
            logger.info(f"Job {job_id} was cancelled before processing started")
            return
        
        results = {
            'asr_preview': None,
            'gepa_preview': None,
            'applied_optimizations': []
        }
        
        # Phase 1: ASR Corrections Processing (20% of total progress)
        logger.info(f"Job {job_id}: Processing ASR corrections")
        update_job_status(job_id, 'RUNNING', 10, 'Processing ASR corrections from daily usage')
        
        # Check for cancellation before ASR phase
        if is_job_cancelled(job_id):
            logger.info(f"Job {job_id} was cancelled during ASR phase")
            return
        
        try:
            # Load corrections data
            asr_data_dir = Path('data/asr')
            corrections_file = asr_data_dir / 'uploaded_corrections.json'
            
            corrections = []
            if corrections_file.exists():
                with open(corrections_file, 'r') as f:
                    corrections = json.load(f)
            
            if corrections:
                # Process ASR preview
                glossary_terms = {}
                correction_rules = {}
                
                for correction in corrections:
                    raw_text = correction.get('rawText', '').lower()
                    corrected_text = correction.get('correctedText', '').lower()
                    
                    # Extract medical terms for glossary
                    corrected_words = extract_medical_terms(corrected_text)
                    for word in corrected_words:
                        if len(word) > 3 and is_medical_term(word):
                            glossary_terms[word] = glossary_terms.get(word, 0) + 1
                    
                    # Extract correction pairs
                    corrections_pairs = extract_correction_pairs(raw_text, corrected_text)
                    for raw, fix in corrections_pairs:
                        key = f"{raw}→{fix}"
                        if key not in correction_rules:
                            correction_rules[key] = {'count': 0, 'examples': []}
                        correction_rules[key]['count'] += 1
                        if len(correction_rules[key]['examples']) < 3:
                            snippet = get_context_snippet(raw_text, raw)
                            correction_rules[key]['examples'].append(snippet)
                
                # Generate ASR preview
                max_terms = asr_options.get('maxTerms', 50)
                max_rules = asr_options.get('maxRules', 30)
                
                glossary_additions = [
                    {'term': term, 'count': count} 
                    for term, count in sorted(glossary_terms.items(), key=lambda x: x[1], reverse=True)[:max_terms]
                    if count >= 2
                ]
                
                rule_candidates = [
                    {
                        'raw': key.split('→')[0],
                        'fix': key.split('→')[1], 
                        'count': data['count'],
                        'examples': data['examples']
                    }
                    for key, data in sorted(correction_rules.items(), key=lambda x: x[1]['count'], reverse=True)[:max_rules]
                    if data['count'] >= 2
                ]
                
                results['asr_preview'] = {
                    'glossary_additions': glossary_additions,
                    'rule_candidates': rule_candidates
                }
                
                logger.info(f"Job {job_id}: Generated ASR preview with {len(glossary_additions)} glossary terms and {len(rule_candidates)} rules")
        
        except Exception as e:
            logger.error(f"Job {job_id}: ASR processing failed: {str(e)}")
        
        update_job_status(job_id, 'RUNNING', 20, 'ASR corrections processed')
        
        # Check for cancellation before GEPA phase
        if is_job_cancelled(job_id):
            logger.info(f"Job {job_id} was cancelled before GEPA phase")
            return
        
        # Phase 2: GEPA Optimization (70% of total progress)
        logger.info(f"Job {job_id}: Starting GEPA optimization for {len(tasks)} tasks")
        update_job_status(job_id, 'RUNNING', 25, f'Starting GEPA optimization for {len(tasks)} tasks')
        
        gepa_candidates = []
        progress_per_task = 65 / len(tasks) if tasks else 0
        
        for i, task in enumerate(tasks):
            # Check for cancellation before each task
            if is_job_cancelled(job_id):
                logger.info(f"Job {job_id} was cancelled during task {task} optimization")
                return
            
            try:
                logger.info(f"Job {job_id}: Optimizing task {task} ({i+1}/{len(tasks)})")
                current_progress = 25 + int(i * progress_per_task)
                update_job_status(job_id, 'RUNNING', current_progress, f'Optimizing {task} agent ({i+1}/{len(tasks)})')
                
                # Check if DSPy enabled for this agent
                if not is_dspy_enabled(task):
                    logger.warn(f"Job {job_id}: DSPy not enabled for task: {task}")
                    continue
                
                # Configure language model for task
                configure_lm(task)
                
                # Run GEPA optimization in preview mode
                from llm.optim_gepa import GEPAOptimizer
                optimizer = GEPAOptimizer(task)
                optimization_results = optimizer.run_optimization_preview(iterations, with_human)
                
                if optimization_results and 'error' not in optimization_results:
                    candidate = {
                        'id': f"{task}-candidate-{int(now_melbourne().timestamp())}",
                        'task': task,
                        'before': optimization_results.get('original_prompt', ''),
                        'after': optimization_results.get('optimized_prompt', ''),
                        'metrics': {
                            'accuracy': optimization_results.get('final_accuracy', 0),
                            'completeness': optimization_results.get('final_completeness', 0),
                            'clinical_appropriateness': optimization_results.get('final_clinical', 0),
                            'overall_score': optimization_results.get('final_score', 0),
                            'improvement': optimization_results.get('improvement', 0)
                        }
                    }
                    gepa_candidates.append(candidate)
                    logger.info(f"Job {job_id}: Generated candidate for {task} with {optimization_results.get('improvement', 0):.1f}% improvement")
                else:
                    logger.error(f"Job {job_id}: GEPA optimization failed for task {task}")
                    
            except Exception as e:
                logger.error(f"Job {job_id}: GEPA optimization failed for task {task}: {str(e)}")
                continue
        
        results['gepa_preview'] = {
            'candidates': gepa_candidates
        }
        
        update_job_status(job_id, 'RUNNING', 90, 'GEPA optimization completed')
        
        # Check for cancellation before finalization
        if is_job_cancelled(job_id):
            logger.info(f"Job {job_id} was cancelled before finalization")
            return
        
        # Phase 3: Finalization (10% of total progress)
        logger.info(f"Job {job_id}: Finalizing overnight optimization")
        
        # Save results to job
        jobs_dir = Path('data/jobs')
        job_file = jobs_dir / f"{job_id}.json"
        
        if job_file.exists():
            with open(job_file, 'r') as f:
                job = json.load(f)
            
            job['results'] = results
            job['summary'] = f"Processed {len(tasks)} GEPA tasks, {len(results.get('asr_preview', {}).get('glossary_additions', []))} ASR glossary terms, {len(results.get('asr_preview', {}).get('rule_candidates', []))} ASR rules"
            
            with open(job_file, 'w') as f:
                json.dump(job, f, indent=2)
        
        update_job_status(job_id, 'DONE', 100, 'Overnight optimization completed', job['summary'])
        logger.info(f"Job {job_id}: Completed successfully")
        
    except Exception as e:
        error_msg = f"Overnight job {job_id} failed: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        update_job_status(job_id, 'ERROR', 0, 'Job failed', error_msg)

def job_processor():
    """Background thread for processing overnight jobs."""
    global job_processor_running
    
    while job_processor_running:
        try:
            with job_queue_lock:
                if job_queue:
                    job_data = job_queue.pop(0)
                else:
                    job_data = None
            
            if job_data:
                process_overnight_job(job_data)
            else:
                time.sleep(5)  # Sleep for 5 seconds when no jobs
                
        except Exception as e:
            logger.error(f"Job processor error: {str(e)}")
            logger.error(traceback.format_exc())
            time.sleep(5)

def start_job_processor():
    """Start the background job processor thread."""
    global job_processor_thread, job_processor_running
    
    if not job_processor_running:
        job_processor_running = True
        job_processor_thread = threading.Thread(target=job_processor, daemon=True)
        job_processor_thread.start()
        logger.info("Job processor thread started")

def stop_job_processor():
    """Stop the background job processor thread."""
    global job_processor_running
    job_processor_running = False
    if job_processor_thread:
        job_processor_thread.join(timeout=10)
    logger.info("Job processor thread stopped")

# Privacy Cleanup Processor

cleanup_processor_thread = None
cleanup_processor_running = False

def cleanup_processor():
    """
    Background privacy cleanup processor.
    Runs every 6 hours to clean up expired data.
    """
    logger.info("Privacy cleanup processor started")
    cleanup_interval = 6 * 60 * 60  # 6 hours in seconds
    
    while cleanup_processor_running:
        try:
            time.sleep(cleanup_interval)
            
            if not cleanup_processor_running:
                break
                
            logger.info("🧹 Running automatic privacy cleanup")
            
            # Run cleanup for each agent type
            agents_cleaned = 0
            total_stats = {
                'candidates_cleaned': 0,
                'jobs_cleaned': 0,
                'backups_cleaned': 0,
                'temp_files_cleaned': 0
            }
            
            for agent_type in PREDICTOR_CLASSES.keys():
                try:
                    optimizer = GEPAOptimizer(agent_type)
                    stats = optimizer.cleanup_expired_data(
                        max_age_days=30,
                        keep_recent_backups=5
                    )
                    
                    # Only log if something was cleaned
                    if (stats['candidates_cleaned'] > 0 or 
                        stats['jobs_cleaned'] > 0 or 
                        stats['backups_cleaned'] > 0 or 
                        stats['temp_files_cleaned'] > 0):
                        
                        logger.info(f"Cleaned up data for {agent_type}: "
                                  f"candidates={stats['candidates_cleaned']}, "
                                  f"jobs={stats['jobs_cleaned']}, "
                                  f"backups={stats['backups_cleaned']}, "
                                  f"temp={stats['temp_files_cleaned']}")
                        agents_cleaned += 1
                        
                        # Add to totals
                        for key, value in total_stats.items():
                            total_stats[key] += stats.get(key, 0)
                            
                except Exception as e:
                    logger.warning(f"Cleanup failed for {agent_type}: {e}")
                    
            if agents_cleaned > 0:
                logger.info(f"✅ Privacy cleanup completed for {agents_cleaned} agents: "
                          f"Total cleaned - candidates: {total_stats['candidates_cleaned']}, "
                          f"jobs: {total_stats['jobs_cleaned']}, "
                          f"backups: {total_stats['backups_cleaned']}, "
                          f"temp files: {total_stats['temp_files_cleaned']}")
            else:
                logger.debug("🧹 Privacy cleanup completed - no expired data found")
                
        except Exception as e:
            logger.error(f"Privacy cleanup processor error: {str(e)}")
            logger.error(traceback.format_exc())
            time.sleep(60)  # Wait a minute before retrying

def start_cleanup_processor():
    """Start the background privacy cleanup processor thread."""
    global cleanup_processor_thread, cleanup_processor_running
    
    if not cleanup_processor_running:
        cleanup_processor_running = True
        cleanup_processor_thread = threading.Thread(target=cleanup_processor, daemon=True)
        cleanup_processor_thread.start()
        logger.info("Privacy cleanup processor thread started")

def stop_cleanup_processor():
    """Stop the background privacy cleanup processor thread."""
    global cleanup_processor_running
    cleanup_processor_running = False
    if cleanup_processor_thread:
        cleanup_processor_thread.join(timeout=10)
    logger.info("Privacy cleanup processor thread stopped")

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
        uptime_seconds = (now_melbourne() - server_stats['start_time']).total_seconds()
        
        health_status = {
            'status': 'healthy',
            'timestamp': now_melbourne_iso(),
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
            'timestamp': now_melbourne_iso()
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
    start_time = now_melbourne()
    
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
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'result': result,
            'processing_time': round(processing_time),
            'cached': False,  # TODO: Implement caching detection
            'agent_type': agent_type,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('process', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"DSPy processing failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
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
    start_time = now_melbourne()
    
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
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'results': results,
            'summary': summary,
            'processing_time': round(processing_time),
            'agent_type': agent_type,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('evaluate', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"Evaluation failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
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
    start_time = now_melbourne()
    
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
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'results': results,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('optimize', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"Optimization failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('optimize', success=False, error=error_msg)
        return jsonify(response), 500
    
    finally:
        server_stats['active_optimizations'] = max(0, server_stats['active_optimizations'] - 1)

# ASR Optimization Endpoints

@app.route('/v1/asr/preview', methods=['POST'])
def asr_preview_endpoint():
    """
    Preview ASR corrections from daily usage.
    
    Request:
        {
            "since": "2025-01-01T00:00:00Z",  // Optional ISO date
            "maxTerms": 50,                   // Optional max glossary terms
            "maxRules": 30                    // Optional max correction rules
        }
    
    Response:
        {
            "success": true,
            "data": {
                "glossary_additions": [
                    {"term": "atorvastatin", "count": 12}
                ],
                "rule_candidates": [
                    {"raw": "metroprolol", "fix": "metoprolol", "count": 5, "examples": ["..."]}
                ]
            }
        }
    """
    start_time = now_melbourne()
    
    try:
        data = request.get_json() or {}
        since = data.get('since')
        max_terms = data.get('maxTerms', 50)
        max_rules = data.get('maxRules', 30)
        
        logger.info(f"ASR preview requested - Since: {since}, MaxTerms: {max_terms}, MaxRules: {max_rules}")
        
        # Get corrections from request or load from data files
        corrections = data.get('corrections', [])
        
        if not corrections:
            # Try to load from uploaded corrections file (placeholder for now)
            corrections_file = Path('data/asr/uploaded_corrections.json')
            if corrections_file.exists():
                with open(corrections_file, 'r') as f:
                    corrections = json.load(f)
        
        # Aggregate corrections into glossary terms and rules
        glossary_terms = {}
        correction_rules = {}
        
        for correction in corrections:
            if since:
                correction_time = datetime.fromisoformat(correction.get('timestamp', '2025-01-01T00:00:00Z').replace('Z', '+00:00'))
                since_time = datetime.fromisoformat(since.replace('Z', '+00:00'))
                if correction_time < since_time:
                    continue
            
            raw_text = correction.get('rawText', '').lower()
            corrected_text = correction.get('correctedText', '').lower()
            
            # Extract medical terms for glossary
            corrected_words = extract_medical_terms(corrected_text)
            for word in corrected_words:
                if len(word) > 3 and is_medical_term(word):
                    glossary_terms[word] = glossary_terms.get(word, 0) + 1
            
            # Extract correction pairs
            corrections_pairs = extract_correction_pairs(raw_text, corrected_text)
            for raw, fix in corrections_pairs:
                key = f"{raw}→{fix}"
                if key not in correction_rules:
                    correction_rules[key] = {'count': 0, 'examples': []}
                correction_rules[key]['count'] += 1
                if len(correction_rules[key]['examples']) < 3:
                    snippet = get_context_snippet(raw_text, raw)
                    correction_rules[key]['examples'].append(snippet)
        
        # Sort and limit results
        glossary_additions = [
            {'term': term, 'count': count} 
            for term, count in sorted(glossary_terms.items(), key=lambda x: x[1], reverse=True)[:max_terms]
            if count >= 2  # Minimum frequency filter
        ]
        
        rule_candidates = [
            {
                'raw': key.split('→')[0],
                'fix': key.split('→')[1], 
                'count': data['count'],
                'examples': data['examples']
            }
            for key, data in sorted(correction_rules.items(), key=lambda x: x[1]['count'], reverse=True)[:max_rules]
            if data['count'] >= 2  # Minimum frequency filter
        ]
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'data': {
                'glossary_additions': glossary_additions,
                'rule_candidates': rule_candidates
            },
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/preview', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"ASR preview failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/preview', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/asr/apply', methods=['POST'])
def asr_apply_endpoint():
    """
    Apply approved ASR corrections to data files.
    
    Request:
        {
            "approve_glossary": ["atorvastatin", "metoprolol"],
            "approve_rules": [{"raw": "metroprolol", "fix": "metoprolol"}]
        }
    
    Response:
        {
            "success": true,
            "data": {
                "written": {"glossary": 2, "rules": 1},
                "paths": ["data/asr/glossary.txt", "data/asr/user_rules.json"]
            }
        }
    """
    start_time = now_melbourne()
    
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['approve_glossary', 'approve_rules'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        approve_glossary = data['approve_glossary']
        approve_rules = data['approve_rules']
        
        logger.info(f"ASR apply requested - Glossary: {len(approve_glossary)}, Rules: {len(approve_rules)}")
        
        # Create data directories
        asr_data_dir = Path('data/asr')
        asr_data_dir.mkdir(parents=True, exist_ok=True)
        
        paths_written = []
        
        # Write glossary terms
        if approve_glossary:
            glossary_file = asr_data_dir / 'glossary.txt'
            
            # Load existing glossary
            existing_terms = set()
            if glossary_file.exists():
                with open(glossary_file, 'r') as f:
                    existing_terms = set(line.strip() for line in f if line.strip())
            
            # Add new terms
            new_terms = set(approve_glossary) - existing_terms
            if new_terms:
                with open(glossary_file, 'a') as f:
                    for term in sorted(new_terms):
                        f.write(f"{term}\n")
                paths_written.append(str(glossary_file))
        
        # Write correction rules
        if approve_rules:
            rules_file = asr_data_dir / 'user_rules.json'
            
            # Load existing rules
            existing_rules = []
            if rules_file.exists():
                with open(rules_file, 'r') as f:
                    existing_rules = json.load(f)
            
            # Convert existing rules to set for deduplication
            existing_rule_keys = set(f"{rule['raw']}→{rule['fix']}" for rule in existing_rules)
            
            # Add new rules
            new_rules = []
            for rule in approve_rules:
                rule_key = f"{rule['raw']}→{rule['fix']}"
                if rule_key not in existing_rule_keys:
                    new_rules.append(rule)
                    existing_rule_keys.add(rule_key)
            
            if new_rules:
                all_rules = existing_rules + new_rules
                with open(rules_file, 'w') as f:
                    json.dump(all_rules, f, indent=2)
                paths_written.append(str(rules_file))
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'data': {
                'written': {
                    'glossary': len(approve_glossary),
                    'rules': len(approve_rules)
                },
                'paths': paths_written
            },
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/apply', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"ASR apply failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/apply', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/asr/current', methods=['GET'])
def asr_current_endpoint():
    """
    Get current ASR corrections state.
    
    Response:
        {
            "success": true,
            "data": {
                "glossary": ["atorvastatin", "metoprolol"],
                "rules": [{"raw": "metroprolol", "fix": "metoprolol"}]
            }
        }
    """
    try:
        asr_data_dir = Path('data/asr')
        
        # Load glossary
        glossary = []
        glossary_file = asr_data_dir / 'glossary.txt'
        if glossary_file.exists():
            with open(glossary_file, 'r') as f:
                glossary = [line.strip() for line in f if line.strip()]
        
        # Load rules
        rules = []
        rules_file = asr_data_dir / 'user_rules.json'
        if rules_file.exists():
            with open(rules_file, 'r') as f:
                rules = json.load(f)
        
        response = {
            'success': True,
            'data': {
                'glossary': glossary,
                'rules': rules
            },
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/current', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"ASR current state failed: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/current', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/asr/corrections', methods=['POST'])
def asr_corrections_endpoint():
    """
    Upload corrections from Chrome extension.
    
    Request:
        {
            "corrections": [
                {
                    "id": "asr-123",
                    "rawText": "metroprolol",
                    "correctedText": "metoprolol",
                    "agentType": "medication",
                    "timestamp": 1234567890
                }
            ]
        }
    
    Response:
        {
            "success": true,
            "data": {"uploaded": 1}
        }
    """
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['corrections'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        corrections = data['corrections']
        
        # Create data directory
        asr_data_dir = Path('data/asr')
        asr_data_dir.mkdir(parents=True, exist_ok=True)
        
        # Save corrections for preview processing
        corrections_file = asr_data_dir / 'uploaded_corrections.json'
        with open(corrections_file, 'w') as f:
            json.dump(corrections, f, indent=2)
        
        logger.info(f"ASR corrections uploaded: {len(corrections)} entries")
        
        response = {
            'success': True,
            'data': {'uploaded': len(corrections)},
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/corrections', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"ASR corrections upload failed: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('asr/corrections', success=False, error=error_msg)
        return jsonify(response), 500

# Enhanced GEPA Optimization Endpoints

@app.route('/v1/dspy/optimize/preview', methods=['POST'])
def gepa_preview_endpoint():
    """
    Preview GEPA optimization candidates without saving.
    
    Request:
        {
            "tasks": ["angiogram-pci", "quick-letter"],
            "iterations": 5,
            "with_human": false
        }
    
    Response:
        {
            "success": true,
            "data": {
                "candidates": [
                    {
                        "id": "angiogram-pci-candidate-1",
                        "task": "angiogram-pci",
                        "before": "Current system prompt...",
                        "after": "Optimized system prompt...",
                        "metrics": {
                            "accuracy": 85.2,
                            "completeness": 78.5,
                            "clinical_appropriateness": 89.1,
                            "overall_score": 84.3
                        }
                    }
                ]
            }
        }
    """
    start_time = now_melbourne()
    
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['tasks'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        tasks = data['tasks']
        iterations = data.get('iterations', 5)
        with_human = data.get('with_human', False)
        
        logger.info(f"GEPA preview requested - Tasks: {tasks}, Iterations: {iterations}, Human: {with_human}")
        
        candidates = []
        
        for task in tasks:
            # Check if DSPy enabled for this agent
            if not is_dspy_enabled(task):
                logger.warn(f"DSPy not enabled for task: {task}")
                continue
            
            try:
                # Configure language model for task
                configure_lm(task)
                
                # Run GEPA optimization in preview mode (dry run)
                optimizer = GEPAOptimizer(task)
                optimization_results = optimizer.run_optimization_preview(iterations, with_human)
                
                if optimization_results:
                    candidate = {
                        'id': f"{task}-candidate-{int(now_melbourne().timestamp())}",
                        'task': task,
                        'before': optimization_results.get('original_prompt', ''),
                        'after': optimization_results.get('optimized_prompt', ''),
                        'metrics': {
                            'accuracy': optimization_results.get('final_accuracy', 0),
                            'completeness': optimization_results.get('final_completeness', 0),
                            'clinical_appropriateness': optimization_results.get('final_clinical', 0),
                            'overall_score': optimization_results.get('final_score', 0),
                            'improvement': optimization_results.get('improvement', 0)
                        }
                    }
                    candidates.append(candidate)
                
            except Exception as e:
                logger.error(f"GEPA preview failed for task {task}: {str(e)}")
                # Continue with other tasks
                continue
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'data': {
                'candidates': candidates
            },
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/preview', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"GEPA preview failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/preview', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/dspy/optimize/apply', methods=['POST'])
def gepa_apply_endpoint():
    """
    Apply approved GEPA optimization candidates.
    
    Request:
        {
            "accepted": [
                {"task": "angiogram-pci", "candidate_id": "angiogram-pci-candidate-123"}
            ]
        }
    
    Response:
        {
            "success": true,
            "data": {
                "applied": [
                    {
                        "task": "angiogram-pci",
                        "candidate_id": "angiogram-pci-candidate-123",
                        "metrics_before": {...},
                        "metrics_after": {...},
                        "saved_path": "llm/prompts/angiogram-pci-optimized.dspy"
                    }
                ],
                "errors": []
            }
        }
    """
    start_time = now_melbourne()
    
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['accepted'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        accepted = data['accepted']
        applied = []
        errors = []
        
        logger.info(f"GEPA apply requested - Candidates: {len(accepted)}")
        
        for item in accepted:
            task = item.get('task')
            candidate_id = item.get('candidate_id')
            
            if not task or not candidate_id:
                errors.append({
                    'task': task or 'unknown',
                    'candidate_id': candidate_id or 'unknown',
                    'error': 'Missing task or candidate_id'
                })
                continue
            
            try:
                # Check if DSPy enabled
                if not is_dspy_enabled(task):
                    raise DSPyServerError(f"DSPy not enabled for task: {task}")
                
                # Configure language model
                configure_lm(task)
                
                # Apply optimization and save state
                optimizer = GEPAOptimizer(task)
                apply_results = optimizer.apply_candidate(candidate_id)
                
                if apply_results:
                    applied_item = {
                        'task': task,
                        'candidate_id': candidate_id,
                        'metrics_before': apply_results.get('metrics_before', {}),
                        'metrics_after': apply_results.get('metrics_after', {}),
                        'saved_path': apply_results.get('saved_path', '')
                    }
                    applied.append(applied_item)
                    
                    # Log to history
                    save_gepa_history_entry(task, apply_results)
                else:
                    errors.append({
                        'task': task,
                        'candidate_id': candidate_id,
                        'error': 'Failed to apply optimization'
                    })
                
            except Exception as e:
                logger.error(f"GEPA apply failed for task {task}: {str(e)}")
                errors.append({
                    'task': task,
                    'candidate_id': candidate_id,
                    'error': str(e)
                })
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'data': {
                'applied': applied,
                'errors': errors
            },
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/apply', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"GEPA apply failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/apply', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/dspy/optimize/history', methods=['GET'])
def gepa_history_endpoint():
    """
    Get GEPA optimization history.
    
    Response:
        {
            "success": true,
            "data": [
                {
                    "timestamp": "2025-01-01T10:00:00Z",
                    "task": "angiogram-pci",
                    "metrics_before": {...},
                    "metrics_after": {...},
                    "improvement": 5.2,
                    "file_paths": ["llm/prompts/angiogram-pci-optimized.dspy"]
                }
            ]
        }
    """
    try:
        history_file = Path('data/gepa/optimization_history.json')
        
        if history_file.exists():
            with open(history_file, 'r') as f:
                history = json.load(f)
        else:
            history = []
        
        # Sort by timestamp descending (most recent first)
        history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        response = {
            'success': True,
            'data': history[:50],  # Limit to 50 most recent entries
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/history', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"GEPA history failed: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/history', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/dspy/optimize/rollback', methods=['POST'])
def gepa_rollback_endpoint():
    """
    Rollback GEPA optimization to a specific version.
    
    Request:
        {
            "agent_type": "angiogram-pci",
            "version": 3
        }
        
    Response:
        {
            "success": true,
            "data": {
                "agent_type": "angiogram-pci",
                "rollback_from_version": 5,
                "rollback_to_version": 3,
                "rollback_version": 6,
                "target_metrics": {...},
                "current_metrics": {...}
            }
        }
    """
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['agent_type', 'version'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        agent_type = data['agent_type']
        version = data['version']
        
        logger.info(f"GEPA rollback requested - Agent: {agent_type}, Version: {version}")
        
        # Configure DSPy for this agent
        configure_lm(agent_type)
        
        # Perform rollback
        optimizer = GEPAOptimizer(agent_type)
        rollback_results = optimizer.rollback_to_version(version)
        
        if 'error' in rollback_results:
            raise DSPyServerError(rollback_results['error'])
        
        response = {
            'success': True,
            'data': rollback_results,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/rollback', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"GEPA rollback failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/rollback', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/dspy/optimize/versions/<agent_type>', methods=['GET'])
def gepa_versions_endpoint(agent_type):
    """
    Get version history for an agent.
    
    Response:
        {
            "success": true,
            "data": [
                {
                    "version": 5,
                    "timestamp": "2024-01-15T09:00:00Z",
                    "score": 87.5,
                    "improvement": 2.1,
                    "is_rollback": false
                }
            ]
        }
    """
    try:
        logger.info(f"Version history requested for agent: {agent_type}")
        
        # Configure DSPy for this agent
        configure_lm(agent_type)
        
        # Get version history
        optimizer = GEPAOptimizer(agent_type)
        versions = optimizer.list_version_history()
        
        response = {
            'success': True,
            'data': versions,
            'timestamp': now_melbourne_iso()
        }
        
        log_request(f'dspy/optimize/versions/{agent_type}', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Version history failed for {agent_type}: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request(f'dspy/optimize/versions/{agent_type}', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/dspy/optimize/backup', methods=['POST'])
def gepa_backup_endpoint():
    """
    Create backup snapshot of current state.
    
    Request:
        {
            "agent_type": "angiogram-pci",
            "reason": "Before major optimization"
        }
        
    Response:
        {
            "success": true,
            "data": {
                "agent_type": "angiogram-pci",
                "backup_version": 6,
                "backup_reason": "Before major optimization",
                "metrics": {...}
            }
        }
    """
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['agent_type'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        agent_type = data['agent_type']
        reason = data.get('reason', 'Manual backup via API')
        
        logger.info(f"Backup requested for agent: {agent_type}, Reason: {reason}")
        
        # Configure DSPy for this agent
        configure_lm(agent_type)
        
        # Create backup
        optimizer = GEPAOptimizer(agent_type)
        backup_results = optimizer.create_backup_snapshot(reason)
        
        if 'error' in backup_results:
            raise DSPyServerError(backup_results['error'])
        
        response = {
            'success': True,
            'data': backup_results,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/backup', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Backup creation failed: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/optimize/backup', success=False, error=error_msg)
        return jsonify(response), 500


@app.route('/v1/dspy/cleanup', methods=['POST'])
def cleanup_endpoint():
    """
    Privacy housekeeping: Clean up expired candidates, jobs, and backups.
    
    Request:
        {
            "agent_type": "angiogram-pci",
            "max_age_days": 30,
            "keep_recent_backups": 5
        }
        
    Response:
        {
            "success": true,
            "data": {
                "candidates_cleaned": 12,
                "candidates_kept": 5,
                "jobs_cleaned": 8,
                "jobs_kept": 3,
                "backups_cleaned": 15,
                "backups_kept": 5,
                "temp_files_cleaned": 7,
                "errors": []
            }
        }
    """
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['agent_type'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        agent_type = data['agent_type']
        max_age_days = data.get('max_age_days', 30)
        keep_recent_backups = data.get('keep_recent_backups', 5)
        
        # Validate parameters
        if not isinstance(max_age_days, int) or max_age_days <= 0:
            raise DSPyServerError("max_age_days must be a positive integer")
            
        if not isinstance(keep_recent_backups, int) or keep_recent_backups < 0:
            raise DSPyServerError("keep_recent_backups must be a non-negative integer")
        
        logger.info(f"Privacy cleanup requested for agent: {agent_type}, max_age_days: {max_age_days}, keep_recent_backups: {keep_recent_backups}")
        
        # Configure DSPy for this agent
        configure_lm(agent_type)
        
        # Run cleanup
        optimizer = GEPAOptimizer(agent_type)
        cleanup_stats = optimizer.cleanup_expired_data(max_age_days, keep_recent_backups)
        
        response = {
            'success': True,
            'data': cleanup_stats,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/cleanup', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Privacy cleanup failed: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('dspy/cleanup', success=False, error=error_msg)
        return jsonify(response), 500

# Overnight Optimization Endpoints

@app.route('/v1/optimize/overnight', methods=['POST'])
def overnight_optimize_endpoint():
    """
    Start combined overnight optimization job.
    
    Request:
        {
            "tasks": ["angiogram-pci", "quick-letter"],
            "iterations": 5,
            "with_human": false,
            "asr": {
                "since": "2025-01-01T00:00:00Z",
                "maxTerms": 50,
                "maxRules": 30
            }
        }
    
    Response:
        {
            "success": true,
            "data": {
                "job_id": "overnight-job-123456789",
                "status": "QUEUED",
                "started_at": "2025-01-01T02:00:00Z"
            }
        }
    """
    start_time = now_melbourne()
    
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['tasks'])
        if validation_error:
            raise DSPyServerError(validation_error)
        
        tasks = data['tasks']
        iterations = data.get('iterations', 5)
        with_human = data.get('with_human', False)
        asr_options = data.get('asr', {})
        
        # Generate job ID
        job_id = f"overnight-job-{int(now_melbourne().timestamp())}"
        
        logger.info(f"Overnight optimization requested - Job: {job_id}, Tasks: {tasks}")
        
        # Create job record
        job = {
            'job_id': job_id,
            'status': 'QUEUED',
            'started_at': now_melbourne_iso(),
            'tasks': tasks,
            'iterations': iterations,
            'with_human': with_human,
            'asr_options': asr_options
        }
        
        # Save job to file
        jobs_dir = Path('data/jobs')
        jobs_dir.mkdir(parents=True, exist_ok=True)
        
        job_file = jobs_dir / f"{job_id}.json"
        with open(job_file, 'w') as f:
            json.dump(job, f, indent=2)
        
        # Queue job for background processing
        with job_queue_lock:
            job_queue.append(job)
        
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        
        response = {
            'success': True,
            'data': {
                'job_id': job_id,
                'status': 'QUEUED',
                'started_at': job['started_at']
            },
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('optimize/overnight', success=True)
        return jsonify(response)
        
    except Exception as e:
        processing_time = (now_melbourne() - start_time).total_seconds() * 1000
        error_msg = f"Overnight optimization failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        response = {
            'success': False,
            'error': error_msg,
            'processing_time': round(processing_time),
            'timestamp': now_melbourne_iso()
        }
        
        log_request('optimize/overnight', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/jobs', methods=['GET'])
def list_jobs_endpoint():
    """
    List jobs with optional status filtering.
    
    Query Parameters:
        status (optional): Filter by job status (QUEUED, RUNNING, DONE, ERROR)
        
    Response:
        {
            "success": true,
            "data": [
                {
                    "job_id": "overnight-job-123",
                    "status": "DONE",
                    "started_at": "2024-01-15T09:00:00Z",
                    "completed_at": "2024-01-15T10:30:00Z", 
                    "summary": "Processed 3 GEPA tasks, 12 ASR terms",
                    "results": {...}
                }
            ]
        }
    """
    try:
        status_filter = request.args.get('status', None)
        
        jobs_dir = Path('data/jobs')
        if not jobs_dir.exists():
            return jsonify({
                'success': True,
                'data': [],
                'timestamp': now_melbourne_iso()
            })
        
        jobs = []
        for job_file in jobs_dir.glob('*.json'):
            try:
                with open(job_file, 'r') as f:
                    job = json.load(f)
                
                # Filter by status if specified
                if status_filter and job.get('status') != status_filter:
                    continue
                    
                jobs.append(job)
                
            except Exception as e:
                logger.warning(f"Failed to read job file {job_file}: {str(e)}")
                continue
        
        # Sort by started_at timestamp, newest first
        jobs.sort(key=lambda x: x.get('started_at', ''), reverse=True)
        
        response = {
            'success': True,
            'data': jobs,
            'timestamp': now_melbourne_iso()
        }
        
        log_request('jobs', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Failed to list jobs: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'data': [],
            'timestamp': now_melbourne_iso()
        }
        
        log_request('jobs', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/jobs/<job_id>', methods=['GET'])
def job_status_endpoint(job_id):
    """
    Get job status for polling.
    
    Response:
        {
            "success": true,
            "data": {
                "job_id": "overnight-job-123456789",
                "status": "RUNNING",
                "progress": 45,
                "current_phase": "Running GEPA optimization",
                "estimated_completion": "2025-01-01T03:30:00Z"
            }
        }
    """
    try:
        job_file = Path(f'data/jobs/{job_id}.json')
        
        if not job_file.exists():
            raise DSPyServerError(f"Job not found: {job_id}")
        
        with open(job_file, 'r') as f:
            job = json.load(f)
        
        # Return job status
        response = {
            'success': True,
            'data': {
                'job_id': job_id,
                'status': job.get('status', 'UNKNOWN'),
                'progress': job.get('progress', 0),
                'current_phase': job.get('current_phase', ''),
                'estimated_completion': job.get('estimated_completion', ''),
                'summary': job.get('summary', '')
            },
            'timestamp': now_melbourne_iso()
        }
        
        log_request(f'jobs/{job_id}', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Job status failed: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }
        
        log_request(f'jobs/{job_id}', success=False, error=error_msg)
        return jsonify(response), 500

@app.route('/v1/jobs/<job_id>/cancel', methods=['POST'])
def cancel_job_endpoint(job_id):
    """
    Cancel a running optimization job.
    
    Response:
        {
            "success": true,
            "data": {"cancelled": true}
        }
    """
    try:
        job_file = Path(f'data/jobs/{job_id}.json')
        
        if not job_file.exists():
            raise DSPyServerError(f"Job not found: {job_id}")
        
        with open(job_file, 'r') as f:
            job = json.load(f)
        
        current_status = job.get('status', 'UNKNOWN')
        
        # Only cancel jobs that are queued or running
        if current_status in ['QUEUED', 'RUNNING']:
            # Remove from queue if still queued
            with job_queue_lock:
                job_queue[:] = [j for j in job_queue if j['job_id'] != job_id]
            
            # Update job status to cancelled
            update_job_status(job_id, 'ERROR', 0, 'Job cancelled by user', 'Job was cancelled before completion')
            
            logger.info(f"Job {job_id} cancelled by user")
            
            response = {
                'success': True,
                'data': {'cancelled': True},
                'timestamp': now_melbourne_iso()
            }
        else:
            response = {
                'success': False,
                'error': f'Cannot cancel job in {current_status} state',
                'data': {'cancelled': False},
                'timestamp': now_melbourne_iso()
            }
        
        log_request(f'jobs/{job_id}/cancel', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Job cancellation failed: {str(e)}"
        logger.error(error_msg)
        
        response = {
            'success': False,
            'error': error_msg,
            'data': {'cancelled': False},
            'timestamp': now_melbourne_iso()
        }
        
        log_request(f'jobs/{job_id}/cancel', success=False, error=error_msg)
        return jsonify(response), 500

# Helper Functions for GEPA

def save_gepa_history_entry(task, results):
    """Save GEPA optimization history entry."""
    try:
        history_dir = Path('data/gepa')
        history_dir.mkdir(parents=True, exist_ok=True)
        
        history_file = history_dir / 'optimization_history.json'
        
        # Load existing history
        if history_file.exists():
            with open(history_file, 'r') as f:
                history = json.load(f)
        else:
            history = []
        
        # Add new entry
        entry = {
            'timestamp': now_melbourne_iso(),
            'task': task,
            'metrics_before': results.get('metrics_before', {}),
            'metrics_after': results.get('metrics_after', {}),
            'improvement': results.get('improvement', 0),
            'file_paths': [results.get('saved_path', '')],
            'notes': f"GEPA optimization applied via API"
        }
        
        history.append(entry)
        
        # Keep only last 100 entries
        history = history[-100:]
        
        # Save history
        with open(history_file, 'w') as f:
            json.dump(history, f, indent=2)
        
        logger.info(f"GEPA history entry saved for task: {task}")
        
    except Exception as e:
        logger.error(f"Failed to save GEPA history: {str(e)}")

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
            'timestamp': now_melbourne_iso()
        }
        
        log_request('agents', success=True)
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Failed to list agents: {str(e)}"
        log_request('agents', success=False, error=error_msg)
        return jsonify({
            'error': error_msg,
            'timestamp': now_melbourne_iso()
        }), 500

# ASR Helper Functions

def extract_medical_terms(text):
    """Extract potential medical terms from text."""
    import re
    # Extract potential medical terms (capitalized words, medical abbreviations, etc.)
    medical_term_pattern = r'\b(?:[A-Z][a-z]+|[A-Z]{2,}|[a-z]+-[a-z]+)\b'
    return [match for match in re.findall(medical_term_pattern, text)]

def is_medical_term(word):
    """Simple heuristic to identify likely medical terms."""
    import re
    medical_indicators = [
        r'^\d+mg$', r'^\d+mcg$', r'^\d+ml$', r'^\d+%$',  # Dosages/measurements
        r'^[A-Z]{2,}$', # Abbreviations like EF, LVEF, etc.
        r'-[a-z]+$', # Hyphenated terms
        r'ation$', r'itis$', r'osis$', r'pathy$' # Medical suffixes
    ]
    
    return any(re.search(pattern, word) for pattern in medical_indicators) or len(word) > 6

def extract_correction_pairs(raw_text, corrected_text):
    """Extract word-level corrections between raw and corrected text."""
    raw_words = raw_text.split()
    corrected_words = corrected_text.split()
    corrections = []
    
    # Simple word-level diff to find corrections
    min_length = min(len(raw_words), len(corrected_words))
    for i in range(min_length):
        if raw_words[i] != corrected_words[i]:
            corrections.append((raw_words[i], corrected_words[i]))
    
    return corrections

def get_context_snippet(text, term):
    """Get context snippet around a term."""
    term_lower = term.lower()
    text_lower = text.lower()
    index = text_lower.find(term_lower)
    
    if index == -1:
        return text[:50] + '...' if len(text) > 50 else text
    
    start = max(0, index - 20)
    end = min(len(text), index + len(term) + 20)
    snippet = text[start:end]
    
    return ('...' + snippet) if start > 0 else snippet

def initialize_server():
    """Initialize DSPy server configuration and dependencies."""
    try:
        logger.info("Initializing DSPy server...")
        
        # Check DSPy configuration
        config = get_config()
        if not config:
            raise DSPyServerError("Failed to load DSPy configuration")
        
        # Verify required directories exist
        required_dirs = ['eval/devset', 'eval/feedback', 'llm/prompts', 'data/asr']
        for dir_path in required_dirs:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
        
        # Start background job processor
        start_job_processor()
        
        # Start background privacy cleanup processor
        start_cleanup_processor()
        
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
        stop_job_processor()
        stop_cleanup_processor()
    except Exception as e:
        print(f"❌ Server error: {e}")
        logger.error(f"Server error: {e}")
        stop_job_processor()
        stop_cleanup_processor()
        sys.exit(1)

if __name__ == '__main__':
    main()