/**
 * Agent Factory Service - Phase 4 Enhanced
 * 
 * Optimized factory with Phase 4 enhancements:
 * - LazyAgentLoader for dynamic loading and caching
 * - CrossAgentIntelligence for shared insights
 * - Smart recommendations and context enhancement
 */

import type { AgentType, MedicalCode, MedicalContext, MedicalReport, PreOpPlanReport } from '@/types/medical.types';
import { LazyAgentFactory } from './LazyAgentFactory';
import { LazyAgentLoader } from './LazyAgentLoader';
import { CrossAgentIntelligence } from './CrossAgentIntelligence';
import { PhrasebookService } from './PhrasebookService';
import { NotificationService } from './NotificationService';
import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';

type AgentFactoryNormalizedFinding = {
  finding: string;
  confidence: number;
  category: string;
  severity?: string;
  context?: string;
  codes?: MedicalCode[];
};

type NormalizeOptions = {
  defaultCategory?: string;
  defaultConfidence?: number;
  contextKeys?: string[];
  severityKey?: string;
};

export class AgentFactory {
  private static lazyFactory = LazyAgentFactory.getInstance();
  private static agentLoader = LazyAgentLoader.getInstance();
  private static crossAgentIntelligence = CrossAgentIntelligence.getInstance();
  private static readonly MAX_FINDING_CONTEXT_LENGTH = 220;
  private static readonly FINDING_CATEGORY_MAP: Record<string, string> = {
    diagnosis: 'medical_history',
    diagnoses: 'medical_history',
    medical_history: 'medical_history',
    history: 'medical_history',
    comorbidity: 'comorbidity',
    comorbidities: 'comorbidity',
    risk_factor: 'risk_factors',
    risk_factors: 'risk_factors',
    risk: 'risk_factors',
    medications: 'medications',
    medication: 'medications',
    drug: 'medications',
    drugs: 'medications',
    therapy: 'medications',
    therapy_changes: 'medications',
    drug_interaction: 'drug_interactions',
    drug_interactions: 'drug_interactions',
    interaction: 'drug_interactions',
    interactions: 'drug_interactions',
    allergies: 'drug_interactions',
    contraindications: 'drug_interactions',
    alerts: 'drug_interactions',
    procedures: 'procedures',
    procedure: 'procedures',
    operations: 'procedures',
    interventions: 'procedures',
    investigation: 'procedures',
    investigations: 'procedures',
    imaging: 'procedures',
    hemodynamics: 'procedures',
    anatomy: 'medical_history',
    management: 'recommendations',
    follow_up: 'recommendations',
    followup: 'recommendations',
    followups: 'recommendations',
    recommendations: 'recommendations',
    plan: 'recommendations',
    plans: 'recommendations',
    recommendation: 'recommendations',
    adherence: 'recommendations',
    education: 'recommendations',
    outcomes: 'medical_history',
    outcome: 'medical_history',
    complication: 'medical_history',
    complications: 'medical_history',
    social_history: 'risk_factors',
    family_history: 'risk_factors',
    lifestyle: 'risk_factors'
  };

  private static readonly WORKFLOW_DEFAULT_CATEGORIES: Partial<Record<AgentType, string>> = {
    medication: 'medications',
    background: 'medical_history',
    'investigation-summary': 'procedures',
    'quick-letter': 'medical_history',
    consultation: 'medical_history',
    'ai-medical-review': 'recommendations',
    'batch-ai-review': 'recommendations',
    'tavi-workup': 'procedures'
  };

