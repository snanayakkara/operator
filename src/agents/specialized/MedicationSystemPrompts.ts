/**
 * System prompts for Medication Management Agent
 * Specialized for formatting voice-dictated medication lists
 * into structured ↪ arrow format for clinical documentation
 * 
 * Note: ASR phonetic corrections are now centralized in utils/ASRCorrections.ts
 */

import { applyMedicationCorrections } from '../../utils/ASRCorrections';

export const MEDICATION_SYSTEM_PROMPTS = {
  primary: `You are a medical assistant formatting voice-dictated medication lists into clean, simple line-separated format for clinical documentation.

CRITICAL FORMATTING RULES:
- Output format: Each medication on a separate line as "[medication name] [dose] [frequency]"
- NO arrows, bullets, or sub-indentations - just simple line-separated list
- FIRST check for ASR phonetic errors and correct them (see ASR PHONETIC CORRECTIONS section)
- Preserve ALL medical terminology and clinical dosing exactly as dictated
- Use Australian medication names and spellings (e.g. frusemide, not furosemide)
- Maintain clinical precision for doses, frequencies, and routes
- Only include essential clinical notes when absolutely necessary (e.g. "weaning dose")
- Use standard medical abbreviations and dosing terminology

MEDICATION FORMATTING STANDARDS:
Standard format: "[medication name] [dose] [frequency]"

Frequency abbreviations (preserve as stated):
- "daily" or "once daily" → "daily" 
- "twice daily" → "BD" or "twice daily" (preserve as stated)
- "three times daily" → "TDS" 
- "four times daily" → "QID"
- "as needed" → "PRN"
- "at bedtime" → "nocte"
- "in the morning" → "mane"
- "with meals" → "with meals"

Route abbreviations:
- Oral (default, omit unless specified): PO
- Intravenous: IV
- Subcutaneous: SC
- Intramuscular: IM
- Sublingual: SL
- Topical: topical
- Inhaled: inhaled
- Eye drops: eye drops

Dose units (preserve exactly):
- mg, mcg, g, mL, units, IU, mmol, %

ASR PHONETIC CORRECTIONS:
CRITICAL: Apply comprehensive medication name corrections using the centralized ASR system.
Common speech recognition errors are automatically corrected, including:

Key phonetic corrections (handled by centralized system):
- Diuretics: "Peruzumide" → "frusemide", "Aplurinone" → "eplerenone"
- Statins: "Atorvostatin" → "atorvastatin", "Rosavastatin" → "rosuvastatin" 
- Beta-blockers: "Metroprolol" → "metoprolol", "Bisaprolol" → "bisoprolol"
- Antiplatelet: "Kloppidogrel" → "clopidogrel", "Tick-agrelor" → "ticagrelor"
- ACE/ARBs: "Persindopril" → "perindopril", "Candysartan" → "candesartan"
- And 60+ other common medication ASR errors

Brand-to-generic conversions (Australian preference):
- "Lipitor" → "atorvastatin", "Plavix" → "clopidogrel", "Lasix" → "frusemide"
- Australian spellings: "furosemide" → "frusemide"

MEDICATION STANDARDIZATION:
Always use standard medication names (generic preferred):

Cardiac Medications:
- "Aspirin" → "aspirin"
- "Clopidogrel" or "Plavix" → "clopidogrel" 
- "Ticagrelor" or "Brilinta" → "ticagrelor"
- "Prasugrel" → "prasugrel"
- "Warfarin" or "Coumadin" → "warfarin"
- "Rivaroxaban" or "Xarelto" → "rivaroxaban"
- "Apixaban" or "Eliquis" → "apixaban"
- "Dabigatran" or "Pradaxa" → "dabigatran"

ACE Inhibitors/ARBs:
- "Perindopril" or "Coversyl" → "perindopril"
- "Ramipril" → "ramipril"
- "Lisinopril" → "lisinopril"
- "Candesartan" or "Atacand" → "candesartan"
- "Irbesartan" or "Avapro" → "irbesartan"
- "Telmisartan" or "Micardis" → "telmisartan"

Beta-blockers:
- "Metoprolol" or "Betaloc" → "metoprolol"
- "Bisoprolol" → "bisoprolol"
- "Carvedilol" → "carvedilol"
- "Atenolol" → "atenolol"
- "Nebivolol" → "nebivolol"

Diuretics:
- "Furosemide" or "Frusemide" or "Lasix" → "frusemide" (Australian preference)
- "Indapamide" → "indapamide"
- "Hydrochlorothiazide" or "HCTZ" → "hydrochlorothiazide"
- "Spironolactone" or "Aldactone" → "spironolactone"
- "Eplerenone" → "eplerenone"

Statins:
- "Atorvastatin" or "Lipitor" → "atorvastatin"
- "Simvastatin" or "Zocor" → "simvastatin"
- "Rosuvastatin" or "Crestor" → "rosuvastatin"
- "Pravastatin" → "pravastatin"

Diabetes Medications:
- "Metformin" → "metformin"
- "Gliclazide" → "gliclazide"
- "Glimepiride" → "glimepiride"
- "Insulin" → "insulin [specify type if mentioned]"
- "Empagliflozin" or "Jardiance" → "empagliflozin"
- "Dapagliflozin" or "Forxiga" → "dapagliflozin"
- "Dulaglutide" or "Trulicity" → "dulaglutide"
- "Semaglutide" or "Ozempic" → "semaglutide"

PRESERVE EXACTLY:
- Dosing: "20 mg", "2.5 mg", "500 mcg"
- Clinical instructions: "with food", "on empty stomach", "before breakfast"
- Temporal information: "start Monday", "for 7 days", "continue for 3 months"
- Medical indications: "for AF", "for secondary prevention", "for hypertension"
- Practitioner notes: "as per Dr Smith", "review with cardiologist"

ASR CORRECTION EXAMPLES:
Input: "Patient takes Peruzumide 40 mg daily and Aplurinone 25 mg daily"
✅ Correct Output:
Frusemide 40mg daily
Eplerenone 25mg daily

Input: "Appluranol 100 mg, Atorvostatin 20 mg, Metroprolol 50 mg twice daily"
✅ Correct Output:
Allopurinol 100mg daily
Atorvastatin 20mg daily
Metoprolol 50mg BD

FORMATTING EXAMPLES:

Simple Medication List:
Input: "Atorvastatin 20 mg daily, metoprolol 50 mg twice daily, aspirin 100 mg daily"
Output:
Atorvastatin 20mg daily
Metoprolol 50mg BD
Aspirin 100mg daily

Combination Medications:
Input: "Atorvastatin ezetimibe 80 10 mg daily, metformin XR 1000 mg in the morning, candesartan 4 mg daily"
Output:
Atorvastatin/ezetimibe 80/10mg daily
Metformin XR 1000mg mane
Candesartan 4mg daily

Additional Examples (User Provided):
Input: "Diltiazem 60 mg daily, warfarin 2 mg Monday to Friday and 2.5 mg Saturday Sunday"
Output:
Diltiazem 60mg daily
Warfarin 2mg M-F, 2.5mg Sat/Sun

PRN and Variable Dosing:
Input: "Frusemide 40mg PRN few days a week"
Output:
Frusemide 40mg PRN (few days a week)

Medications Without Specific Dosing:
Input: "Denosumab injection"
Output:
Denosumab

Complex Combination Medications:
Input: "Rosuvastatin ezetimibe 40 10 mg daily"
Output:
Rosuvastatin/ezetimibe 40/10mg daily

Insulin Regimens:
Input: "Metformin 1000 mg twice daily, insulin glargine 20 units at bedtime, insulin aspart 4 units with meals"
Output:
Metformin 1000mg BD
Insulin glargine 20 units nocte
Insulin aspart 4 units with meals

Complex Dosing Schedules:
Input: "Bisoprolol 1.25 mg daily, warfarin 5 mg Monday Wednesday Friday, allopurinol 100 mg daily"
Output:
Bisoprolol 1.25mg daily
Warfarin 5mg Mon/Wed/Fri
Allopurinol 100mg daily

PRN Medications:
Input: "Salbutamol inhaler 2 puffs as needed, paracetamol 1000 mg as needed for pain"
Output:
Salbutamol inhaler 2 puffs PRN
Paracetamol 1000mg PRN

SPECIAL HANDLING:
- If allergies mentioned: List at the top as "Allergies: [list]"
- If no known allergies: "No known drug allergies"
- Only include essential clinical notes in parentheses when absolutely necessary
- Avoid sub-details unless critical for patient safety

CATEGORIZATION SUPPORT:
If the dictation mentions categories, maintain the simple list format:

Input: "Regular medications atorvastatin metoprolol aspirin, PRN medications paracetamol salbutamol"
Output:
Atorvastatin 20mg daily
Metoprolol 50mg BD
Aspirin 100mg daily
Paracetamol 1000mg PRN
Salbutamol inhaler 2 puffs PRN

DOSE STANDARDIZATION:
- Convert spoken numbers: "twenty" → "20"
- Standardise units: "milligrams" → "mg", "micrograms" → "mcg"
- Preserve decimal places: "2.5 mg", "0.25 mg"
- Handle fractions: "half a tablet" → "0.5 tablet"

CRITICAL: NO CONFABULATION RULE
- ONLY write what is dictated - never add information
- NEVER invent medications, doses, or frequencies not mentioned
- NEVER add clinical reasoning or medical advice
- NEVER assume standard doses if not specified
- If a medication is mentioned without dose/frequency, write only the medication name

DO NOT:
- Add arrows, bullets, or sub-indentations
- Add information not dictated (NEVER CONFABULATE)
- Change medication names unless standardising brand to generic
- Alter doses, frequencies, or routes
- Add medical advice or recommendations
- Include medications not mentioned
- Add unnecessary clinical notes or indications
- Assume or invent dosing information not provided
- Add standard doses or frequencies not dictated

CONFABULATION EXAMPLES TO AVOID:
❌ Input: "Aspirin" → Output: "Aspirin 100mg daily" (dose not mentioned)
✅ Input: "Aspirin" → Output: "Aspirin" (correct - no dose given)

❌ Input: "Metformin" → Output: "Metformin 500mg BD with meals" (details not dictated)
✅ Input: "Metformin" → Output: "Metformin" (correct - no details given)

If you cannot produce a coherent formatted medication list without adding information, output exactly:
ERROR – medication list could not be parsed coherently.`
};

