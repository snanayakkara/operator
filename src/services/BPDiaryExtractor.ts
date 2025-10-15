/**
 * BP Diary Extractor Service
 *
 * Extracts blood pressure readings from diary images using Gemma-3n-e4b via LM Studio.
 * Implements the "bottom-number rule" when cells contain multiple stacked values.
 */

import { LMStudioService } from './LMStudioService';
import type { BPReading, BPExtractionResult } from '@/types/BPTypes';
import { logger } from '@/utils/Logger';

export class BPDiaryExtractor {
  private static instance: BPDiaryExtractor;
  private lmStudioService: LMStudioService;

  private constructor() {
    this.lmStudioService = LMStudioService.getInstance();
  }

  public static getInstance(): BPDiaryExtractor {
    if (!BPDiaryExtractor.instance) {
      BPDiaryExtractor.instance = new BPDiaryExtractor();
    }
    return BPDiaryExtractor.instance;
  }

  /**
   * Extract BP readings from an image
   * @param imageDataUrl - Base64 encoded image data URL
   * @param signal - Optional AbortSignal for cancellation
   * @param modelOverride - Optional model name to use instead of default
   */
  public async extractFromImage(
    imageDataUrl: string,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<BPExtractionResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting BP diary extraction', {
        component: 'bp-extractor',
        imageSize: imageDataUrl.length,
        model: modelOverride || 'default'
      });

      // Build extraction prompt (text-only, image sent separately)
      const textPrompt = this.buildExtractionPrompt();

      // Call LM Studio vision API with user-selected model
      const response = await this.lmStudioService.processWithVisionAgent(
        this.getSystemPrompt(),
        textPrompt,
        imageDataUrl,
        'bp-diary-extraction', // Custom agent type for potential future optimization
        signal,
        modelOverride // Pass model override to LMStudioService
      );

      logger.info('Received LM Studio response', {
        component: 'bp-extractor',
        responseLength: response.length
      });

      // Parse response into structured readings
      const readings = this.parseResponse(response);

      const processingTime = Date.now() - startTime;

      logger.info('BP extraction complete', {
        component: 'bp-extractor',
        readingsCount: readings.length,
        processingTime
      });

      return {
        success: true,
        readings,
        rawResponse: response,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('BP extraction failed', {
        component: 'bp-extractor',
        error: errorMessage,
        processingTime
      });

      return {
        success: false,
        readings: [],
        error: errorMessage,
        processingTime
      };
    }
  }

  /**
   * Build the extraction prompt for vision analysis
   * Returns the text instruction for the vision model
   */
  private buildExtractionPrompt(): string {
    return `Analyze this blood pressure diary image and extract all BP readings. The dates will usually be consecutive days, and all numbers will be whole integers in mmHg, no decimals.

CRITICAL RULES:
1. BOTTOM-NUMBER RULE: When a cell contains two stacked values (e.g., "160\\n156" or "160/156"),
   you MUST select the BOTTOM value only. This is non-negotiable.
2. Extract ALL readings visible in the image, including date, time of day, SBP, DBP, and heart rate
3. For dates: Convert to YYYY-MM-DD format
4. For time of day: Return "morning" or "evening"
5. Confidence: Estimate 0.0-1.0 based on image clarity

Return ONLY a JSON array with this exact structure (no markdown, no code blocks, no explanations):
[
  {
    "date": "2025-09-28",
    "timeOfDay": "morning",
    "sbp": 142,
    "dbp": 88,
    "hr": 72,
    "confidence": 0.95
  }
]

If the image is unclear or contains no BP readings, return an empty array: []`;
  }

  /**
   * System prompt for the extraction agent
   */
  private getSystemPrompt(): string {
    return `You are a medical data extraction specialist focused on blood pressure diaries.
Your task is to accurately extract BP readings from images, following the strict rule that when
a cell contains two stacked values, you must select the BOTTOM value only.
Return structured JSON data without any markdown formatting or explanatory text.`;
  }

  /**
   * Parse LM Studio response into BPReading objects
   */
  private parseResponse(response: string): BPReading[] {
    try {
      // Clean response - remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        logger.warn('Response is not an array', { component: 'bp-extractor' });
        return [];
      }

      // Map to BPReading format with IDs
      const readings: BPReading[] = parsed.map((item: Record<string, unknown>, index: number) => ({
        id: `bp-${Date.now()}-${index}`,
        date: this.normalizeDate(String(item.date || '')),
        timeOfDay: this.normalizeTimeOfDay(String(item.timeOfDay || '')),
        sbp: this.parseNumber(item.sbp),
        dbp: this.parseNumber(item.dbp),
        hr: this.parseNumber(item.hr),
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
        warnings: []
      }));

      return readings;

    } catch (error) {
      logger.error('Failed to parse extraction response', {
        component: 'bp-extractor',
        error: error instanceof Error ? error.message : 'Parse error',
        response: response.substring(0, 200)
      });

      return [];
    }
  }

  /**
   * Normalize date string to YYYY-MM-DD format
   */
  private normalizeDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Handle dd/MM or dd/MM/YYYY
    const match = dateStr.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : new Date().getFullYear().toString();
      return `${year}-${month}-${day}`;
    }

    // Fallback to current date
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Normalize time of day to 'morning' or 'evening'
   */
  private normalizeTimeOfDay(timeStr: string): 'morning' | 'evening' {
    if (!timeStr) return 'morning';

    const lower = timeStr.toLowerCase();
    if (lower.includes('evening') || lower.includes('pm') || lower.includes('night')) {
      return 'evening';
    }
    return 'morning';
  }

  /**
   * Parse number from various formats, applying bottom-number rule
   */
  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const str = String(value).trim();

    // Check for stacked numbers (e.g., "160\n156" or "160/156")
    const stackedMatch = str.match(/(\d+)[\n/\\,](\d+)/);
    if (stackedMatch) {
      // BOTTOM NUMBER RULE: Take the second number
      return parseInt(stackedMatch[2], 10);
    }

    // Single number
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}