  /**
   * Process input with Phase 4 enhanced agent loading and intelligence
   */
  public static async processWithAgent(
    workflowId: AgentType,
    input: string,
    context?: any,
    _signal?: AbortSignal,
    options?: {
      patientName?: string;
      skipNotification?: boolean;
      sessionId?: string;
      usePhase4Enhancement?: boolean;
      onProgress?: (phase: string, progress: number, details?: string) => void;
    }
  ): Promise<{ content: string; summary?: string; warnings?: string[]; errors?: string[]; processingTime: number; agentName: string; modelUsed?: string; reviewData?: any; missingInfo?: any; taviStructuredSections?: any; educationData?: any; preOpPlanData?: PreOpPlanReport['planData'] }> {
    const startTime = Date.now();
    
    try {
      // Phase 4 Enhancement: Enable by default for agents that benefit from cross-agent intelligence
      const usePhase4 = options?.usePhase4Enhancement ?? this.shouldUsePhase4Enhancement(workflowId, context);
      if (usePhase4) {
        return await this.processWithPhase4Enhancement(workflowId, input, context, options);
      }

      // Enhance context with user phrasebook terminology preferences
      const enhancedContext = await this.enhanceWithPhrasebook(context, workflowId);

      // Merge onProgress callback into context for agent progress reporting
      const contextWithProgress = options?.onProgress
        ? { ...enhancedContext, onProgress: options.onProgress }
        : enhancedContext;

      // Use lazy loading for dramatic bundle size reduction
      const report = await this.lazyFactory.processWithAgent(workflowId, input, contextWithProgress);
      
      const totalTime = Date.now() - startTime;
      
      // Log which agent was used and processing time
      logger.info(`Workflow: ${workflowId.toUpperCase()}`, {
        component: 'agent-factory',
        operation: 'process',
        workflow: workflowId,
        totalTime,
        agentTime: report.metadata.processingTime
      });
      
      // Check if this is a BatchPatientReviewAgent with structured data
      const batchPatientReviewData = (report as any).reviewData;
      if (workflowId === 'ai-medical-review' && batchPatientReviewData) {
        logger.info(`Batch Patient Review found ${batchPatientReviewData.findings?.length || 0} findings`, {
          component: 'agent-factory',
          operation: 'batch-review',
          findings: batchPatientReviewData.findings?.length || 0
        });
      }

      // Check if this is a TAVIWorkupAgent with structured sections
      const taviStructuredSections = (report as any).structuredSections;
      if (workflowId === 'tavi-workup' && taviStructuredSections) {
        logger.info(`TAVI Workup found structured sections`, {
          component: 'agent-factory',
          operation: 'tavi-workup',
          sectionsFound: Object.keys(taviStructuredSections).length
        });
      }

      // Check if this is a PatientEducationAgent with education data
      const educationData = (report as any).educationData;
      if (workflowId === 'patient-education' && educationData) {
        logger.info(`Patient Education found structured data`, {
          component: 'agent-factory',
          operation: 'patient-education',
          modules: educationData.modules?.length || 0,
          hasJsonMetadata: !!educationData.jsonMetadata
        });
      }

      const preOpPlanData = (report as PreOpPlanReport).planData;
      if (workflowId === 'pre-op-plan' && preOpPlanData) {
        logger.info('Pre-Op Plan generated structured data', {
          component: 'agent-factory',
          operation: 'pre-op-plan',
          procedureType: preOpPlanData.procedureType,
          hasWarnings: !!preOpPlanData.warnings?.length,
          completenessScore: preOpPlanData.completenessScore
        });
      }
      
      // Send completion notification (will check if user is focused automatically)
      if (!options?.skipNotification) {
        try {
          const extraInfo = workflowId === 'ai-medical-review' && batchPatientReviewData 
            ? `${batchPatientReviewData.findings?.length || 0} findings identified`
            : undefined;
            
          await NotificationService.showCompletionNotification(
            workflowId, 
            report.metadata.processingTime,
            extraInfo,
            options?.patientName
          );
          logger.info(`Notification sent for ${workflowId} (${report.metadata.processingTime}ms)`, {
            component: 'agent-factory',
            operation: 'notification',
            workflow: workflowId,
            processingTime: report.metadata.processingTime
          });
        } catch (notificationError) {
          logger.warn('Failed to send completion notification', {
            component: 'agent-factory',
            operation: 'notification',
            error: notificationError instanceof Error ? notificationError.message : String(notificationError)
          });
        }
      }
      
      // Return structured response with separate warnings/errors, timing data, and optional summary
      return {
        content: report.content,
        summary: report.summary,
        warnings: report.warnings,
        errors: report.errors,
        processingTime: report.metadata.processingTime,
        agentName: report.agentName,
        modelUsed: report.metadata?.modelUsed, // Include model used for display
        reviewData: batchPatientReviewData, // Include structured data for Batch Patient Review
        missingInfo: report.metadata?.missingInformation,
        taviStructuredSections: taviStructuredSections, // Include structured data for TAVI Workup
        educationData: educationData, // Include structured data for Patient Education
        preOpPlanData
      };
      
    } catch (error) {
      const err = toError(error);
      logger.error(`Agent processing failed for ${workflowId}`, err, {
        component: 'agent-factory',
        operation: 'process',
        workflow: workflowId
      });
      throw err;
    }
  }

