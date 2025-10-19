/**
 * BP Data Validator
 *
 * Validates and repairs blood pressure readings with:
 * - Range validation (SBP 70-260, DBP 40-160, HR 30-200)
 * - Relational validation (DBP should be < SBP, with smart swapping)
 * - Date normalization and ordering (morning before evening)
 * - Warning generation for user review
 */

import type { BPReading, BPWarning, BPValidationResult } from '@/types/BPTypes';
import { BP_RANGES as RANGES } from '@/types/BPTypes';

export class BPDataValidator {
  private static instance: BPDataValidator;

  private constructor() {}

  public static getInstance(): BPDataValidator {
    if (!BPDataValidator.instance) {
      BPDataValidator.instance = new BPDataValidator();
    }
    return BPDataValidator.instance;
  }

  /**
   * Validate a single reading
   */
  public validateReading(reading: BPReading): BPValidationResult {
    const warnings: BPWarning[] = [];
    let modified = false;
    // eslint-disable-next-line prefer-const
    let validatedReading = { ...reading };

    // Range validation for SBP
    if (validatedReading.sbp < RANGES.sbp.min || validatedReading.sbp > RANGES.sbp.max) {
      warnings.push({
        type: 'range',
        field: 'sbp',
        message: `SBP ${validatedReading.sbp} is outside typical range (${RANGES.sbp.min}-${RANGES.sbp.max} mmHg)`,
        severity: 'warning'
      });
    }

    // Range validation for DBP
    if (validatedReading.dbp < RANGES.dbp.min || validatedReading.dbp > RANGES.dbp.max) {
      warnings.push({
        type: 'range',
        field: 'dbp',
        message: `DBP ${validatedReading.dbp} is outside typical range (${RANGES.dbp.min}-${RANGES.dbp.max} mmHg)`,
        severity: 'warning'
      });
    }

    // Range validation for HR
    if (validatedReading.hr < RANGES.hr.min || validatedReading.hr > RANGES.hr.max) {
      warnings.push({
        type: 'range',
        field: 'hr',
        message: `HR ${validatedReading.hr} is outside typical range (${RANGES.hr.min}-${RANGES.hr.max} bpm)`,
        severity: 'warning'
      });
    }

    // Relational validation: DBP should be less than SBP
    if (validatedReading.dbp > validatedReading.sbp) {
      // Attempt smart swap if values are both in reasonable ranges
      if (this.shouldSwapValues(validatedReading.sbp, validatedReading.dbp)) {
        const temp = validatedReading.sbp;
        validatedReading.sbp = validatedReading.dbp;
        validatedReading.dbp = temp;
        modified = true;

        warnings.push({
          type: 'swapped',
          field: 'sbp',
          message: `Swapped SBP/DBP (DBP was greater than SBP)`,
          severity: 'info'
        });
      } else {
        warnings.push({
          type: 'relational',
          field: 'dbp',
          message: `DBP ${validatedReading.dbp} is greater than SBP ${validatedReading.sbp} (unusual)`,
          severity: 'error'
        });
      }
    }

    // Check for missing/zero values
    if (validatedReading.sbp === 0) {
      warnings.push({
        type: 'missing',
        field: 'sbp',
        message: 'SBP value is missing or zero',
        severity: 'error'
      });
    }

    if (validatedReading.dbp === 0) {
      warnings.push({
        type: 'missing',
        field: 'dbp',
        message: 'DBP value is missing or zero',
        severity: 'error'
      });
    }

    // Attach warnings to reading
    validatedReading.warnings = warnings;

    return {
      valid: warnings.filter(w => w.severity === 'error').length === 0,
      reading: validatedReading,
      warnings,
      modified
    };
  }

  /**
   * Validate and sort multiple readings
   */
  public validateAndSort(readings: BPReading[]): BPReading[] {
    // Validate each reading
    const validated = readings.map(r => this.validateReading(r).reading);

    // Sort by date, then by exact time
    return validated.sort((a, b) => {
      // Primary sort: by date
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;

      // Secondary sort: by exact time (HH:MM format)
      // Convert time strings to comparable numbers (e.g., "19:21" → 1921)
      const timeA = parseInt(a.time.replace(':', ''), 10);
      const timeB = parseInt(b.time.replace(':', ''), 10);

      return timeA - timeB;
    });
  }

