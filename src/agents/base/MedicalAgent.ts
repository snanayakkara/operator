import type { 
  MedicalAgent as IMedicalAgent, 
  MedicalContext, 
  MedicalReport, 
  AgentMemory,
  ChatMessage,
  ReportSection,
  AgentType
} from '@/types/medical.types';

export abstract class MedicalAgent implements IMedicalAgent {
  public readonly name: string;
  public readonly specialty: string;
  public readonly description: string;
  public readonly agentType: AgentType;
  
  protected memory: AgentMemory;
  protected systemPrompt: string;
  
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

  protected cleanMedicalText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
  }

  protected extractMedicalTerms(text: string): string[] {
    const medicalPatterns = [
      /\b(?:mg|mcg|g|ml|cc|units?)\b/gi,
      /\b\d+\s*(?:mg|mcg|g|ml|cc|units?)\b/gi,
      /\b(?:systolic|diastolic|blood pressure|BP)\b/gi,
      /\b(?:EF|ejection fraction)\s*(?:of\s*)?\d+%?\b/gi,
      /\b(?:stenosis|regurgitation|insufficiency)\b/gi,
      // Enhanced stenosis terminology patterns - preserve qualitative terms
      /\b(?:mild|moderate|severe|critical)\s+(?:stenosis|regurgitation|insufficiency)\b/gi,
      /\b(?:stenosis|regurgitation|insufficiency)\s+(?:mild|moderate|severe|critical)\b/gi,
      // TIMI flow patterns - preserve descriptive language
      /\b(?:TIMI|timi)\s+(?:flow\s+)?(?:0|I|II|III|zero|one|two|three)\b/gi,
      /\b(?:normal|delayed|absent|complete)\s+(?:flow|perfusion)\b/gi,
      // Percentage patterns with context
      /\b\d+(?:-\d+)?%\s+stenosis\b/gi,
      /\bstenosis\s+\d+(?:-\d+)?%\b/gi
    ];
    
    const terms: string[] = [];
    medicalPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        terms.push(...matches);
      }
    });
    
    return [...new Set(terms)];
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