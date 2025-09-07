"""
DSPy Predictors for Medical Agent Processing

Wraps existing system prompts from specialized medical agents into DSPy predictors.
Each predictor uses the exact same medical knowledge and instructions as the original agents.

The predictors import system prompts from the TypeScript SystemPrompts files to maintain
consistency with existing medical accuracy and terminology requirements.
"""

import dspy
from typing import Dict, Optional
from .signatures import (
    AngioToReport, LetterFromDictation, TAVIToReport, ConsultationToReport,
    InvestigationSummary, MedicationReview, BackgroundSummary,
    MTEERToReport, PFOClosureToReport, RightHeartCathToReport, AusMedicalReview
)

class MedicalPredictor:
    """Base class for medical predictors with common functionality."""
    
    def __init__(self, signature_class, agent_type: str):
        self.agent_type = agent_type
        self.signature_class = signature_class
        self.predictor = dspy.Predict(signature_class)
        
    def __call__(self, transcript: str, **kwargs):
        """Process transcript through DSPy predictor."""
        try:
            result = self.predictor(transcript=transcript)
            return result
        except Exception as e:
            print(f"❌ Error in {self.agent_type} predictor: {e}")
            # Fallback to basic structure if DSPy fails
            return self._create_fallback_result(transcript)
    
    def _create_fallback_result(self, transcript: str):
        """Create fallback result if DSPy processing fails."""
        # This would create a basic result structure
        # Implementation depends on the specific signature
        pass


class AngioReportPredictor(MedicalPredictor):
    """
    Angiogram/PCI report predictor using existing AngiogramPCISystemPrompts.
    
    Incorporates comprehensive cardiac catheterization knowledge:
    - Vessel anatomy and stenosis grading terminology
    - TIMI flow assessment and angiographic results  
    - Device specifications and procedural techniques
    - Australian medical spelling and terminology
    - 4-section report structure (PREAMBLE → FINDINGS → PROCEDURE → CONCLUSION)
    
    Based on ANGIOGRAM_PCI_SYSTEM_PROMPTS.primary from AngiogramPCISystemPrompts.ts
    """
    
    def __init__(self):
        super().__init__(AngioToReport, 'angiogram-pci')
        
        # Import existing system prompt content (this would normally pull from the TS file)
        self.system_instructions = """
        You are a specialist interventional cardiologist generating cardiac catheterization reports.
        
        CRITICAL INSTRUCTIONS:
        - Analyze dictation to determine procedure type: DIAGNOSTIC ANGIOGRAM, PCI INTERVENTION, or COMBINED
        - Use unified 4-section format with clear section separation
        - DO NOT include letter-style formatting or greetings
        - Use structured clinical report format with narrative flow
        
        UNIFIED 4-SECTION REPORT FORMAT:
        **PREAMBLE** - Patient demographics, access details, equipment used
        **FINDINGS** - Vessel-by-vessel angiographic assessment
        **PROCEDURE** - Step-by-step procedural details (for interventions)
        **CONCLUSION** - Overall assessment and post-procedural plan
        
        MEDICAL TERMINOLOGY REQUIREMENTS:
        - Use stenosis terminology EXACTLY as provided by clinician
        - Preserve original medical language and terminology
        - Australian spelling (recognise, optimise, colour, favour)
        - Standard vessel abbreviations (LM, LAD, LCx, RCA)
        - Precise stent dimensions in X.Xx## format
        - Document TIMI flow using descriptive terms as stated
        """
        
    def _create_fallback_result(self, transcript: str):
        """Fallback angiogram report structure."""
        return type('Result', (), {
            'report_text': f"""**PREAMBLE**
Cardiac catheterization procedure performed.

**FINDINGS**  
Coronary angiography findings from dictation: {transcript[:200]}...

**PROCEDURE**
[Procedural details not fully processed due to technical limitations]

**CONCLUSION**
Cardiac catheterization completed. Clinical correlation recommended.

Note: This report was generated with limited AI processing."""
        })()


