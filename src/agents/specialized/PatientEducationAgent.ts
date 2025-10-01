import { MedicalAgent } from '../base/MedicalAgent';
import { 
  PATIENT_EDUCATION_SYSTEM_PROMPTS, 
  PATIENT_EDUCATION_CONFIG,
  PATIENT_EDUCATION_VALIDATION_RULES,
  type PatientEducationModule 
} from './PatientEducationSystemPrompts';
import type { MedicalContext, MedicalReport, ChatMessage, ReportSection, PatientInfo } from '@/types/medical.types';
import { LMStudioService } from '@/services/LMStudioService';

export interface PatientEducationInput {
  patientPriority: 'high' | 'medium' | 'low';
  selectedModules: string[];
  selectedSubFocus?: Record<string, string[]>; // moduleId -> subFocusIds[]
  emrData?: {
    demographics?: string;
    background?: string;
    medications?: string;
    investigations?: string;
  };
  patientData?: PatientInfo | null; // Structured patient demographics
  patientContext?: string;
}

interface MissingInformationDetection {
  completeness_score?: string;
  missing_patient_context?: string[];
  missing_lifestyle_context?: string[];
  missing_motivation_context?: string[];
  recommendations?: string[];
}

export interface PatientEducationReport extends MedicalReport {
  educationData: {
    priority: string;
    modules: string[];
    completenessScore?: string;
    australianGuidelines: string[];
    patientResources: string[];
  };
}

/**
 * Patient Education and Lifestyle Advice Agent
 * 
 * Generates personalized, evidence-based lifestyle advice for cardiovascular patients
 * following Australian medical guidelines and Heart Foundation recommendations.
 * 
 * IMPORTANT: This agent provides lifestyle education only - no diagnostic statements
 * or medication recommendations are allowed.
 */
