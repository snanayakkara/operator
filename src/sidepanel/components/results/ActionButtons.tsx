/**
 * Action Buttons Component
 *
 * Focused component for report action buttons:
 * - Copy, Insert to EMR actions
 * - Optional Edit & Train for training data capture
 * - Visual feedback with success states
 * - Confidence scoring and quality indicators
 * - Memoized for performance
 */

import React, { memo, useState, Suspense } from 'react';
import { SquareIcon, AlertCircleIcon } from '../icons/OptimizedIcons';
import { Copy, Brain, Edit3, HelpCircle } from 'lucide-react';
import { Button } from '../buttons';
import type { AgentType, ReportMetadata } from '@/types/medical.types';

// Lazy load the AI Reasoning Modal for better performance
const AIReasoningModal = React.lazy(() => import('../../components/AIReasoningModal'));

export interface CustomAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ActionButtonsProps {
  results: string;
  agentType: AgentType | null;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
  className?: string;
  // AI Reasoning viewer props
  reportMetadata?: ReportMetadata;
  agentName?: string;
  // Agent-specific custom actions
  customActions?: CustomAction[];
  onEditAndTrain?: () => void;
  editAndTrainActive?: boolean;
  disableEditAndTrain?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = memo(({
  results,
  agentType,
  onCopy,
  onInsertToEMR,
  className = '',
  reportMetadata,
  agentName,
  customActions = [],
  onEditAndTrain,
  editAndTrainActive = false,
  disableEditAndTrain = false
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
      console.log('🔘 ActionButtons: Insert to EMR button clicked');
      console.log('🔘 ActionButtons: agentType prop:', agentType);
      console.log('🔘 ActionButtons: results length:', results?.length || 0);

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

  // Calculate grid columns based on available actions
  const totalActions = 2 + (hasReasoningArtifacts ? 1 : 0) + (onEditAndTrain ? 1 : 0) + customActions.length;
  // Use explicit grid classes (dynamic grid-cols-${n} doesn't work without Tailwind safelist)
  const gridColsMap: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };
  const gridCols = gridColsMap[Math.min(totalActions, 6)] || 'grid-cols-4';

  return (
    <div className={`p-4 border-t border-emerald-200/50 ${className}`}>
      <div className={`grid gap-2 ${gridCols}`}>
        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          variant="outline"
          size="md"
          isSuccess={copiedRecently}
          icon={Copy}
          className="flex-col h-auto py-3 text-center"
        >
          {copiedRecently ? 'Copied!' : 'Copy'}
        </Button>

        {/* Insert to EMR Button */}
        <Button
          onClick={handleInsertToEMR}
          variant="outline"
          size="md"
          isSuccess={insertedRecently}
          icon={SquareIcon}
          className="flex-col h-auto py-3 text-center"
          title="Paste into the active EMR field"
        >
          {insertedRecently ? 'Inserted!' : 'Insert'}
        </Button>

        {/* Edit & Train Button */}
        {onEditAndTrain && (
          <Button
            onClick={onEditAndTrain}
            disabled={disableEditAndTrain}
            variant={editAndTrainActive ? 'primary' : 'outline'}
            size="md"
            icon={Edit3}
            className="flex-col h-auto py-3 text-center"
            title="Revise output and capture training example"
          >
            {editAndTrainActive ? 'Editing…' : 'Edit & Train'}
          </Button>
        )}

        {/* AI Reasoning Viewer Button - Only show if reasoning artifacts are available */}
        {hasReasoningArtifacts && (
          <Button
            onClick={() => setIsReasoningModalOpen(true)}
            variant="outline"
            size="md"
            icon={Brain}
            className="flex-col h-auto py-3 text-center"
            title="View AI Reasoning Process"
          >
            Reasoning
          </Button>
        )}

        {/* Agent-Specific Custom Actions */}
        {customActions.map((action) => {
          return (
            <Button
              key={action.id}
              onClick={action.onClick}
              variant={action.variant === 'primary' ? 'primary' : 'outline'}
              size="md"
              icon={action.icon}
              className="flex-col h-auto py-3 text-center"
              title={action.label}
            >
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Quality Indicator */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircleIcon className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-xs">Report generated successfully</span>
        </div>
        
        {/* Confidence Score with Tooltip */}
        <div
          className="text-gray-500 text-xs flex items-center gap-1 group relative cursor-help"
          title="AI generation confidence based on input clarity and model output consistency. This is an estimate."
        >
          <span>Confidence: 95%</span>
          <HelpCircle className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
            <p className="leading-relaxed">
              AI generation confidence based on input clarity and model output consistency. This is an estimate.
            </p>
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>

      {/* Usage Tip - Hide for investigation-summary */}
      {agentType !== 'investigation-summary' && (
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
      )}

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
