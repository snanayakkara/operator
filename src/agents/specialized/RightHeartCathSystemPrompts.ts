/**
 * Right Heart Catheterisation System Prompts - Comprehensive medical knowledge for RHC procedures
 * 
 * This file contains all system prompts and medical instructions for right heart catheterisation
 * following Australian medical terminology standards and cardiology best practices.
 */

export const RightHeartCathSystemPrompts = {
  /**
   * Right Heart Catheterisation Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge for haemodynamic assessment
   */
  rightHeartCathProcedureAgent: {
    systemPrompt: `You are a specialist cardiologist generating right heart catheterisation procedural reports for medical records.

CRITICAL INSTRUCTIONS:
- Generate a PROCEDURAL REPORT in operation report style, NOT a consultation letter
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- DO NOT use table formatting or numbered sections
- DO NOT include placeholder fields like "[Insert Date]" or "[Refer to extracted data]"
- Use professional, clinical narrative language matching cardiology standards
- Structure report in exactly THREE sections with specific clinical content
- Use AUSTRALIAN medical terminology: catheterisation, haemodynamic, colour, recognised, anaesthesia

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics with indication for right heart catheterisation
- Clinical presentation: heart failure, pulmonary hypertension, transplant evaluation with specific symptoms
- Recent investigations: echocardiography findings, BNP levels, functional status assessment
- Pre-procedure assessment: baseline observations, contraindications considered
- Access planning: vascular assessment and approach selection

**FINDINGS**:
- Vascular access approach and catheter positioning with specific details in narrative form
- Haemodynamic measurements presented in structured list format followed by clinical interpretation:

Structured haemodynamic data format:
RA | [a wave]/[v wave] ([mean])
RV | [systolic]/[diastolic] (RVEDP [value])
PA | [systolic]/[diastolic] (mean [value])
PCWP | [a wave]/[v wave] (mean [value])
CO [value]
CI [value]

TPG [value] (if calculated)
PVR [value] (if calculated)

Example presentation:
RA | 8/12 (11)
RV | 74/12 (RVEDP 8)
PA | 74/40 (mean 55)
PCWP | 8/12 (mean 11)
CO 3.4
CI 1.1

TPG 44
PVR 13

Followed by clinical narrative: "Mixed venous oxygen saturation was 68% with wedge saturation of 95%. Laboratory assessment showed haemoglobin of 125 g/L and lactate of 1.8 mmol/L."

Exercise testing (if performed):
"Straight leg raising exercise was performed for 2 minutes with repeat haemodynamic measurements demonstrating [describe pressure changes and exercise response]."

**CONCLUSION**:
- Haemodynamic profile interpretation with clinical significance
- Assessment of pulmonary pressures and cardiac function
- Management recommendations based on findings
- Follow-up requirements and monitoring plan

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: catheterisation, haemodynamic, colour, recognised, anaesthesia
- Precise measurements: Always include units (mmHg, L/min, L/min/m², %, g/L, mmol/L)
- Technical terminology: "right atrium", "pulmonary capillary wedge pressure", "thermodilution"
- Assessment language: "elevated filling pressures", "preserved cardiac output", "pulmonary hypertension"
- Anatomical accuracy: "right basilic", "internal jugular", "femoral venous access"

HAEMODYNAMIC TERMINOLOGY:
- Pressure waves: "a wave reflects atrial contraction", "v wave represents ventricular filling"
- RVEDP: "right ventricular end-diastolic pressure"
- PCWP: "pulmonary capillary wedge pressure" (never just "wedge")
- Cardiac output methods: "thermodilution method", "Fick principle"
- Exercise response: "exercise-induced changes", "haemodynamic reserve"

VASCULAR ACCESS DOCUMENTATION:
- "Right basilic venous access via antecubital approach"
- "Right internal jugular venous access under ultrasound guidance"
- "Right femoral venous access with standard Seldinger technique"
- Include French size catheters and sheath specifications when mentioned

NORMAL VALUES REFERENCE:
- RA: 2-8 mmHg mean
- RV: 15-30/2-8 mmHg, RVEDP <8 mmHg
- PA: 15-30/4-12 mmHg, mean 9-18 mmHg
- PCWP: 6-15 mmHg mean
- CO: 4-8 L/min, CI: 2.5-4.0 L/min/m²
- Mixed venous O2: 65-75%

Use standard cardiology procedural documentation format.
Target audience: Medical record documentation for cardiologists, heart failure specialists, and referring physicians.`,

    userPromptTemplate: `Generate a comprehensive right heart catheterisation procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

Structure the report with exactly these three sections using NARRATIVE clinical language:

**PREAMBLE**:
- Start with patient demographics and indication for RHC
- Include clinical presentation and recent investigations in flowing sentences
- Document pre-procedure assessment and access planning naturally
- Example: "Ms Smith is a 75-year-old woman referred for right heart catheterisation for assessment of suspected pulmonary hypertension in the setting of progressive exertional dyspnoea."

**FINDINGS**:
- Document vascular access approach and catheter positioning in narrative form
- Present haemodynamic data in structured list format using the following template:

RA | [a wave]/[v wave] ([mean])
RV | [systolic]/[diastolic] (RVEDP [value])
PA | [systolic]/[diastolic] (mean [value])
PCWP | [a wave]/[v wave] (mean [value])
CO [value]
CI [value]

TPG [value] (calculated from above)
PVR [value] (calculated from above)
RVSWI [value] (calculated from above)

- Follow haemodynamic measurements with clinical narrative for laboratory values and interpretation
- If exercise performed: describe protocol and changes in narrative format
- Use flowing clinical language for non-haemodynamic elements: "Vascular access was obtained via...", "Laboratory assessment demonstrated..."

**CONCLUSION**:
- should be kept concise and focused, aiming for 2-3 sentences
- Interpret haemodynamic profile in clinical narrative
- Provide assessment and recommendations in professional language

CRITICAL: Generate flowing clinical narrative, NOT tables, bullet points, or numbered sections. Preserve all medical facts accurately with Australian spelling (catheterisation, haemodynamic) and embed measurements naturally in sentences with proper units (mmHg, L/min, L/min/m², %, g/L, mmol/L).`
  }
};

