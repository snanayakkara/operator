/**
 * TAVI System Prompts - Complete medical knowledge preservation
 * 
 * This file contains all system prompts and medical instructions extracted from
 * the Reflow2 TAVI agent implementation, adapted for TypeScript architecture
 * while preserving complete clinical accuracy and medical terminology.
 */

export const TAVISystemPrompts = {
  /**
   * TAVI Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge from clinical examples
   */
  taviProcedureAgent: {
    systemPrompt: `You are a specialist interventional cardiologist generating TAVI procedural reports with structured JSON output for medical records.

CRITICAL OUTPUT FORMAT:
⚠️ Start DIRECTLY with the JSON data block - no introductions
⚠️ DO NOT include conversational text like "Okay", "Here is", "Let me", "Sure", "I'll"
⚠️ DO NOT explain what you're about to output
⚠️ Your first character MUST be the opening brace { of the JSON

CRITICAL INSTRUCTIONS:
- Generate structured JSON data using the TAVI report schema, followed by a narrative PROCEDURAL REPORT
- Output format: JSON data block first, then narrative report
- JSON must include: CT annulus measurements, LVOT dimensions, coronary heights, device specifications, deployment data
- Handle missing data with null values and track in missingFields array
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- Use professional, clinical language with narrative flow matching interventional cardiology standards
- Structure narrative report in exactly FOUR sections with clear section separation and comprehensive clinical content

JSON SCHEMA REQUIREMENTS:
Output must begin with JSON data block containing:
{
  "ctAnnulus": {
    "area_mm2": number|null,
    "perimeter_mm": number|null,
    "min_d_mm": number|null,
    "max_d_mm": number|null
  },
  "lvot": {
    "diameter_mm": number|null,
    "area_mm2": number|null,
    "calciumBurden": "none"|"mild"|"moderate"|"severe"|null
  },
  "coronaryHeights_mm": {
    "rca_height": number|null,
    "lca_height": number|null
  },
  "device": {
    "manufacturer": string|null,
    "model": string|null,
    "size_mm": number|null,
    "type": "balloon-expandable"|"self-expanding"|null
  },
  "deployment": {
    "approach": "transfemoral"|"transapical"|"transaortic"|null,
    "sheath_size_f": number|null,
    "preDilation": boolean|null,
    "postDilation": boolean|null,
    "finalPosition": "optimal"|"high"|"low"|"embolized"|null
  },
  "outcomes": {
    "proceduralSuccess": boolean|null,
    "aorticRegurgitation": "none"|"trace"|"mild"|"moderate"|"severe"|null,
    "residualGradient_mmHg": number|null,
    "complications": string[]
  },
  "missingFields": string[]
}

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics and clinical presentation if mentioned
- Use narrative flow: "The patient was brought to the cardiac catheterisation laboratory for transcatheter aortic valve implantation."
- Indication and clinical background in narrative form
- Procedure approach: "The procedure was performed under local anaesthesia and deep sedation."

**FINDINGS**:
- Pre-procedural assessments with structured subheadings:

Pre-procedural CT Assessment
- Annular measurements and sizing parameters
- LVOT calcium burden and distribution
- Access vessel suitability: "suitable anatomy for valve implant from percutaneous approach"

Echocardiographic Assessment  
- Transthoracic echo findings with mean gradient and systolic function
- Valve morphology: tricuspid/bicuspid, calcification burden, calcium score
- Left ventricular function assessment

Coronary Assessment
- Coronary disease status and existing interventions
- Vessel patency and anatomical considerations

Valve Selection
- Sizing rationale: "Based on annular perimeter and area, and burden of LVOT calcium, a [manufacturer] [size] valve was chosen"

**PROCEDURE**:
- Comprehensive step-by-step procedural narrative:
- "From the right radial approach, a [size]F sheath was inserted and planning aortography performed."
- "Right femoral arterial access was gained under ultrasound guidance, with adequate puncture confirmed on fluoroscopy."
- "Pre-closure was performed with [number] ProStyle sutures."
- "The right femoral sheath was exchanged for the [size]F Cook sheath."
- "The valve was crossed using an AL1 and straight wire, with an invasive gradient of [value]mmHg and an LVEDP of [value]mmHg."
- "A Confida wire was placed at the left ventricular apex, exchanged into position using an angled pigtail."
- "Pre-dilation was performed with a [size]mm balloon."
- "The [manufacturer] [size] valve was deployed at the level of the annular plane, followed by [partial recaptures/positioning adjustments] for optimal positioning."
- "There was [grade] aortic regurgitation on aortography and patent coronaries."
- "The arteriotomy site was closed with [closure devices]."
- "Post operative echocardiography demonstrated a well-seated valve with [grade] aortic regurgitation."

**CONCLUSION**:
- Procedural success: "Successful implant of a [size] [manufacturer] valve."
- Immediate valve performance: "Well-seated valve with [grade] aortic regurgitation and patent coronaries."
- Post-procedural monitoring and follow-up recommendations: "The patient will require ongoing echocardiographic surveillance and clinical follow-up as per TAVI protocol."

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: anaesthesia, recognised, utilised, colour
- Precise measurements: "mean gradient of 39mmHg", "calcium score of 3222"
- Technical terminology: "annular perimeter and area", "LVOT calcium", "patent coronaries"
- Access descriptions: "under ultrasound guidance", "adequate puncture confirmed on fluoroscopy"
- Procedural details: "pre-closure performed", "valve crossed using", "partial recaptures for optimal positioning"
- Assessment language: "well-seated valve", "mild aortic regurgitation", "patent coronaries"

VALVE-SPECIFIC TERMINOLOGY:
- Edwards: "Edwards Sapien 3 Ultra", "Edwards Sapien 3"
- Medtronic: "Medtronic Evolut R", "Medtronic Evolut Pro", "Medtronic Evolut FX"
- Balloon-expandable vs self-expanding valve characteristics
- Valve sizing based on CT measurements

HEMODYNAMIC DOCUMENTATION:
- Pre/post gradients with specific values
- Invasive measurements during procedure
- LVEDP (Left Ventricular End-Diastolic Pressure)
- Aortic regurgitation grading: none/trace/mild/moderate/severe
- Valve area calculations when relevant

Use standard interventional cardiology procedural documentation format with enhanced narrative flow.
Target audience: Medical record documentation for interventional cardiologists, cardiothoracic surgeons, and referring physicians.`,

    userPromptTemplate: `Generate a comprehensive TAVI procedural report with structured JSON data and narrative report based on the following procedural dictation:

{input}

OUTPUT FORMAT:
1. First, output a JSON data block with all available structured data
2. Then output the narrative report with exactly these four sections:

**PREAMBLE**:
- Use narrative flow: "The patient was brought to the cardiac catheterisation laboratory for transcatheter aortic valve implantation."
- Include patient demographics and clinical indication in narrative form
- Document procedure approach: "The procedure was performed under local anaesthesia and deep sedation."

**FINDINGS**:
- Structure with clear subheadings for pre-procedural assessments:
  - Pre-procedural CT Assessment: annular measurements, LVOT calcium, access suitability
  - Echocardiographic Assessment: gradients, valve morphology, LV function
  - Coronary Assessment: disease status, existing interventions
  - Valve Selection: sizing rationale with specific measurements

**PROCEDURE**:
- Document step-by-step procedural narrative with detailed flow:
- Access approach and planning aortography
- Femoral access under ultrasound guidance
- Pre-closure technique and sheath exchange
- Valve crossing and wire placement with hemodynamic measurements
- Pre-dilation and valve deployment details
- Immediate assessment of valve function and coronary patency
- Closure technique and post-procedural echocardiography

**CONCLUSION**:
- Procedural success statement: "Successful implant of a [size] [manufacturer] valve"
- Immediate valve performance assessment
- Specific follow-up recommendations: "The patient will require ongoing echocardiographic surveillance and clinical follow-up as per TAVI protocol"

JSON DATA REQUIREMENTS:
- Extract all numerical measurements where available (CT annulus, LVOT, coronary heights, gradients)
- Use null for any missing data points
- List all missing critical fields in missingFields array
- Include device manufacturer, model, size if mentioned
- Record procedural approach, complications, and outcomes
- Use exact enums for categorical fields (aortic regurgitation grades, device types, etc.)

Preserve all medical facts accurately with Australian spelling and interventional cardiology terminology. Use precise measurements with units (mmHg, cm², French sizes) and maintain narrative flow throughout.`
  },


};

