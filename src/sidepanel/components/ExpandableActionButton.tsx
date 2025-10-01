import React, { useState, useCallback } from 'react';
import { Mic, Keyboard, LucideIcon } from 'lucide-react';
import type { AgentType } from '@/types/medical.types';

export interface ExpandableActionConfig {
  icon: LucideIcon;
  label: string;
  actionId: string;
  workflowId: AgentType;
  color: string; // Tailwind color class like 'blue', 'purple', 'emerald'
}

interface ExpandableActionButtonProps {
  config: ExpandableActionConfig;
  onStartWorkflow?: (workflowId: AgentType, quickActionField?: string) => void;
  onQuickAction: (actionId: string, data?: any) => Promise<void>;
  processingAction: string | null;
  isFooter?: boolean;
}

export const ExpandableActionButton: React.FC<ExpandableActionButtonProps> = ({
  config,
  onStartWorkflow,
  onQuickAction,
  processingAction,
  isFooter = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isProcessing = processingAction === config.actionId;
  const IconComponent = config.icon;

  const handleMouseEnter = useCallback(() => {
    if (!isProcessing) {
      setIsHovered(true);
    }
  }, [isProcessing]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleDictate = useCallback(async () => {
    // For bloods agent, open the modal first before starting recording
    if (config.actionId === 'bloods' && onQuickAction) {
      await onQuickAction(config.actionId, { type: 'prepare-modal' });
    }

    if (onStartWorkflow) {
      // Pass the actionId as the second parameter for Quick Action field tracking
      onStartWorkflow(config.workflowId, config.actionId);
    }
    setIsHovered(false);
  }, [onStartWorkflow, onQuickAction, config.workflowId, config.actionId]);

  const handleType = useCallback(async () => {
    await onQuickAction(config.actionId, { type: 'manual' });
    setIsHovered(false);
  }, [onQuickAction, config.actionId]);

  if (isFooter) {
    // Footer compact version
    return (
      <div
        className="relative overflow-hidden min-h-10"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ minHeight: '40px' }}
      >
        {/* Collapsed state - single button */}
        <div className={`
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
        `}>
          <button
            disabled={isProcessing}
            className={`
              bg-transparent hover:bg-gray-50 transition-all duration-200 ease-out rounded-lg text-left w-full h-full p-1.5
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center space-x-1.5">
              <IconComponent className={`w-3 h-3 text-${config.color}-600 flex-shrink-0`} />
              <div className="text-gray-900 text-[10px] font-medium leading-tight min-w-0 flex-1">
                {config.label}
              </div>
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className={`w-3 h-3 border-2 border-gray-300 border-t-${config.color}-600 rounded-full animate-spin`} />
              </div>
            )}
          </button>
        </div>

        {/* Expanded state - split buttons */}
        <div className={`
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}>
          <div className="grid grid-cols-2 gap-1 h-full">
            {/* Dictate Button */}
            <button
              onClick={handleDictate}
              disabled={isProcessing}
              className={`
                bg-transparent hover:bg-gray-50 transition-all duration-200 ease-out rounded-lg 
                relative flex items-center justify-center p-1 text-left
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Mic className={`w-2.5 h-2.5 text-${config.color}-600 flex-shrink-0 mr-1`} />
              <div className="text-gray-900 text-[10px] font-medium leading-tight min-w-0 flex-1">
                Dictate
              </div>
            </button>

            {/* Type Button */}
            <button
              onClick={handleType}
              disabled={isProcessing}
              className={`
                bg-transparent hover:bg-gray-50 transition-all duration-200 ease-out rounded-lg 
                relative flex items-center justify-center p-1 text-left
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Keyboard className={`w-2.5 h-2.5 text-${config.color}-600 flex-shrink-0 mr-1`} />
              <div className="text-gray-900 text-[10px] font-medium leading-tight min-w-0 flex-1">
                Type
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar version
  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Collapsed state - single button */}
      <div className={`
        transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
      `}>
        <button
          disabled={isProcessing}
          className={`
            bg-transparent hover:bg-gray-50 relative flex items-center p-3 rounded-lg transition-all 
            hover:bg-gray-50 text-left w-full
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <IconComponent className={`w-4 h-4 text-${config.color}-600 flex-shrink-0 mr-3`} />
          <div className="flex-1 min-w-0">
            <div className="text-gray-900 font-medium text-sm">
              {config.label}
            </div>
            <div className={`text-${config.color}-600 text-xs`}>
              Quick entry and processing
            </div>
          </div>
          
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className={`w-4 h-4 border-2 border-gray-300 border-t-${config.color}-600 rounded-full animate-spin`} />
            </div>
          )}
        </button>
      </div>

      {/* Expanded state - split buttons */}
      <div className={`
        transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}>
        <div className="space-y-2">
          {/* Dictate Button */}
          <button
            onClick={handleDictate}
            disabled={isProcessing}
            className={`
              bg-transparent hover:bg-gray-50 relative flex items-center p-3 rounded-lg transition-all 
              hover:bg-${config.color}-50 text-left w-full
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Mic className={`w-4 h-4 text-${config.color}-600 flex-shrink-0 mr-3`} />
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 font-medium text-sm">
                Dictate {config.label}
              </div>
              <div className={`text-${config.color}-600 text-xs`}>
                Voice recording and AI processing
              </div>
            </div>
          </button>

          {/* Type Button */}
          <button
            onClick={handleType}
            disabled={isProcessing}
            className={`
              bg-transparent hover:bg-gray-50 relative flex items-center p-3 rounded-lg transition-all 
              hover:bg-${config.color}-50 text-left w-full
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Keyboard className={`w-4 h-4 text-${config.color}-600 flex-shrink-0 mr-3`} />
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 font-medium text-sm">
                Type {config.label}
              </div>
              <div className={`text-${config.color}-600 text-xs`}>
                Manual entry and quick processing
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};