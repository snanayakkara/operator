import type { FieldDisplayConfig, ValidationPromptCopy } from '@/sidepanel/components/results/FieldValidationPrompt';

/**
 * Agent-specific field configurations for validation modal
 * Provides human-readable labels and input types for extracted data fields
 */

// =============================================================================
// RHC (Right Heart Catheterisation) Configuration
// =============================================================================

export const RHC_FIELD_CONFIG: Record<string, FieldDisplayConfig> = {
  // Pressures
  'pressures.raP': { label: 'RA Pressure', inputType: 'number', placeholder: 'Mean RA pressure in mmHg', helperText: 'Right atrial mean pressure (normal: 2-8 mmHg)' },
  'pressures.rvSystolic': { label: 'RV Systolic Pressure', inputType: 'number', placeholder: 'RV systolic in mmHg', helperText: 'Right ventricular systolic pressure (normal: 15-30 mmHg)' },
  'pressures.rvDiastolic': { label: 'RV Diastolic Pressure', inputType: 'number', placeholder: 'RV diastolic in mmHg', helperText: 'Right ventricular end-diastolic pressure (normal: 2-8 mmHg)' },
  'pressures.paSystolic': { label: 'PA Systolic Pressure', inputType: 'number', placeholder: 'PA systolic in mmHg', helperText: 'Pulmonary artery systolic pressure (normal: 15-30 mmHg)' },
  'pressures.paDiastolic': { label: 'PA Diastolic Pressure', inputType: 'number', placeholder: 'PA diastolic in mmHg', helperText: 'Pulmonary artery diastolic pressure (normal: 4-12 mmHg)' },
  'pressures.paMean': { label: 'PA Mean Pressure', inputType: 'number', placeholder: 'Mean PA pressure in mmHg', helperText: 'Pulmonary artery mean pressure (normal: 9-18 mmHg)' },
  'pressures.pcwp': { label: 'PCWP', inputType: 'number', placeholder: 'PCWP in mmHg', helperText: 'Pulmonary capillary wedge pressure (normal: 6-12 mmHg)' },

  // Calculations
  'calculations.cardiacOutput': { label: 'Cardiac Output', inputType: 'number', placeholder: 'CO in L/min', helperText: 'Cardiac output (normal: 4-8 L/min)' },
  'calculations.cardiacIndex': { label: 'Cardiac Index', inputType: 'number', placeholder: 'CI in L/min/m²', helperText: 'Cardiac index normalized to BSA (normal: 2.5-4.0 L/min/m²)' },
  'calculations.pvr': { label: 'PVR', inputType: 'number', placeholder: 'PVR in Wood units', helperText: 'Pulmonary vascular resistance (normal: <3 Wood units)' },
  'calculations.svr': { label: 'SVR', inputType: 'number', placeholder: 'SVR in dynes·s·cm⁻⁵', helperText: 'Systemic vascular resistance (normal: 800-1200 dynes·s·cm⁻⁵)' },
  'calculations.transValvularGradient': { label: 'Transvalvular Gradient', inputType: 'number', placeholder: 'Gradient in mmHg', helperText: 'Pressure gradient across valve (if applicable)' },

  // Resources
  'resources.fluoroscopyTime': { label: 'Fluoroscopy Time', inputType: 'number', placeholder: 'Total fluoroscopy time in minutes', helperText: 'Total radiation exposure time' },
  'resources.contrastVolume': { label: 'Contrast Volume', inputType: 'number', placeholder: 'Total contrast in mL', helperText: 'Total iodinated contrast volume administered' }
};

export const RHC_VALIDATION_COPY: ValidationPromptCopy = {
  heading: 'RHC Data Validation Required',
  description: 'The quick model detected missing critical fields or low-confidence measurements. Please review and provide missing values for accurate haemodynamic calculations.',
  criticalHelper: 'Required for PVR/SVR/CI calculations and diagnostic accuracy.',
  optionalHelper: 'Improves report completeness and radiation safety documentation.'
};

