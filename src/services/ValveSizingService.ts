/**
 * Valve Sizing Service - Phase 8.3
 *
 * Automated TAVI valve prosthesis recommendations based on CT measurements.
 * Ported from cathreporter valve-store.ts to make Operator independent.
 *
 * Supports: Sapien 3/Ultra, Evolut R/PRO/FX, Navitor/Titan
 */

import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValveSize {
  size: number; // Valve size in mm
  annularAreaMin: number; // mm²
  annularAreaMax: number; // mm²
  annularPerimeterMin: number; // mm
  annularPerimeterMax: number; // mm
  oversizingMin: number; // %
  oversizingMax: number; // %
  catheterSize: 14 | 16; // French
}

export interface ValveSpecification {
  id: string; // 'sapien' | 'evolut' | 'navitor'
  manufacturer: string;
  model: string;
  deploymentMethod: 'balloon-expandable' | 'self-expanding';
  material: string;
  sizes: ValveSize[];
}

export interface ValveRecommendation {
  valve: ValveSpecification;
  size: ValveSize;
  oversizing: number; // Calculated oversizing %
  suitabilityScore: number; // 0-100
  reasoning: string[]; // Why this valve is suitable
  warnings: string[]; // Concerns (undersizing, oversizing, borderline fit)
  sizeCategory: 'optimal' | 'within_range' | 'borderline' | 'outside_range';
}

// ============================================================================
// Valve Database (ported from cathreporter)
// ============================================================================

const VALVE_DATABASE: Record<string, ValveSpecification> = {
  sapien: {
    id: 'sapien',
    manufacturer: 'Edwards',
    model: 'Sapien 3 / Sapien 3 Ultra',
    deploymentMethod: 'balloon-expandable',
    material: 'Bovine pericardium',
    sizes: [
      {
        size: 20,
        annularAreaMin: 237,
        annularAreaMax: 314,
        annularPerimeterMin: 55,
        annularPerimeterMax: 63,
        oversizingMin: 0,
        oversizingMax: 10,
        catheterSize: 14
      },
      {
        size: 23,
        annularAreaMin: 301,
        annularAreaMax: 398,
        annularPerimeterMin: 62,
        annularPerimeterMax: 71,
        oversizingMin: 0,
        oversizingMax: 10,
        catheterSize: 14
      },
      {
        size: 26,
        annularAreaMin: 380,
        annularAreaMax: 505,
        annularPerimeterMin: 69,
        annularPerimeterMax: 80,
        oversizingMin: 0,
        oversizingMax: 10,
        catheterSize: 14
      },
      {
        size: 29,
        annularAreaMin: 487,
        annularAreaMax: 647,
        annularPerimeterMin: 78,
        annularPerimeterMax: 91,
        oversizingMin: 0,
        oversizingMax: 10,
        catheterSize: 14
      }
    ]
  },
  evolut: {
    id: 'evolut',
    manufacturer: 'Medtronic',
    model: 'Evolut R / PRO / PRO+ / FX',
    deploymentMethod: 'self-expanding',
    material: 'Porcine pericardium',
    sizes: [
      {
        size: 23,
        annularAreaMin: 277,
        annularAreaMax: 346,
        annularPerimeterMin: 60,
        annularPerimeterMax: 66,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      },
      {
        size: 26,
        annularAreaMin: 338,
        annularAreaMax: 415,
        annularPerimeterMin: 66,
        annularPerimeterMax: 73,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      },
      {
        size: 29,
        annularAreaMin: 405,
        annularAreaMax: 491,
        annularPerimeterMin: 72,
        annularPerimeterMax: 79,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      },
      {
        size: 34,
        annularAreaMin: 479,
        annularAreaMax: 573,
        annularPerimeterMin: 79,
        annularPerimeterMax: 85,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      }
    ]
  },
  navitor: {
    id: 'navitor',
    manufacturer: 'Abbott',
    model: 'Navitor / Navitor Titan',
    deploymentMethod: 'self-expanding',
    material: 'Porcine pericardium',
    sizes: [
      {
        size: 23,
        annularAreaMin: 277,
        annularAreaMax: 346,
        annularPerimeterMin: 60,
        annularPerimeterMax: 66,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      },
      {
        size: 25,
        annularAreaMin: 338,
        annularAreaMax: 415,
        annularPerimeterMin: 66,
        annularPerimeterMax: 73,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      },
      {
        size: 27,
        annularAreaMin: 405,
        annularAreaMax: 491,
        annularPerimeterMin: 72,
        annularPerimeterMax: 79,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      },
      {
        size: 29,
        annularAreaMin: 479,
        annularAreaMax: 573,
        annularPerimeterMin: 79,
        annularPerimeterMax: 85,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 14
      },
      {
        size: 31,
        annularAreaMin: 518,
        annularAreaMax: 615,
        annularPerimeterMin: 83,
        annularPerimeterMax: 89,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 16
      },
      {
        size: 33,
        annularAreaMin: 572,
        annularAreaMax: 678,
        annularPerimeterMin: 87,
        annularPerimeterMax: 93,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 16
      },
      {
        size: 35,
        annularAreaMin: 637,
        annularAreaMax: 754,
        annularPerimeterMin: 91,
        annularPerimeterMax: 97,
        oversizingMin: 10,
        oversizingMax: 20,
        catheterSize: 16
      }
    ]
  }
};

