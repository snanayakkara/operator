/**
 * Unified Recording Prompt Configuration
 * 
 * This file contains recording guidance prompts for all medical agents,
 * extracted from SystemPrompts files to help users capture comprehensive
 * medical information during dictation.
 * 
 * Easy to maintain: Edit here to update both prompts and UI cards.
 */

import type { AgentType } from '@/types/medical.types';

export interface RecordingPromptSection {
  title: string;
  items: string[];
  icon?: string;
}

export interface RecordingPromptConfig {
  id: AgentType;
  title: string;
  description: string;
  estimatedTime: string;
  sections: RecordingPromptSection[];
  tips: string[];
  terminology: string[];
}

export const RECORDING_PROMPTS: readonly RecordingPromptConfig[] = [
  {
    id: 'tavi',
    title: 'TAVI Procedure Recording',
    description: 'Transcatheter Aortic Valve Implantation - Comprehensive procedural documentation',
    estimatedTime: '8-12 minutes',
    sections: [
      {
        title: 'Preamble Information',
        icon: '📋',
        items: [
          'Patient demographics and clinical indication',
          'Preoperative CT findings: "suitable anatomy for valve implant"',
          'Valve morphology: tricuspid/bicuspid, calcification burden',
          'Calcium score and LVOT assessment',
          'Transthoracic echo: mean gradient, systolic function',
          'Valve selection rationale with sizing logic'
        ]
      },
      {
        title: 'Procedural Details',
        icon: '⚕️',
        items: [
          'Anaesthesia approach: local anaesthesia and deep sedation',
          'Vascular access: radial planning, femoral with ultrasound guidance',
          'Pre-closure technique: ProStyle sutures or equivalent',
          'Sheath sizes: specific French sizes (e.g., 16F Cook sheath)',
          'Valve crossing: AL1, straight wire, invasive gradient, LVEDP',
          'Lunderquist wire placement at left ventricular apex',
          'Pre-dilation: balloon size and technique',
          'Valve deployment: positioning at annular plane',
          'Immediate assessment: aortic regurgitation, coronary patency'
        ]
      },
      {
        title: 'Outcomes & Assessment',
        icon: '✅',
        items: [
          'Valve deployment success and positioning',
          'Final aortic regurgitation grade',
          'Post-procedural echo findings',
          'Arteriotomy closure method and success',
          'Overall procedural success statement',
          'Immediate post-procedural valve performance'
        ]
      }
    ],
    tips: [
      'Use Australian spelling: anaesthesia, recognised, utilised',
      'Include precise measurements with units (mmHg, cm², French sizes)',
      'Preserve original stenosis terminology (mild/moderate/severe)',
      'Document valve manufacturer and model specifically'
    ],
    terminology: [
      'Edwards Sapien 3 Ultra/Medtronic Evolut series',
      'Annular perimeter and area, LVOT calcium burden',
      'Well-seated valve, patent coronaries',
      'Partial recaptures for optimal positioning'
    ]
  },

  {
    id: 'angiogram-pci',
    title: 'Angiogram/PCI Recording',
    description: 'Cardiac catheterization and coronary interventions - Diagnostic and interventional procedures',
    estimatedTime: '8-15 minutes',
    sections: [
      {
        title: 'Vessel Assessment',
        icon: '🫀',
        items: [
          'Left Main coronary artery findings',
          'LAD: proximal, mid, distal segments and diagonal branches',
          'Circumflex: segments and obtuse marginal branches',
          'RCA: segments including dominance pattern',
          'Coronary dominance (right/left/co-dominant)',
          'Collateral circulation if present'
        ]
      },
      {
        title: 'Procedural Information',
        icon: '🔧',
        items: [
          'Vascular access site and approach',
          'Catheter selection and sizes',
          'Target lesion characteristics and location',
          'Intervention strategy and rationale',
          'Device specifications: stent type, manufacturer, size',
          'Balloon pre-dilation details',
          'Deployment technique and positioning'
        ]
      },
      {
        title: 'Results & Outcomes',
        icon: '📊',
        items: [
          'TIMI flow assessment (pre and post)',
          'Final angiographic result',
          'Residual stenosis percentage',
          'Procedural complications if any',
          'Hemodynamic measurements',
          'Antiplatelet therapy plan'
        ]
      }
    ],
    tips: [
      'Preserve stenosis grading as stated by clinician',
      'Use descriptive TIMI flow language',
      'Include specific device details when mentioned',
      'Document both diagnostic and intervention aspects'
    ],
    terminology: [
      'Drug-eluting stent (DES), bare metal stent (BMS)',
      'TIMI III flow, complete perfusion',
      'Proximal/mid/distal vessel segments',
      'Optimal angiographic result'
    ]
  },

  {
    id: 'quick-letter',
    title: 'Quick Letter Recording',
    description: 'Medical correspondence and consultation letters - Professional communication',
    estimatedTime: '1-3 minutes',
    sections: [
      {
        title: 'Patient Presentation',
        icon: '👤',
        items: [
          'Clinical presentation and chief complaint',
          'Relevant history and context',
          'Current symptoms and functional status',
          'Reason for referral or consultation',
          'Timeline of events'
        ]
      },
      {
        title: 'Clinical Assessment',
        icon: '🔍',
        items: [
          'Investigation findings and interpretation',
          'Clinical examination relevant findings',
          'Diagnostic considerations',
          'Risk stratification if applicable'
        ]
      },
      {
        title: 'Management Plan',
        icon: '📝',
        items: [
          'Treatment recommendations',
          'Medication changes or additions',
          'Follow-up arrangements',
          'Specialist referrals if needed',
          'Patient education provided'
        ]
      }
    ],
    tips: [
      'Use first-person voice: "I reviewed", "I examined"',
      'Keep paragraphs flowing and professional',
      'Include specific timeframes and measurements',
      'Use Australian spelling and medical terminology'
    ],
    terminology: [
      'Clinical assessment, management plan',
      'Follow-up arrangements, specialist review',
      'Patient education, shared decision-making',
      'Routine/semi-urgent/urgent referral'
    ]
  },

  {
    id: 'tavi-workup',
    title: 'TAVI Workup Dictation',
    description: 'Single-pass dictation covering the clinical, echocardiographic, and CT sizing inputs for TAVI planning',
    estimatedTime: '3-5 minutes',
    sections: [
      {
        title: 'Patient Basics',
        icon: '🧍',
        items: [
          'State the patient name and date of birth clearly',
          'Latest height in centimetres and weight in kilograms',
          'Note any symptomatic change prompting assessment'
        ]
      },
      {
        title: 'Risk Profile',
        icon: '⚕️',
        items: [
          'Indication for TAVI workup',
          'NYHA functional class (I-IV only)',
          'STS and EuroSCORE II percentages'
        ]
      },
      {
        title: 'Echocardiography Highlights',
        icon: '🩻',
        items: [
          'Echo study date and ejection fraction',
          'Septal thickness and mean pressure gradient',
          'Aortic valve area, dimensionless index, MR grade, RVSP',
          'Key qualitative comments'
        ]
      },
      {
        title: 'CT Sizing',
        icon: '🧠',
        items: [
          'Annulus area, perimeter, minimum and maximum diameters',
          'Left main and right coronary heights',
          'Sinus of Valsalva diameters for each cusp',
          'Coplanar acquisition angles (e.g., "LAO 12 cranial 6")',
          'Access vessel minimal diameters (CIA, EIA, CFA) with laterality'
        ]
      },
      {
        title: 'Device Planning',
        icon: '🛠️',
        items: [
          'Intended valve platform (Sapien, Evolut, Navitor)',
          'Planned valve size and rationale',
          'Any anatomical cautions (coronary height, annular calcification, access limitations)'
        ]
      }
    ],
    tips: [
      'Say "percent" after risk scores to avoid misinterpretation',
      'Use centimetres when dictating distances so the system can convert to millimetres',
      'Work systematically: patient basics -> risk -> echo -> CT -> access/device'
    ],
    terminology: [
      'Annulus area/perimeter',
      'Dimensionless index (DVI)',
      'Sinus of Valsalva',
      'Common/external iliac, common femoral',
      'Coplanar LAO/RAO cranial/caudal angles'
    ]
  },

  {
    id: 'consultation',
    title: 'Consultation Recording',
    description: 'Comprehensive patient assessments - Detailed clinical evaluation',
    estimatedTime: '2-4 minutes',
    sections: [
      {
        title: 'Clinical History',
        icon: '📚',
        items: [
          'Presenting complaint and history',
          'Past medical history and comorbidities',
          'Current medications and allergies',
          'Family history if relevant',
          'Social history and functional status'
        ]
      },
      {
        title: 'Examination & Investigations',
        icon: '🔬',
        items: [
          'Physical examination findings',
          'Vital signs and measurements',
          'Investigation results and interpretation',
          'Imaging findings if applicable',
          'Laboratory results correlation'
        ]
      },
      {
        title: 'Assessment & Plan',
        icon: '🎯',
        items: [
          'Clinical impression and differential diagnosis',
          'Risk assessment and stratification',
          'Management strategy and rationale',
          'Investigation plan if needed',
          'Follow-up and monitoring plan'
        ]
      }
    ],
    tips: [
      'Capture comprehensive clinical reasoning',
      'Include functional assessment (NYHA class, etc.)',
      'Document shared decision-making process',
      'Note patient understanding and concerns'
    ],
    terminology: [
      'Clinical impression, differential diagnosis',
      'Risk stratification, management strategy',
      'Functional class, symptom assessment',
      'Patient-centred care, shared decisions'
    ]
  },

  {
    id: 'mteer',
    title: 'mTEER Procedure Recording',
    description: 'Mitral transcatheter edge-to-edge repair - Structural heart intervention',
    estimatedTime: '7-10 minutes',
    sections: [
      {
        title: 'Pre-procedural Assessment',
        icon: '🔍',
        items: [
          'Mitral regurgitation severity and mechanism',
          'Valve anatomy and morphology',
          'TOE assessment and measurements',
          'Procedural planning and approach',
          'Patient selection criteria'
        ]
      },
      {
        title: 'Procedural Technique',
        icon: '⚙️',
        items: [
          'Transseptal puncture technique',
          'Device delivery and positioning',
          'Clip deployment and assessment',
          'TOE guidance throughout procedure',
          'Immediate haemodynamic changes'
        ]
      },
      {
        title: 'Results & Follow-up',
        icon: '📈',
        items: [
          'Final mitral regurgitation grade',
          'Mitral valve gradient assessment',
          'Procedural success metrics',
          'Complications if any',
          'Post-procedural monitoring plan including TTE next day'
        ]
      }
    ],
    tips: [
      'Document TOE guidance detail',
      'Include specific device information',
      'Note immediate haemodynamic improvement',
      'Record precise regurgitation grading'
    ],
    terminology: [
      'Edge-to-edge repair, MitraClip device',
      'Functional vs degenerative MR',
      'TOE guidance, transseptal puncture',
      'Immediate haemodynamic improvement'
    ]
  },

  {
    id: 'pfo-closure',
    title: 'PFO Closure Recording',
    description: 'Patent foramen ovale closure - Structural heart intervention',
    estimatedTime: '5-8 minutes',
    sections: [
      {
        title: 'Pre-procedural Assessment',
        icon: '🔎',
        items: [
          'PFO anatomy and tunnel length',
          'Shunt assessment and grading',
          'Device selection rationale',
          'Imaging findings (TOE/ICE)',
          'Clinical indication for closure'
        ]
      },
      {
        title: 'Deployment Technique',
        icon: '🎯',
        items: [
          'Device delivery and positioning',
          'Deployment sequence and technique',
          'Position confirmation',
          'Immediate closure assessment',
          'Device stability evaluation'
        ]
      },
      {
        title: 'Procedural Outcome',
        icon: '✨',
        items: [
          'Successful device deployment',
          'Residual shunt assessment',
          'Device position and stability',
          'Procedural complications if any',
          'Post-procedural monitoring requirements'
        ]
      }
    ],
    tips: [
      'Document device sizing rationale',
      'Include immediate closure success',
      'Note any residual shunt',
      'Record device stability assessment'
    ],
    terminology: [
      'Patent foramen ovale, atrial septal anatomy',
      'Device deployment, positioning confirmation',
      'Residual shunt, complete closure',
      'TOE/ICE guidance, device stability'
    ]
  },

  {
    id: 'right-heart-cath',
    title: 'Right Heart Catheterisation',
    description: 'Right heart catheterisation with haemodynamic assessment',
    estimatedTime: '6-10 minutes',
    sections: [
      {
        title: 'Haemodynamic Assessment',
        icon: '📊',
        items: [
          'Right atrial pressure measurements',
          'Right ventricular pressures',
          'Pulmonary artery pressures',
          'Pulmonary capillary wedge pressure',
          'Cardiac output and index',
          'Pulmonary vascular resistance',
          'TPG, RVSWI'
        ]
      },
      {
        title: 'Technical Details',
        icon: '🔧',
        items: [
          'Vascular access approach',
          'Catheter selection and positioning',
          'Measurement technique and validation',
          'Thermodilution or Fick method',
          'Complications if any'
        ]
      },
      {
        title: 'Clinical Interpretation',
        icon: '📋',
        items: [
          'Haemodynamic interpretation',
          'Pulmonary hypertension assessment',
          'Heart failure classification',
          'Treatment implications',
          'Follow-up recommendations'
        ]
      }
    ],
    tips: [
      'Include precise pressure measurements',
      'Document calculation methods used',
      'Note any technical challenges',
      'Correlate with clinical presentation'
    ],
    terminology: [
      'Pulmonary vascular resistance, cardiac index',
      'Thermodilution, Fick equation',
      'Pulmonary hypertension, right heart failure',
      'Haemodynamic profile, pressure gradients'
    ]
  },

  {
    id: 'investigation-summary',
    title: 'Investigation Summary Recording',
    description: 'Formatting voice-dictated investigation results into structured summaries',
    estimatedTime: '30-60 seconds',
    sections: [
      {
        title: 'Test Information',
        icon: '🔬',
        items: [
          'Investigation type (TTE, CTCA, Bloods, etc.)',
          'Date of investigation (DD MMM YYYY format)',
          'Location/institution if relevant',
          'Test methodology or approach if specified'
        ]
      },
      {
        title: 'Key Findings',
        icon: '📋',
        items: [
          'Primary findings and measurements',
          'Normal and abnormal values with units',
          'Qualitative descriptions (mild/moderate/severe)',
          'Relevant anatomical observations',
          'Clinical significance if stated'
        ]
      },
      {
        title: 'Measurements & Values',
        icon: '📏',
        items: [
          'Exact numerical values with units',
          'Reference ranges when mentioned',
          'Percentage values (e.g., EF 55%)',
          'Pressure measurements (mmHg)',
          'Laboratory values with proper abbreviations'
        ]
      }
    ],
    tips: [
      'Use standard medical abbreviations (TChol, LDL, HDL, etc.)',
      'Include units with all measurements',
      'Preserve qualitative terms exactly as stated',
      'Format as: TEST (date): comma-separated findings'
    ],
    terminology: [
      'TTE, TOE, CTCA, CMRI, RHC, Bloods',
      'TChol, TG, HDL, LDL, HbA1c, Cr, eGFR',
      'EF%, MPG, PPG, RVSP, TIMI flow',
      'Normal, mild, moderate, severe'
    ]
  },

  {
    id: 'background',
    title: 'Background & History Recording',
    description: 'Patient medical background, history, and contextual information',
    estimatedTime: '1-2 minutes',
    sections: [
      {
        title: 'Medical History',
        icon: '🏥',
        items: [
          'Past medical conditions and diagnoses',
          'Previous cardiovascular events or procedures',
          'Chronic conditions and comorbidities',
          'Surgical history relevant to current care',
          'Hospital admissions and major events'
        ]
      },
      {
        title: 'Family & Social History',
        icon: '👥',
        items: [
          'Family history of cardiovascular disease',
          'Hereditary conditions or risk factors',
          'Social circumstances affecting care',
          'Functional status and mobility',
          'Support systems and care arrangements'
        ]
      },
      {
        title: 'Risk Factors',
        icon: '⚠️',
        items: [
          'Smoking history (current/former/never)',
          'Alcohol consumption patterns',
          'Exercise tolerance and activity levels',
          'Occupational or environmental exposures',
          'Lifestyle factors affecting health'
        ]
      }
    ],
    tips: [
      'Use chronological order for medical events',
      'Include dates and timeframes when mentioned',
      'Note functional impact of conditions',
      'Use arrow notation (→) for progression or outcomes'
    ],
    terminology: [
      'CAD, MI, CABG, PCI, valve disease',
      'DM, HTN, dyslipidaemia, CKD',
      'NYHA class, functional capacity',
      'Family Hx, social circumstances'
    ]
  },

  {
    id: 'medication',
    title: 'Medication Recording',
    description: 'Current medications, changes, and pharmaceutical management',
    estimatedTime: '1-2 minutes',
    sections: [
      {
        title: 'Current Medications',
        icon: '💊',
        items: [
          'Drug name (generic preferred)',
          'Dosage and strength',
          'Frequency and timing',
          'Route of administration',
          'Duration of therapy if specified'
        ]
      },
      {
        title: 'Recent Changes',
        icon: '🔄',
        items: [
          'New medications started',
          'Dose adjustments made',
          'Medications discontinued',
          'Reason for changes',
          'Timing of modifications'
        ]
      },
      {
        title: 'Compliance & Effects',
        icon: '✅',
        items: [
          'Adherence to current regimen',
          'Side effects experienced',
          'Therapeutic response noted',
          'Patient understanding and concerns',
          'Monitoring requirements'
        ]
      }
    ],
    tips: [
      'Use generic drug names when possible',
      'Include exact dosages with units (mg, mcg)',
      'Note timing (morning, evening, with meals)',
      'Document reasons for any changes'
    ],
    terminology: [
      'ACE inhibitor, ARB, beta-blocker, statin',
      'BD, TDS, QID, PRN, with meals',
      'mg, mcg, g, units, mL',
      'Commenced, ceased, increased, decreased'
    ]
  },

  {
    id: 'pre-op-plan',
    title: 'Pre-Op Plan Recording',
    description: 'Pre-procedure planning card for cath lab staff - Select procedure type first',
    estimatedTime: '1-3 minutes',
    sections: [
      {
        title: 'ANGIOGRAM/PCI Checklist',
        icon: '🩺',
        items: [
          '✅ Procedure type & indication (e.g., "Angiogram for NSTEMI")',
          '✅ Primary access site (radial/femoral)',
          '✅ Sheath size (Fr)',
          '✅ Catheters planned (e.g., JL3.5, JR4)',
          '✅ Allergies/precautions (iodine, latex)',
          '✅ Antiplatelet plan (continue/hold)',
          '⭕ Sedation level (light/moderate)',
          '⭕ Site prep (which sites + antiseptic)',
          '⭕ Recent labs (Hb, creatinine)',
          '⭕ Planned follow-up (timing, location)',
          '✅ Next-of-kin (name, relationship, phone)'
        ]
      },
      {
        title: 'RIGHT HEART CATH Checklist',
        icon: '🩺',
        items: [
          '✅ Procedure type & indication',
          '✅ Access site (basilic/jugular/femoral)',
          '✅ Sheath size (Fr)',
          '✅ Catheters planned (Swan-Ganz, etc.)',
          '✅ CO measurement (Yes/No, method)',
          '✅ Blood gas samples (count)',
          '⭕ Sedation plan',
          '⭕ Anticoagulation plan',
          '⭕ Site prep details',
          '⭕ Recent labs',
          '⭕ Planned follow-up (timing, location)',
          '✅ Next-of-kin (name, relationship, phone)'
        ]
      },
      {
        title: 'TAVI Checklist',
        icon: '🫀',
        items: [
          '✅ Indication (e.g., severe AS)',
          '✅ Primary access (femoral/other)',
          '✅ Secondary access',
          '✅ Valve type & size (Sapien/Evolut, mm)',
          '✅ Wire (Safari/Confida/Lunderquist)',
          '✅ Balloon size (mm, if planned)',
          '✅ Pacing wire access',
          '✅ Closure device plan (ProStyle/Angio-Seal)',
          '✅ Protamine plan (yes/no, contraindications)',
          '✅ Goals of care (theatre status, gradient)',
          '⭕ Sedation plan',
          '⭕ Site prep (both femorals + antiseptic)',
          '⭕ Allergies',
          '⭕ Recent labs',
          '⭕ Planned follow-up (timing, location)',
          '✅ Next-of-kin'
        ]
      },
      {
        title: 'MITRAL TEER Checklist',
        icon: '🫀',
        items: [
          '✅ Indication (MR severity)',
          '✅ Access site (femoral venous)',
          '✅ Transeptal catheter(s)',
          '✅ Wire (super-stiff for guide)',
          '✅ Closure device plan (usually 2× ProStyle)',
          '✅ Echo findings (key summary)',
          '⭕ Device type (NTW/XT)',
          '⭕ Sedation plan',
          '⭕ Anticoagulation plan',
          '⭕ Site prep',
          '⭕ Allergies',
          '⭕ Recent labs',
          '⭕ Planned follow-up (timing, location)',
          '✅ Next-of-kin'
        ]
      }
    ],
    tips: [
      'Start by stating the procedure type clearly',
      '✅ = REQUIRED field (must include)',
      '⭕ = OPTIONAL field (include if mentioned)',
      'Keep Next-of-Kin format: "Name (relationship) phone"',
      'For TAVI: Always include Protamine plan and goals',
      'For Angio/RHC: DO NOT mention Protamine or pacing wires'
    ],
    terminology: [
      'Access: radial, femoral, basilic, jugular',
      'Antiseptics: chlorhexidine, betadine',
      'TAVI valves: Sapien 3 Ultra, Evolut R/Pro',
      'Wires: Safari, Confida, Lunderquist',
      'Closure: ProStyle, Angio-Seal, Perclose',
      'Sedation: light, moderate, GA',
      'Labs: Hb g/L, Creatinine µmol/L'
    ]
  }
] as const;

