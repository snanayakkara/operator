/**
 * Data Validation Utilities
 * 
 * Comprehensive data extraction pipeline with validation, quality assessment,
 * and fallback strategies. Ensures reliable data extraction from EMR systems
 * with detailed quality reporting.
 */

import type { 
  ExtractedData,
  DataQualityReport,
  FieldExtractionResult,
  ValidationResult,
  BatchProcessingMessage
} from '@/types/BatchProcessingTypes';

import type { PatientAppointment } from '@/types/medical.types';

export interface ExtractionConfig {
  fields: string[];
  fallbackSelectors: Record<string, string[]>;
  qualityThresholds: QualityThresholds;
  retryAttempts: number;
  timeout: number;
  screenshotOnFailure: boolean;
}

export interface QualityThresholds {
  minWordCount: number;
  minMedicalTerms: number;
  minCompletenessScore: number;
  acceptableConfidenceLevel: 'low' | 'medium' | 'high';
}

export class DataValidation {
  private static instance: DataValidation;
  private debugMode = false;
  private medicalTermPatterns: RegExp[] = [];
  private commonErrorPatterns: RegExp[] = [];

  private defaultConfig: ExtractionConfig = {
    fields: ['background', 'investigations', 'medications'],
    fallbackSelectors: {
      background: [
        'textarea[data-field="background"]',
        '#background',
        '.background textarea',
        '.XestroBox:contains("Background") textarea',
        'textarea[placeholder*="background" i]'
      ],
      investigations: [
        'textarea[data-field="investigations"]',
        '#investigations', 
        '.investigations textarea',
        '.XestroBox:contains("Investigation") textarea',
        'textarea[placeholder*="investigation" i]'
      ],
      medications: [
        'textarea[data-field="medications"]',
        '#medications',
        '.medications textarea', 
        '.XestroBox:contains("Medication") textarea',
        'textarea[placeholder*="medication" i]'
      ]
    },
    qualityThresholds: {
      minWordCount: 5,
      minMedicalTerms: 1,
      minCompletenessScore: 0.3,
      acceptableConfidenceLevel: 'medium'
    },
    retryAttempts: 3,
    timeout: 10000,
    screenshotOnFailure: true
  };

  private constructor() {
    this.initializeMedicalPatterns();
    this.initializeErrorPatterns();
  }

  public static getInstance(): DataValidation {
    if (!DataValidation.instance) {
      DataValidation.instance = new DataValidation();
    }
    return DataValidation.instance;
  }

  /**
   * Extract patient clinical data with comprehensive validation
   */
  public async extractPatientClinicalData(
    tabId: number,
    patient: PatientAppointment,
    config: Partial<ExtractionConfig> = {}
  ): Promise<ExtractedData> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    this.log(`🔍 Starting data extraction for patient: ${patient.name}`);

    // Pre-extraction validation
    const preValidation = await this.preExtractionValidation(tabId, patient);
    if (!preValidation.isValid) {
      throw new Error(`Pre-extraction validation failed: ${preValidation.errors.join(', ')}`);
    }

    // Extract each field with individual error handling
    const fieldResults = new Map<string, FieldExtractionResult>();
    
    for (const fieldName of fullConfig.fields) {
      try {
        const result = await this.extractField(tabId, fieldName, fullConfig);
        fieldResults.set(fieldName, result);
        
        if (result.success) {
          this.log(`✅ Successfully extracted ${fieldName}: ${result.content.length} chars`);
        } else {
          this.log(`❌ Failed to extract ${fieldName}: ${result.errorMessage}`);
        }
      } catch (error) {
        this.log(`❌ Exception extracting ${fieldName}:`, error);
        fieldResults.set(fieldName, {
          fieldName,
          content: '',
          extractionTime: 0,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          quality: this.createEmptyQualityReport(),
          fallbackUsed: false,
          selectorUsed: 'none'
        });
      }
    }

    // Compile results
    const extractedData: ExtractedData = {
      background: fieldResults.get('background')?.content || '',
      investigations: fieldResults.get('investigations')?.content || '',
      medications: fieldResults.get('medications')?.content || '',
      extractionTimestamp: Date.now(),
      extractionAttempts: 1,
      qualityScore: this.calculateOverallQualityScore(fieldResults)
    };

    // Post-extraction validation and quality assessment
    const qualityReport = this.assessDataQuality(extractedData);
    
    this.log(`📊 Data quality assessment:`, {
      completeness: qualityReport.completenessScore,
      richness: qualityReport.contentRichness,
      confidence: qualityReport.confidenceLevel,
      medicalTerms: qualityReport.medicalTermsFound
    });