export class PatientEducationAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Patient Education Agent',
      'Patient Education & Lifestyle Medicine',
      'Generates personalized lifestyle advice and education for cardiovascular patients following Australian guidelines',
      'patient-education',
      PATIENT_EDUCATION_SYSTEM_PROMPTS.primary
    );
    
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<PatientEducationReport> {
    const startTime = Date.now();
    
    try {
      // Parse the input - could be direct PatientEducationInput or text to parse
      const educationInput = this.parseInput(input);
      
      // Build the contextual prompt
      const messages = this.buildMessages(input, context);
      
      // Get the model response
      const userMessage = messages.find(m => m.role === 'user');
      const userPrompt = typeof userMessage?.content === 'string'
        ? userMessage.content
        : Array.isArray(userMessage?.content)
          ? userMessage.content
              .map(part => (part.type === 'text' ? part.text : ''))
              .join('\n')
              .trim() || input
          : input;
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        userPrompt,
        this.agentType
      );

      // Parse and validate the response
      const sections = this.parseResponse(response, context);
      const cleanedContent = this.cleanAndValidateEducationContent(response, educationInput);
      
      // Extract Australian guidelines and resources mentioned
      const australianGuidelines = this.extractAustralianGuidelines(cleanedContent);
      const patientResources = this.extractPatientResources(cleanedContent);
      
      // Validate content for safety and quality
      const validation = this.validateEducationContent(cleanedContent, educationInput);
      const warnings: string[] = [];
      const errors: string[] = [];
      
      if (validation.hasProhibitedContent) {
        errors.push('Generated content contained prohibited medical advice and has been filtered');
      }
      
      if (validation.missingRequiredElements.length > 0) {
        warnings.push(`Content may benefit from including: ${validation.missingRequiredElements.join(', ')}`);
      }
      
      // Detect missing information that could improve personalization
      let missingInfo: MissingInformationDetection;
      try {
        missingInfo = await this.detectMissingInformation(educationInput);
      } catch (error) {
        console.warn('Failed to detect missing information:', error);
        missingInfo = this.fallbackMissingInfoDetection(educationInput);
      }

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(cleanedContent, educationInput);
      
      const report = this.createReport(
        cleanedContent,
        sections,
        context,
        processingTime,
        confidence,
        warnings,
        errors
      ) as PatientEducationReport;

      // Add patient education specific data
      report.educationData = {
        priority: educationInput.patientPriority,
        modules: educationInput.selectedModules,
        completenessScore: missingInfo.completeness_score,
        australianGuidelines,
        patientResources
      };

      // Add missing information to metadata
      if (missingInfo) {
        report.metadata.missingInformation = missingInfo;
      }

      return report;

    } catch (error) {
      console.error('❌ Patient Education processing failed:', error);
      throw error;
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    // Parse the input into structured format
    const educationInput = this.parseInput(input);
    
    // Get module labels for the prompt
    const selectedModuleLabels = educationInput.selectedModules
      .map(moduleId => {
        const module = PATIENT_EDUCATION_CONFIG.modules.find(m => m.id === moduleId);
        return module ? module.label : moduleId;
      })
      .join(', ');

    // Build sub-focus details if any are selected
    let subFocusDetails = '';
    if (educationInput.selectedSubFocus && Object.keys(educationInput.selectedSubFocus).length > 0) {
      const subFocusLines = [];
      
      for (const [moduleId, subFocusIds] of Object.entries(educationInput.selectedSubFocus)) {
        const module = PATIENT_EDUCATION_CONFIG.modules.find(m => m.id === moduleId);
        if (module && module.subFocusPoints) {
          const selectedSubFocusLabels = subFocusIds
            .map(subId => {
              const subFocus = module.subFocusPoints?.find(sf => sf.id === subId);
              return subFocus ? `• ${subFocus.label}: ${subFocus.description}` : null;
            })
            .filter(Boolean)
            .join('\n  ');
          
          if (selectedSubFocusLabels) {
            subFocusLines.push(`${module.label} - Specific Focus Areas:\n  ${selectedSubFocusLabels}`);
          }
        }
      }
      
      if (subFocusLines.length > 0) {
        subFocusDetails = 'SPECIFIC FOCUS AREAS:\n' + subFocusLines.join('\n\n') + '\n';
      }
    }

    // Build structured demographics from PatientInfo
    const patientInfo = educationInput.patientData;
    const structuredDemographics = patientInfo ? 
      `Name: ${patientInfo.name || 'Not provided'}
Age: ${patientInfo.age || 'Not provided'}
Date of Birth: ${patientInfo.dob || 'Not provided'}
Patient ID: ${patientInfo.id || 'Not provided'}
${patientInfo.phone ? `Phone: ${patientInfo.phone}` : ''}
${patientInfo.email ? `Email: ${patientInfo.email}` : ''}
${patientInfo.medicare ? `Medicare: ${patientInfo.medicare}` : ''}` : 'No patient data available';

    // Build the user prompt with template substitution
    const userPrompt = PATIENT_EDUCATION_SYSTEM_PROMPTS.promptTemplate
      .replace('{priority}', educationInput.patientPriority)
      .replace('{selectedModules}', selectedModuleLabels)
      .replace('{demographics}', structuredDemographics)
      .replace('{age}', patientInfo?.age || 'Not provided')
      .replace('{patientName}', patientInfo?.name || 'Not provided')
      .replace('{background}', educationInput.emrData?.background || 'Not provided')
      .replace('{medications}', educationInput.emrData?.medications || 'Not provided')
      .replace('{investigations}', educationInput.emrData?.investigations || 'Not provided')
      .replace('{patientContext}', educationInput.patientContext || 'Not specified')
      .replace('{subFocusDetails}', subFocusDetails);

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
    
    // Split content by headings (## format)
    const sectionMatches = response.match(/## ([^#\n]+)[\s\S]*?(?=## |$)/g);
    
    if (sectionMatches) {
      sectionMatches.forEach(sectionText => {
        const titleMatch = sectionText.match(/## ([^#\n]+)/);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          const content = sectionText.replace(/## [^#\n]+\n/, '').trim();
          
          sections.push({
            title,
            content,
            type: 'narrative',
            priority: 'medium'
          });
        }
      });
    }

    // If no sections found, treat entire response as single section
    if (sections.length === 0) {
      sections.push({
        title: 'Patient Education Advice',
        content: response.trim(),
        type: 'narrative',
        priority: 'medium'
      });
    }

    return sections;
  }

  /**
   * Parse input string into structured PatientEducationInput
   */
  private parseInput(input: string): PatientEducationInput {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(input);
      if (parsed.patientPriority && parsed.selectedModules) {
        return parsed as PatientEducationInput;
      }
    } catch {
      // If not JSON, create default structure
    }

    // Fallback: analyze text input to determine modules
    const priority = this.inferPriority(input);
    const modules = this.inferModulesFromText(input);
    
    return {
      patientPriority: priority,
      selectedModules: modules.length > 0 ? modules : ['diet_nutrition', 'physical_activity'], // Default modules
      patientContext: input
    };
  }

  /**
   * Infer priority from text content
   */
  private inferPriority(text: string): 'high' | 'medium' | 'low' {
    const lowercaseText = text.toLowerCase();
    
    if (lowercaseText.includes('recent') && (lowercaseText.includes('heart attack') || lowercaseText.includes('surgery'))) {
      return 'high';
    }
    
    if (lowercaseText.includes('high risk') || lowercaseText.includes('diabetes') || lowercaseText.includes('urgent')) {
      return 'high';
    }
    
    if (lowercaseText.includes('prevention') || lowercaseText.includes('wellness') || lowercaseText.includes('routine')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Infer relevant modules from text content
   */
  private inferModulesFromText(text: string): string[] {
    const lowercaseText = text.toLowerCase();
    const relevantModules: string[] = [];
    
    PATIENT_EDUCATION_CONFIG.modules.forEach(module => {
      const hasRelevantKeywords = module.keywords.some(keyword => 
        lowercaseText.includes(keyword.toLowerCase())
      );
      
      if (hasRelevantKeywords) {
        relevantModules.push(module.id);
      }
    });
    
    return relevantModules;
  }

  /**
   * Clean and validate education content for safety
   */
  private cleanAndValidateEducationContent(content: string, _input: PatientEducationInput): string {
    let cleaned = content;
    
    // Apply Australian spelling corrections
    Object.entries(PATIENT_EDUCATION_VALIDATION_RULES.australianSpelling).forEach(([american, australian]) => {
      const regex = new RegExp(`\\b${american}\\b`, 'gi');
      cleaned = cleaned.replace(regex, australian);
    });
    
    // Remove any prohibited diagnostic language
    PATIENT_EDUCATION_VALIDATION_RULES.prohibitedPhrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      cleaned = cleaned.replace(regex, '[CONTENT FILTERED FOR SAFETY]');
    });
    
    // Ensure proper paragraph structure
    cleaned = this.formatParagraphsForReadability(cleaned);
    
    // Add disclaimer if high priority
    if (_input.patientPriority === 'high') {
      cleaned += '\n\n**Important:** This information is for general education only. Always follow your healthcare team\'s specific advice and contact them with any concerns.';
    }
    
    return cleaned.trim();
  }

  /**
   * Format content for better readability with grouped paragraphs
   */
  private formatParagraphsForReadability(content: string): string {
    // Preserve existing paragraph breaks and headers
    let formatted = content;
    
    // Ensure proper spacing around headers
    formatted = formatted.replace(/(\n)(## [^\n]+)(\n)/g, '$1$1$2$1$1');
    
    // Ensure lists are properly formatted
    formatted = formatted.replace(/(\n)([•·*-] )/g, '$1$2');
    
    // Clean up excessive whitespace while preserving intentional breaks
    formatted = formatted.replace(/\n{4,}/g, '\n\n\n');
    
    return formatted;
  }

  /**
   * Validate education content for compliance and quality
   */
  private validateEducationContent(content: string, _input: PatientEducationInput): {
    hasProhibitedContent: boolean;
    missingRequiredElements: string[];
    qualityScore: number;
  } {
    const hasProhibitedContent = PATIENT_EDUCATION_VALIDATION_RULES.prohibitedPhrases
      .some(phrase => content.toLowerCase().includes(phrase.toLowerCase()));
    
    const missingRequiredElements = PATIENT_EDUCATION_VALIDATION_RULES.requiredElements
      .filter(element => !content.toLowerCase().includes(element.toLowerCase()));
    
    // Calculate quality score based on completeness and compliance
    let qualityScore = 100;
    if (hasProhibitedContent) qualityScore -= 50;
    qualityScore -= (missingRequiredElements.length * 10);
    qualityScore = Math.max(0, qualityScore);
    
    return {
      hasProhibitedContent,
      missingRequiredElements,
      qualityScore
    };
  }

  /**
   * Extract mentions of Australian guidelines
   */
  private extractAustralianGuidelines(content: string): string[] {
    const guidelines: string[] = [];
    const guidelinePatterns = [
      /Australian.*Guidelines?/gi,
      /Heart Foundation/gi,
      /NHMRC/gi,
      /Australian Dietary Guidelines/gi,
      /Physical Activity Guidelines/gi,
      /Therapeutic Guidelines/gi
    ];
    
    guidelinePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        guidelines.push(...matches);
      }
    });
    
    return [...new Set(guidelines)];
  }

  /**
   * Extract patient resources mentioned
   */
  private extractPatientResources(content: string): string[] {
    const resources: string[] = [];
    const resourcePatterns = [
      /heartfoundation\.org\.au/gi,
      /Quitline.*\d{4,}/gi,
      /DirectLine.*\d{4,}/gi,
      /Lifeline.*\d{4,}/gi,
      /Beyond Blue.*\d{4,}/gi,
      /My QuitBuddy/gi
    ];
    
    resourcePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        resources.push(...matches);
      }
    });
    
    return [...new Set(resources)];
  }

  /**
   * Calculate confidence score based on content quality and completeness
   */
  private calculateConfidence(content: string, input: PatientEducationInput): number {
    let confidence = 0.8; // Base confidence
    
    // Higher confidence if multiple modules addressed
    if (input.selectedModules.length >= 3) {
      confidence += 0.1;
    }
    
    // Higher confidence if Australian resources mentioned
    if (content.includes('Heart Foundation') || content.includes('Australian')) {
      confidence += 0.05;
    }
    
    // Higher confidence if practical steps included
    if (content.includes('Practical') || content.includes('Steps') || content.includes('•')) {
      confidence += 0.05;
    }
    
    // Lower confidence if content is too short
    if (content.length < 500) {
      confidence -= 0.1;
    }
    
    return Math.min(0.95, Math.max(0.6, confidence));
  }

  /**
   * Detect missing information for better personalization
   */
  private async detectMissingInformation(input: PatientEducationInput): Promise<MissingInformationDetection> {
    try {
      const analysisPrompt = `${PATIENT_EDUCATION_SYSTEM_PROMPTS.missingInfoDetection}

PATIENT EDUCATION REQUEST:
Priority: ${input.patientPriority}
Selected Modules: ${input.selectedModules.join(', ')}
Demographics: ${input.emrData?.demographics || 'Not provided'}
Background: ${input.emrData?.background || 'Not provided'}
Medications: ${input.emrData?.medications || 'Not provided'}
Investigations: ${input.emrData?.investigations || 'Not provided'}
Additional Context: ${input.patientContext || 'Not provided'}`;

      const response = await this.lmStudioService.processWithAgent(
        'You are analyzing a patient education request to identify missing information that would improve personalization.',
        analysisPrompt,
        'patient-education'
      );

      try {
        return JSON.parse(response.replace(/```json|```/g, '').trim()) as MissingInformationDetection;
      } catch (parseError) {
        return this.fallbackMissingInfoDetection(input);
      }

    } catch (error) {
      console.error('❌ Error detecting missing information:', error);
      return this.fallbackMissingInfoDetection(input);
    }
  }

  /**
   * Fallback missing information detection using heuristics
   */
  private fallbackMissingInfoDetection(input: PatientEducationInput): MissingInformationDetection {
    const missing = {
      completeness_score: "75%",
      missing_patient_context: [] as string[],
      missing_lifestyle_context: [] as string[],
      missing_motivation_context: [] as string[],
      recommendations: [] as string[]
    };

    // Check patient context
    if (!input.emrData?.demographics) {
      missing.missing_patient_context.push('Patient age, gender, or other demographics');
    }
    
    if (!input.emrData?.background) {
      missing.missing_patient_context.push('Medical history or current conditions');
    }

    // Check lifestyle context
    if (!input.patientContext?.includes('current') && !input.patientContext?.includes('currently')) {
      missing.missing_lifestyle_context.push('Current lifestyle habits and behaviors');
    }

    // Check motivation context
    if (input.selectedModules.length <= 2) {
      missing.missing_motivation_context.push('Specific areas of interest or concern');
    }

    // Recommendations
    if (missing.missing_patient_context.length > 0 || missing.missing_lifestyle_context.length > 0) {
      missing.recommendations.push('More specific patient information would allow for more personalized advice');
      missing.completeness_score = "60%";
    }

    return missing;
  }

  /**
   * Get available education modules
   */
  public static getAvailableModules(): PatientEducationModule[] {
    return PATIENT_EDUCATION_CONFIG.modules;
  }

  /**
   * Get priority options
   */
  public static getPriorityOptions(): Array<{ value: string; label: string; description: string }> {
    return PATIENT_EDUCATION_CONFIG.priorities;
  }
}
