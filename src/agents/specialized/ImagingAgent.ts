/**
 * Imaging/Radiology Ordering Agent
 * Specialized for formatting voice-dictated imaging orders
 * into structured radiology requisitions
 */

import { MedicalAgent } from '../base/MedicalAgent';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { IMAGING_MEDICAL_PATTERNS } from './ImagingSystemPrompts';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import type { 
  MedicalReport, 
  ReportSection, 
  MedicalContext,
  ChatMessage 
} from '@/types/medical.types';

export class ImagingAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private systemPromptInitialized = false;

  constructor() {
    super(
      'Imaging Specialist',
      'Radiology',
      'Medical imaging and radiology ordering specialist',
      'imaging',
      '' // Will be loaded dynamically
    );
    
    this.lmStudioService = LMStudioService.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('imaging', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ ImagingAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a medical imaging and radiology ordering specialist.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    console.log('📷 ImagingAgent: Processing imaging order:', input.substring(0, 100));

    try {
      // Note: buildMessages could be used for custom message formatting if needed
      
      // Get AI response using LMStudio service
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input,
        'imaging'
      );
      console.log('📷 ImagingAgent: Received AI response');

      // Parse the response into structured sections
      const sections = this.parseResponse(response, context);

      // Note: Medical terms extraction available if needed for advanced processing
      
      // Build final report
      const report: MedicalReport = {
        id: `imaging-${Date.now()}`,
        agentName: this.name,
        timestamp: Date.now(),
        content: response,
        sections,
        metadata: {
          processingTime: Date.now() - startTime,
          modelUsed: MODEL_CONFIG.REASONING_MODEL,
          confidence: 0.9
        }
      };

      console.log('📷 ImagingAgent: Report generated successfully');
      return report;

    } catch (error) {
      console.error('❌ ImagingAgent processing failed:', error);
      throw new Error(`Imaging order failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        content: `Please format this voice-dictated imaging order into structured radiology requisitions:

"${input}"

Format into ↪ arrow structure for each imaging study with clinical indications and urgency as appropriate.`
      }
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const sections: ReportSection[] = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    let currentSection: ReportSection | null = null;
    
    for (const line of lines) {
      if (line.startsWith('↪')) {
        // New imaging study
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
        // Clinical indication or additional details
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
    
    return sections;
  }

  protected extractMedicalTerms(text: string): string[] {
    const terms = new Set<string>();
    const input = text.toLowerCase();

    // Extract common imaging study patterns
    IMAGING_MEDICAL_PATTERNS.commonStudies.forEach(study => {
      if (input.includes(study.toLowerCase())) {
        terms.add(study);
      }
    });

    // Extract clinical indication patterns
    IMAGING_MEDICAL_PATTERNS.clinicalIndications.forEach(indication => {
      if (input.includes(indication.toLowerCase())) {
        terms.add(indication);
      }
    });

    // Extract anatomical region patterns
    IMAGING_MEDICAL_PATTERNS.anatomicalRegions.forEach(region => {
      if (input.includes(region.toLowerCase())) {
        terms.add(region);
      }
    });

    // Extract imaging-specific terms
    const imagingPatterns = [
      // Modalities
      /\b(?:CT|MRI|MR|ultrasound|US|echocardiogram|angiogram|nuclear)\b/gi,
      // Contrast
      /\b(?:contrast|gadolinium|iodine|non-contrast)\b/gi,
      // Anatomical regions
      /\b(?:coronary|cardiac|thoracic|abdominal|pelvic|cerebral|spinal)\b/gi,
      // Clinical context
      /\b(?:acute|chronic|follow-up|baseline|pre-operative|post-operative)\b/gi,
      // Urgency
      /\b(?:urgent|routine|semi-urgent|emergency)\b/gi
    ];

    imagingPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => terms.add(match));
      }
    });

    return Array.from(terms);
  }

  private extractImagingStudies(response: string): string[] {
    const studies: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('↪')) {
        studies.push(line.substring(1).trim());
      }
    }
    
    return studies;
  }

  private identifyCommonStudies(input: string): string[] {
    const identified: string[] = [];
    const inputLower = input.toLowerCase();
    
    // Check for common study abbreviations and expansions
    for (const [abbrev] of Object.entries(IMAGING_MEDICAL_PATTERNS.expansionRules)) {
      if (inputLower.includes(abbrev.toLowerCase())) {
        identified.push(abbrev);
      }
    }
    
    return identified;
  }

  private extractClinicalIndications(response: string): string[] {
    const indications: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.includes('Clinical indication:')) {
        const indication = line.substring(line.indexOf('Clinical indication:') + 'Clinical indication:'.length).trim();
        if (indication) {
          indications.push(indication);
        }
      }
    }
    
    return indications;
  }

  // Additional utility methods for imaging orders
  public formatImagingOrder(studies: string[], clinicalContext?: string): string {
    let order = '';
    
    studies.forEach(study => {
      order += `↪ ${study}\n`;
      if (clinicalContext) {
        order += `- Clinical indication: ${clinicalContext}\n`;
      }
      order += '\n';
    });
    
    return order.trim();
  }

  public expandAbbreviation(abbrev: string): string {
    return IMAGING_MEDICAL_PATTERNS.expansionRules[abbrev as keyof typeof IMAGING_MEDICAL_PATTERNS.expansionRules] || abbrev;
  }

  public formatClinicalIndication(indication: string, urgency?: string): string {
    let formatted = `- Clinical indication: ${indication}`;
    if (urgency) {
      formatted += ` (${urgency})`;
    }
    return formatted;
  }
}