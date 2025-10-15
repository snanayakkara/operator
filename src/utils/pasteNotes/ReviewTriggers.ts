/**
 * Review Triggers for Quick Letter Paste Feature
 *
 * Two-stage gating system:
 * 1. Preflight triggers (before LLM call) - based on parsed notes
 * 2. Post-gen triggers (after LLM call) - based on generated content quality
 */

import type {
  ReviewTriggerResult,
  PreflightTrigger,
  PostGenTrigger,
  ParsedNotes,
  EMRContext,
  MedEntry
} from '@/types/pasteNotes.types';
import {
  isAnticoagulant,
  isAntiplatelet,
  isBetaBlocker,
  isACEInhibitor,
  isARB,
  isSameDrug
} from './MedicationLexicon';

/**
 * Check preflight review triggers (before LLM call)
 */
export function checkPreflightTriggers(
  parsedNotes: ParsedNotes,
  emrContext: EMRContext,
  identityMismatch: boolean
): ReviewTriggerResult['preflight'] {
  const triggers: PreflightTrigger[] = [];
  const details: Record<string, string | number> = {};

  // 1. Medication snapshot detected
  if (parsedNotes.meds_snapshot.length > 0) {
    triggers.push('meds_snapshot_detected');
    details.snapshot_count = parsedNotes.meds_snapshot.length;
  }

  // 2. Snapshot drops ≥2 EMR meds without explicit "stop"
  if (parsedNotes.meds_snapshot.length > 0 && emrContext.medications_emr.length > 0) {
    const droppedMeds = findDroppedMedications(
      emrContext.medications_emr,
      parsedNotes.meds_snapshot,
      parsedNotes.deltas
    );

    if (droppedMeds.length >= 2) {
      triggers.push('meds_snapshot_drops_multiple');
      details.dropped_count = droppedMeds.length;
      details.dropped_meds = droppedMeds.join(', ');
    }
  }

  // 3. Low-confidence heuristic snapshot
  if (parsedNotes.meds_snapshot.length > 0 && !parsedNotes.contains_meds_header && parsedNotes.confidence < 0.7) {
    triggers.push('meds_low_confidence_snapshot');
    details.confidence = parsedNotes.confidence;
  }

  // 4. EMR ↔ notes conflicts (medications)
  const medConflicts = detectMedicationConflicts(parsedNotes, emrContext);
  if (medConflicts.length > 0) {
    triggers.push('emr_notes_conflict_meds');
    details.med_conflicts = medConflicts.join('; ');
  }

  // 5. EMR ↔ notes conflicts (allergies)
  const allergyConflicts = detectAllergyConflicts(parsedNotes, emrContext);
  if (allergyConflicts.length > 0) {
    triggers.push('emr_notes_conflict_allergies');
    details.allergy_conflicts = allergyConflicts.join('; ');
  }

  // 6. Placeholders detected
  if (parsedNotes.placeholders.length > 0) {
    triggers.push('placeholders_detected');
    details.placeholder_count = parsedNotes.placeholders.length;
    details.placeholders = parsedNotes.placeholders.slice(0, 3).join(', '); // Show first 3
  }

  // 7. Identity mismatch (soft stop)
  if (identityMismatch) {
    triggers.push('identity_mismatch');
  }

  return {
    triggered: triggers.length > 0,
    triggers,
    details
  };
}

/**
 * Check post-gen review triggers (after LLM call, gate actions)
 */
export function checkPostGenTriggers(
  generatedContent: string,
  parsedNotes: ParsedNotes,
  modelConfidence?: number,
  missingInfo?: any,
  usedParserFallback?: boolean
): ReviewTriggerResult['postGen'] {
  const triggers: PostGenTrigger[] = [];
  const details: Record<string, string | number> = {};

  // 1. Model confidence < 60
  if (modelConfidence !== undefined && modelConfidence < 60) {
    triggers.push('model_confidence_low');
    details.confidence = modelConfidence;
  }

  // 2. Parser fallback used
  if (usedParserFallback) {
    triggers.push('parser_fallback_used');
  }

  // 3. Completeness < 85%
  if (missingInfo && missingInfo.completeness_score) {
    const completenessPercent = parseInt(missingInfo.completeness_score.replace('%', ''));
    if (completenessPercent < 85) {
      triggers.push('completeness_low');
      details.completeness = completenessPercent;
    }
  }

  // 4. High-impact anticoagulation changes
  const hasAnticoagulationChanges = parsedNotes.deltas.some(delta =>
    isAnticoagulant(delta.drug) && ['start', 'stop', 'increase', 'decrease', 'switch'].includes(delta.action)
  );
  if (hasAnticoagulationChanges) {
    triggers.push('high_impact_anticoagulation');
    details.anticoagulation_changes = parsedNotes.deltas
      .filter(d => isAnticoagulant(d.drug))
      .map(d => `${d.action} ${d.drug}`)
      .join(', ');
  }

  // 5. High-impact antiplatelet changes
  const hasAntiplateletChanges = parsedNotes.deltas.some(delta =>
    isAntiplatelet(delta.drug) && ['start', 'stop', 'increase', 'decrease', 'switch'].includes(delta.action)
  );
  if (hasAntiplateletChanges) {
    triggers.push('high_impact_antiplatelets');
    details.antiplatelet_changes = parsedNotes.deltas
      .filter(d => isAntiplatelet(d.drug))
      .map(d => `${d.action} ${d.drug}`)
      .join(', ');
  }

  // 6. High-impact beta-blocker dose changes
  const hasBetaBlockerDoseChanges = parsedNotes.deltas.some(delta =>
    isBetaBlocker(delta.drug) && ['increase', 'decrease'].includes(delta.action)
  );
  if (hasBetaBlockerDoseChanges) {
    triggers.push('high_impact_beta_blocker');
    details.beta_blocker_changes = parsedNotes.deltas
      .filter(d => isBetaBlocker(d.drug))
      .map(d => `${d.action} ${d.drug}`)
      .join(', ');
  }

  // 7. High-impact ACEi/ARB dose changes
  const hasACEiARBDoseChanges = parsedNotes.deltas.some(delta =>
    (isACEInhibitor(delta.drug) || isARB(delta.drug)) && ['increase', 'decrease'].includes(delta.action)
  );
  if (hasACEiARBDoseChanges) {
    triggers.push('high_impact_acei_arb');
    details.acei_arb_changes = parsedNotes.deltas
      .filter(d => isACEInhibitor(d.drug) || isARB(d.drug))
      .map(d => `${d.action} ${d.drug}`)
      .join(', ');
  }

  // 8. Urgent/red flags wording
  const urgentPatterns = [
    /\burgent\b/i,
    /\bemergent\b/i,
    /\bimmediate\b/i,
    /\bred flag\b/i,
    /\bcritical\b/i,
    /\bstat\b/i,
    /\basap\b/i
  ];
  const hasUrgentWording = urgentPatterns.some(pattern => pattern.test(generatedContent));
  if (hasUrgentWording) {
    triggers.push('urgent_red_flags');
  }

  return {
    triggered: triggers.length > 0,
    triggers,
    details
  };
}