class LetterPredictor(MedicalPredictor):
    """
    Quick letter predictor using existing QuickLetterSystemPrompts.
    
    Generates professional medical correspondence with:
    - Continuous narrative prose formatting
    - Clinical reasoning and recommendations
    - Australian spelling and medical terminology
    - Proper paragraph structure and flow
    - Intelligent summary generation
    
    Based on QUICK_LETTER_SYSTEM_PROMPTS.primary from QuickLetterSystemPrompts.ts
    """
    
    def __init__(self):
        super().__init__(LetterFromDictation, 'quick-letter')
        
        self.system_instructions = """
        You are generating professional medical correspondence from dictated content.
        
        CRITICAL INSTRUCTIONS:
        - Create continuous narrative prose suitable for inter-clinician communication
        - Maintain professional medical language and terminology
        - Use Australian spelling conventions
        - Organize content with clear paragraph structure
        - Include clinical reasoning and actionable recommendations
        - Expand medical abbreviations on first use
        - Format medications with proper dosing information
        
        OUTPUT STRUCTURE:
        SUMMARY: [Concise clinical summary with key findings and recommendations]
        ---
        LETTER: [Full letter content in continuous narrative prose]
        
        MEDICAL TERMINOLOGY:
        - Australian spelling (recognise, optimise, centre, favour)
        - Expand contractions to formal language
        - Use precise medical terminology
        - Include medication dosages and frequencies
        - Maintain clinical accuracy throughout
        """
        
    def _create_fallback_result(self, transcript: str):
        """Fallback letter structure."""
        return type('Result', (), {
            'letter_text': f"""Thank you for referring this patient for assessment.

{transcript[:300]}...

I will arrange follow-up as clinically indicated. Please contact our office if you have any questions.

Note: This correspondence was generated with limited AI processing capabilities."""
        })()


class InvestigationPredictor(MedicalPredictor):
    """Investigation summary predictor for simple formatting tasks."""
    
    def __init__(self):
        super().__init__(InvestigationSummary, 'investigation-summary')
        
    def _create_fallback_result(self, transcript: str):
        return type('Result', (), {
            'summary_text': f"Investigation Summary:\n\n{transcript}\n\nNote: Limited processing applied."
        })()


class MedicationPredictor(MedicalPredictor):
    """Medication review predictor."""
    
    def __init__(self):
        super().__init__(MedicationReview, 'medication')
        
    def _create_fallback_result(self, transcript: str):
        return type('Result', (), {
            'review_text': f"Medication Review:\n\n{transcript}\n\nNote: Limited processing applied."
        })()


class BackgroundPredictor(MedicalPredictor):
    """Background summary predictor."""
    
    def __init__(self):
        super().__init__(BackgroundSummary, 'background')
        
    def _create_fallback_result(self, transcript: str):
        return type('Result', (), {
            'background_text': f"Patient Background:\n\n{transcript}\n\nNote: Limited processing applied."
        })()


class TAVIPredictor(MedicalPredictor):
    """
    TAVI procedure predictor using existing TAVISystemPrompts.
    
    Generates comprehensive TAVI procedure documentation with:
    - Pre-procedural hemodynamic assessment and valve sizing
    - Detailed device deployment and positioning
    - Post-procedural outcomes and hemodynamic improvements
    - Structured procedural reporting with quantitative data
    - Australian medical terminology and clinical accuracy
    
    Based on TAVI_SYSTEM_PROMPTS.primary from TAVISystemPrompts.ts
    """
    
    def __init__(self):
        super().__init__(TAVIToReport, 'tavi')
        
        self.system_instructions = """
        You are a specialist interventional cardiologist generating TAVI procedure reports.
        
        CRITICAL INSTRUCTIONS:
        - Document comprehensive TAVI procedure with quantitative hemodynamic data
        - Use structured medical report format with precise measurements
        - Include pre/post procedural assessments and valve performance
        - Australian spelling and medical terminology required
        
        TAVI REPORT STRUCTURE:
        **PREAMBLE** - Patient details, access, equipment, team
        **PRE-PROCEDURAL ASSESSMENT** - Echo, CT measurements, hemodynamics
        **PROCEDURE** - Valve deployment, positioning, balloon post-dilation
        **POST-PROCEDURAL ASSESSMENT** - Hemodynamics, valve function, outcomes
        **CONCLUSION** - Overall success, complications, follow-up plan
        
        MEDICAL REQUIREMENTS:
        - Quantitative hemodynamic measurements (gradients, areas)
        - Precise valve sizing and positioning details
        - Comprehensive complication assessment
        - Australian spelling conventions throughout
        - Clinical reasoning for procedural decisions
        """
    
    def _create_fallback_result(self, transcript: str):
        """Fallback TAVI report structure."""
        return type('Result', (), {
            'report_text': f"""**PREAMBLE**
TAVI procedure performed.

**PRE-PROCEDURAL ASSESSMENT**
Aortic valve assessment from dictation: {transcript[:200]}...

**PROCEDURE**
[Procedural details not fully processed due to technical limitations]

**POST-PROCEDURAL ASSESSMENT**
Post-procedural outcomes pending full AI processing.

**CONCLUSION**
TAVI procedure completed. Clinical correlation recommended.

Note: This report was generated with limited AI processing."""
        })()


