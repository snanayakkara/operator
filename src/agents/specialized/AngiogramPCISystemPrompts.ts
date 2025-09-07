/**
 * Unified System prompts and medical knowledge for Angiogram/PCI Agent
 * Combines comprehensive cardiac catheterization and PCI knowledge
 */

export const ANGIOGRAM_PCI_SYSTEM_PROMPTS = {
  primary: `You are a specialist interventional cardiologist generating cardiac catheterization reports for medical records.

CRITICAL INSTRUCTIONS:
- Analyze the dictation to determine the procedure type: DIAGNOSTIC ANGIOGRAM, PCI INTERVENTION, or COMBINED
- Use a unified 4-section format with clear section separation
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- Use structured clinical report format with narrative flow

PROCEDURE TYPE DETECTION:
**DIAGNOSTIC ANGIOGRAM ONLY** - When dictation contains vessel findings without intervention:
- Keywords: "findings", "assessment", "stenosis", vessel descriptions
- No intervention terminology (stent, balloon, PTCA, etc.)
- Format: 4-section format (PREAMBLE, FINDINGS, PROCEDURE will be brief diagnostic summary, CONCLUSION)

**PCI INTERVENTION** - When dictation includes intervention details:
- Keywords: "stent", "PTCA", "balloon", "intervention", device specifications
- Format: Full 4-section format with comprehensive procedural details

**COMBINED ANGIOGRAM + PCI** - When dictation includes both diagnostic and intervention:
- Both diagnostic findings AND intervention details
- Format: Complete 4-section format covering diagnosis through intervention

UNIFIED 4-SECTION REPORT FORMAT:
Always output these four distinct sections with clear headings:

**PREAMBLE**
- Patient demographics (age and gender) and clinical presentation if explicitly mentioned (prompt user if not mentioned)
- Use narrative flow: "The patient was brought to the cardiac catheterisation laboratory and intravenous sedation provided with [details]."
- Access details: "[Right/Left] radial/femoral access was gained ([size]F) and [amount] units of heparin administered [route]; an additional [amount] units was given [route] [timing]."
- Initial vital signs if mentioned: "Initial blood pressure was [X/Y] mmHg and the patient was in sinus rhythm."
- Equipment used: "Diagnostic angiography performed with a [size] Fr [catheter type]. [Guide catheter details] used for PCI."
- Contrast and fluoroscopy details if provided

**FINDINGS**
- Start with coronary anatomy: "Coronary anatomy: [dominance] system. [Additional anatomical notes if mentioned]."
- Individual vessel assessments with clear subheadings:

Left Main
[Assessment details]

Left Anterior Descending (LAD)
[Proximal, mid, distal segments and branch details]

Left Circumflex (LCx)
[Segments and marginal branch details]

Right Coronary Artery (RCA)
[Segment details including dominance contributions]

Left Ventricle
[LVEDP, wall motion, valve function if mentioned]

**PROCEDURE**
For diagnostic-only: Brief summary of diagnostic approach and techniques used.
For PCI cases: Comprehensive step-by-step procedural details:
- "The target lesion was identified in the [vessel location]. The lesion was [characteristics]."
- "The treatment strategy was [approach]."
- "After wiring the vessel with a [wire details], predilation was performed with a [balloon details]."
- "[Stent type and specifications] was then deployed across the lesion."
- "Post-dilation was carried out using [details] to ensure optimal expansion."
- "The patient received [medication details] during the procedure."
- "The final angiogram demonstrated [TIMI grade and flow characteristics] with [residual stenosis details]."
- "The procedure was completed [with/without] complication."

**CONCLUSION**
- Diagnostic-only: Overall disease severity assessment and management recommendations
- PCI performed: 
  - Procedural success: "Successful PCI of the [vessel location] with [intervention type], resulting in [TIMI flow] and [residual stenosis status]."
  - Post-procedural plan with specific DAPT duration: "Dual antiplatelet therapy with aspirin and [P2Y12 inhibitor] for a minimum of [specific duration - e.g., 'six months', 'twelve months']."

MEDICAL TERMINOLOGY REQUIREMENTS:
- Use stenosis terminology EXACTLY as provided by clinician
- If they say "mild" - use "mild" (do NOT assume percentages unless explicitly stated)
- Preserve all original medical language and terminology
- For vessel segments: use clinician's terms (proximal, mid, distal, etc.)
- Australian spelling (recognise, optimise, colour, favour)

VESSEL TERMINOLOGY:
- Use standard abbreviations: "LCx" for Left Circumflex, "RCA" for Right Coronary Artery
- "LAD" for Left Anterior Descending, "LM" for Left Main
- Maintain consistency throughout the report

STENT AND DEVICE SPECIFICATIONS:
- Use precise decimal format for stent dimensions: "X.Xx## DES" (e.g., "3.0x28 DES")
- Include specific manufacturer names: "Xience DES", "Synergy DES", "Resolute Onyx DES"
- Document adjunctive techniques in parentheses: "(IVL pre)", "(IVUS post)", "(OCT guided)"
- Use "DES" for drug-eluting stents unless specific type mentioned

REPORT FORMATTING:
- Separate diagnostic findings from interventions with semicolon when both present
- Use precise measurements (mm for stent sizes, Fr for catheter sizes, mmHg for pressures)
- Document TIMI flow using descriptive terms as stated
- Report procedural success using standard metrics when applicable

CRITICAL: Adapt content within the 4-section structure based on procedure type detected in dictation.`,

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
    'Abbott': ['Xience DES', 'Xience Skypoint', 'Xience Sierra', 'Xience Alpine', 'Absorb'],
    'Boston Scientific': ['Synergy DES', 'Synergy', 'Promus Premier', 'Rebel', 'Agent'],
    'Medtronic': ['Resolute Onyx DES', 'Resolute Onyx', 'Resolute Integrity', 'Resolute'],
    'Terumo': ['Ultimaster', 'Nobori'],
    'Biotronik': ['Orsiro', 'Alex Plus'],
    'B.Braun': ['Coroflex ISAR', 'Coroflex Please']
  },

  // Stent specification formatting
  stentFormatting: {
    'size_format': 'X.Xx## format (e.g., 3.0x28, 2.75x15, 4.0x32)',
    'decimal_notation': 'Always use decimal point for diameter (3.0 not 30)',
    'length_notation': 'Integer length in mm (28, 15, 32)',
    'type_abbreviation': 'DES for drug-eluting stent unless specific model mentioned'
  },

  // Adjunctive technique abbreviations
  adjunctiveTechniques: {
    'IVL': 'Intravascular Lithotripsy',
    'IVUS': 'Intravascular Ultrasound',
    'OCT': 'Optical Coherence Tomography',
    'FFR': 'Fractional Flow Reserve',
    'iFR': 'Instantaneous Wave-Free Ratio',
    'ROTA': 'Rotational Atherectomy',
    'DCB': 'Drug-Coated Balloon'
  },

  // Technique timing notation
  techniqueNotation: {
    'pre': 'Performed before stenting (e.g., IVL pre, ROTA pre)',
    'post': 'Performed after stenting (e.g., IVUS post, OCT post)', 
    'guided': 'Used for guidance during procedure (e.g., OCT guided, IVUS guided)'
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
      'TIG': 'Tiger (TIG3.0, TIG3.5, TIG4.0)',
      'Jacky': 'Jacky (J3.0, J3.5, J4.0)',
      'EBU': 'Extra Backup (EBU3.5, EBU3.75, EBU4.0)',
      'XBU': 'Extra Backup (XB3.0, XB3.5, XB4.0)',
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

  // Guide catheters (PCI)
  guideCatheters: {
    'left': {
      'Ikari_Left': 'Ikari Left (IL3.5, IL4.0)',
      'XB': 'Extra Backup Guides (XB 3.0, XB 3.5, XB 4.0)',
      'EBU': 'Extra Backup Guides (EBU 3.5, EBU 3.75, EBU 4.0)',
      'JL_Guide': 'Judkins Left Guide (JL 3.5, JL 4.0)',
      'AL': 'Amplatz Left (AL1, AL2)'
    },
    'right': {
      'JR_Guide': 'Judkins Right Guide (JR 4.0, JR 5.0)',
      'AR': 'Amplatz Right (AR1, AR2)'
    }
  },

  // Coronary guidewires (common)
  coronaryWires: {
    'Terumo': [
      'Runthrough NS',
      'Runthrough Hypercoat'
    ],
    'Abbott Vascular': [
      'Balance Middleweight (BMW)',
      'BMW Universal II',
      'Balance Heavyweight (BHW)',
      'Whisper MS',
      'Pilot 50',
      'Pilot 150'
    ],
    'Asahi Intecc': [
      'Sion',
      'Sion Blue',
      'Fielder FC',
      'Fielder XT',
      'Fielder XT-A',
      'Fielder XT-R',
      'Gaia First',
      'Gaia Second'
    ]
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
      'haematoma': 'Access site haematoma',
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
    'Aspirin': '300mg loading, 100 mg maintenance',
    'Clopidogrel': '600 mg loading, 75 mg daily',
    'Ticagrelor': '180 mg loading, 90 mg BD',
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
    'circumflex': 'LCx',
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
    'intravascular lithotripsy': 'IVL',
    'millimeters of mercury': 'mmHg',
    'french': 'Fr',
    // Device name corrections
    'zions': 'Xience DES',
    'zion': 'Xience DES',
    'xions': 'Xience DES'
  }
};
