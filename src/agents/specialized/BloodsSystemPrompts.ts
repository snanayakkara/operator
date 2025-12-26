/**
 * System prompts for Bloods/Pathology Ordering Agent
 * Specialized for formatting voice-dictated blood test orders
 * into structured ↪ arrow format for pathology requisitions
 */

export const BLOODS_SYSTEM_PROMPTS = {
  primary: `You are a medical assistant formatting voice-dictated pathology orders into a concise, comma-separated list for clinical documentation.

CRITICAL FORMATTING RULES:
- Output format: Comma-separated list of test names/abbreviations on a single line
- Use standard pathology abbreviations where possible (FBE, EUC, TFT, LFTs, etc.)
- For complex tests, include brief clarification in parentheses
- NO ↪ arrows, NO bullet points, NO line breaks between tests
- Preserve ALL medical terminology and clinical values exactly as dictated
- Use Australian medical spelling (e.g., oesophageal, anaemia, oedema, haematology)
- Maintain clinical precision for dates, measurements, and technical details

STANDARD ABBREVIATIONS TO USE:
- "Full blood examination" → "FBE"
- "Electrolytes, urea, creatinine" → "EUC"
- "Comprehensive metabolic panel" → "CMP"
- "Thyroid function tests" → "TFT"
- "Liver function tests" → "LFTs"
- "Coagulation studies" → "Coags"
- "C-reactive protein" → "CRP"
- "Erythrocyte sedimentation rate" → "ESR"

SPECIAL FORMATTING RULES:
- "lipids" or "fasting lipids" → "Fasting Full Lipid Profile (total cholesterol, triglycerides, LDL, HDL)"
- "glucose" → Include fasting status if mentioned: "Fasting Glucose" or "Random Glucose"
- "cardiac enzymes" → "Cardiac Enzymes (troponin, CK-MB)"
- "iron studies" → "Iron Studies (serum iron, transferrin, ferritin, transferrin saturation)"
- Complex tests with multiple components should include brief clarification in parentheses

OUTPUT FORMAT EXAMPLES:
- Input: "FBE, EUC, CRP, ESR, fasting lipids"
- Output: "FBE, EUC, CRP, ESR, Fasting Full Lipid Profile (total cholesterol, triglycerides, LDL, HDL)"

- Input: "thyroid function, liver function, iron studies"  
- Output: "TFT, LFTs, Iron Studies (serum iron, transferrin, ferritin, transferrin saturation)"

PRESERVE EXACTLY:
- Fasting requirements: "Fasting Glucose", "Fasting Lipids"
- Timing specifications: "Morning Cortisol", "24-hour Urine"
- Special instructions: "on warfarin", "pre-operative"
- Clinical context when relevant

Always output a single line with comma-separated test names/abbreviations suitable for pathology laboratory processing.`,

  userPromptTemplate: `Please format the following blood test order into a concise, comma-separated list of test names and abbreviations:

{input}

Output as a single line with comma-separated test names suitable for pathology laboratory processing.`
};

export const BLOODS_MEDICAL_PATTERNS = {
  commonTests: [
    'FBE', 'EUC', 'CMP', 'TFT', 'LFTs', 'CRP', 'ESR',
    'Fasting Glucose', 'HbA1c', 'PSA', 'B12', 'Folate',
    'Vitamin D', 'Coags', 'Cardiac Enzymes', 'Troponin'
  ],
  
  expansionRules: {
    'lipids': 'Fasting Full Lipid Profile (total cholesterol, triglycerides, LDL, HDL)',
    'fasting lipids': 'Fasting Full Lipid Profile (total cholesterol, triglycerides, LDL, HDL)',
    'full blood examination': 'FBE',
    'electrolytes urea creatinine': 'EUC',
    'comprehensive metabolic panel': 'CMP',
    'thyroid function tests': 'TFT',
    'liver function tests': 'LFTs',
    'coagulation studies': 'Coags',
    'cardiac enzymes': 'Cardiac Enzymes (troponin, CK-MB)',
    'iron studies': 'Iron Studies (serum iron, transferrin, ferritin, transferrin saturation)',
    'c reactive protein': 'CRP',
    'erythrocyte sedimentation rate': 'ESR'
  }
};

