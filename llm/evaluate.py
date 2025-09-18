"""
Medical Report Evaluation Framework

Comprehensive evaluation system using existing MedicalReportValidator patterns
and medical dictation test data. Provides rubric-based scoring for:

1. Angiogram/PCI Reports - TIMI flow, vessel assessment, device specifications
2. Clinical Letters - Narrative flow, terminology, recommendations
3. Investigation Summaries - Result organization and clinical correlation
4. Other medical documentation types

Uses existing medical knowledge and validation patterns from the test suite.
"""

import json
import re
import glob
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import argparse
from datetime import datetime

from .dspy_config import get_config, configure_lm, is_dspy_enabled
from .predictors import get_predictor, process_with_dspy
from .utils import atomic_write_json


class MedicalRubricScorer:
    """
    Medical-specific rubric scoring based on existing MedicalReportValidator patterns.
    
    Provides comprehensive evaluation criteria for different medical documentation types
    using established clinical validation rules and terminology requirements.
    """
    
    def __init__(self):
        # Medical terminology patterns based on existing validators
        self.timi_flow_pattern = re.compile(r'\bTIMI\s*[0-3IIV]+\b', re.I)
        self.stenosis_pattern = re.compile(r'\b(?:mild|moderate|severe|critical)\s+stenosis\b', re.I)
        self.medication_pattern = re.compile(r'\b\d+(?:\.\d+)?\s*(?:mg|mcg|g)\s+(?:daily|twice\s+daily|bd|od)\b', re.I)
        self.vessel_pattern = re.compile(r'\b(?:LM|LAD|LCx|RCA|diagonal|marginal)\b', re.I)
        self.device_pattern = re.compile(r'\b\d+(?:\.\d+)?\s*(?:×|x)\s*\d+\s*mm\b', re.I)
        
        # Australian spelling patterns
        self.australian_spelling = {
            'centre': 'center', 'colour': 'color', 'favour': 'favor',
            'recognise': 'recognize', 'optimise': 'optimize', 
            'haemodynamic': 'hemodynamic', 'anaesthesia': 'anesthesia'
        }


def angiogram_rubric_scorer(report_text: str) -> Dict[str, Any]:
    """
    Comprehensive scoring rubric for angiogram/PCI reports.
    
    Based on existing AngiogramPCI validation patterns and medical requirements.
    Evaluates clinical accuracy, terminology usage, and report completeness.
    """
    scorer = MedicalRubricScorer()
    checks = {}
    score = 0
    max_score = 100
    
    # TIMI Flow Assessment (20 points)
    has_timi = bool(scorer.timi_flow_pattern.search(report_text))
    checks['has_TIMI_flow'] = has_timi
    if has_timi:
        score += 20
        checks['timi_details'] = scorer.timi_flow_pattern.findall(report_text)
    else:
        checks['timi_missing'] = "TIMI flow assessment not documented"
    
    # Stenosis Grading (15 points) 
    has_stenosis_grading = bool(scorer.stenosis_pattern.search(report_text))
    checks['has_stenosis_grading'] = has_stenosis_grading
    if has_stenosis_grading:
        score += 15
        checks['stenosis_terms'] = scorer.stenosis_pattern.findall(report_text)
    
    # Vessel Assessment Coverage (20 points)
    vessel_matches = scorer.vessel_pattern.findall(report_text)
    vessel_coverage = len(set(vessel_matches))
    checks['vessel_coverage'] = vessel_coverage
    if vessel_coverage >= 3:  # At least 3 major vessels
        score += 20
    elif vessel_coverage >= 2:
        score += 12
    elif vessel_coverage >= 1:
        score += 6
    checks['vessels_documented'] = list(set(vessel_matches))
    
    # Device Specifications (15 points) - for PCI cases
    has_devices = bool(scorer.device_pattern.search(report_text))
    checks['has_device_specs'] = has_devices
    if has_devices:
        score += 15
        checks['device_specs'] = scorer.device_pattern.findall(report_text)
    
    # Report Structure (15 points)
    sections = ['preamble', 'findings', 'procedure', 'conclusion']
    section_count = sum(1 for section in sections 
                       if section.lower() in report_text.lower())
    checks['section_coverage'] = section_count
    if section_count >= 3:
        score += 15
    elif section_count >= 2:
        score += 10
    elif section_count >= 1:
        score += 5
    
    # Medical Terminology (10 points)
    terminology_score = 0
    if 'catheterisation' in report_text or 'catheterization' in report_text:
        terminology_score += 3
    if 'hemodynamic' in report_text or 'haemodynamic' in report_text:
        terminology_score += 3
    if any(term in report_text.lower() for term in ['coronary', 'angiography', 'intervention']):
        terminology_score += 4
    score += terminology_score
    checks['terminology_score'] = terminology_score
    
    # Australian Spelling (5 points)
    australian_count = sum(1 for aus_term in scorer.australian_spelling.keys()
                          if aus_term in report_text.lower())
    spelling_score = min(5, australian_count * 2)
    score += spelling_score
    checks['australian_spelling_score'] = spelling_score
    
    # Overall assessment
    checks['total_score'] = score
    checks['max_score'] = max_score
    checks['percentage'] = round((score / max_score) * 100, 1)
    checks['passed'] = score >= 75  # 75% threshold
    
    return checks