  /**
   * Determine if SBP/DBP values should be swapped
   */
  private shouldSwapValues(sbp: number, dbp: number): boolean {
    // Swap if:
    // 1. DBP > SBP (obvious inversion)
    // 2. After swap, both values would be in normal ranges
    // 3. The swapped values make physiological sense

    if (dbp <= sbp) return false;

    // Check if swapped values would be valid
    const wouldBeValidSBP = dbp >= RANGES.sbp.min && dbp <= RANGES.sbp.max;
    const wouldBeValidDBP = sbp >= RANGES.dbp.min && sbp <= RANGES.dbp.max;

    // Also check that difference after swap is reasonable (typically 20-80 mmHg)
    const pulsePerssureAfterSwap = dbp - sbp;
    const reasonablePulsePressure = pulsePerssureAfterSwap >= 20 && pulsePerssureAfterSwap <= 100;

    return wouldBeValidSBP && wouldBeValidDBP && reasonablePulsePressure;
  }

  /**
   * Get summary statistics for a set of readings
   */
  public getStatistics(readings: BPReading[], sbpControlTarget = 130): BPStatistics {
    if (readings.length === 0) {
      return {
        count: 0,
        avgSBP: 0,
        avgDBP: 0,
        avgHR: 0,
        minSBP: 0,
        maxSBP: 0,
        minDBP: 0,
        maxDBP: 0,
        aboveTarget: 0,
        percentAboveTarget: 0,
        sbpBelowTarget: 0,
        percentSBPBelowTarget: 0
      };
    }

    const sbps = readings.map(r => r.sbp);
    const dbps = readings.map(r => r.dbp);
    const hrs = readings.map(r => r.hr);

    const avgSBP = this.average(sbps);
    const avgDBP = this.average(dbps);
    const avgHR = this.average(hrs);

    // Home BP targets: <135/85
    const aboveTarget = readings.filter(r => r.sbp >= 135 || r.dbp >= 85).length;

    // SBP control target (customizable, default 130)
    const sbpBelowTarget = readings.filter(r => r.sbp < sbpControlTarget).length;

    return {
      count: readings.length,
      avgSBP: Math.round(avgSBP),
      avgDBP: Math.round(avgDBP),
      avgHR: Math.round(avgHR),
      minSBP: Math.min(...sbps),
      maxSBP: Math.max(...sbps),
      minDBP: Math.min(...dbps),
      maxDBP: Math.max(...dbps),
      aboveTarget,
      percentAboveTarget: Math.round((aboveTarget / readings.length) * 100),
      sbpBelowTarget,
      percentSBPBelowTarget: Math.round((sbpBelowTarget / readings.length) * 100)
    };
  }

  /**
   * Normalize date string to YYYY-MM-DD
   */
  public normalizeDate(dateStr: string, assumeCurrentYear = true): string {
    // Already normalized
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Parse dd/MM or dd/MM/YYYY
    const match = dateStr.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      let year = match[3];

      if (!year && assumeCurrentYear) {
        year = new Date().getFullYear().toString();
      } else if (year && year.length === 2) {
        year = `20${year}`;
      }

      return `${year}-${month}-${day}`;
    }

    // Fallback to current date
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Calculate average of an array of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Apply bottom-number rule to string value
   */
  public applyBottomNumberRule(value: string): number {
    // Check for stacked numbers (e.g., "160\n156" or "160/156")
    const stackedMatch = value.match(/(\d+)[\n/\\,\s](\d+)/);
    if (stackedMatch) {
      // BOTTOM NUMBER RULE: Take the second number
      return parseInt(stackedMatch[2], 10);
    }

    // Single number
    const match = value.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}

export interface BPStatistics {
  count: number;
  avgSBP: number;
  avgDBP: number;
  avgHR: number;
  minSBP: number;
  maxSBP: number;
  minDBP: number;
  maxDBP: number;
  aboveTarget: number;
  percentAboveTarget: number;
  sbpBelowTarget: number;
  percentSBPBelowTarget: number;
}