/**
 * TAVI Workup Dictation Parser Service - Phase 8.1
 *
 * Parses free-form or section-targeted dictation into structured CT measurements
 * and narrative sections. Ensures NO duplicate fields across sections.
 *
 * Key Principle: Each measurement field exists in EXACTLY ONE location:
 * - Annulus area/perimeter → ctMeasurements only
 * - Echo data (EF, gradients) → structuredSections.echocardiography only
 * - Clinical symptoms → structuredSections.clinical only
 */

import { LMStudioService, MODEL_CONFIG } from './LMStudioService';
import type { LMStudioRequest, TAVIWorkupCTMeasurements } from '@/types/medical.types';

export type DictationSection = 'ct' | 'echo' | 'clinical' | 'labs' | 'background' | 'medications' | 'freeform';

export interface DictationParseResult {
  // Which section(s) this dictation belongs to
  detectedSection: DictationSection;

  // Structured numeric measurements (CT data only)
  extractedFields: Partial<TAVIWorkupCTMeasurements>;

  // Narrative text content for each section
  textContent: { section: keyof typeof SECTION_MAP; content: string }[];

  // Overall confidence in the parse
  confidence: number;

  // Fields with low confidence that need user review
  suggestedCorrections: Array<{
    field: string;
    extractedValue: string | number;
    confidence: number;
    suggestion?: string;
  }>;
}

type QuickModelFieldEntry = {
  field: string;
  value: number;
  confidence?: number;
};

type QuickModelParseResponse = {
  fields: QuickModelFieldEntry[];
  overallConfidence?: number;
  suggestedCorrections?: DictationParseResult['suggestedCorrections'];
};

/**
 * Section keyword mapping for auto-detection
 * Each measurement/concept should appear in ONLY ONE section
 */
const SECTION_KEYWORDS = {
  ct: [
    // Annulus measurements
    'annulus', 'perimeter', 'area', 'diameter',
    // Coronary heights
    'coronary height', 'left main', 'right coronary', 'lm height', 'rca height',
    // Sinus measurements
    'sinus of valsalva', 'sinus width', 'sinus height', 'stj',
    // LVOT measurements
    'lvot', 'lvot area', 'lvot perimeter',
    // Access vessels
    'iliac', 'femoral', 'access', 'cfa', 'cia', 'eia',
    // Calcium scores
    'calcium score', 'av calcium', 'lvot calcium',
    // CT-specific phrases
    'ct shows', 'ct demonstrates', 'computed tomography'
  ],
  echo: [
    // LV function
    'ejection fraction', 'ef', 'lvedd', 'lvesd', 'lv function',
    // Aortic valve
    'aortic valve area', 'av area', 'peak gradient', 'mean gradient', 'peak velocity',
    // Aortic regurgitation
    'aortic regurgitation', 'ar', 'regurgitant volume',
    // Other valve disease
    'mitral regurgitation', 'mr', 'tricuspid regurgitation', 'tr',
    // Echo-specific phrases
    'echo shows', 'echocardiogram', 'tte', 'transthoracic'
  ],
  clinical: [
    // Symptoms
    'symptoms', 'nyha', 'angina', 'syncope', 'dyspnea', 'chest pain',
    'shortness of breath', 'sob', 'exercise tolerance',
    // Physical exam
    'examination', 'murmur', 'heart sounds', 'systolic murmur',
    // Vital signs
    'blood pressure', 'bp', 'heart rate', 'hr',
    // Clinical presentation
    'presents with', 'complained of', 'history of'
  ],
  labs: [
    // Renal function
    'creatinine', 'gfr', 'egfr', 'renal function',
    // Hematology
    'hemoglobin', 'hb', 'hematocrit', 'hct', 'platelets',
    // Cardiac biomarkers
    'bnp', 'nt-probnp', 'troponin',
    // Coagulation
    'inr', 'pt', 'aptt',
    // Other
    'sodium', 'potassium', 'albumin'
  ],
  background: [
    // Medical history
    'history', 'past medical history', 'pmh',
    // Cardiovascular history
    'hypertension', 'diabetes', 'hyperlipidemia', 'ckd',
    'prior cabg', 'prior pci', 'prior mi',
    // Non-cardiac history
    'copd', 'asthma', 'pvd', 'stroke', 'tia'
  ],
  medications: [
    // Drug classes
    'aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel',
    'warfarin', 'rivaroxaban', 'apixaban', 'edoxaban',
    'statin', 'atorvastatin', 'rosuvastatin',
    'ace inhibitor', 'arb', 'beta blocker', 'diuretic',
    // Medication phrases
    'medications', 'current medications', 'takes', 'on'
  ]
};

