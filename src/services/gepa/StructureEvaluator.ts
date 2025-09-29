/**
 * GEPA Structure Evaluator
 *
 * Evaluates the structural correctness of medical reports including:
 * - Required sections and headings
 * - Forbidden elements (greetings, sign-offs)
 * - Length constraints
 * - Paragraph structure and flow
 */

import type {
  GEPAEvaluator,
  GEPAEvaluationResult,
  StructureEvaluationCriteria
} from './GEPATypes';
import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

export class StructureEvaluator implements GEPAEvaluator<StructureEvaluationCriteria> {
  public readonly name = 'StructureEvaluator';
  public readonly description = 'Evaluates structural correctness and format compliance of medical reports';

  private criteria: StructureEvaluationCriteria;

  constructor(criteria?: StructureEvaluationCriteria) {
    this.criteria = criteria || this.getDefaultCriteria();
  }


  /**
   * Evaluate report structure
   */
  async evaluate(reportText: string, criteria?: StructureEvaluationCriteria): Promise<GEPAEvaluationResult> {
    const evalCriteria = criteria || this.criteria;
    const startTime = Date.now();

    try {
      logger.debug('Starting structure evaluation', {
        component: 'StructureEvaluator',
        reportLength: reportText.length
      });

      const results = await Promise.all([
        this.evaluateRequiredSections(reportText, evalCriteria.requiredSections),
        this.evaluateForbiddenElements(reportText, evalCriteria.forbiddenElements),
        this.evaluateLength(reportText, evalCriteria.minLength, evalCriteria.maxLength),
        this.evaluateParagraphStructure(reportText, evalCriteria.paragraphStructure)
      ]);

      // Calculate overall score
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      const maxScore = results.reduce((sum, result) => sum + result.maxScore, 0);
      const overallScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      // Compile feedback
      const allFeedback = results.map(r => r.feedback).filter(f => f);
      const allSuggestions = results.flatMap(r => r.suggestions);

      const result: GEPAEvaluationResult = {
        criteria: 'structure',
        score: Math.round(overallScore),
        maxScore: 100,
        passed: overallScore >= 80, // 80% threshold for passing
        feedback: allFeedback.join(' '),
        suggestions: allSuggestions,
        metadata: {
          subResults: results,
          processingTimeMs: Date.now() - startTime,
          criteriaUsed: evalCriteria
        }
      };

      logger.debug('Structure evaluation completed', {
        component: 'StructureEvaluator',
        score: result.score,
        passed: result.passed,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Structure evaluation failed', {
        component: 'StructureEvaluator',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        criteria: 'structure',
        score: 0,
        maxScore: 100,
        passed: false,
        feedback: `Structure evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Please retry the evaluation'],
        metadata: {
          error: true,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Evaluate required sections
   */
  private async evaluateRequiredSections(text: string, requiredSections: string[]): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const textLower = text.toLowerCase();
    const foundSections = requiredSections.filter(section =>
      textLower.includes(section.toLowerCase())
    );

    const score = foundSections.length;
    const maxScore = requiredSections.length;
    const missingSections = requiredSections.filter(section =>
      !textLower.includes(section.toLowerCase())
    );

    return {
      score,
      maxScore,
      feedback: missingSections.length > 0
        ? `Missing required sections: ${missingSections.join(', ')}`
        : 'All required sections present',
      suggestions: missingSections.map(section => `Add ${section} section`)
    };
  }

  /**
   * Evaluate forbidden elements
   */
  private async evaluateForbiddenElements(text: string, forbiddenElements: string[]): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const textLower = text.toLowerCase();
    const foundForbidden = forbiddenElements.filter(element =>
      textLower.includes(element.toLowerCase())
    );

    const score = forbiddenElements.length - foundForbidden.length;
    const maxScore = forbiddenElements.length;

    return {
      score,
      maxScore,
      feedback: foundForbidden.length > 0
        ? `Contains forbidden elements: ${foundForbidden.join(', ')}`
        : 'No forbidden elements found',
      suggestions: foundForbidden.map(element => `Remove "${element}"`)
    };
  }

  /**
   * Evaluate text length
   */
  private async evaluateLength(text: string, minLength: number, maxLength: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const length = text.length;
    const isWithinRange = length >= minLength && length <= maxLength;

    return {
      score: isWithinRange ? 1 : 0,
      maxScore: 1,
      feedback: !isWithinRange
        ? `Text length ${length} is outside range ${minLength}-${maxLength}`
        : `Text length ${length} is within acceptable range`,
      suggestions: length < minLength
        ? ['Add more clinical detail']
        : length > maxLength
        ? ['Condense content while maintaining clinical accuracy']
        : []
    };
  }

  /**
   * Evaluate paragraph structure
   */
  private async evaluateParagraphStructure(text: string, structure: StructureEvaluationCriteria['paragraphStructure']): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;
    const averageLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphCount;

    let score = 0;
    const maxScore = 3; // Three criteria: count, structure, average length

    const feedback: string[] = [];
    const suggestions: string[] = [];

    // Check paragraph count
    if (paragraphCount >= structure.minParagraphs && paragraphCount <= structure.maxParagraphs) {
      score += 1;
    } else {
      feedback.push(`Paragraph count ${paragraphCount} outside range ${structure.minParagraphs}-${structure.maxParagraphs}`);
      if (paragraphCount < structure.minParagraphs) {
        suggestions.push('Break content into more logical paragraphs');
      } else {
        suggestions.push('Combine related content into fewer paragraphs');
      }
    }

    // Check for proper paragraph breaks
    const hasProperBreaks = text.includes('\n\n');
    if (hasProperBreaks) {
      score += 1;
    } else {
      feedback.push('Missing proper paragraph breaks');
      suggestions.push('Use double line breaks between paragraphs');
    }

    // Check average paragraph length
    const targetLength = structure.averageLength;
    const lengthVariance = Math.abs(averageLength - targetLength) / targetLength;
    if (lengthVariance <= 0.5) { // Within 50% of target
      score += 1;
    } else {
      feedback.push(`Average paragraph length ${Math.round(averageLength)} differs significantly from target ${targetLength}`);
      suggestions.push('Adjust paragraph length for better readability');
    }

    return {
      score,
      maxScore,
      feedback: feedback.join('. ') || 'Good paragraph structure',
      suggestions
    };
  }

  /**
   * Get default criteria
   */
  getDefaultCriteria(): StructureEvaluationCriteria {
    return {
      requiredSections: [], // Will be set per agent type
      forbiddenElements: ['dear', 'kind regards', 'yours sincerely', 'best wishes'],
      minLength: 100,
      maxLength: 5000,
      paragraphStructure: {
        minParagraphs: 2,
        maxParagraphs: 8,
        averageLength: 200
      }
    };
  }

  /**
   * Get evaluation criteria
   */
  getCriteria(): StructureEvaluationCriteria {
    return this.criteria;
  }

  /**
   * Set evaluation criteria
   */
  setCriteria(criteria: StructureEvaluationCriteria): void {
    this.criteria = criteria;
  }

  /**
   * Get criteria for specific agent type
   */
  static getCriteriaForAgent(agentType: AgentType): StructureEvaluationCriteria {
    const baseCriteria = new StructureEvaluator().getDefaultCriteria();

    switch (agentType) {
      case 'quick-letter':
        return {
          ...baseCriteria,
          requiredSections: [], // No specific sections required for letters
          minLength: 50,
          maxLength: 2000,
          paragraphStructure: {
            minParagraphs: 1,
            maxParagraphs: 5,
            averageLength: 150
          }
        };

      case 'angiogram-pci':
        return {
          ...baseCriteria,
          requiredSections: ['procedure', 'findings', 'conclusion'],
          minLength: 200,
          maxLength: 3000,
          paragraphStructure: {
            minParagraphs: 3,
            maxParagraphs: 6,
            averageLength: 250
          }
        };

      case 'tavi':
        return {
          ...baseCriteria,
          requiredSections: ['pre-procedure', 'procedure', 'post-procedure', 'conclusion'],
          minLength: 300,
          maxLength: 4000,
          paragraphStructure: {
            minParagraphs: 4,
            maxParagraphs: 8,
            averageLength: 300
          }
        };

      default:
        return baseCriteria;
    }
  }
}