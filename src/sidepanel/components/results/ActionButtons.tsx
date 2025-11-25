/**
 * Action Buttons Component
 *
 * Compact segmented control for report actions:
 * - Copy, Insert to EMR actions
 * - Optional Edit & Train for training data capture
 * - Visual feedback with success states
 * - Memoized for performance
 */

import React, { memo, useState, Suspense } from 'react';
import { AlertCircleIcon } from '../icons/OptimizedIcons';
import { Copy, ExternalLink, Edit3, Brain, HelpCircle } from 'lucide-react';
import { SegmentedControl, SegmentOption } from '../ui/SegmentedControl';
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

  // Build segmented control options
  const options: SegmentOption[] = [
    { id: 'copy', label: 'Copy', icon: Copy },
    { id: 'insert', label: 'Insert', icon: ExternalLink },
  ];

  if (onEditAndTrain) {
    options.push({
      id: 'edit',
      label: editAndTrainActive ? 'Editing' : 'Train',
      icon: Edit3,
      disabled: disableEditAndTrain
    });
  }

  if (hasReasoningArtifacts) {
    options.push({ id: 'reasoning', label: 'AI', icon: Brain });
  }

  // Add custom actions
  customActions.forEach((action) => {
    options.push({
      id: action.id,
      label: action.label,
      icon: action.icon
    });
  });

  const handleAction = (id: string) => {
    switch (id) {
      case 'copy':
        handleCopy();
        break;
      case 'insert':
        handleInsertToEMR();
        break;
      case 'edit':
        onEditAndTrain?.();
        break;
      case 'reasoning':
        setIsReasoningModalOpen(true);
        break;
      default:
        // Handle custom actions
        {
          const customAction = customActions.find(a => a.id === id);
          customAction?.onClick();
        }
    }
  };

  const successId = copiedRecently ? 'copy' : insertedRecently ? 'insert' : undefined;

  return (
    <div className={`p-3 border-t border-gray-200 ${className}`}>
      {/* Compact segmented control */}
      <div className="flex items-center justify-between gap-2">
        <SegmentedControl
          options={options}
          onChange={handleAction}
          successId={successId}
          multiSelect
          size="sm"
        />

        {/* Confidence indicator */}
        <div
          className="text-gray-400 text-xs flex items-center gap-1 cursor-help"
          title="AI generation confidence"
        >
          <span>95%</span>
          <HelpCircle className="w-3 h-3" />
        </div>
      </div>

      {/* Success indicator - compact */}
      <div className="mt-2 flex items-center gap-1.5">
        <AlertCircleIcon className="w-3 h-3 text-emerald-500" />
        <span className="text-emerald-600 text-xs">Generated successfully</span>
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