def quick_letter_rubric_scorer(letter_text: str) -> Dict[str, Any]:
    """
    Comprehensive scoring rubric for clinical letters.
    
    Based on QuickLetterAgent validation patterns and clinical correspondence standards.
    Evaluates narrative flow, clinical reasoning, and professional formatting.
    """
    scorer = MedicalRubricScorer()
    checks = {}
    score = 0
    max_score = 100
    
    # Narrative Flow (25 points)
    word_count = len(letter_text.split())
    paragraph_count = len([p for p in letter_text.split('\n\n') if p.strip()])
    
    checks['word_count'] = word_count
    checks['paragraph_count'] = paragraph_count
    
    if word_count >= 100:  # Adequate length
        score += 10
    if paragraph_count >= 2:  # Multiple paragraphs
        score += 10
    if not re.search(r'\b(?:um|uh|er)\b', letter_text, re.I):  # No filler words
        score += 5
    
    # Clinical Content (25 points)
    clinical_indicators = ['patient', 'examination', 'assessment', 'plan', 'follow', 'recommend']
    clinical_coverage = sum(1 for indicator in clinical_indicators
                           if indicator in letter_text.lower())
    clinical_score = min(25, clinical_coverage * 4)
    score += clinical_score
    checks['clinical_coverage'] = clinical_coverage
    
    # Medical Terminology (20 points)
    medication_matches = scorer.medication_pattern.findall(letter_text)
    checks['has_medications'] = len(medication_matches) > 0
    if medication_matches:
        score += 10
        checks['medication_specs'] = medication_matches
    
    # Look for medical conditions/findings
    medical_terms = ['hypertension', 'diabetes', 'coronary', 'cardiac', 'stenosis', 'regurgitation']
    medical_term_count = sum(1 for term in medical_terms if term in letter_text.lower())
    medical_term_score = min(10, medical_term_count * 2)
    score += medical_term_score
    checks['medical_terms_count'] = medical_term_count
    
    # Professional Formatting (15 points)
    # Check for proper letter structure
    has_greeting = any(greeting in letter_text.lower() 
                      for greeting in ['dear', 'thank you for', 'patient'])
    has_conclusion = any(conclusion in letter_text.lower()
                        for conclusion in ['follow up', 'follow-up', 'contact', 'regard'])
    
    if has_greeting:
        score += 7
    if has_conclusion:
        score += 8
    
    checks['has_greeting'] = has_greeting
    checks['has_conclusion'] = has_conclusion
    
    # Clinical Reasoning (15 points)
    reasoning_indicators = ['therefore', 'because', 'due to', 'given', 'considering', 'plan', 'recommend']
    reasoning_count = sum(1 for indicator in reasoning_indicators
                         if indicator in letter_text.lower())
    reasoning_score = min(15, reasoning_count * 3)
    score += reasoning_score
    checks['clinical_reasoning_score'] = reasoning_count
    
    # Overall assessment
    checks['total_score'] = score
    checks['max_score'] = max_score
    checks['percentage'] = round((score / max_score) * 100, 1)
    checks['passed'] = score >= 70  # 70% threshold for letters
    
    return checks


def investigation_summary_rubric_scorer(summary_text: str) -> Dict[str, Any]:
    """Simple rubric for investigation summaries."""
    checks = {}
    score = 0
    max_score = 100
    
    # Basic structure checks
    word_count = len(summary_text.split())
    checks['word_count'] = word_count
    
    if word_count >= 50:
        score += 30
    if word_count <= 300:  # Not too verbose
        score += 20
    
    # Look for investigation terms
    investigation_terms = ['echocardiogram', 'stress test', 'ct', 'mri', 'x-ray', 'blood', 'ejection fraction']
    term_count = sum(1 for term in investigation_terms if term in summary_text.lower())
    term_score = min(50, term_count * 10)
    score += term_score
    checks['investigation_terms_count'] = term_count
    
    # Overall assessment
    checks['total_score'] = score
    checks['max_score'] = max_score
    checks['percentage'] = round((score / max_score) * 100, 1)
    checks['passed'] = score >= 70
    
    return checks


# Rubric scorer registry
RUBRIC_SCORERS = {
    'angiogram-pci': angiogram_rubric_scorer,
    'quick-letter': quick_letter_rubric_scorer,
    'investigation-summary': investigation_summary_rubric_scorer,
    'tavi': angiogram_rubric_scorer,  # Similar requirements
    'consultation': quick_letter_rubric_scorer,  # Similar narrative requirements
    'medication': investigation_summary_rubric_scorer,  # Simple formatting
    'background': investigation_summary_rubric_scorer,  # Simple formatting
}


