/**
 * OptimizationStepCard - Reusable collapsible step card component
 *
 * Displays a single optimization step with:
 * - Step number and title
 * - Time estimate
 * - Status badge
 * - Plain English and technical explanations
 * - Collapsible content area
 * - Status information (last run, prerequisites, etc.)
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Info } from 'lucide-react';
import { StatusBadge, StepStatus } from './StatusBadge';

interface OptimizationStepCardProps {
  stepNumber: number;
  title: string;
  timeEstimate: string;
  status: StepStatus;
  plainEnglish: string;
  technical: string;
  statusInfo?: React.ReactNode;
  children: React.ReactNode;
  accentColor?: 'slate' | 'emerald' | 'blue' | 'purple' | 'teal';
  defaultExpanded?: boolean;
}

export const OptimizationStepCard: React.FC<OptimizationStepCardProps> = ({
  stepNumber,
  title,
  timeEstimate,
  status,
  plainEnglish,
  technical,
  statusInfo,
  children,
  accentColor = 'slate',
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getAccentClasses = () => {
    switch (accentColor) {
      case 'emerald':
        return 'border-emerald-200 bg-emerald-50';
      case 'blue':
        return 'border-blue-200 bg-blue-50';
      case 'purple':
        return 'border-purple-200 bg-purple-50';
      case 'teal':
        return 'border-teal-200 bg-teal-50';
      case 'slate':
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getTextClasses = () => {
    switch (accentColor) {
      case 'emerald':
        return 'text-emerald-900';
      case 'blue':
        return 'text-blue-900';
      case 'purple':
        return 'text-purple-900';
      case 'teal':
        return 'text-teal-900';
      case 'slate':
      default:
        return 'text-slate-900';
    }
  };

  return (
    <div className="bg-white border-2 border-line-primary rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className={`${getAccentClasses()} border-b-2 border-line-primary p-5 cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Step Number */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 ${getTextClasses()} font-bold text-lg`}>
              {stepNumber}
            </div>

            {/* Title and Status */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className={`text-lg font-bold ${getTextClasses()}`}>{title}</h3>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-ink-secondary">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeEstimate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button
            className="p-2 hover:bg-white rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-ink-secondary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-ink-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Explanations */}
          <div className="grid grid-cols-2 gap-4">
            {/* Plain English */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
                <span className="text-base">📝</span>
                <span>What this does</span>
              </div>
              <p className="text-sm text-ink-secondary leading-relaxed">
                {plainEnglish}
              </p>
            </div>

            {/* Technical */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
                <span className="text-base">🔧</span>
                <span>How it works</span>
              </div>
              <p className="text-sm text-ink-secondary leading-relaxed">
                {technical}
              </p>
            </div>
          </div>

          {/* Status Info */}
          {statusInfo && (
            <div className="bg-surface-secondary border border-line-primary rounded-lg p-4">
              {statusInfo}
            </div>
          )}

          {/* Main Content */}
          <div>{children}</div>
        </div>
      )}
    </div>
  );
};
