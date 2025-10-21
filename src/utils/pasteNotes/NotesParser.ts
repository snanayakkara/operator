/**
 * Notes Parser for Quick Letter Paste Feature
 *
 * Parses pasted clinical notes to extract:
 * - Medication snapshots and deltas
 * - Clinical sections (background, investigations, plan)
 * - Patient identifiers (for mismatch detection)
 * - Placeholders and ambiguities
 */

import type { ParsedNotes, MedEntry, MedDelta } from '@/types/pasteNotes.types';
import {
  normalizeDrugName,
  extractFormulation,
  DRUG_SYNONYMS
} from './MedicationLexicon';

/**
 * Medication section header patterns
 */
const MEDS_HEADER_PATTERNS = [
  /^meds?:\s*/im,
  /^medications?:\s*/im,
  /^rx:\s*/im,
  /^current medications?:\s*/im,
  /^medication list:\s*/im
];

/**
 * Verb-driven delta patterns (start/stop/increase/decrease)
 */
const DELTA_PATTERNS = {
  start: /\b(start|commence|begin|initiate|add)\s+([a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole|pamide|zepam|mycin))/gi,
  stop: /\b(stop|cease|discontinue|d\/c|dc)\s+([a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole|pamide|zepam|mycin)|[a-z]{4,})/gi,
  hold: /\b(hold|withhold|suspend)\s+([a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole|pamide|zepam|mycin))/gi,
  increase: /\b(increase|↑|up|uptitrate)\s+([a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole|pamide|zepam|mycin))/gi,
  decrease: /\b(decrease|reduce|↓|down|downtitrate)\s+([a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole|pamide|zepam|mycin))/gi,
  switch: /\b(switch|change|swap)\s+([a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole|pamide|zepam|mycin))\s+(?:to|for)\s+([a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole|pamide|zepam|mycin))/gi,
};

/**
 * Medication line pattern (for heuristic snapshot detection)
 * Matches: <drug> <dose><unit> <freq> [route]
 */
const MED_LINE_PATTERN = /^[\s-•*]*([\w\s-]+?)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)\s+(bd|od|tds|qid|prn|daily|twice daily|three times daily|at night|mane|nocte|as required)(?:\s+(po|sc|iv|im|pr|sl|inh|topical))?/im;

/**
 * Placeholder patterns (indicating ambiguity)
 */
const PLACEHOLDER_PATTERNS = [
  /\?[\w\s]*/g,
  /\bTBC\b/gi,
  /\bto be confirmed\b/gi,
  /\bconfirm with\b/gi,
  /\bunclear\b/gi,
  /\bcheck\b.*(?:dose|frequency|medication)/gi
];

/**
 * Section header patterns
 */
const SECTION_PATTERNS = {
  background: /^(?:background|history|pmhx|pmh):\s*/im,
  investigation_summary: /^(?:investigations?|results?|tests?):\s*/im,
  plan: /^(?:plan|management|recommendations?):\s*/im
};

/**
 * Parse pasted clinical notes
 */
export function parseNotes(notes: string): ParsedNotes {
  const lines = notes.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Check for medication header
  const hasMedsHeader = MEDS_HEADER_PATTERNS.some(pattern => pattern.test(notes));

  // Extract medication section if header exists
  let medsSection = '';
  let medsSnapshot: MedEntry[] = [];
  let medsConfidence = 0;

  if (hasMedsHeader) {
    medsSection = extractMedicationSection(notes);
    medsSnapshot = parseMedicationSnapshot(medsSection);
    medsConfidence = medsSnapshot.length > 0 ? 0.9 : 0.5;
  } else {
    // Heuristic detection: look for medication-like lines
    const medLines = lines.filter(line => MED_LINE_PATTERN.test(line));
    if (medLines.length >= 2) {
      // Promote to snapshot
      medsSnapshot = parseMedicationSnapshot(medLines.join('\n'));
      medsConfidence = 0.6; // Lower confidence for heuristic detection
    }
  }

  // Extract verb-driven deltas
  const deltas = extractMedicationDeltas(notes);

  // Extract sections
  const sections = extractSections(notes);

  // Detect patient info (for identity mismatch)
  const detected_patient = detectPatientInfo(notes);

  // Extract placeholders
  const placeholders = extractPlaceholders(notes);

  return {
    raw: notes,
    contains_meds_header: hasMedsHeader,
    meds_snapshot: medsSnapshot,
    deltas,
    confidence: medsConfidence,
    sections,
    detected_patient,
    placeholders
  };
}

