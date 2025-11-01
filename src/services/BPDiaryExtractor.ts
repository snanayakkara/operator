/**
 * BP Diary Extractor Service
 *
 * Extracts blood pressure readings from diary images using a vision-capable OCR model via LM Studio.
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
   * Expose default OCR model used for Stage 1 processing.
   */
  public getDefaultOCRModel(): string {
    return this.lmStudioService.getDefaultOCRModel();
  }

  /**
   * Expose default clinical reasoning model used for Stage 2 processing.
   */
  public getDefaultClinicalModel(): string {
    return this.lmStudioService.getDefaultClinicalReasoningModel();
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
      const defaultModel = this.getDefaultOCRModel();
      const ocrModel = modelOverride || defaultModel;

      // Validate image format and size
      const validationError = this.validateImage(imageDataUrl);
      if (validationError) {
        return {
          success: false,
          readings: [],
          error: validationError,
          processingTime: Date.now() - startTime
        };
      }

      logger.info('Starting BP diary extraction', {
        component: 'bp-extractor',
        imageSize: imageDataUrl.length,
        imageSizeMB: (imageDataUrl.length / (1024 * 1024)).toFixed(2),
        model: ocrModel,
        modelOverrideProvided: !!modelOverride
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
        ocrModel // Always specify the OCR model (defaults to Qwen3-VL 8B Instruct when not overridden)
      );

      logger.info('Received LM Studio response', {
        component: 'bp-extractor',
        responseLength: response.length,
        responsePreview: response.substring(0, 100)
      });

      // Check for empty response (model returned [] or empty string)
      const trimmedResponse = response.trim();
      if (trimmedResponse === '[]' || trimmedResponse === '' || trimmedResponse.length < 3) {
        logger.warn('Vision model returned empty response', {
          component: 'bp-extractor',
          response: trimmedResponse,
          modelUsed: ocrModel
        });

        return {
          success: false,
          readings: [],
          error: `Vision model could not extract any readings from the image. This may indicate:\n\n` +
                 `1. The model (${ocrModel}) may not be properly loaded with vision support in LM Studio\n` +
                 `2. The image quality may be too poor for the model to read\n` +
                 `3. The model may not support vision tasks (ensure you're using a vision-capable model such as Qwen3-VL, DeepSeek-OCR, LLaVA, or Gemma vision variants)\n\n` +
                 `Troubleshooting:\n` +
                 `- Verify your vision model is loaded in LM Studio with the correct GGUF files (including -mmproj files for vision support where required)\n` +
                 `- Try a different vision-capable model from the dropdown\n` +
                 `- Use the "Load Sample Data" button to test the chart and editing features`,
          processingTime: Date.now() - startTime
        };
      }

      // Parse response into structured readings
      const readings = this.parseResponse(response);

      // Additional check: if parsing succeeded but returned no readings
      if (readings.length === 0) {
        logger.warn('Parsing returned no readings', {
          component: 'bp-extractor',
          responseLength: response.length
        });

        return {
          success: false,
          readings: [],
          error: `Could not extract BP readings from the vision model response. The model may have misunderstood the task or the image may not contain recognizable BP diary data.\n\n` +
                 `Try:\n` +
                 `- Ensuring the image shows a clear BP diary table\n` +
                 `- Using a different vision model\n` +
                 `- Using the "Load Sample Data" button to test the features`,
          rawResponse: response,
          processingTime: Date.now() - startTime
        };
      }

      const processingTime = Date.now() - startTime;

      logger.info('BP extraction complete', {
        component: 'bp-extractor',
        readingsCount: readings.length,
        processingTime,
        modelUsed: ocrModel
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
    return `VISION TASK: You are analyzing a blood pressure diary photograph/screenshot. You must LOOK AT THE IMAGE and extract tabular data.

STEP 1: EXAMINE THE IMAGE COMPLETELY
- Look for a table with columns: Date, Time, Systolic BP (SBP), Diastolic BP (DBP), Heart Rate (HR)
- The table may be handwritten or printed
- Numbers are whole integers in mmHg (no decimals)
- SCAN THE ENTIRE IMAGE FROM TOP TO BOTTOM - do not stop early
- Count the number of rows visible in the table
- Dates may appear in various formats: DD/MM (e.g., "5/9", "16/10"), DD/MM/YYYY, or written out

STEP 2: EXTRACTION RULES (CRITICAL)
1. BOTTOM-NUMBER RULE: When a cell contains two stacked values (e.g., "160\\n156" or "160/156"), you MUST select the BOTTOM value only. This is non-negotiable.

2. READ EACH CELL INDEPENDENTLY: This is CRITICAL to avoid duplication errors.
   - Do NOT copy dates/times from previous rows
   - Look at EACH cell individually and read what you see
   - If two rows look similar, double-check - they should have different dates or times
   - Common mistake: copying "16 Oct" and "23:49" to multiple rows - AVOID THIS!

3. EXTRACT EVERY ROW: Extract ALL readings visible in the image, even if some values are slightly unclear. Make your BEST GUESS rather than skipping a row.

4. HANDWRITING TOLERANCE: For handwritten diaries:
   - If a number could be 5 or 6, pick the most likely
   - If a date format is abbreviated (e.g., "5/9"), assume current or previous year
   - If time is partially unclear, use context (am/pm notation)
   - Confidence should reflect uncertainty (0.6-0.8 for unclear values)
   - IMPORTANT: Each row should have DIFFERENT date or time values

5. DATE FORMATS: Accept and convert all these formats to YYYY-MM-DD:
   - "16/10" → "2025-10-16" (assume current year if not specified)
   - "5/9" → "2025-09-05" (DD/MM format, assume September 5th)
   - "14/9/2025" → "2025-09-14"
   - Written dates → convert to YYYY-MM-DD
   - WATCH OUT: Dates often change between rows - don't duplicate!

6. TIME FORMATS: Extract EXACT time in HH:MM (24-hour clock)
   - "4:22 am" → "04:22"
   - "10.16 am" → "10:16"
   - "3:21 pm" → "15:21"
   - "9:55" → assume context (am/pm)
   - WARNING: Times should vary between readings - check each cell carefully!

7. COMPLETE SCAN: Do not stop until you have checked every visible row in the table, even if you've already found 10+ readings

STEP 3: OUTPUT FORMAT
Return ONLY a JSON array with this exact structure (no markdown, no code blocks, no explanations):

EXAMPLE OUTPUT (if image shows these readings):
[
  {
    "date": "2025-10-16",
    "time": "04:22",
    "sbp": 150,
    "dbp": 94,
    "hr": 95,
    "confidence": 0.95
  },
  {
    "date": "2025-10-16",
    "time": "10:16",
    "sbp": 146,
    "dbp": 91,
    "hr": 89,
    "confidence": 0.90
  },
  {
    "date": "2025-10-16",
    "time": "13:40",
    "sbp": 130,
    "dbp": 82,
    "hr": 91,
    "confidence": 0.85
  }
]

CRITICAL REMINDERS:
- Extract EVERY row you can see - aim for 100% coverage
- READ EACH CELL INDEPENDENTLY - do not copy values from nearby rows
- Dates and times should be DIFFERENT for each row (unless truly identical in the image)
- Make your best guess for unclear values rather than skipping them
- Lower confidence (0.6-0.8) for uncertain readings is better than no reading
- Scan the ENTIRE image before returning results
- If you see duplicate dates/times in your output, GO BACK and re-read those cells carefully
- If the image is completely unreadable or contains no BP table, ONLY THEN return an empty array: []

Now, examine the provided image and extract ALL visible blood pressure readings following the rules above.`;
  }

  /**
   * System prompt for the extraction agent
   */
  private getSystemPrompt(): string {
    return `You are a medical data extraction specialist with vision capabilities, specialized in analyzing blood pressure diary images.

Your task is to:
1. LOOK AT the provided image carefully and SCAN THE ENTIRE IMAGE from top to bottom
2. Identify tabular data containing BP readings (Date, Time, SBP, DBP, HR)
3. Extract EVERY SINGLE visible reading - do not skip rows even if handwriting is unclear
4. Make your best guess for unclear values rather than omitting them (use lower confidence scores for uncertainty)
5. Apply the BOTTOM-NUMBER RULE when cells contain stacked values
6. Preserve EXACT timestamps (HH:MM format) - never simplify to morning/evening
7. Handle various date formats: DD/MM, DD/MM/YYYY, written dates
8. Maintain chronological order

CRITICAL: Aim for 100% extraction coverage. Extract every row you can identify, even if values are partially unclear.

Return ONLY structured JSON array data without any markdown formatting, code blocks, or explanatory text.
If you cannot see or process the image at all, return an empty array [].`;
  }

  /**
   * Generate clinical insights from BP readings using the clinical reasoning model.
   *
   * NOTE: This method is no longer called automatically from extractFromImage.
   *       Higher-level components (e.g. the importer) should invoke it explicitly
   *       once vision/OCR extraction has completed.
   */
  public async generateClinicalInsights(
    readings: BPReading[],
    options?: {
      signal?: AbortSignal;
      modelOverride?: string;
      medicationsText?: string;
      backgroundText?: string;
    }
  ): Promise<BPInsights> {
    if (readings.length === 0) {
      return {
        controlSummary: 'No readings supplied for analysis',
        diurnalPattern: 'Insufficient data for diurnal assessment',
        variabilityConcern: 'Insufficient data for variability assessment',
        keyRecommendations: ['Provide home BP readings before attempting analysis']
      };
    }

    const {
      signal,
      modelOverride,
      medicationsText,
      backgroundText
    } = options || {};

    const systemPrompt = `You are a hypertension and cardiovascular risk clinician in Australia. You receive home blood pressure monitoring data and the current medication list. You must: (1) assess overall BP control using home thresholds (135/85), (2) comment on morning vs evening readings, (3) detect high variability, (4) relate control to the medications supplied (e.g. ACEi, ARB, CCB, thiazide, beta-blocker), (5) suggest next clinical steps such as ABPM, adherence check, timing adjustment or intensification, and (6) generate a short paragraph for the patient in Australian English. Use Australian spelling in every response.`;

    const stats = this.calculateBasicStats(readings);
    const userPrompt = this.buildInsightsPrompt(readings, stats, {
      medicationsText,
      backgroundText
    });

    const defaultClinicalModel = this.getDefaultClinicalModel();

    if (modelOverride) {
      try {
        const overrideResponse = await this.lmStudioService.processWithAgent(
          systemPrompt,
          userPrompt,
          'bp-diary-insights',
          signal,
          modelOverride
        );

        return this.parseInsightsResponse(overrideResponse);
      } catch (error) {
        logger.warn('Failed to generate BP insights with override model, falling back to default clinical reasoning model', {
          component: 'bp-extractor',
          model: modelOverride,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const response = await this.lmStudioService.processWithAgent(
      systemPrompt,
      userPrompt,
      'bp-diary-insights',
      signal,
      defaultClinicalModel
    );

    return this.parseInsightsResponse(response);
  }

  /**
   * Build prompt for clinical insights generation
   */
  private buildInsightsPrompt(
    readings: BPReading[],
    stats: ReturnType<typeof this.calculateBasicStats>,
    context?: { medicationsText?: string; backgroundText?: string }
  ): string {
    const readingsSummary = readings.map(r =>
      `${r.date} ${r.time}: ${r.sbp}/${r.dbp} mmHg, HR ${r.hr}`
    ).join('\n');

    const medicationsSection = context?.medicationsText?.trim()
      ? context.medicationsText.trim()
      : 'No medications supplied.';

    const backgroundSection = context?.backgroundText?.trim()
      ? context.backgroundText.trim()
      : 'No additional background supplied.';

    return `You will receive structured home blood pressure readings and limited clinical context. Analyse the data and respond with JSON only.

READINGS:
${readingsSummary}

SUMMARY STATISTICS:
- Count: ${stats.count}
- Average: ${stats.avgSBP}/${stats.avgDBP} mmHg (HR ${stats.avgHR})
- SBP Range: ${stats.minSBP}-${stats.maxSBP} mmHg
- DBP Range: ${stats.minDBP}-${stats.maxDBP} mmHg
- Readings ≥135/85: ${stats.aboveTarget}/${stats.count} (${stats.percentAboveTarget}%)

CLINICAL CONTEXT:
- Medications: ${medicationsSection}
- Background: ${backgroundSection}

Return ONLY JSON using this schema:
{
  "controlSummary": "Overall BP control referencing home threshold (135/85)",
  "diurnalPattern": "Morning vs evening commentary or 'Insufficient data'",
  "variabilityConcern": "Variability assessment referencing observed range",
  "keyRecommendations": ["Clinician-facing next steps in plain text"],
  "medicationRationale": "How current regimen explains control or gaps; say 'No medications supplied' if none provided",
  "abpmSuggestion": "Specific statement on ABPM / adherence / follow-up timing",
  "patientParagraph": "Short patient-friendly paragraph (Australian English, plain text)",
  "peakTimes": "Times with highest readings if pattern evident",
  "lowestTimes": "Times with best control if pattern evident"
}

Constraints:
- Use Australian spelling.
- Tie recommendations to supplied medications where possible.
- Mention explicitly if medications or background were not provided.
- Do not include markdown, explanations, or additional text outside the JSON object.`;
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
      const candidate = (parsed && typeof parsed === 'object' && 'insights' in parsed)
        ? (parsed as { insights?: unknown }).insights
        : parsed;

      if (!candidate || typeof candidate !== 'object') {
        throw new Error('Insights payload was not an object');
      }

      const getString = (value: unknown, fallback: string): string => {
        if (typeof value === 'string' && value.trim().length > 0) {
          return value.trim();
        }
        return fallback;
      };

      const toOptionalString = (value: unknown): string | undefined => {
        if (typeof value === 'string' && value.trim().length > 0) {
          return value.trim();
        }
        return undefined;
      };

      let recommendations: string[] = [];
      const rawRecommendations = (candidate as Record<string, unknown>).keyRecommendations;
      if (Array.isArray(rawRecommendations)) {
        recommendations = rawRecommendations
          .map(item => {
            if (typeof item === 'string') {
              return item.trim();
            }
            if (item && typeof item === 'object') {
              try {
                return JSON.stringify(item);
              } catch {
                return '';
              }
            }
            return String(item ?? '');
          })
          .filter(rec => rec.length > 0);
      } else if (typeof rawRecommendations === 'string' && rawRecommendations.trim().length > 0) {
        recommendations = rawRecommendations
          .split(/\n|;/)
          .map(part => part.trim())
          .filter(Boolean);
      }

      if (recommendations.length === 0) {
        recommendations = ['Review readings with healthcare provider'];
      }

      const data = candidate as Record<string, unknown>;

      return {
        controlSummary: getString(data.controlSummary, 'Unable to assess'),
        diurnalPattern: getString(data.diurnalPattern, 'Insufficient data for pattern analysis'),
        variabilityConcern: getString(data.variabilityConcern, 'Unable to assess'),
        keyRecommendations: recommendations,
        peakTimes: toOptionalString(data.peakTimes),
        lowestTimes: toOptionalString(data.lowestTimes),
        patientParagraph: toOptionalString(data.patientParagraph),
        medicationRationale: toOptionalString(data.medicationRationale),
        abpmSuggestion: toOptionalString(data.abpmSuggestion)
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
    const hrs = readings.map(r => r.hr);

    const avgSBP = Math.round(sbps.reduce((sum, n) => sum + n, 0) / sbps.length);
    const avgDBP = Math.round(dbps.reduce((sum, n) => sum + n, 0) / dbps.length);
    const avgHR = hrs.length > 0 ? Math.round(hrs.reduce((sum, n) => sum + n, 0) / hrs.length) : 0;
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
      avgHR,
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

  /**
   * Validate image format and size
   * Returns error message if validation fails, null if valid
   */
  private validateImage(imageDataUrl: string): string | null {
    // Check if empty
    if (!imageDataUrl || imageDataUrl.length === 0) {
      return 'No image data provided';
    }

    // Check if it's a valid data URL
    if (!imageDataUrl.startsWith('data:image/')) {
      return 'Invalid image format. Expected data URL starting with "data:image/"';
    }

    // Check image type (should be jpeg, png, or webp)
    const imageType = imageDataUrl.substring(5, imageDataUrl.indexOf(';'));
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(imageType)) {
      return `Unsupported image type: ${imageType}. Supported types: JPEG, PNG, WebP`;
    }

    // Check image size (warn if > 5MB, error if > 10MB)
    const sizeInBytes = imageDataUrl.length;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 10) {
      return `Image too large (${sizeInMB.toFixed(1)}MB). Maximum size is 10MB. Please compress or resize the image.`;
    }

    if (sizeInMB > 5) {
      logger.warn('Large image detected', {
        component: 'bp-extractor',
        sizeMB: sizeInMB.toFixed(2),
        message: 'Image is large and may take longer to process or fail with some models'
      });
    }

    return null; // Validation passed
  }
}
