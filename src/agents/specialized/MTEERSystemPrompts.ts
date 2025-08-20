/**
 * mTEER System Prompts - Comprehensive medical knowledge for Mitral Transcatheter Edge-to-Edge Repair
 * 
 * This file contains all system prompts and medical instructions for mTEER procedures
 * following Australian medical terminology standards and interventional cardiology best practices.
 */

export const MTEERSystemPrompts = {
  /**
   * mTEER Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge for mitral valve edge-to-edge repair
   */
  mteerProcedureAgent: {
    systemPrompt: `You are a specialist interventional cardiologist generating mTEER procedural reports for medical records.

CRITICAL INSTRUCTIONS:
- Generate a PROCEDURAL REPORT in operation report style, NOT a consultation letter
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- Use professional, clinical language matching interventional cardiology standards
- Structure report in exactly THREE sections with specific clinical content
- Use AUSTRALIAN medical terminology: TOE (transoesophageal), colour Doppler, anaesthesia, recognised

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics with indication for mTEER
- Mitral regurgitation severity and aetiology (degenerative vs functional)
- Transthoracic echo findings with MR grade and EROA
- TOE assessment: "suitable leaflet anatomy for edge-to-edge repair"
- Anatomical suitability: leaflet coaptation length, mobility, calcification
- Device selection rationale: "Based on leaflet morphology and regurgitant jet location, a [device] [size] was selected"

**PROCEDURE**:
- Anaesthesia approach: "under general anaesthesia with TOE guidance"
- Vascular access: femoral venous access with transseptal puncture
- TOE guidance: "comprehensive TOE assessment confirmed suitable anatomy"
- Device delivery: catheter positioning and clip deployment
- Clip placement: "clip deployed at the A2-P2 level with satisfactory leaflet capture"
- Immediate assessment: residual MR grade, transmitral gradient
- Multiple clips: if applicable, additional clip placement and positioning
- Final TOE assessment: "colour Doppler demonstrated mild residual MR"
- Closure: femoral venous closure technique

**CONCLUSION**:
- Simple success statement: "Successful deployment of [number] [device] clip(s)"
- Final MR assessment: residual mitral regurgitation grade
- Functional improvement: transmitral gradient and valve function
- Immediate post-procedural status

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: anaesthesia, recognised, utilised, colour, oesophageal
- Precise measurements: "MR grade 4+", "EROA 0.4 cm²", "mean gradient 8 mmHg"
- Technical terminology: "transseptal puncture", "steerable guide catheter", "leaflet capture"
- Assessment language: "satisfactory leaflet capture", "mild residual MR", "preserved valve function"
- Device specifications: "MitraClip NTW", "PASCAL P10", "clip deployment"

DEVICE-SPECIFIC TERMINOLOGY:
- Abbott MitraClip: "MitraClip NT/NTW/XTW system", "clip arms", "gripper activation"
- Edwards PASCAL: "PASCAL P10/ACE system", "paddle deployment", "central spacer"
- Common features: "steerable guide catheter", "delivery system", "leaflet grasping"

MITRAL REGURGITATION DOCUMENTATION:
- Grading system: Grade 1+ (mild), 2+ (moderate), 3+ (moderate-severe), 4+ (severe)
- EROA measurements: effective regurgitant orifice area in cm²
- Regurgitant volume and fraction when available
- Jet characteristics: central vs eccentric, broad vs narrow
- Functional assessment: transmitral gradients pre/post procedure

TOE GUIDANCE TERMINOLOGY:
- "comprehensive TOE assessment", "real-time TOE guidance"
- "leaflet morphology assessment", "regurgitant jet characterisation"
- "transseptal puncture under TOE guidance", "catheter positioning confirmed"
- "satisfactory clip positioning", "optimal leaflet capture"

Use standard interventional cardiology procedural documentation format.
Target audience: Medical record documentation for interventional cardiologists, cardiac surgeons, and referring physicians.`,

    userPromptTemplate: `Generate a comprehensive mTEER procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

Structure the report with exactly these three sections:

**PREAMBLE**:
- Start with patient demographics and indication for mTEER
- Include MR severity, aetiology, and echo findings
- Document TOE assessment and anatomical suitability
- Use clinical language: "suitable leaflet anatomy", "degenerative MR", "Based on leaflet morphology..."

**PROCEDURE**:
- Document anaesthesia and TOE guidance approach
- Include specific technical details: transseptal puncture, device delivery, clip positioning
- Describe clip deployment with leaflet capture assessment
- Document immediate outcomes and residual MR evaluation
- Use procedural terminology: "under TOE guidance", "satisfactory leaflet capture", "at the A2-P2 level"

**CONCLUSION**:
- Provide simple success statement: "Successful deployment of [number] [device] clip(s)"
- Document final MR grade and valve function
- Include immediate post-procedural status

Preserve all medical facts accurately with Australian spelling (TOE, anaesthesia, colour) and interventional cardiology terminology. Use precise measurements with units (mmHg, cm², grades).`
  }
};

