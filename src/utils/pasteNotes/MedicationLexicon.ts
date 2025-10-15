/**
 * Medication Lexicon for High-Impact Drug Detection
 *
 * Provides explicit lists of high-impact medications used for review trigger detection.
 * Helps minimize false positives by categorizing drugs by clinical significance.
 */

/**
 * Anticoagulation medications
 */
export const ANTICOAGULANTS = [
  'warfarin',
  'apixaban',
  'rivaroxaban',
  'dabigatran',
  'edoxaban',
  'enoxaparin',
  'heparin',
  'fondaparinux'
] as const;

/**
 * Antiplatelet medications
 */
export const ANTIPLATELETS = [
  'aspirin',
  'clopidogrel',
  'prasugrel',
  'ticagrelor',
  'dipyridamole',
  'ticlopidine'
] as const;

/**
 * Beta-blocker medications
 */
export const BETA_BLOCKERS = [
  'metoprolol',
  'bisoprolol',
  'carvedilol',
  'nebivolol',
  'atenolol',
  'propranolol',
  'sotalol',
  'labetalol'
] as const;

/**
 * ACE inhibitor medications
 */
export const ACE_INHIBITORS = [
  'perindopril',
  'ramipril',
  'lisinopril',
  'enalapril',
  'quinapril',
  'trandolapril',
  'fosinopril'
] as const;

/**
 * ARB (Angiotensin Receptor Blocker) medications
 */
export const ARBS = [
  'candesartan',
  'irbesartan',
  'valsartan',
  'telmisartan',
  'losartan',
  'olmesartan',
  'eprosartan'
] as const;

/**
 * MRA (Mineralocorticoid Receptor Antagonist) medications
 */
export const MRAS = [
  'spironolactone',
  'eplerenone',
  'finerenone'
] as const;

/**
 * SGLT2 inhibitor medications
 */
export const SGLT2_INHIBITORS = [
  'empagliflozin',
  'dapagliflozin',
  'canagliflozin',
  'ertugliflozin'
] as const;

/**
 * Loop diuretic medications
 */
export const LOOP_DIURETICS = [
  'furosemide',
  'frusemide', // Australian spelling variant
  'bumetanide',
  'torsemide',
  'torasemide' // Australian spelling variant
] as const;

/**
 * Common drug name synonyms and abbreviations
 * Maps shorthand/brand names to generic names
 */
export const DRUG_SYNONYMS: Record<string, string> = {
  // Beta-blockers
  'metop': 'metoprolol',
  'bisop': 'bisoprolol',
  'carve': 'carvedilol',

  // ACE inhibitors
  'perin': 'perindopril',
  'ramp': 'ramipril',
  'lisi': 'lisinopril',

  // Anticoagulants
  'warfy': 'warfarin',
  'apixa': 'apixaban',
  'riva': 'rivaroxaban',
  'dabi': 'dabigatran',
  'clexane': 'enoxaparin',

  // Antiplatelets
  'asa': 'aspirin',
  'clopi': 'clopidogrel',
  'pras': 'prasugrel',
  'tica': 'ticagrelor',

  // Diuretics
  'frus': 'furosemide',
  'lasix': 'furosemide',
  'spiro': 'spironolactone',

  // Other common
  'perhexyl': 'perhexiline',
  'perhexylene': 'perhexiline',
  'amlo': 'amlodipine',
  'dilti': 'diltiazem',
  'vera': 'verapamil',
  'ator': 'atorvastatin',
  'rosu': 'rosuvastatin',
  'simva': 'simvastatin'
};

/**
 * Formulation tags that should be normalized for comparison
 */
export const FORMULATION_TAGS = [
  'CR', // Controlled Release
  'XR', // Extended Release
  'IR', // Immediate Release
  'SR', // Sustained Release
  'ER', // Extended Release
  'LA', // Long Acting
  'SA', // Sustained Action
  'MR', // Modified Release
] as const;

/**
 * Check if a drug belongs to anticoagulant category
 */
