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
      // Progress callback helper
      const reportProgress = (progress: number, details: string) => {
        context?.onProgress?.('ai-analysis', progress, details);
      };

      reportProgress(5, 'Analyzing procedure type');

      // STEP 1: Detect procedure type from input
      const procedureType = this.detectProcedureType(input);
      logger.info('PreOpPlanAgent: Detected procedure type', { procedureType });

      // STEP 2: Regex extraction
      reportProgress(10, 'Extracting procedure fields');
      logger.info('PreOpPlanAgent: Extracting fields with regex...');
      const extracted = this.extractPreOpFields(input, procedureType);
      const extractedFieldCount = Object.values(extracted).filter(v => v !== undefined && v !== null).length;
      logger.info('PreOpPlanAgent: Regex extraction complete', { extractedFieldCount });

      // STEP 3: Quick model validation
      reportProgress(20, 'Validating extracted data');
      logger.info('PreOpPlanAgent: Starting validation phase...');
      const validation = await this.validateAndDetectGaps(extracted, input);

      // STEP 4: Apply high-confidence corrections automatically
      reportProgress(35, 'Applying data corrections');
      logger.info('PreOpPlanAgent: Applying high-confidence corrections...');
      const correctedData = this.applyCorrections(extracted, validation.corrections, 0.8);

      // DIAGNOSTIC LOGGING: Validation result structure
      console.log('🔍 PreOpPlanAgent: Validation result:', {
        correctionsCount: validation.corrections.length,
        missingCriticalCount: validation.missingCritical.length,
        missingOptionalCount: validation.missingOptional?.length || 0,
        missingCriticalFields: validation.missingCritical.map(f => ({
          field: f.field,
          critical: f.critical,
          reason: f.reason
        })),
        lowConfidenceCorrections: validation.corrections.filter(c => c.confidence < 0.8).map(c => ({
          field: c.field,
          confidence: c.confidence,
          correctValue: c.correctValue
        }))
      });

      // STEP 5: Check for critical gaps - INTERACTIVE CHECKPOINT
      reportProgress(40, 'Checking for missing fields');
      const hasCriticalGaps = validation.missingCritical.some(field => field.critical === true);
      const hasLowConfidenceCorrections = validation.corrections.some(c => c.confidence < 0.8);

      // DIAGNOSTIC LOGGING: Checkpoint decision
      console.log('🚦 PreOpPlanAgent: Checkpoint decision:', {
        hasCriticalGaps,
        hasLowConfidenceCorrections,
        willTriggerCheckpoint: hasCriticalGaps || hasLowConfidenceCorrections,
        criticalGapsCount: validation.missingCritical.filter(f => f.critical === true).length,
        lowConfCount: validation.corrections.filter(c => c.confidence < 0.8).length
      });

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
        reportProgress(50, 'Merging validated fields');
        logger.info('PreOpPlanAgent: Merging user-provided fields...', {
          fieldCount: Object.keys(context.userProvidedFields).length
        });
        finalData = this.mergeUserInput(correctedData, context.userProvidedFields);
      }

      // STEP 7: Convert to JSON format
      reportProgress(55, 'Preparing procedure card');
      let jsonData = this.convertToJSON(finalData);
      const extractedFieldsCount = Object.keys(jsonData.fields).length;
      logger.info('PreOpPlanAgent: Converted to JSON format', {
        fieldCount: extractedFieldsCount
      });

      // Check if we have meaningful extracted data
      const hasExtractedData = extractedFieldsCount > 1; // More than just procedureType

      // STEP 8: Generate card markdown with reasoning model
      reportProgress(60, 'Generating pre-op card');
      logger.info('PreOpPlanAgent: Generating card with reasoning model...', {
        hasExtractedData,
        extractedFieldsCount
      });

      let enrichedPrompt: string;
      let shouldParseJsonFromResponse = false;

      if (hasExtractedData) {
        // Use validated data - tell LLM to use it exactly
        enrichedPrompt = `VALIDATED DATA (use this exact data for card generation):
${JSON.stringify(jsonData, null, 2)}

ORIGINAL DICTATION (for context only):
${input.trim()}

Generate the A5 pre-procedure summary card using the VALIDATED DATA above. All fields have been verified and corrected. Output ONLY the CARD markdown section, do NOT regenerate JSON.`;
      } else {
        // Regex extraction failed - ask LLM to extract AND format
        shouldParseJsonFromResponse = true;
        enrichedPrompt = `DICTATION:
${input.trim()}

DETECTED PROCEDURE TYPE: ${procedureType}

The automated extraction did not capture structured fields. Please:
1. Extract all procedure details from the dictation
2. Generate the A5 pre-procedure summary card (CARD section)
3. Output structured JSON with extracted fields (JSON section)

Format your response with CARD: and JSON: sections as specified in your instructions.`;
        logger.info('PreOpPlanAgent: Using full extraction mode (regex failed)');
      }

      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        enrichedPrompt,
        this.agentType,
        undefined,
        MODEL_CONFIG.REASONING_MODEL
      );

      reportProgress(85, 'Formatting procedure card');
      logger.info('PreOpPlanAgent: Received LLM response', {
        responseLength: response.length
      });

      // Parse the response
      // If regex extraction failed, parse JSON from LLM response
      // Otherwise use our validated jsonData
      let cardMarkdown: string;
      if (shouldParseJsonFromResponse) {
        const parsed = this.parsePreOpResponse(response);
        cardMarkdown = parsed.cardMarkdown;
        jsonData = parsed.jsonData; // Use LLM-extracted JSON
        logger.info('PreOpPlanAgent: Using LLM-extracted JSON', {
          fieldCount: Object.keys(jsonData.fields || {}).length
        });
      } else {
        const parsed = this.parsePreOpResponse(response, jsonData);
        cardMarkdown = parsed.cardMarkdown;
      }

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

      reportProgress(95, 'Finalizing report');

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

      reportProgress(100, 'Pre-op card generated');

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
   * @param response - LLM response text
   * @param providedJsonData - Optional validated JSON data to use instead of parsing from response
   */
  private parsePreOpResponse(response: string, providedJsonData?: PreOpPlanJSON): {
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

      // Use provided validated JSON if available, otherwise parse from response
      let jsonData: any;
      let procedureType: PreOpProcedureType = 'ANGIOGRAM_OR_PCI'; // Default

      if (providedJsonData) {
        // Use validated JSON data passed from validation workflow
        jsonData = providedJsonData;
        procedureType = providedJsonData.procedure_type;
        logger.info('PreOpPlanAgent: Using provided validated JSON', {
          procedureType,
          fieldCount: Object.keys(jsonData.fields || {}).length
        });
      } else {
        // Extract JSON section from response (legacy path)
        const jsonMatch = response.match(/JSON:\s*\n```json\s*\n([\s\S]*?)\n```/i) ||
                         response.match(/JSON:\s*\n([\s\S]+?)(?=\n\s*$)/i) ||
                         response.match(/```json\s*\n([\s\S]*?)\n```/i);

        if (jsonMatch) {
          try {
            const jsonString = jsonMatch[1].trim();
            jsonData = JSON.parse(jsonString);
            procedureType = jsonData.procedure_type || procedureType;

            logger.info('PreOpPlanAgent: Successfully parsed JSON from response', {
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
          logger.warn('PreOpPlanAgent: No JSON found in response, extracting from card markdown');
          // FALLBACK: Extract structured data from the card markdown itself
          const extractedFields = this.extractFieldsFromCardMarkdown(cardMarkdown);
          procedureType = extractedFields.procedureType || procedureType;
          
          jsonData = {
            procedure_type: procedureType,
            fields: extractedFields.fields
          };
          
          logger.info('PreOpPlanAgent: Extracted fields from card markdown', {
            procedureType,
            fieldCount: Object.keys(extractedFields.fields).length,
            fields: Object.keys(extractedFields.fields)
          });
        }
      }

      logger.info('PreOpPlanAgent: Parsing complete', {
        cardLength: cardMarkdown.length,
        hasJsonData: !!jsonData,
        fieldCount: Object.keys(jsonData?.fields || {}).length,
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
   * Extract structured fields from card markdown when JSON is not available
   * Parses the **Label** — Value format used in card markdown
   */
  private extractFieldsFromCardMarkdown(cardMarkdown: string): {
    procedureType: PreOpProcedureType | null;
    fields: Record<string, string>;
  } {
    const fields: Record<string, string> = {};
    let procedureType: PreOpProcedureType | null = null;

    // Map of label patterns to field keys
    const labelToFieldMap: Record<string, string> = {
      // Common fields
      'indication': 'indication',
      'procedure': 'procedure',
      'allergies': 'allergies',
      'nok': 'nok_name',
      'next of kin': 'nok_name',
      'nok name': 'nok_name',
      'nok contact': 'nok_contact',
      'weight': 'weight',
      'egfr': 'egfr',
      'height': 'height',
      
      // Access fields
      'primary access': 'primary_access',
      'access': 'primary_access',
      'access site': 'access_site',
      'secondary access': 'secondary_access',
      'sheath': 'sheath_size_fr',
      'sheath size': 'sheath_size_fr',
      
      // Catheter fields
      'catheters': 'catheters',
      'catheter': 'catheters',
      'guide catheter': 'guide_catheter',
      'diagnostic catheter': 'diagnostic_catheter',
      
      // Wire fields
      'wire': 'wire',
      'wires': 'wire',
      'guidewire': 'wire',
      
      // Closure fields
      'closure': 'closure_plan',
      'closure plan': 'closure_plan',
      
      // Medication fields
      'antiplatelets': 'antiplatelets',
      'antiplatelet': 'antiplatelets',
      'anticoagulation': 'anticoagulation',
      'anticoag': 'anticoagulation',
      'sedation': 'sedation',
      'anesthesia': 'anesthesia',
      'contrast': 'contrast',
      
      // Lab fields
      'labs': 'labs',
      'bloods': 'labs',
      'blood results': 'labs',
      'hemoglobin': 'hemoglobin',
      'hb': 'hemoglobin',
      'creatinine': 'creatinine',
      'inr': 'inr',
      
      // Site prep
      'site prep': 'site_prep',
      'site preparation': 'site_prep',
      'prep': 'site_prep',
      
      // Follow-up
      'follow-up': 'follow_up',
      'follow up': 'follow_up',
      'followup': 'follow_up',
      'f/u': 'follow_up',
      
      // TAVI specific
      'valve type': 'valve_type_size',
      'valve': 'valve_type_size',
      'valve type and size': 'valve_type_size',
      'pacing wire': 'pacing_wire_access',
      'pacing': 'pacing_wire_access',
      'protamine': 'protamine',
      'goals of care': 'goals_of_care',
      'goals': 'goals_of_care',
      
      // RHC specific
      'co measurement': 'co_measurement',
      'cardiac output': 'co_measurement',
      'blood gas': 'blood_gas_samples',
      'blood gases': 'blood_gas_samples',
      
      // Mitral TEER specific
      'transeptal': 'transeptal_catheter',
      'transeptal catheter': 'transeptal_catheter',
      'echo': 'echo_summary',
      'echo summary': 'echo_summary',
      'tee': 'echo_summary',
      
      // Angio findings
      'lm': 'lm_findings',
      'left main': 'lm_findings',
      'lad': 'lad_findings',
      'lcx': 'lcx_findings',
      'rca': 'rca_findings',
      'grafts': 'grafts_findings',
      'plan': 'plan'
    };

    // Detect procedure type from card header/title
    const lowerCard = cardMarkdown.toLowerCase();
    if (lowerCard.includes('tavi') || lowerCard.includes('transcatheter aortic') || lowerCard.includes('tavr')) {
      procedureType = 'TAVI';
    } else if (lowerCard.includes('right heart') || lowerCard.includes('rhc') || lowerCard.includes('swan')) {
      procedureType = 'RIGHT_HEART_CATH';
    } else if (lowerCard.includes('mitral') || lowerCard.includes('teer') || lowerCard.includes('mitraclip')) {
      procedureType = 'MITRAL_TEER';
    } else if (lowerCard.includes('angiogram') || lowerCard.includes('pci') || lowerCard.includes('coronary')) {
      procedureType = 'ANGIOGRAM_OR_PCI';
    }

    // Extract ALL **Label** — Value pairs (handles multiple per line)
    // This regex captures each **Label** — Value pair, stopping at the next ** or end of line
    const fieldPattern = /\*\*([^*]+)\*\*\s*[—\-:]\s*([^*\n]+?)(?=\s*[•·]\s*\*\*|\s*\*\*|$|\n)/g;
    let match;
    
    while ((match = fieldPattern.exec(cardMarkdown)) !== null) {
      const label = match[1].trim().toLowerCase();
      let value = match[2].trim();
      
      // Clean up trailing bullets or separators
      value = value.replace(/\s*[•·]\s*$/, '').trim();
      
      // Skip empty or "Not specified" values
      if (!value || value.toLowerCase() === 'not specified' || value === '—' || value === '-') {
        continue;
      }
      
      // Find matching field key
      let matched = false;
      for (const [pattern, fieldKey] of Object.entries(labelToFieldMap)) {
        if (label === pattern || label.includes(pattern) || pattern.includes(label)) {
          fields[fieldKey] = value;
          matched = true;
          break;
        }
      }
      
      // Also store with a normalized version of the label as fallback
      if (!matched) {
        const normalizedLabel = label.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (normalizedLabel.length > 0) {
          fields[normalizedLabel] = value;
        }
      }
    }

    // Also try bullet point format: • Label: Value or - Label: Value
    const bulletPattern = /[•*-]\s*([^:]+):\s*([^\n]+)/g;
    while ((match = bulletPattern.exec(cardMarkdown)) !== null) {
      const label = match[1].trim().toLowerCase();
      const value = match[2].trim();
      
      if (!value || value.toLowerCase() === 'not specified') {
        continue;
      }
      
      for (const [pattern, fieldKey] of Object.entries(labelToFieldMap)) {
        if (label.includes(pattern) || pattern.includes(label)) {
          if (!fields[fieldKey]) { // Don't overwrite existing fields
            fields[fieldKey] = value;
          }
          break;
        }
      }
    }

    logger.info('PreOpPlanAgent: Extracted fields from markdown', {
      detectedProcedureType: procedureType,
      extractedFieldCount: Object.keys(fields).length,
      extractedFields: Object.keys(fields)
    });

    return { procedureType, fields };
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
   * 
   * NOTE: These patterns are intentionally flexible to handle natural dictation.
   * If extraction fails, the LLM will handle full extraction.
   */
  private extractPreOpFields(input: string, procedureType: PreOpProcedureType): PreOpExtractedData {
    // Core procedure fields - more flexible patterns
    // Match "for angiogram", "doing a PCI", "procedure is angiogram", etc.
    const procedureMatch = input.match(/(?:procedure|operation|intervention|doing|for|scheduled for)[:;\s]+(?:a\s+|an\s+)?([^\n.,]+)/i) ||
                          input.match(/\b(angiogram|pci|coronary angiography|cath(?:eterization)?|right heart cath)\b/i);
    
    // Match "indication severe AS", "for severe MR", "because of chest pain"
    const indicationMatch = input.match(/(?:indication|for|because of|due to)[:;\s]+([^\n.,]+)/i) ||
                           input.match(/(?:severe|moderate|significant)\s+(aortic stenosis|mitral regurgitation|coronary artery disease|chest pain|angina|cad)/i);

    // Access fields - match natural phrases like "right radial approach", "going radial", "via radial"
    const primaryAccessMatch = input.match(/(?:primary\s+)?access(?:\s+site)?[:;\s]+(?:right\s+|left\s+)?(radial|femoral|brachial)(?:\s+artery)?/i) ||
                               input.match(/(?:right|left)\s+(radial|femoral|brachial)\s+(?:approach|access|artery)/i) ||
                               input.match(/(?:via|going|using)\s+(?:right\s+|left\s+)?(radial|femoral)/i);
    
    const accessSiteMatch = input.match(/access(?:\s+site)?[:;\s]+(?:right\s+|left\s+)?(basilic|jugular|femoral)(?:\s+vein(?:ous)?)?/i) ||
                           input.match(/(?:right|left)\s+(?:internal\s+)?(jugular|femoral|basilic)\s+(?:vein|venous|access)/i);
    
    // Sheath - match "6 French", "6Fr sheath", "using a 6F"
    const sheathMatch = input.match(/(\d+)\s*(?:fr(?:ench)?|f)\s*(?:sheath)?/i);

    // Equipment - more flexible
    const cathetersMatch = input.match(/cath(?:eter)?s?[:;\s]+([^\n.,]+)/i) ||
                          input.match(/(?:using|with)\s+(?:a\s+)?(\w+\s+(?:catheter|guide))/i);
    const valveMatch = input.match(/valve(?:\s+type)?[:;\s]+([^\n.,]+)/i) ||
                       input.match(/(sapien|evolut|navitor|acurate)\s*(?:\d+)?(?:\s*mm)?/i);
    const wireMatch = input.match(/wire[:;\s]+([^\n.,]+)/i);
    const balloonMatch = input.match(/balloon(?:\s+size)?[:;\s]+(\d+)\s*mm/i) ||
                         input.match(/(\d+)\s*mm\s*balloon/i);
    const transeptalMatch = input.match(/transeptal(?:\s+catheter)?[:;\s]+([^\n.,]+)/i);

    // Safety & Planning
    const closureMatch = input.match(/closure(?:\s+plan)?[:;\s]+([^\n.,]+)/i) ||
                         input.match(/(?:using|plan(?:ning)?)\s+(angioseal|proglide|tr band|manual compression)/i);
    const pacingMatch = input.match(/pacing(?:\s+wire)?(?:\s+access)?[:;\s]+([^\n.,]+)/i);
    const protamineMatch = input.match(/protamine[:;\s]+([^\n.,]+)/i) ||
                           input.match(/(?:give|giving|will give)\s+protamine/i);
    const goalsMatch = input.match(/goals(?:\s+of\s+care)?[:;\s]+([^\n.,]+)/i);

    // Clinical Info
    const anticoagMatch = input.match(/(?:anticoagulation|antiplatelet|antithrombotic)(?:\s+plan)?[:;\s]+([^\n.,]+)/i) ||
                          input.match(/(?:on|taking|continue)\s+(aspirin|clopidogrel|plavix|ticagrelor|heparin|warfarin)/i);
    const sedationMatch = input.match(/sedation(?:\s+plan)?[:;\s]+([^\n.,]+)/i) ||
                          input.match(/(?:conscious sedation|moderate sedation|mac|local an(?:a)?esthesia|general an(?:a)?esthesia)/i);
    const sitePrepMatch = input.match(/(?:site\s+)?prep(?:aration)?[:;\s]+([^\n.,]+)/i) ||
                          input.match(/(?:chlorhexidine|betadine|alcohol)\s*(?:prep)?/i);
    const allergiesMatch = input.match(/allerg(?:y|ies)[:;\s]+([^\n.,]+)/i) ||
                           input.match(/(?:allergic to|nkda|no known (?:drug )?allergies)/i);
    const coMeasurementMatch = input.match(/(?:cardiac\s+output|co)(?:\s+measurement)?[:;\s]+([^\n.,]+)/i) ||
                               input.match(/(?:fick|thermodilution)\s+(?:method|co)/i);
    const bloodGasMatch = input.match(/(\d+)\s*blood\s*gas\s*sample/i);
    const echoMatch = input.match(/echo(?:\s+summary)?[:;\s]+([^\n.,]+)/i);

    // Labs - match "Hb 120", "hemoglobin of 120", "creatinine 85"
    const hbMatch = input.match(/(?:hb|h(?:ae)?moglobin)(?:\s+(?:of|is|was))?[:;\s]+(\d+)/i);
    const creatMatch = input.match(/creat(?:inine)?(?:\s+(?:of|is|was))?[:;\s]+(\d+)/i);

    // Next of Kin (flexible patterns to handle various formats)
    // Handles: "Next of kin: Andrew (son) 0413571525", "NOK Andrew (son)", "Next-of-kin Andrew son 0413"
    const nokNameMatch = input.match(/(?:next[-\s]+of[-\s]+kin|nok)[\s:;,]+([A-Za-z\s]+?)(?:\s*\(|\s*,|\s+\d)/i);
    const nokRelMatch = input.match(/(?:next[-\s]+of[-\s]+kin|nok)[\s:;,]*[A-Za-z\s]*\(([^)]+)\)/i);
    const nokPhoneMatch = input.match(/(\d{4}[-\s]?\d{3}[-\s]?\d{3}|\d{10})/);

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
