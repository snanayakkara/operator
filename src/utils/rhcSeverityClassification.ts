/**
 * RHC Severity Classification Utility
 *
 * Provides severity grading for Right Heart Catheterization haemodynamic parameters
 * following ESC/ERS 2022 guidelines and practical clinical cut-offs.
 *
 * Key Parameters:
 * - mPAP (mean Pulmonary Artery Pressure) - primary severity marker
 * - PVR (Pulmonary Vascular Resistance) - distinguishes pre-capillary PH
 * - PAWP/PCWP - distinguishes post-capillary vs pre-capillary PH
 * - CO/CI and RAP - risk stratification context
 */

/**
 * Severity grades for mPAP (mean Pulmonary Artery Pressure)
 * Based on ESC/ERS 2022 guidelines with practical clinical cut-offs
 */
export type MPAPSeverity = 'normal' | 'borderline' | 'mild' | 'moderate' | 'severe';

/**
 * Severity grades for PVR (Pulmonary Vascular Resistance)
 * Used to classify pre-capillary PH severity
 */
export type PVRSeverity = 'normal' | 'borderline' | 'mild' | 'moderate' | 'severe';

/**
 * Pulmonary hypertension classification types
 */
export type PHType =
  | 'normal'
  | 'pre-capillary'      // PVR ≥3, PAWP ≤15
  | 'post-capillary'     // PAWP >15, PVR <3
  | 'combined'           // PAWP >15, PVR ≥3
  | 'borderline';        // mPAP 21-24 or PVR >2 <3

/**
 * Severity classification result with contextual information
 */
export interface SeverityClassification {
  mpapSeverity: MPAPSeverity;
  pvrSeverity?: PVRSeverity;
  phType: PHType;
  description: string;
  clinicalSignificance: string;
}

/**
 * Classify mPAP severity using practical clinical cut-offs
 *
 * Cut-offs:
 * - Normal: ≤20 mmHg
 * - Borderline: 21-24 mmHg (abnormal vs healthy norms; prognostically relevant)
 * - Mild PH: 25-34 mmHg
 * - Moderate PH: 35-44 mmHg
 * - Severe PH: ≥45 mmHg (≥50 is unequivocally severe)
 *
 * @param mpap - Mean pulmonary artery pressure in mmHg
 * @returns Severity grade
 */
export function classifyMPAPSeverity(mpap: number): MPAPSeverity {
  if (mpap <= 20) return 'normal';
  if (mpap <= 24) return 'borderline';
  if (mpap <= 34) return 'mild';
  if (mpap <= 44) return 'moderate';
  return 'severe';
}

/**
 * Classify PVR severity using practical clinical cut-offs
 *
 * Cut-offs:
 * - Normal: ≤2.0 WU (upper limit of normal)
 * - Borderline: >2.0-<3.0 WU (above normal; pre-capillary PH if mPAP >20 and PAWP ≤15)
 * - Mild: 3.0-4.9 WU (meets classic WSPH ≥3 WU threshold)
 * - Moderate: 5.0-7.9 WU
 * - Severe: ≥8.0 WU
 *
 * Exception for WHO Group 3 (lung disease):
 * PVR >5 WU is treated as "severe/out-of-proportion" per ESC/ERS commentary
 *
 * @param pvr - Pulmonary vascular resistance in Wood units
 * @param isWHOGroup3 - Whether patient has lung disease (WHO Group 3 PH)
 * @returns Severity grade
 */
export function classifyPVRSeverity(pvr: number, isWHOGroup3: boolean = false): PVRSeverity {
  if (pvr <= 2.0) return 'normal';
  if (pvr < 3.0) return 'borderline';

  // Exception: WHO Group 3 (lung disease) treats PVR >5 as severe/out-of-proportion
  if (isWHOGroup3 && pvr > 5.0) return 'severe';

  if (pvr < 5.0) return 'mild';
  if (pvr < 8.0) return 'moderate';
  return 'severe';
}

/**
 * Determine PH type based on mPAP, PVR, and PAWP/PCWP
 *
 * Classification (ESC/ERS 2022):
 * - Pre-capillary: mPAP >20, PAWP ≤15, PVR ≥3
 * - Post-capillary (Isolated): mPAP >20, PAWP >15, PVR <3
 * - Combined pre/post-capillary: mPAP >20, PAWP >15, PVR ≥3
 * - Borderline: mPAP 21-24 or PVR >2 <3
 * - Normal: mPAP ≤20
 *
 * @param mpap - Mean pulmonary artery pressure in mmHg
 * @param pvr - Pulmonary vascular resistance in Wood units
 * @param pawp - Pulmonary artery wedge pressure (PCWP) in mmHg
 * @returns PH type classification
 */