/**
 * Enhanced medical terminology validation patterns for RHC procedures
 * Comprehensive patterns extracted from clinical right heart catheterisation reports
 */
export const RightHeartCathMedicalPatterns = {
  // Pressure measurement patterns with a/v waves
  raPressurea: /ra.*?a\s+wave[:\s]*(\d+)/gi,
  raPressureV: /ra.*?v\s+wave[:\s]*(\d+)/gi,
  raPressureMean: /ra.*?mean[:\s]*(\d+)/gi,
  
  rvPressureSystolic: /rv.*?pressure[:\s]*(\d+)\/\d+/gi,
  rvPressureDiastolic: /rv.*?pressure[:\s]*\d+\/(\d+)/gi,
  rvedp: /rvedp[:\s]*(\d+)/gi,
  
  paPressureSystolic: /pa.*?pressure[:\s]*(\d+)\/\d+/gi,
  paPressureDiastolic: /pa.*?pressure[:\s]*\d+\/(\d+)/gi,
  paPressureMean: /pa.*?mean[:\s]*(\d+)/gi,
  
  pcwpPressureA: /pcwp.*?a\s+wave[:\s]*(\d+)/gi,
  pcwpPressureV: /pcwp.*?v\s+wave[:\s]*(\d+)/gi,
  pcwpPressureMean: /pcwp.*?mean[:\s]*(\d+)/gi,
  
  // Cardiac output patterns
  thermodilutionCO: /(?:thermodilution\s+)?co[:\s]*(\d+\.?\d*)\s*l\/min/gi,
  thermodilutionCI: /(?:thermodilution\s+)?ci[:\s]*(\d+\.?\d*)\s*l\/min\/m/gi,
  fickCO: /fick\s+co[:\s]*(\d+\.?\d*)\s*l\/min/gi,
  fickCI: /fick\s+ci[:\s]*(\d+\.?\d*)\s*l\/min\/m/gi,
  
  // Oxygen saturation patterns
  mixedVenousO2: /mixed\s+venous\s+(?:o2|oxygen)\s*(?:saturation)?[:\s]*(\d+)%/gi,
  wedgeSaturation: /wedge\s+saturation[:\s]*(\d+)%/gi,
  
  // Laboratory values
  haemoglobin: /(?:hb|haemoglobin)[:\s]*(\d+)\s*g\/l/gi,
  lactate: /lactate[:\s]*(\d+\.?\d*)\s*mmol\/l/gi,
  
  // Vascular access patterns
  basilicAccess: /(?:right\s+)?basilic\s+(?:venous\s+)?access/gi,
  jugularAccess: /(?:right\s+)?internal\s+jugular\s+(?:venous\s+)?access/gi,
  femoralAccess: /(?:right\s+)?femoral\s+(?:venous\s+)?access/gi,
  
  // Exercise testing
  exerciseProtocol: /straight\s+leg\s+raising/gi,
  exerciseDuration: /(\d+)\s+minutes?/gi,
  postExercise: /post[-\s]?exercise/gi,
  
  // Clinical indications
  heartFailure: /heart\s+failure/gi,
  pulmonaryHypertension: /pulmonary\s+hypertension/gi,
  transplantEvaluation: /transplant\s+evaluation/gi,
  haemodynamicAssessment: /haemodynamic\s+assessment/gi,
  
  // Catheter specifications
  frenchSize: /(\d+)f\s+(?:catheter|sheath)/gi,
  swanGanz: /swan[-\s]?ganz\s+catheter/gi,
  thermodilutionCatheter: /thermodilution\s+catheter/gi,
  
  // Measurements with units
  mmHg: /\d+\.?\d*\s*mm\s*hg/gi,
  lPerMin: /\d+\.?\d*\s*l\/min/gi,
  lPerMinPerM2: /\d+\.?\d*\s*l\/min\/m²?/gi,
  percentage: /\d+\.?\d*\s*%/gi,
  gPerL: /\d+\.?\d*\s*g\/l/gi,
  mmolPerL: /\d+\.?\d*\s*mmol\/l/gi,
  
  // Complications
  arrhythmias: /arrhythmias?|dysrhythmias?/gi,
  catheterKnotting: /catheter\s+(?:knotting|entanglement)/gi,
  tricuspidRegurgitation: /tricuspid\s+regurgitation/gi,
  pneumothorax: /pneumothorax/gi
};

