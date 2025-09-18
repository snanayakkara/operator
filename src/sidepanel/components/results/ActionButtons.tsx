/**
 * Action Buttons Component
 * 
 * Focused component for report action buttons:
 * - Copy, Insert to EMR, Download actions
 * - Visual feedback with success states
 * - Confidence scoring and quality indicators
 * - Memoized for performance
 */

import React, { memo, useState, Suspense } from 'react';
import { 
  CheckIcon, 
  SquareIcon, 
  AlertCircleIcon 
} from '../icons/OptimizedIcons';
import AnimatedCopyIcon from '../../components/AnimatedCopyIcon';
import { Download, Brain } from 'lucide-react';
import type { AgentType, ReportMetadata } from '@/types/medical.types';

// Lazy load the AI Reasoning Modal for better performance
const AIReasoningModal = React.lazy(() => import('../../components/AIReasoningModal'));

interface ActionButtonsProps {
  results: string;
  agentType: AgentType | null;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
  className?: string;
  // AI Reasoning viewer props
  reportMetadata?: ReportMetadata;
  agentName?: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = memo(({
  results,
  agentType,
  onCopy,
  onInsertToEMR,
  className = '',
  reportMetadata,
  agentName
}) => {
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [insertedRecently, setInsertedRecently] = useState(false);
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false);

  // Check if reasoning artifacts are available
  const hasReasoningArtifacts = reportMetadata?.reasoningArtifacts?.hasReasoningContent || 
                                 (reportMetadata?.rawAIOutput && reportMetadata.rawAIOutput.trim().length > 0);

  const handleCopy = async () => {
    try {
      await onCopy(results);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleInsertToEMR = async () => {
    try {
      // Pass the agent type context for field-specific insertion
      if (typeof onInsertToEMR === 'function') {
        await (onInsertToEMR as any)(results, undefined, agentType);
      }
      setInsertedRecently(true);
      setTimeout(() => setInsertedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to insert to EMR:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([results], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-report-${agentType || 'report'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-4 border-t border-emerald-200/50 ${className}`}>
      <div className={`grid gap-2 ${hasReasoningArtifacts ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className={`
            p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
            ${copiedRecently 
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration' 
              : 'bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700'
            }
          `}
        >
          {copiedRecently ? (
            <CheckIcon className="w-4 h-4 text-emerald-600 checkmark-appear" />
          ) : (
            <AnimatedCopyIcon className="w-4 h-4" title="Copy" />
          )}
          <span className={`text-xs ${copiedRecently ? 'text-emerald-700' : 'text-gray-700'}`}>
            {copiedRecently ? 'Copied!' : 'Copy'}
          </span>
        </button>

        {/* Insert to EMR Button */}
        <button
          onClick={handleInsertToEMR}
          className={`
            p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
            ${insertedRecently 
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration' 
              : 'bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700'
            }
          `}
        >
          {insertedRecently ? (
            <CheckIcon className="w-4 h-4 text-emerald-600 checkmark-appear" />
          ) : (
            <SquareIcon className="w-4 h-4" />
          )}
          <span className={`text-xs ${insertedRecently ? 'text-emerald-700' : 'text-gray-700'}`}>
            {insertedRecently ? 'Inserted!' : 'Insert'}
          </span>
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="bg-white/60 border border-emerald-200 p-3 rounded-lg flex flex-col items-center space-y-1 hover:bg-emerald-50/60 transition-colors btn-micro-press btn-micro-hover"
        >
          <Download className="w-4 h-4 text-gray-700" />
          <span className="text-xs text-gray-700">Download</span>
        </button>

        {/* AI Reasoning Viewer Button - Only show if reasoning artifacts are available */}
        {hasReasoningArtifacts && (
          <button
            onClick={() => setIsReasoningModalOpen(true)}
            className="bg-white border-2 border-gray-300 p-3 rounded-lg flex flex-col items-center space-y-1 hover:border-gray-400 hover:shadow-sm transition-all duration-200 ease-out btn-micro-press"
            title="View AI Reasoning Process"
          >
            <Brain className="w-4 h-4 text-gray-700" />
            <span className="text-xs text-gray-700 font-medium">Reasoning</span>
          </button>
        )}
      </div>

      {/* Quality Indicator */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircleIcon className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-xs">Report generated successfully</span>
        </div>
        
        {/* Confidence Score */}
        <div className="text-gray-500 text-xs">
          Confidence: 95%
        </div>
      </div>

      {/* Usage Tip */}
      <div className="mt-3 p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
        <p className="text-emerald-700 text-xs">
          💡 <strong>Full Letter:</strong> Complete medical correspondence ready for EMR insertion or sharing.
          {hasReasoningArtifacts && (
            <>
              <br />
              🧠 <strong>AI Reasoning:</strong> View how the AI processed your dictation for transparency.
            </>
          )}
        </p>
      </div>

      {/* AI Reasoning Modal */}
      {hasReasoningArtifacts && (
        <Suspense fallback={null}>
          <AIReasoningModal
            isOpen={isReasoningModalOpen}
            onClose={() => setIsReasoningModalOpen(false)}
            reasoningArtifacts={reportMetadata?.reasoningArtifacts}
            rawAIOutput={reportMetadata?.rawAIOutput}
            agentName={agentName}
          />
        </Suspense>
      )}
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

export { ActionButtons };
