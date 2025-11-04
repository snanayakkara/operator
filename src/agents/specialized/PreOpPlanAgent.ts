import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { PRE_OP_PLAN_SYSTEM_PROMPTS } from './PreOpPlanSystemPrompt';
import type {
  MedicalContext,
  MedicalReport,
  ReportSection,
  ChatMessage,
  PreOpProcedureType,
  PreOpPlanReport,
  PreOpExtractedData,
  PreOpPlanJSON,
  ValidationResult,
  FieldCorrection
} from '@/types/medical.types';
import { logger } from '@/utils/Logger';

/**
 * Pre-Op Plan Agent
 *
 * Generates A5 pre-procedure summary cards for cath lab procedures.
 * Detects procedure type from dictation and outputs dual format:
 * 1. Markdown card (A5-optimized, ≤18 lines)
 * 2. Structured JSON metadata
 *
 * Supports: ANGIOGRAM_OR_PCI, RIGHT_HEART_CATH, TAVI, MITRAL_TEER
 */
export class PreOpPlanAgent extends MedicalAgent {
  protected lmStudioService: LMStudioService;

  constructor() {
    super(
      'Pre-Op Plan Agent',
      'Cath Lab Procedure Planning',
      'Generates A5 pre-procedure summary cards for angiogram, RHC, TAVI, and mTEER procedures',
      'pre-op-plan',
      PRE_OP_PLAN_SYSTEM_PROMPTS.primary
    );

    this.lmStudioService = LMStudioService.getInstance();
    logger.info('PreOpPlanAgent initialized');
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    logger.info('PreOpPlanAgent: Starting processing with validation workflow', {
      inputLength: input.length,
      sessionId: context?.sessionId,
      hasUserProvidedFields: !!context?.userProvidedFields
    });

    try {
      // STEP 1: Detect procedure type from input
      const procedureType = this.detectProcedureType(input);
      logger.info('PreOpPlanAgent: Detected procedure type', { procedureType });

      // STEP 2: Regex extraction
      logger.info('PreOpPlanAgent: Extracting fields with regex...');
      const extracted = this.extractPreOpFields(input, procedureType);
      const extractedFieldCount = Object.values(extracted).filter(v => v !== undefined && v !== null).length;
      logger.info('PreOpPlanAgent: Regex extraction complete', { extractedFieldCount });

      // STEP 3: Quick model validation
      logger.info('PreOpPlanAgent: Starting validation phase...');
      const validation = await this.validateAndDetectGaps(extracted, input);

      // STEP 4: Apply high-confidence corrections automatically
      logger.info('PreOpPlanAgent: Applying high-confidence corrections...');
      const correctedData = this.applyCorrections(extracted, validation.corrections, 0.8);

      // STEP 5: Check for critical gaps - INTERACTIVE CHECKPOINT
      const hasCriticalGaps = validation.missingCritical.some(field => field.critical === true);
      const hasLowConfidenceCorrections = validation.corrections.some(c => c.confidence < 0.8);

      if (hasCriticalGaps || hasLowConfidenceCorrections) {
        const criticalCount = validation.missingCritical.filter(f => f.critical === true).length;
        const lowConfCount = validation.corrections.filter(c => c.confidence < 0.8).length;

        logger.info('PreOpPlanAgent: Validation requires user input', {
          criticalCount,
          lowConfCount,
          totalMissing: validation.missingCritical.length
        });

        // Return incomplete report with validation state
        // UI will show validation modal and re-run process() with user input
        const baseReport = this.createReport('', [], context, 0, 0);
        const incompleteReport: PreOpPlanReport = {
          ...baseReport,
          status: 'awaiting_validation',
          validationResult: validation,
          extractedData: correctedData,
          planData: {
            procedureType,
            cardMarkdown: '',
            jsonData: this.convertToJSON(correctedData),
            completenessScore: '0% (awaiting validation)'
          }
        };

        return incompleteReport;
      }

      // STEP 6: Merge user input if provided (reprocessing after validation)
      let finalData = correctedData;
      if (context?.userProvidedFields) {
        logger.info('PreOpPlanAgent: Merging user-provided fields...', {
          fieldCount: Object.keys(context.userProvidedFields).length
        });
        finalData = this.mergeUserInput(correctedData, context.userProvidedFields);
      }

      // STEP 7: Convert to JSON format
      const jsonData = this.convertToJSON(finalData);
      logger.info('PreOpPlanAgent: Converted to JSON format', {
        fieldCount: Object.keys(jsonData.fields).length
      });

      // STEP 8: Generate card markdown with reasoning model (ONLY after validation passes)
      logger.info('PreOpPlanAgent: Generating card with reasoning model...');
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        `DICTATION\n${input.trim()}`,
        this.agentType,
        undefined,
        MODEL_CONFIG.REASONING_MODEL
      );

      logger.info('PreOpPlanAgent: Received LLM response', {
        responseLength: response.length
      });

      // Parse the response into card and JSON
      const { cardMarkdown } = this.parsePreOpResponse(response);

      // Create report sections
      const sections: ReportSection[] = [
        {
          title: 'Pre-Op Summary Card',
          content: cardMarkdown,
          type: 'narrative',
          priority: 'high'
        },
        {
          title: 'Structured Data',
          content: JSON.stringify(jsonData, null, 2),
          type: 'structured',
          priority: 'medium'
        }
      ];

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Create the medical report
      const report = this.createReport(
        cardMarkdown,
        sections,
        context,
        processingTime,
        validation.confidence, // Use validation confidence
        [],
        []
      ) as PreOpPlanReport;

      // Add Pre-Op Plan specific data
      report.status = 'complete';
      report.planData = {
        procedureType,
        cardMarkdown,
        jsonData,
        completenessScore: this.calculateCompleteness(jsonData)
      };

      logger.info('PreOpPlanAgent: Processing completed', {
        processingTime,
        procedureType,
        completenessScore: report.planData.completenessScore,
        validationConfidence: validation.confidence
      });

      return report;

    } catch (error) {
      logger.error('PreOpPlanAgent: Processing failed', {
        error: error instanceof Error ? error.message : String(error),
        inputLength: input.length
      });

      // Return error report
      const processingTime = Date.now() - startTime;
      return this.createReport(
        'Failed to generate pre-op plan',
        [],
        context,
        processingTime,
        0.0,
        [],
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: `DICTATION\n${input.trim()}`
      }
    ];
  }

  protected parseResponse(_response: string, _context?: MedicalContext): ReportSection[] {
    // This is handled by parsePreOpResponse for this agent
    return [];
  }

  /**
   * Parse LLM response into card markdown and JSON data
   */
  private parsePreOpResponse(response: string): {
    cardMarkdown: string;
    jsonData: any;
    procedureType: PreOpProcedureType;
  } {
    try {
      logger.info('PreOpPlanAgent: Parsing response', {
        responseLength: response.length,
        hasCardMarker: response.includes('CARD:'),
        hasJsonMarker: response.includes('JSON:')
      });

      // Extract CARD section (everything between "CARD:" and "JSON:" markers)
      const cardMatch = response.match(/CARD:\s*\n([\s\S]*?)(?=\n\s*JSON:|$)/i);
      let cardMarkdown = '';

      if (cardMatch) {
        // Successfully extracted card content between markers
        cardMarkdown = cardMatch[1].trim();
      } else if (response.indexOf('JSON:') > 0) {
        // Fallback: extract everything before JSON: marker (and strip CARD: if present)
        const beforeJson = response.substring(0, response.indexOf('JSON:')).trim();
        cardMarkdown = beforeJson.replace(/^CARD:\s*/i, '').trim();
      } else {
        // No JSON marker found, assume entire response is card content
        cardMarkdown = response.replace(/^CARD:\s*/i, '').trim();
      }

      // Extract JSON section (with or without code fences)
      const jsonMatch = response.match(/JSON:\s*\n```json\s*\n([\s\S]*?)\n```/i) ||
                       response.match(/JSON:\s*\n([\s\S]+?)(?=\n\s*$)/i) ||
                       response.match(/```json\s*\n([\s\S]*?)\n```/i);

      let jsonData: any;
      let procedureType: PreOpProcedureType = 'ANGIOGRAM_OR_PCI'; // Default

      if (jsonMatch) {
        try {
          const jsonString = jsonMatch[1].trim();
          jsonData = JSON.parse(jsonString);
          procedureType = jsonData.procedure_type || procedureType;

          logger.info('PreOpPlanAgent: Successfully parsed JSON', {
            procedureType,
            fieldCount: Object.keys(jsonData.fields || {}).length
          });
        } catch (parseError) {
          logger.warn('PreOpPlanAgent: JSON parsing failed, using default structure', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            jsonString: jsonMatch[1].substring(0, 200) // Log first 200 chars for debugging
          });
          // Fallback JSON structure
          jsonData = {
            procedure_type: procedureType,
            fields: {
              procedure: 'Not specified',
              indication: 'Not specified',
              parsing_error: 'Failed to parse LLM response'
            }
          };
        }
      } else {
        logger.warn('PreOpPlanAgent: No JSON found in response');
        jsonData = {
          procedure_type: procedureType,
          fields: {
            procedure: 'Not specified',
            indication: 'Not specified',
            parsing_error: 'No JSON section found'
          }
        };
      }

      logger.info('PreOpPlanAgent: Parsing complete', {
        cardLength: cardMarkdown.length,
        hasJsonData: !!jsonData,
        procedureType
      });

      return {
        cardMarkdown,
        jsonData,
        procedureType
      };

    } catch (error) {
      logger.error('PreOpPlanAgent: Response parsing failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return error structure
      return {
        cardMarkdown: '# Error\nFailed to parse response',
        jsonData: {
          procedure_type: 'ANGIOGRAM_OR_PCI',
          fields: {
            error: 'Parsing failed'
          }
        },
        procedureType: 'ANGIOGRAM_OR_PCI'
      };
    }
  }

  /**
   * Calculate completeness score based on required fields
   */
  private calculateCompleteness(jsonData: any): string {
    const requiredFieldsByType: Record<PreOpProcedureType, string[]> = {
      'ANGIOGRAM_OR_PCI': [
        'procedure', 'indication', 'primary_access', 'sheath_size_fr',
        'catheters', 'allergies', 'nok_name'
      ],
      'RIGHT_HEART_CATH': [
        'procedure', 'indication', 'access_site', 'sheath_size_fr',
        'catheters', 'co_measurement', 'blood_gas_samples', 'nok_name'
      ],
      'TAVI': [
        'procedure', 'indication', 'primary_access', 'secondary_access',
        'valve_type_size', 'wire', 'pacing_wire_access', 'closure_plan',
        'protamine', 'goals_of_care', 'nok_name'
      ],
      'MITRAL_TEER': [
        'procedure', 'indication', 'access_site', 'transeptal_catheter',
        'wire', 'closure_plan', 'echo_summary', 'nok_name'
      ]
    };

    const procedureType = jsonData.procedure_type as PreOpProcedureType;
    const requiredFields = requiredFieldsByType[procedureType] || [];
    const fields = jsonData.fields || {};

    let presentCount = 0;
    for (const field of requiredFields) {
      const value = fields[field];
      if (value && value !== 'Not specified' && value !== '') {
        presentCount++;
      }
    }

    const percentage = requiredFields.length > 0
      ? Math.round((presentCount / requiredFields.length) * 100)
      : 100;

    return `${percentage}% (${presentCount}/${requiredFields.length} required fields)`;
  }

  /**
   * Detect procedure type from dictation text (helper method)
   */
  private detectProcedureType(input: string): PreOpProcedureType {
    const lowerInput = input.toLowerCase();

    // TAVI keywords
    if (lowerInput.includes('tavi') ||
        lowerInput.includes('transcatheter aortic') ||
        lowerInput.includes('tavr') ||
        (lowerInput.includes('valve') && lowerInput.includes('aortic'))) {
      return 'TAVI';
    }

    // mTEER keywords
    if (lowerInput.includes('mteer') ||
        lowerInput.includes('mitraclip') ||
        lowerInput.includes('edge-to-edge') ||
        lowerInput.includes('teer')) {
      return 'MITRAL_TEER';
    }

    // Right Heart Cath keywords
    if (lowerInput.includes('right heart') ||
        lowerInput.includes('rhc') ||
        lowerInput.includes('swan-ganz') ||
        lowerInput.includes('cardiac output')) {
      return 'RIGHT_HEART_CATH';
    }

    // Default to angiogram/PCI
    return 'ANGIOGRAM_OR_PCI';
  }

  // ============================================================================
  // VALIDATION WORKFLOW METHODS (Regex → Quick Model → Checkpoint → Reasoning)
  // ============================================================================

  /**
   * Extract Pre-Op fields from dictation using regex patterns
   * Step 1 of validation workflow
   */
  private extractPreOpFields(input: string, procedureType: PreOpProcedureType): PreOpExtractedData {

    // Core procedure fields (all types)
    const procedureMatch = input.match(/(?:procedure|operation|intervention)[:;\s]+([^\n.,]+)/i);
    const indicationMatch = input.match(/(?:indication|for)[:;\s]+([^\n.,]+)/i);

    // Access fields
    const primaryAccessMatch = input.match(/(?:primary\s+)?access(?:\s+site)?[:;\s]+(?:right\s+|left\s+)?(radial|femoral|brachial)(?:\s+artery)?/i);
    const accessSiteMatch = input.match(/access(?:\s+site)?[:;\s]+(?:right\s+|left\s+)?(basilic|jugular|femoral)(?:\s+vein(?:ous)?)?/i);
    const sheathMatch = input.match(/(\d+)\s*(?:fr|french|f)\s*sheath/i);

    // Equipment
    const cathetersMatch = input.match(/cath(?:eter)?s?[:;\s]+([^\n.,]+)/i);
    const valveMatch = input.match(/valve(?:\s+type)?[:;\s]+([^\n.,]+)/i);
    const wireMatch = input.match(/wire[:;\s]+([^\n.,]+)/i);
    const balloonMatch = input.match(/balloon(?:\s+size)?[:;\s]+(\d+)\s*mm/i);
    const transeptalMatch = input.match(/transeptal(?:\s+catheter)?[:;\s]+([^\n.,]+)/i);

    // Safety & Planning
    const closureMatch = input.match(/closure(?:\s+plan)?[:;\s]+([^\n.,]+)/i);
    const pacingMatch = input.match(/pacing(?:\s+wire)?(?:\s+access)?[:;\s]+([^\n.,]+)/i);
    const protamineMatch = input.match(/protamine[:;\s]+([^\n.,]+)/i);
    const goalsMatch = input.match(/goals(?:\s+of\s+care)?[:;\s]+([^\n.,]+)/i);

    // Clinical Info
    const anticoagMatch = input.match(/(?:anticoagulation|antiplatelet|antithrombotic)(?:\s+plan)?[:;\s]+([^\n.,]+)/i);
    const sedationMatch = input.match(/sedation(?:\s+plan)?[:;\s]+([^\n.,]+)/i);
    const sitePrepMatch = input.match(/(?:site\s+)?prep(?:aration)?[:;\s]+([^\n.,]+)/i);
    const allergiesMatch = input.match(/allerg(?:y|ies)[:;\s]+([^\n.,]+)/i);
    const coMeasurementMatch = input.match(/(?:cardiac\s+output|co)(?:\s+measurement)?[:;\s]+([^\n.,]+)/i);
    const bloodGasMatch = input.match(/(\d+)\s*blood\s*gas\s*sample/i);
    const echoMatch = input.match(/echo(?:\s+summary)?[:;\s]+([^\n.,]+)/i);

    // Labs
    const hbMatch = input.match(/(?:hb|h(?:ae)?moglobin)[:;\s]+(\d+)/i);
    const creatMatch = input.match(/creat(?:inine)?[:;\s]+(\d+)/i);

    // Next of Kin
    const nokNameMatch = input.match(/(?:next\s+of\s+kin|nok)[:;\s]+([A-Za-z\s]+?)(?:,|\s+\()/i);
    const nokRelMatch = input.match(/(?:next\s+of\s+kin|nok).*?\(([^)]+)\)/i);
    const nokPhoneMatch = input.match(/(\d{4}\s?\d{3}\s?\d{3}|\d{10})/);

    return {
      procedureType,
      procedure: procedureMatch?.[1]?.trim(),
      indication: indicationMatch?.[1]?.trim(),
      primaryAccess: primaryAccessMatch ? this.normalizeAccessSite(primaryAccessMatch[1]) : undefined,
      accessSite: accessSiteMatch ? this.normalizeAccessSite(accessSiteMatch[1]) : undefined,
      sheathSizeFr: sheathMatch ? parseInt(sheathMatch[1]) : undefined,
      catheters: cathetersMatch?.[1] ? cathetersMatch[1].split(/,\s*/) : undefined,
      valveTypeSize: valveMatch?.[1]?.trim(),
      wire: wireMatch?.[1]?.trim(),
      balloonSizeMm: balloonMatch ? parseInt(balloonMatch[1]) : undefined,
      transeptalCatheter: transeptalMatch?.[1]?.trim(),
      closurePlan: closureMatch?.[1]?.trim(),
      pacingWireAccess: pacingMatch?.[1]?.trim(),
      protamine: protamineMatch?.[1]?.trim(),
      goalsOfCare: goalsMatch?.[1]?.trim(),
      anticoagulationPlan: anticoagMatch?.[1]?.trim(),
      sedation: sedationMatch?.[1]?.trim(),
      sitePrep: sitePrepMatch?.[1]?.trim(),
      allergies: allergiesMatch?.[1]?.trim(),
      coMeasurement: coMeasurementMatch?.[1]?.trim(),
      bloodGasSamples: bloodGasMatch ? parseInt(bloodGasMatch[1]) : undefined,
      echoSummary: echoMatch?.[1]?.trim(),
      recentLabs: (hbMatch || creatMatch) ? {
        hb_g_per_l: hbMatch ? parseInt(hbMatch[1]) : undefined,
        creatinine_umol_per_l: creatMatch ? parseInt(creatMatch[1]) : undefined
      } : undefined,
      nokName: nokNameMatch?.[1]?.trim(),
      nokRelationship: nokRelMatch?.[1]?.trim(),
      nokPhone: nokPhoneMatch?.[0]?.trim()
    };
  }

  /**
   * Normalize access site terminology
   */
  private normalizeAccessSite(site: string): string {
    const lower = site.toLowerCase();
    if (lower.includes('radial')) return 'Right radial';
    if (lower.includes('femoral')) return 'Right femoral';
    if (lower.includes('basilic')) return 'Right basilic';
    if (lower.includes('jugular')) return 'Right internal jugular';
    if (lower.includes('brachial')) return 'Right brachial';
    return site.charAt(0).toUpperCase() + site.slice(1).toLowerCase();
  }

  /**
   * Validate regex-extracted data using quick model and detect gaps
   * Step 2 of validation workflow
   */
  private async validateAndDetectGaps(
    extracted: PreOpExtractedData,
    transcription: string
  ): Promise<ValidationResult> {
    logger.info('PreOpPlanAgent: Starting quick model validation...', {
      procedureType: extracted.procedureType,
      extractedFieldCount: Object.values(extracted).filter(v => v !== undefined && v !== null).length
    });

    try {
      // Call quick model for validation
      const userMessage = `REGEX EXTRACTED:\n${JSON.stringify(extracted, null, 2)}\n\nTRANSCRIPTION:\n${transcription}\n\nValidate the extraction and output JSON only.`;

      const response = await this.lmStudioService.processWithAgent(
        PRE_OP_PLAN_SYSTEM_PROMPTS.dataValidationPrompt,
        userMessage,
        'pre-op-plan-validation', // agentType
        undefined, // signal
        MODEL_CONFIG.QUICK_MODEL // modelOverride
      );

      // Parse validation result - handle potential markdown code fences
      let validationResult: ValidationResult;

      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;

      try {
        validationResult = JSON.parse(jsonString);
        logger.info('PreOpPlanAgent: Validation complete', {
          corrections: validationResult.corrections.length,
          missingCritical: validationResult.missingCritical.length
        });
      } catch (parseError) {
        logger.error('PreOpPlanAgent: Failed to parse validation JSON', {
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });

        // Fallback: return empty validation (proceed with regex data as-is)
        validationResult = {
          corrections: [],
          missingCritical: [],
          missingOptional: [],
          confidence: 0.5 // Low confidence due to parse error
        };
      }

      return validationResult;

    } catch (error) {
      logger.error('PreOpPlanAgent: Validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return empty validation on error
      return {
        corrections: [],
        missingCritical: [],
        missingOptional: [],
        confidence: 0.0 // No confidence due to validation error
      };
    }
  }

  /**
   * Apply high-confidence corrections to extracted data
   * Step 3 of validation workflow
   */
  private applyCorrections(
    extracted: PreOpExtractedData,
    corrections: FieldCorrection[],
    threshold: number
  ): PreOpExtractedData {
    const corrected = { ...extracted };

    for (const correction of corrections) {
      if (correction.confidence >= threshold) {
        // Apply high-confidence correction automatically
        this.setNestedField(corrected, correction.field, correction.correctValue);
        logger.info('PreOpPlanAgent: Auto-applied correction', {
          field: correction.field,
          value: correction.correctValue,
          confidence: correction.confidence
        });
      }
    }

    return corrected;
  }

  /**
   * Merge user-provided fields from validation modal
   * Step 4 of validation workflow (reprocessing)
   */
  private mergeUserInput(
    extracted: PreOpExtractedData,
    userFields: Record<string, any>
  ): PreOpExtractedData {
    const merged = { ...extracted };

    for (const [path, value] of Object.entries(userFields)) {
      this.setNestedField(merged, path, value);
      logger.info('PreOpPlanAgent: Merged user input', {
        field: path,
        value
      });
    }

    return merged;
  }

  /**
   * Convert PreOpExtractedData to PreOpPlanJSON format
   */
  private convertToJSON(extracted: PreOpExtractedData): PreOpPlanJSON {
    const fields: Record<string, any> = {};

    // Map camelCase to snake_case and filter undefined
    if (extracted.procedure) fields.procedure = extracted.procedure;
    if (extracted.indication) fields.indication = extracted.indication;
    if (extracted.primaryAccess) fields.primary_access = extracted.primaryAccess;
    if (extracted.accessSite) fields.access_site = extracted.accessSite;
    if (extracted.sheathSizeFr) fields.sheath_size_fr = extracted.sheathSizeFr;
    if (extracted.catheters) fields.catheters = extracted.catheters;
    if (extracted.valveTypeSize) fields.valve_type_size = extracted.valveTypeSize;
    if (extracted.wire) fields.wire = extracted.wire;
    if (extracted.balloonSizeMm) fields.balloon_size_mm = extracted.balloonSizeMm;
    if (extracted.transeptalCatheter) fields.transeptal_catheter = extracted.transeptalCatheter;
    if (extracted.closurePlan) fields.closure_plan = extracted.closurePlan;
    if (extracted.pacingWireAccess) fields.pacing_wire_access = extracted.pacingWireAccess;
    if (extracted.protamine) fields.protamine = extracted.protamine;
    if (extracted.goalsOfCare) fields.goals_of_care = extracted.goalsOfCare;
    if (extracted.anticoagulationPlan) fields.anticoagulation_plan = extracted.anticoagulationPlan;
    if (extracted.sedation) fields.sedation = extracted.sedation;
    if (extracted.sitePrep) fields.site_prep = extracted.sitePrep;
    if (extracted.allergies) fields.allergies = extracted.allergies;
    if (extracted.coMeasurement) fields.co_measurement = extracted.coMeasurement;
    if (extracted.bloodGasSamples) fields.blood_gas_samples = extracted.bloodGasSamples;
    if (extracted.echoSummary) fields.echo_summary = extracted.echoSummary;
    if (extracted.recentLabs) fields.recent_labs = extracted.recentLabs;
    if (extracted.nokName) fields.nok_name = extracted.nokName;
    if (extracted.nokRelationship) fields.nok_relationship = extracted.nokRelationship;
    if (extracted.nokPhone) fields.nok_phone = extracted.nokPhone;

    return {
      procedure_type: extracted.procedureType,
      fields
    };
  }

  /**
   * Set a nested field value using dot notation
   */
  private setNestedField(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private normalizeContent(content?: ChatMessage['content']): string {
    if (!content) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    return content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('\n');
  }
}