// ============================================================================
// Service Implementation
// ============================================================================

export class ValveSizingService {
  private static instance: ValveSizingService;

  private constructor() {}

  public static getInstance(): ValveSizingService {
    if (!ValveSizingService.instance) {
      ValveSizingService.instance = new ValveSizingService();
    }
    return ValveSizingService.instance;
  }

  /**
   * Calculate valve recommendations based on CT measurements
   *
   * @param measurements - CT measurements from TAVI workup
   * @returns Array of valve recommendations sorted by suitability (highest first)
   */
  public calculateRecommendations(
    measurements: TAVIWorkupCTMeasurements
  ): ValveRecommendation[] {
    // Require both area AND perimeter for accurate sizing
    if (!measurements.annulusAreaMm2 || !measurements.annulusPerimeterMm) {
      console.warn('[ValveSizingService] Missing annulus area or perimeter - cannot calculate recommendations');
      return [];
    }

    const annularArea = measurements.annulusAreaMm2;
    const annularPerimeter = measurements.annulusPerimeterMm;

    const recommendations: ValveRecommendation[] = [];

    // Iterate through all valves and sizes
    Object.values(VALVE_DATABASE).forEach(valve => {
      valve.sizes.forEach(size => {
        // Check if the annular measurements fit within the valve size range
        const areaFits = annularArea >= size.annularAreaMin && annularArea <= size.annularAreaMax;
        const perimeterFits = annularPerimeter >= size.annularPerimeterMin && annularPerimeter <= size.annularPerimeterMax;

        // Only include if at least one dimension fits
        if (areaFits || perimeterFits) {
          // Calculate oversizing based on derived diameter from area
          const derivedDiameter = Math.sqrt((4 * annularArea) / Math.PI);
          const oversizing = ((size.size - derivedDiameter) / derivedDiameter) * 100;

          // Calculate suitability score (0-100)
          let suitabilityScore = 0;
          const reasoning: string[] = [];
          const warnings: string[] = [];

          // Area-based scoring (40 points)
          if (areaFits) {
            suitabilityScore += 40;
            reasoning.push(`Annular area (${annularArea.toFixed(0)}mm²) fits within range`);
          } else {
            warnings.push(`Annular area (${annularArea.toFixed(0)}mm²) outside recommended range`);
          }

          // Perimeter-based scoring (40 points)
          if (perimeterFits) {
            suitabilityScore += 40;
            reasoning.push(`Annular perimeter (${annularPerimeter.toFixed(1)}mm) fits within range`);
          } else {
            warnings.push(`Annular perimeter (${annularPerimeter.toFixed(1)}mm) outside recommended range`);
          }

          // Oversizing scoring (20 points)
          if (oversizing >= size.oversizingMin && oversizing <= size.oversizingMax) {
            suitabilityScore += 20;
            reasoning.push(`Optimal oversizing (${oversizing.toFixed(1)}%)`);
          } else if (oversizing < size.oversizingMin) {
            suitabilityScore += 10;
            warnings.push(`Undersized: ${oversizing.toFixed(1)}% oversizing (target ${size.oversizingMin}-${size.oversizingMax}%)`);
          } else {
            suitabilityScore += 5;
            warnings.push(`Oversized: ${oversizing.toFixed(1)}% oversizing (target ${size.oversizingMin}-${size.oversizingMax}%)`);
          }

          // Determine size category
          let sizeCategory: ValveRecommendation['sizeCategory'] = 'outside_range';
          if (suitabilityScore >= 90) {
            sizeCategory = 'optimal';
          } else if (suitabilityScore >= 70) {
            sizeCategory = 'within_range';
          } else if (suitabilityScore >= 50) {
            sizeCategory = 'borderline';
          }

          recommendations.push({
            valve,
            size,
            oversizing,
            suitabilityScore,
            reasoning,
            warnings,
            sizeCategory
          });
        }
      });
    });

    // Sort by suitability score (highest first)
    recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    return recommendations;
  }

  /**
   * Get a specific valve by ID
   */
  public getValveById(id: string): ValveSpecification | undefined {
    return VALVE_DATABASE[id];
  }

  /**
   * Get all available valves
   */
  public getAllValves(): ValveSpecification[] {
    return Object.values(VALVE_DATABASE);
  }

  /**
   * Format valve recommendation as string (for clinical note)
   *
   * @param recommendation - Valve recommendation
   * @returns Formatted string (e.g., "Sapien 3 26mm (14% oversizing)")
   */
  public formatRecommendation(recommendation: ValveRecommendation): string {
    return `${recommendation.valve.model} ${recommendation.size.size}mm (${recommendation.oversizing.toFixed(1)}% oversizing)`;
  }

  /**
   * Get primary recommendation (highest suitability score)
   *
   * @param measurements - CT measurements
   * @returns Top recommendation or null if none found
   */
  public getPrimaryRecommendation(
    measurements: TAVIWorkupCTMeasurements
  ): ValveRecommendation | null {
    const recommendations = this.calculateRecommendations(measurements);
    return recommendations.length > 0 ? recommendations[0] : null;
  }
}

export default ValveSizingService;
