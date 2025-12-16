import { MedicalAgent } from './MedicalAgent';
import type { MedicalContext, MedicalReport, ChatMessage, ReportSection, AgentType } from '@/types/medical.types';
import { LMStudioService } from '@/services/LMStudioService';

/**
 * Base class for narrative letter agents that emit clean prose paragraphs
 * for medical correspondence to referring doctors (Australian context).
 * 
 * Functional Rules:
 * - No salutation ("Dear ...") and no sign-off ("Kind regards ...")
 * - No headings — continuous prose paragraphs only
 * - Re-order to classic flow (History → Assessment → Plan) without adding headings
 * - Strip filler words/false starts; retain first-person voice
 * - Convert numbers to digits with units (e.g. 10 mg)
 * - Keep medication sentences inline, normalised as "atorvastatin 20 mg daily"
 * - Use Australian spelling & units
 * - If cleaned text < 50 words or confidence < 0.3, emit error message
 */
export abstract class NarrativeLetterAgent extends MedicalAgent {
  protected lmStudioService: LMStudioService;

  constructor(
    name: string,
    specialty: string,
    description: string,
    agentType: AgentType
  ) {
    const narrativeSystemPrompt = `You are a specialist physician creating narrative medical correspondence for referring doctors in Australian healthcare context.

CRITICAL REQUIREMENTS:
- Generate CLEAN PROSE PARAGRAPHS ONLY - no headings, no section headers, no bullet points
- NO salutation (Dear...) and NO sign-off (Kind regards...)
- Write continuous narrative paragraphs in first-person voice
- Re-order content to classic medical flow: History → Assessment → Recommendations/Plan
- Strip all filler words (um, uh, you know, etc.) and false starts
- Keep professional first-person voice (I examined, I found, I recommend)

TEXT FORMATTING RULES:
- Convert all numbers to digits with units: "10 mg", "65 years old", "3 months"
- Medication format: "atorvastatin 20mg daily", "metformin 500mg twice daily"
- Use Australian spelling: recognise, optimise, centre, favour, colour
- Use Australian units and terminology where appropriate

CONTENT ORGANISATION (without headings):
- Start with clinical presentation and relevant history
- Follow with examination findings and investigations
- Conclude with assessment and management recommendations
- Maintain logical paragraph flow throughout

QUALITY REQUIREMENTS:
- Minimum 50 words for coherent narrative
- Professional medical language appropriate for colleague communication
- Clear clinical reasoning without excessive technical jargon
- Specific medication names, doses, and timeframes where mentioned

Generate coherent narrative prose suitable for medical correspondence between colleagues.`;

    super(name, specialty, description, agentType, narrativeSystemPrompt);
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    
    try {
      console.log(`🩺 ${this.name} processing narrative letter...`);
      
      // Generate narrative content using LMStudio
      const rawContent = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input,
        this.agentType
      );

      // Clean and normalize the content
      const cleanedContent = this.cleanNarrativeText(rawContent);
      
      // Check for hallucinated material but don't halt - return content with warning
      const hasHallucination = this.detectHallucination(input, cleanedContent);
      const warnings: string[] = hasHallucination ? 
        ['Output may contain material not present in original dictation. Please review carefully.'] : 
        [];
      
      // Calculate confidence based on text quality, not section detection
      const confidence = this.calculateNarrativeConfidence(input, cleanedContent);
      
      // Check minimum requirements and format content
      const validation = this.validateAndFormatContent(cleanedContent, input, confidence);
      const errors: string[] = [];
      
      if (validation.hasError && validation.errorMessage) {
        errors.push(validation.errorMessage);
      }
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ ${this.name} completed in ${processingTime}ms`);

      return this.createReport(
        validation.content,
        [], // Narrative agents don't have sections
        context,
        processingTime,
        confidence,
        warnings,
        errors
      );

    } catch (error) {
      console.error(`❌ ${this.name} processing error:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      const truncatedInput = input.substring(0, 100);
      const fallbackContent = `${truncatedInput}${input.length > 100 ? '...' : ''}`;
      
      return this.createReport(
        fallbackContent,
        [],
        context,
        Date.now() - startTime,
        0.1,
        [], // no warnings
        [`Processing failed: ${errorMessage}`] // structured error
      );
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: input }
    ];
  }

  protected parseResponse(_response: string, _context?: MedicalContext): ReportSection[] {
    // Narrative agents don't use sections - return empty array
    return [];
  }

  /**
   * Clean and normalize narrative text according to functional rules
   */
  protected cleanNarrativeText(text: string): string {
    let cleaned = text;

    // Remove salutations and sign-offs (end-only). Do NOT remove 'Thank you' in body.
    cleaned = cleaned.replace(/^(Dear\s+[^,\n]+,?\s*)/gmi, '');
    cleaned = cleaned.replace(/(?:\r?\n|\r)(Kind\s+regards|Yours\s+sincerely|Best\s+wishes)[\s\S]*$/gmi, '');
    
    // Remove section headers and formatting
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, ''); // Remove **headings**
    cleaned = cleaned.replace(/^#+\s+.*/gm, ''); // Remove markdown headers
    cleaned = cleaned.replace(/^[-=]{2,}$/gm, ''); // Remove dividers
    
    // Strip filler words and false starts
    cleaned = cleaned.replace(/\b(um|uh|er|you know|like|I mean|actually|basically|sort of|kind of)\b/gi, '');
    cleaned = cleaned.replace(/\b(\w+)\s+\.\.\.\s+\1\b/gi, '$1'); // Remove repeated words with ...
    
    // Convert numbers to digits with units
    cleaned = cleaned.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(mg|mcg|g|ml|l|mmol\/l|mmhg|units?|years?|months?|weeks?|days?|hours?)\b/gi, (match, num, unit) => {
      const numbers: { [key: string]: string } = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
      };
      return `${numbers[num.toLowerCase()]} ${unit}`;
    });

    // Normalise medication format
    cleaned = cleaned.replace(/(\b[a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole)\b)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g)\s+(daily|once daily|twice daily|bd|od|tds)\b/gi, 
                            '$1 $2 $3 $4');

    // Australian spelling conversions
    const australianSpelling: { [key: string]: string } = {
      'recognize': 'recognise', 'optimize': 'optimise', 'center': 'centre',
      'favor': 'favour', 'color': 'colour', 'organize': 'organise',
      'realize': 'realise', 'analyze': 'analyse', 'defense': 'defence',
      'ischemia': 'ischaemia', 'ischemic': 'ischaemic',
      'furosemide': 'frusemide'
    };
    
    for (const [american, australian] of Object.entries(australianSpelling)) {
      const regex = new RegExp(`\\b${american}\\b`, 'gi');
      cleaned = cleaned.replace(regex, australian);
    }

    // Clean up whitespace and formatting
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Detect hallucinated content by counting novel tokens (>3 chars)
   * that never appeared in the original dictation. Threshold = 15.
   */
  protected detectHallucination(source: string, generated: string): boolean {
    const src = new Set((source.toLowerCase().match(/\b[a-z0-9]+\b/g) || []));
    const gen = generated.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    let novel = 0;
    for (const tok of gen) {
      if (tok.length > 3 && !src.has(tok)) {
        novel++;
        if (novel > 15) return true;
      }
    }
    return false;
  }

  /**
   * Calculate confidence based on text length and language quality
   * (not section detection like structured agents)
   */
  protected calculateNarrativeConfidence(input: string, output: string): number {
    let confidence = 0.5;
    
    // Input length factor
    if (input.length > 100) confidence += 0.1;
    if (input.length > 300) confidence += 0.1;
    if (input.length > 600) confidence += 0.1;
    
    // Output quality factors
    if (output.length > 50) confidence += 0.1;
    if (output.length > 150) confidence += 0.1;
    
    // Check for medical terminology
    const medicalTerms = /\b(patient|history|examination|assessment|recommend|medication|condition|treatment|follow.?up)\b/gi;
    const medicalMatches = (output.match(medicalTerms) || []).length;
    if (medicalMatches > 3) confidence += 0.1;
    if (medicalMatches > 6) confidence += 0.1;
    
    // Check for proper sentence structure
    const sentences = output.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 2) confidence += 0.1;
    if (sentences.length > 4) confidence += 0.1;

    // Penalty for remaining formatting issues
    if (output.includes('**') || output.includes('##')) confidence -= 0.2;
    if (output.toLowerCase().includes('dear ') || output.toLowerCase().includes('kind regards')) confidence -= 0.2;

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Validate content meets minimum requirements and format appropriately
   */
  protected validateAndFormatContent(content: string, originalInput: string, confidence: number): { content: string; hasError: boolean; errorMessage?: string } {
    const wordCount = content.trim().split(/\s+/).length;
    
    // Check minimum requirements
    if (wordCount < 50 || confidence < 0.3) {
      const truncatedInput = originalInput.substring(0, 100);
      return {
        content: `${truncatedInput}${originalInput.length > 100 ? '...' : ''}`,
        hasError: true,
        errorMessage: 'Dictation could not be parsed coherently due to insufficient content or low confidence.'
      };
    }

    return {
      content,
      hasError: false
    };
  }

}