    // Check if quality meets thresholds
    if (qualityReport.completenessScore < fullConfig.qualityThresholds.minCompletenessScore) {
      this.log(`⚠️ Low quality data detected, attempting fallback extraction`);
      
      // Attempt fallback extraction for failed/low-quality fields
      const improvedData = await this.attemptFallbackExtraction(
        tabId, 
        extractedData, 
        fieldResults, 
        fullConfig
      );
      
      if (improvedData) {
        return improvedData;
      }
    }

    const totalTime = Date.now() - startTime;
    this.log(`✅ Data extraction completed in ${totalTime}ms`);

    return extractedData;
  }

  /**
   * Assess data quality with comprehensive metrics
   */
  public assessDataQuality(data: ExtractedData): DataQualityReport {
    const fields = ['background', 'investigations', 'medications'];
    let totalFields = fields.length;
    let populatedFields = 0;
    let totalWordCount = 0;
    let totalMedicalTerms = 0;
    const missingFields: string[] = [];
    const extractionWarnings: string[] = [];

    for (const field of fields) {
      const content = data[field as keyof ExtractedData] as string;
      
      if (this.isContentMeaningful(content)) {
        populatedFields++;
        const wordCount = this.countWords(content);
        const medicalTerms = this.countMedicalTerms(content);
        
        totalWordCount += wordCount;
        totalMedicalTerms += medicalTerms;

        // Check for common issues
        if (this.containsErrorPatterns(content)) {
          extractionWarnings.push(`${field} contains potential error text`);
        }
        
        if (wordCount < 5) {
          extractionWarnings.push(`${field} has very little content (${wordCount} words)`);
        }
      } else {
        missingFields.push(field);
      }
    }

    const completenessScore = populatedFields / totalFields;
    const avgWordsPerField = populatedFields > 0 ? totalWordCount / populatedFields : 0;
    
    // Calculate content richness based on word count and medical terminology
    const contentRichness = Math.min(1.0, (avgWordsPerField / 50) * 0.7 + (totalMedicalTerms / 10) * 0.3);
    
    // Determine confidence level
    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
    if (completenessScore >= 0.8 && contentRichness >= 0.6 && totalMedicalTerms >= 3) {
      confidenceLevel = 'high';
    } else if (completenessScore >= 0.5 && contentRichness >= 0.3 && totalMedicalTerms >= 1) {
      confidenceLevel = 'medium';
    }

    return {
      completenessScore,
      contentRichness,
      confidenceLevel,
      missingFields,
      extractionWarnings,
      medicalTermsFound: totalMedicalTerms,
      estimatedWordCount: totalWordCount
    };
  }

  /**
   * Verify patient identity before extraction
   */
  public async verifyPatientIdentity(
    tabId: number,
    expectedPatient: PatientAppointment
  ): Promise<ValidationResult> {
    try {
      const response = await this.sendMessage(tabId, {
        type: 'VERIFY_PATIENT_IDENTITY',
        data: {
          expectedName: expectedPatient.name,
          expectedFileNumber: expectedPatient.fileNumber,
          expectedDOB: expectedPatient.dob
        }
      });

      if (response?.verified === true) {
        return {
          isValid: true,
          errors: [],
          warnings: [],
          score: 1.0
        };
      } else {
        const errors = [
          `Patient identity mismatch. Expected: ${expectedPatient.name} (${expectedPatient.fileNumber})`
        ];
        
        if (response?.currentPatient) {
          errors.push(`Current patient: ${response.currentPatient.name} (${response.currentPatient.fileNumber})`);
        }

        return {
          isValid: false,
          errors,
          warnings: response?.warnings || [],
          score: 0.0
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to verify patient identity: ${error}`],
        warnings: [],
        score: 0.0
      };
    }
  }

  /**
   * Extract field with fallback strategies
   */
  private async extractField(
    tabId: number,
    fieldName: string,
    config: ExtractionConfig
  ): Promise<FieldExtractionResult> {
    const startTime = Date.now();
    const selectors = config.fallbackSelectors[fieldName] || [];
    
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      const isFirstAttempt = i === 0;
      
      try {
        this.log(`🔍 Extracting ${fieldName} with selector: ${selector} (attempt ${i + 1})`);
        
        const response = await this.sendMessage(tabId, {
          type: 'EXTRACT_FIELD_DATA',
          data: {
            fieldName,
            selector,
            timeout: config.timeout / selectors.length
          }
        });

        if (response?.success && response?.content) {
          const content = this.sanitizeContent(response.content);
          const quality = this.assessFieldQuality(fieldName, content);
          
          return {
            fieldName,
            content,
            extractionTime: Date.now() - startTime,
            success: true,
            quality,
            fallbackUsed: !isFirstAttempt,
            selectorUsed: selector
          };
        }
        
      } catch (error) {
        this.log(`❌ Extraction attempt ${i + 1} failed for ${fieldName}:`, error);
        
        // Continue to next selector unless it's the last one
        if (i < selectors.length - 1) {
          continue;
        }
        
        // Last attempt failed
        return {
          fieldName,
          content: '',
          extractionTime: Date.now() - startTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          quality: this.createEmptyQualityReport(),
          fallbackUsed: !isFirstAttempt,
          selectorUsed: selector
        };
      }
    }

    // No selectors worked
    return {
      fieldName,
      content: '',
      extractionTime: Date.now() - startTime,
      success: false,
      errorMessage: 'All selectors failed',
      quality: this.createEmptyQualityReport(),
      fallbackUsed: true,
      selectorUsed: 'none'
    };
  }

  /**
   * Pre-extraction validation checks
   */
  private async preExtractionValidation(
    tabId: number,
    patient: PatientAppointment
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if we're on the correct patient
      const identityCheck = await this.verifyPatientIdentity(tabId, patient);
      if (!identityCheck.isValid) {
        errors.push(...identityCheck.errors);
      }
      warnings.push(...identityCheck.warnings);

      // Check if page has required elements
      const pageCheck = await this.sendMessage(tabId, {
        type: 'CHECK_PAGE_READY_FOR_EXTRACTION'
      });

      if (!pageCheck?.ready) {
        errors.push('Page not ready for data extraction');
        if (pageCheck?.reason) {
          errors.push(`Reason: ${pageCheck.reason}`);
        }
      }

      // Check if required clinical sections exist
      const sectionsCheck = await this.sendMessage(tabId, {
        type: 'CHECK_CLINICAL_SECTIONS_EXIST'
      });

      if (!sectionsCheck?.allSectionsFound) {
        warnings.push('Some clinical sections may not be available');
        if (sectionsCheck?.missingSections) {
          warnings.push(`Missing: ${sectionsCheck.missingSections.join(', ')}`);
        }
      }

    } catch (error) {
      errors.push(`Pre-extraction validation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : 0.0
    };
  }

  /**
   * Attempt fallback extraction for failed fields
   */
  private async attemptFallbackExtraction(
    tabId: number,
    originalData: ExtractedData,
    fieldResults: Map<string, FieldExtractionResult>,
    config: ExtractionConfig
  ): Promise<ExtractedData | null> {
    this.log('🔄 Attempting fallback extraction strategies');

    // Identify fields that need improvement
    const fieldsToRetry: string[] = [];
    for (const [fieldName, result] of fieldResults) {
      if (!result.success || result.quality.completenessScore < 0.5) {
        fieldsToRetry.push(fieldName);
      }
    }

    if (fieldsToRetry.length === 0) {
      return null;
    }

    // Try alternative extraction methods
    const improvedData = { ...originalData };
    let anyImprovement = false;

    for (const fieldName of fieldsToRetry) {
      try {
        // Try OCR-based extraction if available
        const ocrResult = await this.tryOCRExtraction(tabId, fieldName);
        if (ocrResult && this.isContentMeaningful(ocrResult) && (fieldName === 'background' || fieldName === 'investigations' || fieldName === 'medications')) {
          (improvedData as any)[fieldName] = ocrResult;
          anyImprovement = true;
          this.log(`✅ OCR extraction successful for ${fieldName}`);
          continue;
        }

        // Try semantic extraction (look for content near labels)
        const semanticResult = await this.trySemanticExtraction(tabId, fieldName);
        if (semanticResult && this.isContentMeaningful(semanticResult) && (fieldName === 'background' || fieldName === 'investigations' || fieldName === 'medications')) {
          (improvedData as any)[fieldName] = semanticResult;
          anyImprovement = true;
          this.log(`✅ Semantic extraction successful for ${fieldName}`);
          continue;
        }

      } catch (error) {
        this.log(`❌ Fallback extraction failed for ${fieldName}:`, error);
      }
    }

    if (anyImprovement) {
      improvedData.extractionAttempts++;
      improvedData.qualityScore = this.calculateOverallQualityScore(
        new Map([['improved', { 
          fieldName: 'improved',
          content: JSON.stringify(improvedData),
          extractionTime: 0,
          success: true,
          quality: this.assessDataQuality(improvedData),
          fallbackUsed: true,
          selectorUsed: 'fallback'
        }]])
      );
      return improvedData;
    }

    return null;
  }

  /**
   * Try OCR-based extraction for difficult fields
   */
  private async tryOCRExtraction(tabId: number, fieldName: string): Promise<string | null> {
    try {
      const response = await this.sendMessage(tabId, {
        type: 'EXTRACT_FIELD_OCR',
        data: { fieldName }
      });
      
      return response?.content || null;
    } catch {
      return null;
    }
  }

  /**
   * Try semantic extraction based on proximity to labels
   */
  private async trySemanticExtraction(tabId: number, fieldName: string): Promise<string | null> {
    try {
      const response = await this.sendMessage(tabId, {
        type: 'EXTRACT_FIELD_SEMANTIC',
        data: { fieldName }
      });
      
      return response?.content || null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Content Analysis Methods
  // ============================================================================

  private isContentMeaningful(content: string): boolean {
    if (!content || typeof content !== 'string') return false;
    
    const trimmed = content.trim();
    if (trimmed.length < 3) return false;
    
    // Check for common "empty" patterns
    const emptyPatterns = [
      /^(\s*|-|n\/a|none|nil|not?\s*applicable?)$/i,
      /^\s*\[.*extraction.*failed.*\]\s*$/i,
      /^\s*loading\.+\s*$/i,
      /^\s*please\s+wait\.+\s*$/i
    ];
    
    return !emptyPatterns.some(pattern => pattern.test(trimmed));
  }

  private countWords(content: string): number {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private countMedicalTerms(content: string): number {
    if (!content) return 0;
    
    let count = 0;
    for (const pattern of this.medicalTermPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }

  private containsErrorPatterns(content: string): boolean {
    return this.commonErrorPatterns.some(pattern => pattern.test(content));
  }

  private sanitizeContent(content: string): string {
    if (!content) return '';
    
    return content
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }

  private assessFieldQuality(fieldName: string, content: string): DataQualityReport {
    const wordCount = this.countWords(content);
    const medicalTerms = this.countMedicalTerms(content);
    const hasContent = this.isContentMeaningful(content);
    
    const completenessScore = hasContent ? 1.0 : 0.0;
    const contentRichness = Math.min(1.0, wordCount / 20);
    
    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
    if (completenessScore === 1.0 && wordCount >= 10 && medicalTerms >= 1) {
      confidenceLevel = 'high';
    } else if (completenessScore === 1.0 && wordCount >= 5) {
      confidenceLevel = 'medium';
    }

    return {
      completenessScore,
      contentRichness,
      confidenceLevel,
      missingFields: hasContent ? [] : [fieldName],
      extractionWarnings: this.containsErrorPatterns(content) ? ['Contains error patterns'] : [],
      medicalTermsFound: medicalTerms,
      estimatedWordCount: wordCount
    };
  }

  private createEmptyQualityReport(): DataQualityReport {
    return {
      completenessScore: 0,
      contentRichness: 0,
      confidenceLevel: 'low',
      missingFields: [],
      extractionWarnings: [],
      medicalTermsFound: 0,
      estimatedWordCount: 0
    };
  }

  private calculateOverallQualityScore(fieldResults: Map<string, FieldExtractionResult>): number {
    const results = Array.from(fieldResults.values());
    if (results.length === 0) return 0;
    
    const avgCompleteness = results.reduce((sum, r) => sum + r.quality.completenessScore, 0) / results.length;
    const avgRichness = results.reduce((sum, r) => sum + r.quality.contentRichness, 0) / results.length;
    const successRate = results.filter(r => r.success).length / results.length;
    
    return (avgCompleteness * 0.4 + avgRichness * 0.3 + successRate * 0.3);
  }

  // ============================================================================
  // Pattern Initialization
  // ============================================================================

  private initializeMedicalPatterns(): void {
    this.medicalTermPatterns = [
      // Common medical terminology
      /\b(?:diagnosis|treatment|medication|prescription|symptom|condition|disease|disorder|syndrome)\b/gi,
      // Medical measurements and units
      /\b\d+\s*(?:mg|mcg|g|ml|cc|units?|mmHg|bpm|kg|lbs?)\b/gi,
      // Common procedures
      /\b(?:angiogram|angioplasty|stent|bypass|catheter|biopsy|surgery|procedure)\b/gi,
      // Clinical findings
      /\b(?:abnormal|normal|elevated|decreased|hypertension|diabetes|coronary|cardiac|pulmonary)\b/gi,
      // Australian medical terminology
      /\b(?:paracetamol|lignocaine|adrenaline|salbutamol|glyceryl trinitrate)\b/gi
    ];
  }

  private initializeErrorPatterns(): void {
    this.commonErrorPatterns = [
      /error|failed|timeout|exception|null|undefined/gi,
      /loading\.+|please\s+wait\.+/gi,
      /access\s+denied|permission\s+denied/gi,
      /not\s+found|404|500|503/gi
    ];
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private async sendMessage(
    tabId: number,
    message: BatchProcessingMessage,
    timeoutMs = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(`Message failed: ${chrome.runtime.lastError.message}`));
            return;
          }

          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[DataValidation]', ...args);
    }
  }

  // ============================================================================
  // Public Configuration Methods
  // ============================================================================

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public updateConfig(config: Partial<ExtractionConfig>): void {
    Object.assign(this.defaultConfig, config);
  }

  public getConfig(): ExtractionConfig {
    return { ...this.defaultConfig };
  }
}