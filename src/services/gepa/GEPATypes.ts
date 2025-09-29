/**
 * GEPA (Grounded Evaluation & Program Advancement) Types
 *
 * TypeScript interfaces for browser-based GEPA evaluation components.
 * These work alongside the external Python GEPA implementation for
 * real-time evaluation and feedback.
 */

export interface GEPAEvaluationCriteria {
  name: string;
  weight: number;
  threshold: number;
  description: string;
}

export interface GEPAEvaluationResult {
  criteria: string;
  score: number;
  maxScore: number;
  passed: boolean;
  feedback: string;
  suggestions: string[];
  metadata?: Record<string, any>;
}

export interface GEPAOverallResult {
  overallScore: number;
  maxScore: number;
  overallPassed: boolean;
  criteriaResults: GEPAEvaluationResult[];
  summary: string;
  timestamp: Date;
  processingTimeMs: number;
}

/**
 * Structure Evaluation Criteria
 */
export interface StructureEvaluationCriteria {
  requiredSections: string[];
  forbiddenElements: string[];
  minLength: number;
  maxLength: number;
  paragraphStructure: {
    minParagraphs: number;
    maxParagraphs: number;
    averageLength: number;
  };
}

/**
 * Latency Evaluation Criteria
 */
export interface LatencyEvaluationCriteria {
  maxTranscriptionTime: number;
  maxProcessingTime: number;
  maxTotalTime: number;
  targetPerformancePercentile: number;
}

/**
 * Error Surface Evaluation Criteria
 */
export interface ErrorSurfaceEvaluationCriteria {
  maxRetries: number;
  allowedExceptionTypes: string[];
  maxFailureRate: number;
  criticalErrorPatterns: string[];
}

/**
 * UI Path Success Evaluation Criteria
 */
export interface UIPathEvaluationCriteria {
  requiredUserActions: string[];
  maxUserInteractions: number;
  successPatterns: string[];
  failurePatterns: string[];
}

/**
 * Agent-specific evaluation profiles
 */
export interface AgentEvaluationProfile {
  agentType: string;
  structureCriteria: StructureEvaluationCriteria;
  latencyCriteria: LatencyEvaluationCriteria;
  errorCriteria: ErrorSurfaceEvaluationCriteria;
  uiCriteria: UIPathEvaluationCriteria;
  customCriteria?: Record<string, any>;
}

/**
 * GEPA Session Tracking
 */
export interface GEPASession {
  sessionId: string;
  agentType: string;
  startTime: Date;
  endTime?: Date;
  evaluationResults: GEPAOverallResult[];
  metadata: {
    patientId?: string;
    userId?: string;
    workflowType?: string;
    [key: string]: any;
  };
}

/**
 * Performance metrics for latency evaluation
 */
export interface PerformanceMetrics {
  transcriptionStartTime: number;
  transcriptionEndTime: number;
  processingStartTime: number;
  processingEndTime: number;
  totalStartTime: number;
  totalEndTime: number;
  retryCount: number;
  errors: Array<{
    type: string;
    message: string;
    timestamp: number;
  }>;
}

/**
 * UI interaction tracking for path evaluation
 */
export interface UIInteraction {
  type: 'click' | 'input' | 'accept' | 'skip' | 'edit' | 'cancel';
  element: string;
  timestamp: number;
  data?: any;
}

/**
 * GEPA evaluator interface
 */
export interface GEPAEvaluator<TCriteria = any> {
  name: string;
  description: string;
  evaluate(input: any, criteria: TCriteria): Promise<GEPAEvaluationResult>;
  getCriteria(): TCriteria;
  setCriteria(criteria: TCriteria): void;
}

/**
 * GEPA telemetry data
 */
export interface GEPATelemetry {
  sessionId: string;
  timestamp: Date;
  eventType: 'evaluation_start' | 'evaluation_complete' | 'evaluation_error' | 'user_interaction';
  data: Record<string, any>;
  metadata?: Record<string, any>;
}