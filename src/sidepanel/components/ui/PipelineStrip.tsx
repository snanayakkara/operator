/**
 * PipelineStrip Component
 *
 * Thin segmented progress strip showing processing pipeline stages.
 * Stages light up as they complete. Click to scroll to relevant section.
 */
/* eslint-disable react-refresh/only-export-components */

import React, { memo } from 'react';

export type PipelineStageId = 'record' | 'transcribe' | 'classify' | 'summary' | 'letter' | 'train';

export interface PipelineStageConfig {
  id: PipelineStageId;
  label: string;
  scrollTarget?: string; // CSS selector to scroll to
}

const PIPELINE_STAGES: PipelineStageConfig[] = [
  { id: 'record', label: 'Record' },
  { id: 'transcribe', label: 'Transcribe', scrollTarget: '#transcription-section' },
  { id: 'classify', label: 'Classify' },
  { id: 'summary', label: 'Summary', scrollTarget: '#summary-section' },
  { id: 'letter', label: 'Letter', scrollTarget: '#letter-section' },
  { id: 'train', label: 'Train' }
];

interface PipelineStripProps {
  /** Current active stage */
  activeStage?: PipelineStageId;
  /** Completed stages */
  completedStages?: PipelineStageId[];
  /** Callback when stage is clicked */
  onStageClick?: (stageId: PipelineStageId) => void;
  className?: string;
}

export const PipelineStrip: React.FC<PipelineStripProps> = memo(({
  activeStage,
  completedStages = [],
  onStageClick,
  className = ''
}) => {
  const handleClick = (stage: PipelineStageConfig) => {
    if (onStageClick) {
      onStageClick(stage.id);
    }

    // Scroll to target if defined
    if (stage.scrollTarget) {
      const element = document.querySelector(stage.scrollTarget);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className={`flex h-1 w-full gap-0.5 ${className}`}>
      {PIPELINE_STAGES.map((stage) => {
        const isCompleted = completedStages.includes(stage.id);
        const isActive = activeStage === stage.id;
        const isClickable = stage.scrollTarget || onStageClick;

        return (
          <button
            key={stage.id}
            onClick={() => handleClick(stage)}
            disabled={!isClickable}
            title={stage.label}
            className={`
              flex-1 h-full rounded-sm transition-all duration-200
              ${isCompleted
                ? 'bg-emerald-500'
                : isActive
                  ? 'bg-gray-900 animate-pulse'
                  : 'bg-gray-200'
              }
              ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
            `}
            aria-label={`${stage.label} ${isCompleted ? '(completed)' : isActive ? '(in progress)' : ''}`}
          />
        );
      })}
    </div>
  );
});

PipelineStrip.displayName = 'PipelineStrip';

/**
 * Helper to map existing PipelineStage to new PipelineStageId
 */
export function mapProcessingToPipelineStage(
  processingStage?: string,
  hasTranscription?: boolean,
  hasSummary?: boolean,
  hasLetter?: boolean
): { activeStage?: PipelineStageId; completedStages: PipelineStageId[] } {
  const completedStages: PipelineStageId[] = [];
  let activeStage: PipelineStageId | undefined;

  // Determine completed and active based on processing state
  switch (processingStage) {
    case 'audio-processing':
      activeStage = 'record';
      break;
    case 'transcribing':
      completedStages.push('record');
      activeStage = 'transcribe';
      break;
    case 'ai-analysis':
      completedStages.push('record', 'transcribe');
      activeStage = 'classify';
      break;
    case 'generation':
      completedStages.push('record', 'transcribe', 'classify');
      if (hasSummary) completedStages.push('summary');
      activeStage = hasLetter ? 'letter' : 'summary';
      break;
    default:
      // Completed state
      if (hasTranscription) completedStages.push('record', 'transcribe');
      if (hasSummary) completedStages.push('classify', 'summary');
      if (hasLetter) completedStages.push('letter');
      break;
  }

  return { activeStage, completedStages };
}

export default PipelineStrip;
