/**
 * Warnings Panel Component
 * 
 * Focused component for displaying content warnings:
 * - Expandable warnings display
 * - Dismissal functionality
 * - Warning count badges
 * - Memoized for performance
 */

import React, { memo, useState } from 'react';
import { AlertCircleIcon } from '../icons/OptimizedIcons';

interface WarningsPanelProps {
  warnings?: string[];
  onDismissWarnings?: () => void;
  className?: string;
}

const WarningsPanel: React.FC<WarningsPanelProps> = memo(({
  warnings = [],
  onDismissWarnings,
  className = ''
}) => {
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <>
      {/* Warning Badge - for header stats */}
      <button
        onClick={() => setWarningsExpanded(!warningsExpanded)}
        className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
        title={`${warnings.length} warning${warnings.length !== 1 ? 's' : ''} - click to ${warningsExpanded ? 'hide' : 'view'}`}
      >
        <AlertCircleIcon className="w-3 h-3" />
        <span>{warnings.length}</span>
      </button>

      {/* Expandable Warnings Section */}
      {warningsExpanded && (
        <div className={`p-4 border-b border-orange-200/50 bg-orange-50/30 ${className}`}>
          <div className="flex items-start space-x-3">
            <AlertCircleIcon className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-orange-800 font-medium text-sm mb-2">Content Warnings</h4>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-orange-700 text-sm leading-relaxed">
                    • {warning}
                  </li>
                ))}
              </ul>
              {onDismissWarnings && (
                <button
                  onClick={() => {
                    onDismissWarnings();
                    setWarningsExpanded(false);
                  }}
                  className="mt-3 text-orange-600 hover:text-orange-700 text-xs font-medium transition-colors"
                >
                  Dismiss warnings
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

WarningsPanel.displayName = 'WarningsPanel';

export { WarningsPanel };