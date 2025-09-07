"""
DSPy + GEPA Integration Package for Medical Dictation Processing

This package provides a thin DSPy layer over the existing medical agents with:
- Feature-flagged integration (USE_DSPY environment variable)
- Localhost-first configuration for privacy
- GEPA optimization with human-in-the-loop feedback
- Comprehensive medical evaluation rubrics
- Versioned prompt management

Usage:
    # Check if DSPy is enabled
    from llm import is_dspy_enabled
    if is_dspy_enabled('angiogram-pci'):
        from llm import process_with_dspy
        result = process_with_dspy('angiogram-pci', transcript)

    # Run evaluation
    python -m llm.evaluate --task angiogram-pci
    
    # Run optimization
    python -m llm.optim_gepa --task angiogram-pci --iterations 5 --with-human
"""

from .dspy_config import (
    get_config,
    configure_lm, 
    is_dspy_enabled,
    verify_localhost_only,
    DSPyConfig
)

from .signatures import (
    AngioToReport,
    LetterFromDictation,
    TAVIToReport,
    ConsultationToReport,
    InvestigationSummary,
    MedicationReview,
    BackgroundSummary,
    get_signature,
    SIGNATURE_REGISTRY
)

from .predictors import (
    AngioReportPredictor,
    LetterPredictor,
    InvestigationPredictor,
    MedicationPredictor,
    BackgroundPredictor,
    get_predictor,
    process_with_dspy,
    PREDICTOR_CLASSES
)

from .evaluate import (
    angiogram_rubric_scorer,
    quick_letter_rubric_scorer,
    investigation_summary_rubric_scorer,
    run_evaluation,
    print_evaluation_summary,
    RUBRIC_SCORERS
)

from .optim_gepa import (
    GEPAOptimizer,
    PromptVersionManager,
    HumanFeedbackManager
)

# Package metadata
__version__ = "1.0.0"
__author__ = "Operator Team"
__description__ = "DSPy + GEPA integration for medical dictation processing"

# Safety verification on import
try:
    verify_localhost_only()
except Exception as e:
    print(f"⚠️  Safety verification warning: {e}")

# Export main interface functions
__all__ = [
    # Configuration
    'get_config', 'configure_lm', 'is_dspy_enabled', 'verify_localhost_only',
    
    # Signatures and predictors  
    'get_signature', 'get_predictor', 'process_with_dspy',
    
    # Evaluation
    'run_evaluation', 'print_evaluation_summary',
    
    # Optimization
    'GEPAOptimizer', 'PromptVersionManager', 'HumanFeedbackManager',
    
    # Registries
    'SIGNATURE_REGISTRY', 'PREDICTOR_CLASSES', 'RUBRIC_SCORERS'
]