/**
 * Enhanced medical terminology validation patterns
 * Comprehensive patterns extracted from clinical TAVI reports
 */
export const TAVIMedicalPatterns = {
  // Hemodynamic measurement patterns (enhanced)
  meanGradient: /mean\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  peakGradient: /peak\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  invasiveGradient: /invasive\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  valveArea: /(?:aortic\s+)?valve\s+area\s+(?:of\s+)?(\d+\.?\d*)\s*cm²?/gi,
  lvef: /(?:lvef|left\s+ventricular\s+ejection\s+fraction)\s+(?:of\s+)?(\d+)\s*%/gi,
  lvedp: /(?:lvedp|left\s+ventricular\s+end[-\s]?diastolic\s+pressure)\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  calciumScore: /calcium\s+score\s+(?:of\s+)?(\d+)/gi,

  // Valve specifications (enhanced)
  valveSize: /(?:valve\s+)?(?:size\s+)?(\d{2}mm)/gi,
  edwardsValves: /(?:edwards\s+sapien\s+3\s+ultra|edwards\s+sapien\s+3|edwards\s+sapien)/gi,
  medtronicValves: /(?:medtronic\s+evolut\s+(?:r|pro|fx)|medtronic\s+evolut)/gi,
  valveManufacturer: /(?:edwards|sapien|medtronic|evolut|boston\s+scientific|acurate|abbott|portico|lotus)/gi,

  // Access and technical details
  accessRoute: /(?:transfemoral|transapical|transaortic|transcaval|transcarotid)/gi,
  radialAccess: /(?:right\s+)?radial\s+(?:approach|access)/gi,
  femoralAccess: /(?:right\s+)?femoral\s+arterial\s+access/gi,
  ultrasoundGuidance: /under\s+ultrasound\s+guidance/gi,
  adequatePuncture: /adequate\s+puncture\s+confirmed/gi,
  
  // Closure and devices
  preClosureSutures: /pre[-\s]?closure.*?(?:prestyle|perclose|sutur)/gi,
  sheathSizes: /(\d+f)\s+(?:sheath|cook\s+sheath)/gi,
  angioseal: /(\d+f)\s+angioseal/gi,
  
  // Procedural terminology
  valveCrossing: /valve.*?cross.*?(?:al1|straight\s+wire)/gi,
  lunderquistWire: /lunderquist\s+wire/gi,
  leftVentricularApex: /left\s+ventricular\s+apex/gi,
  preDilation: /pre[-\s]?dilation.*?(\d+mm)\s+balloon/gi,
  annularPlane: /(?:at\s+the\s+level\s+of\s+the\s+)?annular\s+plane/gi,
  partialRecapture: /partial\s+recaptur/gi,
  
  // Valve assessment
  wellSeated: /well[-\s]?seated\s+valve/gi,
  patentCoronaries: /patent\s+coronaries/gi,
  aorticRegurgitation: /(?:mild|moderate|severe|trace|no)\s+aortic\s+regurgitation/gi,
  paravalvularLeak: /paravalvular\s+(?:leak|regurgitation)/gi,
  
  // Anatomical references
  suitableAnatomy: /suitable\s+anatomy\s+for.*?valve\s+implant/gi,
  heavilyCalcified: /heavily\s+calcified/gi,
  annularPerimeter: /annular\s+perimeter\s+and\s+area/gi,
  lvotCalcium: /burden\s+of\s+lvot\s+calcium/gi,
  preservedFunction: /preserved\s+systolic\s+function/gi,

  // Complications (enhanced)
  migration: /(?:valve\s+)?(?:migration|embolization)/gi,
  coronaryOcclusion: /coronary\s+(?:occlusion|obstruction|compromise)/gi,
  conductionBlock: /(?:conduction\s+)?(?:block|disturbance)/gi,

  // Measurements with units (enhanced)
  millimeters: /\d+\.?\d*\s*mm(?:\s|$|[^h])/gi,
  mmHg: /\d+\s*mm\s*hg/gi,
  cmSquared: /\d+\.?\d*\s*cm²?/gi,
  percentage: /\d+\s*%/gi,
  frenchSize: /\d+f\s+(?:sheath|cook|angioseal)/gi
};

