/**
 * GEPA Manager
 *
 * Coordinates all GEPA evaluators and provides unified evaluation interface.
 * Manages evaluation sessions, telemetry, and results aggregation.
 */

import type {
  GEPAOverallResult,
  GEPASession,
  GEPATelemetry,
  PerformanceMetrics,
  UIInteraction,
  AgentEvaluationProfile
} from './GEPATypes';
import type { AgentType } from '@/types/medical.types';
import { StructureEvaluator } from './StructureEvaluator';
import { LatencyEvaluator } from './LatencyEvaluator';
import { ErrorSurfaceEvaluator } from './ErrorSurfaceEvaluator';
import { UIPathEvaluator } from './UIPathEvaluator';
import { logger } from '@/utils/Logger';

export class GEPAManager {
  private static instance: GEPAManager | null = null;

  private structureEvaluator: StructureEvaluator;
  private latencyEvaluator: LatencyEvaluator;
  private errorEvaluator: ErrorSurfaceEvaluator;
  private uiPathEvaluator: UIPathEvaluator;

  private activeSessions: Map<string, GEPASession> = new Map();
  private telemetryBuffer: GEPATelemetry[] = [];

  private constructor() {
    this.structureEvaluator = new StructureEvaluator();
    this.latencyEvaluator = new LatencyEvaluator();
    this.errorEvaluator = new ErrorSurfaceEvaluator();
    this.uiPathEvaluator = new UIPathEvaluator();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GEPAManager {
    if (!GEPAManager.instance) {
      GEPAManager.instance = new GEPAManager();
    }
    return GEPAManager.instance;
  }

  /**
   * Start evaluation session
   */
  startSession(sessionId: string, agentType: AgentType): GEPASession {
    const session: GEPASession = {
      sessionId,
      agentType,
      startTime: new Date(),
      evaluationResults: [],
      metadata: {
        workflowType: agentType
      }
    };

    this.activeSessions.set(sessionId, session);

    this.addTelemetry({
      sessionId,
      timestamp: new Date(),
      eventType: 'evaluation_start',
      data: { agentType }
    });

    logger.debug('GEPA session started', {
      component: 'GEPAManager',
      sessionId,
      agentType
    });

    return session;
  }

  /**
   * Complete evaluation session
   */
  completeSession(sessionId: string): GEPASession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to complete non-existent GEPA session', { sessionId });
      return null;
    }

    session.endTime = new Date();
    this.activeSessions.delete(sessionId);

    this.addTelemetry({
      sessionId,
      timestamp: new Date(),
      eventType: 'evaluation_complete',
      data: {
        duration: session.endTime.getTime() - session.startTime.getTime(),
        resultsCount: session.evaluationResults.length
      }
    });

    logger.debug('GEPA session completed', {
      component: 'GEPAManager',
      sessionId,
      duration: session.endTime.getTime() - session.startTime.getTime(),
      resultsCount: session.evaluationResults.length
    });

