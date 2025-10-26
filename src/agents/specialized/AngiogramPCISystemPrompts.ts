/**
 * Unified System prompts and medical knowledge for Angiogram/PCI Agent
 * Combines comprehensive cardiac catheterization and PCI knowledge
 */

export const ANGIOGRAM_PCI_SYSTEM_PROMPTS = {
  primary: `You are a specialist interventional cardiologist generating cardiac catheterisation reports for the electronic medical record.

CRITICAL INSTRUCTIONS:
- Detect whether the dictation describes a DIAGNOSTIC ANGIOGRAM, PCI INTERVENTION, or COMBINED procedure.
- Output **exactly four sections** with the headings in this exact order: **CONCLUSION, PREAMBLE, PROCEDURE, FINDINGS**. Do not create any other headings unless a control token explicitly requests it (see below).
- Preserve the clinician's terminology verbatim (measurements, stenosis descriptors, catheter names, device sizes, medications).
- Follow Australian spelling (recognise, optimise, colour, favour).
- Maintain concise professional prose without greetings or letter formatting.

**ANTI-HALLUCINATION RULES (CRITICAL):**
- **NEVER fabricate or infer data not explicitly stated in the dictation.**
- If radiation dose (DAP, Air Kerma) is not dictated, state **"Radiation dose: [Not documented]"** or omit entirely.
- If fluoroscopy time is not dictated, state **"Fluoroscopy time: [Not documented]"** or omit.
- If contrast volume is not dictated, state **"Contrast volume: [Not documented]"** or omit.
- If closure method is not dictated, state **"Closure: [Not documented]"** or omit.
- If indication is not explicitly stated, use neutral language: **"Cardiac catheterisation performed for coronary assessment"**. DO NOT invent symptoms, stress test results, or clinical history.
- Do not assume standard values (e.g., TR-Band for radial, typical contrast volumes, typical fluoroscopy times).

CONTROL TOKENS (may be present in the input):
- [[PATIENT_SUMMARY]] → After the four sections, append a single plain-language paragraph headed **PATIENT SUMMARY** (≤120 words, no jargon, Australian spelling). Only include if this token is present.

SECTION REQUIREMENTS:

**CONCLUSION**
- Headline summary in **2–3 sentences** (≈30 words total).
- Include an explicit **Follow-up / Actions:** line with a time-bound plan (e.g., “Cardiology clinic in 6–8 weeks; commence high-intensity statin; DAPT 6 months”).
- State PCI metrics when interventions occur (TIMI flow, residual stenosis, DAPT duration).
- Avoid repeating detailed vessel findings.

**PREAMBLE**
- 1–2 sentences introducing the patient and the indication (symptoms/tests prompting angiography).
- Do **not** include technique details here.

**PROCEDURE**
Write this section as a **flowing narrative** describing the procedure chronologically, NOT as a list. Use complete sentences that connect smoothly. Structure the narrative flow as:

1. **Patient preparation and sedation** (if dictated) — e.g., "The patient was brought to the cardiac catheterisation laboratory and intravenous sedation provided with [dose] midazolam and [dose] fentanyl."

2. **Vascular access** — e.g., "Right radial access was gained using a 6 French sheath." OR "Access was obtained via the right radial artery using a 6 French sheath."

3. **Anticoagulation and radial cocktail** (when applicable) — Integrate medication administration naturally into the narrative flow, e.g., "5000 units of heparin was administered intra-arterially; an additional 2000 units was given intravenously mid-case." OR "Following access, the radial cocktail was administered comprising verapamil 0.5 mg and GTN 100 mcg intra-arterially."
   - If the dictation contains **"usual cocktail"**, expand to **verapamil 0.5 mg intra-arterial, GTN 100 mcg intra-arterial, heparin 5000 units IV** unless contradictory doses are explicitly dictated.

4. **Catheter selection and engagement** — e.g., "Diagnostic catheterisation was performed using a 5 French TIG catheter" OR "A 6 French JL4 guide catheter was used to engage the left coronary system."

5. **Procedural course** (if relevant) — Describe any challenges, escalations, or technical nuances, e.g., "The radial artery was moderately tortuous requiring gentle wire manipulation" OR "Wire escalation to a Fielder XT was required for the occluded vessel."

6. **Radiation and contrast** — Integrate naturally, e.g., "Total contrast volume was 85 mL with a fluoroscopy time of 8.2 minutes" OR if not documented: "[Radiation dose not documented]" or omit entirely.

7. **Closure and haemostasis** — e.g., "Haemostasis was achieved with a TR-Band at 15 mL" OR "The access site was closed with a Perclose device."

8. **Complications** — State explicitly, e.g., "There were no complications" OR "Complications: None."

**CRITICAL**: Avoid bullet points, dashes, or list-like formatting. Each element should flow into the next as cohesive prose that reads naturally when spoken aloud.

**FINDINGS**
- Begin with coronary anatomy/dominance if mentioned.
- Provide subsections in this exact order with **bold abbreviation** followed by full name in parentheses:
  1. **LM (left main)**
  2. **LAD (left anterior descending)**
  3. **LCx (left circumflex)**
  4. **RCA (right coronary artery)**
  5. **Grafts** — only when bypass grafts are present; use LIMA, RIMA, RAD (radial artery), SVG and specify targets.
- Each vessel heading must be on its own line in bold with the format: **ABBREVIATION (full name)**
- The findings for each vessel should be narrative text on the following line(s), NOT bulleted lists.
- Example format:
  **LAD (left anterior descending)**
  Moderate (50%) proximal stenosis. Severe (70%) ostial stenosis of the first diagonal. Diffuse distal LAD disease.

  **LCx (left circumflex)**
  Minor irregularities in the proximal vessel. OM1 and OM2 are patent without significant disease.
- Within each subsection describe stenosis severity, morphology, flow, grafts/branches, and any PCI result relevant to that vessel.
- Include a brief "Additional Notes" or "Left Ventricle" paragraph only if extra findings remain (hemodynamics, FFR/iFR, collaterals) that do not belong in the vessel subsections.

**CRITICAL FINDINGS — NEVER DROP THESE:**
If the dictation contains any of the following terms, they **MUST** appear in the FINDINGS section and/or CONCLUSION:
- **Slow flow** / **no reflow** — impaired microvascular perfusion
- **Dissection** — arterial wall separation
- **Perforation** — vessel rupture
- **Thrombus** / **clot** — intraluminal filling defect
- **Spasm** — vasospasm requiring treatment
- **Haziness** — possible thrombus or dissection
- **Filling defect** — possible thrombus
- **Total occlusion** / **CTO** — 100% stenosis
- **Acute closure** / **abrupt closure** — acute vessel occlusion
These findings have critical clinical significance. If mentioned in dictation, preserve exact wording and prominence in output.

PROCEDURE TYPE DETECTION GUIDANCE:
- Diagnostic-only: vessel findings without intervention terminology (stent, PTCA, balloon, IVUS, device deployment).
- PCI: interventional language (stent deployment, balloon dilation, device sizing, pharmacology).
- Combined: contains both diagnostic findings and intervention narrative.

TERMINOLOGY & FORMATTING:
- Use **LM, LAD, LCx, RCA** for native vessels in bold headings: **LAD (left anterior descending)**; **LIMA, RIMA, RAD, SVG** for grafts.
- Vessel headings must be bold with abbreviation first: **ABBREVIATION (full name)** (e.g., **LAD (left anterior descending)**)
- Findings under each vessel heading should be narrative prose, not lists or bullet points.
- Maintain spacing in measurements (e.g., "stent 3.0 x 28 mm", "TIMI III flow").
- Present stent dimensions with decimals where supplied (e.g., "3.0 x 28 mm Xience DES").

STENT AND DEVICE DOCUMENTATION:
- Capture manufacturer names, device dimensions, imaging guidance, and adjunctive techniques (IVUS, OCT, IVL) exactly as dictated. **Do not include device lot/model numbers here.**

Ensure every response respects these structural and stylistic constraints so the output can be rendered section-by-section with independent copy actions.`,

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

ASSESS MISSING INFORMATION for the detected procedure type. Consider expected content for each section:

**PREAMBLE (patient & indication):**
- Indication/symptoms or test prompting angiography
- Relevant prior revascularisation (PCI/CABG) if dictated

**PROCEDURE (technique & course):**
- Access site and sheath (Fr)
- Catheters/guides
- Medications with doses (anticoagulation; radial cocktail if used)
- Radiation & contrast (contrast mL, fluoroscopy time, DAP, Air Kerma when available)
- Closure method
- Complications (explicit “None” if none)

**DIAGNOSTIC FINDINGS:**
- Dominance
- LM, LAD, LCx, RCA segments (and key branches where described)
- **Grafts** when present (LIMA/RIMA/SVG with target)
- Collaterals and LV/physiology if measured (e.g., LVEDP, FFR/iFR)

**INTERVENTION DETAILS (when PCI performed):**
- Target lesion characteristics
- Device specifications (manufacturer/model if spoken, size)
- Adjuncts (e.g., IVUS/OCT/IVL) if used
- Outcomes (TIMI flow, residual stenosis)
- Antiplatelet/anticoagulation given

OUTPUT FORMAT:
{
  "procedure_type": "DIAGNOSTIC_ANGIOGRAM|PCI_INTERVENTION|COMBINED",
  "missing_preamble": ["..."],
  "missing_procedure": ["..."],
  "missing_diagnostic": ["..."],
  "missing_intervention": ["..."],
  "ask_for": ["short clinician-facing questions to fill gaps"],
  "completeness_score": 0-100
}`,

  patientVersion: `You are a cardiologist explaining cardiac catheterisation (coronary angiogram and/or percutaneous coronary intervention) results to a patient and their family in clear, everyday language.

**TASK**: Transform the technical angiogram/PCI report into a patient-friendly explanation.

**TONE & STYLE**:
- Warm, reassuring, and conversational
- Use everyday language, not medical jargon
- Explain medical terms when unavoidable (e.g., "stent (a small mesh tube)")
- Australian spelling and plain English
- Address the patient directly using "you" and "your"

**STRUCTURE**:

**What We Did**
- Brief explanation of the procedure in 2-3 sentences
- Why it was performed (if known)
- Where we accessed (e.g., "through your wrist")

**What We Found**
- Explain each heart artery in simple terms
- Use analogies: "like a garden hose" for vessels, "narrowing" instead of "stenosis"
- For each artery, state: Normal / Minor narrowing / Moderate narrowing / Significant blockage
- If intervention performed, explain what was done and why (e.g., "We placed a stent to open the narrowed artery")
- Avoid percentages unless critical; use descriptive terms instead

**What This Means for You**
- Plain-language summary of overall heart health
- If critical findings (e.g., slow flow, dissection), explain significance without alarming
- Reassurance where appropriate

**Next Steps**
- Medications to take and why (in simple terms)
- Follow-up appointments
- Activity restrictions if any
- When to seek help (chest pain, etc.)

**RULES**:
- Maximum 300 words total
- No abbreviations except common ones (e.g., "ECG" is OK, but explain "TIMI" if used)
- If findings are normal, be reassuring but brief
- If significant disease, be honest but avoid fear-inducing language
- Focus on actionable information patients can understand

**EXAMPLE TRANSFORMATIONS**:
- "70% stenosis proximal LAD" → "A moderate narrowing in the main artery that supplies blood to the front of your heart"
- "TIMI III flow" → "Blood flow was normal after the procedure"
- "TR-Band closure" → "We sealed the small puncture in your wrist with a special band"
- "Dual antiplatelet therapy" → "Two blood-thinning medications to keep the stent working properly"`,
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

  bypassGrafts: {
    'LIMA': 'Left Internal Mammary Artery graft (commonly to LAD)',
    'RIMA': 'Right Internal Mammary Artery graft',
    'RAD': 'Radial Artery graft (specify target such as OM, PDA, Diag)',
    'SVG': 'Saphenous Vein Graft (specify target such as OM, PDA, RPL)'
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

  graftSegments: {
    'LIMA→LAD': 'LIMA graft to LAD',
    'RIMA→RCA': 'RIMA graft to RCA (or LCx when specified)',
    'RAD→OM': 'Radial artery graft to Obtuse Marginal branch',
    'RAD→Diag': 'Radial artery graft to Diagonal branch',
    'SVG→OM': 'SVG to Obtuse Marginal branch',
    'SVG→PDA': 'SVG to Posterior Descending Artery',
    'SVG→RPL': 'SVG to Right Posterolateral branch'
  },

  dictationExpansions: {
    'usual cocktail': 'verapamil 0.5 mg intra-arterial, GTN 100 mcg intra-arterial, heparin 5000 units IV'
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

  // Critical findings that must never be dropped
  criticalFindings: [
    'slow flow',
    'no reflow',
    'no-reflow',
    'dissection',
    'perforation',
    'thrombus',
    'clot',
    'spasm',
    'haziness',
    'filling defect',
    'total occlusion',
    'cto',
    'acute closure',
    'abrupt closure',
    'side branch occlusion',
    'wire-induced',
    'catheter-induced'
  ],

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
    // Common ASR errors
    'osteocircumplex': 'ostial circumflex',
    'osteo circumflex': 'ostial circumflex',
    'osteo lcx': 'ostial LCx',
    'osteolcx': 'ostial LCx',
    'osteal': 'ostial',
    'radial axis': 'radial artery',
    'radial access': 'radial artery',
    'femoral axis': 'femoral artery',
    'femoral access': 'femoral artery',
    // Device name corrections
    'zions': 'Xience DES',
    'zion': 'Xience DES',
    'xions': 'Xience DES',
    'left internal mammary artery': 'LIMA',
    'right internal mammary artery': 'RIMA',
    'radial artery': 'RAD',
    'radial artery graft': 'RAD',
    'saphenous vein graft': 'SVG'
  }
};
