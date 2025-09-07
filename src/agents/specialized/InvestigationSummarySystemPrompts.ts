/**
 * System prompts for Investigation Summary Agent
 * Specialized for formatting voice-dictated medical investigation results
 * into structured, standardized summaries for e-Intray processing
 */

export const INVESTIGATION_SUMMARY_SYSTEM_PROMPTS = {
  primary: `You are a medical editor that rewrites ONE short voice‑dictated investigation into the exact format:

When date is provided: TYPE (DD MMM YYYY[, Location]): finding1, finding2, ...
When NO date is provided: TYPE (no date): finding1, finding2, ...

- Punctuation skeleton MUST be exactly: TYPE (DD MMM YYYY[, Location]): or TYPE (no date): (with a single space after the colon; no commas after TYPE; no commas around the date).
- Key–value findings use a single space between label and value (e.g., "Cr 164", "eGFR 38"). Never write "Cr, 164" or "eGFR, 38".
- If the input uses commas or periods between the type and the date (e.g., "Bloods, 24th August, 2025."), standardise to the skeleton above.
- CRITICAL: If NO date is mentioned in the input, you MUST use "(no date)" - NEVER invent, guess, or fabricate dates.

Rules (follow strictly):
- The output MUST begin with one of these types exactly: TTE, TOE, Stress TTE, CTCA, CMRI, Coronary Angiogram, RHC, ExRHC, Holter Monitor, Event Monitor, Loop Recorder, ABPM, Bloods. Never print the word "INVESTIGATION".
- Preserve all numbers and units exactly; do NOT invent, convert, or average values. You may standardise wording only by applying the canonical abbreviation list below.
- Use canonical cardiology abbreviations when applicable:
  biventricular → BiV; left atrium/atrial → LA; right atrium/atrial → RA; left ventricle/ventricular → LV; right ventricle/ventricular → RV; proximal → prox; ostial → ostial.
- Use valve and measurement abbreviations:
  aortic valve → AV; mitral valve → MV; tricuspid valve → TV; pulmonary valve → PV; mean pressure gradient → MPG; peak pressure gradient → PPG.
- Use regurgitation abbreviations:
  mitral regurgitation → MR; aortic regurgitation → AR; pulmonary regurgitation → PR; tricuspid regurgitation → TR.
- Use hemodynamic and RHC abbreviations:
  PA mean → PAm; pulmonary capillary wedge pressure → PCWP; cardiac output → CO; cardiac index → CI; right ventricular stroke work index → RVSWI; pulmonary artery systolic pressure → PASP; right ventricular systolic pressure → RVSP; right atrial pressure → RAP; stroke volume index → SVI.
- Ejection fraction MUST include percentage: "EF XX%" with space before percentage symbol.
- For Bloods, use these exact lab abbreviations when spoken equivalents occur:
  total cholesterol → TChol; triglycerides → TG; HDL cholesterol → HDL; LDL cholesterol → LDL; non‑HDL cholesterol → non‑HDL; haemoglobin A1c → HbA1c; creatinine → Cr; estimated GFR → eGFR; ferritin → Ferr; haemoglobin/hemoglobin → Hb; troponin → Tn; B‑type natriuretic peptide → BNP.
- Wording case: descriptors like normal/mild/moderate/severe/satisfactory should be lower‑case; abbreviations (LV, RV, BiV, EF, mmHg, HbA1c, LDL, HDL, BNP, MR, AR, PR, TR, PAm, PCWP, CO, CI, RVSWI, PASP, RAP, SVI) stay uppercase/mixed-case exactly as shown.
- Add standard units where appropriate: TAPSE measurements in mm, PASP/RVSP measurements in mmHg (e.g., "TAPSE 22mm", "PASP >38mmHg", "RVSP from 23 to 57mmHg"). Use parentheses for dimension measurements (e.g., "(39mm)", "(42mm)").
- Exercise testing terminology: Use "Bruce Stage X" (capitalized), "exercised for X minutes", and convert second numerical values to METs when appropriate (e.g., "exercised for 8.3 minutes, 13.7 METs").
- Date handling rules:
  • If a specific date is mentioned (e.g., "9th of February 2024"), format as "(DD MMM YYYY)" → "(9 Feb 2024)"
  • If NO date is mentioned in the dictation, use "(no date)" - never invent dates
  • Date ranges → "(MMM–MMM YYYY)"
  • Relative dates like "yesterday", "last week", "this morning" should be treated as "(no date)" unless you can determine the exact date
- If a location/institution is spoken, include it after the date as ", Location".
- Punctuation rules: Use commas within findings of the same anatomical territory or category; use semicolons to separate different vessel territories or distinct anatomical regions. Examples: "moderate LAD stenosis, mild LCx disease; severe RCA occlusion" or "normal LV function, mild LA enlargement; moderate MV regurgitation". Ensure proper spacing after commas. For calcium scores, use format "Ca Score XXX/percentile" (e.g., "Ca Score 795/50-75th centile"). No extra commentary or text before/after the line.
- If you cannot safely format without inventing information (including dates), output exactly:
ERROR – investigation dictation could not be parsed coherently.`
};

