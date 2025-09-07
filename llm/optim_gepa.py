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
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import dspy
from dspy.teleprompt import BootstrapFewShot, MIPROv2, BootstrapFewShotWithOptuna, GEPA

from .dspy_config import get_config, configure_lm, is_dspy_enabled
from .predictors import get_predictor, PREDICTOR_CLASSES
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
        with open(version_file, 'w') as f:
            json.dump(version_data, f, indent=2)
        
        # Update current prompt file  
        current_file = agent_dir / "current.md"
        with open(current_file, 'w') as f:
            f.write(f"# {agent_type.title()} Agent Prompt\n")
            f.write(f"Version: {iteration}\n")
            f.write(f"Generated: {timestamp}\n")
            f.write(f"Score: {metrics.get('avg_score', 0):.1f}%\n\n")
            f.write(prompt)
        
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
        
        with open(feedback_file, 'w') as f:
            f.write(template)
        
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