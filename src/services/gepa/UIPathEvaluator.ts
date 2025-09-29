/**
 * GEPA UI Path Success Evaluator
 *
 * Evaluates user interaction patterns and workflow completion success:
 * - User action tracking (Accept/Skip/Edit/Cancel)
 * - Workflow completion rates
 * - Success pattern recognition
 * - Failure pattern detection
 */

import type {
  GEPAEvaluator,
  GEPAEvaluationResult,
  UIPathEvaluationCriteria,
  UIInteraction
} from './GEPATypes';
import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

interface UIPathAnalysisResult {
  totalInteractions: number;
  acceptanceRate: number;
  editRate: number;
  skipRate: number;
  cancellationRate: number;
  completionSuccessRate: number;
  averageInteractionsToComplete: number;
  successPatternMatches: string[];
  failurePatternMatches: string[];
}

export class UIPathEvaluator implements GEPAEvaluator<UIPathEvaluationCriteria> {
  public readonly name = 'UIPathEvaluator';
  public readonly description = 'Evaluates user interaction patterns and workflow completion success';

  private criteria: UIPathEvaluationCriteria;
  private interactionHistory: Array<{
    sessionId: string;
    timestamp: number;
    interactions: UIInteraction[];
    completed: boolean;
    agentType: string;
  }> = [];

  constructor(criteria?: UIPathEvaluationCriteria) {
    this.criteria = criteria || this.getDefaultCriteria();
  }