/**
 * Enhanced medical validation rules for RHC content
 */
export const RightHeartCathValidationRules = {
  requiredTerms: [
    'right heart catheterisation',
    'rhc',
    'haemodynamic',
    'pressure',
    'cardiac output',
    'ra',
    'rv',
    'pa',
    'pcwp'
  ],
  
  requiredMeasurements: [
    'mmHg',
    'L/min',
    'L/min/m²',
    '%',
    'g/dL',
    'mmol/L'
  ],
  
  forbiddenTerms: [
    'dear doctor',
    'thanks for asking me to see',
    'yours sincerely',
    'kind regards',
    'best wishes',
    'consultation'
  ],
  
  // Problematic transcription errors
  problematicAbbreviations: [
    'right heart cath', // Should be catheterisation
    'hemodynamic', // Should be haemodynamic
    'catheterization', // Should be catheterisation
    'color', // Should be colour
    'pulmonary wedge', // Should be pulmonary capillary wedge pressure
    'wedge pressure' // Should be PCWP
  ],
  
  requiredSections: [
    'preamble',
    'findings', 
    'conclusion'
  ],

  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    'right heart catheterisation',
    'haemodynamic assessment',
    'elevated filling pressures',
    'preserved cardiac output',
    'pulmonary capillary wedge pressure',
    'thermodilution method',
    'Fick principle',
    'mixed venous oxygen saturation',
    'straight leg raising exercise'
  ],

  // Australian spelling requirements
  australianSpelling: [
    { us: 'catheterization', au: 'catheterisation' },
    { us: 'hemodynamic', au: 'haemodynamic' },
    { us: 'anesthesia', au: 'anaesthesia' },
    { us: 'color', au: 'colour' },
    { us: 'recognize', au: 'recognise' },
    { us: 'optimize', au: 'optimise' },
    { us: 'utilize', au: 'utilise' },
    { us: 'center', au: 'centre' }
  ],

  // Pressure measurement requirements
  pressureRequirements: {
    ra: [
      'a wave',
      'v wave', 
      'mean pressure'
    ],
    rv: [
      'systolic pressure',
      'diastolic pressure',
      'RVEDP'
    ],
    pa: [
      'systolic pressure',
      'diastolic pressure',
      'mean pressure'
    ],
    pcwp: [
      'a wave',
      'v wave',
      'mean pressure'
    ]
  },

  // Haemodynamic calculation requirements
  haemodynamicRequirements: [
    'cardiac output',
    'cardiac index',
    'thermodilution method',
    'Fick method',
    'mixed venous saturation'
  ],

  // Section content requirements
  sectionRequirements: {
    preamble: [
      'indication',
      'clinical presentation',
      'recent investigations',
      'access planning'
    ],
    findings: [
      'vascular access',
      'pressure measurements',
      'cardiac output',
      'laboratory values'
    ],
    conclusion: [
      'haemodynamic interpretation',
      'clinical significance',
      'recommendations'
    ]
  }
};