  /**
   * Determine if Phase 4 Enhancement should be used for this agent
   */
  private static shouldUsePhase4Enhancement(workflowId: AgentType, _context?: any): boolean {
    // Enable Phase 4 for agents that benefit from cross-agent intelligence
    const phase4Agents: AgentType[] = [
      'investigation-summary',
      'background',
      'medication',
      'quick-letter',
      'consultation',
      'tavi-workup',
      'ai-medical-review'
    ];

    return phase4Agents.includes(workflowId);
  }

  /**
   * Phase 4 Enhanced processing with cross-agent intelligence and optimization
   */
  private static async processWithPhase4Enhancement(
    workflowId: AgentType,
    input: string,
    context?: any,
    options?: {
      sessionId?: string;
      patientName?: string;
      skipNotification?: boolean;
      onProgress?: (phase: string, progress: number, details?: string) => void;
    }
  ) {
    const startTime = Date.now();
    logger.info('Phase 4 Enhanced processing initiated', {
      component: 'agent-factory',
      operation: 'phase4-start'
    });

    try {
      // Step 1: Load agent with intelligent caching
      const { agent, loadTime, fromCache } = await this.agentLoader.loadAgent(workflowId, true);
      logger.info(`Agent loaded in ${loadTime}ms (cached: ${fromCache})`, {
        component: 'agent-factory',
        operation: 'agent-load',
        loadTime,
        fromCache
      });

      // Step 2: Get enhanced context from cross-agent intelligence and phrasebook
      let enhancedContext: MedicalContext = await this.enhanceWithPhrasebook(context || {}, workflowId);

      if (options?.sessionId) {
        const contextEnhancement = this.crossAgentIntelligence.getEnhancedContext(
          options.sessionId,
          workflowId
        );

        const recommendationSummaries = contextEnhancement.recommendations
          ? contextEnhancement.recommendations.map(rec => rec.title ?? rec.description)
          : [];

        enhancedContext = {
          ...enhancedContext,
          enhancedProcessing: true,
          sharedInsights: contextEnhancement.sharedInsights,
          riskAssessment: contextEnhancement.riskAssessment,
          drugInteractions: contextEnhancement.drugInteractions,
          clinicalCorrelations: contextEnhancement.clinicalCorrelations,
          recommendations: recommendationSummaries
        };

        logger.info(`Enhanced context with ${contextEnhancement.sharedInsights.length} shared insights`, {
          component: 'agent-factory',
          operation: 'context-enhancement',
          insights: contextEnhancement.sharedInsights.length
        });
      }

      // Step 3: Process with enhanced agent
      let report;
      if (workflowId === 'tavi-workup' && options?.onProgress) {
        // TAVI workup with progress tracking
        const taviContext = {
          ...enhancedContext,
          onProgress: options.onProgress
        };
        report = await agent.process(input, taviContext);
      } else {
        // Standard processing
        report = await agent.process(input, enhancedContext);
      }
      
      // Step 4: Register insights with cross-agent intelligence
      if (options?.sessionId) {
        const extractedFindings = this.collectAgentFindings(report, workflowId);

        const insights = this.crossAgentIntelligence.registerInsights(
          options.sessionId,
          workflowId,
          report,
          extractedFindings
        );

        logger.info(`Registered ${insights.length} insights for cross-agent learning`, {
          component: 'agent-factory',
          operation: 'insights-registration',
          insights: insights.length,
          derivedFindings: extractedFindings.length
        });
      }

      const totalTime = Date.now() - startTime;
      
      // Step 5: Enhanced performance logging
      logger.info(`Phase 4 Enhanced processing completed in ${totalTime}ms`, {
        component: 'agent-factory',
        operation: 'phase4-complete',
        totalTime,
        loadTime,
        fromCache,
        processingTime: report.metadata?.processingTime || 0
      });
      
      // Send completion notification
      if (!options?.skipNotification) {
        await NotificationService.showCompletionNotification(
          workflowId,
          totalTime,
          undefined,
          options?.patientName
        );
      }

      return {
        content: report.content,
        summary: report.summary,
        warnings: report.warnings,
        errors: report.errors,
        processingTime: totalTime,
        agentName: report.agentName,
        modelUsed: report.metadata?.modelUsed, // Include model used for display
        reviewData: (report as any).reviewData,
        missingInfo: report.metadata?.missingInformation,
        phase4Metadata: {
          enhancedProcessing: true,
          agentLoadTime: loadTime,
          fromCache,
          crossAgentInsights: options?.sessionId ? true : false,
          totalPhase4Time: totalTime
        }
      };

    } catch (error) {
      const err = toError(error);
      logger.error(`Phase 4 Enhanced processing failed for ${workflowId}`, err, {
        component: 'agent-factory',
        operation: 'phase4-error',
        workflow: workflowId
      });
      
      // Fallback to standard processing
      logger.info('Falling back to standard processing', {
        component: 'agent-factory',
        operation: 'fallback'
      });
      return await this.processWithAgent(workflowId, input, context, undefined, {
        ...options,
        usePhase4Enhancement: false
      });
    }
  }

