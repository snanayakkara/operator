/**
 * Lesion Correction Logger
 *
 * Helper utility for logging lesion placement corrections from the UI.
 * When users drag lesions between vessels in the CoronaryAnatomyTree component,
 * this logs the correction for future training data.
 */

import { ASRCorrectionsLog, type LesionPlacementCorrection } from '@/services/ASRCorrectionsLog';
import type { VesselKey } from '@/utils/coronaryAnatomy';

/**
 * Log a lesion placement correction when user drags a lesion to a different vessel
 *
 * @param lesionId - The unique ID of the lesion being moved
 * @param branch - The branch name (e.g., "OM1", "D2", "Proximal LAD")
 * @param fromVessel - The vessel the lesion was incorrectly placed under
 * @param toVessel - The correct vessel the user moved it to
 * @param transcriptionSnippet - Optional snippet of the original transcription for context
 */
export async function logLesionCorrection(
  lesionId: string,
  branch: string,
  fromVessel: VesselKey,
  toVessel: VesselKey,
  transcriptionSnippet?: string
): Promise<void> {
  const correction: LesionPlacementCorrection = {
    lesionId,
    branch,
    fromVessel,
    toVessel,
    timestamp: Date.now(),
    transcriptionSnippet
  };

  const correctionLog = ASRCorrectionsLog.getInstance();
  await correctionLog.addLesionPlacementCorrection(correction);
}

/**
 * Batch log multiple lesion corrections at once
 * Useful when user confirms a tree with multiple reorganized lesions
 */
export async function logMultipleLesionCorrections(
  corrections: Array<{
    lesionId: string;
    branch: string;
    fromVessel: VesselKey;
    toVessel: VesselKey;
    transcriptionSnippet?: string;
  }>
): Promise<void> {
  const correctionLog = ASRCorrectionsLog.getInstance();
  const timestamp = Date.now();

  for (const correction of corrections) {
    await correctionLog.addLesionPlacementCorrection({
      ...correction,
      timestamp
    });
  }
}