// =============================================================================
// TAVI (Transcatheter Aortic Valve Implantation) Configuration
// =============================================================================

export const TAVI_FIELD_CONFIG: Record<string, FieldDisplayConfig> = {
  // Valve Sizing (CRITICAL)
  'valveSizing.annulusDiameter': { label: 'Annulus Diameter', inputType: 'number', placeholder: 'Aortic annulus diameter in mm', helperText: 'CT-measured annulus diameter for valve sizing (CRITICAL)' },
  'valveSizing.annulusPerimeter': { label: 'Annulus Perimeter', inputType: 'number', placeholder: 'Annulus perimeter in mm', helperText: 'CT-measured annulus perimeter for valve sizing' },
  'valveSizing.annulusArea': { label: 'Annulus Area', inputType: 'number', placeholder: 'Annulus area in mm²', helperText: 'CT-measured annulus area for valve sizing' },

  // Access Assessment
  'accessAssessment.site': { label: 'Access Site', inputType: 'text', placeholder: 'e.g., Right femoral artery', helperText: 'Vascular access site for procedure' },
  'accessAssessment.iliofemoralDimensions': { label: 'Iliofemoral Dimensions', inputType: 'text', placeholder: 'e.g., 7-8 mm diameter', helperText: 'Minimal iliofemoral vessel diameter from CT' },

  // Coronary Heights (SAFETY-CRITICAL)
  'coronaryHeights.leftCoronary': { label: 'Left Coronary Height', inputType: 'number', placeholder: 'LCA height in mm', helperText: 'Distance from annulus to left coronary ostium (CRITICAL for coronary occlusion risk)' },
  'coronaryHeights.rightCoronary': { label: 'Right Coronary Height', inputType: 'number', placeholder: 'RCA height in mm', helperText: 'Distance from annulus to right coronary ostium (CRITICAL for coronary occlusion risk)' },

  // Aortic Valve Assessment
  'aorticValve.peakGradient': { label: 'Peak Gradient', inputType: 'number', placeholder: 'Peak AV gradient in mmHg', helperText: 'Peak echocardiographic gradient across aortic valve' },
  'aorticValve.meanGradient': { label: 'Mean Gradient', inputType: 'number', placeholder: 'Mean AV gradient in mmHg', helperText: 'Mean echocardiographic gradient across aortic valve' },
  'aorticValve.avArea': { label: 'AV Area', inputType: 'number', placeholder: 'AV area in cm²', helperText: 'Aortic valve area (normal: 3-4 cm²; severe AS: <1.0 cm²)' },

  // LV Assessment
  'lvAssessment.ef': { label: 'Ejection Fraction', inputType: 'number', placeholder: 'LVEF in %', helperText: 'Left ventricular ejection fraction' },
  'lvAssessment.lvidd': { label: 'LVIDD', inputType: 'number', placeholder: 'LVIDD in mm', helperText: 'Left ventricular internal diameter in diastole' },
  'lvAssessment.lvids': { label: 'LVIDS', inputType: 'number', placeholder: 'LVIDS in mm', helperText: 'Left ventricular internal diameter in systole' },

  // Procedure Details
  'procedureDetails.valveType': { label: 'Valve Type', inputType: 'text', placeholder: 'e.g., Sapien 3, Evolut R', helperText: 'Transcatheter valve prosthesis model' },
  'procedureDetails.valveSize': { label: 'Valve Size', inputType: 'number', placeholder: 'Valve size in mm', helperText: 'Deployed valve size (e.g., 26mm, 29mm)' },
  'procedureDetails.deploymentDepth': { label: 'Deployment Depth', inputType: 'number', placeholder: 'Depth in mm', helperText: 'Distance from annulus to ventricular aspect of valve' }
};

export const TAVI_VALIDATION_COPY: ValidationPromptCopy = {
  heading: 'TAVI Workup Validation Required',
  description: 'The quick model detected missing valve sizing parameters or coronary height measurements. These fields are CRITICAL for safe valve selection and deployment.',
  criticalHelper: 'REQUIRED for valve sizing and procedural safety (coronary occlusion risk).',
  optionalHelper: 'Improves workup completeness and pre-procedural planning.'
};

