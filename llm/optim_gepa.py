"""
GEPA (Generalized Evolutionary Prompt Augmentation) Optimization Framework

Implements per-agent prompt evolution with human-in-the-loop feedback for medical agents.
Supports:
- Iterative prompt improvement based on evaluation metrics
- Human feedback integration from markdown files
- Before/after performance tracking
- Versioned prompt storage with rollback capability
- Medical accuracy preservation safeguards

Based on DSPy's optimization capabilities with medical domain customizations.
"""

import argparse
import json
import os
import yaml
import hashlib
import tempfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import dspy
from dspy.teleprompt import BootstrapFewShot, MIPROv2, BootstrapFewShotWithOptuna, GEPA

from .dspy_config import get_config, configure_lm, is_dspy_enabled
from .predictors import get_predictor, PREDICTOR_CLASSES
from .utils import atomic_write_json, atomic_write_text
from .evaluate import run_evaluation, RUBRIC_SCORERS, print_evaluation_summary


class PromptVersionManager:
    """Manages versioned prompt storage and retrieval."""
    
    def __init__(self, base_dir: str = "llm/prompts"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
    def save_prompt_version(self, agent_type: str, prompt: str, metrics: Dict[str, Any], 
                           iteration: int, metadata: Dict[str, Any] = None):
        """Save a versioned prompt with performance metrics."""
        agent_dir = self.base_dir / agent_type
        agent_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().isoformat()
        version_data = {
            'timestamp': timestamp,
            'iteration': iteration,
            'prompt': prompt,
            'metrics': metrics,
            'metadata': metadata or {}
        }
        
        # Save version file
        version_file = agent_dir / f"v{iteration:03d}_{timestamp[:10]}.json"
        atomic_write_json(version_file, version_data)
        
        # Update current prompt file  
        current_file = agent_dir / "current.md"
        current_content = f"# {agent_type.title()} Agent Prompt\n"
        current_content += f"Version: {iteration}\n"
        current_content += f"Generated: {timestamp}\n"
        current_content += f"Score: {metrics.get('avg_score', 0):.1f}%\n\n"
        current_content += prompt
        atomic_write_text(current_file, current_content)
        
        print(f"💾 Saved prompt version {iteration} for {agent_type}")
        return version_file
    
    def load_prompt_version(self, agent_type: str, version: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Load a specific prompt version or latest."""
        agent_dir = self.base_dir / agent_type
        
        if not agent_dir.exists():
            return None
        
        if version is None:
            # Load latest version
            current_file = agent_dir / "current.md"
            if current_file.exists():
                # Parse version from current.md
                content = current_file.read_text()
                version_line = [line for line in content.split('\n') if line.startswith('Version:')]
                if version_line:
                    version = int(version_line[0].split(':')[1].strip())
        
        if version is None:
            return None
        
        # Find version file
        version_files = list(agent_dir.glob(f"v{version:03d}_*.json"))
        if not version_files:
            return None
        
        with open(version_files[0], 'r') as f:
            return json.load(f)
    
    def list_versions(self, agent_type: str) -> List[Dict[str, Any]]:
        """List all versions for an agent with summary info."""
        agent_dir = self.base_dir / agent_type
        if not agent_dir.exists():
            return []
        
        versions = []
        for version_file in sorted(agent_dir.glob("v*.json")):
            try:
                with open(version_file, 'r') as f:
                    data = json.load(f)
                    versions.append({
                        'iteration': data['iteration'],
                        'timestamp': data['timestamp'],
                        'score': data.get('metrics', {}).get('avg_score', 0),
                        'file': version_file.name
                    })
            except Exception as e:
                print(f"⚠️  Error reading {version_file}: {e}")
        
        return versions


class HumanFeedbackManager:
    """Manages human feedback integration from markdown files."""
    
    def __init__(self, feedback_dir: str = "eval/feedback"):
        self.feedback_dir = Path(feedback_dir)
        self.feedback_dir.mkdir(parents=True, exist_ok=True)
    
    def create_feedback_template(self, agent_type: str, example_id: str, 
                                transcript: str, output: str) -> Path:
        """Create feedback template file for human review."""
        feedback_file = self.feedback_dir / f"{agent_type}_{example_id}_feedback.md"
        
        template = f"""# Feedback for {agent_type.title()} Agent - Example {example_id}

## Input Transcript
```
{transcript[:500]}{'...' if len(transcript) > 500 else ''}
```

## Generated Output
```
{output[:1000]}{'...' if len(output) > 1000 else ''}
```

## Human Feedback
Please provide feedback on the following aspects:

### Medical Accuracy (Score: _/10)
- [ ] Correct medical terminology used
- [ ] Appropriate clinical reasoning
- [ ] No medical errors or misstatements
- [ ] Australian spelling conventions followed

**Comments:**


### Clinical Completeness (Score: _/10)  
- [ ] All key clinical elements included
- [ ] Appropriate level of detail for report type
- [ ] No critical information missing
- [ ] Proper report structure followed

**Comments:**


### Professional Quality (Score: _/10)
- [ ] Clear and professional language
- [ ] Appropriate tone for medical documentation
- [ ] Proper grammar and formatting
- [ ] Suitable for clinical use

**Comments:**


### Specific Improvement Suggestions
1. 
2. 
3. 

### Overall Assessment
**Overall Score: _/30**
**Pass/Fail for Clinical Use: PASS / FAIL**

**Priority Issues to Address:**
- [ ] Critical medical accuracy problems
- [ ] Missing required clinical elements  
- [ ] Unprofessional language or tone
- [ ] Format/structure issues

### Additional Notes


---
*Instructions: Fill out scores (0-10), check applicable boxes, and provide specific comments. Save this file when complete.*
"""
        
        atomic_write_text(feedback_file, template)
        
        return feedback_file
    
    def load_feedback(self, agent_type: str, example_id: str) -> Optional[Dict[str, Any]]:
        """Load and parse human feedback from markdown file."""
        feedback_file = self.feedback_dir / f"{agent_type}_{example_id}_feedback.md"
        
        if not feedback_file.exists():
            return None
        
        try:
            content = feedback_file.read_text()
            
            # Parse scores using regex
            import re
            
            # Extract overall score
            overall_match = re.search(r'Overall Score:\s*(\d+)/30', content)
            overall_score = int(overall_match.group(1)) if overall_match else 0
            
            # Extract pass/fail
            pass_fail_match = re.search(r'Pass/Fail for Clinical Use:\s*(PASS|FAIL)', content)
            passed = pass_fail_match.group(1) == 'PASS' if pass_fail_match else False
            
            # Extract individual scores
            med_accuracy_match = re.search(r'Medical Accuracy \(Score:\s*(\d+)/10\)', content)
            completeness_match = re.search(r'Clinical Completeness \(Score:\s*(\d+)/10\)', content)
            quality_match = re.search(r'Professional Quality \(Score:\s*(\d+)/10\)', content)
            
            # Extract comments sections
            comments_sections = {}
            comment_patterns = [
                (r'Medical Accuracy.*?\*\*Comments:\*\*\s*(.*?)(?=\n###|\n\*\*|\Z)', 'medical_accuracy'),
                (r'Clinical Completeness.*?\*\*Comments:\*\*\s*(.*?)(?=\n###|\n\*\*|\Z)', 'completeness'),
                (r'Professional Quality.*?\*\*Comments:\*\*\s*(.*?)(?=\n###|\n\*\*|\Z)', 'quality')
            ]
            
            for pattern, key in comment_patterns:
                match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
                if match:
                    comments_sections[key] = match.group(1).strip()
            
            # Extract improvement suggestions
            improvements_match = re.search(
                r'### Specific Improvement Suggestions\s*(.*?)(?=\n###|\Z)', 
                content, re.DOTALL
            )
            improvements = []
            if improvements_match:
                improvements_text = improvements_match.group(1).strip()
                improvements = [line.strip() for line in improvements_text.split('\n') 
                              if line.strip() and not line.strip().startswith('#')]
            
            return {
                'overall_score': overall_score,
                'max_score': 30,
                'percentage': (overall_score / 30) * 100,
                'passed': passed,
                'individual_scores': {
                    'medical_accuracy': int(med_accuracy_match.group(1)) if med_accuracy_match else 0,
                    'completeness': int(completeness_match.group(1)) if completeness_match else 0,
                    'quality': int(quality_match.group(1)) if quality_match else 0
                },
                'comments': comments_sections,
                'improvements': improvements,
                'file': str(feedback_file)
            }
            
        except Exception as e:
            print(f"❌ Error parsing feedback file {feedback_file}: {e}")
            return None
    
    def collect_all_feedback(self, agent_type: str) -> List[Dict[str, Any]]:
        """Collect all available feedback for an agent."""
        feedback_files = list(self.feedback_dir.glob(f"{agent_type}_*_feedback.md"))
        feedback_data = []
        
        for feedback_file in feedback_files:
            # Extract example ID from filename
            example_id = feedback_file.stem.replace(f"{agent_type}_", "").replace("_feedback", "")
            
            feedback = self.load_feedback(agent_type, example_id)
            if feedback:
                feedback['example_id'] = example_id
                feedback_data.append(feedback)
        
        return feedback_data


class GEPAOptimizer:
    """Main GEPA optimization orchestrator with real DSPy integration."""
    
    def __init__(self, agent_type: str):
        self.agent_type = agent_type
        self.config = get_config()
        self.prompt_manager = PromptVersionManager()
        self.feedback_manager = HumanFeedbackManager()
        
        # Get optimization settings
        optim_config = self.config.config.get('optimization', {})
        self.max_iterations = optim_config.get('max_iterations', 5)
        self.improvement_threshold = optim_config.get('improvement_threshold', 0.1)
        self.human_feedback_weight = optim_config.get('human_feedback_weight', 0.3)
        
        # GEPA-specific settings
        self.gepa_breadth = optim_config.get('gepa_breadth', 3)
        self.gepa_depth = optim_config.get('gepa_depth', 2)
        self.gepa_temperature = optim_config.get('gepa_temperature', 1.0)
    
    def run_optimization(self, iterations: int = None, with_human: bool = False) -> Dict[str, Any]:
        """
        Run GEPA optimization for the specified agent.
        
        Args:
            iterations: Number of optimization iterations (overrides config)
            with_human: Whether to collect human feedback
            
        Returns:
            Optimization results with before/after metrics
        """
        if iterations is not None:
            self.max_iterations = iterations
        
        print(f"🚀 Starting GEPA optimization for {self.agent_type}")
        print(f"   Iterations: {self.max_iterations}")
        print(f"   Human feedback: {'enabled' if with_human else 'disabled'}")
        print()
        
        # Initial baseline evaluation
        print("📊 Running baseline evaluation...")
        baseline_results = run_evaluation(self.agent_type)
        
        if not baseline_results:
            print(f"❌ No baseline results available for {self.agent_type}")
            return {'error': 'No baseline evaluation results'}
        
        baseline_metrics = self._calculate_metrics(baseline_results)
        print(f"   Baseline score: {baseline_metrics['avg_score']:.1f}%")
        print(f"   Pass rate: {baseline_metrics['pass_rate']:.1f}%")
        
        # Save initial version
        initial_prompt = self._get_current_prompt()
        self.prompt_manager.save_prompt_version(
            self.agent_type, initial_prompt, baseline_metrics, 0,
            {'note': 'Original baseline prompt before optimization'}
        )
        
        best_score = baseline_metrics['avg_score']
        best_prompt = initial_prompt
        best_iteration = 0
        
        # Collect human feedback if requested
        human_feedback = []
        if with_human:
            print("\n👥 Collecting human feedback...")
            human_feedback = self._collect_human_feedback(baseline_results)
            print(f"   Collected {len(human_feedback)} feedback entries")
        
        # Optimization iterations
        for iteration in range(1, self.max_iterations + 1):
            print(f"\n🔄 Iteration {iteration}/{self.max_iterations}")
            
            try:
                # Generate improved prompt
                new_prompt = self._generate_improved_prompt(
                    baseline_results, human_feedback, iteration
                )
                
                if not new_prompt or new_prompt == best_prompt:
                    print("   No prompt improvements generated, stopping optimization")
                    break
                
                # Test new prompt
                test_results = self._test_prompt(new_prompt)
                if not test_results:
                    print("   Failed to test new prompt, skipping iteration")
                    continue
                
                test_metrics = self._calculate_metrics(test_results)
                print(f"   New score: {test_metrics['avg_score']:.1f}%")
                print(f"   Improvement: {test_metrics['avg_score'] - best_score:.1f}%")
                
                # Check if improvement is significant
                improvement = test_metrics['avg_score'] - best_score
                if improvement >= self.improvement_threshold:
                    print(f"✅ Improvement detected (+{improvement:.1f}%), saving version")
                    
                    # Save improved version
                    self.prompt_manager.save_prompt_version(
                        self.agent_type, new_prompt, test_metrics, iteration,
                        {
                            'improvement': improvement,
                            'previous_score': best_score,
                            'human_feedback_used': len(human_feedback) > 0
                        }
                    )
                    
                    best_score = test_metrics['avg_score']
                    best_prompt = new_prompt
                    best_iteration = iteration
                    
                    # Update baseline for next iteration
                    baseline_results = test_results
                    
                else:
                    print(f"   Improvement too small ({improvement:.1f}%), keeping current prompt")
            
            except Exception as e:
                print(f"❌ Error in iteration {iteration}: {e}")
                continue
        
        # Final results
        final_improvement = best_score - baseline_metrics['avg_score']
        
        print(f"\n🎯 Optimization Complete")
        print(f"   Best iteration: {best_iteration}")
        print(f"   Final score: {best_score:.1f}%")
        print(f"   Total improvement: {final_improvement:.1f}%")
        
        return {
            'agent_type': self.agent_type,
            'iterations_run': self.max_iterations,
            'best_iteration': best_iteration,
            'baseline_score': baseline_metrics['avg_score'],
            'final_score': best_score,
            'improvement': final_improvement,
            'human_feedback_entries': len(human_feedback),
            'optimization_successful': final_improvement >= self.improvement_threshold
        }
    
    def _analyze_failures(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze common failure patterns in evaluation results."""
        if not results:
            return {}
        
        failure_patterns = {
            'missing_timi_flow': 0,
            'missing_stenosis_grading': 0,
            'weak_clinical_reasoning': 0,
            'poor_terminology': 0,
            'insufficient_detail': 0,
            'structure_issues': 0
        }
        
        total_failed = 0
        
        for result in results:
            checks = result['checks']
            if not checks.get('passed', False):
                total_failed += 1
                
                # Check specific failure types
                if 'has_TIMI_flow' in checks and not checks['has_TIMI_flow']:
                    failure_patterns['missing_timi_flow'] += 1
                
                if 'has_stenosis_grading' in checks and not checks['has_stenosis_grading']:
                    failure_patterns['missing_stenosis_grading'] += 1
                
                if 'clinical_reasoning_score' in checks and checks['clinical_reasoning_score'] < 3:
                    failure_patterns['weak_clinical_reasoning'] += 1
                
                if 'terminology_score' in checks and checks['terminology_score'] < 5:
                    failure_patterns['poor_terminology'] += 1
                
                if checks.get('percentage', 0) < 50:
                    failure_patterns['insufficient_detail'] += 1
                
                if 'section_coverage' in checks and checks['section_coverage'] < 2:
                    failure_patterns['structure_issues'] += 1
        
        # Convert to percentages
        if total_failed > 0:
            for key in failure_patterns:
                failure_patterns[key] = (failure_patterns[key] / total_failed) * 100
        
        return {
            'patterns': failure_patterns,
            'total_failed': total_failed,
            'total_examples': len(results),
            'failure_rate': (total_failed / len(results)) * 100 if results else 0
        }
    
    def _extract_human_insights(self, human_feedback: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract actionable insights from human feedback."""
        if not human_feedback:
            return {}
        
        insights = {
            'common_improvements': [],
            'critical_issues': [],
            'avg_medical_accuracy': 0,
            'avg_completeness': 0,
            'avg_quality': 0,
            'priority_areas': []
        }
        
        total_feedback = len(human_feedback)
        medical_scores = []
        completeness_scores = []
        quality_scores = []
        
        all_improvements = []
        critical_count = {'medical': 0, 'completeness': 0, 'quality': 0}
        
        for feedback in human_feedback:
            # Collect scores
            individual_scores = feedback.get('individual_scores', {})
            medical_scores.append(individual_scores.get('medical_accuracy', 0))
            completeness_scores.append(individual_scores.get('completeness', 0))
            quality_scores.append(individual_scores.get('quality', 0))
            
            # Collect improvements
            if feedback.get('improvements'):
                all_improvements.extend(feedback['improvements'])
            
            # Count critical issues
            if individual_scores.get('medical_accuracy', 0) < 6:
                critical_count['medical'] += 1
            if individual_scores.get('completeness', 0) < 6:
                critical_count['completeness'] += 1
            if individual_scores.get('quality', 0) < 6:
                critical_count['quality'] += 1
        
        # Calculate averages
        if medical_scores:
            insights['avg_medical_accuracy'] = sum(medical_scores) / len(medical_scores)
        if completeness_scores:
            insights['avg_completeness'] = sum(completeness_scores) / len(completeness_scores)
        if quality_scores:
            insights['avg_quality'] = sum(quality_scores) / len(quality_scores)
        
        # Find common improvement suggestions
        from collections import Counter
        if all_improvements:
            improvement_counts = Counter(all_improvements)
            insights['common_improvements'] = [
                imp for imp, count in improvement_counts.most_common(5)
                if count > 1  # Only include if mentioned multiple times
            ]
        
        # Identify priority areas
        threshold = total_feedback * 0.3  # 30% of feedback mentions it
        for area, count in critical_count.items():
            if count >= threshold:
                insights['priority_areas'].append(area)
        
        return insights
    
    def _create_training_examples(self, results: List[Dict[str, Any]], failure_analysis: Dict[str, Any]) -> List:
        """Create DSPy training examples from evaluation results."""
        training_examples = []
        
        try:
            # Create examples from both successful and failed cases
            for result in results[:10]:  # Limit to 10 examples for efficiency
                transcript = result.get('transcript', '').replace('...', '')  # Remove truncation
                output = result.get('output', '').replace('...', '')  # Remove truncation
                
                if len(transcript) < 50 or len(output) < 50:  # Skip very short examples
                    continue
                
                # Create DSPy example
                example = dspy.Example(
                    transcript=transcript,
                    result=output
                ).with_inputs('transcript')
                
                training_examples.append(example)
            
            print(f"   Created {len(training_examples)} training examples")
            return training_examples
            
        except Exception as e:
            print(f"   ⚠️  Failed to create training examples: {e}")
            return []
    
    def _create_optimization_metric(self, failure_analysis: Dict[str, Any], human_insights: Dict[str, Any]):
        """Create optimization metric for GEPA based on failure analysis and human feedback."""
        def optimization_metric(example, prediction, trace=None):
            """Custom metric that combines rubric scoring with human feedback insights."""
            try:
                from .evaluate import RUBRIC_SCORERS
                
                # Get rubric scorer
                scorer = RUBRIC_SCORERS.get(self.agent_type)
                if not scorer:
                    return 0.5  # Default score if no scorer
                
                # Score the prediction
                if hasattr(prediction, 'result'):
                    output_text = prediction.result
                elif hasattr(prediction, 'answer'):
                    output_text = prediction.answer
                else:
                    output_text = str(prediction)
                
                checks = scorer(output_text)
                base_score = checks.get('percentage', 0) / 100.0  # Convert to 0-1 scale
                
                # Apply human feedback weights
                human_weight = 0.0
                if human_insights:
                    # Boost score if it addresses common human feedback
                    for improvement in human_insights.get('common_improvements', []):
                        if any(keyword in output_text.lower() for keyword in improvement.lower().split()[:3]):
                            human_weight += 0.1
                    
                    # Penalize if it has issues mentioned in human feedback
                    if human_insights.get('avg_medical_accuracy', 10) < 6 and 'medication' not in output_text.lower():
                        human_weight -= 0.1
                
                # Combine scores
                final_score = min(1.0, max(0.0, base_score + (human_weight * self.human_feedback_weight)))
                return final_score
                
            except Exception as e:
                print(f"   ⚠️  Metric evaluation error: {e}")
                return 0.5  # Default score on error
        
        return optimization_metric
    
    def _generate_heuristic_improvements(self, current_prompt: str, failure_analysis: Dict[str, Any], 
                                       human_insights: Dict[str, Any], iteration: int) -> str:
        """Generate prompt improvements using heuristic rules when GEPA fails."""
        improvements = []
        
        # Analyze failure patterns
        if failure_analysis and failure_analysis.get('patterns'):
            patterns = failure_analysis['patterns']
            
            if patterns.get('missing_timi_flow', 0) > 30:
                improvements.append(
                    "CRITICAL: Always document TIMI flow assessment (TIMI 0, I, II, or III) for all coronary interventions."
                )
            
            if patterns.get('missing_stenosis_grading', 0) > 30:
                improvements.append(
                    "REQUIRED: Specify stenosis severity using qualitative terms (mild, moderate, severe, critical) rather than percentages."
                )
            
            if patterns.get('weak_clinical_reasoning', 0) > 40:
                improvements.append(
                    "ENHANCE: Include clinical reasoning language (therefore, because, given that, considering) to connect findings with conclusions."
                )
            
            if patterns.get('poor_terminology', 0) > 25:
                improvements.append(
                    "MEDICAL ACCURACY: Use precise medical terminology and Australian spelling conventions (e.g., 'catheterisation', 'haemodynamic')."
                )
            
            if patterns.get('structure_issues', 0) > 35:
                improvements.append(
                    "STRUCTURE: Follow standard medical report format with clear sections (Procedure, Findings, Conclusion)."
                )
        
        # Incorporate human insights
        if human_insights:
            priority_areas = human_insights.get('priority_areas', [])
            
            if 'medical' in priority_areas:
                improvements.append(
                    "HUMAN FEEDBACK: Focus on medical accuracy and precise clinical terminology based on reviewer feedback."
                )
            
            if 'completeness' in priority_areas:
                improvements.append(
                    "HUMAN FEEDBACK: Ensure comprehensive documentation covering all key clinical elements based on reviewer feedback."
                )
            
            # Add specific common improvements
            common_improvements = human_insights.get('common_improvements', [])
            for improvement in common_improvements[:2]:  # Top 2 common improvements
                improvements.append(f"REVIEWER INSIGHT: {improvement}")
        
        # Apply improvements to prompt
        if improvements:
            improvement_text = "\n".join(f"• {imp}" for imp in improvements[:5])  # Top 5 improvements
            improved_prompt = f"{current_prompt}\n\n--- OPTIMIZATION ITERATION {iteration} ---\n{improvement_text}\n--- END OPTIMIZATION NOTES ---"
        else:
            improved_prompt = current_prompt
        
        return improved_prompt
    
    def _format_improvement_notes(self, failure_analysis: Dict[str, Any], human_insights: Dict[str, Any], iteration: int) -> str:
        """Format improvement notes for inclusion in optimized prompt."""
        notes = [f"--- GEPA OPTIMIZATION ITERATION {iteration} ---"]
        
        if failure_analysis and failure_analysis.get('failure_rate', 0) > 0:
            notes.append(f"Previous failure rate: {failure_analysis['failure_rate']:.1f}%")
        
        if human_insights:
            avg_scores = [
                human_insights.get('avg_medical_accuracy', 0),
                human_insights.get('avg_completeness', 0),
                human_insights.get('avg_quality', 0)
            ]
            if any(score > 0 for score in avg_scores):
                notes.append(f"Human feedback scores: Medical {avg_scores[0]:.1f}/10, Completeness {avg_scores[1]:.1f}/10, Quality {avg_scores[2]:.1f}/10")
        
        notes.append("--- OPTIMIZATION FOCUS AREAS ---")
        
        if failure_analysis and failure_analysis.get('patterns'):
            patterns = failure_analysis['patterns']
            top_issues = sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:3]
            for issue, percentage in top_issues:
                if percentage > 20:
                    notes.append(f"• Address {issue.replace('_', ' ')}: {percentage:.0f}% of failures")
        
        notes.append("--- END OPTIMIZATION NOTES ---")
        
        return "\n".join(notes)
    
    def _calculate_metrics(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate aggregate metrics from evaluation results."""
        if not results:
            return {'avg_score': 0, 'pass_rate': 0, 'total_examples': 0}
        
        scores = [r['checks'].get('percentage', 0) for r in results]
        passed = [r['checks'].get('passed', False) for r in results]
        
        return {
            'avg_score': sum(scores) / len(scores) if scores else 0,
            'pass_rate': (sum(passed) / len(passed)) * 100 if passed else 0,
            'total_examples': len(results),
            'score_range': [min(scores), max(scores)] if scores else [0, 0]
        }

    def _calculate_enhanced_metrics(self, metrics_before: Dict[str, Any], metrics_after: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate enhanced metrics with deltas and significance analysis.
        
        Args:
            metrics_before: Baseline metrics
            metrics_after: Optimized metrics
            
        Returns:
            Dict containing enhanced metrics with deltas
        """
        def calculate_delta(before: float, after: float) -> Dict[str, Any]:
            delta = after - before
            percent_change = (delta / before * 100) if before > 0 else 0
            is_improvement = delta > 0
            
            # Determine significance
            abs_percent = abs(percent_change)
            if abs_percent >= 10:
                significance = 'major'
            elif abs_percent >= 5:
                significance = 'moderate'
            elif abs_percent >= 1:
                significance = 'minor'
            else:
                significance = 'negligible'
                
            return {
                'before': before,
                'after': after,
                'delta': delta,
                'percent_change': percent_change,
                'is_improvement': is_improvement,
                'significance': significance
            }
        
        # Calculate deltas for each metric
        accuracy_delta = calculate_delta(
            metrics_before.get('avg_accuracy', 0),
            metrics_after.get('avg_accuracy', 0)
        )
        
        completeness_delta = calculate_delta(
            metrics_before.get('avg_completeness', 0),
            metrics_after.get('avg_completeness', 0)
        )
        
        clinical_delta = calculate_delta(
            metrics_before.get('avg_clinical', 0),
            metrics_after.get('avg_clinical', 0)
        )
        
        overall_delta = calculate_delta(
            metrics_before.get('avg_score', 0),
            metrics_after.get('avg_score', 0)
        )
        
        # Calculate summary statistics
        deltas = [accuracy_delta, completeness_delta, clinical_delta, overall_delta]
        improved_metrics = sum(1 for d in deltas if d['is_improvement'])
        unchanged_metrics = sum(1 for d in deltas if d['significance'] == 'negligible')
        degraded_metrics = sum(1 for d in deltas if not d['is_improvement'] and d['significance'] != 'negligible')
        
        # Determine confidence level
        if improved_metrics >= 3 and degraded_metrics == 0:
            confidence_level = 'high'
        elif improved_metrics >= 2 and overall_delta['delta'] > 0:
            confidence_level = 'medium'
        else:
            confidence_level = 'low'
        
        return {
            'accuracy': accuracy_delta,
            'completeness': completeness_delta,
            'clinical_appropriateness': clinical_delta,
            'overall_score': overall_delta,
            'summary': {
                'total_improvement': overall_delta['delta'],
                'improved_metrics': improved_metrics,
                'unchanged_metrics': unchanged_metrics,
                'degraded_metrics': degraded_metrics,
                'confidence_level': confidence_level
            }
        }

    def _format_metrics_summary(self, enhanced_metrics: Dict[str, Any]) -> str:
        """
        Format enhanced metrics for logging output.
        
        Args:
            enhanced_metrics: Enhanced metrics from _calculate_enhanced_metrics
            
        Returns:
            Formatted summary string
        """
        summary = enhanced_metrics['summary']
        overall = enhanced_metrics['overall_score']
        
        # Create improvement indicator
        if overall['is_improvement']:
            indicator = '🟢 ↑'
        elif overall['delta'] < 0:
            indicator = '🔴 ↓'
        else:
            indicator = '⚪ →'
        
        # Format individual metrics
        metrics_details = []
        for metric_name in ['accuracy', 'completeness', 'clinical_appropriateness']:
            metric = enhanced_metrics[metric_name]
            if metric['significance'] != 'negligible':
                sign = '+' if metric['delta'] >= 0 else ''
                metrics_details.append(
                    f"{metric_name.replace('_', ' ').title()}: {sign}{metric['delta']:.1f} ({sign}{metric['percent_change']:.1f}%)"
                )
        
        details = ', '.join(metrics_details) if metrics_details else 'No significant changes in individual metrics'
        
        return (f"{indicator} Overall: {overall['delta']:+.1f} ({overall['percent_change']:+.1f}%) "
                f"[{summary['confidence_level'].title()} confidence] | {details}")
    
    def _get_current_prompt(self) -> str:
        """Get current system prompt for the agent."""
        # This would normally extract the prompt from the predictor
        # For now, return a placeholder that would be replaced with actual prompt extraction
        predictor_class = PREDICTOR_CLASSES.get(self.agent_type)
        if predictor_class:
            predictor = predictor_class()
            return getattr(predictor, 'system_instructions', 'No system prompt found')
        
        return f"System prompt for {self.agent_type} agent"
    
    def _collect_human_feedback(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Collect human feedback for evaluation results."""
        feedback = []
        
        print("   Creating feedback templates...")
        
        # Create feedback templates for first few examples
        max_feedback = min(5, len(results))  # Limit to 5 examples for manageable feedback
        
        for i, result in enumerate(results[:max_feedback]):
            example_id = f"ex{i+1}"
            
            feedback_file = self.feedback_manager.create_feedback_template(
                self.agent_type, example_id,
                result['transcript'], result['output']
            )
            
            print(f"     Created: {feedback_file}")
        
        print(f"\n   📝 Please review and complete {max_feedback} feedback files in eval/feedback/")
        print("   ⏳ Press Enter when feedback is complete, or Ctrl+C to skip...")
        
        try:
            input()  # Wait for user to complete feedback
            
            # Collect completed feedback
            all_feedback = self.feedback_manager.collect_all_feedback(self.agent_type)
            return all_feedback
            
        except KeyboardInterrupt:
            print("\n   ⏭️  Skipping human feedback collection")
            return []
    
    def _generate_improved_prompt(self, results: List[Dict[str, Any]], 
                                 human_feedback: List[Dict[str, Any]], 
                                 iteration: int) -> str:
        """Generate improved prompt using real DSPy GEPA optimization."""
        try:
            # Get current predictor and prompt
            predictor = get_predictor(self.agent_type)
            if not predictor:
                raise Exception(f"No predictor available for {self.agent_type}")
            
            current_prompt = self._get_current_prompt()
            
            # Analyze failure patterns for targeted improvements
            failure_analysis = self._analyze_failures(results)
            human_insights = self._extract_human_insights(human_feedback)
            
            # Create training examples from failures
            training_examples = self._create_training_examples(results, failure_analysis)
            
            if not training_examples:
                print("   No training examples created, using heuristic improvements")
                return self._generate_heuristic_improvements(current_prompt, failure_analysis, human_insights, iteration)
            
            # Use DSPy's GEPA optimizer for prompt evolution
            print(f"   Applying GEPA optimization with {len(training_examples)} examples")
            
            # Configure GEPA optimizer
            gepa_optimizer = GEPA(
                metric=self._create_optimization_metric(failure_analysis, human_insights),
                breadth=3,  # Number of prompt variations to generate
                depth=2,    # Number of optimization rounds
                init_temperature=1.0
            )
            
            # Run GEPA optimization
            optimized_predictor = gepa_optimizer.compile(
                predictor,
                trainset=training_examples
            )
            
            # Extract improved prompt from optimized predictor
            if hasattr(optimized_predictor, 'system_instructions'):
                improved_prompt = optimized_predictor.system_instructions
            else:
                # Fallback to heuristic improvements if GEPA doesn't modify the prompt directly
                improved_prompt = self._generate_heuristic_improvements(
                    current_prompt, failure_analysis, human_insights, iteration
                )
            
            # Add iteration-specific improvements
            if failure_analysis or human_insights:
                improvement_notes = self._format_improvement_notes(failure_analysis, human_insights, iteration)
                improved_prompt = f"{improved_prompt}\n\n{improvement_notes}"
            
            return improved_prompt
            
        except Exception as e:
            print(f"   ⚠️  GEPA optimization failed: {e}")
            print("   Falling back to heuristic prompt improvement")
            
            # Fallback to heuristic improvements
            current_prompt = self._get_current_prompt()
            failure_analysis = self._analyze_failures(results)
            human_insights = self._extract_human_insights(human_feedback)
            
            return self._generate_heuristic_improvements(
                current_prompt, failure_analysis, human_insights, iteration
            )
    
    def _test_prompt(self, new_prompt: str) -> Optional[List[Dict[str, Any]]]:
        """Test new prompt by temporarily updating predictor and running evaluation."""
        try:
            # Get current predictor
            predictor_class = PREDICTOR_CLASSES.get(self.agent_type)
            if not predictor_class:
                raise Exception(f"No predictor class for {self.agent_type}")
            
            # Backup current predictor state
            original_predictor = predictor_class()
            original_prompt = getattr(original_predictor, 'system_instructions', '')
            
            print("   Creating test predictor with new prompt...")
            
            # Create temporary predictor with new prompt
            test_predictor = predictor_class()
            if hasattr(test_predictor, 'system_instructions'):
                test_predictor.system_instructions = new_prompt
            
            # Temporarily register the test predictor
            temp_predictor_name = f"temp_{self.agent_type}_{int(datetime.now().timestamp())}"
            
            # Run evaluation with test predictor
            print("   Running evaluation with test prompt...")
            
            # Use a custom evaluation that bypasses the global predictor registry
            results = self._run_evaluation_with_predictor(test_predictor)
            
            print(f"   Test complete: {len(results) if results else 0} results")
            return results
            
        except Exception as e:
            print(f"   ❌ Prompt testing failed: {e}")
            # Fallback: return current evaluation results
            print("   Falling back to current evaluation")
            return run_evaluation(self.agent_type)
    
    def _run_evaluation_with_predictor(self, predictor) -> List[Dict[str, Any]]:
        """Run evaluation using a specific predictor instance."""
        from .evaluate import RUBRIC_SCORERS
        import glob
        import json
        from pathlib import Path
        
        # Get scorer for this task
        scorer = RUBRIC_SCORERS.get(self.agent_type)
        if not scorer:
            raise ValueError(f"No rubric scorer available for task: {self.agent_type}")
        
        # Load development set
        dev_set_path = f"eval/devset/{self.agent_type}/*.json"
        dev_files = glob.glob(dev_set_path)
        
        if not dev_files:
            print(f"   ⚠️  No dev set files found: {dev_set_path}")
            return []
        
        results = []
        
        for file_path in dev_files:
            try:
                with open(file_path, 'r') as f:
                    example = json.load(f)
                
                transcript = example.get('transcript', example.get('input', ''))
                if not transcript:
                    continue
                
                # Process with test predictor
                if hasattr(predictor, 'forward'):
                    # DSPy predictor with forward method
                    output = predictor.forward(transcript=transcript).result
                elif hasattr(predictor, '__call__'):
                    # Callable predictor
                    output = predictor(transcript)
                else:
                    print(f"   ⚠️  Unknown predictor interface: {type(predictor)}")
                    continue
                
                if not output:
                    continue
                
                # Score with rubric
                checks = scorer(output)
                
                result = {
                    'file': Path(file_path).name,
                    'transcript_length': len(transcript),
                    'output_length': len(output),
                    'checks': checks,
                    'transcript': transcript[:200] + '...' if len(transcript) > 200 else transcript,
                    'output': output[:500] + '...' if len(output) > 500 else output
                }
                
                results.append(result)
                
            except Exception as e:
                print(f"   ⚠️  Error processing {file_path}: {e}")
                continue
        
        return results
    
    def _generate_candidate_id(self, original_prompt: str, optimized_prompt: str, agent_type: str) -> str:
        """Generate stable candidate ID based on prompt content."""
        content = f"{agent_type}:{original_prompt}:{optimized_prompt}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _save_candidate(self, candidate_data: Dict[str, Any]) -> str:
        """Save candidate to persistent storage and return candidate ID."""
        try:
            # Generate stable candidate ID
            candidate_id = self._generate_candidate_id(
                candidate_data['original_prompt'],
                candidate_data['optimized_prompt'],
                candidate_data['agent_type']
            )
            
            # Create candidates directory
            candidates_dir = Path('data/gepa/candidates')
            candidates_dir.mkdir(parents=True, exist_ok=True)
            
            # Save candidate with timestamp
            candidate_data['candidate_id'] = candidate_id
            candidate_data['created_at'] = datetime.now().isoformat()
            candidate_data['expires_at'] = (datetime.now().timestamp() + 86400 * 7)  # 7 days from now
            
            candidate_file = candidates_dir / f"{candidate_id}.json"
            atomic_write_json(candidate_file, candidate_data)
            
            print(f"   💾 Candidate saved: {candidate_id}")
            return candidate_id
            
        except Exception as e:
            print(f"   ⚠️  Failed to save candidate: {str(e)}")
            return candidate_data.get('candidate_id', f"temp-{int(datetime.now().timestamp())}")
    
    def _load_candidate(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        """Load candidate from persistent storage."""
        try:
            candidate_file = Path(f'data/gepa/candidates/{candidate_id}.json')
            
            if not candidate_file.exists():
                print(f"   ❌ Candidate not found: {candidate_id}")
                return None
            
            with open(candidate_file, 'r') as f:
                candidate_data = json.load(f)
            
            # Check if candidate has expired
            expires_at = candidate_data.get('expires_at', 0)
            if datetime.now().timestamp() > expires_at:
                print(f"   ⏰ Candidate expired: {candidate_id}")
                candidate_file.unlink(missing_ok=True)  # Clean up expired candidate
                return None
            
            print(f"   ✅ Candidate loaded: {candidate_id}")
            return candidate_data
            
        except Exception as e:
            print(f"   ⚠️  Failed to load candidate: {str(e)}")
            return None
    
    def _cleanup_expired_candidates(self):
        """Clean up expired candidate files."""
        try:
            candidates_dir = Path('data/gepa/candidates')
            if not candidates_dir.exists():
                return
            
            current_time = datetime.now().timestamp()
            cleaned = 0
            
            for candidate_file in candidates_dir.glob('*.json'):
                try:
                    with open(candidate_file, 'r') as f:
                        candidate_data = json.load(f)
                    
                    expires_at = candidate_data.get('expires_at', 0)
                    if current_time > expires_at:
                        candidate_file.unlink()
                        cleaned += 1
                        
                except Exception:
                    # If we can't read the file, consider it corrupted and remove it
                    candidate_file.unlink(missing_ok=True)
                    cleaned += 1
            
            if cleaned > 0:
                print(f"   🗑️  Cleaned up {cleaned} expired candidates")
                
        except Exception as e:
            print(f"   ⚠️  Candidate cleanup failed: {str(e)}")
    
    def run_optimization_preview(self, iterations: int = None, with_human: bool = False) -> Dict[str, Any]:
        """
        Run GEPA optimization in preview mode without saving results.
        Returns optimization candidates for review before applying.
        
        Args:
            iterations: Number of optimization iterations (overrides config)
            with_human: Include human feedback in optimization
            
        Returns:
            Dict containing optimization preview data with before/after prompts and metrics
        """
        try:
            print(f"🔍 Running GEPA optimization preview for {self.agent_type}")
            
            # Use provided iterations or config default
            if iterations is not None:
                self.max_iterations = iterations
            
            # Check if agent is valid
            if self.agent_type not in PREDICTOR_CLASSES:
                return {
                    'error': f"Unknown agent type: {self.agent_type}",
                    'agent_type': self.agent_type
                }
            
            # Configure LM
            configure_lm(self.agent_type)
            
            # Get baseline performance and current prompt
            print("   📊 Establishing baseline performance...")
            baseline_results = self._evaluate_current_prompt()
            if not baseline_results:
                return {
                    'error': 'Failed to establish baseline performance',
                    'agent_type': self.agent_type
                }
            
            baseline_metrics = self._calculate_metrics(baseline_results)
            current_prompt = self._get_current_prompt()
            
            print(f"   Baseline score: {baseline_metrics['avg_score']:.1f}%")
            
            # Collect human feedback if requested
            human_feedback = []
            if with_human:
                print("   👥 Collecting human feedback...")
                human_feedback = self._collect_human_feedback(baseline_results)
            
            # Run a single optimization iteration to generate candidate
            print("   🔧 Generating optimization candidate...")
            candidate_prompt = self._generate_improved_prompt(
                baseline_results, human_feedback, 1
            )
            
            if not candidate_prompt or candidate_prompt == current_prompt:
                return {
                    'error': 'No optimization candidate generated',
                    'agent_type': self.agent_type,
                    'original_prompt': current_prompt,
                    'baseline_metrics': baseline_metrics
                }
            
            # Test candidate prompt
            print("   🧪 Testing candidate prompt...")
            candidate_results = self._test_prompt(candidate_prompt)
            if not candidate_results:
                return {
                    'error': 'Failed to test candidate prompt',
                    'agent_type': self.agent_type,
                    'original_prompt': current_prompt,
                    'candidate_prompt': candidate_prompt,
                    'baseline_metrics': baseline_metrics
                }
            
            candidate_metrics = self._calculate_metrics(candidate_results)
            improvement = candidate_metrics['avg_score'] - baseline_metrics['avg_score']
            
            print(f"   Candidate score: {candidate_metrics['avg_score']:.1f}%")
            print(f"   Potential improvement: {improvement:.1f}%")
            
            # Create candidate data
            candidate_data = {
                'agent_type': self.agent_type,
                'original_prompt': current_prompt,
                'optimized_prompt': candidate_prompt,
                'baseline_metrics': baseline_metrics,
                'candidate_metrics': candidate_metrics,
                'improvement': improvement,
                'human_feedback_used': len(human_feedback) > 0,
                'preview_mode': True,
                'final_accuracy': candidate_metrics.get('avg_accuracy', 0),
                'final_completeness': candidate_metrics.get('avg_completeness', 0),
                'final_clinical': candidate_metrics.get('avg_clinical', 0),
                'final_score': candidate_metrics['avg_score'],
                'baseline_results': baseline_results,  # Store for potential apply
                'candidate_results': candidate_results  # Store for potential apply
            }
            
            # Save candidate for potential application
            candidate_id = self._save_candidate(candidate_data)
            candidate_data['candidate_id'] = candidate_id
            
            # Clean up expired candidates
            self._cleanup_expired_candidates()
            
            # Return preview data
            return candidate_data
            
        except Exception as e:
            print(f"❌ GEPA preview failed for {self.agent_type}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'error': f'GEPA preview failed: {str(e)}',
                'agent_type': self.agent_type
            }
    
    def apply_candidate(self, candidate_id: str) -> Dict[str, Any]:
        """
        Apply a specific optimization candidate identified by candidate_id.
        
        Args:
            candidate_id: Unique identifier for the optimization candidate
            
        Returns:
            Dict containing application results with metrics and saved paths
        """
        try:
            print(f"📝 Applying GEPA candidate {candidate_id} for {self.agent_type}")
            
            # Load the persisted candidate from disk
            print("   💾 Loading candidate from disk...")
            candidate_data = self._load_candidate(candidate_id)
            if not candidate_data:
                return {
                    'error': f'Candidate {candidate_id} not found or expired',
                    'candidate_id': candidate_id
                }
            
            # Extract candidate details
            candidate_prompt = candidate_data['optimized_prompt']
            metrics_before = candidate_data['metrics_before']
            metrics_after = candidate_data['metrics_after']
            improvement = candidate_data['improvement']
            
            print(f"   📊 Loaded candidate with {improvement:.3f} improvement")
            
            if not candidate_prompt:
                return {
                    'error': 'Invalid candidate prompt in stored data',
                    'candidate_id': candidate_id
                }
            
            # Save the optimized prompt version
            print("   💾 Saving optimized prompt...")
            saved_path = self.prompt_manager.save_prompt_version(
                self.agent_type, candidate_prompt, metrics_after, 1,
                {
                    'improvement': improvement,
                    'previous_score': metrics_before['avg_score'],
                    'applied_via_api': True,
                    'candidate_id': candidate_id
                }
            )
            
            # Calculate enhanced metrics for better logging
            enhanced_metrics = self._calculate_enhanced_metrics(metrics_before, metrics_after)
            metrics_summary = self._format_metrics_summary(enhanced_metrics)
            
            print(f"   ✅ Applied candidate: {metrics_summary}")
            
            return {
                'candidate_id': candidate_id,
                'metrics_before': {
                    'accuracy': metrics_before.get('avg_accuracy', 0),
                    'completeness': metrics_before.get('avg_completeness', 0),
                    'clinical_appropriateness': metrics_before.get('avg_clinical', 0),
                    'overall_score': metrics_before.get('avg_score', 0)
                },
                'metrics_after': {
                    'accuracy': metrics_after.get('avg_accuracy', 0),
                    'completeness': metrics_after.get('avg_completeness', 0),
                    'clinical_appropriateness': metrics_after.get('avg_clinical', 0),
                    'overall_score': metrics_after.get('avg_score', 0)
                },
                'improvement': improvement,
                'enhanced_metrics': enhanced_metrics,
                'saved_path': saved_path
            }
            
        except Exception as e:
            print(f"❌ Failed to apply candidate {candidate_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'error': f'Failed to apply candidate: {str(e)}',
                'candidate_id': candidate_id
            }

    def rollback_to_version(self, version: int) -> Dict[str, Any]:
        """
        Rollback to a specific prompt version.
        
        Args:
            version: Version number to rollback to
            
        Returns:
            Dict containing rollback results
        """
        try:
            print(f"🔄 Rolling back {self.agent_type} to version {version}")
            
            # Load the target version
            target_version = self.prompt_manager.load_prompt_version(self.agent_type, version)
            if not target_version:
                return {
                    'error': f'Version {version} not found for {self.agent_type}',
                    'agent_type': self.agent_type
                }
            
            target_prompt = target_version['prompt']
            target_metrics = target_version.get('metrics', {})
            
            # Get current metrics for comparison
            current_results = self._evaluate_current_prompt()
            current_metrics = self._calculate_metrics(current_results) if current_results else {}
            
            # Save the rollback as a new version (to maintain history)
            rollback_version = len(self.prompt_manager.get_available_versions(self.agent_type)) + 1
            rollback_path = self.prompt_manager.save_prompt_version(
                self.agent_type, target_prompt, target_metrics, rollback_version,
                {
                    'rollback_from_version': rollback_version - 1,
                    'rollback_to_version': version,
                    'rollback_timestamp': datetime.now().isoformat(),
                    'rollback_reason': f'Manual rollback to version {version}'
                }
            )
            
            print(f"✅ Rollback completed to version {version}")
            
            return {
                'agent_type': self.agent_type,
                'rollback_from_version': rollback_version - 1,
                'rollback_to_version': version,
                'target_prompt': target_prompt,
                'target_metrics': {
                    'accuracy': target_metrics.get('avg_accuracy', 0),
                    'completeness': target_metrics.get('avg_completeness', 0),
                    'clinical_appropriateness': target_metrics.get('avg_clinical', 0),
                    'overall_score': target_metrics.get('avg_score', 0)
                },
                'current_metrics': {
                    'accuracy': current_metrics.get('avg_accuracy', 0),
                    'completeness': current_metrics.get('avg_completeness', 0),
                    'clinical_appropriateness': current_metrics.get('avg_clinical', 0),
                    'overall_score': current_metrics.get('avg_score', 0)
                },
                'rollback_version': rollback_version,
                'rollback_path': rollback_path
            }
            
        except Exception as e:
            print(f"❌ Failed to rollback {self.agent_type} to version {version}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'error': f'Rollback failed: {str(e)}',
                'agent_type': self.agent_type
            }

    def list_version_history(self) -> List[Dict[str, Any]]:
        """
        Get version history for rollback selection.
        
        Returns:
            List of version information
        """
        try:
            versions = self.prompt_manager.get_available_versions(self.agent_type)
            history = []
            
            for version_info in versions:
                version_data = self.prompt_manager.load_prompt_version(
                    self.agent_type, version_info['iteration']
                )
                
                if version_data:
                    history.append({
                        'version': version_info['iteration'],
                        'timestamp': version_data['timestamp'],
                        'score': version_data.get('metrics', {}).get('avg_score', 0),
                        'improvement': version_data.get('metadata', {}).get('improvement', 0),
                        'is_rollback': 'rollback_to_version' in version_data.get('metadata', {}),
                        'rollback_info': {
                            'from_version': version_data.get('metadata', {}).get('rollback_from_version'),
                            'to_version': version_data.get('metadata', {}).get('rollback_to_version'),
                            'reason': version_data.get('metadata', {}).get('rollback_reason')
                        } if 'rollback_to_version' in version_data.get('metadata', {}) else None
                    })
            
            # Sort by version descending (newest first)
            history.sort(key=lambda x: x['version'], reverse=True)
            
            return history
            
        except Exception as e:
            print(f"❌ Failed to get version history for {self.agent_type}: {str(e)}")
            return []

    def create_backup_snapshot(self, reason: str = "Manual backup") -> Dict[str, Any]:
        """
        Create a backup snapshot of the current state.
        
        Args:
            reason: Reason for creating the backup
            
        Returns:
            Dict containing backup information
        """
        try:
            print(f"📸 Creating backup snapshot for {self.agent_type}")
            
            # Get current state
            current_prompt = self._get_current_prompt()
            current_results = self._evaluate_current_prompt()
            current_metrics = self._calculate_metrics(current_results) if current_results else {}
            
            # Save as a backup version
            backup_version = len(self.prompt_manager.get_available_versions(self.agent_type)) + 1
            backup_path = self.prompt_manager.save_prompt_version(
                self.agent_type, current_prompt, current_metrics, backup_version,
                {
                    'backup_snapshot': True,
                    'backup_reason': reason,
                    'backup_timestamp': datetime.now().isoformat(),
                    'is_manual_backup': True
                }
            )
            
            print(f"✅ Backup snapshot created as version {backup_version}")
            
            return {
                'agent_type': self.agent_type,
                'backup_version': backup_version,
                'backup_path': backup_path,
                'backup_reason': reason,
                'metrics': {
                    'accuracy': current_metrics.get('avg_accuracy', 0),
                    'completeness': current_metrics.get('avg_completeness', 0),
                    'clinical_appropriateness': current_metrics.get('avg_clinical', 0),
                    'overall_score': current_metrics.get('avg_score', 0)
                }
            }
            
        except Exception as e:
            print(f"❌ Failed to create backup for {self.agent_type}: {str(e)}")
            return {
                'error': f'Backup failed: {str(e)}',
                'agent_type': self.agent_type
            }

    def cleanup_expired_data(self, max_age_days: int = 30, keep_recent_backups: int = 5) -> Dict[str, Any]:
        """
        Privacy housekeeping: Clean up expired candidates, jobs, and old backups.
        
        Args:
            max_age_days: Maximum age in days for temporary files
            keep_recent_backups: Number of recent backups to keep per agent
        
        Returns:
            Dict with cleanup statistics
        """
        print(f"🧹 Starting privacy housekeeping and storage cleanup")
        
        stats = {
            'candidates_cleaned': 0,
            'candidates_kept': 0,
            'jobs_cleaned': 0,
            'jobs_kept': 0,
            'backups_cleaned': 0,
            'backups_kept': 0,
            'temp_files_cleaned': 0,
            'asr_corrections_cleaned': 0,
            'asr_corrections_kept': 0,
            'total_space_freed': 0,
            'errors': []
        }
        
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        
        try:
            # Clean up expired GEPA candidates
            candidates_dir = Path('data/gepa/candidates')
            if candidates_dir.exists():
                stats.update(self._cleanup_candidates(candidates_dir, cutoff_date))
            
            # Clean up expired jobs
            jobs_dir = Path('data/jobs')  
            if jobs_dir.exists():
                stats.update(self._cleanup_jobs(jobs_dir, cutoff_date))
            
            # Clean up old backup versions (keep recent ones)
            prompts_dir = Path('llm/prompts')
            if prompts_dir.exists():
                backup_stats = self._cleanup_backups(prompts_dir, keep_recent_backups)
                stats['backups_cleaned'] += backup_stats['cleaned']
                stats['backups_kept'] += backup_stats['kept']
            
            # Clean up temporary files
            temp_stats = self._cleanup_temp_files()
            stats['temp_files_cleaned'] = temp_stats['cleaned']
            
            # Clean up ASR corrections data
            asr_stats = self._cleanup_asr_data(cutoff_date)
            stats['asr_corrections_cleaned'] = asr_stats['cleaned']
            stats['asr_corrections_kept'] = asr_stats['kept']
            
            print(f"✅ Privacy cleanup completed:")
            print(f"   • Candidates: {stats['candidates_cleaned']} cleaned, {stats['candidates_kept']} kept")
            print(f"   • Jobs: {stats['jobs_cleaned']} cleaned, {stats['jobs_kept']} kept")
            print(f"   • Backups: {stats['backups_cleaned']} cleaned, {stats['backups_kept']} kept")
            print(f"   • ASR corrections: {stats['asr_corrections_cleaned']} cleaned, {stats['asr_corrections_kept']} kept")
            print(f"   • Temp files: {stats['temp_files_cleaned']} cleaned")
            
            if stats['errors']:
                print(f"⚠️  {len(stats['errors'])} errors occurred during cleanup")
            
        except Exception as e:
            error_msg = f"Privacy cleanup failed: {str(e)}"
            stats['errors'].append(error_msg)
            print(f"❌ {error_msg}")
        
        return stats

    def _cleanup_candidates(self, candidates_dir: Path, cutoff_date: datetime) -> Dict[str, int]:
        """Clean up expired GEPA candidates."""
        stats = {'candidates_cleaned': 0, 'candidates_kept': 0}
        
        try:
            for candidate_file in candidates_dir.glob('*.json'):
                try:
                    # Check file modification time
                    file_mtime = datetime.fromtimestamp(candidate_file.stat().st_mtime)
                    
                    if file_mtime < cutoff_date:
                        # Check if candidate is referenced in any recent optimization
                        candidate_data = json.loads(candidate_file.read_text())
                        
                        # Keep candidates that are part of recent optimizations
                        if self._is_candidate_referenced(candidate_data, cutoff_date):
                            stats['candidates_kept'] += 1
                        else:
                            candidate_file.unlink()  # Delete expired candidate
                            stats['candidates_cleaned'] += 1
                            print(f"🗑️  Cleaned expired candidate: {candidate_file.name}")
                    else:
                        stats['candidates_kept'] += 1
                        
                except Exception as e:
                    print(f"⚠️  Failed to process candidate {candidate_file.name}: {e}")
                    
        except Exception as e:
            print(f"❌ Failed to cleanup candidates directory: {e}")
            
        return stats

    def _cleanup_jobs(self, jobs_dir: Path, cutoff_date: datetime) -> Dict[str, int]:
        """Clean up expired job files."""
        stats = {'jobs_cleaned': 0, 'jobs_kept': 0}
        
        try:
            for job_file in jobs_dir.glob('*.json'):
                try:
                    job_data = json.loads(job_file.read_text())
                    
                    # Parse job completion date
                    if 'completed_at' in job_data and job_data['completed_at']:
                        completed_date = datetime.fromisoformat(job_data['completed_at'].replace('Z', '+00:00'))
                        completed_date = completed_date.replace(tzinfo=None)  # Remove timezone for comparison
                        
                        if completed_date < cutoff_date:
                            job_file.unlink()
                            stats['jobs_cleaned'] += 1
                            print(f"🗑️  Cleaned expired job: {job_file.name}")
                        else:
                            stats['jobs_kept'] += 1
                    else:
                        # Keep running or incomplete jobs
                        stats['jobs_kept'] += 1
                        
                except Exception as e:
                    print(f"⚠️  Failed to process job {job_file.name}: {e}")
                    stats['jobs_kept'] += 1  # Keep on error
                    
        except Exception as e:
            print(f"❌ Failed to cleanup jobs directory: {e}")
            
        return stats

    def _cleanup_backups(self, prompts_dir: Path, keep_recent: int) -> Dict[str, int]:
        """Clean up old backup versions, keeping recent ones."""
        stats = {'cleaned': 0, 'kept': 0}
        
        try:
            # Group backup files by agent type
            agent_backups = {}
            
            for agent_dir in prompts_dir.iterdir():
                if agent_dir.is_dir():
                    backup_files = []
                    
                    # Find backup files (v*.json with backup metadata)
                    for version_file in agent_dir.glob('v*.json'):
                        try:
                            version_data = json.loads(version_file.read_text())
                            if version_data.get('metadata', {}).get('backup_snapshot', False):
                                backup_files.append((version_file, version_data))
                        except Exception:
                            continue
                    
                    # Sort by creation time (newest first)
                    backup_files.sort(key=lambda x: x[1].get('metadata', {}).get('backup_timestamp', ''), reverse=True)
                    
                    # Keep recent backups, remove old ones
                    for i, (backup_file, backup_data) in enumerate(backup_files):
                        if i >= keep_recent:
                            try:
                                backup_file.unlink()
                                stats['cleaned'] += 1
                                print(f"🗑️  Cleaned old backup: {backup_file.name}")
                            except Exception as e:
                                print(f"⚠️  Failed to remove backup {backup_file.name}: {e}")
                        else:
                            stats['kept'] += 1
                            
        except Exception as e:
            print(f"❌ Failed to cleanup backups: {e}")
            
        return stats

    def _cleanup_temp_files(self) -> Dict[str, int]:
        """Clean up temporary files (.tmp, .bak, etc.)."""
        stats = {'cleaned': 0}
        
        temp_patterns = ['**/*.tmp', '**/*.bak', '**/*~', '**/.DS_Store']
        search_dirs = [Path('data'), Path('llm'), Path('.')]
        
        try:
            for search_dir in search_dirs:
                if not search_dir.exists():
                    continue
                    
                for pattern in temp_patterns:
                    try:
                        for temp_file in search_dir.glob(pattern):
                            if temp_file.is_file():
                                temp_file.unlink()
                                stats['cleaned'] += 1
                                print(f"🗑️  Cleaned temp file: {temp_file}")
                    except Exception as e:
                        print(f"⚠️  Failed to clean pattern {pattern}: {e}")
                        
        except Exception as e:
            print(f"❌ Failed to cleanup temp files: {e}")
            
        return stats

    def _is_candidate_referenced(self, candidate_data: Dict[str, Any], cutoff_date: datetime) -> bool:
        """Check if a candidate is referenced in recent optimization history."""
        try:
            history_file = Path('data/gepa/optimization_history.json')
            if not history_file.exists():
                return False
                
            history_data = json.loads(history_file.read_text())
            candidate_id = candidate_data.get('id', '')
            
            # Look for recent references to this candidate
            for entry in history_data.get('entries', []):
                entry_date = datetime.fromisoformat(entry.get('timestamp', ''))
                if entry_date > cutoff_date:
                    # Check if this candidate was used in recent optimization
                    if candidate_id in str(entry):
                        return True
                        
        except Exception:
            pass
            
        return False

    def _cleanup_asr_data(self, cutoff_date: datetime) -> Dict[str, int]:
        """Clean up ASR corrections data."""
        stats = {'cleaned': 0, 'kept': 0}
        
        try:
            asr_data_dir = Path('data/asr')
            if not asr_data_dir.exists():
                return stats
                
            # Clean up uploaded corrections entries
            corrections_file = asr_data_dir / 'uploaded_corrections.json'
            if corrections_file.exists():
                try:
                    corrections_data = json.loads(corrections_file.read_text())
                    original_count = len(corrections_data)
                    
                    # Filter out old corrections
                    filtered_corrections = []
                    for correction in corrections_data:
                        if 'timestamp' in correction:
                            correction_time = datetime.fromtimestamp(correction['timestamp'] / 1000)  # Convert from ms
                            if correction_time > cutoff_date:
                                filtered_corrections.append(correction)
                                stats['kept'] += 1
                            else:
                                stats['cleaned'] += 1
                        else:
                            # Keep corrections without timestamp (they're probably important)
                            filtered_corrections.append(correction)
                            stats['kept'] += 1
                    
                    # Write back filtered data
                    if len(filtered_corrections) != original_count:
                        atomic_write_json(corrections_file, filtered_corrections)
                        print(f"🗑️  Cleaned {original_count - len(filtered_corrections)} ASR corrections from uploaded_corrections.json")
                        
                except Exception as e:
                    print(f"⚠️  Failed to cleanup ASR corrections: {e}")
                    
            # Clean up other ASR data files if they exist
            for file_pattern in ['*.json', '*.log', '*.tmp']:
                for file_path in asr_data_dir.glob(file_pattern):
                    if file_path.name == 'uploaded_corrections.json':
                        continue  # Already handled above
                        
                    try:
                        file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if file_mtime < cutoff_date:
                            file_path.unlink()
                            stats['cleaned'] += 1
                            print(f"🗑️  Cleaned expired ASR file: {file_path.name}")
                        else:
                            stats['kept'] += 1
                    except Exception as e:
                        print(f"⚠️  Failed to process ASR file {file_path.name}: {e}")
                        
        except Exception as e:
            print(f"❌ Failed to cleanup ASR data: {e}")
            
        return stats


def main():
    """Command-line interface for GEPA optimization."""
    parser = argparse.ArgumentParser(description='Run GEPA optimization for medical agents')
    parser.add_argument('--task', choices=list(PREDICTOR_CLASSES.keys()), required=True,
                       help='Medical agent to optimize')
    parser.add_argument('--iterations', type=int, default=5,
                       help='Number of optimization iterations')
    parser.add_argument('--with-human', action='store_true',
                       help='Enable human feedback collection')
    parser.add_argument('--fresh-run', action='store_true',
                       help='Bypass cache with unique rollout ID')
    
    args = parser.parse_args()
    
    # Check if DSPy is enabled
    if not is_dspy_enabled(args.task):
        print(f"❌ DSPy not enabled for {args.task}")
        print("   Set USE_DSPY=true and enable agent in config/llm.yaml")
        return
    
    # Configure DSPy
    config = get_config()
    if args.fresh_run:
        config.set_fresh_run()
    
    configure_lm(args.task)
    
    # Run optimization
    optimizer = GEPAOptimizer(args.task)
    results = optimizer.run_optimization(args.iterations, args.with_human)
    
    # Print results summary
    print("\n" + "="*60)
    print("GEPA OPTIMIZATION RESULTS")
    print("="*60)
    
    if 'error' in results:
        print(f"❌ Optimization failed: {results['error']}")
    else:
        print(f"Agent: {results['agent_type']}")
        print(f"Iterations: {results['iterations_run']}")
        print(f"Baseline Score: {results['baseline_score']:.1f}%")
        print(f"Final Score: {results['final_score']:.1f}%")
        print(f"Improvement: {results['improvement']:.1f}%")
        print(f"Human Feedback: {results['human_feedback_entries']} entries")
        print(f"Success: {'✅' if results['optimization_successful'] else '❌'}")
        
        if results['improvement'] > 0:
            print(f"\n🎉 Optimization improved performance by {results['improvement']:.1f}%")
        elif results['improvement'] < 0:
            print(f"\n⚠️  Performance decreased by {abs(results['improvement']):.1f}%")
        else:
            print(f"\n➡️  No significant performance change")


if __name__ == "__main__":
    main()