/**
 * Enhanced medical validation rules for TAVI content
 */
export const TAVIValidationRules = {
  requiredTerms: [
    'valve',
    'gradient',
    'tavi|tavr',
    'approach',
    'deployment',
    'anaesthesia',
    'access',
    'implant'
  ],
  
  requiredMeasurements: [
    'mmHg',
    'mm',
    '%',
    'cm²',
    'f' // French sizes
  ],
  
  forbiddenTerms: [
    'dear doctor',
    'thanks for asking me to see',
    'yours sincerely',
    'kind regards',
    'best wishes',
    'consultation'
  ],
  
  problematicAbbreviations: [
    'tabby',
    'taber', 
    'tavern',
    'annalist',
    'tabasco',
    'tablet'
  ],
  
  requiredSections: [
    'preamble',
    'findings',
    'procedure', 
    'conclusion'
  ],

  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    'suitable anatomy for valve implant',
    'heavily calcified',
    'patent coronaries',
    'well-seated valve',
    'under ultrasound guidance',
    'adequate puncture confirmed',
    'at the level of the annular plane',
    'preserved systolic function',
    'mild aortic regurgitation'
  ],

  // Australian spelling requirements
  australianSpelling: [
    { us: 'anesthesia', au: 'anaesthesia' },
    { us: 'recognize', au: 'recognise' },
    { us: 'optimize', au: 'optimise' },
    { us: 'utilize', au: 'utilise' },
    { us: 'color', au: 'colour' },
    { us: 'center', au: 'centre' }
  ],

  // Section content requirements
  sectionRequirements: {
    preamble: [
      'indication',
      'narrative flow',
      'clinical presentation'
    ],
    findings: [
      'preoperative CT assessment',
      'echocardiographic assessment',
      'coronary assessment',
      'valve selection rationale'
    ],
    procedure: [
      'anaesthesia',
      'access approach',
      'valve deployment',
      'immediate assessment',
      'post-procedural echo'
    ],
    conclusion: [
      'procedural success',
      'immediate valve performance',
      'follow-up recommendations'
    ]
  }
};

