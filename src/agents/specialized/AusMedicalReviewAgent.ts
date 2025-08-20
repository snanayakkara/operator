import { MedicalAgent } from '../base/MedicalAgent';
import type { 
  MedicalContext, 
  ChatMessage, 
  ReportSection,
  AusMedicalReviewInput,
  AusMedicalReviewFinding,
  AusMedicalReviewReport
} from '@/types/medical.types';
import { LMStudioService } from '@/services/LMStudioService';
import { 
  AusMedicalReviewSystemPrompts,
  HeartFoundationResources,
  AustralianCVDRiskCalculator
} from './AusMedicalReviewSystemPrompts';

export class AusMedicalReviewAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Australian Medical Review Specialist',
      'Cardiology Quality Assurance',
      'Australian cardiology practice clinical oversight and pattern recognition',
      'ai-medical-review' as const,
      AusMedicalReviewSystemPrompts.ausMedicalReviewAgent.systemPrompt
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  public async process(input: string, context?: MedicalContext): Promise<AusMedicalReviewReport> {
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
      
      // Extract findings and metadata
      const reviewData = this.extractReviewData(response, reviewInput);
      
      // Create the specialized report
      const report = this.createAusMedicalReviewReport(
        response,
        sections,
        reviewData,
        context,
        Date.now() - startTime
      );
      
      // Update agent memory
      this.addProcedureMemory('australian-medical-review', {
        findingsCount: reviewData.findings.length,
        urgentFindings: reviewData.findings.filter(f => f.urgency === 'Immediate').length,
        guidelinesReferences: reviewData.guidelineReferences.length
      });
      
      return report;
      
    } catch (error) {
      console.error('❌ AusMedicalReviewAgent.process error:', error);
      
      // Return error report
      return this.createAusMedicalReviewReport(
        `Error processing medical review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [],
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
    const userPrompt = AusMedicalReviewSystemPrompts.ausMedicalReviewAgent.userPromptTemplate
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

  private parseReviewInput(input: string): AusMedicalReviewInput {
    // Parse structured input that contains background, investigations, and medications
    const lines = input.split('\n');
    let currentSection = '';
    const result: AusMedicalReviewInput = {
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
    // Split response by "FINDING:" markers to get individual findings
    const blocks = response.split(/(?=FINDING:)/i).filter(block => block.trim());
    return blocks.slice(1); // Remove first empty block
  }

  private parseFindingBlock(block: string): AusMedicalReviewFinding | null {
    try {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line);
      
      const finding: Partial<AusMedicalReviewFinding> = {};
      
      for (const line of lines) {
        if (line.startsWith('FINDING:')) {
          finding.finding = line.replace('FINDING:', '').trim();
        } else if (line.startsWith('AUSTRALIAN GUIDELINE:')) {
          finding.australianGuideline = line.replace('AUSTRALIAN GUIDELINE:', '').trim();
        } else if (line.startsWith('CLINICAL REASONING:')) {
          finding.clinicalReasoning = line.replace('CLINICAL REASONING:', '').trim();
        } else if (line.startsWith('RECOMMENDED ACTION:')) {
          finding.recommendedAction = line.replace('RECOMMENDED ACTION:', '').trim();
        } else if (line.startsWith('URGENCY:')) {
          const urgency = line.replace('URGENCY:', '').trim();
          if (['Immediate', 'Soon', 'Routine'].includes(urgency)) {
            finding.urgency = urgency as AusMedicalReviewFinding['urgency'];
          }
        }
      }
      
      // Validate required fields
      if (finding.finding && finding.australianGuideline && finding.clinicalReasoning && 
          finding.recommendedAction && finding.urgency) {
        return finding as AusMedicalReviewFinding;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to parse finding block:', error);
      return null;
    }
  }

  private formatFindingContent(finding: AusMedicalReviewFinding): string {
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

  private generateSummaryContent(findingsCount: number, response: string): string {
    let summary = `## Australian Medical Review Summary\n\n`;
    summary += `**Total Findings:** ${findingsCount}\n\n`;
    
    const urgentCount = (response.match(/URGENCY:\s*Immediate/gi) || []).length;
    const soonCount = (response.match(/URGENCY:\s*Soon/gi) || []).length;
    const routineCount = (response.match(/URGENCY:\s*Routine/gi) || []).length;
    
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

  private extractReviewData(response: string, input: AusMedicalReviewInput): AusMedicalReviewReport['reviewData'] {
    const findings = this.extractFindingBlocks(response)
      .map(block => this.parseFindingBlock(block))
      .filter((finding): finding is AusMedicalReviewFinding => finding !== null);

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

    return {
      findings,
      guidelineReferences,
      heartFoundationResources,
      cvdRiskCalculatorRecommended,
      aboriginalTorresStraitIslander,
      qtProlongationRisk,
      medicationSafetyIssues
    };
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
    const qtMeds = AusMedicalReviewSystemPrompts.ausMedicalPatterns.qtMedicationPatterns;
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

  private determineHeartFoundationResources(findings: AusMedicalReviewFinding[]): string[] {
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

  private createAusMedicalReviewReport(
    content: string,
    sections: ReportSection[],
    reviewData: AusMedicalReviewReport['reviewData'],
    context?: MedicalContext,
    processingTime = 0,
    confidence = 0.9,
    warnings: string[] = [],
    errors: string[] = []
  ): AusMedicalReviewReport {
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
      reviewData
    };
  }

}