  private static collectAgentFindings(report: MedicalReport, workflowId: AgentType) {
    const findings: AgentFactoryNormalizedFinding[] = [];
    const enhancedProcessing = report.metadata?.enhancedProcessing as Record<string, any> | undefined;

    if (enhancedProcessing) {
      findings.push(
        ...this.normalizeFindingsArray(enhancedProcessing.extractedFindings, workflowId)
      );

      findings.push(
        ...this.deriveInsightsFromEnhancedMetadata(enhancedProcessing, workflowId)
      );
    }

    findings.push(...this.deriveAdditionalReportFindings(report, workflowId));

    const reviewData = (report as any).reviewData;
    if (reviewData?.findings) {
      findings.push(
        ...this.normalizeFindingsArray(reviewData.findings, workflowId, {
          defaultCategory: 'recommendations',
          defaultConfidence: 0.75,
          contextKeys: ['clinicalReasoning', 'recommendedAction', 'australianGuideline'],
          severityKey: 'urgency'
        })
      );
    }

    const deduped = new Map<string, AgentFactoryNormalizedFinding>();
    findings.forEach(finding => {
      if (!finding.finding) return;
      const key = `${finding.category}:${finding.finding.toLowerCase()}`;
      const existing = deduped.get(key);

      if (!existing || existing.confidence < finding.confidence) {
        deduped.set(key, finding);
      }
    });

    return Array.from(deduped.values());
  }

  private static normalizeFindingsArray(
    rawFindings: unknown,
    workflowId: AgentType,
    options: NormalizeOptions = {}
  ): AgentFactoryNormalizedFinding[] {
    if (!Array.isArray(rawFindings)) {
      return [];
    }

    return rawFindings
      .map(finding => this.normalizeFinding(finding, workflowId, options))
      .filter((finding): finding is AgentFactoryNormalizedFinding => Boolean(finding));
  }

  private static normalizeFinding(
    finding: any,
    workflowId: AgentType,
    options: NormalizeOptions
  ): AgentFactoryNormalizedFinding | null {
    if (!finding) {
      return null;
    }

    const findingText = this.extractFindingText(finding);
    if (!findingText) {
      return null;
    }

    const category = this.resolveFindingCategory(finding, workflowId, options);
    const confidence = this.normalizeConfidenceValue(
      finding.confidence ?? options.defaultConfidence
    );
    const severity = this.extractSeverity(finding, options);
    const context = this.buildFindingContext(finding, options);
    const codes = Array.isArray(finding.codes) ? finding.codes : undefined;

    return {
      finding: findingText,
      confidence,
      category,
      severity,
      context,
      codes
    };
  }

  private static resolveFindingCategory(
    finding: any,
    workflowId: AgentType,
    options: NormalizeOptions
  ): string {
    if (typeof finding.category === 'string') {
      const normalizedCategory = finding.category
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
      const mapped = this.FINDING_CATEGORY_MAP[normalizedCategory];
      if (mapped) {
        return mapped;
      }
    }

    if (options.defaultCategory) {
      return options.defaultCategory;
    }

    const workflowDefault = this.WORKFLOW_DEFAULT_CATEGORIES[workflowId];
    if (workflowDefault) {
      return workflowDefault;
    }

    return 'medical_history';
  }

