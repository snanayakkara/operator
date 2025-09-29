/**
 * Bloods/Pathology Ordering Agent
 * Specialized for formatting voice-dictated blood test orders
 * into structured pathology requisitions
 */

import { MedicalAgent } from '../base/MedicalAgent';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { BLOODS_MEDICAL_PATTERNS } from './BloodsSystemPrompts';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';
import type { 
  MedicalReport, 
  ReportSection, 
  MedicalContext,
  ChatMessage 
} from '@/types/medical.types';

export class BloodsAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private asrEngine: ASRCorrectionEngine;
  private systemPromptInitialized = false;

  constructor() {
    super(
      'Bloods Specialist',
      'Pathology',
      'Blood test and pathology ordering specialist',
      'bloods',
      '' // Will be loaded dynamically
    );
    
    this.lmStudioService = LMStudioService.getInstance();
    this.asrEngine = ASRCorrectionEngine.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('bloods', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ BloodsAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a blood test and pathology ordering specialist.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    console.log('🩸 BloodsAgent: Processing blood test order:', input.substring(0, 100));

    try {
      // Apply ASR corrections for pathology terms using consolidated engine
      const correctedInput = await this.asrEngine.applyPathologyCorrections(input);
      console.log('🔄 Applied consolidated pathology ASR corrections:', correctedInput);

      // Note: buildMessages could be used for custom message formatting if needed
      
      // Get AI response using LMStudio service
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        correctedInput,
        'bloods'
      );
      console.log('🩸 BloodsAgent: Received AI response');

      // Parse the response into structured sections
      const sections = this.parseResponse(response, context);

      // Note: Medical terms extraction available if needed for advanced processing
      
      // Build final report
      const report: MedicalReport = {
        id: `bloods-${Date.now()}`,
        agentName: this.name,
        timestamp: Date.now(),
        content: response,
        sections,
        metadata: {
          processingTime: Date.now() - startTime,
          modelUsed: MODEL_CONFIG.QUICK_MODEL,
          confidence: 0.9
        }
      };

      console.log('🩸 BloodsAgent: Report generated successfully');
      return report;

    } catch (error) {
      console.error('❌ BloodsAgent processing failed:', error);
      throw new Error(`Blood test ordering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: `Please format this voice-dictated blood test order into structured pathology requisitions:

"${input}"

Format into ↪ arrow structure for each blood test with clinical indications and urgency as appropriate.`
      }
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const sections: ReportSection[] = [];
    
    // Clean the response by removing any AI conversational text
    const cleanedResponse = response.replace(/^(Okay,|Here is|Here's).*?:?\s*/i, '').trim();
    
    // For the new comma-separated format, create a single section
    if (cleanedResponse && !cleanedResponse.includes('↪')) {
      sections.push({
        title: 'Blood Tests Ordered',
        content: cleanedResponse,
        type: 'structured',
        priority: 'medium'
      });
    } else {
      // Fallback to old arrow format parsing for backward compatibility
      const lines = response.split('\n').filter(line => line.trim());
      let currentSection: ReportSection | null = null;
      
      for (const line of lines) {
        if (line.startsWith('↪')) {
          // New test group
          if (currentSection) {
            sections.push(currentSection);
          }
          
          currentSection = {
            title: line.substring(1).trim(),
            content: line,
            type: 'structured',
            priority: 'medium'
          };
        } else if (line.startsWith('-') && currentSection) {
          // Sub-test under current group
          currentSection.content += '\n' + line;
        } else if (line.trim() && currentSection) {
          // Additional content for current section
          currentSection.content += '\n' + line;
        }
      }
      
      // Add the final section
      if (currentSection) {
        sections.push(currentSection);
      }
    }
    
    return sections;
  }

  protected extractMedicalTerms(text: string): string[] {
    const terms = new Set<string>();
    const input = text.toLowerCase();

    // For comma-separated format, split by commas and extract each test
    if (!text.includes('↪')) {
      const tests = text.split(',').map(test => test.trim());
      tests.forEach(test => {
        if (test) {
          // Add the full test name
          terms.add(test);
          
          // Also check for known abbreviations
          BLOODS_MEDICAL_PATTERNS.commonTests.forEach(commonTest => {
            if (test.toLowerCase().includes(commonTest.toLowerCase())) {
              terms.add(commonTest);
            }
          });
        }
      });
    } else {
      // Fallback to pattern matching for arrow format
      BLOODS_MEDICAL_PATTERNS.commonTests.forEach(test => {
        if (input.includes(test.toLowerCase())) {
          terms.add(test);
        }
      });
    }

    // Extract pathology-specific terms using patterns
    const pathologyPatterns = [
      // Test categories
      /\b(?:haematology|biochemistry|immunology|microbiology)\b/gi,
      // Specific tests
      /\b(?:troponin|creatinine|cholesterol|triglycerides|glucose|HbA1c|FBE|EUC|TFT|LFTs|CRP|ESR)\b/gi,
      // Units and values
      /\b\d+\.?\d*\s*(?:mmol\/L|mg\/dL|g\/L|%|units\/L)\b/gi,
      // Fasting requirements
      /\b(?:fasting|non-fasting|random)\s+(?:glucose|lipids|sample)\b/gi,
      // Clinical context
      /\b(?:diabetes|cardiovascular|cardiac|renal|hepatic)\s+(?:monitoring|assessment|risk)\b/gi
    ];

    pathologyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => terms.add(match));
      }
    });

    return Array.from(terms);
  }

  private extractTestGroups(response: string): string[] {
    // For comma-separated format, split by commas
    if (!response.includes('↪')) {
      return response.split(',').map(test => test.trim()).filter(test => test.length > 0);
    }
    
    // Fallback to arrow format parsing
    const groups: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('↪')) {
        groups.push(line.substring(1).trim());
      }
    }
    
    return groups;
  }

  private identifyCommonTests(input: string): string[] {
    const identified: string[] = [];
    const inputLower = input.toLowerCase();
    
    // Check for common test abbreviations and expansions
    for (const [abbrev] of Object.entries(BLOODS_MEDICAL_PATTERNS.expansionRules)) {
      if (inputLower.includes(abbrev.toLowerCase())) {
        identified.push(abbrev);
      }
    }
    
    return identified;
  }

  // Additional utility methods for blood test ordering
  public formatPathologyOrder(tests: string[], clinicalContext?: string): string {
    let order = '';
    
    tests.forEach(test => {
      order += `↪ ${test}\n`;
    });
    
    if (clinicalContext) {
      order += `\nClinical indication: ${clinicalContext}`;
    }
    
    return order;
  }

  public expandAbbreviation(abbrev: string): string {
    return BLOODS_MEDICAL_PATTERNS.expansionRules[abbrev as keyof typeof BLOODS_MEDICAL_PATTERNS.expansionRules] || abbrev;
  }

}