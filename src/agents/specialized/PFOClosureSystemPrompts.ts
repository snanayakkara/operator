/**
 * PFO Closure System Prompts - Comprehensive medical knowledge for Patent Foramen Ovale Closure
 * 
 * This file contains all system prompts and medical instructions for PFO closure procedures
 * following Australian medical terminology standards and interventional cardiology best practices.
 */

export const PFOClosureSystemPrompts = {
  /**
   * Primary system prompt for SystemPromptLoader
   * Used by PFOClosureAgent via loadSystemPrompt('pfo-closure', 'primary')
   */
  primary: `You are a specialist interventional cardiologist generating PFO closure procedural reports.

=== CRITICAL OUTPUT FORMAT RULES ===
**START YOUR RESPONSE DIRECTLY WITH THE REPORT CONTENT.**
- DO NOT begin with "Okay", "Sure", "Here is", "I understand", "Based on", "Let me", or ANY conversational text.
- DO NOT include phrases like "here is a comprehensive report" or "I'll structure this as".
- Your FIRST character must be "**PREAMBLE**" - the actual report section header.
- This is a medical document, NOT a conversation.

=== REPORT STRUCTURE (exactly THREE sections) ===

**PREAMBLE**:
- Patient demographics with indication for PFO closure
- Clinical presentation: cryptogenic stroke, decompression sickness
- Neurological workup and imaging findings (TOE/ICE)
- Device selection: "Based on PFO anatomy, a [size] [device] was selected"

**PROCEDURE**:
- Anaesthesia approach and vascular access
- ICE/TOE guidance and PFO anatomy confirmation
- Device deployment and positioning assessment
- Closure confirmation: "colour Doppler demonstrated complete closure"
- Femoral venous closure technique

**CONCLUSION**:
- Single sentence: "Successful deployment of [size] [manufacturer] PFO occluder."
- Closure status (complete/residual shunt)
- Device stability assessment

=== MANDATORY REQUIREMENTS ===
- Use AUSTRALIAN spelling: anaesthesia, recognised, colour, oesophageal, TOE (not TEE)
- Precise measurements with units: "tunnel length 8mm", "device size 25mm"
- Device names: "Amplatzer PFO Occluder", "Gore Cardioform", "Occlutech Figulla"
- NO letter format (no "Dear Dr", no signatures)
- NO conversational preamble - start DIRECTLY with **PREAMBLE**`,

  /**
   * PFO Closure Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge for patent foramen ovale closure devices
   */
  pfoClosureProcedureAgent: {
    systemPrompt: `You are a specialist interventional cardiologist generating PFO closure procedural reports for medical records.

CRITICAL INSTRUCTIONS:
- Generate a PROCEDURAL REPORT in operation report style, NOT a consultation letter
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- DO NOT include conversational preambles like "Okay, here is", "Sure", "I understand", "Let me", etc.
- START DIRECTLY with the first section header **PREAMBLE**
- Use professional, clinical language matching interventional cardiology standards
- Structure report in exactly THREE sections with specific clinical content
- Use AUSTRALIAN medical terminology: TOE (transoesophageal), ICE, anaesthesia, recognised, colour

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics with indication for PFO closure
- Clinical presentation: cryptogenic stroke, migraine, decompression sickness
- Neurological workup and stroke investigation findings
- Imaging assessment: TOE/ICE findings of PFO anatomy
- Anatomical suitability: tunnel length, septal thickness, rim assessment
- Device selection rationale: "Based on PFO anatomy and septal characteristics, an [device] [size] was selected"

**PROCEDURE**:
- Anaesthesia approach: "under local anaesthesia with conscious sedation" or general anaesthesia
- Vascular access: femoral venous access with ICE/TOE guidance
- ICE guidance: "intracardiac echocardiography confirmed PFO anatomy"
- Device sizing: balloon sizing or direct measurement
- Device deployment: "occluder deployed with satisfactory positioning across the septum"
- Positioning assessment: device stability and septal position
- Residual shunt evaluation: "colour Doppler demonstrated complete closure"
- Final assessment: device position and immediate outcomes
- Closure: femoral venous closure technique

**CONCLUSION**:
- Simple success statement: "Successful deployment of [size] [manufacturer] PFO occluder"
- Closure assessment: complete closure vs residual shunt status
- Device stability and positioning
- Immediate post-procedural status

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: anaesthesia, recognised, utilised, colour, oesophageal
- Precise measurements: "PFO tunnel length 8mm", "septal thickness 4mm", "device size 25mm"
- Technical terminology: "intracardiac echo guidance", "balloon sizing", "delivery catheter"
- Assessment language: "satisfactory device position", "complete closure", "no residual shunt"
- Device specifications: "Amplatzer PFO Occluder", "Gore Cardioform", "Occlutech Figulla"

DEVICE-SPECIFIC TERMINOLOGY:
- Amplatzer: "Amplatzer PFO Occluder", "self-expanding nitinol", "dual-disc design"
- Gore Cardioform: "Gore Cardioform Septal Occluder", "ePTFE membranes", "nitinol framework"
- Occlutech: "Occlutech Figulla Flex PFO", "flexible design", "braided nitinol mesh"
- Common features: "delivery catheter", "loading sheath", "recapture capability"

PFO ANATOMY DOCUMENTATION:
- Tunnel characteristics: length, diameter, angulation
- Septal thickness and tissue quality
- Rim assessment: aortic, posterior, superior, inferior rims
- Associated features: atrial septal aneurysm, Eustachian valve
- Functional assessment: right-to-left shunt quantification

ICE/TOE GUIDANCE TERMINOLOGY:
- "intracardiac echocardiography confirmed anatomy", "real-time ICE guidance"
- "TOE assessment demonstrated", "colour Doppler evaluation"
- "balloon sizing performed", "appropriate device selection"
- "satisfactory device deployment", "complete septal coverage"

Use standard interventional cardiology procedural documentation format.
Target audience: Medical record documentation for interventional cardiologists, neurologists, and referring physicians.`,

    userPromptTemplate: `Generate a comprehensive PFO closure procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

Structure the report with exactly these three sections:

**PREAMBLE**:
- Start with patient demographics and indication for PFO closure
- Include clinical presentation, neurological workup, and imaging findings
- Document ICE/TOE assessment and anatomical suitability
- Use clinical language: "cryptogenic stroke", "recognised indication", "Based on PFO anatomy..."

**PROCEDURE**:
- Document anaesthesia and ICE/TOE guidance approach
- Include specific technical details: balloon sizing, device deployment, positioning assessment
- Describe closure confirmation with shunt evaluation
- Document immediate outcomes and device stability
- Use procedural terminology: "under ICE guidance", "satisfactory positioning", "complete closure"

**CONCLUSION**:
- Provide simple success statement: "Successful deployment of [size] [manufacturer] PFO occluder"
- Document closure status and device position
- Include immediate post-procedural assessment

Preserve all medical facts accurately with Australian spelling (TOE, anaesthesia, colour) and interventional cardiology terminology. Use precise measurements with units (mm, French sizes).`
  }
};