  private static normalizeConfidenceValue(value: unknown, fallback = 0.65): number {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      if (value > 1.01) {
        return Math.max(0.3, Math.min(1, value / 100));
      }
      if (value >= 0 && value <= 1.5) {
        return Math.max(0.3, Math.min(1, value));
      }
    }
    return fallback;
  }

  private static extractSeverity(finding: any, options: NormalizeOptions): string | undefined {
    if (typeof finding.severity === 'string') {
      return finding.severity;
    }

    const severityKey = options.severityKey;
    if (severityKey && typeof finding[severityKey] === 'string') {
      return String(finding[severityKey]);
    }

    if (typeof finding.urgency === 'string') {
      return finding.urgency;
    }

    return undefined;
  }

  private static buildFindingContext(finding: any, options: NormalizeOptions): string | undefined {
    const contextParts: string[] = [];
    const contextKeys = options.contextKeys ?? ['context', 'clinicalReasoning', 'recommendedAction', 'notes'];

    contextKeys.forEach(key => {
      const value = finding[key];
      if (typeof value === 'string' && value.trim()) {
        contextParts.push(value.trim());
      }
    });

    if (typeof finding.measurement === 'object' && finding.measurement !== null) {
      const { value, unit, reference } = finding.measurement as Record<string, string>;
      if (value) {
        const measurementText = [value, unit].filter(Boolean).join(' ');
        const referenceText = reference ? `reference ${reference}` : undefined;
        contextParts.push(['Measurement', measurementText, referenceText].filter(Boolean).join(': '));
      }
    }

    if (Array.isArray(finding.relatedFindings) && finding.relatedFindings.length > 0) {
      contextParts.push(`Related: ${finding.relatedFindings.join(', ')}`);
    }

    if (contextParts.length === 0) {
      return undefined;
    }

    const context = contextParts.join(' | ');
    return context.length > this.MAX_FINDING_CONTEXT_LENGTH
      ? `${context.slice(0, this.MAX_FINDING_CONTEXT_LENGTH - 1)}…`
      : context;
  }

  private static deriveInsightsFromEnhancedMetadata(
    enhancedProcessing: Record<string, any>,
    workflowId: AgentType
  ): AgentFactoryNormalizedFinding[] {
    const derived: AgentFactoryNormalizedFinding[] = [];

    if (workflowId === 'medication') {
      if (Array.isArray(enhancedProcessing.drugInteractionFlags)) {
        enhancedProcessing.drugInteractionFlags.forEach((interaction: string) => {
          if (typeof interaction === 'string' && interaction.trim()) {
            derived.push({
              finding: interaction.trim(),
              confidence: 0.8,
              category: 'drug_interactions',
              severity: 'major'
            });
          }
        });
      }

      if (enhancedProcessing.medicationClasses && typeof enhancedProcessing.medicationClasses === 'object') {
        Object.entries(enhancedProcessing.medicationClasses as Record<string, number>)
          .filter(([, count]) => typeof count === 'number' && count > 0)
          .forEach(([className, count]) => {
            derived.push({
              finding: `Therapeutic class: ${className} (${count})`,
              confidence: 0.6,
              category: 'medications'
            });
          });
      }
    }

    if (workflowId === 'background') {
      if (enhancedProcessing.backgroundCategories && typeof enhancedProcessing.backgroundCategories === 'object') {
        Object.entries(enhancedProcessing.backgroundCategories as Record<string, number>)
          .filter(([, count]) => typeof count === 'number' && count > 0)
          .forEach(([category, count]) => {
            derived.push({
              finding: `Background ${category} conditions: ${count}`,
              confidence: 0.55,
              category: category === 'procedures' ? 'procedures' : 'risk_factors'
            });
          });
      }
    }

    if (workflowId === 'investigation-summary') {
      if (Array.isArray(enhancedProcessing.investigationTypes)) {
        enhancedProcessing.investigationTypes
          .filter((type: unknown): type is string => typeof type === 'string')
          .forEach(type => {
            derived.push({
              finding: `Investigation captured: ${type}`,
              confidence: 0.7,
              category: 'procedures'
            });
          });
      }
    }

    return derived;
  }

  private static deriveAdditionalReportFindings(
    report: MedicalReport,
    workflowId: AgentType
  ): AgentFactoryNormalizedFinding[] {
    const findings: AgentFactoryNormalizedFinding[] = [];

    const codes = report.metadata?.medicalCodes;
    if (Array.isArray(codes) && codes.length > 0) {
      codes.slice(0, 5).forEach(code => {
        if (code && code.code) {
          findings.push({
            finding: `${code.code} – ${code.description ?? 'Medical code'}`,
            confidence: 0.6,
            category: this.WORKFLOW_DEFAULT_CATEGORIES[workflowId] ?? 'medical_history',
            context: code.system ? `System: ${code.system}` : undefined,
            codes: [code]
          });
        }
      });
    }

    return findings;
  }

  private static extractFindingText(finding: any): string | null {
    if (typeof finding.finding === 'string' && finding.finding.trim()) {
      return finding.finding.trim();
    }

    const fallbackKeys = ['title', 'summary', 'description', 'statement', 'text'];
    for (const key of fallbackKeys) {
      if (typeof finding[key] === 'string' && finding[key].trim()) {
        return finding[key].trim();
      }
    }

    return null;
  }

  /**
   * Get performance statistics from Phase 4 systems
   */
  public static getPhase4PerformanceStats() {
    const intelligenceMetrics = this.crossAgentIntelligence.getMetrics();
    return {
      agentLoader: this.agentLoader.getPerformanceStats(),
      crossAgentIntelligence: {
        activeProfiles: intelligenceMetrics.activeProfiles,
        globalInsights: intelligenceMetrics.insightSummary,
        totalInsights: intelligenceMetrics.totalInsights,
        totalRecommendations: intelligenceMetrics.totalRecommendations,
        trackedPatterns: intelligenceMetrics.trackedPatterns,
        lastAnalysisTimestamp: intelligenceMetrics.lastAnalysisTimestamp,
        topCategories: intelligenceMetrics.topCategories,
        recentRecommendations: intelligenceMetrics.recentRecommendations
      }
    };
  }

  /**
   * Preload popular agents for performance
   */
  public static async preloadPopularAgents(): Promise<void> {
    await this.agentLoader.preloadPopularAgents();
  }

  /**
   * Clear the agent cache (useful for testing or memory management)
   */
  public static clearCache(): void {
    this.lazyFactory.clearCache();
  }

  /**
   * Get all supported workflow IDs
   */
  public static getSupportedWorkflows(): AgentType[] {
    return this.lazyFactory.getAvailableAgentTypes();
  }

  /**
   * Check if a workflow is supported
   */
  public static isSupported(workflowId: string): workflowId is AgentType {
    return this.getSupportedWorkflows().includes(workflowId as AgentType);
  }

  /**
   * Preload common agents for better performance
   */
  public static async preloadCommonAgents(): Promise<void> {
    await this.lazyFactory.preloadCommonAgents();
  }

  /**
   * Preload critical agents for immediate use
   */
  public static async preloadCriticalAgents(): Promise<void> {
    await this.lazyFactory.preloadCriticalAgents();
  }

  /**
   * Optimize cache memory usage
   */
  public static optimizeCache(): void {
    this.lazyFactory.optimizeCache();
  }

  /**
   * Get memory usage estimation
   */
  public static getMemoryEstimate(): { totalAgents: number; estimatedMemoryMB: number } {
    return this.lazyFactory.getMemoryEstimate();
  }

  /**
   * Check if an agent is already loaded
   */
  public static isAgentLoaded(agentType: AgentType): boolean {
    return this.lazyFactory.isAgentLoaded(agentType);
  }

  /**
   * Get cache statistics for monitoring
   */
  public static getCacheStats(): { size: number; loadedAgents: AgentType[] } {
    return this.lazyFactory.getCacheStats();
  }

  /**
   * Enhance medical context with user phrasebook terminology preferences
   */
  private static async enhanceWithPhrasebook(
    context: MedicalContext = { sessionId: 'default', timestamp: Date.now() },
    agentType: AgentType
  ): Promise<MedicalContext> {
    try {
      const phrasebookService = PhrasebookService.getInstance();
      const terminologyBias = await phrasebookService.compileForSystemPrompt();

      if (terminologyBias.trim().length > 0) {
        const enhancedContext: MedicalContext = {
          ...context,
          enhancedProcessing: true,
          terminologyPreferences: terminologyBias
        };

        logger.info(`Enhanced context with phrasebook terminology for ${agentType}`, {
          component: 'agent-factory',
          operation: 'phrasebook-enhancement',
          agentType
        });
        return enhancedContext;
      }

      return context;
    } catch (error) {
      const err = toError(error);
      logger.warn('Failed to enhance context with phrasebook', {
        component: 'agent-factory',
        operation: 'phrasebook-enhancement',
        error: err.message
      });
      return context;
    }
  }
}