export function classifyPHType(mpap: number, pvr: number, pawp: number): PHType {
  // Normal
  if (mpap <= 20) return 'normal';

  // Borderline elevation
  if (mpap <= 24 && pvr < 3.0) return 'borderline';

  // Pre-capillary PH: elevated PVR with normal/low PAWP
  if (pawp <= 15 && pvr >= 3.0) return 'pre-capillary';

  // Post-capillary PH (Isolated): elevated PAWP with normal PVR
  if (pawp > 15 && pvr < 3.0) return 'post-capillary';

  // Combined pre/post-capillary: both elevated
  if (pawp > 15 && pvr >= 3.0) return 'combined';

  // Default to borderline if criteria don't clearly match
  return 'borderline';
}

/**
 * Comprehensive severity classification with clinical context
 *
 * Provides full severity assessment including:
 * - mPAP severity grade
 * - PVR severity grade
 * - PH type classification
 * - Clinical description
 * - Risk context (when CO/CI and RAP provided)
 *
 * @param params - Haemodynamic parameters
 * @returns Complete severity classification with context
 */
export function classifyRHCSeverity(params: {
  mpap: number;
  pvr?: number;
  pawp?: number;
  co?: number;
  ci?: number;
  rap?: number;
  isWHOGroup3?: boolean;
}): SeverityClassification {
  const { mpap, pvr, pawp, co, ci, rap, isWHOGroup3 = false } = params;

  // Classify mPAP severity
  const mpapSeverity = classifyMPAPSeverity(mpap);

  // Classify PVR severity if available
  const pvrSeverity = pvr !== undefined ? classifyPVRSeverity(pvr, isWHOGroup3) : undefined;

  // Determine PH type if we have all required parameters
  const phType = pvr !== undefined && pawp !== undefined
    ? classifyPHType(mpap, pvr, pawp)
    : mpapSeverity === 'normal' ? 'normal' : 'borderline';

  // Generate description
  let description = '';
  switch (mpapSeverity) {
    case 'normal':
      description = 'Normal pulmonary artery pressures';
      break;
    case 'borderline':
      description = 'Borderline elevation of pulmonary artery pressure';
      break;
    case 'mild':
      description = 'Mild pulmonary hypertension';
      break;
    case 'moderate':
      description = 'Moderate pulmonary hypertension';
      break;
    case 'severe':
      description = mpap >= 50
        ? 'Severe pulmonary hypertension (unequivocally severe)'
        : 'Severe pulmonary hypertension';
      break;
  }

  // Add PH type context
  if (phType !== 'normal' && phType !== 'borderline') {
    switch (phType) {
      case 'pre-capillary':
        description += ' (pre-capillary)';
        break;
      case 'post-capillary':
        description += ' (isolated post-capillary)';
        break;
      case 'combined':
        description += ' (combined pre- and post-capillary)';
        break;
    }
  }

  // Generate clinical significance with risk context
  let clinicalSignificance = '';

  if (mpapSeverity === 'normal') {
    clinicalSignificance = 'No evidence of pulmonary hypertension.';
  } else if (mpapSeverity === 'borderline') {
    clinicalSignificance = 'Borderline elevation is prognostically relevant. Further assessment depends on PVR, PAWP, and clinical context.';
  } else {
    // Build significance statement with available parameters
    const significanceParts: string[] = [];

    // PVR context
    if (pvrSeverity) {
      significanceParts.push(`PVR is ${pvrSeverity}`);
      if (isWHOGroup3 && pvr && pvr > 5.0) {
        significanceParts.push('(out-of-proportion for lung disease)');
      }
    }

    // Risk stratification context (CO/CI and RAP)
    if (co !== undefined && ci !== undefined && rap !== undefined) {
      const lowCO = co < 4.0 || ci < 2.5;
      const highRAP = rap > 8;

      if (lowCO && highRAP) {
        significanceParts.push('with reduced cardiac output and elevated right atrial pressure (high-risk profile)');
      } else if (lowCO) {
        significanceParts.push('with reduced cardiac output');
      } else if (highRAP) {
        significanceParts.push('with elevated right atrial pressure');
      }
    }

    if (significanceParts.length > 0) {
      clinicalSignificance = `${description.replace(' pulmonary hypertension', '')} PH detected. ${significanceParts.join(', ')}.`;
    } else {
      clinicalSignificance = `${description} detected. Risk stratification requires assessment of cardiac output and right atrial pressure.`;
    }
  }

  return {
    mpapSeverity,
    pvrSeverity,
    phType,
    description,
    clinicalSignificance
  };
}

/**
 * Get severity description text for use in report generation
 *
 * @param severity - mPAP or PVR severity grade
 * @returns Human-readable severity description
 */
export function getSeverityText(severity: MPAPSeverity | PVRSeverity): string {
  switch (severity) {
    case 'normal': return 'normal';
    case 'borderline': return 'borderline elevation';
    case 'mild': return 'mild elevation';
    case 'moderate': return 'moderate elevation';
    case 'severe': return 'severe elevation';
  }
}