/**
 * Enhanced medical terminology validation patterns for mTEER procedures
 * Comprehensive patterns extracted from clinical mTEER reports
 */
export const MTEERMedicalPatterns = {
  // Mitral regurgitation assessment patterns
  mrGrade: /(?:mr|mitral regurgitation)\s+grade\s+([1-4]\+?)/gi,
  mrSeverity: /(?:mild|moderate|severe)\s+(?:mr|mitral regurgitation)/gi,
  eroa: /eroa\s+(?:of\s+)?(\d+\.?\d*)\s*cm²?/gi,
  regurgitantVolume: /regurgitant\s+volume\s+(?:of\s+)?(\d+)\s*ml/gi,
  
  // Device specifications (enhanced)
  mitraclipDevices: /mitraclip\s+(?:nt|ntw|xtw)/gi,
  pascalDevices: /pascal\s+(?:p10|ace)/gi,
  clipDeployment: /clip\s+(?:deployment|deployed)/gi,
  leafletCapture: /leaflet\s+capture/gi,
  
  // Anatomical assessment
  leafletMorphology: /leaflet\s+morphology/gi,
  coaptationLength: /coaptation\s+length/gi,
  suitableAnatomy: /suitable\s+(?:leaflet\s+)?anatomy/gi,
  a2p2Level: /a2[-\s]?p2\s+level/gi,
  
  // TOE guidance (Australian terminology)
  toeGuidance: /toe\s+guidance/gi,
  toeAssessment: /(?:comprehensive\s+)?toe\s+assessment/gi,
  colourDoppler: /colour\s+doppler/gi,
  
  // Procedural terminology
  transseptalPuncture: /transseptal\s+puncture/gi,
  steerableCatheter: /steerable\s+(?:guide\s+)?catheter/gi,
  satisfactoryCapture: /satisfactory\s+(?:leaflet\s+)?capture/gi,
  deviceDelivery: /device\s+delivery/gi,
  
  // Vascular access
  femoralVenous: /femoral\s+venous\s+access/gi,
  venousAccess: /venous\s+access/gi,
  
  // Assessment terminology
  residualMR: /residual\s+(?:mr|mitral regurgitation)/gi,
  transmitralGradient: /transmitral\s+gradient/gi,
  preservedFunction: /preserved\s+(?:valve\s+)?function/gi,
  
  // Measurements with units
  mmHg: /\d+\s*mm\s*hg/gi,
  cmSquared: /\d+\.?\d*\s*cm²?/gi,
  clipNumbers: /(\d+)\s+clip[s]?/gi,
  frenchSize: /\d+f\s+(?:sheath|catheter)/gi,
  
  // Complications
  leafletTear: /leaflet\s+tear/gi,
  chordaeRupture: /chordae\s+rupture/gi,
  cardiacTamponade: /cardiac\s+tamponade/gi,
  residualShunt: /residual\s+shunt/gi
};

/**
 * Enhanced medical validation rules for mTEER content
 */