export function isAnticoagulant(drugName: string): boolean {
  const normalized = normalizeDrugName(drugName);
  return ANTICOAGULANTS.some(drug => normalized.includes(drug));
}

/**
 * Check if a drug belongs to antiplatelet category
 */
export function isAntiplatelet(drugName: string): boolean {
  const normalized = normalizeDrugName(drugName);
  return ANTIPLATELETS.some(drug => normalized.includes(drug));
}

/**
 * Check if a drug belongs to beta-blocker category
 */
export function isBetaBlocker(drugName: string): boolean {
  const normalized = normalizeDrugName(drugName);
  return BETA_BLOCKERS.some(drug => normalized.includes(drug));
}

/**
 * Check if a drug belongs to ACE inhibitor category
 */
export function isACEInhibitor(drugName: string): boolean {
  const normalized = normalizeDrugName(drugName);
  return ACE_INHIBITORS.some(drug => normalized.includes(drug));
}

/**
 * Check if a drug belongs to ARB category
 */
export function isARB(drugName: string): boolean {
  const normalized = normalizeDrugName(drugName);
  return ARBS.some(drug => normalized.includes(drug));
}

/**
 * Check if a drug is any high-impact cardiovascular medication
 */
export function isHighImpactCardiacMed(drugName: string): boolean {
  return (
    isAnticoagulant(drugName) ||
    isAntiplatelet(drugName) ||
    isBetaBlocker(drugName) ||
    isACEInhibitor(drugName) ||
    isARB(drugName)
  );
}

/**
 * Normalize drug name for comparison
 * - Converts to lowercase
 * - Removes formulation tags (CR, XR, IR, etc.)
 * - Applies synonym mapping
 */
export function normalizeDrugName(drugName: string): string {
  let normalized = drugName.toLowerCase().trim();

  // Remove formulation tags
  for (const tag of FORMULATION_TAGS) {
    const tagRegex = new RegExp(`\\b${tag}\\b`, 'gi');
    normalized = normalized.replace(tagRegex, '').trim();
  }

  // Apply synonym mapping
  for (const [synonym, generic] of Object.entries(DRUG_SYNONYMS)) {
    if (normalized.includes(synonym.toLowerCase())) {
      normalized = normalized.replace(synonym.toLowerCase(), generic);
    }
  }

  return normalized;
}

/**
 * Extract formulation tag from drug name if present
 */
export function extractFormulation(drugName: string): string | undefined {
  for (const tag of FORMULATION_TAGS) {
    const tagRegex = new RegExp(`\\b${tag}\\b`, 'i');
    if (tagRegex.test(drugName)) {
      return tag;
    }
  }
  return undefined;
}

/**
 * Compare two drug names accounting for synonyms and formulations
 * Returns true if they refer to the same base drug
 */
export function isSameDrug(drug1: string, drug2: string): boolean {
  const norm1 = normalizeDrugName(drug1);
  const norm2 = normalizeDrugName(drug2);

  return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
}

/**
 * Get drug category for a given drug name
 */
export function getDrugCategory(drugName: string): string | undefined {
  const normalized = normalizeDrugName(drugName);

  if (ANTICOAGULANTS.some(drug => normalized.includes(drug))) {
    return 'anticoagulant';
  }
  if (ANTIPLATELETS.some(drug => normalized.includes(drug))) {
    return 'antiplatelet';
  }
  if (BETA_BLOCKERS.some(drug => normalized.includes(drug))) {
    return 'beta-blocker';
  }
  if (ACE_INHIBITORS.some(drug => normalized.includes(drug))) {
    return 'ace-inhibitor';
  }
  if (ARBS.some(drug => normalized.includes(drug))) {
    return 'arb';
  }
  if (MRAS.some(drug => normalized.includes(drug))) {
    return 'mra';
  }
  if (SGLT2_INHIBITORS.some(drug => normalized.includes(drug))) {
    return 'sglt2-inhibitor';
  }
  if (LOOP_DIURETICS.some(drug => normalized.includes(drug))) {
    return 'loop-diuretic';
  }

  return undefined;
}
