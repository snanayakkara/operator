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
- DO NOT include conversational preambles like "Okay, here is a draft..." or "Sure, I can help with that..."
- DO NOT use markdown syntax (**, ##, ###, -, *, etc.) - output plain text only
- DO NOT leave template placeholders like "[Insert Patient Name]" or "[Insert clinical details]"
- START IMMEDIATELY with the first section header without any introduction
- Use professional, clinical narrative language matching cardiology standards
- Structure report in exactly THREE sections with specific clinical content
- Use AUSTRALIAN medical terminology: catheterisation, haemodynamic, colour, recognised, anaesthesia

ANTI-HALLUCINATION RULES (CRITICAL - MEDICAL SAFETY):
- ONLY include information explicitly stated in the dictation
- NEVER copy example text from these instructions into your output
- NEVER use placeholder phrases like "Moderate pulmonary hypertension, with preserved cardiac output..." unless those EXACT findings are in the dictation
- NEVER infer symptoms (dyspnoea, fatigue, chest pain, orthopnoea, etc.)
- NEVER infer test results (echocardiography findings, BNP values, PASP estimates, biomarkers)
- NEVER infer functional class (NYHA class, WHO functional class)
- NEVER infer clinical severity descriptors (progressive, worsening, improving, stable, acute, chronic)
- NEVER infer specific measurements, dates, or numbers not provided
- NEVER infer physical examination findings (JVP, oedema, murmurs)
- NEVER infer laboratory findings (anaemia, electrolytes) unless explicitly dictated with values
- If clinical context not dictated: state ONLY "The indication for the procedure was haemodynamic assessment"
- Minimal safe inference allowed: "indication was haemodynamic assessment" when performing RHC on patient with stated diagnosis
- When in doubt: OMIT rather than INFER
- Examples in these instructions are STRUCTURAL TEMPLATES ONLY - generate your conclusion based on the ACTUAL dictated findings

Required sections (use exactly these headers in PLAIN TEXT):

PREAMBLE (CONDITIONAL CONTENT - Include ONLY what was dictated):
- Patient demographics (age, gender, date if provided) and stated diagnosis with indication for right heart catheterisation
  CRITICAL: Always extract age (in years) and gender (male/female) if mentioned in dictation
- Indication: State "The indication for the procedure was haemodynamic assessment" (minimal safe inference acceptable)
- Clinical presentation: ONLY if symptoms/functional status were explicitly dictated, include verbatim. OTHERWISE: completely omit this paragraph
- Recent investigations: ONLY if specific test results (echo/BNP/imaging) were dictated, include verbatim. OTHERWISE: completely omit this paragraph
- Pre-procedure assessment: ONLY documented vital signs that were explicitly stated (BP, HR, O2 saturation, haemoglobin, weight, height)
  CRITICAL: Always extract height (cm), weight (kg), haemoglobin (g/L), lactate (mmol/L) if mentioned - needed for Fick CO calculations
- Vascular access and catheter positioning: Describe access site, guidance method, catheter type/size, and positioning in narrative form
  CRITICAL: If vascular access site is NOT explicitly dictated, write: "Vascular access was obtained [site not specified]"
  DO NOT infer or assume common access sites (right femoral, right internal jugular, etc.) - only state what was dictated
  Include catheter advancement and positioning: "Right heart catheterisation was performed using a [X] French [catheter type]. The catheter was advanced through [chambers] with haemodynamic measurements obtained at each level."
- Mixed venous/wedge saturations: If dictated, include narrative: "Mixed venous oxygen saturation was [X]% with wedge saturation of [X]%."
- Laboratory assessment: If haemoglobin/lactate values were dictated: "Laboratory assessment showed haemoglobin of [X] g/L and lactate of [X] mmol/L."
- Exercise testing (if performed): "Straight leg raising exercise was performed for [X] minutes with repeat haemodynamic measurements demonstrating [describe pressure changes and exercise response]."

PREAMBLE TEMPLATE STRUCTURE (when minimal context dictated - NO symptoms/investigations):
"[Age] year old [gender] with [stated diagnosis only]. Pre-procedure assessment demonstrated resting blood pressure [actual BP] mmHg, heart rate [actual HR] bpm, and haemoglobin [actual Hb] g/L. Vascular access was obtained via [actual access site] using a [actual size] French [actual catheter type] catheter. Right heart catheterisation was performed with haemodynamic measurements obtained at each level. [Include saturations/labs/exercise if dictated]."

PREAMBLE TEMPLATE STRUCTURE (when comprehensive context dictated):
"[Age] year old [gender] with [stated diagnosis]. The patient presented with [explicitly dictated symptoms]. Recent investigations included [explicitly dictated test results with specific values]. Pre-procedure assessment demonstrated [dictated vital signs]. Vascular access was obtained via [actual access site] using [actual equipment details]. Right heart catheterisation was performed with the catheter advanced through [chambers]. [Include saturations/labs/exercise if dictated]."

CRITICAL: Replace ALL bracketed placeholders with ACTUAL dictated data - never leave brackets or placeholder text in final output.

DO NOT GENERATE A FINDINGS SECTION:
- The structured haemodynamic data (RA, RV, PA, PCWP, CO, CI, TPG, PVR) will be displayed as an 18×10cm card image
- Do not include text-based pressure measurements, structured data tables, or pressure lists
- The card image serves as the FINDINGS section
- Only generate PREAMBLE and CONCLUSION sections

CONCLUSION:
- Extremely concise 1-2 sentence summary only
- Primary haemodynamic finding + cardiac output status + notable abnormalities
- TEMPLATE STRUCTURE (write your own based on ACTUAL findings): "[Primary haemodynamic finding from dictated data], with [cardiac output status from measurements] and [other significant abnormalities if dictated]."
- DO NOT copy this template literally - generate conclusion from the actual dictated findings only

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

PULMONARY HYPERTENSION SEVERITY GRADING (by mean PA pressure):
- Normal: ≤20 mmHg
- Borderline elevation: 21-24 mmHg
- Mild PH: 25-34 mmHg
- Moderate PH: 35-44 mmHg
- Severe PH: ≥45 mmHg

When describing haemodynamic findings, use these severity grades explicitly in clinical interpretation (e.g., "moderate pulmonary hypertension with mean PA pressure of 36 mmHg").

Use standard cardiology procedural documentation format.
Target audience: Medical record documentation for cardiologists, heart failure specialists, and referring physicians.`,

    userPromptTemplate: `CRITICAL ANTI-HALLUCINATION REMINDER: Generate report using ONLY information explicitly stated in the dictation below. DO NOT infer symptoms, test results, functional class, or clinical severity. If minimal context provided, state only demographics, vital signs, and equipment. When in doubt: OMIT rather than INFER.

Generate a comprehensive right heart catheterisation procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

CRITICAL OUTPUT REQUIREMENTS:
- Output PLAIN TEXT only - NO markdown formatting (no **, ##, -, etc.)
- START IMMEDIATELY with "PREAMBLE:" - NO conversational introduction
- NO template placeholders - use actual patient data from dictation
- Use Australian spelling throughout (catheterisation, haemodynamic)
- ONLY include information explicitly stated in the dictation above
- NO verbose phrasing like "This report details..." - start directly with demographics

Structure the report with exactly these three sections using NARRATIVE clinical language:

PREAMBLE (CONDITIONAL - Adapt to dictation content):
- Start directly: "[Age] year old [gender] with [stated diagnosis only]"
- If symptoms/investigations dictated: include verbatim. If NOT: completely omit
- ALWAYS include: Pre-procedure vitals explicitly stated (BP, HR, Hb, weight, height)
- ALWAYS include: Vascular access and equipment explicitly stated
- Example (minimal context): "83 year old male with chronic thromboembolic pulmonary hypertension. Pre-procedure assessment demonstrated resting blood pressure 124/66 mmHg, heart rate 92 bpm, and haemoglobin 150 g/L. Vascular access was obtained via the right antecubital vein using a 7 French Swan-Ganz catheter."
- Example (comprehensive context): "75 year old female with heart failure presenting with progressive exertional dyspnoea NYHA class III. Recent echocardiography demonstrated [specific findings from dictation]. Pre-procedure assessment demonstrated [vitals]. Vascular access was obtained via [stated access]."

FINDINGS:
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

CONCLUSION:
- MUST be extremely concise: 1-2 sentences maximum (not paragraphs)
- State primary finding, cardiac output status, and notable abnormalities only
- NO management recommendations, NO follow-up plans, NO detailed interpretations
- Example format: "Moderate pulmonary hypertension, with preserved cardiac output and normal left sided pressures. Significant anaemia noted."

CRITICAL: Generate flowing clinical narrative, NOT tables, bullet points, or numbered sections. Preserve all medical facts accurately with Australian spelling (catheterisation, haemodynamic) and embed measurements naturally in sentences with proper units (mmHg, L/min, L/min/m², %, g/L, mmol/L).`
  },

  /**
   * RHC Data Validation Prompt - Quick model validates regex extraction and detects gaps
   * This runs BEFORE report generation to ensure data completeness
   */
  dataValidationPrompt: `You are validating RHC (Right Heart Catheterization) data extraction. Your job is to:

1. VERIFY regex-extracted values against the transcription
2. DETECT values the regex MISSED that are present in transcription
3. IDENTIFY critical missing fields needed for Fick calculations
4. VALIDATE procedural parameters (vascular access, catheter details, indication)

CRITICAL FIELDS FOR FICK CALCULATIONS:
- Height (cm) → required for BSA calculation
- Weight (kg) → required for BSA calculation
- Hemoglobin (g/L) → required for Fick CO calculation
- SaO2 (%) → arterial oxygen saturation, required for Fick CO
- SvO2 (%) → mixed venous oxygen saturation, required for Fick CO
- RA, RV, PA, PCWP pressures → required for haemodynamic assessment
- Thermodilution CO (L/min) → primary cardiac output measurement

PROCEDURAL PARAMETERS (MUST BE VALIDATED IF DICTATED):
- Vascular access site → internal jugular/femoral/brachial/basilic vein
  * Common ASR error: "venous axis" → "venous access"
  * If dictated but regex missed or defaulted incorrectly → add to "corrections"
- Catheter details → French size (e.g., 7F), catheter type (Swan-Ganz/standard)
  * Common ASR error: "swan GANS" → "Swan-Ganz"
  * If dictated but regex missed → add to "corrections"
- Clinical indication → heart failure/pulmonary hypertension/transplant eval/haemodynamic assessment
  * If dictated but regex defaulted to generic → add to "corrections"

VALIDATION RULES:
1. Compare each regex-extracted value to the transcription
2. If regex value is CORRECT, DO NOT add any entry - skip completely
3. If regex value is WRONG or MISSING but present in transcription, add to "corrections"
4. If value NOT in transcription at all, add to "missingCritical" or "missingOptional"
5. Assign confidence scores (0-1) based on transcription clarity

⚠️ CRITICAL - DO NOT OUTPUT THESE INVALID ENTRIES:
- NEVER include a correction where regexValue === correctValue (identical values)
- NEVER include a correction just to confirm something is "correctly extracted"
- NEVER write "No correction needed" - simply omit the entry entirely
- NEVER include entries that say "correctly extracted" or "no correction required"
- If the regex got it right, the corrections array should NOT contain that field

VASCULAR ACCESS CORRECTION LOGIC:
- If transcription says "brachial" but regex extracted "right_femoral" → MUST correct to "right_brachial"
- If transcription says "jugular" but regex extracted "right_femoral" → MUST correct to "right_internal_jugular"
- If transcription says "femoral" and regex extracted "right_femoral" → NO correction needed, skip
- "venous axis" is ASR error for "venous access" - extract the access site from context
- Default "right_femoral" is WRONG if any other access site is mentioned in transcription

CRITICAL DECISION LOGIC:
- ONLY add to "missingCritical" if BOTH conditions are true:
  a) Field is NOT present in regex extraction (null/undefined/empty)
  b) Field is REQUIRED for calculations (height, weight, Hb, SaO2, SvO2)
  c) Set "critical": true ONLY if both conditions met