// =============================================================================
// Angiogram/PCI (Percutaneous Coronary Intervention) Configuration
// =============================================================================

export const ANGIO_PCI_FIELD_CONFIG: Record<string, FieldDisplayConfig> = {
  // Access & Target
  'accessSite': { label: 'Access Site', inputType: 'text', placeholder: 'e.g., Right radial artery', helperText: 'Vascular access site for catheterization' },
  'targetVessel': { label: 'Target Vessel', inputType: 'text', placeholder: 'e.g., LAD, LCx, RCA', helperText: 'Target coronary vessel for intervention' },
  'lesionLocation': { label: 'Lesion Location', inputType: 'text', placeholder: 'e.g., Proximal LAD, Mid RCA', helperText: 'Anatomical location of coronary lesion' },
  'stenosisPercent': { label: 'Stenosis %', inputType: 'number', placeholder: 'Stenosis percentage (0-100)', helperText: 'Degree of luminal narrowing (e.g., 90%)' },

  // Intervention Details (CRITICAL for PCI registry reporting)
  'intervention.stentType': { label: 'Stent Type', inputType: 'text', placeholder: 'e.g., Xience, Resolute, Promus', helperText: 'Stent manufacturer/model (REQUIRED for device tracking)' },
  'intervention.stentSize': { label: 'Stent Diameter', inputType: 'number', placeholder: 'Stent diameter in mm', helperText: 'Stent diameter (REQUIRED for registry reporting)' },
  'intervention.stentLength': { label: 'Stent Length', inputType: 'number', placeholder: 'Stent length in mm', helperText: 'Stent length (REQUIRED for registry reporting)' },
  'intervention.balloonSize': { label: 'Balloon Size', inputType: 'number', placeholder: 'Balloon diameter in mm', helperText: 'Pre/post-dilation balloon size' },

  // TIMI Flow (CRITICAL for procedural success)
  'timiFlow.pre': { label: 'Pre-intervention TIMI Flow', inputType: 'number', placeholder: 'TIMI flow grade (0-3)', helperText: 'TIMI flow before intervention (REQUIRED for success assessment)' },
  'timiFlow.post': { label: 'Post-intervention TIMI Flow', inputType: 'number', placeholder: 'TIMI flow grade (0-3)', helperText: 'TIMI flow after intervention (REQUIRED for success assessment)' },

  // Resources
  'resources.contrastVolume': { label: 'Contrast Volume', inputType: 'number', placeholder: 'Total contrast in mL', helperText: 'Total iodinated contrast volume (REQUIRED for safety documentation)' },
  'resources.fluoroscopyTime': { label: 'Fluoroscopy Time', inputType: 'number', placeholder: 'Total fluoroscopy time in minutes', helperText: 'Total radiation exposure time (REQUIRED for safety documentation)' }
};

export const ANGIO_PCI_VALIDATION_COPY: ValidationPromptCopy = {
  heading: 'Angiogram/PCI Validation Required',
  description: 'The quick model detected missing stent details, TIMI flow grades, or lesion characteristics. These fields are CRITICAL for registry reporting and intervention documentation.',
  criticalHelper: 'REQUIRED for device tracking, registry reporting, and procedural success assessment.',
  optionalHelper: 'Improves procedural documentation and safety reporting.'
};

// =============================================================================
// mTEER (Mitral Transcatheter Edge-to-Edge Repair) Configuration
// =============================================================================

