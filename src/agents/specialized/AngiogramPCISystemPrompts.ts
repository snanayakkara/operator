/**
 * Unified System prompts and medical knowledge for Angiogram/PCI Agent
 * Combines comprehensive cardiac catheterization and PCI knowledge
 * Extracted from Reflow2 with enhanced clinical terminology and assessment frameworks
 */

export const ANGIOGRAM_PCI_SYSTEM_PROMPTS = {
  primary: `You are a specialist interventional cardiologist generating cardiac catheterization reports for medical records.

CRITICAL INSTRUCTIONS:
- Analyze the dictation to determine the procedure type: DIAGNOSTIC ANGIOGRAM, PCI INTERVENTION, or COMBINED
- Generate appropriate report format based on procedure type detected
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- Use structured clinical report format

PROCEDURE TYPE DETECTION:
**DIAGNOSTIC ANGIOGRAM ONLY** - When dictation contains vessel findings without intervention:
- Keywords: "findings", "assessment", "stenosis", vessel descriptions
- No intervention terminology (stent, balloon, PTCA, etc.)
- Format: Concise 3-section format (PREAMBLE, FINDINGS, CONCLUSION)

**PCI INTERVENTION** - When dictation includes intervention details:
- Keywords: "stent", "PTCA", "balloon", "intervention", device specifications
- Format: Comprehensive procedural report with intervention sections

**COMBINED ANGIOGRAM + PCI** - When dictation includes both diagnostic and intervention:
- Both diagnostic findings AND intervention details
- Format: Full procedural report covering diagnosis through intervention

DIAGNOSTIC ANGIOGRAM FORMAT (3-section):
**PREAMBLE**
- Patient demographics and clinical history ONLY if explicitly mentioned
- Procedure details (access site, catheters, technique) ONLY if specified
- Keep concise - 2-3 sentences maximum

**FINDINGS**
Present findings in this exact order:
- Left Main: [assessment]
- Left Anterior Descending: [proximal, mid, distal segments and branches]  
- Circumflex: [segments and marginal branches]
- Right Coronary Artery: [include dominance pattern]
- Left ventricle and valves: [LVEDP, wall motion, valve function if mentioned]

**CONCLUSION**
- Overall disease severity assessment
- Management recommendation (medical therapy, PCI, CABG, etc.)
- Keep to 1-2 sentences maximum

PCI INTERVENTION FORMAT (comprehensive):
**PROCEDURE PERFORMED**: Percutaneous Coronary Intervention (PCI)
**INDICATION**: Clinical presentation and indication
**VASCULAR ACCESS**: Access site, sheath size, approach details
**CORONARY ANATOMY**: Vessel dominance and baseline findings
**TARGET LESION**: Detailed lesion characteristics and location
**INTERVENTION STRATEGY**: Procedural approach and rationale
**DEVICE DEPLOYMENT**: Stent/balloon specifications and deployment details
**PROCEDURAL TECHNIQUE**: Step-by-step intervention details
**HEMODYNAMIC ASSESSMENT**: Pressure measurements and flow assessment
**ANGIOGRAPHIC RESULT**: Final angiographic outcome and TIMI flow
**COMPLICATIONS**: Procedural complications and management (if applicable)
**MEDICATION MANAGEMENT**: Antiplatelet and anticoagulation strategy
**FINAL ASSESSMENT**: Procedural success metrics and immediate outcomes
**RECOMMENDATIONS**: Post-procedural care and follow-up plan

MEDICAL TERMINOLOGY REQUIREMENTS:
- Use stenosis terminology EXACTLY as provided by clinician
- If they say "mild" - use "mild" (do NOT assume percentages unless explicitly stated)
- Preserve all original medical language and terminology
- For vessel segments: use clinician's terms (proximal, mid, distal, etc.)
- Australian spelling (recognise, optimise, colour, favour)
- Include specific device details (manufacturer, model, size, length) when mentioned
- Document TIMI flow using descriptive terms as stated
- Use precise measurements (mm for stent sizes, Fr for catheter sizes, mmHg for pressures)
- Report procedural success using standard metrics when applicable

CRITICAL: Adapt report structure based on procedure type detected in dictation.`,

  procedureDetection: `You are analyzing cardiac catheterization dictation to determine procedure type.

Analyze the following dictation and classify as:

1. **DIAGNOSTIC_ANGIOGRAM** - Pure diagnostic assessment
   - Contains vessel findings, stenosis descriptions, anatomical details
   - NO intervention terminology (stent, balloon, PTCA, device deployment)
   - Focus on vessel assessment and recommendations

2. **PCI_INTERVENTION** - Intervention procedure (with or without detailed diagnostic findings)
   - Contains intervention keywords: stent, PTCA, balloon angioplasty, device deployment
   - May include specific device details (manufacturer, model, size)
   - Procedural techniques and outcomes described

3. **COMBINED** - Both diagnostic findings AND intervention details
   - Comprehensive dictation with vessel findings AND intervention
   - Both diagnostic assessment and procedural intervention described

Return only one word: DIAGNOSTIC_ANGIOGRAM, PCI_INTERVENTION, or COMBINED`,

  missingInfoDetection: `You are reviewing cardiac catheterization dictation for completeness.

ASSESS MISSING INFORMATION for the detected procedure type:

**FOR DIAGNOSTIC ANGIOGRAM:**
- Vessel segments (LM, LAD, LCx, RCA, branches)
- Procedural details (access site, catheters, contrast, fluoroscopy time)
- Functional assessment (LVEDP, dominance, collaterals)
- Hemodynamics (pressures, cardiac output)

**FOR PCI INTERVENTION:**
- All diagnostic elements above PLUS:
- Target lesion characteristics
- Device specifications (stent type, size, manufacturer)
- Procedural technique details
- Angiographic outcomes (TIMI flow, residual stenosis)
- Complications (if any)
- Medications (antiplatelet, anticoagulation)

OUTPUT FORMAT:
{
  "procedure_type": "DIAGNOSTIC_ANGIOGRAM|PCI_INTERVENTION|COMBINED",
  "missing_diagnostic": ["list of missing diagnostic elements"],
  "missing_intervention": ["list of missing intervention elements"],
  "completeness_score": "percentage of expected information provided"
}`
};

