/**
 * Unified Medical Text Cleaning Engine
 * Consolidates all text cleaning implementations across the application
 * 
 * Replaces:
 * - MedicalAgent.cleanMedicalText()
 * - NarrativeLetterAgent.cleanNarrativeText()  
 * - QuickLetterSummaryExtractor.cleanSummaryText()
 * - QuickLetterAgent.cleanNarrativeTextPreserveParagraphs()
 */

import { logger } from '@/utils/Logger';

export interface TextCleaningOptions {
  level: 'basic' | 'medical' | 'narrative' | 'summary';
  preserveParagraphs?: boolean;
  removeFillerWords?: boolean;
  normalizeNumbers?: boolean;
  medicalFormatting?: boolean;
  australianSpelling?: boolean;
}

export interface CleaningRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export class MedicalTextCleaner {
  private static instance: MedicalTextCleaner;
  private customRules: CleaningRule[] = [];

  private constructor() {
    logger.debug('MedicalTextCleaner initialized');
  }

  public static getInstance(): MedicalTextCleaner {
    if (!MedicalTextCleaner.instance) {
      MedicalTextCleaner.instance = new MedicalTextCleaner();
    }
    return MedicalTextCleaner.instance;
  }

  /**
   * Primary text cleaning interface
   * Consolidates all existing cleaning logic with configurable behavior
   */
  clean(text: string, options: TextCleaningOptions = { level: 'basic' }): string {
    let cleaned = text;

    // Apply cleaning based on level
    switch (options.level) {
      case 'basic':
        cleaned = this.cleanBasicWhitespace(cleaned);
        break;
      case 'medical':
        cleaned = this.cleanMedicalText(cleaned);
        break;
      case 'narrative':
        cleaned = this.cleanNarrativeText(cleaned, options.preserveParagraphs || false);
        break;
      case 'summary':
        cleaned = this.cleanSummaryText(cleaned);
        break;
    }

    // Apply optional enhancements
    if (options.removeFillerWords) {
      cleaned = this.removeFillerWords(cleaned);
    }
    if (options.normalizeNumbers) {
      cleaned = this.normalizeNumbers(cleaned);
    }
    if (options.medicalFormatting) {
      cleaned = this.applyMedicalFormatting(cleaned);
    }

    // Apply custom rules
    cleaned = this.applyCustomRules(cleaned);

    return cleaned;
  }

  /**
   * Basic whitespace and punctuation cleanup
   * Replaces: MedicalAgent.cleanMedicalText()
   */
  private cleanBasicWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
  }

  /**
   * Medical-specific text cleaning
   * Enhanced version of basic cleaning with medical awareness
   */
  private cleanMedicalText(text: string): string {
    let cleaned = this.cleanBasicWhitespace(text);
    
    // Medical-specific patterns
    cleaned = cleaned
      .replace(/\b(mg|mcg|g|ml|units?)\b/gi, (match) => match.toLowerCase())
      .replace(/\b(systolic|diastolic|blood pressure|BP)\b/gi, (match) => match.toLowerCase());

    return cleaned;
  }

  /**
   * Narrative text cleaning with medical formatting
   * Replaces: NarrativeLetterAgent.cleanNarrativeText()
   */
  private cleanNarrativeText(text: string, preserveParagraphs: boolean = false): string {
    let cleaned = text;

    // Remove salutations and sign-offs (preserve body "Thank you")
    cleaned = cleaned.replace(/^(Dear\s+[^,\n]+,?\s*)/gmi, '');
    cleaned = cleaned.replace(/(?:\r?\n|\r)(Kind\s+regards|Yours\s+sincerely|Best\s+wishes)[\s\S]*$/gmi, '');

    // Remove section headers and formatting
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '');
    cleaned = cleaned.replace(/^#+\s+.*/gm, '');
    cleaned = cleaned.replace(/^[-=]{2,}$/gm, '');

    // Strip filler words and false starts
    cleaned = this.removeFillerWords(cleaned);
    // Narrative outputs should be calm and readable; treat pause-commas from dictation as noise.
    cleaned = cleaned.replace(/,/g, '');
    cleaned = cleaned.replace(/\b(\w+)\s+\.\.\.\s+\1\b/gi, '$1');

    // Convert numbers to digits with units
    cleaned = this.normalizeNumbers(cleaned);

    // Medical formatting
    cleaned = this.applyMedicalFormatting(cleaned);

    // Clean whitespace while preserving paragraphs if requested
    if (preserveParagraphs) {
      cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n');
    } else {
      cleaned = this.cleanBasicWhitespace(cleaned);
    }

    return cleaned;
  }

  /**
   * Summary text cleaning with dash removal
   * Replaces: QuickLetterSummaryExtractor.cleanSummaryText()
   */
  private cleanSummaryText(text: string): string {
    return text
      .trim()
      .replace(/[-–—]+\s*$/, '')  // Remove trailing dashes
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .replace(/\.\s*\./g, '.')   // Remove duplicate periods
      .replace(/;\s*;/g, ';')     // Remove duplicate semicolons
      .replace(/,\s*,/g, ',')     // Remove duplicate commas
      .trim();
  }

  /**
   * Remove filler words and false starts
   */
  private removeFillerWords(text: string): string {
    return text.replace(/\b(um|uh|er|you know|like|I mean|actually|basically|sort of|kind of)\b/gi, '');
  }

  /**
   * Convert number words to digits with units
   */
  private normalizeNumbers(text: string): string {
    const numbers: { [key: string]: string } = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
    };

    return text.replace(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(mg|mcg|g|ml|l|mmol\/l|mmhg|units?|years?|months?|weeks?|days?|hours?)\b/gi,
      (match, num, unit) => `${numbers[num.toLowerCase()]} ${unit}`
    );
  }

  /**
   * Apply medical-specific formatting rules
   */
  private applyMedicalFormatting(text: string): string {
    let formatted = text;

    // Medication formatting
    formatted = formatted.replace(
      /(\b[a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole)\b)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g)\s+(daily|once daily|twice daily|bd|od|tds)\b/gi,
      '$1 $2$3 $4'
    );

    // Blood pressure formatting
    formatted = formatted.replace(/(\d{2,3})\s+on\s+(\d{2,3})/g, '$1/$2');

    return formatted;
  }

  /**
   * Apply custom cleaning rules
   */
  private applyCustomRules(text: string): string {
    let result = text;
    for (const rule of this.customRules) {
      result = result.replace(rule.pattern, rule.replacement);
    }
    return result;
  }

  /**
   * Add custom cleaning rule
   */
  addCustomRule(rule: CleaningRule): void {
    this.customRules.push(rule);
    logger.debug('Added custom cleaning rule', { description: rule.description });
  }

  /**
   * Set cleaning rules (replaces existing)
   */
  setCleaningRules(rules: CleaningRule[]): void {
    this.customRules = rules;
    logger.debug('Updated cleaning rules', { count: rules.length });
  }
}

// Convenience functions for backward compatibility
export function cleanMedicalText(text: string): string {
  return MedicalTextCleaner.getInstance().clean(text, { level: 'medical' });
}

export function cleanNarrativeText(text: string): string {
  return MedicalTextCleaner.getInstance().clean(text, { level: 'narrative' });
}

export function cleanSummaryText(text: string): string {
  return MedicalTextCleaner.getInstance().clean(text, { level: 'summary' });
}