- If field IS present in regex but needs correction → add to "corrections" instead
- If field is missing but NOT required → add to "missingOptional" with "critical": false
- If field is present and correct → do nothing (empty arrays are valid)

CONFIDENCE SCORING:
- 0.95-1.0: Unambiguous ("mixed venous oxygen saturation 58" → SvO2 = 58)
- 0.80-0.94: Clear with minor ASR issues ("mixed mean is oxygen saturation 58" → SvO2 = 58)
- 0.60-0.79: Implicit/contextual ("PA sat 65" → SvO2 = 65)
- 0.00-0.59: Uncertain/ambiguous (low confidence, require user review)

CRITICAL vs PROCEDURAL DISTINCTION:
- CRITICAL missing → stops Fick calculations (height, weight, Hb, SaO2, SvO2)
  * If NOT in transcription → add to "missingCritical" with "critical": true
- PROCEDURAL missing → doesn't stop report, but if DICTATED and MISSED by regex, must correct
  * If dictated but regex missed/wrong → add to "corrections"
  * If NOT dictated at all → skip (don't mark as missing)

EXAMPLE 1 - Height/Weight with Period Separator:
Transcription: "Patient height. 180 centimeters. Patient weight 100 kilograms."
Regex extracted: "height": null, "weight": null (regex expects colon, missed period separator)
Correction needed:
{
  "field": "patientData.height",
  "regexValue": null,
  "correctValue": 180,
  "reason": "Transcription clearly states 'height. 180 centimeters' - regex missed due to period separator",
  "confidence": 0.98
},
{
  "field": "patientData.weight",
  "regexValue": null,
  "correctValue": 100,
  "reason": "Transcription clearly states 'weight 100 kilograms'",
  "confidence": 0.98
}

EXAMPLE 2 - Vascular Access Correction:
Transcription: "7 French right brachial venous axis"
Regex extracted: "vascularAccess": "right_femoral" (default fallback)
Correction needed:
{
  "field": "rhcData.vascularAccess",
  "regexValue": "right_femoral",
  "correctValue": "right_brachial",
  "reason": "Transcription states 'right brachial venous axis' (ASR error for 'access')",
  "confidence": 0.95
}

VALIDATION STRATEGY:
1. Scan ENTIRE transcription for all mentioned parameters (calculation + procedural)
2. For each parameter found in transcription:
   - If regex got it RIGHT → DO NOT include in output, skip entirely
   - If regex got it WRONG → add to "corrections" with different correctValue
   - If regex MISSED it (regexValue is null) → add to "corrections"
3. For CRITICAL fields not in transcription → add to "missingCritical"
4. For PROCEDURAL fields not in transcription → skip (assumed not needed)

EXAMPLE - CORRECT OUTPUT (only actual corrections, no confirmations):
Transcription: "right brachial venous axis... PA 39-17 mean 25... mixed venous oxygen saturation 65"
Regex extracted: vascularAccess="right_femoral", pa.mean=10, svo2=65

CORRECT OUTPUT:
{
  "corrections": [
    {
      "field": "rhcData.vascularAccess",
      "regexValue": "right_femoral",
      "correctValue": "right_brachial",
      "reason": "Transcription states 'right brachial venous axis' but regex defaulted to femoral",
      "confidence": 0.95
    },
    {
      "field": "haemodynamicPressures.pa.mean",
      "regexValue": 10,
      "correctValue": 25,
      "reason": "Transcription states 'PA mean 25' but regex extracted 10",
      "confidence": 0.98
    }
  ],
  "missingCritical": [],
  "missingOptional": [],
  "confidence": 0.96
}

NOTE: svo2=65 is NOT in corrections because regex got it correct (regexValue === correctValue)

OUTPUT FORMAT (strict JSON only, no markdown):
{
  "corrections": [
    {
      "field": "patientData.svo2",
      "regexValue": null,
      "correctValue": 58,
      "reason": "Found 'mixed mean is oxygen saturation 58' in transcription (ASR error for 'mixed venous')",
      "confidence": 0.92
    }
  ],
  "missingCritical": [
    {
      "field": "patientData.height",
      "reason": "Required for BSA calculation but not mentioned in dictation",
      "critical": true
    }
  ],
  "missingOptional": [
    {
      "field": "patientData.heartRate",
      "reason": "Not dictated - would improve stroke volume calculation accuracy",
      "critical": false
    }
  ],
  "confidence": 0.92
}

IMPORTANT:
- Output ONLY valid JSON, no explanations or markdown
- If all values are correct and complete, return empty arrays for corrections/missing
- NEVER include entries where regexValue equals correctValue - this pollutes the output
- Confidence is overall validation confidence (average of individual confidences)
- Use dot-notation for field paths (e.g., "patientData.svo2", "haemodynamicPressures.pa.mean")`
};

/**
 * Enhanced medical terminology validation patterns for RHC procedures
 * Comprehensive patterns extracted from clinical right heart catheterisation reports
 */
export const RightHeartCathMedicalPatterns = {
  // Pressure measurement patterns with a/v waves - handles all separator variants: "slash", "/", "-"
  // Handles: "RA 6 slash 6 mean of 8", "RA 8-9 mean of 7", "RA 13-13, mean of 11", "RA8-8, mean of 6"
  raPressurea: /(?:right\s+)?(?:atrial?|ra)\s*(?:pressure\s+)?[:\s,]*(\d+)\s*(?:(?:\/|slash|-)\s*\d+)/gi,
  raPressureV: /(?:right\s+)?(?:atrial?|ra)\s*(?:pressure\s+)?[:\s,]*\d+\s*(?:(?:\/|slash|-)\s*)(\d+)/gi,
  raPressureMean: /(?:right\s+)?(?:atrial?|ra)\s*(?:pressure\s+)?.*?mean\s+(?:of\s+)?(\d+)/gi,

  // RV patterns - handles "RV 63 slash 5", "RV 50-1", "RV 63-0", "RV78-4"
  rvPressureSystolic: /(?:right\s+)?(?:ventricular?|rv)\s*(?:pressure\s+)?[:\s,]*(\d+)\s*(?:\/|slash|-)\s*\d+/gi,
  rvPressureDiastolic: /(?:right\s+)?(?:ventricular?|rv)\s*(?:pressure\s+)?[:\s,]*\d+\s*(?:\/|slash|-)\s*(\d+)/gi,
  // RVEDP handles: "RV EDP of 13", "RVEDP of 8", "RVEDP 8", "RVEDP11"
  rvedp: /rv\s*edp\s*(?:of\s+)?[:\s,]*(\d+)|rvedp\s*(?:of\s+)?[:\s,]*(\d+)/gi,

  // PA patterns - handles "PA 65 slash 22 mean of 39", "PA 50-22 mean of 36", "PA 59-19, mean of 33", "PA75-35, mean 45"
  paPressureSystolic: /(?:pulmonary\s+artery|pa)\s*(?:pressure\s+)?[:\s,]*(\d+)\s*(?:\/|slash|-)\s*\d+/gi,
  paPressureDiastolic: /(?:pulmonary\s+artery|pa)\s*(?:pressure\s+)?[:\s,]*\d+\s*(?:\/|slash|-)\s*(\d+)/gi,
  paPressureMean: /(?:pulmonary\s+artery|pa)\s*(?:pressure\s+)?.*?mean\s+(?:of\s+)?(\d+)/gi,

  // PCWP patterns - handles "wedge pressure 15 slash 15 mean of 13", "PCWP 15-21, mean of 15", "PCWP12-12, mean of 11"
  // Also handles "unable to obtain PCWP" by failing gracefully
  pcwpPressureA: /(?:pulmonary\s+capillary\s+)?(?:wedge|pcwp)\s*(?:pressure\s+)?[:\s,]*(\d+)\s*(?:(?:\/|slash|-)\s*\d+)/gi,
  pcwpPressureV: /(?:pulmonary\s+capillary\s+)?(?:wedge|pcwp)\s*(?:pressure\s+)?[:\s,]*\d+\s*(?:(?:\/|slash|-)\s*)(\d+)/gi,
  pcwpPressureMean: /(?:pulmonary\s+capillary\s+)?(?:wedge|pcwp)\s*(?:pressure\s+)?.*?mean\s+(?:of\s+)?(\d+)/gi,

  // LVEDP pattern for when PCWP unavailable - handles "LVEDP imputed 13"
  lvedp: /lvedp\s+(?:imputed\s+)?[:\s,]*(\d+)/gi,

  // Cardiac output patterns - enhanced to handle missing units and comma separators
  // Handles "thermodilution cardiac output 5.4", "cardiac output 5.4 via thermodilution", "cardiac output by thermodilution 5.4", "cardiac output, thermodilution, 5.4"
  thermodilutionCO: /(?:(?:three\s+)?thermodilution\s+cardiac\s+output[:\s,]+(\d+\.?\d*)|cardiac\s+output\s+(\d+\.?\d*)\s+(?:via|by)\s+thermodilution|cardiac\s+output\s+(?:via|by)\s+thermodilution[:\s,]+(\d+\.?\d*)|cardiac\s+output,\s*thermodilution,\s*(\d+\.?\d*))(?:\s*l\/min)?/gi,
  thermodilutionCI: /thermodilution\s+cardiac\s+index[:\s,]+(\d+\.?\d*)(?:\s*l\/min\/m²?)?/gi,
  // Fick method - handle common transcription errors: "thick" or "tick" instead of "fick"
  fickCO: /(?:fick|thick|tick)\s+(?:cardiac\s+output|co)[:\s,]+(\d+\.?\d*)(?:\s*l\/min)?/gi,
  fickCI: /(?:fick|thick|tick)\s+(?:cardiac\s+index|ci)[:\s,]+(\d+\.?\d*)(?:\s*l\/min\/m²?)?/gi,

  // Oxygen saturation patterns - handles "mixed venous 68", "mixed venous saturation 57"
  mixedVenousO2: /mixed\s+venous\s+(?:o2|oxygen)?\s*(?:saturation)?[:\s,]*(\d+)%?/gi,
  wedgeSaturation: /wedge\s+saturation[:\s,]*(\d+)%?/gi,
  arterialO2Saturation: /(?:aortic|arterial)\s+(?:arterial\s+)?(?:oxygen\s+)?saturation[:\s,]+(\d+)%?/gi,
  pulmonaryArterySaturation: /pulmonary\s+artery\s+(?:oxygen\s+)?saturation[:\s,]+(\d+)%?/gi,

  // Laboratory values - handles both American "hemoglobin 71" and Australian "haemoglobin 150"
  haemoglobin: /(?:h[ae]moglobin|hb)[:\s,]*(\d+)(?:\s*g\/l)?/gi,
  lactate: /lactate[:\s,]*(\d+\.?\d*)(?:\s*mmol\/l)?/gi,

  // Radiation safety - handles "fluoro time 1.45 minutes"
  fluoroscopyTime: /(?:total\s+)?(?:fluoro(?:scopy)?\s+time|screening\s+time)[:\s,]*(\d+\.?\d*)\s*(?:min(?:ute)?s?)?/gi,
  fluoroscopyDose: /(?:total\s+)?(?:fluoro(?:scopy)?\s+dose|radiation\s+dose)[:\s,]*(\d+\.?\d*)\s*(?:m?gy|milligray)?/gi,
  doseAreaProduct: /(?:total\s+)?(?:dap|dose\s+area\s+product)[:\s,]*(\d+\.?\d*)\s*(?:gy[·\s×*]?cm²?)?/gi,
  contrastVolume: /contrast\s+(?:volume|used|administered)?[:\s,]*(\d+\.?\d*)\s*(?:m?l)?/gi,

  // Blood pressure - handles "resting blood pressure 87 on 54" and "124 on 66"
  systemicBPSystolic: /(?:resting\s+)?(?:systemic\s+)?blood\s+pressure[:\s,]+(\d+)\s*(?:\/|on|-)\s*\d+/gi,
  systemicBPDiastolic: /(?:resting\s+)?(?:systemic\s+)?blood\s+pressure[:\s,]+\d+\s*(?:\/|on|-)\s*(\d+)/gi,
  meanArterialPressure: /(?:map|mean\s+arterial\s+pressure)[:\s,]+(\d+)/gi,

  // Vascular access - handles "right internal jugular venous access" and "Right median anti-cubital venous axis" (Whisper error)
  basilicAccess: /(?:right\s+)?(?:median\s+)?(?:anti[-\s]?cubital|basilic|brachial)\s+(?:venous\s+)?(?:vascular\s+)?(?:access|axis)/gi,
  jugularAccess: /(?:right\s+)?internal\s+jugular\s+(?:venous\s+)?(?:vascular\s+)?(?:access|axis)/gi,
  femoralAccess: /(?:right\s+)?femoral\s+(?:venous\s+)?(?:vascular\s+)?(?:access|axis)/gi,
  
  // Exercise testing
  exerciseProtocol: /straight\s+leg\s+raising/gi,
  exerciseDuration: /(\d+)\s+minutes?/gi,
  postExercise: /post[-\s]?exercise/gi,
  
  // Clinical indications
  heartFailure: /heart\s+failure/gi,
  pulmonaryHypertension: /pulmonary\s+hypertension/gi,
  transplantEvaluation: /transplant\s+evaluation/gi,
  haemodynamicAssessment: /haemodynamic\s+assessment/gi,
  
  // Catheter specifications - handles "7 French swan GANS catheter" (Whisper transcription error for Swan-Ganz)
  // Made frenchSize more flexible to match "7 French SWAN GANS" (space between French and SWAN)
  frenchSize: /(\d+)[-\s]?f(?:rench)?/gi,
  swanGanz: /swan[-\s]?(?:g[ae]n[zs]|gans)/gi,
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
    'consultation',
    'okay, here is',
    'sure, i can',
    '[insert',
    '**',
    '##',
    '###'
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