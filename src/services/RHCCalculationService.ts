/**
 * RHC Calculation Service
 *
 * Comprehensive haemodynamic calculations for Right Heart Catheterisation
 * following Australian/ESC 2022 guidelines and AHA 2021 standards.
 *
 * All calculations are pure functions that gracefully handle missing data.
 * Returns undefined if required inputs are unavailable.
 *
 * Reference: Based on validated formulas from clinical RHC practice.
 */

// ============================================================================
// TIER 1: ESSENTIAL CALCULATIONS (Basic Derived Values)
// ============================================================================

/**
 * Calculate Body Surface Area using DuBois formula
 * BSA (m²) = 0.007184 × height^0.725 × weight^0.425
 *
 * @param heightCm - Height in centimeters
 * @param weightKg - Weight in kilograms
 * @returns BSA in m² or undefined if inputs invalid
 */
export function calculateBSA(heightCm?: number, weightKg?: number): number | undefined {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return undefined;
  }

  // DuBois formula
  return 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425);
}

/**
 * Calculate Body Mass Index
 * BMI = weight (kg) / (height (m))²
 *
 * @param heightCm - Height in centimeters
 * @param weightKg - Weight in kilograms
 * @returns BMI in kg/m² or undefined if inputs invalid
 */
export function calculateBMI(heightCm?: number, weightKg?: number): number | undefined {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return undefined;
  }

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Calculate Mean Arterial Pressure
 * MAP = Diastolic + (Systolic - Diastolic) / 3
 *
 * @param systolic - Systolic BP in mmHg
 * @param diastolic - Diastolic BP in mmHg
 * @returns MAP in mmHg or undefined if inputs invalid
 */
export function calculateMAP(systolic?: number, diastolic?: number): number | undefined {
  if (systolic === undefined || diastolic === undefined) {
    return undefined;
  }

  return diastolic + (systolic - diastolic) / 3;
}

/**
 * Calculate Stroke Volume
 * SV (mL) = CO (L/min) / HR (bpm) × 1000
 *
 * @param cardiacOutput - Cardiac output in L/min
 * @param heartRate - Heart rate in bpm
 * @returns Stroke volume in mL or undefined if inputs invalid
 */
export function calculateStrokeVolume(cardiacOutput?: number, heartRate?: number): number | undefined {
  if (!cardiacOutput || !heartRate || heartRate <= 0) {
    return undefined;
  }

  return (cardiacOutput / heartRate) * 1000;
}

/**
 * Calculate Cardiac Index
 * CI (L/min/m²) = CO (L/min) / BSA (m²)
 *
 * @param cardiacOutput - Cardiac output in L/min
 * @param bsa - Body surface area in m²
 * @returns Cardiac index in L/min/m² or undefined if inputs invalid
 */
export function calculateCardiacIndex(cardiacOutput?: number, bsa?: number): number | undefined {
  if (!cardiacOutput || !bsa || bsa <= 0) {
    return undefined;
  }

  return cardiacOutput / bsa;
}

/**
 * Estimate VO₂ (Oxygen Consumption) using simplified formula
 * VO₂ (mL/min) = 125 × BSA (m²)
 *
 * More accurate: VO₂ = 3 × BSA (mL O₂/min/m²) × BSA = 3 × BSA² for resting state
 * Clinical practice: 125 mL/min/m² is commonly used
 *
 * @param bsa - Body surface area in m²
 * @returns Estimated VO₂ in mL/min or undefined if BSA invalid
 */
export function estimateVO2(bsa?: number): number | undefined {
  if (!bsa || bsa <= 0) {
    return undefined;
  }

  return 125 * bsa;
}

/**
 * Calculate Transpulmonary Gradient
 * TPG (mmHg) = PA Mean - PCWP
 *
 * @param paMean - Mean pulmonary artery pressure in mmHg
 * @param pcwp - Pulmonary capillary wedge pressure in mmHg
 * @returns TPG in mmHg or undefined if inputs invalid
 */
export function calculateTPG(paMean?: number, pcwp?: number): number | undefined {
  if (paMean === undefined || pcwp === undefined) {
    return undefined;
  }

  return paMean - pcwp;
}