/**
 * Enhanced medical terminology validation patterns for PFO closure procedures
 * Comprehensive patterns extracted from clinical PFO closure reports
 */
export const PFOClosureMedicalPatterns = {
  // PFO anatomy assessment patterns
  pfoTunnelLength: /(?:pfo\s+)?tunnel\s+length\s+(?:of\s+)?(\d+)\s*mm/gi,
  septalThickness: /septal\s+thickness\s+(?:of\s+)?(\d+)\s*mm/gi,
  deviceSize: /(?:device\s+size\s+|occluder\s+)?(\d+)\s*mm/gi,
  
  // Device specifications
  amplatzerPFO: /amplatzer\s+pfo\s+occluder/gi,
  goreCardioform: /gore\s+cardioform/gi,
  occlutechFigulla: /occlutech\s+figulla/gi,
  deviceDeployment: /(?:device\s+|occluder\s+)?deployment/gi,
  
  // Clinical indications
  cryptogenicStroke: /cryptogenic\s+stroke/gi,
  migraineWithAura: /migraine\s+with\s+aura/gi,
  decompressionSickness: /decompression\s+sickness/gi,
  paradoxicalEmbolism: /paradoxical\s+embolism/gi,
  
  // Imaging and guidance
  iceGuidance: /ice\s+guidance/gi,
  intracardiacEcho: /intracardiac\s+(?:echo|echocardiography)/gi,
  toeAssessment: /toe\s+assessment/gi,
  colourDoppler: /colour\s+doppler/gi,
  balloonSizing: /balloon\s+sizing/gi,
  
  // Anatomical features
  atrialSeptalAneurysm: /atrial\s+septal\s+aneurysm/gi,
  eustachianValve: /eustachian\s+valve/gi,
  rimAssessment: /rim\s+assessment/gi,
  septalCoverage: /septal\s+coverage/gi,
  
  // Closure assessment
  completeClosurePattern: /complete\s+closure/gi,
  residualShunt: /residual\s+shunt/gi,
  satisfactoryPosition: /satisfactory\s+(?:device\s+)?position/gi,
  deviceStability: /device\s+stability/gi,
  
  // Vascular access
  femoralVenous: /femoral\s+venous\s+access/gi,
  deliveryCatheter: /delivery\s+catheter/gi,
  loadingSheath: /loading\s+sheath/gi,
  
  // Measurements with units
  millimeters: /\d+\.?\d*\s*mm/gi,
  frenchSize: /\d+f\s+(?:sheath|catheter)/gi,
  
  // Complications
  deviceEmbolization: /device\s+embolization/gi,
  arrhythmias: /arrhythmias?/gi,
  airEmbolism: /air\s+embolism/gi,
  perforation: /(?:atrial\s+|cardiac\s+)?perforation/gi
};

/**
 * Enhanced medical validation rules for PFO closure content
 */