/**
 * Extract medication section from notes
 */
function extractMedicationSection(notes: string): string {
  for (const pattern of MEDS_HEADER_PATTERNS) {
    const match = notes.match(new RegExp(pattern.source + '([\\s\\S]*?)(?=\\n\\n[A-Z]|$)', 'im'));
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

/**
 * Parse medication snapshot from section text
 */
function parseMedicationSnapshot(sectionText: string): MedEntry[] {
  const medications: MedEntry[] = [];
  const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  for (const line of lines) {
    const match = line.match(MED_LINE_PATTERN);
    if (match) {
      const [, drug, dose, unit, freq, route] = match;

      // Normalize drug name (handle synonyms and abbreviations)
      const normalizedDrug = normalizeDrugNameWithSynonyms(drug.trim());
      const formulation = extractFormulation(drug.trim());

      medications.push({
        drug: normalizedDrug,
        dose: dose,
        unit: unit.toLowerCase(),
        freq: freq.toLowerCase(),
        route: route?.toLowerCase(),
        formulation
      });
    }
  }

  return medications;
}

/**
 * Extract medication deltas (verb-driven changes)
 */
function extractMedicationDeltas(notes: string): MedDelta[] {
  const deltas: MedDelta[] = [];

  // Start
  for (const match of notes.matchAll(DELTA_PATTERNS.start)) {
    const [, _action, drug] = match;
    const normalizedDrug = normalizeDrugNameWithSynonyms(drug);
    deltas.push({
      action: 'start',
      drug: normalizedDrug
    });
  }

  // Stop
  for (const match of notes.matchAll(DELTA_PATTERNS.stop)) {
    const [, _action, drug] = match;
    const normalizedDrug = normalizeDrugNameWithSynonyms(drug);
    deltas.push({
      action: 'stop',
      drug: normalizedDrug
    });
  }

  // Hold
  for (const match of notes.matchAll(DELTA_PATTERNS.hold)) {
    const [, _action, drug] = match;
    const normalizedDrug = normalizeDrugNameWithSynonyms(drug);
    deltas.push({
      action: 'hold',
      drug: normalizedDrug
    });
  }

  // Increase (↑)
  for (const match of notes.matchAll(DELTA_PATTERNS.increase)) {
    const [, _action, drug] = match;
    const normalizedDrug = normalizeDrugNameWithSynonyms(drug);

    // Try to extract dose information
    const doseMatch = notes.match(new RegExp(`${drug}.*?(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|g)`, 'i'));
    deltas.push({
      action: 'increase',
      drug: normalizedDrug,
      to: doseMatch ? {
        dose: doseMatch[1],
        unit: doseMatch[2].toLowerCase()
      } : undefined
    });
  }

  // Decrease (↓)
  for (const match of notes.matchAll(DELTA_PATTERNS.decrease)) {
    const [, _action, drug] = match;
    const normalizedDrug = normalizeDrugNameWithSynonyms(drug);

    // Try to extract dose information
    const doseMatch = notes.match(new RegExp(`${drug}.*?(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|g)`, 'i'));
    deltas.push({
      action: 'decrease',
      drug: normalizedDrug,
      to: doseMatch ? {
        dose: doseMatch[1],
        unit: doseMatch[2].toLowerCase()
      } : undefined
    });
  }

  // Switch
  for (const match of notes.matchAll(DELTA_PATTERNS.switch)) {
    const [, _action, fromDrug, toDrug] = match;
    const normalizedFrom = normalizeDrugNameWithSynonyms(fromDrug);
    const _normalizedTo = normalizeDrugNameWithSynonyms(toDrug);
    deltas.push({
      action: 'switch',
      drug: normalizedFrom,
      from: { dose: undefined, unit: undefined, freq: undefined },
      to: { dose: undefined, unit: undefined, freq: undefined }
    });
  }

  return deltas;
}

/**
 * Extract clinical sections from notes
 */
function extractSections(notes: string): Record<string, string> {
  const sections: Record<string, string> = {};

  for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
    const match = notes.match(new RegExp(pattern.source + '([\\s\\S]*?)(?=\\n\\n[A-Z]|$)', 'im'));
    if (match) {
      sections[sectionName] = match[1].trim();
    }
  }

  return sections;
}

/**
 * Detect patient info from notes (for identity mismatch check)
 */
function detectPatientInfo(notes: string): { name?: string; mrn?: string } | undefined {
  const info: { name?: string; mrn?: string } = {};

  // Try to detect name (very conservative pattern)
  const nameMatch = notes.match(/^(?:patient|pt|name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/im);
  if (nameMatch) {
    info.name = nameMatch[1].trim();
  }

  // Try to detect MRN
  const mrnMatch = notes.match(/\b(?:mrn|ur|urn?):\s*(\d+)/i);
  if (mrnMatch) {
    info.mrn = mrnMatch[1];
  }

  return Object.keys(info).length > 0 ? info : undefined;
}

/**
 * Extract placeholders indicating ambiguity
 */
function extractPlaceholders(notes: string): string[] {
  const placeholders: string[] = [];

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = notes.matchAll(pattern);
    for (const match of matches) {
      placeholders.push(match[0]);
    }
  }

  return [...new Set(placeholders)]; // Remove duplicates
}

/**
 * Normalize drug name with synonym mapping
 */
function normalizeDrugNameWithSynonyms(drug: string): string {
  let normalized = normalizeDrugName(drug);

  // Apply synonym mapping
  for (const [synonym, generic] of Object.entries(DRUG_SYNONYMS)) {
    if (normalized.includes(synonym.toLowerCase())) {
      normalized = normalized.replace(synonym.toLowerCase(), generic);
      break; // Only apply first match
    }
  }

  return normalized;
}

/**
 * Check notes completeness (sparsity check)
 */
export interface SparsityCheckResult {
  sparse: boolean;
  missing: string[];
}

export function checkNotesCompleteness(notes: string): SparsityCheckResult {
  const missing: string[] = [];
  const lowerNotes = notes.toLowerCase();

  // Check for purpose
  const hasPurpose = (
    lowerNotes.includes('refer') ||
    lowerNotes.includes('follow up') ||
    lowerNotes.includes('follow-up') ||
    lowerNotes.includes('results') ||
    lowerNotes.includes('discharge')
  );
  if (!hasPurpose) {
    missing.push('Purpose of letter (referral/follow-up/results/discharge)');
  }

  // Check for diagnosis/problem
  const hasDiagnosis = (
    lowerNotes.includes('diagnosis') ||
    lowerNotes.includes('condition') ||
    lowerNotes.includes('problem') ||
    /\b(?:htn|af|cad|mi|hf|copd|dm)\b/.test(lowerNotes)
  );
  if (!hasDiagnosis) {
    missing.push('Primary problem or diagnosis');
  }

  // Check for plan/recommendations
  const hasPlan = (
    lowerNotes.includes('plan') ||
    lowerNotes.includes('recommend') ||
    lowerNotes.includes('arrange') ||
    lowerNotes.includes('will') ||
    lowerNotes.includes('continue') ||
    lowerNotes.includes('start') ||
    lowerNotes.includes('stop')
  );
  if (!hasPlan) {
    missing.push('Plan or recommendations');
  }

  // Check for medication changes (if meds are mentioned)
  const mentionsMeds = (
    lowerNotes.includes('medication') ||
    lowerNotes.includes('drug') ||
    lowerNotes.includes('tablet') ||
    /\b(?:mg|mcg|bd|od|tds)\b/.test(lowerNotes)
  );
  if (mentionsMeds) {
    const hasMedChanges = (
      lowerNotes.includes('start') ||
      lowerNotes.includes('stop') ||
      lowerNotes.includes('increase') ||
      lowerNotes.includes('decrease') ||
      lowerNotes.includes('continue') ||
      lowerNotes.includes('no changes')
    );
    if (!hasMedChanges) {
      missing.push('Medication changes (explicit changes or "no medication changes")');
    }
  }

  // Sparse if ≥2 critical items missing
  const sparse = missing.length >= 2;

  return { sparse, missing };
}
