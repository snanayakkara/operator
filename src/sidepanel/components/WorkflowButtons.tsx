import React, { memo } from 'react';
import { WORKFLOWS, type WorkflowConfig } from '@/config/workflowConfig';
import type { AgentType } from '@/types/medical.types';
import { 
  HeartIcon,
  FileTextIcon,
  ActivityIcon,
  StethoscopeIcon,
  CircleDotIcon,
  MicIcon,
  SquareIcon,
  SearchIcon,
  UserIcon,
  PillIcon,
  ShieldIcon
} from './icons/OptimizedIcons';

interface WorkflowButtonsProps {
  onWorkflowSelect: (workflowId: AgentType) => void;
  activeWorkflow: AgentType | null;
  isRecording: boolean;
  disabled?: boolean;
  voiceActivityLevel?: number;
  recordingTime?: number;
}

// Optimized icon mapping
const iconMap = {
  Heart: HeartIcon,
  FileText: FileTextIcon,
  Activity: ActivityIcon,
  Stethoscope: StethoscopeIcon,
  CircleDot: CircleDotIcon,
  Mic: MicIcon,
  Square: SquareIcon,
  Search: SearchIcon,
  User: UserIcon,
  Pill: PillIcon,
  Shield: ShieldIcon
} as const;

export const WorkflowButtons: React.FC<WorkflowButtonsProps> = memo(({
  onWorkflowSelect,
  activeWorkflow,
  isRecording,
  disabled = false,
  voiceActivityLevel = 0,
  recordingTime = 0
}) => {
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonClasses = (workflow: WorkflowConfig, isActive: boolean) => {
    const baseClasses = "relative w-full h-16 rounded-lg border-2 flex flex-col items-center justify-center p-2 font-medium text-[9px] leading-tight";
    const disabledClasses = "opacity-50 cursor-not-allowed";
    
    if (disabled) {
      return `${baseClasses} glass-button border-gray-300 ${disabledClasses}`;
    }
    
    if (isActive && isRecording) {
      // Use semantic colors for active recording state
      const categoryClass = workflow.category === 'procedure' ? 'procedure-card' : 
                           workflow.category === 'documentation' ? 'documentation-card' : 
                           'investigation-card';
      return `${baseClasses} ${categoryClass} recording-glow border-2`;
    }
    
    // Normal state - enhanced outline styling with peak-end animations
    const categoryClass = workflow.category === 'procedure' ? 'btn-procedure-outline' : 
                         workflow.category === 'documentation' ? 'btn-documentation-outline' : 
                         'btn-investigation-outline';
    return `${baseClasses} ${categoryClass} border-2 btn-hover-enhanced`;
  };

  const renderWorkflowButton = (workflow: WorkflowConfig) => {
    const IconComponent = iconMap[workflow.icon as keyof typeof iconMap] || FileTextIcon;
    const isActive = activeWorkflow === workflow.id;
    
    return (
      <button
        key={workflow.id}
        onClick={() => onWorkflowSelect(workflow.id)}
        disabled={disabled || (isRecording && !isActive)}
        className={getButtonClasses(workflow, isActive)}
        title={`${workflow.description} • ${workflow.estimatedTime} • ${workflow.complexity} complexity`}
      >
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          {/* Icon */}
          <div className="relative mb-1">
            {isActive && isRecording ? (
              <SquareIcon className="w-4 h-4" />
            ) : (
              <IconComponent className="w-4 h-4" />
            )}
            
            {/* Recording indicator pulse */}
            {isActive && isRecording && (
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            )}
          </div>
          
          {/* Label - compact */}
          <span className={`text-[9px] font-semibold text-center leading-tight truncate w-full px-1 ${
            isActive && isRecording ? 'text-red-700 font-bold' : ''
          }`}>
            {isActive && isRecording ? 'Stop & Process' : workflow.label}
          </span>
          
          {/* Recording time for active workflow - more prominent */}
          {isActive && isRecording && (
            <span className="text-[10px] font-mono mt-1 text-center font-bold bg-red-500/10 px-2 py-0.5 rounded">
              {formatTime(recordingTime)}
            </span>
          )}
          
          {/* Voice activity indicator for active workflow - smaller */}
          {isActive && isRecording && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
              <div 
                className="w-6 h-0.5 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: voiceActivityLevel > 0.1 ? '#10b981' : '#e5e7eb',
                  opacity: 0.3 + (voiceActivityLevel * 0.7)
                }}
              />
            </div>
          )}
        </div>
        
        {/* Status badge */}
        {isActive && isRecording && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="glass rounded-xl p-3 w-full min-h-[140px]">
      <div className="mb-3 text-center">
        <h2 className="text-gray-900 text-base font-semibold">
          Select Workflow
        </h2>
        <p className="text-gray-600 text-[9px]">
          {isRecording 
            ? `Recording ${WORKFLOWS.find(w => w.id === activeWorkflow)?.label}...`
            : 'Choose the type of medical report to create'
          }
        </p>
      </div>
      
      {/* Workflow buttons grid - compact 2×3 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {WORKFLOWS.map(renderWorkflowButton)}
      </div>
      
      {/* Instructions - compact */}
      {!isRecording && (
        <div className="text-center text-gray-500 text-[9px]">
          <p>Tap workflow to start recording</p>
        </div>
      )}
      
      {/* Recording status - compact */}
      {isRecording && activeWorkflow && (
        <div className="glass rounded-lg p-2 text-center bg-red-50 border border-red-200">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-800 text-[9px] font-bold">
              Recording {WORKFLOWS.find(w => w.id === activeWorkflow)?.label}
            </span>
          </div>
          <p className="text-red-700 text-[9px] font-medium">
            {voiceActivityLevel > 0.1 ? '🎤 Listening...' : '🔇 Speak now'} • Tap <strong>Stop & Process</strong> when done
          </p>
        </div>
      )}
    </div>
  );
});

WorkflowButtons.displayName = 'WorkflowButtons';