/**
 * Calculate Diastolic Pressure Gradient
 * DPG (mmHg) = PA Diastolic - PCWP
 *
 * @param paDiastolic - Diastolic pulmonary artery pressure in mmHg
 * @param pcwp - Pulmonary capillary wedge pressure in mmHg
 * @returns DPG in mmHg or undefined if inputs invalid
 */
export function calculateDPG(paDiastolic?: number, pcwp?: number): number | undefined {
  if (paDiastolic === undefined || pcwp === undefined) {
    return undefined;
  }

  return paDiastolic - pcwp;
}

/**
 * Calculate Pulmonary Vascular Resistance
 * PVR (Wood units) = TPG / CO = (PA Mean - PCWP) / CO
 *
 * Note: Wood units = mmHg / (L/min)
 * To convert to dynes·s·cm⁻⁵: multiply by 80
 *
 * @param paMean - Mean pulmonary artery pressure in mmHg
 * @param pcwp - Pulmonary capillary wedge pressure in mmHg
 * @param cardiacOutput - Cardiac output in L/min
 * @returns PVR in Wood units or undefined if inputs invalid
 */
export function calculatePVR(paMean?: number, pcwp?: number, cardiacOutput?: number): number | undefined {
  if (paMean === undefined || pcwp === undefined || !cardiacOutput || cardiacOutput <= 0) {
    return undefined;
  }

  const tpg = calculateTPG(paMean, pcwp);
  if (tpg === undefined) {
    return undefined;
  }

  return tpg / cardiacOutput;
}

/**
 * Calculate Pulmonary Vascular Resistance Index
 * PVRI (Wood units·m²) = PVR × BSA
 *
 * @param pvr - Pulmonary vascular resistance in Wood units
 * @param bsa - Body surface area in m²
 * @returns PVRI in Wood units·m² or undefined if inputs invalid
 */
export function calculatePVRI(pvr?: number, bsa?: number): number | undefined {
  if (pvr === undefined || !bsa || bsa <= 0) {
    return undefined;
  }

  return pvr * bsa;
}

/**
 * Calculate Systemic Vascular Resistance
 * SVR (Wood units) = (MAP - RAP) / CO
 *
 * @param map - Mean arterial pressure in mmHg
 * @param rap - Right atrial pressure in mmHg (default 0 if not provided)
 * @param cardiacOutput - Cardiac output in L/min
 * @returns SVR in Wood units or undefined if inputs invalid
 */
export function calculateSVR(map?: number, rap: number = 0, cardiacOutput?: number): number | undefined {
  if (map === undefined || !cardiacOutput || cardiacOutput <= 0) {
    return undefined;
  }

  const systemicGradient = map - rap;
  return systemicGradient / cardiacOutput;
}

/**
 * Calculate Systemic Vascular Resistance Index
 * SVRI (Wood units·m²) = SVR × BSA
 *
 * @param svr - Systemic vascular resistance in Wood units
 * @param bsa - Body surface area in m²
 * @returns SVRI in Wood units·m² or undefined if inputs invalid
 */
export function calculateSVRI(svr?: number, bsa?: number): number | undefined {
  if (svr === undefined || !bsa || bsa <= 0) {
    return undefined;
  }

  return svr * bsa;
}

// ============================================================================
// TIER 2: HIGH-VALUE CALCULATIONS (Advanced Metrics)
// ============================================================================

/**
 * Calculate Cardiac Output using Fick Method
 * Fick CO (L/min) = VO₂ / (Hb × 1.36 × (SaO₂ - SvO₂) × 10)
 *
 * @param vo2 - Oxygen consumption in mL/min
 * @param haemoglobin - Haemoglobin in g/L
 * @param sao2 - Arterial oxygen saturation (0-100%)
 * @param svo2 - Mixed venous oxygen saturation (0-100%)
 * @returns Fick cardiac output in L/min or undefined if inputs invalid
 */
export function calculateFickCO(
  vo2?: number,
  haemoglobin?: number,
  sao2?: number,
  svo2?: number
): number | undefined {
  if (!vo2 || !haemoglobin || sao2 === undefined || svo2 === undefined) {
    return undefined;
  }

  // Convert Hb from g/L to g/dL
  const hbGdL = haemoglobin / 10;

  // Convert saturations from percentage to decimal
  const sao2Decimal = sao2 / 100;
  const svo2Decimal = svo2 / 100;

  // Calculate oxygen content difference
  // 1.36 = mL O₂ carried per gram of Hb
  const oxygenDifference = hbGdL * 1.36 * (sao2Decimal - svo2Decimal) * 10;

  if (oxygenDifference <= 0) {
    return undefined;
  }

  return vo2 / oxygenDifference;
}