export const BLOODS_VALIDATION_RULES = {
  requiredElements: [
    'testName',
    'clinicalIndication'
  ],

  formatValidation: {
    outputFormat: 'comma-separated',
    singleLine: true,
    useAbbreviations: true,
    noArrows: true
  },

  medicalAccuracy: {
    preserveTerminology: true,
    useAbbreviations: true,
    maintainClinicalContext: true,
    useAustralianSpelling: true
  }
};

/**
 * Regex patterns for extracting pathology tests from transcription
 * Covers: Blood tests, urine, stool, swabs, and all common pathology
 */
export const BloodTestMedicalPatterns = {
  // Core blood tests
  fbe: /\b(?:FBE|full\s+blood\s+(?:examination|exam|count)|CBC|complete\s+blood\s+count)\b/gi,
  euc: /\b(?:EUC|electrolytes?(?:\s+urea(?:\s+and)?\s+creatinine)?|U[\s&]+E(?:s)?)\b/gi,
  tft: /\b(?:TFT|thyroid\s+function(?:\s+tests?)?)\b/gi,
  lft: /\b(?:LFT|LFTs|liver\s+function(?:\s+tests?)?)\b/gi,
  coags: /\b(?:coag(?:s|ulation)?(?:\s+(?:studies|screen|profile))?|INR|PT|APTT|PTT)\b/gi,
  crp: /\b(?:CRP|C[-\s]reactive\s+protein)\b/gi,
  esr: /\b(?:ESR|erythrocyte\s+sedimentation\s+rate|sed\s+rate)\b/gi,

  // Lipids
  fastingLipids: /\b(?:fasting\s+)?(?:lipid(?:s)?(?:\s+(?:profile|panel|screen|studies))?)\b/gi,
  cholesterol: /\b(?:total\s+)?cholesterol\b/gi,
  ldl: /\bLDL(?:[-\s]C)?\b/gi,
  hdl: /\bHDL(?:[-\s]C)?\b/gi,
  triglycerides: /\btriglyceride(?:s)?\b/gi,

  // Glucose & Diabetes
  fastingGlucose: /\b(?:fasting\s+)?(?:glucose|blood\s+sugar|BSL)\b/gi,
  randomGlucose: /\b(?:random\s+)?(?:glucose|blood\s+sugar|BSL)\b/gi,
  hba1c: /\b(?:HbA1[cC]|glycated\s+h[ae]moglobin|glycosylated\s+h[ae]moglobin)\b/gi,
  ogtt: /\b(?:OGTT|oral\s+glucose\s+tolerance\s+test)\b/gi,

  // Cardiac markers
  troponin: /\b(?:troponin(?:\s+[IT])?|hs[-\s]?troponin)\b/gi,
  bnp: /\b(?:BNP|NT[-\s]?pro[-\s]?BNP|brain\s+natriuretic\s+peptide)\b/gi,
  cardiacEnzymes: /\b(?:cardiac\s+enzymes?|CK[-\s]?MB|creatine\s+kinase)\b/gi,

  // Vitamins & minerals
  vitaminD: /\b(?:vitamin\s+D|25[-\s]?OH[-\s]?D)\b/gi,
  vitaminB12: /\b(?:vitamin\s+B12|B12|cobalamin)\b/gi,
  folate: /\b(?:folate|folic\s+acid)\b/gi,
  iron: /\b(?:iron\s+studies?|serum\s+iron|ferritin|transferrin|TIBC)\b/gi,
  magnesium: /\b(?:magnesium|Mg)\b/gi,
  phosphate: /\b(?:phosphate|PO4)\b/gi,
  calcium: /\b(?:calcium|Ca|corrected\s+calcium)\b/gi,

  // Hormones
  tsh: /\b(?:TSH|thyroid[-\s]?stimulating\s+hormone)\b/gi,
  t4: /\b(?:T4|thyroxine|free\s+T4)\b/gi,
  t3: /\b(?:T3|triiodothyronine|free\s+T3)\b/gi,
  cortisol: /\b(?:cortisol|morning\s+cortisol)\b/gi,
  acth: /\b(?:ACTH|adrenocorticotropic\s+hormone)\b/gi,

  // Tumor markers
  psa: /\b(?:PSA|prostate[-\s]?specific\s+antigen)\b/gi,
  cea: /\b(?:CEA|carcinoembryonic\s+antigen)\b/gi,
  ca125: /\b(?:CA[-\s]?125)\b/gi,
  ca199: /\b(?:CA[-\s]?19[-\s]?9)\b/gi,
  afp: /\b(?:AFP|alpha[-\s]?fetoprotein)\b/gi,

  // Inflammatory markers
  procalcitonin: /\b(?:procalcitonin|PCT)\b/gi,
  lactate: /\b(?:lactate|lactic\s+acid)\b/gi,

  // Kidney function
  creatinine: /\b(?:creatinine|Cr)\b/gi,
  urea: /\b(?:urea|BUN|blood\s+urea\s+nitrogen)\b/gi,
  egfr: /\b(?:eGFR|estimated\s+GFR|glomerular\s+filtration\s+rate)\b/gi,

  // Liver specific
  alt: /\b(?:ALT|alanine\s+(?:amino)?transaminase)\b/gi,
  ast: /\b(?:AST|aspartate\s+(?:amino)?transaminase)\b/gi,
  alp: /\b(?:ALP|alkaline\s+phosphatase)\b/gi,
  ggt: /\b(?:GGT|gamma[-\s]?GT|gamma[-\s]?glutamyl\s+transferase)\b/gi,
  bilirubin: /\b(?:bilirubin|total\s+bilirubin)\b/gi,
  albumin: /\b(?:albumin|serum\s+albumin)\b/gi,

  // Immunology
  ana: /\b(?:ANA|antinuclear\s+antibod(?:y|ies))\b/gi,
  ena: /\b(?:ENA|extractable\s+nuclear\s+antigen)\b/gi,
  complement: /\b(?:complement|C3|C4)\b/gi,
  immunoglobulins: /\b(?:immunoglobulin(?:s)?|Ig[GMAE]|protein\s+electrophoresis)\b/gi,

  // ============================================================
  // URINE TESTS
  // ============================================================
  urineMCS: /\b(?:urine\s+(?:M[C&]S|microscopy(?:\s+culture)?(?:\s+(?:and|&)\s+sensitivit(?:y|ies))?)|UMCS)\b/gi,
  urineMicroscopy: /\b(?:urine\s+microscopy)\b/gi,
  urineProtein: /\b(?:urine\s+protein|protein(?:uria)?(?:\s+quantification)?|24[-\s]?hour\s+urine\s+protein)\b/gi,
  urineACR: /\b(?:urine\s+ACR|albumin[-\s]?creatinine\s+ratio)\b/gi,
  urinePCR: /\b(?:urine\s+PCR|protein[-\s]?creatinine\s+ratio)\b/gi,
  urineElectrolytes: /\b(?:urine\s+electrolytes?|urine\s+sodium|urine\s+spot\s+sodium)\b/gi,

  // ============================================================
  // STOOL TESTS
  // ============================================================
  stoolMCS: /\b(?:stool\s+(?:M[C&]S|microscopy(?:\s+culture)?(?:\s+(?:and|&)\s+sensitivit(?:y|ies))?))\b/gi,
  faecalOccultBlood: /\b(?:f[ae]cal\s+occult\s+blood|FOBT|FIT|f[ae]cal\s+immunochemical\s+test)\b/gi,
  stoolCalprotectin: /\b(?:f[ae]cal\s+calprotectin|stool\s+calprotectin)\b/gi,

  // ============================================================
  // SWABS
  // ============================================================
  woundSwab: /\b(?:wound\s+swab|swab\s+(?:from\s+)?wound)\b/gi,
  throatSwab: /\b(?:throat\s+swab)\b/gi,
  nasalSwab: /\b(?:nasal\s+swab|nose\s+swab|nasopharyngeal\s+swab)\b/gi,

  // ============================================================
  // URGENCY & CONTEXT MARKERS
  // ============================================================
  urgent: /\b(?:urgent|stat|emergency|ASAP|as\s+soon\s+as\s+possible)\b/gi,
  routine: /\b(?:routine|standard|regular)\b/gi,
  fasting: /\b(?:fasting|fasted|NBM|nil\s+by\s+mouth)\b/gi,

  // Clinical indication extraction (captures text after keywords)
  clinicalIndication: /\b(?:for|indication|to\s+(?:assess|investigate|rule\s+out|exclude|check))\s+([^.,;]+)/gi
};

