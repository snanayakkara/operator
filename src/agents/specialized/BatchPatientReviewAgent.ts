import { MedicalAgent } from '../base/MedicalAgent';
import type {
  MedicalContext,
  ChatMessage,
  ReportSection,
  BatchPatientReviewInput,
  BatchPatientReviewFinding,
  BatchPatientReviewReport,
  PatientClassification
} from '@/types/medical.types';
import { LMStudioService } from '@/services/LMStudioService';
import {
  BatchPatientReviewSystemPrompts,
  HeartFoundationResources,
  AustralianCVDRiskCalculator
} from './BatchPatientReviewSystemPrompts';

export class BatchPatientReviewAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Batch Patient Review Specialist',
      'Multi-Patient Clinical Oversight',
      'Australian cardiology practice clinical oversight and batch patient review',
      'ai-medical-review' as const,
      BatchPatientReviewSystemPrompts.batchPatientReviewAgent.systemPrompt
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  public async process(input: string, context?: MedicalContext): Promise<BatchPatientReviewReport> {
    const startTime = Date.now();
    
    try {
      // Parse the structured input
      const reviewInput = this.parseReviewInput(input);
      
      // Build messages for LLM - not used in current implementation but keeping for interface compliance
      
      // Process with LMStudio service following TAVIAgent pattern
      const contextualPrompt = `${this.systemPrompt}

Please analyze the following clinical data against Australian cardiology guidelines and identify any potential clinical oversights or diagnostic considerations. 

Provide findings in the following structured format for each clinical oversight identified:

FINDING: [Brief description of the clinical finding]
AUSTRALIAN GUIDELINE: [Specific Australian guideline reference - NHFA/CSANZ, RACGP, etc.]
CLINICAL REASONING: [Medical reasoning for this finding]
RECOMMENDED ACTION: [Specific actionable recommendation]
URGENCY: [Immediate/Soon/Routine]

If no clinical oversights are identified, respond with:
FINDING: No significant clinical oversights identified
AUSTRALIAN GUIDELINE: N/A
CLINICAL REASONING: Patient management appears appropriate based on available information
RECOMMENDED ACTION: Continue current management
URGENCY: Routine`;

      const response = await this.lmStudioService.processWithAgent(contextualPrompt, input, 'ai-medical-review');
      
      // Parse the LLM response
      const sections = this.parseResponse(response, context);

      // Extract patient classification
      const classification = this.extractClassification(response);

      // Extract findings and metadata
      const reviewData = this.extractReviewData(response, reviewInput);

      // Validate that we have meaningful findings
      if (!reviewData.findings || reviewData.findings.length === 0) {
        console.warn('🚨 BatchPatientReviewAgent: No findings extracted from response. Attempting fallback parsing...');

        // Fallback: Try to create a single finding from the raw response if it contains clinical content
        const fallbackFinding = this.createFallbackFinding(response);
        if (fallbackFinding) {
          reviewData.findings = [fallbackFinding];
          console.log('✅ Created fallback finding from raw response');
        } else {
          console.warn('⚠️ No clinical content found for fallback finding');
          // Create a "no findings" result
          reviewData.findings = [];
        }
      }

      console.log('🔍 BatchPatientReviewAgent: Final review data before report creation:', {
        classification: classification.category,
        findingsCount: reviewData.findings.length,
        sectionsCount: sections.length,
        hasContent: !!response && response.length > 0
      });

      // Create the specialized report
      const report = this.createBatchPatientReviewReport(
        response,
        sections,
        classification,
        reviewData,
        context,
        Date.now() - startTime
      );
      
      // Update agent memory
      this.addProcedureMemory('australian-medical-review', {
        findingsCount: reviewData.findings.length,
        urgentFindings: reviewData.findings.filter((f: BatchPatientReviewFinding) => f.urgency === 'Immediate').length,
        guidelinesReferences: reviewData.guidelineReferences.length
      });
      
      return report;
      
    } catch (error) {
      console.error('❌ AusMedicalReviewAgent.process error:', error);
      
      // Return error report
      return this.createBatchPatientReviewReport(
        `Error processing medical review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [],
        {
          category: 'primary',
          rationale: 'Error during processing',
          triggers: [],
          reviewFocus: []
        },
        {
          findings: [],
          guidelineReferences: [],
          heartFoundationResources: [],
          cvdRiskCalculatorRecommended: false,
          aboriginalTorresStraitIslander: false,
          qtProlongationRisk: false,
          medicationSafetyIssues: 0
        },
        context,
        Date.now() - startTime,
        0.0,
        [],
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    // Parse structured input to extract individual components
    const reviewInput = this.parseReviewInput(input);
    
    // Format the user prompt with extracted data
    const userPrompt = BatchPatientReviewSystemPrompts.batchPatientReviewAgent.userPromptTemplate
      .replace('{background}', reviewInput.background || 'Not provided')
      .replace('{investigations}', reviewInput.investigations || 'Not provided')
      .replace('{medications}', reviewInput.medications || 'Not provided');

    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const sections: ReportSection[] = [];
    
    // Split response into individual findings
    const findingBlocks = this.extractFindingBlocks(response);
    
    findingBlocks.forEach((block, index) => {
      const finding = this.parseFindingBlock(block);
      if (finding) {
        sections.push({
          title: `Finding ${index + 1}: ${finding.finding}`,
          content: this.formatFindingContent(finding),
          type: 'structured',
          priority: finding.urgency === 'Immediate' ? 'high' : 
                   finding.urgency === 'Soon' ? 'medium' : 'low'
        });
      }
    });

    // Add summary section
    sections.unshift({
      title: 'Australian Medical Review Summary',
      content: this.generateSummaryContent(findingBlocks.length, response),
      type: 'narrative',
      priority: 'high'
    });

    return sections;
  }

  private parseReviewInput(input: string): BatchPatientReviewInput {
    // Parse structured input that contains background, investigations, and medications
    const lines = input.split('\n');
    let currentSection = '';
    const result: BatchPatientReviewInput = {
      background: '',
      investigations: '',
      medications: ''
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('background:')) {
        currentSection = 'background';
        result.background = trimmedLine.replace(/background:\s*/i, '');
      } else if (trimmedLine.toLowerCase().includes('investigations:')) {
        currentSection = 'investigations';
        result.investigations = trimmedLine.replace(/investigations:\s*/i, '');
      } else if (trimmedLine.toLowerCase().includes('medications:')) {
        currentSection = 'medications';
        result.medications = trimmedLine.replace(/medications:\s*/i, '');
      } else if (trimmedLine && currentSection) {
        // Continue adding to current section
        switch (currentSection) {
          case 'background':
            result.background += ' ' + trimmedLine;
            break;
          case 'investigations':
            result.investigations += ' ' + trimmedLine;
            break;
          case 'medications':
            result.medications += ' ' + trimmedLine;
            break;
        }
      }
    }

    return {
      background: result.background.trim(),
      investigations: result.investigations.trim(),
      medications: result.medications.trim()
    };
  }

  private extractFindingBlocks(response: string): string[] {
    // Preprocess response to handle unused tokens and format variations
    const cleanResponse = this.preprocessResponse(response);
    
    // Try multiple splitting strategies
    let blocks: string[] = [];
    
    // Strategy 1: Split by FINDING markers (both plain and markdown format, with or without numbers)
    blocks = cleanResponse.split(/(?=\*\*FINDING\s*\d*:|FINDING\s*\d*:)/i).filter(block => block.trim());
    
    // Strategy 2: If no blocks found, try splitting by numbered findings
    if (blocks.length <= 1) {
      blocks = cleanResponse.split(/(?=\d+\.\s*\*\*FINDING|\d+\.\s*FINDING)/i).filter(block => block.trim());
    }
    
    // Strategy 3: If still no blocks, try splitting by any word "FINDING"
    if (blocks.length <= 1) {
      blocks = cleanResponse.split(/(?=.*FINDING.*:)/i).filter(block => block.trim());
    }
    
    // Strategy 4: If response contains structured content but no "FINDING" keyword, create a single block
    if (blocks.length <= 1 && (cleanResponse.includes('AUSTRALIAN GUIDELINE') || cleanResponse.includes('CLINICAL REASONING'))) {
      console.log('🔧 No FINDING keywords found, but structured content detected. Creating single block...');
      blocks = [cleanResponse];
    }
    
    // Remove any blocks that don't contain actual finding content
    blocks = blocks.filter(block => {
      const hasContent = block.trim().length > 10;
      const hasStructure = block.includes('GUIDELINE') || block.includes('REASONING') || block.includes('ACTION');
      return hasContent && (block.includes('FINDING') || hasStructure);
    });
    
    console.log('🔍 AusMedicalReviewAgent: Extracted finding blocks:', {
      originalLength: response.length,
      cleanedLength: cleanResponse.length,
      blocksFound: blocks.length,
      strategy: blocks.length > 1 ? 'standard-split' : blocks.length === 1 ? 'single-block' : 'no-blocks-found',
      blockPreviews: blocks.map((block, idx) => ({
        index: idx,
        preview: block.substring(0, 100) + '...',
        hasFinding: /FINDING\s*\d*:/i.test(block) || /\*\*FINDING\s*\d*:/i.test(block),
        hasGuideline: block.includes('GUIDELINE'),
        hasReasoning: block.includes('REASONING')
      }))
    });
    
    // If we have blocks but the first one is just preamble, remove it
    if (blocks.length > 1 && blocks[0] && !blocks[0].includes('FINDING') && !blocks[0].includes('GUIDELINE')) {
      console.log('🔧 Removing preamble block...');
      blocks = blocks.slice(1);
    }
    
    return blocks;
  }

  private parseFindingBlock(block: string): BatchPatientReviewFinding | null {
    try {
      console.log('🔍 BatchPatientReviewAgent: Parsing finding block:', block.substring(0, 200) + '...');

      const finding: Partial<BatchPatientReviewFinding> = {};

      // Extract fields using flexible pattern matching for hybrid PRIMARY/SECONDARY format
      const fieldPatterns = {
        classificationTag: /(?:\*\*)?CLASSIFICATION TAG:(?:\*\*)?\s*\[?(PRIMARY|SECONDARY-CAD|SECONDARY-HFrEF|SECONDARY-VALVULAR)\]?/i,
        finding: /(?:\*\*)?FINDING:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:EVIDENCE|THRESHOLD|AUSTRALIAN GUIDELINE|MECHANISM|CLINICAL REASONING|RECOMMENDED ACTION|PRIORITY|URGENCY|CLASSIFICATION TAG):|$)/is,
        evidence: /(?:\*\*)?EVIDENCE:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:THRESHOLD|AUSTRALIAN GUIDELINE|MECHANISM|CLINICAL REASONING|RECOMMENDED ACTION|PRIORITY|URGENCY|FINDING|CLASSIFICATION TAG):|$)/is,
        threshold: /(?:\*\*)?THRESHOLD\/STATUS:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:MECHANISM|RECOMMENDED ACTION|PRIORITY|URGENCY|FINDING|CLASSIFICATION TAG|EVIDENCE):|$)/is,
        mechanism: /(?:\*\*)?MECHANISM:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:RECOMMENDED ACTION|PRIORITY|URGENCY|FINDING|CLASSIFICATION TAG|EVIDENCE|THRESHOLD):|$)/is,
        australianGuideline: /(?:\*\*)?AUSTRALIAN GUIDELINE:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:CLINICAL REASONING|RECOMMENDED ACTION|PRIORITY|URGENCY|FINDING|CLASSIFICATION TAG|EVIDENCE):|$)/is,
        clinicalReasoning: /(?:\*\*)?CLINICAL REASONING:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:RECOMMENDED ACTION|PRIORITY|URGENCY|FINDING|CLASSIFICATION TAG|EVIDENCE|AUSTRALIAN GUIDELINE):|$)/is,
        recommendedAction: /(?:\*\*)?RECOMMENDED ACTION:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:PRIORITY|URGENCY|FINDING|CLASSIFICATION TAG|EVIDENCE|THRESHOLD|AUSTRALIAN GUIDELINE):|$)/is,
        priority: /(?:\*\*)?PRIORITY:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:URGENCY|FINDING|CLASSIFICATION TAG|EVIDENCE):|$)/is,
        urgency: /(?:\*\*)?URGENCY:(?:\*\*)?\s*(.+?)(?=(?:\*\*)?(?:FINDING|CLASSIFICATION TAG|EVIDENCE):|$)/is
      };
      
      // Extract each field
      Object.entries(fieldPatterns).forEach(([key, pattern]) => {
        const match = block.match(pattern);
        if (match) {
          // Classification tag uses match[1] (captured group)
          if (key === 'classificationTag' && match[1]) {
            const tagValue = match[1].toUpperCase().trim();
            if (['PRIMARY', 'SECONDARY-CAD', 'SECONDARY-HFREF', 'SECONDARY-VALVULAR'].includes(tagValue)) {
              finding.classificationTag = tagValue as BatchPatientReviewFinding['classificationTag'];
            }
          }
          // Other fields use match[1] if present
          else if (match[1]) {
            const value = match[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');

            if (key === 'urgency') {
              const urgencyValue = value.replace(/[.,]$/, ''); // Remove trailing punctuation
              if (['Immediate', 'Soon', 'Routine'].includes(urgencyValue)) {
                finding.urgency = urgencyValue as BatchPatientReviewFinding['urgency'];
              } else {
                // Try to infer urgency from common variations
                if (/immediate|urgent|critical|emergency/i.test(urgencyValue)) {
                  finding.urgency = 'Immediate';
                } else if (/soon|priority|moderate/i.test(urgencyValue)) {
                  finding.urgency = 'Soon';
                } else {
                  finding.urgency = 'Routine';
                }
              }
            } else if (key === 'priority') {
              const priorityValue = value.toLowerCase().replace(/[.,]$/, '');
              if (['very_high', 'high', 'moderate', 'routine'].includes(priorityValue)) {
                finding.priority = priorityValue as BatchPatientReviewFinding['priority'];
              } else {
                // Try to infer priority from common variations
                if (/very.high|critical/i.test(priorityValue)) {
                  finding.priority = 'very_high';
                } else if (/high/i.test(priorityValue)) {
                  finding.priority = 'high';
                } else if (/moderate/i.test(priorityValue)) {
                  finding.priority = 'moderate';
                } else {
                  finding.priority = 'routine';
                }
              }
            } else {
              (finding as any)[key] = value;
            }
          }
        }
      });
      
      // Apply defaults based on classification tag
      const isPrimary = finding.classificationTag === 'PRIMARY';

      // If no classification tag found, try to infer from content
      if (!finding.classificationTag) {
        if (finding.threshold || finding.mechanism) {
          finding.classificationTag = 'PRIMARY';
        } else if (finding.australianGuideline || finding.clinicalReasoning) {
          // Default to SECONDARY-CAD if we have guideline/reasoning but no tag
          finding.classificationTag = 'SECONDARY-CAD';
        } else {
          // Last resort default
          finding.classificationTag = 'PRIMARY';
        }
        console.log('🔧 No classification tag found, inferred:', finding.classificationTag);
      }

      // Fill in missing core fields with reasonable defaults
      if (!finding.finding && (finding.threshold || finding.mechanism || finding.australianGuideline || finding.clinicalReasoning)) {
        console.log('🔧 No explicit FINDING field found, creating synthetic finding...');
        const contentForSynthesis = finding.mechanism || finding.clinicalReasoning || finding.evidence || block;
        const sentences = contentForSynthesis.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          finding.finding = sentences[0].trim().substring(0, 100) + (sentences[0].length > 100 ? '...' : '');
        } else {
          finding.finding = 'Clinical finding requires review';
        }
      }

      if (finding.finding && !finding.evidence) {
        finding.evidence = 'Evidence not explicitly stated';
      }

      if (finding.finding && !finding.recommendedAction) {
        finding.recommendedAction = 'Further clinical evaluation recommended';
      }

      if (finding.finding && !finding.priority) {
        finding.priority = 'moderate';
      }

      if (finding.finding && !finding.urgency) {
        finding.urgency = 'Routine';
      }

      console.log('🔍 BatchPatientReviewAgent: Parsed finding (after defaults):', {
        classificationTag: finding.classificationTag,
        hasFinding: !!finding.finding,
        hasEvidence: !!finding.evidence,
        hasThreshold: !!finding.threshold,
        hasMechanism: !!finding.mechanism,
        hasGuideline: !!finding.australianGuideline,
        hasReasoning: !!finding.clinicalReasoning,
        hasAction: !!finding.recommendedAction,
        hasPriority: !!finding.priority,
        hasUrgency: !!finding.urgency,
        finding: finding.finding?.substring(0, 50) + '...'
      });

      // Validate required core fields
      const hasCoreFields = finding.classificationTag && finding.finding && finding.evidence &&
                           finding.recommendedAction && finding.priority && finding.urgency;

      // Validate conditional fields based on classification
      const hasConditionalFields = isPrimary
        ? true // PRIMARY doesn't strictly require threshold/mechanism (can have metabolic findings)
        : (finding.australianGuideline || finding.clinicalReasoning); // SECONDARY should have guideline OR reasoning

      if (hasCoreFields && hasConditionalFields) {
        return finding as BatchPatientReviewFinding;
      }

      console.warn('🔍 BatchPatientReviewAgent: Incomplete finding block after applying defaults:', {
        hasCoreFields,
        hasConditionalFields,
        isPrimary,
        classificationTag: finding.classificationTag,
        finding: !!finding.finding,
        evidence: !!finding.evidence,
        threshold: !!finding.threshold,
        mechanism: !!finding.mechanism,
        australianGuideline: !!finding.australianGuideline,
        clinicalReasoning: !!finding.clinicalReasoning,
        recommendedAction: !!finding.recommendedAction,
        priority: !!finding.priority,
        urgency: !!finding.urgency,
        blockLength: block.length,
        blockPreview: block.substring(0, 150)
      });

      return null;
    } catch (error) {
      console.error('🔍 BatchPatientReviewAgent: Failed to parse finding block:', error, 'Block:', block.substring(0, 200) + '...');
      return null;
    }
  }

  private formatFindingContent(finding: BatchPatientReviewFinding): string {
    let content = `**Clinical Finding:** ${finding.finding}\n\n`;
    content += `**Australian Guideline:** ${finding.australianGuideline}\n\n`;
    content += `**Clinical Reasoning:** ${finding.clinicalReasoning}\n\n`;
    content += `**Recommended Action:** ${finding.recommendedAction}\n\n`;
    content += `**Urgency Level:** ${finding.urgency}\n\n`;
    
    if (finding.heartFoundationLink) {
      content += `**Heart Foundation Resource:** ${finding.heartFoundationLink}\n\n`;
    }
    
    return content;
  }

  private preprocessResponse(response: string): string {
    console.log('🔍 AusMedicalReviewAgent: Preprocessing response:', {
      originalLength: response.length,
      hasUnusedTokens: response.includes('<unused'),
      hasThoughtTokens: response.includes('thought'),
      hasSystemPrompt: response.includes('senior Australian cardiologist'),
      hasMarkdownFindings: response.includes('**FINDING:**'),
      hasPlainFindings: response.includes('FINDING:')
    });
    
    let cleaned = response;
    
    // Remove unused tokens (like <unused94>)
    cleaned = cleaned.replace(/<unused\d+>/g, '');
    
    // Remove system prompt artifacts and thought tokens
    cleaned = cleaned.replace(/<unused\d+>thought\s*/gi, '');
    
    // Remove common system prompt patterns that might leak through
    const systemPromptPatterns = [
      /The user wants me to act as a senior Australian cardiologist.*?(?=FINDING|$)/gis,
      /I need to identify.*?(?=FINDING|$)/gis,
      /Please analyze.*?against relevant Australian guidelines.*?(?=FINDING|$)/gis,
      /<\/unused\d+>/g,
      /^.*?senior Australian cardiologist.*?$/gim
    ];
    
    systemPromptPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Clean up extra whitespace and normalize line breaks
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    cleaned = cleaned.trim();
    
    // If the cleaned response is mostly empty or doesn't contain any findings, 
    // try to extract from the original response more aggressively
    if (!cleaned.includes('FINDING') && response.includes('FINDING')) {
      console.log('🔧 Attempting aggressive extraction from original response...');
      
      // Extract everything from the first FINDING onwards
      const findingMatch = response.match(/(FINDING.*)/is);
      if (findingMatch) {
        cleaned = findingMatch[1];
        // Clean this extracted content
        cleaned = cleaned.replace(/<unused\d+>/g, '');
        cleaned = cleaned.replace(/\r\n/g, '\n');
        cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
        cleaned = cleaned.trim();
      }
    }
    
    console.log('🔍 AusMedicalReviewAgent: Response preprocessing completed:', {
      cleanedLength: cleaned.length,
      removedContent: response.length - cleaned.length,
      hasFindings: cleaned.includes('FINDING'),
      firstChars: cleaned.substring(0, 200) + '...'
    });
    
    return cleaned;
  }

  private generateSummaryContent(findingsCount: number, response: string): string {
    let summary = `## Australian Medical Review Summary\n\n`;
    summary += `**Total Findings:** ${findingsCount}\n\n`;

    const urgentCount = (response.match(/(?:\*\*)?URGENCY:(?:\*\*)?\s*Immediate/gi) || []).length;
    const soonCount = (response.match(/(?:\*\*)?URGENCY:(?:\*\*)?\s*Soon/gi) || []).length;
    const routineCount = (response.match(/(?:\*\*)?URGENCY:(?:\*\*)?\s*Routine/gi) || []).length;

    summary += `**Urgency Breakdown:**\n`;
    summary += `- Immediate: ${urgentCount}\n`;
    summary += `- Soon: ${soonCount}\n`;
    summary += `- Routine: ${routineCount}\n\n`;

    summary += `**Guideline Sources:** NHFA/CSANZ, RACGP, Cancer Council Australia\n\n`;
    summary += `**Resources:**\n`;
    summary += `- [Heart Foundation Guidelines](${HeartFoundationResources.guidelines})\n`;
    summary += `- [Australian CVD Risk Calculator](${AustralianCVDRiskCalculator.url})\n\n`;

    summary += `⚠️ **Disclaimer:** AI-generated suggestions based on Australian clinical guidelines for cardiology practice. Not a substitute for clinical judgment. Review against current NHFA/CSANZ guidelines.`;

    return summary;
  }

  /**
   * Extract patient classification from LLM response
   */
  private extractClassification(response: string): PatientClassification {
    try {
      // Extract classification block
      const classificationMatch = response.match(
        /\*\*PATIENT CLASSIFICATION:\*\*\s*([\s\S]*?)(?=\*\*CLASSIFICATION TAG:|$)/i
      );

      if (!classificationMatch) {
        console.warn('⚠️ No classification found in response, using default PRIMARY');
        return {
          category: 'primary',
          rationale: 'Classification not explicitly stated by agent',
          triggers: [],
          reviewFocus: []
        };
      }

      const classificationText = classificationMatch[1];

      // Extract category
      const categoryMatch = classificationText.match(/Category:\s*\[?(PRIMARY|SECONDARY-CAD|SECONDARY-HFrEF|SECONDARY-VALVULAR|MIXED)\]?/i);
      const categoryRaw = categoryMatch ? categoryMatch[1].toUpperCase() : 'PRIMARY';

      // Map to TypeScript enum
      let category: PatientClassification['category'] = 'primary';
      switch (categoryRaw) {
        case 'SECONDARY-CAD':
          category = 'secondary-cad';
          break;
        case 'SECONDARY-HFREF':
          category = 'secondary-hfref';
          break;
        case 'SECONDARY-VALVULAR':
          category = 'secondary-valvular';
          break;
        case 'MIXED':
          category = 'mixed';
          break;
        default:
          category = 'primary';
      }

      // Extract rationale
      const rationaleMatch = classificationText.match(/Rationale:\s*(.+?)(?=\n-|$)/i);
      const rationale = rationaleMatch ? rationaleMatch[1].trim() : 'Not specified';

      // Extract triggers
      const triggersMatch = classificationText.match(/Triggers:\s*(.+?)(?=\n-|$)/i);
      const triggersText = triggersMatch ? triggersMatch[1].trim() : '';
      const triggers = triggersText.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0);

      // Extract review focus
      const reviewFocusMatch = classificationText.match(/Review Focus:\s*(.+?)$/im);
      const reviewFocusText = reviewFocusMatch ? reviewFocusMatch[1].trim() : '';
      const reviewFocus = reviewFocusText.split(/[,;]/).map(f => f.trim()).filter(f => f.length > 0);

      console.log('✅ Extracted patient classification:', { category, rationale, triggers: triggers.length, reviewFocus: reviewFocus.length });

      return {
        category,
        rationale,
        triggers,
        reviewFocus
      };
    } catch (error) {
      console.error('❌ Failed to extract classification:', error);
      return {
        category: 'primary',
        rationale: 'Error extracting classification',
        triggers: [],
        reviewFocus: []
      };
    }
  }

  private extractReviewData(response: string, input: BatchPatientReviewInput): BatchPatientReviewReport['reviewData'] {
    const findings = this.extractFindingBlocks(response)
      .map(block => this.parseFindingBlock(block))
      .filter((finding): finding is BatchPatientReviewFinding => finding !== null);

    // Extract guideline references
    const guidelineReferences = this.extractGuidelineReferences(response);

    // Determine Heart Foundation resources
    const heartFoundationResources = this.determineHeartFoundationResources(findings);

    // Check if CVD risk calculator is recommended
    const cvdRiskCalculatorRecommended = response.toLowerCase().includes('cvd risk') ||
                                       response.toLowerCase().includes('cardiovascular risk') ||
                                       response.toLowerCase().includes('lp(a)');

    // Check for Aboriginal/Torres Strait Islander considerations
    const aboriginalTorresStraitIslander = response.toLowerCase().includes('aboriginal') ||
                                          response.toLowerCase().includes('torres strait');

    // Check for QT prolongation risk
    const qtProlongationRisk = response.toLowerCase().includes('qt') ||
                              response.toLowerCase().includes('prolongation') ||
                              this.detectQTRiskInMedications(input.medications);

    // Count medication safety issues
    const medicationSafetyIssues = this.countMedicationSafetyIssues(response, input.medications);

    // Extract PRIMARY prevention specific sections
    const missingTests = this.extractMissingTests(response);
    const therapyTargets = this.extractTherapyTargets(response);
    const clinicalNotes = this.extractClinicalNotes(response);

    return {
      findings,
      missingTests: missingTests.length > 0 ? missingTests : undefined,
      therapyTargets: Object.keys(therapyTargets).length > 0 ? therapyTargets : undefined,
      primaryPreventionNotes: undefined, // Could be extracted separately if needed
      guidelineReferences,
      heartFoundationResources,
      cvdRiskCalculatorRecommended,
      aboriginalTorresStraitIslander,
      qtProlongationRisk,
      medicationSafetyIssues,
      clinicalNotes
    };
  }

  /**
   * Extract MISSING / NEXT TESTS section
   */
  private extractMissingTests(response: string): string[] {
    try {
      const match = response.match(/\*\*MISSING\s*\/\s*NEXT TESTS\*\*:?\s*([\s\S]*?)(?=\*\*THERAPY TARGETS|\*\*CLINICAL NOTES|$)/i);
      if (!match) return [];

      const testsText = match[1];
      const tests = testsText
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
        .map(line => line.replace(/^[•\-*]\s*/, '').trim())
        .filter(line => line.length > 0);

      console.log('✅ Extracted missing tests:', tests.length);
      return tests;
    } catch (error) {
      console.error('❌ Failed to extract missing tests:', error);
      return [];
    }
  }

  /**
   * Extract THERAPY TARGETS section
   */
  private extractTherapyTargets(response: string): Record<string, string> {
    try {
      const match = response.match(/\*\*THERAPY TARGETS\*\*:?\s*([\s\S]*?)(?=\*\*CLINICAL NOTES|$)/i);
      if (!match) return {};

      const targetsText = match[1];
      const targets: Record<string, string> = {};

      const lines = targetsText
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
        .map(line => line.replace(/^[•\-*]\s*/, '').trim())
        .filter(line => line.length > 0);

      lines.forEach(line => {
        const colonMatch = line.match(/^(.+?):\s*(.+)$/);
        if (colonMatch) {
          const [, key, value] = colonMatch;
          targets[key.trim()] = value.trim();
        }
      });

      console.log('✅ Extracted therapy targets:', Object.keys(targets).length);
      return targets;
    } catch (error) {
      console.error('❌ Failed to extract therapy targets:', error);
      return {};
    }
  }

  /**
   * Extract CLINICAL NOTES section
   */
  private extractClinicalNotes(response: string): string | undefined {
    try {
      const match = response.match(/\*\*CLINICAL NOTES\*\*:?\s*([\s\S]*?)$/i);
      if (!match) return undefined;

      const notes = match[1]
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.length > 10))
        .join('\n');

      console.log('✅ Extracted clinical notes:', notes.length, 'characters');
      return notes.length > 0 ? notes : undefined;
    } catch (error) {
      console.error('❌ Failed to extract clinical notes:', error);
      return undefined;
    }
  }

  private extractGuidelineReferences(response: string): string[] {
    const references = new Set<string>();
    
    const patterns = [
      /NHFA\/CSANZ/gi,
      /National Heart Foundation/gi,
      /RACGP/gi,
      /Cancer Council Australia/gi,
      /Australian Absolute CVD Risk/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        matches.forEach(match => references.add(match));
      }
    });
    
    return Array.from(references);
  }

  private detectQTRiskInMedications(medications: string): boolean {
    const qtMeds = BatchPatientReviewSystemPrompts.batchPatientPatterns.qtMedicationPatterns;
    return qtMeds.some(pattern => pattern.test(medications));
  }

  private countMedicationSafetyIssues(response: string, medications: string): number {
    let count = 0;
    
    // Count QT issues
    if (response.toLowerCase().includes('qt') || this.detectQTRiskInMedications(medications)) {
      count++;
    }
    
    // Count drug interactions
    if (response.toLowerCase().includes('interaction') || response.toLowerCase().includes('nsaid')) {
      count++;
    }
    
    // Count monitoring gaps
    if (response.toLowerCase().includes('monitoring') || response.toLowerCase().includes('potassium')) {
      count++;
    }
    
    return count;
  }

  private determineHeartFoundationResources(findings: BatchPatientReviewFinding[]): string[] {
    const resources = new Set<string>();
    
    findings.forEach(finding => {
      const content = `${finding.finding} ${finding.clinicalReasoning}`.toLowerCase();
      
      if (content.includes('heart failure') || content.includes('hf')) {
        resources.add(HeartFoundationResources.heartFailure);
      }
      if (content.includes('atrial fibrillation') || content.includes('af')) {
        resources.add(HeartFoundationResources.atrialFibrillation);
      }
      if (content.includes('cardiovascular risk') || content.includes('cvd risk')) {
        resources.add(HeartFoundationResources.cardiovascularRisk);
      }
    });
    
    // Always include general guidelines
    resources.add(HeartFoundationResources.guidelines);
    
    return Array.from(resources);
  }

  private createBatchPatientReviewReport(
    content: string,
    sections: ReportSection[],
    classification: PatientClassification,
    reviewData: BatchPatientReviewReport['reviewData'],
    context?: MedicalContext,
    processingTime = 0,
    confidence = 0.9,
    warnings: string[] = [],
    errors: string[] = []
  ): BatchPatientReviewReport {
    const baseReport = this.createReport(
      content,
      sections,
      context,
      processingTime,
      confidence,
      warnings,
      errors
    );

    return {
      ...baseReport,
      classification,
      reviewData
    };
  }

  /**
   * Create a fallback finding from raw response content when structured parsing fails
   */
  private createFallbackFinding(response: string): BatchPatientReviewFinding | null {
    try {
      // Clean the response for analysis
      const cleanedResponse = this.preprocessResponse(response);
      
      // Skip if response is too short or appears to be just system prompts
      if (cleanedResponse.length < 50) {
        return null;
      }
      
      // Try to extract meaningful clinical content
      const sentences = cleanedResponse.split(/[.!?]+/).filter(sentence => {
        const trimmed = sentence.trim();
        return trimmed.length > 20 && 
               !trimmed.toLowerCase().includes('system') &&
               !trimmed.toLowerCase().includes('prompt') &&
               !trimmed.toLowerCase().includes('unused');
      });
      
      if (sentences.length === 0) {
        return null;
      }
      
      // Create a synthetic finding from the available content
      const clinicalContent = sentences.slice(0, 3).join('. ').trim();
      
      const fallbackReasoning = clinicalContent.length > 200 
        ? clinicalContent.substring(0, 200) + '...' 
        : clinicalContent;

      const fallbackFinding: BatchPatientReviewFinding = {
        classificationTag: 'PRIMARY',
        finding: 'Clinical review requires attention',
        evidence: fallbackReasoning,
        australianGuideline: 'NHFA/CSANZ Guidelines - Clinical Review Required',
        clinicalReasoning: fallbackReasoning,
        recommendedAction: 'Manual clinical review of AI analysis recommended',
        priority: 'routine',
        urgency: 'Routine' as const
      };
      
      console.log('🔧 Created fallback finding:', {
        finding: fallbackFinding.finding,
        reasoningLength: fallbackReasoning.length,
        originalResponseLength: response.length
      });
      
      return fallbackFinding;
    } catch (error) {
      console.error('❌ Failed to create fallback finding:', error);
      return null;
    }
  }

}
