import type { 
  MedicalAgent as IMedicalAgent, 
  MedicalContext, 
  MedicalReport, 
  AgentMemory,
  ChatMessage,
  ReportSection,
  AgentType
} from '@/types/medical.types';
import { MedicalTextCleaner } from '@/utils/medical-text/TextCleaner';
import { MedicalPatternService, type MedicalTerm } from '@/utils/medical-text/MedicalPatternService';
import { logger } from '@/utils/Logger';

export abstract class MedicalAgent implements IMedicalAgent {
  public readonly name: string;
  public readonly specialty: string;
  public readonly description: string;
  public readonly agentType: AgentType;
  
  protected memory: AgentMemory;
  protected systemPrompt: string;
  
  // Consolidated capabilities
  private textCleaner: MedicalTextCleaner;
  private patternService: MedicalPatternService;
  
  constructor(
    name: string, 
    specialty: string, 
    description: string, 
    agentType: AgentType,
    systemPrompt: string
  ) {
    this.name = name;
    this.specialty = specialty;
    this.description = description;
    this.agentType = agentType;
    this.systemPrompt = systemPrompt;
    this.memory = this.initializeMemory();
    
    // Initialize consolidated capabilities
    this.textCleaner = MedicalTextCleaner.getInstance();
    this.patternService = MedicalPatternService.getInstance();
    
    logger.info(`Initialized MedicalAgent: ${name}`, {
      specialty,
      agentType,
      description
    });
  }

  abstract process(input: string, context?: MedicalContext): Promise<MedicalReport>;
  
  protected abstract buildMessages(input: string, context?: MedicalContext): ChatMessage[];
  
  protected abstract parseResponse(response: string, context?: MedicalContext): ReportSection[];

  public getMemory(): AgentMemory {
    return { ...this.memory };
  }

  public setMemory(memory: AgentMemory): void {
    this.memory = { ...memory };
  }

  protected updateMemory(key: string, value: any, isLongTerm = false): void {
    if (isLongTerm) {
      this.memory.longTerm[key] = value;
    } else {
      this.memory.shortTerm[key] = value;
    }
    this.memory.lastUpdated = Date.now();
  }

  protected getMemoryValue(key: string, fromLongTerm = false): any {
    return fromLongTerm ? this.memory.longTerm[key] : this.memory.shortTerm[key];
  }

  protected addProcedureMemory(type: string, details: Record<string, any>, outcome?: string): void {
    this.memory.procedures.push({
      type,
      date: Date.now(),
      details,
      outcome
    });
    
    // Keep only last 10 procedures
    if (this.memory.procedures.length > 10) {
      this.memory.procedures = this.memory.procedures.slice(-10);
    }
  }

  protected createReport(
    content: string, 
    sections: ReportSection[], 
    context?: MedicalContext,
    processingTime = 0,
    confidence = 0.9,
    warnings: string[] = [],
    errors: string[] = []
  ): MedicalReport {
    return {
      id: this.generateReportId(),
      agentName: this.name,
      content,
      sections,
      metadata: {
        procedureType: context?.procedureType,
        confidence,
        processingTime,
        modelUsed: 'LMStudio'
      },
      timestamp: Date.now(),
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Clean medical text using consolidated MedicalTextCleaner
   * Replaces legacy cleanMedicalText implementation
   */
  protected cleanMedicalText(text: string): string {
    return this.textCleaner.clean(text, { level: 'medical' });
  }

  /**
   * Extract medical terms using consolidated MedicalPatternService
   * Replaces legacy extractMedicalTerms implementation
   */
  protected extractMedicalTerms(text: string): string[] {
    // Use legacy-compatible method for backward compatibility
    return this.patternService.extractMedicalTermsLegacy(text);
  }

  /**
   * Enhanced medical term extraction with detailed information
   * Provides access to full MedicalTerm objects with confidence, context, etc.
   */
  protected async extractMedicalTermsDetailed(text: string): Promise<MedicalTerm[]> {
    return await this.patternService.extractMedicalTerms(text);
  }

  /**
   * Extract domain-specific medical terms
   */
  protected async extractCardiologyTerms(text: string) {
    return await this.patternService.extractCardiologyTerms(text);
  }

  protected async extractMedicationTerms(text: string) {
    return await this.patternService.extractMedicationTerms(text);
  }

  protected async extractPathologyTerms(text: string) {
    return await this.patternService.extractPathologyTerms(text);
  }


  private initializeMemory(): AgentMemory {
    return {
      shortTerm: {},
      longTerm: {},
      procedures: [],
      lastUpdated: Date.now()
    };
  }

  private generateReportId(): string {
    return `${this.agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

}