    return session;
  }

  /**
   * Run comprehensive evaluation
   */
  async evaluateWorkflow(
    sessionId: string,
    reportText: string,
    performanceMetrics: PerformanceMetrics,
    uiInteractions: UIInteraction[],
    agentType?: AgentType
  ): Promise<GEPAOverallResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting comprehensive GEPA evaluation', {
        component: 'GEPAManager',
        sessionId,
        agentType,
        reportLength: reportText.length,
        interactionCount: uiInteractions.length
      });

      // Get evaluation profile for agent type
      const profile = agentType ? this.getEvaluationProfile(agentType) : null;

      // Run all evaluations in parallel
      const [structureResult, latencyResult, errorResult, uiPathResult] = await Promise.all([
        this.structureEvaluator.evaluate(
          reportText,
          profile?.structureCriteria
        ),
        this.latencyEvaluator.evaluate(
          performanceMetrics,
          profile?.latencyCriteria
        ),
        this.errorEvaluator.evaluate(
          performanceMetrics,
          profile?.errorCriteria
        ),
        this.uiPathEvaluator.evaluate(
          uiInteractions,
          profile?.uiCriteria
        )
      ]);

      const criteriaResults = [structureResult, latencyResult, errorResult, uiPathResult];

      // Calculate overall score
      const totalScore = criteriaResults.reduce((sum, result) => sum + result.score, 0);
      const maxScore = criteriaResults.reduce((sum, result) => sum + result.maxScore, 0);
      const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

      // Determine overall pass/fail
      const overallPassed = criteriaResults.every(result => result.passed);

      // Generate summary
      const passedCount = criteriaResults.filter(r => r.passed).length;
      const summary = `GEPA Evaluation: ${passedCount}/${criteriaResults.length} criteria passed (${overallScore}% overall score)`;

      const overallResult: GEPAOverallResult = {
        overallScore,
        maxScore: 100,
        overallPassed,
        criteriaResults,
        summary,
        timestamp: new Date(),
        processingTimeMs: Date.now() - startTime
      };

      // Add to session if exists
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.evaluationResults.push(overallResult);
      }

      this.addTelemetry({
        sessionId,
        timestamp: new Date(),
        eventType: 'evaluation_complete',
        data: {
          overallScore,
          passed: overallPassed,
          processingTime: Date.now() - startTime
        }
      });

      logger.info('GEPA evaluation completed', {
        component: 'GEPAManager',
        sessionId,
        overallScore,
        passed: overallPassed,
        processingTime: Date.now() - startTime
      });

      return overallResult;

    } catch (error) {
      logger.error('GEPA evaluation failed', {
        component: 'GEPAManager',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.addTelemetry({
        sessionId,
        timestamp: new Date(),
        eventType: 'evaluation_error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: Date.now() - startTime
        }
      });

      throw error;
    }
  }

  /**
   * Track user interaction for UI path evaluation
   */
  trackInteraction(sessionId: string, interaction: UIInteraction): void {
    this.uiPathEvaluator.trackInteraction(sessionId, interaction);

    this.addTelemetry({
      sessionId,
      timestamp: new Date(),
      eventType: 'user_interaction',
      data: {
        type: interaction.type,
        element: interaction.element
      }
    });
  }

  /**
   * Get evaluation profile for agent type
   */
  private getEvaluationProfile(agentType: AgentType): AgentEvaluationProfile {
    return {
      agentType,
      structureCriteria: StructureEvaluator.getCriteriaForAgent(agentType),
      latencyCriteria: LatencyEvaluator.getCriteriaForAgent(agentType),
      errorCriteria: ErrorSurfaceEvaluator.getCriteriaForAgent(agentType),
      uiCriteria: UIPathEvaluator.getCriteriaForAgent(agentType)
    };
  }

  /**
   * Get performance statistics across all evaluators
   */
  getOverallStats(): {
    structure: ReturnType<StructureEvaluator['getDefaultCriteria']>;
    latency: ReturnType<LatencyEvaluator['getPerformanceStats']>;
    errors: ReturnType<ErrorSurfaceEvaluator['getErrorStats']>;
    uiPath: ReturnType<UIPathEvaluator['getInteractionStats']>;
    sessions: {
      active: number;
      completed: number;
      totalEvaluations: number;
    };
  } {
    const completedSessions = Array.from(this.activeSessions.values()).filter(s => s.endTime);
    const totalEvaluations = completedSessions.reduce((sum, s) => sum + s.evaluationResults.length, 0);

    return {
      structure: this.structureEvaluator.getDefaultCriteria(),
      latency: this.latencyEvaluator.getPerformanceStats(),
      errors: this.errorEvaluator.getErrorStats(),
      uiPath: this.uiPathEvaluator.getInteractionStats(),
      sessions: {
        active: this.activeSessions.size,
        completed: completedSessions.length,
        totalEvaluations
      }
    };
  }

  /**
   * Add telemetry event
   */
  private addTelemetry(telemetry: GEPATelemetry): void {
    this.telemetryBuffer.push(telemetry);

    // Keep last 1000 telemetry events
    if (this.telemetryBuffer.length > 1000) {
      this.telemetryBuffer = this.telemetryBuffer.slice(-1000);
    }
  }

  /**
   * Get recent telemetry data
   */
  getTelemetry(limit = 100): GEPATelemetry[] {
    return this.telemetryBuffer.slice(-limit);
  }

  /**
   * Clear telemetry buffer
   */
  clearTelemetry(): void {
    this.telemetryBuffer = [];
  }

  /**
   * Get active session
   */
  getSession(sessionId: string): GEPASession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): GEPASession[] {
    return Array.from(this.activeSessions.values());
  }
}