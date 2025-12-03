/**
 * OptimizationDashboard - Comprehensive optimization interface
 *
 * Unified single-page workflow showing all optimization steps in pipeline order:
 * 1. Transcription Optimization (ASR + Whisper fine-tune)
 * 2. Create Agent Training Examples (Dev Set)
 * 3. Measure Agent Performance (Evaluation)
 * 4. Auto-Improve Agent Instructions (GEPA)
 * 5. Validate Improvement
 */

import React from 'react';
import { UnifiedOptimizationWorkflow } from './UnifiedOptimizationWorkflow';

export const OptimizationDashboard: React.FC = () => {
  return <UnifiedOptimizationWorkflow />;
};
