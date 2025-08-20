/**
 * Optimized Results Panel Component
 * 
 * Streamlined composition of focused subcomponents:
 * - Uses React.memo for all expensive components
 * - Minimal re-renders through component isolation
 * - Clean separation of concerns
 * - Better performance through focused updates
 */

import React, { memo, useState, useMemo } from 'react';
import { FileTextIcon, AlertCircleIcon } from '../icons/OptimizedIcons';
import { EyeOff, Eye } from 'lucide-react';
import {
  ReportDisplay,
  TranscriptionSection,
  AIReviewCards,
  ActionButtons,
  WarningsPanel,
  TroubleshootingSection
} from './index';
import type { AgentType, FailedAudioRecording } from '@/types/medical.types';

interface OptimizedResultsPanelProps {
  results: string;
  agentType: AgentType | null;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
  warnings?: string[];
  onDismissWarnings?: () => void;
  originalTranscription?: string;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
  onTranscriptionEdit?: (text: string) => void;
  currentAgent?: AgentType | null;
  onAgentReprocess?: (agentType: AgentType) => void;
  isProcessing?: boolean;
  failedAudioRecordings?: FailedAudioRecording[];
  onClearFailedRecordings?: () => void;
  errors?: string[];
  reviewData?: any;
}

const OptimizedResultsPanel: React.FC<OptimizedResultsPanelProps> = memo(({
  results,
  agentType,
  onCopy,
  onInsertToEMR,
  warnings = [],
  onDismissWarnings,
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  currentAgent,
  onAgentReprocess,
  isProcessing = false,
  failedAudioRecordings = [],
  onClearFailedRecordings,
  errors = [],
  reviewData
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Memoized calculations for performance
  const reportMetrics = useMemo(() => {
    const wordCount = results.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    return { wordCount, readingTime };
  }, [results]);

  // Check if this is an AI Review result
  const isAIReview = agentType === 'ai-medical-review' && reviewData?.findings;

  const renderHeader = () => (
    <div className="p-4 border-b border-emerald-200/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isAIReview ? (
            <>
              <AlertCircleIcon className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-gray-900 font-medium text-sm">
                  {reviewData.isBatchReview ? 'Batch AI Medical Review' : 'AI Medical Review'}
                </h3>
                <p className="text-blue-700 text-xs">
                  {reviewData.isBatchReview 
                    ? 'Multi-patient clinical oversight recommendations' 
                    : 'Australian clinical oversight recommendations'}
                </p>
              </div>
            </>
          ) : (
            <>
              <FileTextIcon className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-gray-900 font-medium text-sm">Full Letter</h3>
                <p className="text-emerald-700 text-xs">Complete medical correspondence</p>
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white/60 border border-emerald-200 p-2 rounded-lg hover:bg-emerald-50/60 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <EyeOff className="w-4 h-4 text-emerald-600" />
          ) : (
            <Eye className="w-4 h-4 text-emerald-600" />
          )}
        </button>
      </div>
      
      {/* Stats */}
      <div className="flex items-center space-x-4 mt-2 text-xs">
        {isAIReview ? (
          <div className="text-blue-600 flex items-center space-x-2">
            <span>{reviewData.findings.length} clinical findings</span>
            <span>•</span>
            <span>{reviewData.findings.filter((f: any) => f.urgency === 'Immediate').length} immediate</span>
            {reviewData.isBatchReview && reviewData.batchSummary && (
              <>
                <span>•</span>
                <span>{reviewData.batchSummary.totalPatients} patients</span>
              </>
            )}
            <span>•</span>
            <span>{new Date().toLocaleTimeString()}</span>
            {warnings.length > 0 && <span>•</span>}
          </div>
        ) : (
          <div className="text-emerald-600 flex items-center space-x-2">
            <span>{reportMetrics.wordCount} words</span>
            <span>•</span>
            <span>{reportMetrics.readingTime} min read</span>
            <span>•</span>
            <span>{new Date().toLocaleTimeString()}</span>
            {warnings.length > 0 && <span>•</span>}
          </div>
        )}
        
        {/* Warning Badge */}
        {warnings.length > 0 && (
          <WarningsPanel 
            warnings={warnings} 
            onDismissWarnings={onDismissWarnings} 
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="letter-card rounded-2xl overflow-hidden shadow-lg border">
      {renderHeader()}
      
      {/* Original Transcription Section */}
      {originalTranscription && (
        <TranscriptionSection
          originalTranscription={originalTranscription}
          onTranscriptionCopy={onTranscriptionCopy}
          onTranscriptionInsert={onTranscriptionInsert}
          onAgentReprocess={onAgentReprocess}
          currentAgent={currentAgent}
          isProcessing={isProcessing}
        />
      )}

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {isAIReview ? (
            <AIReviewCards reviewData={reviewData} />
          ) : (
            <ReportDisplay 
              results={results} 
              agentType={agentType} 
            />
          )}
        </div>
      )}

      {/* Actions - Only for regular reports, not AI Review */}
      {!isAIReview && (
        <ActionButtons
          results={results}
          agentType={agentType}
          onCopy={onCopy}
          onInsertToEMR={onInsertToEMR}
        />
      )}

      {/* Troubleshooting Section */}
      <TroubleshootingSection
        failedAudioRecordings={failedAudioRecordings}
        errors={errors}
        onClearFailedRecordings={onClearFailedRecordings}
      />
    </div>
  );
});

OptimizedResultsPanel.displayName = 'OptimizedResultsPanel';

export { OptimizedResultsPanel };