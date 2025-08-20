import React, { useState, useCallback } from 'react';
import { Pill, Mic, Keyboard } from 'lucide-react';
import type { AgentType } from '@/types/medical.types';

interface ExpandableMedicationButtonProps {
  onStartWorkflow?: (workflowId: AgentType) => void;
  onQuickAction: (actionId: string, data?: any) => Promise<void>;
  processingAction: string | null;
  isFooter?: boolean;
}

export const ExpandableMedicationButton: React.FC<ExpandableMedicationButtonProps> = ({
  onStartWorkflow,
  onQuickAction,
  processingAction,
  isFooter = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isProcessing = processingAction === 'medications';

  const handleMouseEnter = useCallback(() => {
    if (!isProcessing) {
      setIsHovered(true);
    }
  }, [isProcessing]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleDictate = useCallback(() => {
    if (onStartWorkflow) {
      onStartWorkflow('medication');
    }
    setIsHovered(false); // Reset hover state after action
  }, [onStartWorkflow]);

  const handleType = useCallback(async () => {
    await onQuickAction('medications', { type: 'manual' });
    setIsHovered(false); // Reset hover state after action
  }, [onQuickAction]);

  if (isFooter) {
    // Footer compact version
    return (
      <div
        className="relative overflow-hidden min-h-16"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ minHeight: '64px' }}
      >
        {/* Collapsed state - single button */}
        <div className={`
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
        `}>
          <button
            disabled={isProcessing}
            className={`
              glass-button relative p-2 rounded-lg transition-all hover:bg-gray-50 text-center w-full h-full
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex flex-col items-center space-y-1">
              <Pill className="w-3 h-3 text-blue-600 flex-shrink-0" />
              <div className="text-gray-900 text-xs font-medium leading-tight">
                Medications
              </div>
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>

        {/* Expanded state - split buttons */}
        <div className={`
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}>
          <div className="flex overflow-hidden rounded-lg border border-emerald-200 bg-white h-full">
            <button
              onClick={handleDictate}
              className="flex-1 p-2 text-center hover:bg-emerald-50 transition-colors border-r border-emerald-200"
              title="Dictate medication list with simple formatting"
            >
              <div className="flex flex-col items-center space-y-1">
                <Mic className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-medium text-gray-900">Dictate</span>
              </div>
            </button>
            <button
              onClick={handleType}
              className="flex-1 p-2 text-center hover:bg-emerald-50 transition-colors"
              title="Access medications section in EMR"
            >
              <div className="flex flex-col items-center space-y-1">
                <Keyboard className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-medium text-gray-900">Type</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular version for main quick actions
  return (
    <div
      className="relative overflow-hidden min-h-20"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ minHeight: '80px' }}
    >
      {/* Collapsed state - single button */}
      <div className={`
        transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
      `}>
        <button
          disabled={isProcessing}
          className={`
            glass-button p-3 rounded-lg text-left transition-all hover:bg-gray-50 w-full
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-start space-x-2">
            <Pill className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-gray-900 text-xs font-medium truncate">
                Medications
              </div>
              <div className="text-gray-600 text-xs mt-1 leading-tight">
                View/edit medication list
              </div>
            </div>
          </div>
          
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}
        </button>
      </div>

      {/* Expanded state - split buttons */}
      <div className={`
        absolute inset-0 transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}>
        <div className="flex overflow-hidden rounded-lg glass-button border h-full">
          <button
            onClick={handleDictate}
            className="flex-1 p-3 text-left hover:bg-emerald-50 transition-colors border-r border-gray-200"
            title="Dictate medication list with simple formatting"
          >
            <div className="flex items-start space-x-2">
              <Mic className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-gray-900 text-xs font-medium truncate">
                  Dictate List
                </div>
                <div className="text-gray-600 text-xs mt-1 leading-tight">
                  Voice-to-text with simple formatting
                </div>
              </div>
            </div>
          </button>
          
          <button
            onClick={handleType}
            className="flex-1 p-3 text-left hover:bg-blue-50 transition-colors"
            title="Access medications section in EMR"
          >
            <div className="flex items-start space-x-2">
              <Keyboard className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-gray-900 text-xs font-medium truncate">
                  EMR Access
                </div>
                <div className="text-gray-600 text-xs mt-1 leading-tight">
                  Navigate to medications section
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};