/**
 * Calculate Cardiac Power Output
 * CPO (Watts) = (MAP × CO) / 451
 *
 * Normal: 0.5-0.7 W
 *
 * @param map - Mean arterial pressure in mmHg
 * @param cardiacOutput - Cardiac output in L/min
 * @returns CPO in Watts or undefined if inputs invalid
 */
export function calculateCPO(map?: number, cardiacOutput?: number): number | undefined {
  if (map === undefined || !cardiacOutput) {
    return undefined;
  }

  return (map * cardiacOutput) / 451;
}

/**
 * Calculate Cardiac Power Index
 * CPI (W/m²) = (MAP × CI) / 451
 *
 * @param map - Mean arterial pressure in mmHg
 * @param cardiacIndex - Cardiac index in L/min/m²
 * @returns CPI in W/m² or undefined if inputs invalid
 */
export function calculateCPI(map?: number, cardiacIndex?: number): number | undefined {
  if (map === undefined || !cardiacIndex) {
    return undefined;
  }

  return (map * cardiacIndex) / 451;
}

/**
 * Calculate Right Ventricular Stroke Work Index
 * RVSWI (g·m/m²) = (PA Mean - RAP) × SVI × 0.0136
 *
 * Simplified: RVSWI = (PA Mean - RAP) × SVI (mmHg·mL/m²)
 *
 * @param paMean - Mean pulmonary artery pressure in mmHg
 * @param rap - Right atrial pressure in mmHg
 * @param strokeVolumeIndex - Stroke volume index in mL/m²
 * @returns RVSWI in mmHg·mL/m² or undefined if inputs invalid
 */
export function calculateRVSWI(
  paMean?: number,
  rap: number = 0,
  strokeVolumeIndex?: number
): number | undefined {
  if (paMean === undefined || !strokeVolumeIndex) {
    return undefined;
  }

  const pressureGradient = paMean - rap;
  return pressureGradient * strokeVolumeIndex;
}

/**
 * Calculate Left Ventricular Stroke Work Index
 * LVSWI (g·m/m²) = (MAP - PCWP) × SVI × 0.0136
 *
 * Simplified: LVSWI = (MAP - PCWP) × SVI (mmHg·mL/m²)
 *
 * @param map - Mean arterial pressure in mmHg
 * @param pcwp - Pulmonary capillary wedge pressure in mmHg
 * @param strokeVolumeIndex - Stroke volume index in mL/m²
 * @returns LVSWI in mmHg·mL/m² or undefined if inputs invalid
 */
export function calculateLVSWI(
  map?: number,
  pcwp?: number,
  strokeVolumeIndex?: number
): number | undefined {
  if (map === undefined || pcwp === undefined || !strokeVolumeIndex) {
    return undefined;
  }

  const pressureGradient = map - pcwp;
  return pressureGradient * strokeVolumeIndex;
}

/**
 * Calculate Pulmonary Artery Pulsatility Index
 * PAPi = (PA Systolic - PA Diastolic) / RAP
 *
 * Normal: >1.85 (values <0.9 indicate severe RV dysfunction)
 *
 * @param paSystolic - Systolic pulmonary artery pressure in mmHg
 * @param paDiastolic - Diastolic pulmonary artery pressure in mmHg
 * @param rap - Right atrial pressure in mmHg
 * @returns PAPi (dimensionless) or undefined if inputs invalid
 */
export function calculatePAPi(
  paSystolic?: number,
  paDiastolic?: number,
  rap?: number
): number | undefined {
  if (paSystolic === undefined || paDiastolic === undefined || !rap || rap <= 0) {
    return undefined;
  }

  const pulsePressure = paSystolic - paDiastolic;
  return pulsePressure / rap;
}

/**
 * Calculate RAP:PCWP Ratio
 *
 * Normal: <0.67 (elevated ratio suggests RV dysfunction)
 *
 * @param rap - Right atrial pressure in mmHg
 * @param pcwp - Pulmonary capillary wedge pressure in mmHg
 * @returns RAP:PCWP ratio or undefined if inputs invalid
 */
