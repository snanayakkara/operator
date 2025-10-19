/**
 * BP Diary Extractor Service
 *
 * Extracts blood pressure readings from diary images using Gemma-3n-e4b via LM Studio.
 * Implements the "bottom-number rule" when cells contain multiple stacked values.
 */

import { LMStudioService } from './LMStudioService';
import type { BPReading, BPExtractionResult, BPInsights } from '@/types/BPTypes';
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

      // Generate clinical insights if we have readings
      let insights: BPInsights | undefined;
      if (readings.length > 0) {
        try {
          insights = await this.generateClinicalInsights(readings, signal, modelOverride);
        } catch (error) {
          logger.warn('Failed to generate insights, continuing without them', {
            component: 'bp-extractor',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info('BP extraction complete', {
        component: 'bp-extractor',
        readingsCount: readings.length,
        hasInsights: !!insights,
        processingTime
      });

      return {
        success: true,
        readings,
        insights,
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
2. Extract ALL readings visible in the image, including date, EXACT TIME, SBP, DBP, and heart rate
3. For dates: Convert to YYYY-MM-DD format
4. For time: Extract the EXACT time shown (HH:MM format, 24-hour clock). Examples: "19:21", "06:44", "08:24"
5. Confidence: Estimate 0.0-1.0 based on image clarity

IMPORTANT: Preserve the EXACT timestamps visible in the image. Do NOT simplify to morning/evening.

Return ONLY a JSON array with this exact structure (no markdown, no code blocks, no explanations):
[
  {
    "date": "2025-10-16",
    "time": "19:21",
    "sbp": 132,
    "dbp": 74,
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
Your task is to accurately extract BP readings from images, following these strict rules:
1. When a cell contains two stacked values, select the BOTTOM value only
2. Extract EXACT timestamps (HH:MM format) - do not simplify to morning/evening
3. Maintain chronological order
Return structured JSON data without any markdown formatting or explanatory text.`;
  }

  /**
   * Generate clinical insights from BP readings using LLM
   */
  private async generateClinicalInsights(
    readings: BPReading[],
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<BPInsights> {
    const systemPrompt = `You are a clinical hypertension specialist analyzing home blood pressure monitoring data.
Provide concise, evidence-based clinical insights following Australian guidelines.`;

    const userPrompt = this.buildInsightsPrompt(readings);

    if (modelOverride) {
      try {
        const overrideResponse = await this.lmStudioService.processWithAgent(
          systemPrompt,
          userPrompt,
          'bp-insights', // Agent type for potential DSPy optimization
          signal,
          modelOverride
        );

        return this.parseInsightsResponse(overrideResponse);
      } catch (error) {
        logger.warn('Failed to generate BP insights with override model, falling back to default text model', {
          component: 'bp-extractor',
          model: modelOverride,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const response = await this.lmStudioService.processWithAgent(
      systemPrompt,
      userPrompt,
      'bp-insights',
      signal
    );

    return this.parseInsightsResponse(response);
  }

  /**
   * Build prompt for clinical insights generation
   */
  private buildInsightsPrompt(readings: BPReading[]): string {
    const stats = this.calculateBasicStats(readings);

    const readingsSummary = readings.map(r =>
      `${r.date} ${r.time}: ${r.sbp}/${r.dbp} mmHg, HR ${r.hr}`
    ).join('\n');

    return `Analyze these home BP readings and provide clinical insights:

${readingsSummary}

Summary statistics:
- Average: ${stats.avgSBP}/${stats.avgDBP} mmHg
- Range: SBP ${stats.minSBP}-${stats.maxSBP}, DBP ${stats.minDBP}-${stats.maxDBP}
- Readings above target (135/85): ${stats.aboveTarget}/${stats.count} (${stats.percentAboveTarget}%)

Provide insights in this EXACT JSON format (no markdown, no code blocks):
{
  "controlSummary": "Brief assessment of BP control quality",
  "diurnalPattern": "Observations about time-of-day patterns (if sufficient data)",
  "variabilityConcern": "Assessment of BP variability and consistency",
  "keyRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "peakTimes": "Time periods with highest readings (if pattern evident)",
  "lowestTimes": "Time periods with best control (if pattern evident)"
}

Guidelines:
- Home BP target: <135/85 mmHg (Australian guidelines)
- High variability if SBP range >20-30 mmHg
- Diurnal pattern: compare morning (<12:00) vs afternoon/evening (≥12:00)
- Keep recommendations concise and actionable`;
  }

  /**
   * Parse insights response from LLM
   */
  private parseInsightsResponse(response: string): BPInsights {
    try {
      // Clean response - remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      return {
        controlSummary: String(parsed.controlSummary || 'Unable to assess'),
        diurnalPattern: String(parsed.diurnalPattern || 'Insufficient data for pattern analysis'),
        variabilityConcern: String(parsed.variabilityConcern || 'Unable to assess'),
        keyRecommendations: Array.isArray(parsed.keyRecommendations)
          ? parsed.keyRecommendations.map(String)
          : ['Review with healthcare provider'],
        peakTimes: parsed.peakTimes ? String(parsed.peakTimes) : undefined,
        lowestTimes: parsed.lowestTimes ? String(parsed.lowestTimes) : undefined
      };
    } catch (error) {
      logger.error('Failed to parse insights response', {
        component: 'bp-extractor',
        error: error instanceof Error ? error.message : 'Parse error',
        response: response.substring(0, 200)
      });

      // Return fallback insights
      return {
        controlSummary: 'Analysis unavailable',
        diurnalPattern: 'Analysis unavailable',
        variabilityConcern: 'Analysis unavailable',
        keyRecommendations: ['Review readings with healthcare provider']
      };
    }
  }

  /**
   * Calculate basic statistics for insights generation
   */
  private calculateBasicStats(readings: BPReading[]) {
    const sbps = readings.map(r => r.sbp);
    const dbps = readings.map(r => r.dbp);

    const avgSBP = Math.round(sbps.reduce((sum, n) => sum + n, 0) / sbps.length);
    const avgDBP = Math.round(dbps.reduce((sum, n) => sum + n, 0) / dbps.length);
    const minSBP = Math.min(...sbps);
    const maxSBP = Math.max(...sbps);
    const minDBP = Math.min(...dbps);
    const maxDBP = Math.max(...dbps);

    const aboveTarget = readings.filter(r => r.sbp >= 135 || r.dbp >= 85).length;
    const percentAboveTarget = Math.round((aboveTarget / readings.length) * 100);

    return {
      count: readings.length,
      avgSBP,
      avgDBP,
      minSBP,
      maxSBP,
      minDBP,
      maxDBP,
      aboveTarget,
      percentAboveTarget
    };
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
      const readings: BPReading[] = parsed.map((item: Record<string, unknown>, index: number) => {
        const time = String(item.time || '00:00');
        return {
          id: `bp-${Date.now()}-${index}`,
          date: this.normalizeDate(String(item.date || '')),
          time: this.normalizeTime(time),
          timeOfDay: this.deriveTimeOfDay(time),
          sbp: this.parseNumber(item.sbp),
          dbp: this.parseNumber(item.dbp),
          hr: this.parseNumber(item.hr),
          confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
          warnings: []
        };
      });

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
   * Normalize time string to HH:MM format
   */
  private normalizeTime(timeStr: string): string {
    if (!timeStr) return '00:00';

    // Already in HH:MM format
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }

    // Try to parse various formats
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = match[1].padStart(2, '0');
      const minutes = match[2];
      return `${hours}:${minutes}`;
    }

    // Fallback
    return '00:00';
  }

  /**
   * Derive time of day category from exact time
   */
  private deriveTimeOfDay(timeStr: string): 'morning' | 'evening' {
    const hours = parseInt(timeStr.split(':')[0], 10);

    // Morning: 00:00-11:59
    // Evening: 12:00-23:59
    return hours < 12 ? 'morning' : 'evening';
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