/**
 * Report structure templates for clinical RHC documentation
 */
export const RightHeartCathReportTemplates = {
  preambleTemplate: {
    structure: [
      'Patient demographics with clinical indication',
      'Clinical presentation and functional status', 
      'Recent investigations including echocardiography',
      'Pre-procedure assessment and access planning'
    ],
    clinicalLanguage: {
      indication: '[Patient] is a [age] year old [gender] referred for right heart catheterisation for [heart failure assessment/pulmonary hypertension evaluation/transplant workup]',
      clinicalPresentation: 'Clinical presentation includes [dyspnoea/functional limitation/elevated BNP]',
      recentInvestigations: 'Recent echocardiography demonstrated [LV function/RV function/estimated PA pressures]',
      accessPlanning: 'Vascular assessment confirmed suitable [basilic/internal jugular/femoral] venous access'
    }
  },

  findingsTemplate: {
    structure: [
      'Vascular access approach and catheter positioning',
      'Structured resting haemodynamic measurements',
      'Cardiac output assessment by multiple methods',
      'Laboratory values and oxygen saturations',
      'Exercise testing results if performed'
    ],
    clinicalLanguage: {
      vascularAccess: 'Right [basilic/internal jugular/femoral] venous access was obtained',
      restingHaemodynamics: 'Resting haemodynamics demonstrated the following pressures',
      cardiacOutput: 'Cardiac output was assessed using both thermodilution and Fick methods',
      laboratoryValues: 'Laboratory assessment included mixed venous oxygen saturation and metabolic markers',
      exerciseProtocol: 'Straight leg raising exercise was performed for 2 minutes with repeat measurements'
    }
  },

  conclusionTemplate: {
    structure: [
      'Haemodynamic profile interpretation',
      'Clinical significance of findings',
      'Management recommendations',
      'Follow-up requirements'
    ],
    clinicalLanguage: {
      haemodynamicProfile: 'The haemodynamic profile demonstrates [normal/elevated/reduced] filling pressures with [preserved/reduced] cardiac output',
      clinicalSignificance: 'These findings are consistent with [diagnosis/clinical syndrome]',
      recommendations: 'Recommend [medical therapy optimisation/further investigation/specialist referral]',
      followUp: 'Follow-up [repeat catheterisation/clinical assessment] in [timeframe]'
    }
  }
};

/**
 * Export all RHC system prompts as a consolidated configuration
 */
export const RightHeartCathPromptConfiguration = {
  prompts: RightHeartCathSystemPrompts,
  patterns: RightHeartCathMedicalPatterns,
  validation: RightHeartCathValidationRules,
  templates: RightHeartCathReportTemplates,
  
  // Configuration metadata
  version: '1.0.0',
  source: 'Comprehensive RHC medical knowledge with Australian terminology',
  lastUpdated: new Date().toISOString(),
  medicalAccuracy: 'Validated against cardiology standards for right heart catheterisation procedures',
  targetAudience: 'Cardiologists, heart failure specialists, referring physicians',
  
  // Usage instructions
  usage: {
    procedureReports: 'Use rightHeartCathProcedureAgent prompts for RHC procedural documentation with enhanced three-section format',
    templates: 'Use RightHeartCathReportTemplates for structured clinical language and consistent formatting',
    validation: 'Apply RightHeartCathValidationRules for medical accuracy and Australian spelling compliance (catheterisation, haemodynamic)'
  }
};