/**
 * Get recording prompt configuration by agent type
 */
export function getRecordingPrompt(agentType: AgentType): RecordingPromptConfig | undefined {
  return RECORDING_PROMPTS.find(prompt => prompt.id === agentType);
}

/**
 * Check if recording prompt exists for agent type
 */
export function hasRecordingPrompt(agentType: AgentType): boolean {
  return RECORDING_PROMPTS.some(prompt => prompt.id === agentType);
}

/**
 * Get all available recording prompt IDs
 */
export function getRecordingPromptIds(): AgentType[] {
  return RECORDING_PROMPTS.map(prompt => prompt.id);
}

/**
 * Debug function to test recording prompt functionality
 */
export function debugRecordingPrompts(): void {
  console.log('🔍 Recording Prompts Debug:');
  console.log('Available prompts:', getRecordingPromptIds());
  
  // Test each workflow ID including quick actions
  const testIds: AgentType[] = [
    'tavi', 'angiogram-pci', 'quick-letter', 'consultation', 
    'mteer', 'pfo-closure', 'right-heart-cath',
    'investigation-summary', 'background', 'medication'
  ];
  
  testIds.forEach(id => {
    const hasPrompt = hasRecordingPrompt(id);
    const promptConfig = getRecordingPrompt(id);
    console.log(`- ${id}: hasPrompt=${hasPrompt}, config=${promptConfig ? 'found' : 'missing'}`);
  });
}