export const MTEER_FIELD_CONFIG: Record<string, FieldDisplayConfig> = {
  // Mitral Regurgitation Assessment (CRITICAL)
  'mitralRegurgitation.preGrade': { label: 'Pre-procedure MR Grade', inputType: 'text', placeholder: 'e.g., 4+, severe', helperText: 'MR grade before intervention (CRITICAL for baseline)' },
  'mitralRegurgitation.postGrade': { label: 'Post-procedure MR Grade', inputType: 'text', placeholder: 'e.g., 1+, mild', helperText: 'MR grade after clip deployment (CRITICAL for procedural success)' },
  'mitralRegurgitation.preMRGrade': { label: 'Pre MR Grade (Alt)', inputType: 'text', placeholder: 'Alternative pre-procedure MR grade', helperText: 'Alternative naming for pre-procedure MR severity' },
  'mitralRegurgitation.postMRGrade': { label: 'Post MR Grade (Alt)', inputType: 'text', placeholder: 'Alternative post-procedure MR grade', helperText: 'Alternative naming for post-procedure MR severity' },

  // Clip Details (CRITICAL for device tracking)
  'clipDetails.type': { label: 'Clip Type', inputType: 'text', placeholder: 'e.g., MitraClip NTW, PASCAL P10', helperText: 'Clip device type (REQUIRED for device tracking)' },
  'clipDetails.size': { label: 'Clip Size', inputType: 'text', placeholder: 'e.g., 10mm', helperText: 'Clip size designation (REQUIRED for registry reporting)' },
  'clipDetails.number': { label: 'Number of Clips', inputType: 'number', placeholder: 'Number of clips deployed', helperText: 'Total clips deployed (REQUIRED for procedural documentation)' },

  // Anatomical Location
  'anatomicalLocation': { label: 'Anatomical Location', inputType: 'text', placeholder: 'e.g., A2-P2, A1-P1', helperText: 'Mitral valve location for clip deployment (REQUIRED for precise documentation)' },

  // EROA Measurements
  'eroa.pre': { label: 'Pre-procedure EROA', inputType: 'number', placeholder: 'EROA in cm²', helperText: 'Effective regurgitant orifice area before intervention (severity assessment)' },
  'eroa.post': { label: 'Post-procedure EROA', inputType: 'number', placeholder: 'EROA in cm²', helperText: 'EROA after clip deployment (outcome documentation)' },

  // Transmitral Gradient (CRITICAL for stenosis risk)
  'transmitralGradient.pre': { label: 'Pre-procedure Transmitral Gradient', inputType: 'number', placeholder: 'Gradient in mmHg', helperText: 'Mean transmitral gradient before intervention' },
  'transmitralGradient.post': { label: 'Post-procedure Transmitral Gradient', inputType: 'number', placeholder: 'Gradient in mmHg', helperText: 'Mean transmitral gradient after clip (CRITICAL for assessing mitral stenosis risk)' }
};

export const MTEER_VALIDATION_COPY: ValidationPromptCopy = {
  heading: 'mTEER Procedure Validation Required',
  description: 'The quick model detected missing MR grading, clip details, or anatomical location. Pre/post MR comparison is the KEY measure of procedural success.',
  criticalHelper: 'REQUIRED for procedural success documentation, device tracking, and registry reporting.',
  optionalHelper: 'Improves outcome documentation and severity assessment.'
};

// =============================================================================
// Agent Type Mapping
// =============================================================================

export type ValidatableAgentType = 'rhc' | 'tavi' | 'angio-pci' | 'mteer';

export const VALIDATION_CONFIG_MAP = {
  rhc: { fieldConfig: RHC_FIELD_CONFIG, copy: RHC_VALIDATION_COPY },
  tavi: { fieldConfig: TAVI_FIELD_CONFIG, copy: TAVI_VALIDATION_COPY },
  'angio-pci': { fieldConfig: ANGIO_PCI_FIELD_CONFIG, copy: ANGIO_PCI_VALIDATION_COPY },
  mteer: { fieldConfig: MTEER_FIELD_CONFIG, copy: MTEER_VALIDATION_COPY }
} as const;

/**
 * Get validation field configuration for a specific agent type
 * @param agentType - The agent type (rhc, tavi, angio-pci, mteer)
 * @returns Field configuration and copy text for validation modal
 */
export function getValidationConfig(agentType: ValidatableAgentType) {
  return VALIDATION_CONFIG_MAP[agentType];
}