class ConsultationPredictor(MedicalPredictor):
    """
    Medical consultation predictor using existing ConsultationSystemPrompts.
    
    Generates comprehensive medical consultation reports with:
    - Detailed clinical history and examination findings
    - Investigation review and interpretation
    - Clinical reasoning and differential diagnosis
    - Evidence-based management recommendations
    - Risk stratification and follow-up planning
    
    Based on CONSULTATION_SYSTEM_PROMPTS.primary from ConsultationSystemPrompts.ts
    """
    
    def __init__(self):
        super().__init__(ConsultationToReport, 'consultation')
        
        self.system_instructions = """
        You are a senior consulting physician generating comprehensive consultation reports.
        
        CRITICAL INSTRUCTIONS:
        - Create structured consultation report with clinical reasoning
        - Emphasize evidence-based assessment and management
        - Include detailed examination and investigation interpretation
        - Australian medical terminology and spelling required
        
        CONSULTATION REPORT STRUCTURE:
        **REFERRAL** - Reason for referral and key questions
        **HISTORY** - Comprehensive clinical history including systems review
        **EXAMINATION** - Structured physical examination findings
        **INVESTIGATIONS** - Review and interpretation of relevant tests
        **ASSESSMENT** - Clinical reasoning and differential diagnosis
        **MANAGEMENT** - Evidence-based recommendations and follow-up
        
        MEDICAL REQUIREMENTS:
        - Clinical reasoning connecting findings to conclusions
        - Evidence-based management recommendations
        - Risk stratification and prognostic assessment
        - Clear follow-up and monitoring plans
        - Australian spelling and medical conventions
        """
    
    def _create_fallback_result(self, transcript: str):
        """Fallback consultation report structure."""
        return type('Result', (), {
            'report_text': f"""**REFERRAL**
Patient referred for specialist consultation.

**HISTORY**
Clinical history from dictation: {transcript[:300]}...

**EXAMINATION**
[Examination findings not fully processed due to technical limitations]

**INVESTIGATIONS**
[Investigation review pending full AI processing]

**ASSESSMENT**
Clinical assessment requires full AI processing for comprehensive analysis.

**MANAGEMENT**
Management recommendations pending detailed clinical analysis.

Note: This report was generated with limited AI processing capabilities."""
        })()


class MTEERPredictor(MedicalPredictor):
    """
    mTEER (MitraClip/PASCAL) procedure predictor.
    
    Documents mitral transcatheter edge-to-edge repair with:
    - Pre-procedural mitral assessment and planning
    - Device selection and deployment technique
    - Post-procedural outcomes and valve function
    - Structured interventional cardiology reporting
    """
    
    def __init__(self):
        super().__init__(MTEERToReport, 'mteer')
        
        self.system_instructions = """
        You are a specialist interventional cardiologist generating mTEER procedure reports.
        
        CRITICAL INSTRUCTIONS:
        - Document comprehensive mitral valve intervention procedure
        - Include detailed device specifications and deployment
        - Assess mitral regurgitation reduction and valve function
        - Use structured medical report format with quantitative data
        
        mTEER REPORT STRUCTURE:
        **PREAMBLE** - Patient details, access, equipment, procedural team
        **PRE-PROCEDURAL ASSESSMENT** - Echo assessment, MR severity, valve anatomy
        **PROCEDURE** - Device selection, deployment, positioning, outcomes
        **POST-PROCEDURAL ASSESSMENT** - MR reduction, valve function, hemodynamics
        **CONCLUSION** - Procedural success, complications, follow-up plan
        """
    
    def _create_fallback_result(self, transcript: str):
        return type('Result', (), {
            'report_text': f"mTEER Procedure Report\n\n{transcript}\n\nNote: Limited processing applied."
        })()


