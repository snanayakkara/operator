/**
 * Centralized ASR (Automatic Speech Recognition) Error Corrections
 * 
 * This utility provides common ASR phonetic error corrections used across
 * multiple medical agents to ensure consistency and maintainability.
 * 
 * Usage:
 *   import { applyASRCorrections, ASRCorrections } from '../utils/ASRCorrections';
 *   const correctedText = applyASRCorrections(inputText, 'medication');
 */

export type ReplacementPattern = [RegExp, string];

export interface ASRCorrectionCategories {
  medication: ReplacementPattern[];
  laboratory: ReplacementPattern[];
  pathology: ReplacementPattern[];
  cardiology: ReplacementPattern[];
  severity: ReplacementPattern[];
  valves: ReplacementPattern[];
}

/**
 * Centralized ASR correction patterns organized by medical domain
 */
export const ASRCorrections: ASRCorrectionCategories = {
  /**
   * Common medication name phonetic corrections
   * Extracted from MedicationSystemPrompts.ts
   */
  medication: [
    // Diuretics
    [/\bperuzumide\b/gi, 'frusemide'],
    [/\bfrizomide\b/gi, 'frusemide'],
    [/\baplurinone\b/gi, 'eplerenone'],
    [/\baplowrinone\b/gi, 'eplerenone'],
    [/\bepleranone\b/gi, 'eplerenone'],
    [/\beplerinone\b/gi, 'eplerenone'],
    [/\bspirolactone\b/gi, 'spironolactone'],
    [/\bspyronolactone\b/gi, 'spironolactone'],
    [/\bindapamaid\b/gi, 'indapamide'],
    [/\bindapamet\b/gi, 'indapamide'],
    
    // ACE Inhibitors/ARBs
    [/\bpersindopril\b/gi, 'perindopril'],
    [/\bperrindopril\b/gi, 'perindopril'],
    [/\bramapril\b/gi, 'ramipril'],
    [/\bcandysartan\b/gi, 'candesartan'],
    [/\birbasartan\b/gi, 'irbesartan'],
    [/\burbacone\b/gi, 'irbesartan'],
    [/\btelsartan\b/gi, 'telmisartan'],
    [/\berbizatin\b/gi, 'irbesartan'],

    // Calcium Channel Blockers
    [/\bamlotipine\b/gi, 'amlodipine'],
    [/\bamnlodipine\b/gi, 'amlodipine'],
    [/\bdiltiazam\b/gi, 'diltiazem'],
    [/\bdiltiezem\b/gi, 'diltiazem'],
    
    // Beta Blockers
    [/\bmetroprolol\b/gi, 'metoprolol'],
    [/\bbisaprolol\b/gi, 'bisoprolol'],
    
    // Antiplatelet/Anticoagulants
    [/\bkloppidogrel\b/gi, 'clopidogrel'],
    [/\btick-agrelor\b/gi, 'ticagrelor'],
    [/\btikakgrelor\b/gi, 'ticagrelor'],
    [/\bpruzurel\b/gi, 'prasugrel'],
    [/\brivaroxaban\b/gi, 'rivaroxaban'],
    [/\bapixaban\b/gi, 'apixaban'],
    [/\bdabigatran\b/gi, 'dabigatran'],
    [/\bwarfrin\b/gi, 'warfarin'],
    
    // Statins
    [/\batorvostatin\b/gi, 'atorvastatin'],
    [/\batorvastin\b/gi, 'atorvastatin'],
    [/\brosavastatin\b/gi, 'rosuvastatin'],
    [/\brosuvostatin\b/gi, 'rosuvastatin'],
    [/\bsimvostatin\b/gi, 'simvastatin'],
    [/\bpravostatin\b/gi, 'pravastatin'],
    
    // Diabetes Medications
    [/\bmetfromin\b/gi, 'metformin'],
    [/\bmetflormin\b/gi, 'metformin'],
    [/\bgliklizide\b/gi, 'gliclazide'],
    [/\bgliclisaid\b/gi, 'gliclazide'],
    [/\bglimperide\b/gi, 'glimepiride'],
    [/\bempaglflozin\b/gi, 'empagliflozin'],
    [/\bempaglifozin\b/gi, 'empagliflozin'],
    [/\bdapaglifozin\b/gi, 'dapagliflozin'],
    [/\bsemoglatide\b/gi, 'semaglutide'],
    [/\bsimaglutide\b/gi, 'semaglutide'],
    [/\bdulaglatide\b/gi, 'dulaglutide'],
    
    // Anti-arrhythmics
    [/\bamiodarown\b/gi, 'amiodarone'],
    [/\bamioderone\b/gi, 'amiodarone'],
    
    // PPIs/GI
    [/\bomeprazzole\b/gi, 'omeprazole'],
    [/\bomiprazole\b/gi, 'omeprazole'],
    [/\bisameprazole\b/gi, 'esomeprazole'],
    [/\blansoprazol\b/gi, 'lansoprazole'],
    
    // Other medications
    [/\bappluranol\b/gi, 'allopurinol'],
    [/\balpurinol\b/gi, 'allopurinol'],
    [/\bgabapentine\b/gi, 'gabapentin'],
    [/\bpregabline\b/gi, 'pregabalin'],
    [/\blevothyroxin\b/gi, 'levothyroxine'],
    [/\bprednisolon\b/gi, 'prednisolone'],
    [/\bcolchicine\b/gi, 'colchicine'],
    [/\bisosorbide\b/gi, 'isosorbide']
  ],

  /**
   * Pathology/blood test term corrections
   * Common ASR mistakes for blood test orders
   */
  pathology: [
    // Primary correction: UNEs -> EUC
    [/\bUNE\b/g, 'EUC'],  // Added: single UNE -> EUC
    [/\bUNEs\b/g, 'EUC'],
    [/\bUNES\b/g, 'EUC'], 
    [/\bU and Es\b/gi, 'EUC'],
    [/\bU&Es\b/g, 'EUC'],
    [/\byou and ease\b/gi, 'EUC'],
    [/\byou and E's\b/gi, 'EUC'],
    [/\bU and E's\b/gi, 'EUC'],
    
    // Other common pathology ASR corrections
    [/\bFBE\b/g, 'FBC'], // Full Blood Examination -> Full Blood Count
    [/\bfull blood examination\b/gi, 'FBC'],
    [/\bLFTs\b/g, 'LFT'], // Singular form more common
    [/\bliver function tests\b/gi, 'LFT'],
    [/\bTFTs\b/g, 'TFT'],
    [/\bthyroid function tests\b/gi, 'TFT'],
    [/\bCRPs\b/g, 'CRP'],
    [/\bC-reactive protein\b/gi, 'CRP'],
    [/\bESRs\b/g, 'ESR'],
    [/\biron studies\b/gi, 'Iron Studies'],
    [/\blipids\b/gi, 'Lipid Profile'],
    [/\bglucose\b/gi, 'BSL'],
    [/\bblood sugar level\b/gi, 'BSL'],
    [/\brandom glucose\b/gi, 'Random BSL'],
    [/\bfasting glucose\b/gi, 'Fasting BSL'],
    [/\bHbA1c\b/g, 'HbA1c'],
    [/\bhemoglobin A1C\b/gi, 'HbA1c'],
    [/\bB12\b/g, 'Vitamin B12'],
    [/\bvitamin B 12\b/gi, 'Vitamin B12'],
    [/\bfolate\b/gi, 'Folate'],
    [/\bvitamin D\b/gi, 'Vitamin D'],
    [/\bPSA\b/g, 'PSA'],
    [/\btroponin\b/gi, 'Troponin'],
    [/\bBNP\b/g, 'BNP'],
    [/\bpro BNP\b/gi, 'Pro-BNP'],
    [/\bcoags\b/gi, 'Coagulation Studies'],
    [/\bcoagulation\b/gi, 'Coagulation Studies'],
    [/\bPT INR\b/gi, 'PT/INR'],
    [/\bAPTT\b/g, 'APTT'],
    [/\bmagnesium\b/gi, 'Magnesium'],
    [/\bphosphate\b/gi, 'Phosphate'],
    [/\burate\b/gi, 'Uric Acid'],
    [/\buric acid\b/gi, 'Uric Acid']
  ],

  /**
   * Laboratory term corrections and abbreviations
   * Extracted from InvestigationSummarySystemPrompts.ts
   */
  laboratory: [
    [/\btotal\s+cholesterol\b/gi, 'TChol'],
    [/\btriglycerides?\b/gi, 'TG'],
    [/\bhdl\s+cholesterol\b/gi, 'HDL'],
    [/\bldl\s+cholesterol\b/gi, 'LDL'],
    [/\bnon[-\s]?hdl\b/gi, 'non-HDL'],
    [/\bhaemoglobin\s*a1c\b/gi, 'HbA1c'],
    [/\bhb\s*a1c\b/gi, 'HbA1c'],
    [/\bhpa1c\b/gi, 'HbA1c'], // Common ASR mis-capitalization
    [/\bcreatinine\b/gi, 'Cr'],
    [/\bestimated\s+gfr\b/gi, 'eGFR'],
    [/\begfr\b/gi, 'eGFR'],
    [/\bferritin\b/gi, 'Ferr'],
    [/\btroponin\b/gi, 'Tn'],
    [/\b(?:b[-\s]?type\s+)?natriuretic\s+peptide\b/gi, 'BNP'],
    // Blood pressure format conversions - "X on Y" to "X/Y"
    [/\bAverage\s+(\d{2,3})\s+on\s+(\d{2,3})\b/g, 'average $1/$2'], // e.g., "Average 126 on 77" -> "average 126/77"
    [/\bOvernight\s+(\d{2,3})\s+on\s+(\d{2,3})\b/g, 'overnight $1/$2'], // e.g., "Overnight 116 on 66" -> "overnight 116/66"
    [/\bDaytime\s+(\d{2,3})\s+on\s+(\d{2,3})\b/g, 'daytime $1/$2'], // e.g., "Daytime 130 on 80" -> "daytime 130/80"
    [/\bMean\s+(\d{2,3})\s+on\s+(\d{2,3})\b/g, 'mean $1/$2'], // e.g., "Mean 125 on 75" -> "mean 125/75"
    [/\b(\d{2,3})\s+on\s+(\d{2,3})\b/g, '$1/$2'] // e.g., "126 on 77" -> "126/77" (catch-all, keep last)
  ],

  /**
   * Cardiology anatomy abbreviations
   * Extracted from InvestigationSummarySystemPrompts.ts
   */
  cardiology: [
    // Date format: remove leading zeros from day numbers in medical reports
    [/\b0(\d)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi, '$1 $2'],
    // Medical terminology: cardiac wall regions
    [/\banteo[-\s]?receptal\b/gi, 'anteroseptal'],
    // Capitalization: medical descriptors should be lowercase
    [/\antiraceptal\s+/g, 'anteroseptal '],
    [/\bSubtle\s+/g, 'subtle '],
    [/\bbiventricular\b/gi, 'BiV'],
    [/\bleft\s+atri(?:um|al)\b/gi, 'LA'],
    [/\bright\s+atri(?:um|al)\b/gi, 'RA'],
    [/\bleft\s+ventric(?:le|ular)\b/gi, 'LV'],
    [/\bright\s+ventric(?:le|ular)\b/gi, 'RV'],
    [/\bCT\s+coronary\s+angiogram\b/gi, 'CTCA'],
    // Common lesion descriptor mishearing: "ostial, calcified" → "osteocalcified"
    [/\bosteo[-\s]?calcified\b/gi, 'ostial, calcified'],
    // Investigation type corrections
    [/\btrans\s*thoracic\s*echo(?:cardiogram)?\b/gi, 'TTE'],
    [/\btrans\s*oesophageal\s*echo(?:cardiogram)?\b/gi, 'TOE'],
    [/\btrans\s*esophageal\s*echo(?:cardiogram)?\b/gi, 'TOE'], // US spelling
    // Cardiac measurement corrections
    [/\bTAPC\b/gi, 'TAPSE'],
    [/\btapc\b/gi, 'TAPSE'],
    // Common regurgitation parsing errors
    [/\banaerotic\s+regurgitation\b/gi, 'and aortic regurgitation'],
    [/\bmitral\s+anaerotic\s+regurgitation\b/gi, 'mitral and aortic regurgitation'],
    // Regurgitation abbreviations
    [/\bmitral\s+regurgitation\b/gi, 'MR'],
    [/\baortic\s+regurgitation\b/gi, 'AR'],
    [/\bpulmonary\s+regurgitation\b/gi, 'PR'],
    [/\btricuspid\s+regurgitation\b/gi, 'TR'],
    // Units for common cardiac measurements
    [/\bTAPSE\s+(\d+)(?!\s*mm)\b/gi, 'TAPSE $1mm'],
    [/\bPASP\s+(\d+)(?!\s*mmHg)\b/gi, 'PASP $1mmHg'],
    [/\bRV\s+basal\s+diameter\s+(\d+)(?!\s*mm)\b/gi, 'RV basal diameter $1mm']
  ],

  /**
   * Medical severity term standardization
   * Extracted from InvestigationSummarySystemPrompts.ts
   */
  severity: [
    [/\bNORMAL\b/g, 'normal'],
    [/\bNormal\b/g, 'normal'],
    [/\bMILD\b/g, 'mild'],
    [/\bMild\b/g, 'mild'],
    [/\bMODERATE\b/g, 'moderate'],
    [/\bModerate\b/g, 'moderate'],
    [/\bSEVERE\b/g, 'severe'],
    [/\bSevere\b/g, 'severe'],
    [/\bSATISFACTORY\b/g, 'satisfactory'],
    [/\bSatisfactory\b/g, 'satisfactory']
  ],

  /**
   * Valve and measurement abbreviations
   * Extracted from InvestigationSummarySystemPrompts.ts
   */
  valves: [
    [/\baortic\s+valve\s+gradient\b/gi, 'AV MPG'],
    [/\bmitral\s+valve\s+gradient\b/gi, 'MV MPG'],
    [/\btricuspid\s+valve\s+gradient\b/gi, 'TV MPG'],
    [/\bpulmonary\s+valve\s+gradient\b/gi, 'PV MPG'],
    [/\baortic\s+valve\b/gi, 'AV'],
    [/\bmitral\s+valve\b/gi, 'MV'],
    [/\btricuspid\s+valve\b/gi, 'TV'],
    [/\bpulmonary\s+valve\b/gi, 'PV'],
    [/\bmean\s+pressure\s+gradient\b/gi, 'MPG'],
    [/\bpeak\s+pressure\s+gradient\b/gi, 'PPG'],
    [/\biotic\s+valve\b/gi, 'AV'], // Common transcription error
    [/\bEF\s*(\d+)(?!%)\b/gi, 'EF $1%'], // Add percentage to EF values if not already present
    [/\bejection\s+fraction\s*(\d+)(?!%)\b/gi, 'EF $1%'] // Handle "ejection fraction XX" if not already with %
  ]
};

/**
 * Apply ASR corrections to text based on specified categories
 * 
 * @param text - Input text to correct
 * @param categories - Array of correction categories to apply, or 'all' for all categories
 * @returns Corrected text
 */
export function applyASRCorrections(
  text: string, 
  categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
): string {
  let correctedText = text;
  
  const categoriesToApply = categories === 'all' 
    ? Object.keys(ASRCorrections) as (keyof ASRCorrectionCategories)[]
    : categories;

  for (const category of categoriesToApply) {
    const patterns = ASRCorrections[category];
    for (const [pattern, replacement] of patterns) {
      correctedText = correctedText.replace(pattern, replacement);
    }
  }

  return correctedText;
}

/**
 * Get all replacement patterns from specified categories
 * 
 * @param categories - Array of categories or 'all' for all categories
 * @returns Combined array of replacement patterns
 */
export function getCombinedPatterns(
  categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
): ReplacementPattern[] {
  const categoriesToInclude = categories === 'all' 
    ? Object.keys(ASRCorrections) as (keyof ASRCorrectionCategories)[]
    : categories;

  const allPatterns: ReplacementPattern[] = [];
  for (const category of categoriesToInclude) {
    allPatterns.push(...ASRCorrections[category]);
  }

  return allPatterns;
}

/**
 * Additional medication-specific corrections from MedicationSystemPrompts.ts
 */
export const MedicationSpecificCorrections = {
  /**
   * Brand name to generic mappings (Australian focus)
   */
  brandToGeneric: {
    // Cardiac
    'Lipitor': 'atorvastatin',
    'Crestor': 'rosuvastatin', 
    'Zocor': 'simvastatin',
    'Plavix': 'clopidogrel',
    'Brilinta': 'ticagrelor',
    'Xarelto': 'rivaroxaban',
    'Eliquis': 'apixaban',
    'Pradaxa': 'dabigatran',
    'Coversyl': 'perindopril',
    'Atacand': 'candesartan',
    'Micardis': 'telmisartan',
    'Betaloc': 'metoprolol',
    'Lasix': 'frusemide',
    'Aldactone': 'spironolactone',
    
    // Diabetes
    'Jardiance': 'empagliflozin',
    'Forxiga': 'dapagliflozin',
    'Trulicity': 'dulaglutide',
    'Ozempic': 'semaglutide',
    'Lantus': 'insulin glargine',
    'NovoRapid': 'insulin aspart',
    
    // Others
    'Ventolin': 'salbutamol',
    'Nexium': 'esomeprazole',
    'Somac': 'pantoprazole'
  },

  /**
   * Australian medication spellings
   */
  australianSpellings: {
    'furosemide': 'frusemide',
    'sulfasalazine': 'sulphasalazine', 
    'sulfonylurea': 'sulphonylurea'
  },

  /**
   * Frequency standardization
   */
  frequencyMapping: {
    'once daily': 'daily',
    'once a day': 'daily',
    'twice daily': 'BD', 
    'twice a day': 'BD',
    'three times daily': 'TDS',
    'three times a day': 'TDS',
    'four times daily': 'QID',
    'four times a day': 'QID',
    'as needed': 'PRN',
    'as required': 'PRN',
    'at night': 'nocte',
    'at bedtime': 'nocte',
    'in the morning': 'mane'
  }
};

/**
 * Apply medication-specific corrections including brand-to-generic mapping
 * and Australian spelling preferences
 */
export function applyMedicationCorrections(text: string): string {
  let correctedText = text;
  
  // Apply ASR phonetic corrections first
  correctedText = applyASRCorrections(correctedText, ['medication']);
  
  // Apply brand to generic mappings
  for (const [brand, generic] of Object.entries(MedicationSpecificCorrections.brandToGeneric)) {
    const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
    correctedText = correctedText.replace(brandRegex, generic);
  }
  
  // Apply Australian spellings
  for (const [us, au] of Object.entries(MedicationSpecificCorrections.australianSpellings)) {
    const usRegex = new RegExp(`\\b${us}\\b`, 'gi');
    correctedText = correctedText.replace(usRegex, au);
  }
  
  return correctedText;
}