export const ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE = {
  // Combined vessel anatomy from both agents
  coronarySegments: {
    // Left Main
    'LM': 'Left Main Coronary Artery',
    
    // Left Anterior Descending System
    'LAD-1': 'Proximal LAD (ostium to first major side branch)',
    'LAD-2': 'Mid LAD (first major side branch to second major side branch)',
    'LAD-3': 'Distal LAD (second major side branch to apex)',
    'D1': 'First Diagonal Branch',
    'D2': 'Second Diagonal Branch',
    'S1': 'First Septal Perforator',
    'S2': 'Second Septal Perforator',
    
    // Left Circumflex System  
    'LCx-1': 'Proximal LCx (ostium to first obtuse marginal)',
    'LCx-2': 'Mid LCx (first OM to second OM)',
    'LCx-3': 'Distal LCx (second OM to terminus)',
    'OM1': 'First Obtuse Marginal',
    'OM2': 'Second Obtuse Marginal',
    'OM3': 'Third Obtuse Marginal',
    'LPL': 'Left Posterolateral Branch',
    'LPDA': 'Left Posterior Descending Artery',
    
    // Right Coronary Artery System
    'RCA-1': 'Proximal RCA (ostium to first right ventricular branch)',
    'RCA-2': 'Mid RCA (first RV branch to acute marginal)',
    'RCA-3': 'Distal RCA (acute marginal to crux)',
    'AM': 'Acute Marginal Branch',
    'PDA': 'Posterior Descending Artery',
    'RPL': 'Right Posterolateral Branch',
    'RPDA': 'Right Posterior Descending Artery',
    
    // Ramus Intermedius
    'RI': 'Ramus Intermedius (when present)'
  },

  // Stenosis severity grading
  stenosisGrading: {
    'normal': '0-29% - Normal or minimal plaque',
    'mild': '30-49% - Mild stenosis',
    'moderate': '50-69% - Moderate stenosis', 
    'severe': '70-89% - Severe stenosis',
    'critical': '90-99% - Critical stenosis',
    'total': '100% - Total occlusion'
  },

  // TIMI flow grades
  timiFlow: {
    '0': 'TIMI 0 - No perfusion beyond occlusion',
    'I': 'TIMI I - Penetration without perfusion',
    'II': 'TIMI II - Partial perfusion with delayed flow',
    'III': 'TIMI III - Complete perfusion with normal flow'
  },

  // PCI-specific stent knowledge
  stentTypes: {
    'DES': 'Drug-Eluting Stent',
    'BMS': 'Bare Metal Stent',
    'BVS': 'Bioresorbable Vascular Scaffold',
    'DCS': 'Drug-Coated Stent'
  },

  stentManufacturers: {
    'Abbott': ['Xience Xpedition', 'Xience Sierra', 'Xience Alpine', 'Absorb'],
    'Boston Scientific': ['Synergy', 'Promus Premier', 'Rebel', 'Agent'],
    'Medtronic': ['Resolute Onyx', 'Resolute Integrity', 'Resolute'],
    'Terumo': ['Ultimaster', 'Nobori'],
    'Biotronik': ['Orsiro', 'Alex Plus'],
    'MicroPort': ['Firehawk', 'BuMA Supreme'],
    'B.Braun': ['Coroflex ISAR', 'Coroflex Please']
  },

  stentSizes: {
    diameters: ['2.0', '2.25', '2.5', '2.75', '3.0', '3.25', '3.5', '3.75', '4.0', '4.25', '4.5', '5.0'],
    lengths: ['8', '12', '15', '18', '20', '23', '28', '32', '38', '48']
  },

  // Intervention techniques
  interventionTypes: {
    'PTCA': 'Percutaneous Transluminal Coronary Angioplasty',
    'Stenting': 'Coronary Stent Implantation',
    'ROTA': 'Rotational Atherectomy',
    'DCA': 'Directional Coronary Atherectomy',
    'Thrombectomy': 'Aspiration or Mechanical Thrombectomy',
    'Cutting Balloon': 'Cutting Balloon Angioplasty',
    'DCB': 'Drug-Coated Balloon',
    'IVUS': 'Intravascular Ultrasound Guidance',
    'OCT': 'Optical Coherence Tomography Guidance',
    'FFR': 'Fractional Flow Reserve Assessment'
  },

  // Collateral circulation (Rentrop Classification)
  collateralGrading: {
    '0': 'Grade 0 - No visible collateral circulation',
    '1': 'Grade 1 - Barely visible collaterals with minimal filling',
    '2': 'Grade 2 - Partial collateral filling of vessel',
    '3': 'Grade 3 - Complete collateral filling via well-developed channels'
  },

  // Coronary dominance patterns
  dominancePatterns: {
    'right': 'Right Dominant - RCA gives rise to PDA and posterolateral branches',
    'left': 'Left Dominant - LCx gives rise to PDA and posterolateral branches',
    'codominant': 'Co-dominant - Both RCA and LCx contribute to posterior circulation'
  },

  // Access sites and approaches
  accessSites: {
    'right_radial': 'Right radial artery access',
    'left_radial': 'Left radial artery access', 
    'right_femoral': 'Right common femoral artery access',
    'left_femoral': 'Left common femoral artery access',
    'brachial': 'Brachial artery access',
    'ulnar': 'Ulnar artery access'
  },

  // Diagnostic catheters
  diagnosticCatheters: {
    'left_coronary': {
      'JL': 'Judkins Left (JL3.5, JL4.0, JL5.0)',
      'EBU': 'Extra Backup (EBU3.5, EBU3.75, EBU4.0)',
      'XBU': 'Extra Backup (XBU3.5, XBU4.0)',
      'voda': 'Voda Left',
      'amplatz_left': 'Amplatz Left (AL1, AL2)'
    },
    'right_coronary': {
      'JR': 'Judkins Right (JR4.0, JR5.0, JR6.0)',
      'amplatz_right': 'Amplatz Right (AR1, AR2)',
      'hockey_stick': 'Hockey Stick',
      'multipurpose': 'Multipurpose (MP)',
      '3drc': '3DRC (3D Right Coronary)'
    }
  },

  // Hemodynamic normal values
  hemodynamicNormals: {
    'aortic_systolic': '100-140 mmHg',
    'aortic_diastolic': '60-90 mmHg',
    'lvedp': '<12 mmHg (normal), 12-15 mmHg (borderline), >15 mmHg (elevated)',
    'heart_rate': '60-100 bpm',
    'cardiac_output': '4-8 L/min',
    'cardiac_index': '2.5-4.0 L/min/m²',
    'FFR': 'Normal >0.80, Abnormal ≤0.80'
  },

  // Lesion morphology classification
  lesionMorphology: {
    'Type A': 'Discrete, concentric, readily accessible, non-angulated, smooth contours',
    'Type B1': 'Tubular, eccentric, moderate tortuosity, moderate angulation',
    'Type B2': 'Tubular, eccentric, moderate tortuosity, moderate angulation with 2 characteristics',
    'Type C': 'Diffuse, excessive tortuosity, extremely angulated, total occlusion'
  },

  // Complications (combined from both agents)
  complications: {
    'access_site': {
      'hematoma': 'Access site hematoma',
      'pseudoaneurysm': 'Pseudoaneurysm formation',
      'dissection': 'Access vessel dissection'
    },
    'coronary': {
      'dissection': 'Coronary artery dissection requiring management',
      'perforation': 'Coronary perforation with potential pericardial effusion',
      'no_reflow': 'No-reflow phenomenon requiring pharmacological intervention',
      'spasm': 'Coronary artery spasm',
      'side_branch_occlusion': 'Side branch occlusion requiring assessment'
    },
    'systemic': {
      'contrast_nephropathy': 'Contrast-induced nephropathy risk',
      'allergic_reaction': 'Contrast allergic reaction',
      'arrhythmia': 'Periprocedural arrhythmia'
    }
  },

  // Antiplatelet therapy
  antiplateletTherapy: {
    'Aspirin': '81-325 mg loading, 81 mg maintenance',
    'Clopidogrel': '600 mg loading, 75 mg daily',
    'Ticagrelor': '180 mg loading, 90 mg BID',
    'Prasugrel': '60 mg loading, 10 mg daily (5 mg if <60 kg)'
  },

  // Quality metrics
  qualityMetrics: {
    'contrast_volume': 'Total contrast <3× eGFR mL or <300 mL',
    'fluoroscopy_time': 'Minimise radiation exposure (ALARA)',
    'procedural_success': 'TIMI III flow, optimal angiographic result',
    'door_to_balloon': '<90 minutes for STEMI',
    'radial_access': '>90% for stable patients'
  },

  // Comprehensive terminology corrections
  terminologyCorrections: {
    'left anterior descending': 'LAD',
    'left circumflex': 'LCx', 
    'right coronary artery': 'RCA',
    'left main': 'LM',
    'percutaneous coronary intervention': 'PCI',
    'percutaneous transluminal coronary angioplasty': 'PTCA',
    'drug eluting stent': 'DES',
    'bare metal stent': 'BMS',
    'thrombolysis in myocardial infarction': 'TIMI',
    'fractional flow reserve': 'FFR',
    'intravascular ultrasound': 'IVUS',
    'optical coherence tomography': 'OCT',
    'millimeters of mercury': 'mmHg',
    'french': 'Fr'
  }
};