export function calculateRAPPCWPRatio(rap?: number, pcwp?: number): number | undefined {
  if (rap === undefined || !pcwp || pcwp <= 0) {
    return undefined;
  }

  return rap / pcwp;
}

/**
 * Calculate Stroke Volume Index
 * SVI (mL/m²) = CI × 1000 / HR
 *
 * @param cardiacIndex - Cardiac index in L/min/m²
 * @param heartRate - Heart rate in bpm
 * @returns SVI in mL/m² or undefined if inputs invalid
 */
export function calculateSVI(cardiacIndex?: number, heartRate?: number): number | undefined {
  if (!cardiacIndex || !heartRate || heartRate <= 0) {
    return undefined;
  }

  return (cardiacIndex * 1000) / heartRate;
}

/**
 * Calculate RV Cardiac Power Output
 * RV CPO (Watts) = (PA Mean × CO) / 451
 *
 * @param paMean - Mean pulmonary artery pressure in mmHg
 * @param cardiacOutput - Cardiac output in L/min
 * @returns RV CPO in Watts or undefined if inputs invalid
 */
export function calculateRVCPO(paMean?: number, cardiacOutput?: number): number | undefined {
  if (paMean === undefined || !cardiacOutput) {
    return undefined;
  }

  return (paMean * cardiacOutput) / 451;
}

// ============================================================================
// TIER 3: ADVANCED CALCULATIONS (Specialized Metrics)
// ============================================================================

/**
 * Calculate Oxygen Delivery
 * DO₂ (mL/min) = CO × (1.34 × Hb × SaO₂ + 0.003 × PaO₂) × 10
 *
 * @param cardiacOutput - Cardiac output in L/min
 * @param haemoglobin - Haemoglobin in g/L
 * @param sao2 - Arterial oxygen saturation (0-100%)
 * @param pao2 - Arterial partial pressure of oxygen in mmHg (default 100)
 * @returns Oxygen delivery in mL/min or undefined if inputs invalid
 */
export function calculateOxygenDelivery(
  cardiacOutput?: number,
  haemoglobin?: number,
  sao2?: number,
  pao2: number = 100
): number | undefined {
  if (!cardiacOutput || !haemoglobin || sao2 === undefined) {
    return undefined;
  }

  // Convert Hb from g/L to g/dL
  const hbGdL = haemoglobin / 10;

  // Convert SaO₂ from percentage to decimal
  const sao2Decimal = sao2 / 100;

  // Calculate oxygen content (mL O₂/dL blood)
  const oxygenContent = (1.34 * hbGdL * sao2Decimal) + (0.003 * pao2);

  // DO₂ = CO (L/min) × oxygen content (mL/dL) × 10 (dL/L)
  return cardiacOutput * oxygenContent * 10;
}

/**
 * Calculate Oxygen Extraction Ratio
 * O₂ER (%) = (SaO₂ - SvO₂) / SaO₂ × 100
 *
 * Normal: 20-30%
 *
 * @param sao2 - Arterial oxygen saturation (0-100%)
 * @param svo2 - Mixed venous oxygen saturation (0-100%)
 * @returns Oxygen extraction ratio as percentage or undefined if inputs invalid
 */
export function calculateOxygenExtractionRatio(sao2?: number, svo2?: number): number | undefined {
  if (sao2 === undefined || svo2 === undefined || sao2 <= 0) {
    return undefined;
  }

  return ((sao2 - svo2) / sao2) * 100;
}

/**
 * Calculate Pulmonary Arterial Compliance
 * PAC (mL/mmHg) = SV / Pulse Pressure
 *
 * Normal: >2 mL/mmHg
 *
 * @param strokeVolume - Stroke volume in mL
 * @param paSystolic - Systolic pulmonary artery pressure in mmHg
 * @param paDiastolic - Diastolic pulmonary artery pressure in mmHg
 * @returns PAC in mL/mmHg or undefined if inputs invalid
 */
export function calculatePAC(
  strokeVolume?: number,
  paSystolic?: number,
  paDiastolic?: number
): number | undefined {
  if (!strokeVolume || paSystolic === undefined || paDiastolic === undefined) {
    return undefined;
  }

  const pulsePressure = paSystolic - paDiastolic;
  if (pulsePressure <= 0) {
    return undefined;
  }

  return strokeVolume / pulsePressure;
}

