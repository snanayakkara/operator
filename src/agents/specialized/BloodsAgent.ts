/**
 * Bloods/Pathology Ordering Agent
 * Specialized for formatting voice-dictated blood test orders
 * into structured pathology requisitions
 */

import { MedicalAgent } from '../base/MedicalAgent';
import { BLOODS_SYSTEM_PROMPTS, BLOODS_MEDICAL_PATTERNS } from './BloodsSystemPrompts';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { applyASRCorrections } from '@/utils/ASRCorrections';
import type { 
  MedicalReport, 
  ReportSection, 
  MedicalContext,
  ChatMessage 
} from '@/types/medical.types';

export class BloodsAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Bloods Specialist',
      'Pathology',
      'Blood test and pathology ordering specialist',
      'bloods',
      BLOODS_SYSTEM_PROMPTS.primary
    );
    
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    console.log('🩸 BloodsAgent: Processing blood test order:', input.substring(0, 100));

    try {
      // Apply ASR corrections for common pathology terms
      const correctedInput = this.applyBloodsASRCorrections(input);
      console.log('🔄 Applied bloods ASR corrections:', correctedInput);

      // Build messages for AI processing
      const messages = this.buildMessages(correctedInput, context);
      
      // Get AI response using LMStudio service
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        correctedInput,
        'bloods'
      );
      console.log('🩸 BloodsAgent: Received AI response');

      // Parse the response into structured sections
      const sections = this.parseResponse(response, context);

      // Extract medical terms and patterns
      const medicalTerms = this.extractMedicalTerms(response);
      
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

  protected buildMessages(input: string, context?: MedicalContext): ChatMessage[] {
    return [
      {
        role: 'system',
        content: BLOODS_SYSTEM_PROMPTS.primary
      },
      {
        role: 'user', 
        content: BLOODS_SYSTEM_PROMPTS.userPromptTemplate.replace('{input}', input)
      }
    ];
  }

  protected parseResponse(response: string, context?: MedicalContext): ReportSection[] {
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
    for (const [abbrev, full] of Object.entries(BLOODS_MEDICAL_PATTERNS.expansionRules)) {
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

  /**
   * Apply ASR corrections specific to pathology/blood test terminology
   * Uses centralized ASR corrections from utils/ASRCorrections.ts
   */
  private applyBloodsASRCorrections(input: string): string {
    // Use centralized ASR corrections with pathology and laboratory categories
    const corrected = applyASRCorrections(input, ['pathology', 'laboratory']);

    // Log corrections made
    if (corrected !== input) {
      console.log('🔧 Blood test ASR corrections applied:', {
        original: input,
        corrected: corrected
      });
    }

    return corrected;
  }
}