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

import { LMStudioService } from './LMStudioService';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';

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
  annulusAreaMm2: /annulus\s+area[:\s]*(\d+(?:\.\d+)?)\s*(?:mm²|mm2|square\s*mm)/i,
  annulusPerimeterMm: /annulus\s+perimeter[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  annulusMinDiameterMm: /(?:annulus\s+)?min(?:imum)?\s+diameter[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  annulusMaxDiameterMm: /(?:annulus\s+)?max(?:imum)?\s+diameter[:\s]*(\d+(?:\.\d+)?)\s*mm/i,

  // Perimeter-derived and area-derived sizing
  perimeterDerived: /perimeter[- ]?derived[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  areaDerived: /area[- ]?derived[:\s]*(\d+(?:\.\d+)?)\s*mm/i,

  // Coronary heights
  coronaryLeftMainMm: /(?:left\s+main|lm)\s+(?:coronary\s+)?height[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  coronaryRightMm: /(?:right\s+coronary|rca)\s+height[:\s]*(\d+(?:\.\d+)?)\s*mm/i,

  // LVOT measurements
  lvotAreaMm2: /lvot\s+area[:\s]*(\d+(?:\.\d+)?)\s*(?:mm²|mm2)/i,
  lvotPerimeterMm: /lvot\s+perimeter[:\s]*(\d+(?:\.\d+)?)\s*mm/i,

  // STJ measurements
  stjDiameterMm: /stj\s+diameter[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  stjHeightMm: /stj\s+height[:\s]*(\d+(?:\.\d+)?)\s*mm/i,

  // Access vessels (right side)
  rightCIAmm: /(?:right|r)\s+(?:common\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  rightEIAmm: /(?:right|r)\s+(?:external\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  rightCFAmm: /(?:right|r)\s+(?:common\s+)?femoral[:\s]*(\d+(?:\.\d+)?)\s*mm/i,

  // Access vessels (left side)
  leftCIAmm: /(?:left|l)\s+(?:common\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  leftEIAmm: /(?:left|l)\s+(?:external\s+)?iliac[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
  leftCFAmm: /(?:left|l)\s+(?:common\s+)?femoral[:\s]*(\d+(?:\.\d+)?)\s*mm/i,

  // Calcium scores
  calciumScore: /(?:av|aortic\s+valve)\s+calcium[:\s]*(\d+(?:\.\d+)?)\s*(?:au|agatston)?/i,
  lvotCalciumScore: /lvot\s+calcium[:\s]*(\d+(?:\.\d+)?)\s*(?:au|agatston)?/i,

  // Valve sizing (if mentioned in dictation)
  recommendedValve: /(sapien|evolut|navitor|acurate|jena)[:\s]*(\d{2,3})\s*mm/i,
  oversizing: /oversizing[:\s]*(\d+(?:\.\d+)?)\s*%/i
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
    const extractedFields = this.extractMeasurements(transcription);

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
  private extractMeasurements(text: string): Partial<TAVIWorkupCTMeasurements> {
    const measurements: Partial<TAVIWorkupCTMeasurements> = {};

    // Extract annulus measurements
    const annulusAreaMatch = text.match(CT_MEASUREMENT_PATTERNS.annulusAreaMm2);
    if (annulusAreaMatch) {
      measurements.annulusAreaMm2 = parseFloat(annulusAreaMatch[1]);
    }

    const annulusPerimeterMatch = text.match(CT_MEASUREMENT_PATTERNS.annulusPerimeterMm);
    if (annulusPerimeterMatch) {
      measurements.annulusPerimeterMm = parseFloat(annulusPerimeterMatch[1]);
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
    const systemPrompt = `You are a medical AI assistant parsing TAVI workup dictation.

CRITICAL RULES:
1. Each measurement field exists in EXACTLY ONE location:
   - CT measurements (annulus, coronaries, LVOT, access) → ctMeasurements
   - Echo data (EF, gradients, AV area) → echocardiography section (NOT ctMeasurements)
   - Labs (Cr, Hb, BNP) → laboratory section
2. DO NOT duplicate fields across sections
3. Validate regex extractions and suggest corrections ONLY if confidence < 0.8

INPUT:
- Transcription: """${transcription}"""
- Detected section: ${detectedSection}
- Regex-extracted CT measurements: ${JSON.stringify(regexResults, null, 2)}

TASK:
1. Validate regex extractions (are values plausible for TAVI workup?)
2. Identify any MISSING critical CT fields that regex missed
3. Generate a cleaned narrative summary for the ${detectedSection} section
4. Return confidence scores for each extracted field

OUTPUT FORMAT (JSON):
{
  "validatedFields": { /* corrected/enhanced CT measurements */ },
  "missedFields": { /* fields regex missed */ },
  "narrativeSummary": "...",
  "suggestedCorrections": [
    { "field": "annulusAreaMm2", "extractedValue": 650, "confidence": 0.9, "suggestion": null }
  ],
  "overallConfidence": 0.85
}`;

    // TODO: Implement LMStudioService.chat method for quick model enhancement
    // For now, return regex results (quick model enhancement will be added in future phase)
    console.log('[TAVIWorkupDictationParser] Quick model enhancement not yet implemented, using regex-only parse');

    return {
      detectedSection,
      extractedFields: regexResults,
      textContent,
      confidence: 0.7,
      suggestedCorrections: []
    };

    /* FUTURE: Once LMStudioService.chat is implemented, uncomment this:
    try {
      const response = await this.lmService.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Parse the dictation.' }
        ],
        {
          model: 'qwen/qwen3-4b-2507',
          maxTokens: 800,
          temperature: 0.2
        }
      );

      const result = JSON.parse(response.choices[0].message.content);

      // Merge validated fields with regex results
      const mergedFields: Partial<TAVIWorkupCTMeasurements> = {
        ...regexResults,
        ...result.validatedFields,
        ...result.missedFields
      };

      return {
        detectedSection,
        extractedFields: mergedFields,
        textContent: result.narrativeSummary && SECTION_MAP[detectedSection as keyof typeof SECTION_MAP]
          ? [{ section: SECTION_MAP[detectedSection as keyof typeof SECTION_MAP], content: result.narrativeSummary }]
          : textContent,
        confidence: result.overallConfidence || 0.7,
        suggestedCorrections: result.suggestedCorrections || []
      };
    } catch (error) {
      console.error('[TAVIWorkupDictationParser] Quick model enhancement failed:', error);

      // Fallback: return regex results with medium confidence
      return {
        detectedSection,
        extractedFields: regexResults,
        textContent,
        confidence: 0.7,
        suggestedCorrections: []
      };
    }
    */
  }
}