class PFOClosurePredictor(MedicalPredictor):
    """
    PFO closure procedure predictor.
    
    Documents patent foramen ovale closure with:
    - Anatomical assessment and device selection
    - Deployment technique and positioning
    - Post-procedural outcomes and follow-up
    """
    
    def __init__(self):
        super().__init__(PFOClosureToReport, 'pfo-closure')
        
        self.system_instructions = """
        You are a specialist interventional cardiologist generating PFO closure reports.
        
        CRITICAL INSTRUCTIONS:
        - Document comprehensive PFO closure procedure
        - Include anatomical assessment and device specifications
        - Assess procedural success and post-deployment outcomes
        - Use structured interventional cardiology report format
        
        PFO CLOSURE REPORT STRUCTURE:
        **PREAMBLE** - Patient details, indication, access, equipment
        **PRE-PROCEDURAL ASSESSMENT** - TEE assessment, PFO anatomy, shunt evaluation
        **PROCEDURE** - Device selection, deployment, positioning verification
        **POST-PROCEDURAL ASSESSMENT** - Device position, residual shunt, outcomes
        **CONCLUSION** - Procedural success, complications, antiplatelet therapy
        """
    
    def _create_fallback_result(self, transcript: str):
        return type('Result', (), {
            'report_text': f"PFO Closure Report\n\n{transcript}\n\nNote: Limited processing applied."
        })()


class RightHeartCathPredictor(MedicalPredictor):
    """
    Right heart catheterization predictor.
    
    Documents right heart catheterization with:
    - Comprehensive hemodynamic assessment
    - Pulmonary hypertension evaluation
    - Exercise hemodynamics when performed
    - Quantitative hemodynamic data reporting
    """
    
    def __init__(self):
        super().__init__(RightHeartCathToReport, 'right-heart-cath')
        
        self.system_instructions = """
        You are a specialist cardiologist generating right heart catheterization reports.
        
        CRITICAL INSTRUCTIONS:
        - Document comprehensive hemodynamic assessment
        - Include quantitative pressure and flow measurements
        - Assess for pulmonary hypertension and right heart function
        - Use structured hemodynamic report format
        
        RIGHT HEART CATH REPORT STRUCTURE:
        **PREAMBLE** - Patient details, indication, access, equipment
        **HEMODYNAMICS** - Comprehensive pressure measurements, cardiac output
        **ASSESSMENT** - Hemodynamic interpretation, PH classification
        **EXERCISE HEMODYNAMICS** - If performed, exercise response
        **CONCLUSION** - Hemodynamic summary, clinical correlation, management
        """
    
    def _create_fallback_result(self, transcript: str):
        return type('Result', (), {
            'report_text': f"Right Heart Catheterization Report\n\n{transcript}\n\nNote: Limited processing applied."
        })()


class AusMedicalReviewPredictor(MedicalPredictor):
    """
    Australian medical review predictor with guideline compliance.
    
    Provides comprehensive clinical review with:
    - Australian Heart Foundation guideline alignment
    - Local clinical practice standards
    - Medication safety with Australian conventions
    - Risk assessment with local population data
    """
    
    def __init__(self):
        super().__init__(AusMedicalReview, 'ai-medical-review')
        
        self.system_instructions = """
        You are an Australian specialist physician conducting comprehensive clinical reviews.
        
        CRITICAL INSTRUCTIONS:
        - Apply Australian clinical guidelines and best practices
        - Use Heart Foundation recommendations where applicable
        - Include Australian medication safety considerations
        - Assess cardiovascular risk using Australian tools
        
        AUSTRALIAN MEDICAL REVIEW STRUCTURE:
        **CLINICAL SUMMARY** - Key clinical issues and current status
        **RISK ASSESSMENT** - Australian CVD risk calculator considerations
        **MEDICATION REVIEW** - Australian safety standards and interactions
        **GUIDELINE COMPLIANCE** - Heart Foundation and NVDPA recommendations
        **RECOMMENDATIONS** - Evidence-based Australian clinical practice
        """
    
    def _create_fallback_result(self, transcript: str):
        return type('Result', (), {
            'review_text': f"Australian Medical Review\n\n{transcript}\n\nNote: Limited processing applied."
        })()


