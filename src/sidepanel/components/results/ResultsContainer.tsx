/**
 * Results Container Component
 *
 * Provides a consistent wrapper for all agent results with:
 * - Standard header (title, metadata, status)
 * - Transcription section (always visible when available)
 * - Agent-specific content area (flexible slot)
 * - Standard action buttons (Copy, Insert, Download)
 *
 * This ensures all agents have the same chrome/layout, with flexibility
 * for specialized content displays (TAVI grids, AI Review cards, etc.)
 */

import React, { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FileTextIcon, Clock, CheckCircle } from 'lucide-react';
import { TranscriptionSection } from './TranscriptionSection';
import { ActionButtons } from './ActionButtons';
import { cardVariants, withReducedMotion } from '@/utils/animations';
import { formatAbsoluteTime, calculateWordCount, calculateReadTime, formatReadTime } from '@/utils/formatting';
import type { AgentType, ReportMetadata } from '@/types/medical.types';
import type { TranscriptionApprovalState, TranscriptionApprovalStatus } from '@/types/optimization';

interface ResultsContainerProps {
  // Header props
  agentType: AgentType | null;
  title?: string;
  subtitle?: string;
  completedTime?: number;
  processingTime?: number;
  confidence?: number;

  // Transcription props
  originalTranscription?: string;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
  onTranscriptionEdit?: (text: string) => void;
  transcriptionSaveStatus?: {
    status: 'idle' | 'saving' | 'saved' | 'error';
    message: string;
    timestamp?: Date;
  };
  onAgentReprocess?: (agentType: AgentType) => void;
  /**
   * Retry transcription from stored audio when Whisper server was unavailable.
   */
  onRetryTranscription?: () => void;
  /**
   * Whether transcription retry is currently in progress
   */
  isRetryingTranscription?: boolean;
  isProcessing?: boolean;
  audioBlob?: Blob | null;
  transcriptionApprovalState?: TranscriptionApprovalState;
  onTranscriptionApprove?: (status: TranscriptionApprovalStatus) => void;

  // Content area (agent-specific display)
  children: ReactNode;

  // Action buttons props
  results: string;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
  reportMetadata?: ReportMetadata;
  agentName?: string;

  // Layout control
  className?: string;
  hideTranscription?: boolean;
  hideActions?: boolean;
}

export const ResultsContainer: React.FC<ResultsContainerProps> = memo(({
  // Header
  agentType,
  title,
  subtitle,
  completedTime,
  processingTime,
  confidence,

  // Transcription
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  transcriptionSaveStatus,
  onAgentReprocess,
  onRetryTranscription,
  isRetryingTranscription = false,
  isProcessing = false,
  audioBlob,
  transcriptionApprovalState,
  onTranscriptionApprove,

  // Content
  children,

  // Actions
  results,
  onCopy,
  onInsertToEMR,
  reportMetadata,
  agentName,

  // Layout
  className = '',
  hideTranscription = false,
  hideActions = false
}) => {
  const wordCount = calculateWordCount(results);
  const readTime = calculateReadTime(wordCount);

  // Default title based on agent type
  const displayTitle = title || (agentType ? `${agentType.charAt(0).toUpperCase() + agentType.slice(1).replace('-', ' ')} Results` : 'Results');

  return (
    <motion.div
      className={`operator-results-container bg-white/95 backdrop-blur-sm rounded-card shadow-card border border-gray-200 overflow-hidden ${className}`}
      variants={withReducedMotion(cardVariants)}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Standard Header */}
      <div className="operator-results-header bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-4 border-b border-emerald-200/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <FileTextIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {displayTitle}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
                {completedTime && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatAbsoluteTime(completedTime)}</span>
                  </div>
                )}

                {processingTime && (
                  <div className="flex items-center space-x-1">
                    <span>•</span>
                    <span>{(processingTime / 1000).toFixed(1)}s processing</span>
                  </div>
                )}

                {wordCount > 0 && (
                  <div className="flex items-center space-x-1">
                    <span>•</span>
                    <span>{wordCount} words</span>
                  </div>
                )}

                {readTime && (
                  <div className="flex items-center space-x-1">
                    <span>•</span>
                    <span>{formatReadTime(readTime)} read</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success indicator */}
          <div className="flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Confidence indicator */}
        {confidence !== undefined && confidence > 0 && (
          <div className="mt-3 pt-3 border-t border-emerald-200/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">AI Confidence</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-emerald-700">{confidence}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Section (if available) */}
      {!hideTranscription && originalTranscription && (
        <TranscriptionSection
          originalTranscription={originalTranscription}
          onTranscriptionCopy={onTranscriptionCopy}
          onTranscriptionInsert={onTranscriptionInsert}
          onTranscriptionEdit={onTranscriptionEdit}
          transcriptionSaveStatus={transcriptionSaveStatus}
          onAgentReprocess={onAgentReprocess}
          onRetryTranscription={onRetryTranscription}
          isRetryingTranscription={isRetryingTranscription}
          currentAgent={agentType}
          isProcessing={isProcessing}
          audioBlob={audioBlob}
          defaultExpanded={false}
          collapseWhen={!isProcessing}
          approvalState={transcriptionApprovalState}
          onTranscriptionApprove={onTranscriptionApprove}
        />
      )}

      {/* Agent-Specific Content Area */}
      <div className="results-content">
        {children}
      </div>

      {/* Standard Action Buttons (if not hidden) */}
      {!hideActions && (
        <ActionButtons
          results={results}
          agentType={agentType}
          onCopy={onCopy}
          onInsertToEMR={onInsertToEMR}
          reportMetadata={reportMetadata}
          agentName={agentName}
        />
      )}
    </motion.div>
  );
});

ResultsContainer.displayName = 'ResultsContainer';
