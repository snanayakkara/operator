/**
 * Valve Sizing Service V2 - Phase 9
 *
 * Accurate TAVI valve prosthesis sizing based on CT measurements.
 * Ported from TAVItool (tavitool.pages.dev) Swift implementation.
 *
 * Supports:
 * - Medtronic Evolut (23, 26, 29, 34mm) - perimeter-based
 * - Edwards Sapien (20, 23, 26, 29mm) - polynomial area + balloon volume
 * - Abbott Navitor (23, 25, 27, 29, 35mm) - perimeter-based
 * - Meril MyVal (20, 21.5, 23, 24.5, 26, 27.5, 29, 30.5, 32mm) - polynomial area
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type ValveBrand = 'evolut' | 'sapien' | 'navitor' | 'myval';

export interface ValveSize {
  size: number;
  name: string;
  // For Sapien: polynomial equation coefficients and balloon volume
  equation?: (area: number) => number;
  nominalVolume?: number;
  step?: number; // Oversizing change per 0.5mL balloon adjustment
}

export interface ValveManufacturer {
  id: ValveBrand;
  displayName: string;
  manufacturer: string;
  deploymentMethod: 'balloon-expandable' | 'self-expanding';
  sizes: ValveSize[];
}

export interface ValveRange {
  area?: { min: number; max: number };
  perimeter?: { min: number; max: number };
}

export interface ValveResult {
  brand: ValveBrand;
  brandDisplayName: string;
  manufacturer: string;
  size: number;
  sizeName: string;
  oversizing: number;
  isOptimal: boolean;
  volumeAdjustment: number | null; // Only for Sapien, in 0.5mL increments
  range?: ValveRange; // Perimeter/area range for display
}

export interface ValveSelection {
  brand: ValveBrand;
  size: number;
  volumeAdjustment?: number; // Sapien only, in 0.5mL increments
  selectedAt: number;
  selectedBy: 'ai' | 'user';
}

// ============================================================================
// Optimal Ranges (% oversizing)
// ============================================================================

const OPTIMAL_RANGES: Record<ValveBrand, { min: number; max: number }> = {
  evolut: { min: 15, max: 25 },
  sapien: { min: 0, max: 10 },
  navitor: { min: 15, max: 25 },
  myval: { min: 5, max: 15 }
};

// Display ranges for sizing bar visualization
export const DISPLAY_RANGES: Record<ValveBrand, { min: number; max: number }> = {
  evolut: { min: 0, max: 40 },
  sapien: { min: -20, max: 20 },
  navitor: { min: 0, max: 40 },
  myval: { min: -5, max: 25 }
};

// ============================================================================
// Perimeter Ranges (for Evolut - perimeter only)
// ============================================================================

const EVOLUT_PERIMETER_RANGES: Record<number, ValveRange> = {
  23: { perimeter: { min: 56.5, max: 62.8 } },
  26: { perimeter: { min: 62.8, max: 72.3 } },
  29: { perimeter: { min: 72.3, max: 81.7 } },
  34: { perimeter: { min: 81.7, max: 94.2 } }
};

// Navitor has both area and perimeter ranges
const NAVITOR_RANGES: Record<number, ValveRange> = {
  23: { area: { min: 277, max: 346 }, perimeter: { min: 60, max: 66 } },
  25: { area: { min: 338, max: 415 }, perimeter: { min: 66, max: 73 } },
  27: { area: { min: 405, max: 491 }, perimeter: { min: 72, max: 79 } },
  29: { area: { min: 479, max: 573 }, perimeter: { min: 79, max: 85 } },
  35: { area: { min: 559, max: 707 }, perimeter: { min: 85, max: 95 } }
};

// ============================================================================
// Valve Database
// ============================================================================

const EVOLUT_VALVES: ValveSize[] = [
  { size: 23, name: '23mm' },
  { size: 26, name: '26mm' },
  { size: 29, name: '29mm' },
  { size: 34, name: '34mm' }
];

const SAPIEN_VALVES: ValveSize[] = [
  {
    size: 20,
    name: '20mm',
    equation: (area: number) =>
      -0.0000043675 * Math.pow(area, 3) +
      0.0051785033 * Math.pow(area, 2) -
      2.2918508067 * area +
      348.7295124512,
    nominalVolume: 11,
    step: 9.1
  },
  {
    size: 23,
    name: '23mm',
    equation: (area: number) =>
      -0.0000020104 * Math.pow(area, 3) +
      0.0030584507 * Math.pow(area, 2) -
      1.7346722892 * area +
      334.6658398893,
    nominalVolume: 17,
    step: 6.27
  },
  {
    size: 26,
    name: '26mm',
    equation: (area: number) =>
      -0.0000009961 * Math.pow(area, 3) +
      0.0019266135 * Math.pow(area, 2) -
      1.3863316077 * area +
      339.8076559598,
    nominalVolume: 23,
    step: 4.35
  },
  {
    size: 29,
    name: '29mm',
    equation: (area: number) =>
      -0.0000004727 * Math.pow(area, 3) +
      0.0011595922 * Math.pow(area, 2) -
      1.0617002278 * area +
      329.8339954494,
    nominalVolume: 33,
    step: 3.03
  }
];

// NOTE: Navitor does NOT have 31mm or 33mm sizes - those were incorrect
const NAVITOR_VALVES: ValveSize[] = [
  { size: 23, name: '23mm' },
  { size: 25, name: '25mm' },
  { size: 27, name: '27mm' },
  { size: 29, name: '29mm' },
  { size: 35, name: '35mm' }
];

const MYVAL_VALVES: ValveSize[] = [
  {
    size: 20,
    name: '20mm',
    equation: (area: number) =>
      -0.0000039348 * Math.pow(area, 3) +
      0.0047622145 * Math.pow(area, 2) -
      2.1442404045 * area +
      325.6149899899
  },
  {
    size: 21.5,
    name: '21.5mm',
    equation: (area: number) =>
      -0.0000053408 * Math.pow(area, 3) +
      0.0062618416 * Math.pow(area, 2) -
      2.717848436 * area +
      416.9867535695
  },
  {
    size: 23,
    name: '23mm',
    equation: (area: number) =>
      -0.0000024442 * Math.pow(area, 3) +
      0.0035956419 * Math.pow(area, 2) -
      1.9599419311 * area +
      368.9452999736
  },
  {
    size: 24.5,
    name: '24.5mm',
    equation: (area: number) =>
      -0.0000010061 * Math.pow(area, 3) +
      0.0019200736 * Math.pow(area, 2) -
      1.3488152286 * area +
      314.5816456734
  },
  {
    size: 26,
    name: '26mm',
    equation: (area: number) =>
      -0.000001068 * Math.pow(area, 3) +
      0.0020395952 * Math.pow(area, 2) -
      1.4500399564 * area +
      354.7969545909
  },
  {
    size: 27.5,
    name: '27.5mm',
    equation: (area: number) =>
      -0.0000004533 * Math.pow(area, 3) +
      0.0011108336 * Math.pow(area, 2) -
      1.007210198 * area +
      301.3503386823
  },
  {
    size: 29,
    name: '29mm',
    equation: (area: number) =>
      -0.0000005565 * Math.pow(area, 3) +
      0.0013174144 * Math.pow(area, 2) -
      1.1631266024 * area +
      353.8782855359
  },
  {
    size: 30.5,
    name: '30.5mm',
    equation: (area: number) =>
      -0.0000002461 * Math.pow(area, 3) +
      0.0007534688 * Math.pow(area, 2) -
      0.8411997253 * area +
      308.4084134948
  },
  {
    size: 32,
    name: '32mm',
    equation: (area: number) =>
      -0.0000002718 * Math.pow(area, 3) +
      0.0008061332 * Math.pow(area, 2) -
      0.8935715592 * area +
      338.6357174346
  }
];

const VALVE_MANUFACTURERS: Record<ValveBrand, ValveManufacturer> = {
  evolut: {
    id: 'evolut',
    displayName: 'Medtronic Evolut',
    manufacturer: 'Medtronic',
    deploymentMethod: 'self-expanding',
    sizes: EVOLUT_VALVES
  },
  sapien: {
    id: 'sapien',
    displayName: 'Edwards Sapien',
    manufacturer: 'Edwards',
    deploymentMethod: 'balloon-expandable',
    sizes: SAPIEN_VALVES
  },
  navitor: {
    id: 'navitor',
    displayName: 'Abbott Navitor',
    manufacturer: 'Abbott',
    deploymentMethod: 'self-expanding',
    sizes: NAVITOR_VALVES
  },
  myval: {
    id: 'myval',
    displayName: 'Meril MyVal',
    manufacturer: 'Meril',
    deploymentMethod: 'balloon-expandable',
    sizes: MYVAL_VALVES
  }
};

// ============================================================================
// Service Implementation
// ============================================================================

export class ValveSizingServiceV2 {
  private static instance: ValveSizingServiceV2;

  private constructor() {}

  public static getInstance(): ValveSizingServiceV2 {
    if (!ValveSizingServiceV2.instance) {
      ValveSizingServiceV2.instance = new ValveSizingServiceV2();
    }
    return ValveSizingServiceV2.instance;
  }

  /**
   * Calculate oversizing percentage for a given valve
   */
  public calculateOversizing(
    brand: ValveBrand,
    valve: ValveSize,
    area: number,
    perimeter: number,
    volumeOffset: number = 0
  ): number {
    switch (brand) {
      case 'evolut':
      case 'navitor': {
        // Perimeter-based calculation
        const perimeterDerivedDiameter = perimeter / Math.PI;
        return ((valve.size / perimeterDerivedDiameter) - 1) * 100;
      }
      case 'sapien': {
        // Polynomial area equation + balloon volume adjustment
        if (!valve.equation || valve.step === undefined) return 0;
        const baseOversizing = valve.equation(area);
        return baseOversizing + volumeOffset * valve.step;
      }
      case 'myval': {
        // Polynomial area equation only
        if (!valve.equation) return 0;
        return valve.equation(area);
      }
      default:
        return 0;
    }
  }

  /**
   * Check if oversizing is within optimal range for the brand
   */
  public isWithinOptimalRange(brand: ValveBrand, oversizing: number): boolean {
    const range = OPTIMAL_RANGES[brand];
    return oversizing >= range.min && oversizing <= range.max;
  }

  /**
   * Get optimal range for a brand
   */
  public getOptimalRange(brand: ValveBrand): { min: number; max: number } {
    return OPTIMAL_RANGES[brand];
  }

  /**
   * Get display range for sizing bar visualization
   */
  public getDisplayRange(brand: ValveBrand): { min: number; max: number } {
    return DISPLAY_RANGES[brand];
  }

  /**
   * Get perimeter/area range for a specific valve size
   */
  public getValveRange(brand: ValveBrand, size: number): ValveRange | undefined {
    switch (brand) {
      case 'evolut':
        return EVOLUT_PERIMETER_RANGES[size];
      case 'navitor':
        return NAVITOR_RANGES[size];
      default:
        return undefined;
    }
  }

  /**
   * Calculate all valve results for given measurements
   */
  public calculateAllResults(
    area: number,
    perimeter: number
  ): ValveResult[] {
    const results: ValveResult[] = [];

    // Process each manufacturer in order: Evolut, Sapien, Navitor, MyVal
    const brandOrder: ValveBrand[] = ['evolut', 'sapien', 'navitor', 'myval'];

    for (const brand of brandOrder) {
      const manufacturer = VALVE_MANUFACTURERS[brand];

      for (const valve of manufacturer.sizes) {
        const oversizing = this.calculateOversizing(brand, valve, area, perimeter, 0);
        const isOptimal = this.isWithinOptimalRange(brand, oversizing);

        results.push({
          brand,
          brandDisplayName: manufacturer.displayName,
          manufacturer: manufacturer.manufacturer,
          size: valve.size,
          sizeName: valve.name,
          oversizing,
          isOptimal,
          volumeAdjustment: brand === 'sapien' ? 0 : null,
          range: this.getValveRange(brand, valve.size)
        });
      }
    }

    return results;
  }

  /**
   * Get results grouped by brand
   */
  public getResultsByBrand(
    area: number,
    perimeter: number
  ): Record<ValveBrand, ValveResult[]> {
    const allResults = this.calculateAllResults(area, perimeter);
    const grouped: Record<ValveBrand, ValveResult[]> = {
      evolut: [],
      sapien: [],
      navitor: [],
      myval: []
    };

    for (const result of allResults) {
      grouped[result.brand].push(result);
    }

    return grouped;
  }

  /**
   * Adjust Sapien balloon volume and recalculate oversizing
   */
  public adjustSapienVolume(
    result: ValveResult,
    area: number,
    perimeter: number,
    volumeOffset: number
  ): ValveResult {
    if (result.brand !== 'sapien') {
      console.warn('[ValveSizingServiceV2] Volume adjustment only applies to Sapien valves');
      return result;
    }

    const valve = SAPIEN_VALVES.find(v => v.size === result.size);
    if (!valve) return result;

    const newOversizing = this.calculateOversizing('sapien', valve, area, perimeter, volumeOffset);
    const isOptimal = this.isWithinOptimalRange('sapien', newOversizing);

    return {
      ...result,
      oversizing: newOversizing,
      isOptimal,
      volumeAdjustment: volumeOffset
    };
  }

  /**
   * Get the best (first optimal) valve for each brand
   */
  public getBestValvePerBrand(
    area: number,
    perimeter: number
  ): Record<ValveBrand, ValveResult | null> {
    const grouped = this.getResultsByBrand(area, perimeter);
    const best: Record<ValveBrand, ValveResult | null> = {
      evolut: null,
      sapien: null,
      navitor: null,
      myval: null
    };

    for (const brand of Object.keys(grouped) as ValveBrand[]) {
      // Find first optimal, or closest to optimal if none
      const optimal = grouped[brand].find(r => r.isOptimal);
      if (optimal) {
        best[brand] = optimal;
      } else if (grouped[brand].length > 0) {
        // Find closest to optimal range midpoint
        const optRange = OPTIMAL_RANGES[brand];
        const midpoint = (optRange.min + optRange.max) / 2;
        const sorted = [...grouped[brand]].sort(
          (a, b) => Math.abs(a.oversizing - midpoint) - Math.abs(b.oversizing - midpoint)
        );
        best[brand] = sorted[0];
      }
    }

    return best;
  }

  /**
   * Get manufacturer info
   */
  public getManufacturer(brand: ValveBrand): ValveManufacturer {
    return VALVE_MANUFACTURERS[brand];
  }

  /**
   * Get all manufacturers
   */
  public getAllManufacturers(): ValveManufacturer[] {
    return Object.values(VALVE_MANUFACTURERS);
  }

  /**
   * Get the brand order for display
   */
  public getBrandOrder(): ValveBrand[] {
    return ['evolut', 'sapien', 'navitor', 'myval'];
  }

  /**
   * Format valve result as string
   */
  public formatValveResult(result: ValveResult): string {
    let str = `${result.brandDisplayName} ${result.sizeName} (${result.oversizing.toFixed(1)}% oversizing)`;
    if (result.volumeAdjustment !== null && result.volumeAdjustment !== 0) {
      const sign = result.volumeAdjustment > 0 ? '+' : '';
      str += ` [${sign}${result.volumeAdjustment.toFixed(1)}mL]`;
    }
    return str;
  }

  /**
   * Check if measurements are valid for calculation
   */
  public validateMeasurements(area: number, perimeter: number): { valid: boolean; message?: string } {
    if (area < 250 || area > 1100) {
      return { valid: false, message: 'Area should be between 250-1100 mm²' };
    }
    if (perimeter < 50 || perimeter > 110) {
      return { valid: false, message: 'Perimeter should be between 50-110 mm' };
    }
    return { valid: true };
  }
}

export default ValveSizingServiceV2;