/**
 * Calculate Pulmonary RC Time
 * RC Time (seconds) = PVR × PAC
 *
 * Normal: 0.5-0.7 seconds
 *
 * @param pvr - Pulmonary vascular resistance in Wood units
 * @param pac - Pulmonary arterial compliance in mL/mmHg
 * @returns RC time in seconds or undefined if inputs invalid
 */
export function calculatePulmonaryRCTime(pvr?: number, pac?: number): number | undefined {
  if (pvr === undefined || pac === undefined) {
    return undefined;
  }

  return pvr * pac;
}

/**
 * Calculate Effective Pulmonary Arterial Elastance
 * Ea (mmHg/mL) = (PA Mean - PCWP) / SV
 *
 * @param paMean - Mean pulmonary artery pressure in mmHg
 * @param pcwp - Pulmonary capillary wedge pressure in mmHg
 * @param strokeVolume - Stroke volume in mL
 * @returns Ea in mmHg/mL or undefined if inputs invalid
 */
export function calculateEffectivePulmonaryEa(
  paMean?: number,
  pcwp?: number,
  strokeVolume?: number
): number | undefined {
  if (paMean === undefined || pcwp === undefined || !strokeVolume || strokeVolume <= 0) {
    return undefined;
  }

  const transpulmonaryGradient = paMean - pcwp;
  return transpulmonaryGradient / strokeVolume;
}

/**
 * Calculate LV End-Systolic Elastance
 * LV Ees (mmHg/mL) = LVESP / LVESV
 *
 * Requires pressure-volume loop data
 *
 * @param lvesp - LV end-systolic pressure in mmHg
 * @param lvesv - LV end-systolic volume in mL
 * @returns LV Ees in mmHg/mL or undefined if inputs invalid
 */
export function calculateLVEes(lvesp?: number, lvesv?: number): number | undefined {
  if (lvesp === undefined || !lvesv || lvesv <= 0) {
    return undefined;
  }

  return lvesp / lvesv;
}

/**
 * Calculate RA End-Systolic Elastance
 * RA Ees (mmHg/mL) = (RAP_systolic - RAP_0) / RAESV
 *
 * Requires pressure-volume loop data
 *
 * @param rapSystolic - RA systolic pressure in mmHg
 * @param rapZero - RA pressure at zero volume (baseline) in mmHg
 * @param raesv - RA end-systolic volume in mL
 * @returns RA Ees in mmHg/mL or undefined if inputs invalid
 */
export function calculateRAEes(
  rapSystolic?: number,
  rapZero: number = 0,
  raesv?: number
): number | undefined {
  if (rapSystolic === undefined || !raesv || raesv <= 0) {
    return undefined;
  }

  return (rapSystolic - rapZero) / raesv;
}

// ============================================================================
// CLINICAL ASSESSMENT FUNCTIONS
// ============================================================================

/**
 * Classify Pulmonary Hypertension according to Australian/ESC 2022 guidelines
 *
 * Definitions:
 * - Pulmonary Hypertension: mPAP >20 mmHg
 * - Pre-capillary PH: mPAP >20, PCWP ≤15, PVR >3
 * - Post-capillary PH: mPAP >20, PCWP >15
 *   - Isolated: PVR ≤3
 *   - Combined: PVR >3
 *
 * @param paMean - Mean pulmonary artery pressure in mmHg
 * @param pcwp - Pulmonary capillary wedge pressure in mmHg
 * @param pvr - Pulmonary vascular resistance in Wood units
 * @returns Classification object with type and severity
 */
export function classifyPulmonaryHypertension(
  paMean?: number,
  pcwp?: number,
  pvr?: number
): {
  hasPH: boolean;
  type?: 'Pre-capillary' | 'Post-capillary (Isolated)' | 'Post-capillary (Combined)';
  severity?: 'Mild' | 'Moderate' | 'Severe';
} {
  if (paMean === undefined) {
    return { hasPH: false };
  }

  // Check for PH (mPAP >20 mmHg per ESC 2022)
  if (paMean <= 20) {
    return { hasPH: false };
  }

  // Determine severity based on mPAP
  let severity: 'Mild' | 'Moderate' | 'Severe';
  if (paMean <= 30) {
    severity = 'Mild';
  } else if (paMean <= 45) {
    severity = 'Moderate';
  } else {
    severity = 'Severe';
  }

  // Classify type if PCWP available
  if (pcwp !== undefined) {
    if (pcwp <= 15) {
      // Pre-capillary if PVR >3
      if (pvr !== undefined && pvr > 3) {
        return { hasPH: true, type: 'Pre-capillary', severity };
      }
      // Borderline - need PVR to confirm
      return { hasPH: true, severity };
    } else {
      // Post-capillary (PCWP >15)
      if (pvr !== undefined) {
        if (pvr > 3) {
          return { hasPH: true, type: 'Post-capillary (Combined)', severity };
        } else {
          return { hasPH: true, type: 'Post-capillary (Isolated)', severity };
        }
      }
      return { hasPH: true, severity };
    }
  }

  return { hasPH: true, severity };
}