export const PFOClosureValidationRules = {
  requiredTerms: [
    'pfo',
    'patent foramen ovale',
    'closure',
    'occluder',
    'device',
    'deployment'
  ],
  
  requiredMeasurements: [
    'mm',
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
  
  // Problematic transcription errors
  problematicAbbreviations: [
    'pfo closure', // Should be expanded
    'ice cream', // ICE misheard
    'tee', // Should be TOE in Australia
    'amplatzer', // Ensure proper capitalization
    'gore tex' // Should be Gore Cardioform
  ],
  
  requiredSections: [
    'preamble',
    'procedure', 
    'conclusion'
  ],

  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    'cryptogenic stroke',
    'recognised indication',
    'satisfactory device position',
    'complete closure',
    'intracardiac echo guidance',
    'colour Doppler demonstrated',
    'no residual shunt',
    'satisfactory positioning'
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
    amplatzer: [
      'self-expanding nitinol',
      'dual-disc design',
      'delivery catheter'
    ],
    gore: [
      'ePTFE membranes',
      'nitinol framework',
      'low profile'
    ],
    occlutech: [
      'braided nitinol mesh',
      'flexible design',
      'recapture capability'
    ]
  },

  // Indication-specific requirements
  indicationRequirements: {
    cryptogenicStroke: [
      'neurological workup',
      'stroke investigation',
      'embolic source'
    ],
    migraine: [
      'migraine with aura',
      'headache improvement',
      'quality of life'
    ],
    decompression: [
      'diving history',
      'decompression sickness',
      'bubble passage'
    ]
  },

  // Section content requirements
  sectionRequirements: {
    preamble: [
      'indication',
      'clinical presentation',
      'imaging assessment',
      'device selection'
    ],
    procedure: [
      'anaesthesia',
      'ice guidance',
      'device deployment',
      'closure confirmation'
    ],
    conclusion: [
      'successful deployment',
      'closure status',
      'device stability'
    ]
  }
};

/**
 * Report structure templates for clinical PFO closure documentation
 */
export const PFOClosureReportTemplates = {
  preambleTemplate: {
    structure: [
      'Patient demographics with clinical indication',
      'Neurological presentation and stroke workup', 
      'ICE/TOE anatomical assessment and device selection',
      'Risk-benefit assessment and procedure planning'
    ],
    clinicalLanguage: {
      indication: '[Patient] is a [age] year old [gender] with [cryptogenic stroke/migraine with aura], referred for PFO closure',
      clinicalPresentation: 'Clinical presentation consistent with [paradoxical embolism/migraine with aura]',
      neurologicalWorkup: 'Comprehensive neurological workup excluded other embolic sources',
      anatomicalAssessment: 'ICE assessment demonstrated a [tunnel length] mm PFO with [septal characteristics]',
      deviceSelection: 'Based on PFO anatomy and septal thickness, a [manufacturer] [size]mm occluder was selected'
    }
  },

  procedureTemplate: {
    structure: [
      'Anaesthesia and ICE/TOE guidance setup',
      'Vascular access and catheter positioning',
      'Balloon sizing and device selection confirmation',
      'Device deployment and positioning assessment',
      'Closure confirmation and final evaluation'
    ],
    clinicalLanguage: {
      anaesthesia: 'The procedure was performed under [local anaesthesia with conscious sedation/general anaesthesia]',
      vascularAccess: 'Right femoral venous access was obtained with ICE guidance throughout',
      balloonSizing: 'Balloon sizing confirmed appropriate device selection',
      deviceDeployment: 'The occluder was deployed with satisfactory positioning across the atrial septum',
      closureConfirmation: 'Colour Doppler demonstrated complete PFO closure with no residual shunt'
    }
  },

  conclusionTemplate: {
    structure: [
      'Simple success statement with device specifications',
      'Final closure assessment and device stability',
      'Immediate post-procedural status and recommendations'
    ],
    clinicalLanguage: {
      successStatement: 'Successful deployment of [size]mm [manufacturer] PFO occluder',
      closureAssessment: 'Complete PFO closure with satisfactory device position and stability',
      proceduralOutcome: 'Uncomplicated procedure with excellent immediate result'
    }
  }
};

/**
 * Export all PFO closure system prompts as a consolidated configuration
 */
export const PFOClosurePromptConfiguration = {
  prompts: PFOClosureSystemPrompts,
  patterns: PFOClosureMedicalPatterns,
  validation: PFOClosureValidationRules,
  templates: PFOClosureReportTemplates,
  
  // Configuration metadata
  version: '1.0.0',
  source: 'Comprehensive PFO closure medical knowledge with Australian terminology',
  lastUpdated: new Date().toISOString(),
  medicalAccuracy: 'Validated against interventional cardiology standards for PFO closure procedures',
  targetAudience: 'Interventional cardiologists, neurologists, referring physicians',
  
  // Usage instructions
  usage: {
    procedureReports: 'Use pfoClosureProcedureAgent prompts for PFO closure procedural documentation with enhanced three-section format',
    templates: 'Use PFOClosureReportTemplates for structured clinical language and consistent formatting',
    validation: 'Apply PFOClosureValidationRules for medical accuracy and Australian spelling compliance (TOE, not TEE, ICE guidance)'
  }
};