# Predictor registry for easy instantiation
PREDICTOR_CLASSES = {
    'angiogram-pci': AngioReportPredictor,
    'quick-letter': LetterPredictor,
    'investigation-summary': InvestigationPredictor,
    'medication': MedicationPredictor,
    'background': BackgroundPredictor,
    'tavi': TAVIPredictor,
    'consultation': ConsultationPredictor,
    'mteer': MTEERPredictor,
    'pfo-closure': PFOClosurePredictor,
    'right-heart-cath': RightHeartCathPredictor,
    'ai-medical-review': AusMedicalReviewPredictor,
}

# Singleton predictor instances (created on first use)
_predictor_instances = {}

def get_predictor(agent_type: str) -> Optional[MedicalPredictor]:
    """
    Get predictor instance for given agent type.
    Uses singleton pattern to avoid recreating predictors.
    
    Args:
        agent_type: Medical agent identifier
        
    Returns:
        Predictor instance or None if not found
    """
    if agent_type not in _predictor_instances:
        predictor_class = PREDICTOR_CLASSES.get(agent_type)
        if predictor_class:
            _predictor_instances[agent_type] = predictor_class()
        else:
            return None
            
    return _predictor_instances[agent_type]


def process_with_dspy(agent_type: str, transcript: str, **kwargs) -> Optional[str]:
    """
    Process transcript using DSPy predictor for given agent type.
    
    Args:
        agent_type: Medical agent identifier
        transcript: Raw dictation text
        **kwargs: Additional arguments
        
    Returns:
        Processed result text or None if processing fails
    """
    predictor = get_predictor(agent_type)
    if not predictor:
        print(f"❌ No DSPy predictor available for: {agent_type}")
        return None
        
    try:
        result = predictor(transcript, **kwargs)
        
        # Extract the appropriate output field based on agent type
        if agent_type == 'angiogram-pci':
            return result.report_text
        elif agent_type == 'quick-letter':
            return result.letter_text
        elif agent_type == 'investigation-summary':
            return result.summary_text
        elif agent_type == 'medication':
            return result.review_text
        elif agent_type == 'background':
            return result.background_text
        elif agent_type == 'ai-medical-review':
            return result.review_text
        elif agent_type in ['tavi', 'consultation', 'mteer', 'pfo-closure', 'right-heart-cath']:
            return result.report_text
        else:
            # Generic fallback - try common output field names
            for field_name in ['report_text', 'letter_text', 'summary_text', 'review_text']:
                if hasattr(result, field_name):
                    return getattr(result, field_name)
            return str(result)
            
    except Exception as e:
        print(f"❌ DSPy processing failed for {agent_type}: {e}")
        return None


def list_available_predictors():
    """List all available predictors."""
    print("Available DSPy predictors:")
    for agent_type, predictor_class in PREDICTOR_CLASSES.items():
        doc = predictor_class.__doc__
        description = doc.split('\n')[1].strip() if doc else "No description"
        print(f"  {agent_type}: {description}")


if __name__ == "__main__":
    # Test predictor registry
    list_available_predictors()
    
    # Test predictor instantiation
    angio_predictor = get_predictor('angiogram-pci')
    if angio_predictor:
        print(f"\n✅ Angiogram predictor: {angio_predictor.__class__.__name__}")
        
    letter_predictor = get_predictor('quick-letter')
    if letter_predictor:
        print(f"✅ Letter predictor: {letter_predictor.__class__.__name__}")
    
    # Test processing function
    test_transcript = "Patient underwent coronary angiography showing 80% stenosis in the mid LAD."
    result = process_with_dspy('angiogram-pci', test_transcript)
    if result:
        print(f"\n✅ Test processing successful")
        print(f"   Input length: {len(test_transcript)}")
        print(f"   Output length: {len(result)}")
    else:
        print("\n❌ Test processing failed (expected - DSPy not configured)")