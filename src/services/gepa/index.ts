/**
 * GEPA (Grounded Evaluation & Program Advancement) Services
 *
 * Browser-based GEPA evaluation components for real-time quality assessment
 * and performance monitoring of medical AI workflows.
 */

export { GEPAManager } from './GEPAManager';
export { StructureEvaluator } from './StructureEvaluator';
export { LatencyEvaluator } from './LatencyEvaluator';
export { ErrorSurfaceEvaluator } from './ErrorSurfaceEvaluator';
export { UIPathEvaluator } from './UIPathEvaluator';

export type {
  GEPAEvaluationCriteria,
  GEPAEvaluationResult,
  GEPAOverallResult,
  StructureEvaluationCriteria,
  LatencyEvaluationCriteria,
  ErrorSurfaceEvaluationCriteria,
  UIPathEvaluationCriteria,
  AgentEvaluationProfile,
  GEPASession,
  PerformanceMetrics,
  UIInteraction,
  GEPAEvaluator,
  GEPATelemetry
} from './GEPATypes';