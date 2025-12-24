import { LesionEntry, LesionTree } from '../types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '../services/LMStudioService';

/**
 * Lesion Extraction Service
 * Extracts structured lesion data from raw angiogram transcriptions
 * using intelligent quick model (qwen3-4b) for natural language understanding.
 *
 * Replaces regex-based extraction with AI that understands lesions dictated
 * in any order and extracts intent to structured LesionTree format.
 */

export class LesionExtractionService {
  /**
   * Quick model-based extraction using qwen3-4b (10-30s, ~90% accuracy)
   * Understands natural language regardless of dictation order
   */
  static async extractLesionsFromTranscription(
    transcription: string,
    lmStudioService: LMStudioService
  ): Promise<LesionTree> {
    try {
      console.log('[LesionExtractionService] Starting quick model extraction...');

      // Build prompt for quick model
      const systemPrompt = this.buildLesionExtractionPrompt();
      const userMessage = `TRANSCRIPTION:\n${transcription}\n\nExtract lesions as JSON only.`;

      // Call quick model (qwen3-4b, 10-30s)
      const response = await lmStudioService.processWithAgent(
        systemPrompt,
        userMessage,
        'angio-lesion-extraction',
        undefined,
        MODEL_CONFIG.QUICK_MODEL  // qwen/qwen3-4b-2507
      );

      // Parse JSON response
      const extracted = this.parseQuickModelResponse(response);
      console.log('[LesionExtractionService] Quick model extraction successful');
      return extracted;

    } catch (error) {
      console.error('[LesionExtractionService] Quick model extraction failed:', error);
      // Graceful degradation: return empty tree
      // User can add lesions manually in proof mode
      return this.buildEmptyLesionTree();
    }
  }

  /**
   * Build system prompt for quick model extraction
   */
  private static buildLesionExtractionPrompt(): string {
    return `You are a medical AI that extracts coronary lesion data from angiogram dictations.

OUTPUT FORMAT: Valid JSON only, no markdown code fences.

{
  "lm": [{ "id": "uuid", "branch": "Left Main", "severity": "50% stenosis", "description": "..." }],
  "lad": [{ "id": "uuid", "branch": "Proximal LAD", "severity": "90% stenosis", "description": "..." }],
  "lcx": [{ "id": "uuid", "branch": "OM1", "severity": "70% stenosis", "description": "..." }],
  "rca": [{ "id": "uuid", "branch": "Proximal RCA", "severity": "100% occluded", "description": "..." }],
  "grafts": [{ "id": "uuid", "branch": "SVG to LAD", "severity": "patent", "description": "..." }]
}

VESSEL MAPPING:
- LM/Left Main → "lm"
- LAD/Left Anterior Descending/Diagonal (D1, D2) → "lad"
- LCx/Left Circumflex/Obtuse Marginal (OM1, OM2)/Ramus → "lcx"
- RCA/Right Coronary/PDA/PLV → "rca"
- SVG/LIMA/RIMA/grafts → "grafts"

SEGMENT DESCRIPTORS:
- Proximal, mid, distal, ostial
- Diagonal 1 (D1), Diagonal 2 (D2)
- Obtuse Marginal 1 (OM1), Obtuse Marginal 2 (OM2)
- PDA (Posterior Descending), PLV (Posterolateral)

SEVERITY FORMATS:
- Percentage: "90% stenosis", "70% narrowing", "50% lesion"
- Qualitative: "severe stenosis", "moderate lesion", "mild narrowing"
- Special: "100% occluded", "chronic total occlusion", "patent"

DESCRIPTION SHOULD INCLUDE:
- Lesion characteristics (calcified, eccentric, ulcerated)
- Intervention if any (stented with 3.0x24mm DES)
- TIMI flow if mentioned (TIMI 3 flow, TIMI 0)

CRITICAL RULES:
1. Extract ALL lesions mentioned in any order
2. If user says "diagonal had 90% stenosis", map to LAD vessel, branch "D1" or "Diagonal"
3. If user says "OM1 70% stenosis", map to LCx vessel, branch "OM1"
4. Generate unique IDs for each lesion (use timestamp or uuid)
5. If no lesions mentioned, return empty arrays for all vessels
6. Understand natural language: "the left main was severely diseased" → lm vessel, severe stenosis
7. Handle variations: "occluded RCA" = 100% stenosis, "patent" = 0% stenosis

OUTPUT ONLY VALID JSON, NO EXPLANATIONS.`;
  }

  /**
   * Parse quick model JSON response into LesionTree
   */
  private static parseQuickModelResponse(response: string): LesionTree {
    try {
      // Remove markdown code fences if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      // Validate structure and add IDs if missing
      const tree: LesionTree = {
        lm: this.validateAndEnrichLesions(parsed.lm || []),
        lad: this.validateAndEnrichLesions(parsed.lad || []),
        lcx: this.validateAndEnrichLesions(parsed.lcx || []),
        rca: this.validateAndEnrichLesions(parsed.rca || []),
        grafts: this.validateAndEnrichLesions(parsed.grafts || []),
      };

      return tree;
    } catch (error) {
      console.error('[LesionExtractionService] Failed to parse quick model response:', error);
      console.error('[LesionExtractionService] Response was:', response);
      return this.buildEmptyLesionTree();
    }
  }

  /**
   * Validate and enrich lesion entries with IDs if missing
   */
  private static validateAndEnrichLesions(lesions: any[]): LesionEntry[] {
    return lesions.map((lesion, index) => ({
      id: lesion.id || `ai-${Date.now()}-${index}`,
      branch: lesion.branch || 'mid',
      severity: lesion.severity || 'unknown',
      description: lesion.description || '',
    }));
  }

  /**
   * Build empty lesion tree (used for graceful degradation)
   */
  private static buildEmptyLesionTree(): LesionTree {
    return {
      lm: [],
      lad: [],
      lcx: [],
      rca: [],
      grafts: [],
    };
  }

  /**
   * Build lesion tree from flat lesion array (utility method, kept for backward compatibility)
   */
  private static buildLesionTree(
    lesions: Array<LesionEntry & { vessel: string }>
  ): LesionTree {
    const tree: LesionTree = {
      lm: [],
      lad: [],
      lcx: [],
      rca: [],
      grafts: [],
    };

    lesions.forEach((lesion) => {
      const vessel = lesion.vessel as keyof LesionTree;
      if (tree[vessel]) {
        // Remove vessel property before adding to tree
        const { vessel: _, ...entry } = lesion;
        tree[vessel].push(entry);
      }
    });

    return tree;
  }

  /**
   * Get extraction statistics for debugging
   */
  static getExtractionStats(tree: LesionTree): {
    totalLesions: number;
    vesselsWithLesions: string[];
    lesionsByVessel: Record<string, number>;
  } {
    const stats = {
      totalLesions: 0,
      vesselsWithLesions: [] as string[],
      lesionsByVessel: {} as Record<string, number>,
    };

    Object.entries(tree).forEach(([vessel, lesions]) => {
      const count = lesions.length;
      stats.totalLesions += count;
      stats.lesionsByVessel[vessel] = count;

      if (count > 0) {
        stats.vesselsWithLesions.push(vessel.toUpperCase());
      }
    });

    return stats;
  }
}