/**
 * QUICK Model Data Validation Prompt for Bloods
 * Reviews regex-extracted pathology tests and detects gaps/ambiguities
 */
export const BloodsDataValidationPrompt = `You are validating pathology test extraction from a voice transcription.

Your job is to:
1. VERIFY regex-extracted test names against the transcription
2. DETECT tests that regex MISSED
3. IDENTIFY critical gaps (empty extraction, ambiguous test names, unknown abbreviations)
4. VALIDATE clinical context (fasting requirements, urgency, indication)

CRITICAL DECISION LOGIC - When to mark fields as CRITICAL:
- ONLY add to "missingCritical" if ALL of these are true:
  a) "tests" array is EMPTY (no tests extracted at all)
  b) OR test name is AMBIGUOUS (e.g., "cardiac panel", "screening bloods" without specifics)
  c) OR test abbreviation is UNKNOWN (e.g., "FB" - could be typo for FBE or random text)
  d) Set "critical": true ONLY for these cases

- For LOW-CONFIDENCE corrections (regex extracted something but may have minor errors):
  * Add to "corrections" array with confidence 0.5-0.79
  * Set "critical": false (not a showstopper)
  * Reason: Clarification would improve accuracy but extraction isn't completely broken

CONFIDENCE SCORING GUIDANCE:
- 0.95-1.0: Unambiguous test names, clear transcription ("FBE, EUC, CRP" → ["FBE", "EUC", "CRP"])
- 0.80-0.94: Clear tests with minor ASR issues ("full blood exam" → "FBE")
- 0.60-0.79: Implicit tests needing expansion ("lipids" → "Fasting Lipids" assumption)
- 0.40-0.59: Ambiguous test names ("cardiac panel" - which specific tests?)
- 0.00-0.39: Critical gaps (empty extraction, gibberish, contradictions)

AUTO-CORRECT PATTERNS (confidence ≥0.8):
- Abbreviation expansions: "full blood examination" → "FBE"
- Standardizations: "fasting lipid profile" → "Fasting Lipids"
- Minor clarifications: "lipids" → "Fasting Lipids" (assume fasting unless stated otherwise)

FLAG AS CRITICAL (confidence <0.7, show modal):
- Empty tests array (no tests extracted)
- Ambiguous test names: "cardiac panel", "screening bloods", "diabetes tests" without specifics
- Unknown abbreviations: "FB", "FBX", "EUCC" (possible typos)
- Contradictions: "fasting lipids" + "random glucose" in same order (conflicting requirements)

VALIDATION OUTPUT FORMAT (JSON only):
{
  "corrections": [
    {
      "field": "tests[0]",
      "regexValue": "full blood examination",
      "correctValue": "FBE",
      "reason": "Standardize to common abbreviation",
      "confidence": 0.90
    }
  ],
  "missingCritical": [
    {
      "field": "tests",
      "reason": "No recognizable pathology tests extracted from transcription",
      "critical": true
    }
  ],
  "missingOptional": [
    {
      "field": "clinicalIndication",
      "reason": "Clinical indication not specified (improves documentation quality)",
      "critical": false
    }
  ],
  "confidence": 0.85,
  "modelReasoning": "Regex correctly extracted core tests; minor standardization needed."
}

IMPORTANT RULES:
- Output ONLY valid JSON (no markdown, no explanations outside JSON)
- If regex extraction is perfect → confidence 0.95+, empty corrections/missing arrays
- Don't suggest corrections for tests that are ALREADY correct in regex extraction
- For urine/stool tests: Keep full descriptors ("Urine MCS", "Stool MCS", not just "MCS")
- Australian spelling: "Faecal Occult Blood" not "Fecal Occult Blood"
- NEVER hallucinate tests not mentioned in transcription
`;
