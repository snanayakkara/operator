/**
 * PipelineStatusHeader - Overview header showing quick status of all 5 steps
 *
 * Displays a summary of the entire optimization pipeline with quick
 * status indicators for each step, allowing users to see at a glance
 * what's ready to run.
 */

import React from 'react';
import { Info } from 'lucide-react';
import { StepStatus } from './StatusBadge';

interface StepSummary {
  number: number;
  title: string;
  status: string;
}

interface PipelineStatusHeaderProps {
  steps: StepSummary[];
}

export const PipelineStatusHeader: React.FC<PipelineStatusHeaderProps> = ({ steps }) => {
  return (
    <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-ink-primary">Optimization Pipeline</h2>
          <p className="text-sm text-ink-secondary mt-1">
            Follow the 5-step process below to optimize your AI end-to-end
          </p>
        </div>

        {/* Quick Status */}
        <div className="bg-white border border-line-primary rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-ink-secondary" />
            <h3 className="text-sm font-semibold text-ink-primary">Quick Status</h3>
          </div>
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-3 text-sm">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-secondary text-ink-primary font-semibold text-xs flex-shrink-0">
                  {step.number}
                </span>
                <div className="flex-1">
                  <span className="font-medium text-ink-primary">{step.title}:</span>{' '}
                  <span className="text-ink-secondary">{step.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