/**
 * Map section keywords to TAVIWorkupStructuredSections keys
 */
// Maps simplified dictation section names to TAVIWorkupStructuredSections keys
// NOTE: 'ct' is special - CT measurements go to ctMeasurements object, not a text section
const SECTION_MAP = {
  echo: 'echocardiography',
  clinical: 'clinical',
  labs: 'laboratory',
  background: 'background',
  medications: 'medications'
} as const;

/**
 * Enhanced regex patterns for valve sizing and CT measurements
 * Ported from cathreporter + existing TAVIWorkupAgent patterns
 */
const CT_MEASUREMENT_PATTERNS = {
  // Annulus measurements
  annulusAreaMm2: /annulus\s+area[:\s]*(\d+(?:\.\d+)?)\s*(?:mm²|mm2|square\s*mm)?/i,
  annulusPerimeterMm: /annulus\s+perimeter[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  annulusMinDiameterMm: /(?:annulus\s+)?min(?:imum)?\s+diameter[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  annulusMaxDiameterMm: /(?:annulus\s+)?max(?:imum)?\s+diameter[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,

  // Perimeter-derived and area-derived sizing
  perimeterDerived: /perimeter[- ]?derived[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  areaDerived: /area[- ]?derived[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,

  // Coronary heights
  coronaryLeftMainMm: /(?:left\s+main|lm)\s+(?:coronary\s+)?height[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  coronaryRightMm: /(?:right\s+coronary|rca)\s+height[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,

  // LVOT measurements
  lvotAreaMm2: /lvot\s+area[:\s]*(\d+(?:\.\d+)?)\s*(?:mm²|mm2)?/i,
  lvotPerimeterMm: /lvot\s+perimeter[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,

  // STJ measurements
  stjDiameterMm: /stj\s+diameter[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  stjHeightMm: /stj\s+height[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,

  // Access vessels (right side)
  rightCIAmm: /(?:right|r)\s+(?:common\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  rightEIAmm: /(?:right|r)\s+(?:external\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  rightCFAmm: /(?:right|r)\s+(?:common\s+)?femoral[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,

  // Access vessels (left side)
  leftCIAmm: /(?:left|l)\s+(?:common\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  leftEIAmm: /(?:left|l)\s+(?:external\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
  leftCFAmm: /(?:left|l)\s+(?:common\s+)?femoral[:\s]*(\d+(?:\.\d+)?)\s*(?:mm)?/i,

  // Calcium scores
  calciumScore: /(?:av|aortic\s+valve)\s+calcium[:\s]*(\d+(?:\.\d+)?)\s*(?:au|agatston)?/i,
  lvotCalciumScore: /lvot\s+calcium[:\s]*(\d+(?:\.\d+)?)\s*(?:au|agatston)?/i,

  // Valve sizing (if mentioned in dictation)
  recommendedValve: /(sapien|evolut|navitor|acurate|jena)[:\s]*(\d{2,3})\s*mm/i,
  oversizing: /oversizing[:\s]*(\d+(?:\.\d+)?)\s*%/i
};

const QUICK_MODEL_ALLOWED_FIELDS = new Set<string>([
  'annulusAreaMm2',
  'annulusPerimeterMm',
  'annulusMinDiameterMm',
  'annulusMaxDiameterMm',
  'annulusMeanDiameterMm',
  'coronaryHeights.leftMainMm',
  'coronaryHeights.rightCoronaryMm',
  'lvotAreaMm2',
  'lvotPerimeterMm',
  'stjDiameterMm',
  'stjHeightMm',
  'accessVessels.rightCIAmm',
  'accessVessels.leftCIAmm',
  'accessVessels.rightEIAmm',
  'accessVessels.leftEIAmm',
  'accessVessels.rightCFAmm',
  'accessVessels.leftCFAmm',
  'calciumScore',
  'lvotCalciumScore'
]);

const extractJson = (raw: string): string => {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
};

const parseJsonSafe = <T,>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch (error) {
    console.warn('[TAVIWorkupDictationParser] Failed to parse quick model JSON', {
      error: error instanceof Error ? error.message : error,
      rawPreview: raw?.slice(0, 300)
    });
    return fallback;
  }
};

export class TAVIWorkupDictationParserService {
  private static instance: TAVIWorkupDictationParserService | null = null;
  private lmService: LMStudioService;

  private constructor() {
    this.lmService = LMStudioService.getInstance();
  }

  public static getInstance(): TAVIWorkupDictationParserService {
    if (!TAVIWorkupDictationParserService.instance) {
      TAVIWorkupDictationParserService.instance = new TAVIWorkupDictationParserService();
    }
    return TAVIWorkupDictationParserService.instance;
  }

  /**
   * Main entry point: parse dictation into structured fields + narrative sections
   */
  public async parseDictation(
    transcription: string,
    targetSection?: DictationSection
  ): Promise<DictationParseResult> {
    console.log('[TAVIWorkupDictationParser] Parsing dictation:', {
      transcriptionLength: transcription.length,
      targetSection
    });

    // Step 1: Detect section(s) if not explicitly targeted
    const detectedSection = targetSection || this.detectSection(transcription);

    // Step 2: Extract numeric measurements (CT only)
    const extractedFields = this.extractMeasurements(transcription, detectedSection);

    // Step 3: Generate narrative text content for each section
    const textContent = this.generateTextContent(transcription, detectedSection);

    // Step 4: Use quick model to enhance/validate extraction
    const enhancedResult = await this.enhanceWithQuickModel(
      transcription,
      detectedSection,
      extractedFields,
      textContent
    );

    return enhancedResult;
  }

  /**
   * Detect which section(s) this dictation belongs to
   * Returns the PRIMARY section (not 'mixed')
   */
  private detectSection(transcription: string): DictationSection {
    const lowerText = transcription.toLowerCase();
    const scores: Record<DictationSection, number> = {
      ct: 0,
      echo: 0,
      clinical: 0,
      labs: 0,
      background: 0,
      medications: 0,
      freeform: 0
    };

    // Score each section based on keyword matches
    for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          scores[section as DictationSection] += 1;
        }
      }
    }

    // Return section with highest score (or 'freeform' if no clear winner)
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return 'freeform';
    }

    const detectedSection = Object.entries(scores)
      .filter(([section]) => section !== 'freeform')
      .sort(([, a], [, b]) => b - a)[0][0] as DictationSection;

    console.log('[TAVIWorkupDictationParser] Section scores:', scores, '→', detectedSection);
    return detectedSection;
  }

  /**
   * Extract numeric measurements using regex patterns
   * Only extracts CT measurements (not echo/labs)
   */
  private extractMeasurements(text: string, detectedSection?: DictationSection): Partial<TAVIWorkupCTMeasurements> {
    const measurements: Partial<TAVIWorkupCTMeasurements> = {};
    const allowLooseAnnulus = detectedSection === 'ct';

    // Extract annulus measurements
    const annulusAreaMatch = text.match(CT_MEASUREMENT_PATTERNS.annulusAreaMm2);
    if (annulusAreaMatch) {
      measurements.annulusAreaMm2 = parseFloat(annulusAreaMatch[1]);
    } else if (allowLooseAnnulus) {
      const looseArea = this.findLooseAnnulusArea(text);
      if (looseArea !== null) {
        measurements.annulusAreaMm2 = looseArea;
      }
    }

    const annulusPerimeterMatch = text.match(CT_MEASUREMENT_PATTERNS.annulusPerimeterMm);
    if (annulusPerimeterMatch) {
      measurements.annulusPerimeterMm = parseFloat(annulusPerimeterMatch[1]);
    } else if (allowLooseAnnulus) {
      const loosePerimeter = this.findLooseAnnulusPerimeter(text);
      if (loosePerimeter !== null) {
        measurements.annulusPerimeterMm = loosePerimeter;
      }
    }

    const minDiameterMatch = text.match(CT_MEASUREMENT_PATTERNS.annulusMinDiameterMm);
    if (minDiameterMatch) {
      measurements.annulusMinDiameterMm = parseFloat(minDiameterMatch[1]);
    }

    const maxDiameterMatch = text.match(CT_MEASUREMENT_PATTERNS.annulusMaxDiameterMm);
    if (maxDiameterMatch) {
      measurements.annulusMaxDiameterMm = parseFloat(maxDiameterMatch[1]);
    }

    // Extract coronary heights
    const lmHeightMatch = text.match(CT_MEASUREMENT_PATTERNS.coronaryLeftMainMm);
    const rcaHeightMatch = text.match(CT_MEASUREMENT_PATTERNS.coronaryRightMm);
    if (lmHeightMatch || rcaHeightMatch) {
      measurements.coronaryHeights = {
        leftMainMm: lmHeightMatch ? parseFloat(lmHeightMatch[1]) : undefined,
        rightCoronaryMm: rcaHeightMatch ? parseFloat(rcaHeightMatch[1]) : undefined
      };
    }

    // Extract LVOT measurements
    const lvotAreaMatch = text.match(CT_MEASUREMENT_PATTERNS.lvotAreaMm2);
    if (lvotAreaMatch) {
      measurements.lvotAreaMm2 = parseFloat(lvotAreaMatch[1]);
    }

    const lvotPerimeterMatch = text.match(CT_MEASUREMENT_PATTERNS.lvotPerimeterMm);
    if (lvotPerimeterMatch) {
      measurements.lvotPerimeterMm = parseFloat(lvotPerimeterMatch[1]);
    }

    // Extract STJ measurements
    const stjDiameterMatch = text.match(CT_MEASUREMENT_PATTERNS.stjDiameterMm);
    if (stjDiameterMatch) {
      measurements.stjDiameterMm = parseFloat(stjDiameterMatch[1]);
    }

    const stjHeightMatch = text.match(CT_MEASUREMENT_PATTERNS.stjHeightMm);
    if (stjHeightMatch) {
      measurements.stjHeightMm = parseFloat(stjHeightMatch[1]);
    }

    // Extract access vessels
    const accessVessels: any = {};

    const rightCIAMatch = text.match(CT_MEASUREMENT_PATTERNS.rightCIAmm);
    if (rightCIAMatch) accessVessels.rightCIAmm = parseFloat(rightCIAMatch[1]);

    const rightEIAMatch = text.match(CT_MEASUREMENT_PATTERNS.rightEIAmm);
    if (rightEIAMatch) accessVessels.rightEIAmm = parseFloat(rightEIAMatch[1]);

    const rightCFAMatch = text.match(CT_MEASUREMENT_PATTERNS.rightCFAmm);
    if (rightCFAMatch) accessVessels.rightCFAmm = parseFloat(rightCFAMatch[1]);

    const leftCIAMatch = text.match(CT_MEASUREMENT_PATTERNS.leftCIAmm);
    if (leftCIAMatch) accessVessels.leftCIAmm = parseFloat(leftCIAMatch[1]);

    const leftEIAMatch = text.match(CT_MEASUREMENT_PATTERNS.leftEIAmm);
    if (leftEIAMatch) accessVessels.leftEIAmm = parseFloat(leftEIAMatch[1]);

    const leftCFAMatch = text.match(CT_MEASUREMENT_PATTERNS.leftCFAmm);
    if (leftCFAMatch) accessVessels.leftCFAmm = parseFloat(leftCFAMatch[1]);

    if (Object.keys(accessVessels).length > 0) {
      measurements.accessVessels = accessVessels;
    }

    // Extract calcium scores
    const avCalciumMatch = text.match(CT_MEASUREMENT_PATTERNS.calciumScore);
    if (avCalciumMatch) {
      measurements.calciumScore = parseFloat(avCalciumMatch[1]);
    }

    const lvotCalciumMatch = text.match(CT_MEASUREMENT_PATTERNS.lvotCalciumScore);
    if (lvotCalciumMatch) {
      measurements.lvotCalciumScore = parseFloat(lvotCalciumMatch[1]);
    }

    console.log('[TAVIWorkupDictationParser] Extracted measurements:', measurements);
    return measurements;
  }

  private findLooseAnnulusArea(text: string): number | null {
    const regex = /\barea\b[:\s]*(\d+(?:\.\d+)?)/gi;
    const lowerText = text.toLowerCase();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const index = match.index ?? 0;
      const prefix = lowerText.slice(Math.max(0, index - 24), index);

      if (/\b(lvot|aortic\s+valve|av)\s*$/.test(prefix)) {
        continue;
      }

      const value = parseFloat(match[1]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  private findLooseAnnulusPerimeter(text: string): number | null {
    const regex = /\bperimeter\b(?!\s*[- ]?derived)\s*[:\s]*(\d+(?:\.\d+)?)/gi;
    const lowerText = text.toLowerCase();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const index = match.index ?? 0;
      const prefix = lowerText.slice(Math.max(0, index - 16), index);

      if (/\blvot\s*$/.test(prefix)) {
        continue;
      }

      const value = parseFloat(match[1]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Generate narrative text content for appropriate section(s)
   * NOTE: CT dictation is special - narrative goes to ctMeasurements.narrative, not a text section
   */
  private generateTextContent(
    transcription: string,
    detectedSection: DictationSection
  ): Array<{ section: keyof typeof SECTION_MAP; content: string }> {
    // For freeform or CT dictation, return empty (CT data goes to ctMeasurements.narrative instead)
    if (detectedSection === 'freeform' || detectedSection === 'ct') {
      return [];
    }

    // Map to structured section key
    const sectionKey = SECTION_MAP[detectedSection as keyof typeof SECTION_MAP];
    if (!sectionKey) {
      return [];
    }

    // Return transcription as narrative content for the detected section
    return [{ section: sectionKey, content: transcription.trim() }];
  }

  /**
   * Use quick model (qwen3-4b) to enhance/validate extraction
   * Fills gaps, corrects misparses, and generates narrative summaries
   */
  private async enhanceWithQuickModel(
    transcription: string,
    detectedSection: DictationSection,
    regexResults: Partial<TAVIWorkupCTMeasurements>,
    textContent: Array<{ section: string; content: string }>
  ): Promise<DictationParseResult> {
    const baseConfidence = this.estimateConfidence(regexResults);
    const numericCount = this.countNumericTokens(transcription);
    const extractedCount = this.countMeasurements(regexResults);
    const shouldEnhance = detectedSection === 'ct' && numericCount > extractedCount;

    if (!shouldEnhance) {
      return {
        detectedSection,
        extractedFields: regexResults,
        textContent,
        confidence: baseConfidence,
        suggestedCorrections: []
      };
    }

    const systemPrompt = `You are a medical AI assistant extracting CT measurements from TAVI workup dictation.

Return ONLY JSON with this shape:
{
  "fields": [
    { "field": "annulusAreaMm2", "value": 650, "confidence": 0.9 }
  ],
  "overallConfidence": 0.8
}

Rules:
- Only use fields from the allowed list.
- Only include values explicitly present in the dictation.
- If ambiguous, omit the field.
- Units: areas in mm2, lengths in mm, calcium scores in AU.
- Do not invent values or infer missing measurements.
- If "area" or "perimeter" are unqualified in CT dictation, treat them as annulus area/perimeter.

Allowed fields:
${Array.from(QUICK_MODEL_ALLOWED_FIELDS).join(', ')}`;

    const userPrompt = [
      'Dictation:',
      transcription,
      '',
      'Regex extracted CT fields (may be incomplete):',
      JSON.stringify(regexResults, null, 2)
    ].join('\n');

    const request: LMStudioRequest = {
      model: MODEL_CONFIG.QUICK_MODEL,
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ct_measurement_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    value: { type: 'number' },
                    confidence: { type: 'number' }
                  },
                  required: ['field', 'value']
                }
              },
              overallConfidence: { type: 'number' }
            },
            required: ['fields']
          }
        }
      }
    };

    try {
      const raw = await this.lmService.makeRequest(request, undefined, 'tavi-workup');
      const parsed = parseJsonSafe<QuickModelParseResponse>(raw, { fields: [] });
      const quickMeasurements = this.buildMeasurementsFromQuickFields(parsed.fields || []);
      const mergedFields = this.mergeMeasurements(regexResults, quickMeasurements);
      const mergedConfidence = parsed.overallConfidence ?? this.estimateConfidence(mergedFields);

      return {
        detectedSection,
        extractedFields: mergedFields,
        textContent,
        confidence: mergedConfidence,
        suggestedCorrections: parsed.suggestedCorrections || []
      };
    } catch (error) {
      console.error('[TAVIWorkupDictationParser] Quick model enhancement failed:', error);
      return {
        detectedSection,
        extractedFields: regexResults,
        textContent,
        confidence: baseConfidence,
        suggestedCorrections: []
      };
    }
  }

  private countNumericTokens(text: string): number {
    const matches = text.match(/\d+(?:\.\d+)?/g);
    return matches ? matches.length : 0;
  }

  private countMeasurements(measurements: Partial<TAVIWorkupCTMeasurements>): number {
    let count = 0;
    const push = (value?: number) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        count += 1;
      }
    };

    push(measurements.annulusAreaMm2);
    push(measurements.annulusPerimeterMm);
    push(measurements.annulusMinDiameterMm);
    push(measurements.annulusMaxDiameterMm);
    push(measurements.annulusMeanDiameterMm);
    push(measurements.lvotAreaMm2);
    push(measurements.lvotPerimeterMm);
    push(measurements.stjDiameterMm);
    push(measurements.stjHeightMm);
    push(measurements.calciumScore);
    push(measurements.lvotCalciumScore);

    if (measurements.coronaryHeights) {
      push(measurements.coronaryHeights.leftMainMm);
      push(measurements.coronaryHeights.rightCoronaryMm);
    }

    if (measurements.accessVessels) {
      push(measurements.accessVessels.rightCIAmm);
      push(measurements.accessVessels.leftCIAmm);
      push(measurements.accessVessels.rightEIAmm);
      push(measurements.accessVessels.leftEIAmm);
      push(measurements.accessVessels.rightCFAmm);
      push(measurements.accessVessels.leftCFAmm);
    }

    if (measurements.sinusOfValsalva) {
      push(measurements.sinusOfValsalva.leftMm);
      push(measurements.sinusOfValsalva.rightMm);
      push(measurements.sinusOfValsalva.nonCoronaryMm);
    }

    return count;
  }

  private estimateConfidence(measurements: Partial<TAVIWorkupCTMeasurements>): number {
    const count = this.countMeasurements(measurements);
    if (count === 0) return 0.35;
    if (count === 1) return 0.55;
    if (count <= 3) return 0.7;
    return 0.8;
  }

  private buildMeasurementsFromQuickFields(
    fields: QuickModelFieldEntry[]
  ): Partial<TAVIWorkupCTMeasurements> {
    const measurements: Partial<TAVIWorkupCTMeasurements> = {};

    for (const entry of fields) {
      if (!entry || !Number.isFinite(entry.value)) {
        continue;
      }

      const fieldKey = entry.field?.trim();
      if (!fieldKey || !QUICK_MODEL_ALLOWED_FIELDS.has(fieldKey)) {
        continue;
      }

      this.setMeasurementValue(measurements, fieldKey, entry.value);
    }

    return measurements;
  }

  private setMeasurementValue(
    measurements: Partial<TAVIWorkupCTMeasurements>,
    fieldKey: string,
    value: number
  ): void {
    const path = fieldKey.split('.');
    let cursor: any = measurements;

    for (let i = 0; i < path.length - 1; i += 1) {
      const key = path[i];
      if (!cursor[key] || typeof cursor[key] !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }

    cursor[path[path.length - 1]] = value;
  }

  private mergeMeasurements(
    base: Partial<TAVIWorkupCTMeasurements>,
    override: Partial<TAVIWorkupCTMeasurements>
  ): Partial<TAVIWorkupCTMeasurements> {
    const merged: Partial<TAVIWorkupCTMeasurements> = { ...base, ...override };

    if (base.coronaryHeights || override.coronaryHeights) {
      merged.coronaryHeights = {
        ...base.coronaryHeights,
        ...override.coronaryHeights
      };
    }

    if (base.accessVessels || override.accessVessels) {
      merged.accessVessels = {
        ...base.accessVessels,
        ...override.accessVessels
      };
    }

    if (base.sinusOfValsalva || override.sinusOfValsalva) {
      merged.sinusOfValsalva = {
        ...base.sinusOfValsalva,
        ...override.sinusOfValsalva
      };
    }

    if (base.aorticDimensions || override.aorticDimensions) {
      merged.aorticDimensions = {
        ...base.aorticDimensions,
        ...override.aorticDimensions
      };
    }

    return merged;
  }
}