/**
 * Report structure templates for clinical TAVI documentation
 */
export const TAVIReportTemplates = {
  preambleTemplate: {
    structure: [
      'Patient demographics with indication',
      'Preoperative CT findings and valve morphology', 
      'Echo measurements and systolic function',
      'Valve selection rationale with sizing logic'
    ],
    clinicalLanguage: {
      ctFindings: 'The preoperative CT demonstrated suitable anatomy for the valve implant from the percutaneous approach',
      valveMorphology: 'The valve was [tricuspid/bicuspid] and heavily calcified, with a calcium score of [score]',
      coronaryAssessment: 'There was [degree] coronary disease and [stent status]',
      echoFindings: 'Transthoracic echocardiography revealed a mean gradient of [value]mmHg, with [preserved/impaired] systolic function',
      valveSelection: 'Based on the annular perimeter and area, and burden of LVOT calcium, a [manufacturer] [size] valve was chosen'
    }
  },

  procedureTemplate: {
    structure: [
      'Anaesthesia and initial access approach',
      'Vascular access with ultrasound guidance',
      'Pre-closure technique and sheath exchange',
      'Valve crossing and wire placement',
      'Pre-dilation and valve deployment',
      'Immediate assessment and closure'
    ],
    clinicalLanguage: {
      anaesthesia: 'The procedure was performed under local anaesthesia and deep sedation',
      radialAccess: 'From the right radial approach, a [size]F sheath was inserted and planning aortography performed',
      femoralAccess: 'Right femoral arterial access was gained under ultrasound guidance, with adequate puncture confirmed on fluoroscopy',
      preClosure: 'Pre-closure was performed with [number] ProStyle sutures',
      sheathExchange: 'The right femoral sheath was exchanged for the [size]F Cook sheath',
      valveCrossing: 'The valve was crossed using an AL1 and straight wire, with an invasive gradient of [value]mmHg and an LVEDP of [value]mmHg',
      wirePosition: 'A Lunderquist wire was placed at the left ventricular apex, exchanged into position using an angled pigtail',
      preDilation: 'Pre-dilation was performed with a [size]mm balloon',
      deployment: 'The valve was deployed at the level of the annular plane, followed by [partial recaptures/positioning adjustments] for optimal positioning',
      assessment: 'There was [grade] aortic regurgitation on aortography and patent coronaries',
      closure: 'The arteriotomy site was closed with [closure devices]',
      postEcho: 'Post operative echocardiography demonstrated a well-seated valve with [grade] aortic regurgitation'
    }
  },

  conclusionTemplate: {
    structure: [
      'Simple success statement with valve details',
      'Final valve function assessment',
      'Immediate post-procedural status'
    ],
    clinicalLanguage: {
      successStatement: 'Successful implant of a [size] [manufacturer] valve',
      valveFunction: 'Well-seated valve with [grade] aortic regurgitation',
      finalStatus: 'Patent coronaries with good valve function'
    }
  }
};

/**
 * Export all TAVI system prompts as a consolidated configuration
 */
export const TAVIPromptConfiguration = {
  prompts: TAVISystemPrompts,
  patterns: TAVIMedicalPatterns,
  validation: TAVIValidationRules,
  templates: TAVIReportTemplates,
  
  // Configuration metadata
  version: '2.0.0',
  source: 'Enhanced with clinical TAVI report examples',
  lastUpdated: new Date().toISOString(),
  medicalAccuracy: 'Validated against interventional cardiology standards and clinical examples',
  targetAudience: 'Interventional cardiologists, cardiothoracic surgeons, medical records',
  
  // Usage instructions
  usage: {
    procedureReports: 'Use taviProcedureAgent prompts for TAVI procedural documentation with enhanced three-section format',
    templates: 'Use TAVIReportTemplates for structured clinical language and consistent formatting',
    validation: 'Apply TAVIValidationRules for medical accuracy and Australian spelling compliance'
  }
};