export const INVESTIGATION_SUMMARY_LLM_HINTS = {
  temperature: 0,
  maxTokens: 80,
  stop: ["\n"]
};

export const INVESTIGATION_SUMMARY_MEDICAL_KNOWLEDGE = {
  // Common investigation abbreviations
  investigations: {
    'echocardiography': ['TTE', 'TOE', 'Stress TTE', 'Exercise Echo'],
    'cardiac_imaging': ['CTCA', 'CT Coronary Angiogram', 'CT Calcium Score', 'Cardiac MRI'],
    'general_imaging': ['CT COW', 'CT Thoracic Aorta', 'CT Abdomen', 'MRI', 'PYP'],
    'invasive': ['Coronary Angiogram', 'PCI', 'Right Heart Catheter'],
    'monitoring': ['HeartBug', 'Holter Monitor', 'Event Monitor', '24hr ECG'],
    'laboratory': ['Bloods', 'Lipids', 'HbA1c', 'Troponin', 'BNP', 'D-dimer'],
    'functional': ['CPET', 'Exercise Stress Test', 'Stress Echo', 'Nuclear Stress']
  },

  // Standard medical terminology preservation
  cardiology_terms: {
    'anatomy': ['LV', 'RV', 'LA', 'RA', 'LAD', 'LCx', 'RCA', 'OM1', 'OM2', 'D1', 'D2', 'ostial', 'prox'],
    'pathology': ['SCAD', 'type 1', 'type 2', 'type 3', 'stenosis', 'occlusion'],
    'measurements': ['EF', 'MPG', 'PPG', 'RVSP', 'PASP', 'TAPSE', 'Ca score', 'METs', 'mmHg', 'mm', '%'],
    'hemodynamics': ['PAm', 'PCWP', 'CO', 'CI', 'RVSWI', 'RAP', 'SVI', 'PA', 'PVR', 'SVR', 'RVSP'],
    'exercise': ['Bruce Stage', 'exercised for', 'METs', 'minutes', 'Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'],
    'valves': ['AV', 'MV', 'TV', 'PV', 'AV MPG', 'MV MPG', 'TV MPG', 'PV MPG'],
    'regurgitation': ['MR', 'AR', 'PR', 'TR', 'mild MR', 'moderate PR', 'severe TR', 'mod-sev TR'],
    'findings': ['normal', 'mild', 'moderate', 'severe', 'mod-sev', 'satisfactory', 'dominant']
  },

  // Date format patterns
  date_formats: {
    'standard': '(DD MMM YYYY)',
    'range': '(MMM-MMM YYYY)',
    'months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  }
};

import { getCombinedPatterns, type ReplacementPattern } from '../../utils/ASRCorrections';

/**
 * Pre-normalise dictated text before sending to the LLM.
 * - Applies a SMALL, SAFE set of replacements (word-boundary, case-insensitive)
 * - Never changes numbers or units
 * - Focuses on canonical abbreviations + lab names + common anatomy
 * - Uses centralized ASR corrections from utils/ASRCorrections.ts
 *
 * Usage:
 *   const cleaned = preNormalizeInvestigationText(rawDictation);
 *   // then send `cleaned` to the LLM with the micro prompt
 */
export function preNormalizeInvestigationText(input: string): string {
  let s = input;

  type Replacement = ReplacementPattern;

  // Get centralized correction patterns
  const CENTRALIZED_PATTERNS = getCombinedPatterns(['laboratory', 'cardiology', 'valves', 'severity']);

  // Apply specific ASR correction patterns for common transcription errors
  const ASR_CORRECTION_PATTERNS: Replacement[] = [
    [/\bLED\b/gi, 'LAD'], // "LED stenosis" -> "LAD stenosis" (common ASR error)
    [/\bosteocircumflex\b/gi, 'ostial circumflex'], // "osteocircumflex" -> "ostial circumflex"
    [/\bPeritin\b/gi, 'Ferritin'], // "Peritin" -> "Ferritin" (common transcription error)
    [/\bRBSP\b/gi, 'RVSP'], // "RBSP" -> "RVSP" (common transcription error for Right Ventricular Systolic Pressure)
    [/\b(?:EGFR|eGFR)\s+greater\s+than\s+(\d+)/gi, 'eGFR >$1'], // "EGFR greater than 90" -> "eGFR >90"
    [/\bgreater\s+than\s+(\d+)/gi, '>$1'], // "greater than 90" -> ">90" (general pattern)
    [/\bproximal\b/gi, 'prox'], // "proximal" -> "prox"
    [/\b(\d+)\s*millimeters?\b/gi, '($1mm)'], // "39 millimeters" -> "(39mm)"
    [/\b(\d+)\s*mm(?!Hg)\b/gi, '($1mm)'], // "39mm" -> "(39mm)" (not mmHg)
    [/\bCalcium score,?\s*(\d+)[.,]?\s*([0-9-]+(?:st|nd|rd|th)\s*centile)/gi, 'Ca Score $1/$2'], // "Calcium score, 795. 50 to 75th centile" -> "Ca Score 795/50-75th centile"
    // Exercise test corrections
    [/\bbruce\s+stage\s+(\d+)\b/gi, 'Bruce Stage $1'], // "bruce stage 4" -> "Bruce Stage 4"
    [/\bexercise\s+for\b/gi, 'exercised for'], // "exercise for 8.3 minutes" -> "exercised for 8.3 minutes"
    // RHC and hemodynamic abbreviations
    [/\bPA\s+mean\b/gi, 'PAm'], // "PA mean" -> "PAm"
    [/\bpulmonary\s+capillary\s+wedge\s+pressure\b/gi, 'PCWP'], // "pulmonary capillary wedge pressure" -> "PCWP"
    [/\bcardiac\s+output\b/gi, 'CO'], // "cardiac output" -> "CO"
    [/\bcardiac\s+index\b/gi, 'CI'], // "cardiac index" -> "CI"
    [/\bright\s+ventricular\s+stroke\s+work\s+index\b/gi, 'RVSWI'], // "right ventricular stroke work index" -> "RVSWI"
    [/\bpulmonary\s+artery\s+systolic\s+pressure\b/gi, 'PASP'], // "pulmonary artery systolic pressure" -> "PASP"
    [/\bright\s+atrial\s+pressure\b/gi, 'RAP'], // "right atrial pressure" -> "RAP"
    [/\bstroke\s+volume\s+index\b/gi, 'SVI'], // "stroke volume index" -> "SVI"
  ];

  // Apply ASR corrections first
  for (const [pattern, repl] of ASR_CORRECTION_PATTERNS) {
    s = s.replace(pattern, repl);
  }

  // Apply investigation type conversions FIRST (before date normalization)
  const INVESTIGATION_CONVERSION_PATTERNS: Replacement[] = [
    [/\bstress\s+echo\s*cardiogram\b/gi, 'Stress TTE'], // "stress echo cardiogram" -> "Stress TTE" (MUST come before TTE patterns)
    [/\btrans\s*thoracic\s*echo(?:cardiogram)?\b/gi, 'TTE'], // "trans thoracic echo" -> "TTE" (MUST come before other echo patterns)
    [/\btrans\s*oesophageal\s*echo(?:cardiogram)?\b/gi, 'TOE'], // "trans oesophageal echo" -> "TOE"
    [/\btrans\s*esophageal\s*echo(?:cardiogram)?\b/gi, 'TOE'], // US spelling
    [/\bCT\s+coronary\s+angiogram\b/gi, 'CTCA'], // "CT coronary angiogram" -> "CTCA"
    [/\bAmbulatory\s+Blood\s+Pressure\s+Monitor\b/gi, 'ABPM'], // "Ambulatory Blood Pressure Monitor" -> "ABPM" (specific first)
    [/\bBlood\s+Pressure\s+Monitor\b/gi, 'ABPM'], // "Blood Pressure Monitor" -> "ABPM"
    [/\bright\s+heart\s+catheter\b/gi, 'RHC'] // "right heart catheter" -> "RHC"
  ];

  for (const [pattern, repl] of INVESTIGATION_CONVERSION_PATTERNS) {
    s = s.replace(pattern, repl);
  }

  const MONTH_MAP: Record<string, string> = { january:'Jan', february:'Feb', march:'Mar', april:'Apr', may:'May', june:'Jun', july:'Jul', august:'Aug', september:'Sep', october:'Oct', november:'Nov', december:'Dec' };

  // 2a) If the string begins with "TYPE, <date>" or "TYPE <date>", convert to "TYPE (DD Mon YYYY): "
  s = s.replace(
    /^(TTE|TOE|Stress\s*TTE|CTCA|CMRI|Coronary Angiogram|RHC|ExRHC|Holter Monitor|Event Monitor|Loop Recorder|ABPM|Bloods)\s*[,:.-]?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})\s*[.:;,\s]*/i,
    (_, type, d, month, y) => `${type} (${d} ${MONTH_MAP[month.toLowerCase()]} ${y}): `
  );
  
  // 2b) If it's already TYPE (date) but wrong trailing punctuation, fix to colon
  s = s.replace(
    /^(TTE|TOE|Stress\s*TTE|CTCA|CMRI|Coronary Angiogram|RHC|ExRHC|Holter Monitor|Event Monitor|Loop Recorder|ABPM|Bloods)\s*\(\s*(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})(?:,\s*[^)]*)?\s*\)\s*[,.:.-]?\s*/i,
    (_, type, date) => `${type} (${date}): `
  );

  // 2c) If it's TYPE followed by colon and findings (no date), ensure proper format for undated investigations
  // This handles cases like "TTE: normal function" or "Bloods normal results"
  s = s.replace(
    /^(TTE|TOE|Stress\s*TTE|CTCA|CMRI|Coronary Angiogram|RHC|ExRHC|Holter Monitor|Event Monitor|Loop Recorder|ABPM|Bloods)\s*[:\s]+(?!\()/i,
    '$1: '
  );

  // 3) Convert "Label, 123" → "Label 123" for common labs
  s = s.replace(/\b(TChol|TG|HDL|LDL|non-HDL|HbA1c|Cr|eGFR|Ferr|Tn|BNP)\s*,\s*(\d+(?:\.\d+)?)/g, '$1 $2');

  // 3b) Fix HbA1c formatting - ensure proper spacing and percentage symbol
  s = s.replace(/\bHbA1c\s*(\d+(?:\.\d+)?)(?!%)/gi, 'HbA1c $1%'); // "HbA1c6" -> "HbA1c 6%" or "HbA1c 6.5" -> "HbA1c 6.5%"

  // Apply remaining ASR corrections
  const REMAINING_PATTERNS: Replacement[] = [
    ...CENTRALIZED_PATTERNS,
    // Keep other investigation patterns except the type conversions we already did
    [/\b(AV|MV|TV|PV)\s+gradient\b/gi, '$1 MPG'],
    [/\biotic\s+valve\s+gradient\b/gi, 'AV MPG'], // "Iotic Valve gradient" -> "AV MPG"
    [/\biotic\s+valve\b/gi, 'AV'], // "Iotic Valve" -> "AV" (fallback)
    // Lab abbreviations
    [/\bHemoglobin\b/gi, 'Hb'], // "Hemoglobin" -> "Hb"
    [/\bHaemoglobin\b/gi, 'Hb'], // "Haemoglobin" -> "Hb" (British spelling)
    // Severity combinations for regurgitation
    [/\bmoderate\s+to\s+severe\b/gi, 'mod-sev'],
    [/\bmild\s+to\s+moderate\b/gi, 'mild-mod'],
    // Greater than symbol for PASP
    [/\bPASP\s+(\d+)\b/gi, 'PASP >$1'],
    // Units for pressure measurements (add mmHg to RVSP when not already present)
    [/\bRVSP\s+(?:from\s+)?(\d+)\s+to\s+(\d+)(?!\s*mmHg)\b/gi, 'RVSP from $1 to $2mmHg'],
    [/\bRVSP\s+(\d+)(?!\s*mmHg)\b/gi, 'RVSP $1mmHg']
  ];

  for (const [pattern, repl] of REMAINING_PATTERNS) {
    s = s.replace(pattern, repl);
  }

  // Exercise test specific patterns (apply after other corrections)
  // Handle METs in exercise testing context - only convert numbers after exercise duration when they appear to be METs
  // Pattern: "exercised for X minutes, Y minutes" where Y is likely METs
  s = s.replace(/\bexercised\s+for\s+(\d+(?:\.\d+)?)\s+minutes,?\s+(\d+(?:\.\d+)?)\s+minutes?\b/gi, 'exercised for $1 minutes, $2 METs');
  
  // Also handle cases where the second number is just floating without "minutes"
  s = s.replace(/\bexercised\s+for\s+(\d+(?:\.\d+)?)\s+minutes,?\s+(\d+(?:\.\d+)?)\.?\s+/gi, 'exercised for $1 minutes, $2 METs; ');

  // Normalise whitespace (but preserve punctuation and numbers)
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}