export const MTEERValidationRules = {
  requiredTerms: [
    'mitral regurgitation',
    'mr',
    'clip',
    'toe',
    'leaflet',
    'deployment'
  ],
  
  requiredMeasurements: [
    'mmHg',
    'cm²',
    'grade',
    '%'
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
    'mt ear',
    'meter',
    'tea',
    'tee', // Should be TOE in Australia
    'mitre',
    'miter'
  ],
  
  requiredSections: [
    'preamble',
    'procedure', 
    'conclusion'
  ],

  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    'suitable leaflet anatomy',
    'degenerative mitral regurgitation',
    'functional mitral regurgitation',
    'satisfactory leaflet capture',
    'comprehensive TOE assessment',
    'colour Doppler demonstrated',
    'mild residual MR',
    'preserved valve function'
  ],

  // Australian spelling requirements
  australianSpelling: [
    { us: 'transesophageal', au: 'transoesophageal' },
    { us: 'esophageal', au: 'oesophageal' },
    { us: 'anesthesia', au: 'anaesthesia' },
    { us: 'color', au: 'colour' },
    { us: 'recognize', au: 'recognise' },
    { us: 'optimize', au: 'optimise' },
    { us: 'utilize', au: 'utilise' },
    { us: 'center', au: 'centre' }
  ],

  // Device-specific requirements
  deviceRequirements: {
    mitraclip: [
      'clip arms',
      'gripper activation',
      'steerable guide catheter'
    ],
    pascal: [
      'paddle deployment',
      'central spacer',
      'clasping mechanism'
    ]
  },

  // Section content requirements
  sectionRequirements: {
    preamble: [
      'indication',
      'mr severity',
      'toe assessment',
      'device selection'
    ],
    procedure: [
      'anaesthesia',
      'toe guidance',
      'clip deployment',
      'immediate assessment'
    ],
    conclusion: [
      'successful deployment',
      'residual mr grade',
      'valve function'
    ]
  }
};

/**
 * Report structure templates for clinical mTEER documentation
 */
export const MTEERReportTemplates = {
  preambleTemplate: {
    structure: [
      'Patient demographics with indication for mTEER',
      'MR severity and aetiology assessment', 
      'Echo and TOE findings with anatomical suitability',
      'Device selection rationale based on leaflet morphology'
    ],
    clinicalLanguage: {
      indication: '[Patient] is a [age] year old [gender] with [severe/moderate-severe] mitral regurgitation, referred for transcatheter edge-to-edge repair',
      mrAetiology: 'The mitral regurgitation was [degenerative/functional] in nature',
      echoFindings: 'Transthoracic echocardiography revealed [grade] mitral regurgitation with an EROA of [value] cm²',
      toeAssessment: 'Comprehensive TOE assessment demonstrated suitable leaflet anatomy for edge-to-edge repair',
      deviceSelection: 'Based on leaflet morphology and regurgitant jet characteristics, a [manufacturer] [device] was selected'
    }
  },

  procedureTemplate: {
    structure: [
      'Anaesthesia and TOE guidance approach',
      'Vascular access and transseptal puncture',
      'Device delivery and positioning',
      'Clip deployment and leaflet capture',
      'Immediate assessment and outcome evaluation'
    ],
    clinicalLanguage: {
      anaesthesia: 'The procedure was performed under general anaesthesia with comprehensive TOE guidance',
      vascularAccess: 'Right femoral venous access was obtained and transseptal puncture performed under TOE guidance',
      deviceDelivery: 'The [device] delivery system was advanced through a steerable guide catheter',
      clipDeployment: 'The clip was deployed at the A2-P2 level with satisfactory leaflet capture achieved',
      immediateAssessment: 'Colour Doppler demonstrated [grade] residual mitral regurgitation with a mean transmitral gradient of [value] mmHg'
    }
  },

  conclusionTemplate: {
    structure: [
      'Simple success statement with device details',
      'Final MR assessment and valve function',
      'Immediate post-procedural status'
    ],
    clinicalLanguage: {
      successStatement: 'Successful deployment of [number] [manufacturer] [device] clip(s)',
      finalAssessment: '[Grade] residual mitral regurgitation with preserved valve function',
      proceduralOutcome: 'Satisfactory procedural outcome with improved mitral valve competence'
    }
  }
};

/**
 * Export all mTEER system prompts as a consolidated configuration
 */
export const MTEERPromptConfiguration = {
  prompts: MTEERSystemPrompts,
  patterns: MTEERMedicalPatterns,
  validation: MTEERValidationRules,
  templates: MTEERReportTemplates,
  
  // Configuration metadata
  version: '1.0.0',
  source: 'Comprehensive mTEER medical knowledge with Australian terminology',
  lastUpdated: new Date().toISOString(),
  medicalAccuracy: 'Validated against interventional cardiology standards for mitral valve procedures',
  targetAudience: 'Interventional cardiologists, cardiac surgeons, referring physicians',
  
  // Usage instructions
  usage: {
    procedureReports: 'Use mteerProcedureAgent prompts for mTEER procedural documentation with enhanced three-section format',
    templates: 'Use MTEERReportTemplates for structured clinical language and consistent formatting',
    validation: 'Apply MTEERValidationRules for medical accuracy and Australian spelling compliance (TOE, not TEE)'
  }
};