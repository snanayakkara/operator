"""
DSPy Signatures for Medical Dictation Processing

Defines typed input/output signatures for each medical agent pipeline.
Based on existing system prompts from specialized medical agents.

Each signature represents a specific medical documentation task:
- Input: Raw dictation transcript
- Output: Structured medical report
"""

import dspy
from typing import Optional

class AngioToReport(dspy.Signature):
    """
    Generate comprehensive cardiac catheterization report from dictation.
    
    Processes both diagnostic angiograms and PCI interventions with:
    - Procedural details and hemodynamic measurements
    - Vessel-by-vessel angiographic findings  
    - TIMI flow assessment and stenosis grading
    - Device specifications and intervention outcomes
    - Australian medical terminology and spelling
    
    Uses unified 4-section format:
    PREAMBLE → FINDINGS → PROCEDURE → CONCLUSION
    """
    
    transcript: str = dspy.InputField(
        desc="Raw dictation of cardiac catheterization procedure including diagnostic findings and interventions"
    )
    
    report_text: str = dspy.OutputField(
        desc="Complete formatted cardiac catheterization report with proper medical terminology, vessel assessments, procedural details, and clinical conclusions in structured 4-section format"
    )


class LetterFromDictation(dspy.Signature):
    """
    Transform medical dictation into professional clinical correspondence.
    
    Generates clean narrative prose for:
    - Referral letters and consultation summaries
    - Follow-up communications and discharge letters
    - Medical correspondence with proper formatting
    - Australian spelling and clinical terminology
    
    Maintains continuous narrative flow with proper paragraph structure.
    Includes clinical reasoning and actionable recommendations.
    """
    
    transcript: str = dspy.InputField(
        desc="Raw dictated medical correspondence including clinical findings, assessments, and recommendations"
    )
    
    letter_text: str = dspy.OutputField(
        desc="Professional medical letter with proper narrative structure, clinical terminology, and continuous prose formatting suitable for inter-clinician communication"
    )


class TAVIToReport(dspy.Signature):
    """
    Generate comprehensive TAVI procedure documentation.
    
    Documents transcatheter aortic valve implantation with:
    - Pre-procedural hemodynamic assessment
    - Valve sizing and deployment details
    - Post-procedural outcomes and complications
    - Device specifications and positioning
    - Hemodynamic improvements and gradients
    
    Uses structured medical report format with quantitative measurements.
    """
    
    transcript: str = dspy.InputField(
        desc="TAVI procedure dictation including hemodynamics, valve deployment, and outcomes"
    )
    
    report_text: str = dspy.OutputField(
        desc="Structured TAVI procedure report with hemodynamic data, device details, procedural steps, and clinical outcomes"
    )


class ConsultationToReport(dspy.Signature):
    """
    Generate comprehensive medical consultation documentation.
    
    Processes complex multi-system assessments with:
    - Detailed clinical history and examination
    - Investigation review and interpretation
    - Clinical reasoning and differential diagnosis
    - Management plan and recommendations
    - Risk stratification and follow-up arrangements
    
    Emphasizes clinical reasoning and evidence-based recommendations.
    """
    
    transcript: str = dspy.InputField(
        desc="Medical consultation dictation with history, examination, investigations, and clinical reasoning"
    )
    
    report_text: str = dspy.OutputField(
        desc="Comprehensive consultation report with structured assessment, clinical reasoning, and detailed management recommendations"
    )


class InvestigationSummary(dspy.Signature):
    """
    Format investigation results into structured clinical summaries.
    
    Processes various diagnostic tests:
    - Echocardiography and cardiac imaging
    - Exercise testing and functional assessments  
    - Laboratory results and biomarkers
    - Radiological investigations
    
    Simple formatting task focusing on clear presentation of results.
    Uses lightweight processing for rapid turnaround.
    """
    
    transcript: str = dspy.InputField(
        desc="Raw dictation of investigation results including imaging, laboratory, and functional test findings"
    )
    
    summary_text: str = dspy.OutputField(
        desc="Clearly formatted investigation summary with organized results and clinical correlation"
    )