def run_evaluation(task: str, predictor=None, dev_set_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Run evaluation on development set for given task.
    
    Args:
        task: Agent type (angiogram-pci, quick-letter, etc.)
        predictor: DSPy predictor instance (optional, will create if needed)
        dev_set_path: Path to development set files
        
    Returns:
        List of evaluation results
    """
    # Get scorer for this task
    scorer = RUBRIC_SCORERS.get(task)
    if not scorer:
        raise ValueError(f"No rubric scorer available for task: {task}")
    
    # Load development set
    if not dev_set_path:
        dev_set_path = f"eval/devset/{task}/*.json"
    
    dev_files = glob.glob(dev_set_path)
    if not dev_files:
        print(f"⚠️  No development set files found: {dev_set_path}")
        return []
    
    # Get predictor if not provided
    if not predictor:
        predictor = get_predictor(task)
        if not predictor:
            print(f"❌ No predictor available for task: {task}")
            return []
    
    results = []
    
    for file_path in dev_files:
        try:
            with open(file_path, 'r') as f:
                example = json.load(f)
            
            transcript = example.get('transcript', example.get('input', ''))
            expected_output = example.get('expected_output', '')
            
            if not transcript:
                print(f"⚠️  No transcript found in {file_path}")
                continue
            
            # Process with predictor
            try:
                output = process_with_dspy(task, transcript)
                if not output:
                    print(f"❌ No output from predictor for {file_path}")
                    continue
            except Exception as e:
                print(f"❌ Predictor error for {file_path}: {e}")
                continue
            
            # Score with rubric
            checks = scorer(output)
            
            result = {
                'file': Path(file_path).name,
                'transcript_length': len(transcript),
                'output_length': len(output) if output else 0,
                'checks': checks,
                'transcript': transcript[:200] + '...' if len(transcript) > 200 else transcript,
                'output': output[:500] + '...' if len(output) > 500 else output,
                'expected': expected_output[:200] + '...' if expected_output and len(expected_output) > 200 else expected_output
            }
            
            results.append(result)
            
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            continue
    
    return results


def print_evaluation_summary(task: str, results: List[Dict[str, Any]]):
    """Print summary of evaluation results."""
    if not results:
        print(f"❌ No evaluation results for {task}")
        return
    
    print(f"\n📊 Evaluation Summary for {task}")
    print("=" * 50)
    
    total_examples = len(results)
    passed_examples = sum(1 for r in results if r['checks'].get('passed', False))
    
    print(f"Total examples: {total_examples}")
    print(f"Passed examples: {passed_examples}")
    print(f"Success rate: {passed_examples/total_examples*100:.1f}%")
    
    # Score statistics
    scores = [r['checks'].get('percentage', 0) for r in results]
    if scores:
        avg_score = sum(scores) / len(scores)
        min_score = min(scores)
        max_score = max(scores)
        
        print(f"Average score: {avg_score:.1f}%")
        print(f"Score range: {min_score:.1f}% - {max_score:.1f}%")
    
    # Common issues
    print(f"\n🔍 Common Issues:")
    
    # Analyze specific check failures
    if task == 'angiogram-pci':
        timi_missing = sum(1 for r in results if not r['checks'].get('has_TIMI_flow', False))
        device_missing = sum(1 for r in results if not r['checks'].get('has_device_specs', False))
        
        if timi_missing > 0:
            print(f"   • TIMI flow missing: {timi_missing}/{total_examples}")
        if device_missing > 0:
            print(f"   • Device specs missing: {device_missing}/{total_examples}")
    
    elif task == 'quick-letter':
        reasoning_low = sum(1 for r in results if r['checks'].get('clinical_reasoning_score', 0) < 3)
        if reasoning_low > 0:
            print(f"   • Low clinical reasoning: {reasoning_low}/{total_examples}")
    
    print()


def main():
    """Command-line interface for evaluation."""
    parser = argparse.ArgumentParser(description='Evaluate medical DSPy predictors')
    parser.add_argument('--task', choices=list(RUBRIC_SCORERS.keys()), required=True,
                       help='Medical agent task to evaluate')
    parser.add_argument('--dev-set', type=str, help='Path to development set files')
    parser.add_argument('--output', type=str, help='Output file for detailed results')
    parser.add_argument('--fresh-run', action='store_true', 
                       help='Bypass cache by using unique rollout ID')
    
    args = parser.parse_args()
    
    # Configure DSPy
    if not is_dspy_enabled(args.task):
        print(f"⚠️  DSPy not enabled for {args.task}")
        print("   Set USE_DSPY=true to enable DSPy evaluation")
        return
    
    config = get_config()
    if args.fresh_run:
        config.set_fresh_run()
    
    configure_lm(args.task)
    
    # Run evaluation
    print(f"🧪 Evaluating {args.task} predictor...")
    results = run_evaluation(args.task, dev_set_path=args.dev_set)
    
    if results:
        print_evaluation_summary(args.task, results)
        
        # Save detailed results if requested
        if args.output:
            atomic_write_json(Path(args.output), {
                'task': args.task,
                'timestamp': datetime.now().isoformat(),
                'total_examples': len(results),
                'results': results
            })
            print(f"📁 Detailed results saved to: {args.output}")
    else:
        print(f"❌ No evaluation results generated for {args.task}")


if __name__ == "__main__":
    main()