  /**
   * Evaluate UI path success metrics
   */
  async evaluate(interactions: UIInteraction[], criteria?: UIPathEvaluationCriteria): Promise<GEPAEvaluationResult> {
    const evalCriteria = criteria || this.criteria;
    const startTime = Date.now();

    try {
      logger.debug('Starting UI path evaluation', {
        component: 'UIPathEvaluator',
        interactionCount: interactions.length
      });

      // Add to interaction history
      const sessionId = `session_${Date.now()}`;
      this.interactionHistory.push({
        sessionId,
        timestamp: Date.now(),
        interactions,
        completed: this.isWorkflowCompleted(interactions),
        agentType: 'unknown' // Will be set by caller if available
      });

      // Keep last 100 sessions
      if (this.interactionHistory.length > 100) {
        this.interactionHistory = this.interactionHistory.slice(-100);
      }

      const pathAnalysis = this.analyzeUIPath(interactions);
      const results = await Promise.all([
        this.evaluateUserActions(pathAnalysis, evalCriteria.requiredUserActions),
        this.evaluateInteractionCount(pathAnalysis.totalInteractions, evalCriteria.maxUserInteractions),
        this.evaluateSuccessPatterns(pathAnalysis.successPatternMatches, evalCriteria.successPatterns),
        this.evaluateFailurePatterns(pathAnalysis.failurePatternMatches, evalCriteria.failurePatterns)
      ]);

      // Calculate overall score
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      const maxScore = results.reduce((sum, result) => sum + result.maxScore, 0);
      const overallScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 100;

      // Compile feedback
      const allFeedback = results.map(r => r.feedback).filter(f => f);
      const allSuggestions = results.flatMap(r => r.suggestions);

      const result: GEPAEvaluationResult = {
        criteria: 'ui_path',
        score: Math.round(overallScore),
        maxScore: 100,
        passed: overallScore >= 70, // 70% threshold for UI path success
        feedback: allFeedback.join(' ') || 'UI path evaluation completed successfully',
        suggestions: allSuggestions,
        metadata: {
          subResults: results,
          processingTimeMs: Date.now() - startTime,
          criteriaUsed: evalCriteria,
          pathAnalysis,
          completionRate: this.calculateCompletionRate()
        }
      };

      logger.debug('UI path evaluation completed', {
        component: 'UIPathEvaluator',
        score: result.score,
        passed: result.passed,
        totalInteractions: pathAnalysis.totalInteractions,
        completionRate: pathAnalysis.completionSuccessRate
      });

      return result;

    } catch (error) {
      logger.error('UI path evaluation failed', {
        component: 'UIPathEvaluator',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        criteria: 'ui_path',
        score: 0,
        maxScore: 100,
        passed: false,
        feedback: `UI path evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Check UI interaction tracking setup'],
        metadata: {
          error: true,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Analyze UI interaction patterns
   */
  private analyzeUIPath(interactions: UIInteraction[]): UIPathAnalysisResult {
    const actionCounts = {
      accept: 0,
      skip: 0,
      edit: 0,
      cancel: 0,
      click: 0,
      input: 0
    };

    const successPatternMatches: string[] = [];
    const failurePatternMatches: string[] = [];

    // Count action types
    for (const interaction of interactions) {
      if (interaction.type in actionCounts) {
        actionCounts[interaction.type]++;
      }
    }

    const totalActions = actionCounts.accept + actionCounts.skip + actionCounts.edit + actionCounts.cancel;
    const isCompleted = this.isWorkflowCompleted(interactions);

    // Check for success patterns
    if (actionCounts.accept > 0 && actionCounts.cancel === 0) {
      successPatternMatches.push('completed_without_cancellation');
    }
    if (actionCounts.edit > 0 && actionCounts.accept > 0) {
      successPatternMatches.push('edit_then_accept_pattern');
    }
    if (totalActions <= 3 && isCompleted) {
      successPatternMatches.push('efficient_completion');
    }

    // Check for failure patterns
    if (actionCounts.cancel > 0) {
      failurePatternMatches.push('workflow_cancellation');
    }
    if (actionCounts.skip > actionCounts.accept + actionCounts.edit) {
      failurePatternMatches.push('excessive_skipping');
    }
    if (totalActions > 10) {
      failurePatternMatches.push('excessive_interactions');
    }

    return {
      totalInteractions: interactions.length,
      acceptanceRate: totalActions > 0 ? actionCounts.accept / totalActions : 0,
      editRate: totalActions > 0 ? actionCounts.edit / totalActions : 0,
      skipRate: totalActions > 0 ? actionCounts.skip / totalActions : 0,
      cancellationRate: totalActions > 0 ? actionCounts.cancel / totalActions : 0,
      completionSuccessRate: isCompleted ? 1 : 0,
      averageInteractionsToComplete: isCompleted ? interactions.length : 0,
      successPatternMatches,
      failurePatternMatches
    };
  }

  /**
   * Check if workflow was completed successfully
   */
  private isWorkflowCompleted(interactions: UIInteraction[]): boolean {
    const lastInteraction = interactions[interactions.length - 1];
    if (!lastInteraction) return false;

    // Workflow is completed if last action was accept and no cancellation occurred
    const hasAccept = interactions.some(i => i.type === 'accept');
    const hasCancel = interactions.some(i => i.type === 'cancel');

    return hasAccept && !hasCancel;
  }

  /**
   * Evaluate required user actions
   */
  private async evaluateUserActions(analysis: UIPathAnalysisResult, requiredActions: string[]): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    // Check if required actions were performed
    const actionTypes = ['accept', 'skip', 'edit', 'cancel', 'click', 'input'];
    const performedActions = actionTypes.filter(action => {
      switch (action) {
        case 'accept': return analysis.acceptanceRate > 0;
        case 'skip': return analysis.skipRate > 0;
        case 'edit': return analysis.editRate > 0;
        case 'cancel': return analysis.cancellationRate > 0;
        default: return true; // click/input always available
      }
    });

    const missingActions = requiredActions.filter(required => !performedActions.includes(required));
    const score = requiredActions.length > 0 ? (requiredActions.length - missingActions.length) / requiredActions.length : 1;

    return {
      score,
      maxScore: 1,
      feedback: missingActions.length > 0
        ? `Missing required user actions: ${missingActions.join(', ')}`
        : 'All required user actions performed',
      suggestions: missingActions.map(action => `Ensure ${action} action is available and utilized`)
    };
  }

  /**
   * Evaluate interaction count
   */
  private async evaluateInteractionCount(totalInteractions: number, maxInteractions: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const isWithinLimit = totalInteractions <= maxInteractions;
    const score = isWithinLimit ? 1 : Math.max(0, 1 - (totalInteractions - maxInteractions) / maxInteractions);

    return {
      score,
      maxScore: 1,
      feedback: isWithinLimit
        ? `Interaction count ${totalInteractions} within limit`
        : `Interaction count ${totalInteractions} exceeds limit of ${maxInteractions}`,
      suggestions: !isWithinLimit
        ? ['Simplify user interface', 'Reduce required steps', 'Improve default values']
        : []
    };
  }

  /**
   * Evaluate success patterns
   */
  private async evaluateSuccessPatterns(foundPatterns: string[], expectedPatterns: string[]): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const matchedPatterns = expectedPatterns.filter(pattern => foundPatterns.includes(pattern));
    const score = expectedPatterns.length > 0 ? matchedPatterns.length / expectedPatterns.length : 1;

    return {
      score,
      maxScore: 1,
      feedback: matchedPatterns.length > 0
        ? `Success patterns found: ${matchedPatterns.join(', ')}`
        : 'No expected success patterns detected',
      suggestions: matchedPatterns.length < expectedPatterns.length
        ? ['Analyze successful workflow patterns', 'Optimize user experience flow']
        : []
    };
  }

  /**
   * Evaluate failure patterns
   */
  private async evaluateFailurePatterns(foundPatterns: string[], failurePatterns: string[]): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const detectedFailures = failurePatterns.filter(pattern => foundPatterns.includes(pattern));
    const score = detectedFailures.length === 0 ? 1 : Math.max(0, 1 - detectedFailures.length * 0.3);

    return {
      score,
      maxScore: 1,
      feedback: detectedFailures.length > 0
        ? `Failure patterns detected: ${detectedFailures.join(', ')}`
        : 'No failure patterns detected',
      suggestions: detectedFailures.map(pattern => `Address ${pattern} issue`)
    };
  }

  /**
   * Calculate overall completion rate
   */
  private calculateCompletionRate(): number {
    if (this.interactionHistory.length === 0) return 1;

    const completedSessions = this.interactionHistory.filter(session => session.completed).length;
    return completedSessions / this.interactionHistory.length;
  }

  /**
   * Get default criteria
   */
  getDefaultCriteria(): UIPathEvaluationCriteria {
    return {
      requiredUserActions: ['accept'], // At minimum, user should accept results
      maxUserInteractions: 8,
      successPatterns: [
        'completed_without_cancellation',
        'efficient_completion'
      ],
      failurePatterns: [
        'workflow_cancellation',
        'excessive_skipping',
        'excessive_interactions'
      ]
    };
  }

  /**
   * Get evaluation criteria
   */
  getCriteria(): UIPathEvaluationCriteria {
    return this.criteria;
  }

  /**
   * Set evaluation criteria
   */
  setCriteria(criteria: UIPathEvaluationCriteria): void {
    this.criteria = criteria;
  }

  /**
   * Get criteria for specific agent type
   */
  static getCriteriaForAgent(agentType: AgentType): UIPathEvaluationCriteria {
    const baseCriteria = new UIPathEvaluator().getDefaultCriteria();

    switch (agentType) {
      case 'quick-letter':
        return {
          ...baseCriteria,
          maxUserInteractions: 5, // Simple letters should require fewer interactions
          successPatterns: [
            ...baseCriteria.successPatterns,
            'single_accept_completion'
          ]
        };

      case 'angiogram-pci':
      case 'tavi':
        return {
          ...baseCriteria,
          maxUserInteractions: 12, // Complex procedures may require more review
          requiredUserActions: ['accept', 'edit'], // Complex procedures should involve editing
          successPatterns: [
            ...baseCriteria.successPatterns,
            'edit_then_accept_pattern'
          ]
        };

      default:
        return baseCriteria;
    }
  }

  /**
   * Track user interaction
   */
  trackInteraction(sessionId: string, interaction: UIInteraction): void {
    const session = this.interactionHistory.find(s => s.sessionId === sessionId);
    if (session) {
      session.interactions.push(interaction);
    }
  }

  /**
   * Get UI interaction statistics
   */
  getInteractionStats(): {
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    averageInteractionsPerSession: number;
    commonFailurePatterns: Array<{ pattern: string; count: number }>;
    averageAcceptanceRate: number;
  } {
    if (this.interactionHistory.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        completionRate: 0,
        averageInteractionsPerSession: 0,
        commonFailurePatterns: [],
        averageAcceptanceRate: 0
      };
    }

    const completedSessions = this.interactionHistory.filter(s => s.completed).length;
    const totalInteractions = this.interactionHistory.reduce((sum, s) => sum + s.interactions.length, 0);

    const failurePatternCounts: Record<string, number> = {};
    let totalAcceptanceRate = 0;

    for (const session of this.interactionHistory) {
      const analysis = this.analyzeUIPath(session.interactions);
      totalAcceptanceRate += analysis.acceptanceRate;

      for (const pattern of analysis.failurePatternMatches) {
        failurePatternCounts[pattern] = (failurePatternCounts[pattern] || 0) + 1;
      }
    }

    const commonFailurePatterns = Object.entries(failurePatternCounts)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSessions: this.interactionHistory.length,
      completedSessions,
      completionRate: completedSessions / this.interactionHistory.length,
      averageInteractionsPerSession: totalInteractions / this.interactionHistory.length,
      commonFailurePatterns,
      averageAcceptanceRate: totalAcceptanceRate / this.interactionHistory.length
    };
  }
}