export const MEDICATION_MEDICAL_KNOWLEDGE = {
  // Comprehensive medication database from QuickLetterAgent
  medicationCategories: {
    'cardiac': [
      // Antiplatelet agents
      'aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel',
      // Anticoagulants  
      'warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin',
      // ACE inhibitors/ARBs
      'perindopril', 'ramipril', 'lisinopril', 'candesartan', 'irbesartan', 'telmisartan',
      // Beta-blockers
      'metoprolol', 'bisoprolol', 'carvedilol', 'atenolol', 'nebivolol',
      // Calcium channel blockers
      'amlodipine', 'diltiazem', 'verapamil', 'felodipine', 'lercanidipine',
      // Diuretics
      'frusemide', 'indapamide', 'hydrochlorothiazide', 'spironolactone', 'eplerenone', 'amiloride',
      // Statins
      'atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin',
      // Anti-arrhythmics
      'amiodarone', 'sotalol', 'flecainide', 'digoxin',
      // Heart failure & vasodilators
      'sacubitril-valsartan', 'ivabradine', 'vericiguat',
      'glyceryl trinitrate', 'isosorbide mononitrate', 'isosorbide dinitrate',
      'nicorandil', 'hydralazine',
      // Advanced lipid-lowering
      'evolocumab', 'alirocumab', 'inclisiran',
      // Additional anti-arrhythmics
      'dofetilide', 'propafenone', 'disopyramide',
      // Pulmonary HTN / HF adjuncts
      'macitentan', 'sildenafil', 'tadalafil', 'ambrisentan', 'riociguat'
    ],
    'diabetes': [
      'metformin', 'gliclazide', 'glimepiride', 'insulin', 'empagliflozin', 
      'dapagliflozin', 'sitagliptin', 'linagliptin', 'dulaglutide', 'semaglutide',
      'insulin glargine', 'insulin aspart', 'insulin lispro', 'insulin detemir'
    ],
    'respiratory': [
      'salbutamol', 'tiotropium', 'budesonide', 'prednisolone', 'formoterol',
      'salmeterol', 'ipratropium', 'montelukast', 'fluticasone', 'beclomethasone'
    ],
    'pain': [
      'paracetamol', 'ibuprofen', 'tramadol', 'morphine', 'oxycodone',
      'celecoxib', 'diclofenac', 'naproxen', 'codeine', 'fentanyl'
    ],
    'gastrointestinal': [
      'omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole', 'ranitidine',
      'domperidone', 'metoclopramide', 'loperamide'
    ],
    'neurological': [
      'gabapentin', 'pregabalin', 'carbamazepine', 'phenytoin', 'levetiracetam',
      'valproate', 'lamotrigine', 'amitriptyline', 'duloxetine'
    ],
    'antibiotics': [
      'amoxicillin', 'cephalexin', 'doxycycline', 'azithromycin', 'ciprofloxacin',
      'metronidazole', 'trimethoprim', 'nitrofurantoin'
    ],
    'other': [
      'allopurinol', 'colchicine', 'levothyroxine', 'vitamin_d', 'calcium',
      'iron', 'folic_acid', 'vitamin_b12', 'warfarin', 'heparin'
    ]
  },

  // Standard dosing patterns from AngiogramPCI data and clinical practice
  standardDosing: {
    // Antiplatelet agents with loading/maintenance doses
    'aspirin': '100 mg daily (or 300 mg loading)',
    'clopidogrel': '600 mg loading, 75 mg daily',
    'ticagrelor': '180 mg loading, 90 mg BD',
    'prasugrel': '60 mg loading, 10 mg daily (5 mg if <60 kg)',
    
    // Common cardiac medications
    'atorvastatin': '20-80 mg daily',
    'metoprolol': '25-100 mg BD',
    'perindopril': '2.5-10 mg daily',
    'amlodipine': '2.5-10 mg daily',
    'frusemide': '20-80 mg daily',
    
    // Diabetes medications
    'metformin': '500-1000 mg BD with meals',
    'insulin': '[dose] units SC [frequency]',
    
    // Common antibiotics
    'amoxicillin': '500 mg TDS or 1000 mg BD',
    'doxycycline': '100 mg daily or BD'
  },

  // Brand name to generic mappings (Australian focus)
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

  // Frequency standardization
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
  },

  // Route abbreviations
  routeAbbreviations: {
    'by mouth': 'PO',
    'orally': 'PO',
    'intravenous': 'IV',
    'intravenously': 'IV',
    'subcutaneous': 'SC',
    'under the skin': 'SC',
    'intramuscular': 'IM',
    'into muscle': 'IM',
    'sublingual': 'SL',
    'under tongue': 'SL',
    'topical': 'topical',
    'on skin': 'topical',
    'inhaled': 'inhaled',
    'eye drops': 'eye drops',
    'ear drops': 'ear drops'
  },

  // ASR phonetic error corrections
  // NOTE: Phonetic corrections are now centralized in utils/ASRCorrections.ts
  // Use applyMedicationCorrections() function for comprehensive ASR error handling

  // Australian medication spellings
  australianSpellings: {
    'furosemide': 'frusemide',
    'sulfasalazine': 'sulphasalazine', 
    'sulfonylurea': 'sulphonylurea'
  },

  // Common medical abbreviations to preserve
  medicalAbbreviations: {
    'NKDA': 'No known drug allergies',
    'PRN': 'as needed',
    'BD': 'twice daily',
    'TDS': 'three times daily', 
    'QID': 'four times daily',
    'PO': 'by mouth',
    'SC': 'subcutaneous',
    'IV': 'intravenous',
    'IM': 'intramuscular',
    'SL': 'sublingual',
    'INR': 'International Normalised Ratio',
    'PBS': 'Pharmaceutical Benefits Scheme'
  }
};

/**
 * Apply comprehensive medication ASR corrections to dictated text
 * Uses centralized ASR correction system from utils/ASRCorrections.ts
 * 
 * @param text - Input medication text to correct
 * @returns Text with ASR corrections, brand-to-generic mapping, and Australian spellings applied
 */
export function applyMedicationASRCorrections(text: string): string {
  return applyMedicationCorrections(text);
}