/**
 * Assess Cardiac Index and provide clinical interpretation
 *
 * Normal: 2.5-4.0 L/min/m²
 * Low: <2.2 L/min/m²
 * High: >4.0 L/min/m²
 *
 * @param cardiacIndex - Cardiac index in L/min/m²
 * @returns Clinical assessment string
 */
export function assessCardiacIndex(cardiacIndex?: number): string {
  if (cardiacIndex === undefined) {
    return 'Cardiac index not available';
  }

  if (cardiacIndex < 2.2) {
    if (cardiacIndex < 1.8) {
      return 'Severely reduced cardiac index - cardiogenic shock range';
    }
    return 'Reduced cardiac index - cardiac dysfunction present';
  } else if (cardiacIndex > 4.0) {
    return 'Elevated cardiac index - hyperdynamic circulation';
  }

  return 'Normal cardiac index';
}

/**
 * Calculate comprehensive clinical assessment
 *
 * @param params - Object containing all haemodynamic parameters
 * @returns Clinical assessment string and risk stratification
 */
export function generateClinicalAssessment(params: {
  paMean?: number;
  pcwp?: number;
  pvr?: number;
  cardiacIndex?: number;
  rap?: number;
  svr?: number;
}): {
  assessment: string;
  riskStratification: 'Low' | 'Intermediate' | 'High';
} {
  const assessments: string[] = [];
  let riskStratification: 'Low' | 'Intermediate' | 'High' = 'Low';

  // Pulmonary hypertension assessment
  const phClassification = classifyPulmonaryHypertension(params.paMean, params.pcwp, params.pvr);

  if (phClassification.hasPH) {
    let phStatement = `Pulmonary hypertension present (mPAP ${params.paMean} mmHg)`;

    if (phClassification.type) {
      phStatement += ` - ${phClassification.type}`;
    }

    if (phClassification.severity) {
      phStatement += ` - ${phClassification.severity}`;
    }

    assessments.push(phStatement);

    // Update risk based on PH severity
    if (phClassification.severity === 'Severe' || phClassification.type === 'Pre-capillary') {
      riskStratification = 'High';
    } else if (phClassification.severity === 'Moderate') {
      riskStratification = 'Intermediate';
    }
  } else {
    assessments.push('Normal pulmonary artery pressures');
  }

  // Cardiac index assessment
  const ciAssessment = assessCardiacIndex(params.cardiacIndex);
  if (ciAssessment !== 'Normal cardiac index' && ciAssessment !== 'Cardiac index not available') {
    assessments.push(ciAssessment);

    if (params.cardiacIndex && params.cardiacIndex < 2.2) {
      riskStratification = 'High';
    }
  }

  // Elevated RAP assessment
  if (params.rap !== undefined && params.rap > 10) {
    assessments.push(`Elevated right atrial pressure (${params.rap} mmHg) - RV dysfunction or volume overload`);
    if (riskStratification === 'Low') {
      riskStratification = 'Intermediate';
    }
  }

  // SVR assessment
  if (params.svr !== undefined) {
    if (params.svr > 20) {
      assessments.push('Elevated systemic vascular resistance - increased afterload');
    } else if (params.svr < 10) {
      assessments.push('Reduced systemic vascular resistance - vasodilated state');
    }
  }

  // If no abnormalities found
  if (assessments.length === 0 || (assessments.length === 1 && assessments[0].includes('Normal'))) {
    return {
      assessment: 'Normal resting haemodynamics',
      riskStratification: 'Low'
    };
  }

  return {
    assessment: assessments.join('. '),
    riskStratification
  };
}