class MedicationReview(dspy.Signature):
    """
    Process medication lists into comprehensive clinical reviews.
    
    Analyzes and formats:
    - Current medication regimens with dosing
    - Drug interactions and contraindications
    - Compliance assessment and optimization
    - Therapeutic recommendations and adjustments
    - Australian medication naming conventions
    
    Includes clinical rationale for medication choices and modifications.
    """
    
    transcript: str = dspy.InputField(
        desc="Medication dictation including drug names, doses, interactions, and therapeutic reasoning"
    )
    
    review_text: str = dspy.OutputField(
        desc="Comprehensive medication review with organized drug list, clinical analysis, and therapeutic recommendations"
    )


class BackgroundSummary(dspy.Signature):
    """
    Format patient medical background into structured clinical summaries.
    
    Organizes patient history including:
    - Past medical conditions and surgical history
    - Risk factors and family history
    - Current medications and allergies
    - Social history and functional status
    
    Uses arrow notation (↪) for continuation and structured formatting.
    Lightweight formatting focused on clear organization.
    """
    
    transcript: str = dspy.InputField(
        desc="Patient background dictation including medical history, medications, risk factors, and social history"
    )
    
    background_text: str = dspy.OutputField(
        desc="Structured patient background summary with organized medical history, current medications, and relevant clinical context"
    )


# Additional signatures for future agent types
class MTEERToReport(dspy.Signature):
    """Generate MitraClip/PASCAL procedure documentation."""
    transcript: str = dspy.InputField(desc="mTEER procedure dictation")
    report_text: str = dspy.OutputField(desc="Structured mTEER procedure report")


class PFOClosureToReport(dspy.Signature):  
    """Generate PFO closure procedure documentation."""
    transcript: str = dspy.InputField(desc="PFO closure procedure dictation")
    report_text: str = dspy.OutputField(desc="Structured PFO closure report")


class RightHeartCathToReport(dspy.Signature):
    """Generate right heart catheterization documentation."""
    transcript: str = dspy.InputField(desc="Right heart cath procedure dictation") 
    report_text: str = dspy.OutputField(desc="Structured right heart cath report")


class AusMedicalReview(dspy.Signature):
    """Generate Australian guideline-compliant medical reviews."""
    transcript: str = dspy.InputField(desc="Clinical data for guideline review")
    review_text: str = dspy.OutputField(desc="Australian guideline-compliant clinical review")


# Signature registry for easy lookup
SIGNATURE_REGISTRY = {
    'angiogram-pci': AngioToReport,
    'quick-letter': LetterFromDictation,
    'tavi': TAVIToReport,
    'consultation': ConsultationToReport,
    'investigation-summary': InvestigationSummary,
    'medication': MedicationReview,
    'background': BackgroundSummary,
    'mteer': MTEERToReport,
    'pfo-closure': PFOClosureToReport,
    'right-heart-cath': RightHeartCathToReport,
    'ai-medical-review': AusMedicalReview,
}


def get_signature(agent_type: str) -> Optional[dspy.Signature]:
    """
    Get DSPy signature for given agent type.
    
    Args:
        agent_type: Medical agent identifier
        
    Returns:
        DSPy signature class or None if not found
    """
    return SIGNATURE_REGISTRY.get(agent_type)


def get_signature_for_agent(agent_type: str) -> Optional[dspy.Signature]:
    """
    Alias for get_signature to support optimization code.
    
    Args:
        agent_type: Medical agent identifier
        
    Returns:
        DSPy signature class or None if not found
    """
    return get_signature(agent_type)


def list_available_signatures():
    """List all available agent signatures."""
    print("Available DSPy signatures:")
    for agent_type, signature in SIGNATURE_REGISTRY.items():
        print(f"  {agent_type}: {signature.__doc__.split('.')[0] if signature.__doc__ else 'No description'}")


if __name__ == "__main__":
    # Test signature registry
    list_available_signatures()
    
    # Test signature instantiation
    angio_sig = get_signature('angiogram-pci')
    if angio_sig:
        print(f"\n✅ Angiogram signature: {angio_sig.__name__}")
        print(f"   Input: {angio_sig.transcript}")
        print(f"   Output: {angio_sig.report_text}")
    
    letter_sig = get_signature('quick-letter')
    if letter_sig:
        print(f"\n✅ Letter signature: {letter_sig.__name__}")
        print(f"   Input: {letter_sig.transcript}")  
        print(f"   Output: {letter_sig.letter_text}")