/**
 * Find medications dropped in snapshot without explicit "stop" delta
 */
function findDroppedMedications(
  emrMeds: MedEntry[],
  snapshotMeds: MedEntry[],
  deltas: any[]
): string[] {
  const dropped: string[] = [];

  for (const emrMed of emrMeds) {
    // Check if this EMR med is in the snapshot
    const inSnapshot = snapshotMeds.some(snapMed => isSameDrug(snapMed.drug, emrMed.drug));

    if (!inSnapshot) {
      // Check if there's an explicit "stop" delta for this med
      const hasStopDelta = deltas.some(
        delta => delta.action === 'stop' && isSameDrug(delta.drug, emrMed.drug)
      );

      if (!hasStopDelta) {
        dropped.push(emrMed.drug);
      }
    }
  }

  return dropped;
}

/**
 * Detect medication conflicts between notes and EMR
 */
function detectMedicationConflicts(
  parsedNotes: ParsedNotes,
  emrContext: EMRContext
): string[] {
  const conflicts: string[] = [];

  // Check for same drug with different doses in snapshot vs EMR
  for (const snapMed of parsedNotes.meds_snapshot) {
    const emrMed = emrContext.medications_emr.find(e => isSameDrug(e.drug, snapMed.drug));

    if (emrMed) {
      // Compare doses
      if (emrMed.dose && snapMed.dose && emrMed.dose !== snapMed.dose) {
        conflicts.push(
          `${snapMed.drug}: EMR shows ${emrMed.dose}${emrMed.unit}, notes show ${snapMed.dose}${snapMed.unit}`
        );
      }

      // Compare frequencies
      if (emrMed.freq && snapMed.freq && emrMed.freq !== snapMed.freq) {
        conflicts.push(
          `${snapMed.drug}: EMR shows ${emrMed.freq}, notes show ${snapMed.freq}`
        );
      }
    }
  }

  return conflicts;
}

/**
 * Detect allergy conflicts between notes and EMR
 */
function detectAllergyConflicts(
  parsedNotes: ParsedNotes,
  emrContext: EMRContext
): string[] {
  const conflicts: string[] = [];

  // Check if any medication in notes matches EMR allergies
  const allMeds = [
    ...parsedNotes.meds_snapshot.map(m => m.drug),
    ...parsedNotes.deltas.filter(d => d.action === 'start').map(d => d.drug)
  ];

  for (const med of allMeds) {
    for (const allergy of emrContext.allergies) {
      if (allergy.toLowerCase().includes(med.toLowerCase()) || med.toLowerCase().includes(allergy.toLowerCase())) {
        conflicts.push(`${med} may conflict with documented allergy: ${allergy}`);
      }
    }
  }

  return conflicts;
}

/**
 * Get human-readable trigger description
 */
export function getTriggerDescription(trigger: PreflightTrigger | PostGenTrigger): string {
  const descriptions: Record<string, string> = {
    // Preflight
    meds_snapshot_detected: 'Medication snapshot detected in notes',
    meds_snapshot_drops_multiple: 'Snapshot appears to drop multiple EMR medications without explicit "stop"',
    meds_low_confidence_snapshot: 'Low confidence in heuristic medication snapshot detection',
    emr_notes_conflict_meds: 'Medication conflicts detected between EMR and notes',
    emr_notes_conflict_allergies: 'Potential allergy conflicts detected',
    emr_notes_conflict_gp: 'GP information conflicts between EMR and notes',
    placeholders_detected: 'Ambiguous placeholders detected (?, TBC, confirm with)',
    identity_mismatch: 'Patient identity mismatch detected between session and EMR',

    // Post-gen
    model_confidence_low: 'Low model confidence in generated content',
    parser_fallback_used: 'Parser fallback was used due to format issues',
    completeness_low: 'Letter completeness score below threshold',
    high_impact_anticoagulation: 'Anticoagulation medication changes detected',
    high_impact_antiplatelets: 'Antiplatelet medication changes detected',
    high_impact_beta_blocker: 'Beta-blocker dose changes detected',
    high_impact_acei_arb: 'ACE inhibitor or ARB dose changes detected',
    urgent_red_flags: 'Urgent or red flag wording detected in content'
  };

  return descriptions[trigger] || trigger;
}
