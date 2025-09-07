import React, { memo, useCallback } from 'react';
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
  whisperServerRunning?: boolean;
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
  recordingTime = 0,
  whisperServerRunning = true
}) => {

  const handleWorkflowClick = useCallback((workflowId: AgentType) => {
    if (isRecording && activeWorkflow === workflowId) {
      // Stop recording for active workflow
      onWorkflowSelect(workflowId);
    } else if (!isRecording) {
      // Start recording immediately
      onWorkflowSelect(workflowId);
    }
  }, [isRecording, activeWorkflow, onWorkflowSelect]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonClasses = (workflow: WorkflowConfig, isActive: boolean) => {
    const baseClasses = "relative w-full h-16 rounded-2xl border flex flex-col items-center justify-center p-2 font-medium text-[9px] leading-tight";
    const disabledClasses = "opacity-50 cursor-not-allowed";
    
    if (disabled || !whisperServerRunning) {
      return `${baseClasses} bg-surface-primary border-line-primary text-ink-tertiary ${disabledClasses}`;
    }
    
    if (isActive && isRecording) {
      // Active recording - monochrome with accent red dot only
      return `${baseClasses} bg-surface-primary border-accent-red text-ink-primary shadow-sm`;
    }
    
    // Normal state - monochrome with subtle accent on hover
    return `${baseClasses} bg-surface-primary border-line-primary text-ink-secondary hover:text-ink-primary hover:border-accent-violet/30 hover:shadow-sm micro-lift transition-all duration-160`;
  };

  const renderWorkflowButton = (workflow: WorkflowConfig) => {
    const IconComponent = iconMap[workflow.icon as keyof typeof iconMap] || FileTextIcon;
    const isActive = activeWorkflow === workflow.id;
    
    // Generate tooltip with server status information
    const getTooltip = () => {
      if (!whisperServerRunning) {
        return "Whisper server not running. Please start server: ./start-whisper-server.sh";
      }
      return `${workflow.description} • ${workflow.estimatedTime} • ${workflow.complexity} complexity`;
    };
    
    return (
      <button
        key={workflow.id}
        onClick={() => handleWorkflowClick(workflow.id)}
        disabled={disabled || (isRecording && !isActive) || !whisperServerRunning}
        className={getButtonClasses(workflow, isActive)}
        title={getTooltip()}
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
            isActive && isRecording ? 'text-ink-primary font-bold' : ''
          }`}>
            {isActive && isRecording ? 'Complete' : workflow.label}
          </span>
          
          {/* Recording time for active workflow - monochrome */}
          {isActive && isRecording && (
            <span className="text-[10px] font-mono mt-1 text-center font-bold bg-surface-tertiary px-2 py-0.5 rounded-full text-ink-secondary">
              {formatTime(recordingTime)}
            </span>
          )}
          
          {/* Voice activity indicator for active workflow - minimal accent */}
          {isActive && isRecording && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
              <div 
                className="w-6 h-0.5 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: voiceActivityLevel > 0.1 ? 'var(--accent-emerald)' : 'var(--line-primary)',
                  opacity: 0.3 + (voiceActivityLevel * 0.7)
                }}
              />
            </div>
          )}
        </div>
        
        {/* Status badge - small accent dot */}
        {isActive && isRecording && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: 'var(--accent-red)'}} />
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <div className="card-primary rounded-3xl p-4 w-full min-h-[140px]">
        <div className="mb-3 text-center">
          <h2 className="text-ink-primary text-base font-semibold">
            Select workflow
          </h2>
          <p className="text-ink-secondary text-[9px]">
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
          <div className="text-center text-ink-tertiary text-[9px]">
            {whisperServerRunning ? (
              <p>Tap workflow to start recording</p>
            ) : (
              <p className="text-accent-red font-medium">⚠️ Whisper server not running - Please start server first</p>
            )}
          </div>
        )}

        
        {/* Recording status - minimal color */}
        {isRecording && activeWorkflow && (
          <div className="bg-surface-tertiary rounded-2xl p-3 text-center border border-line-primary">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{backgroundColor: 'var(--accent-red)'}} />
              <span className="text-ink-primary text-[9px] font-bold">
                Recording {WORKFLOWS.find(w => w.id === activeWorkflow)?.label}
              </span>
            </div>
            <p className="text-ink-secondary text-[9px] font-medium">
              {voiceActivityLevel > 0.1 ? '🎤 Listening...' : '🔇 Speak now'} • Tap <strong>Complete</strong> when done
            </p>
          </div>
        )}
      </div>

    </>
  );
});

WorkflowButtons.displayName = 'WorkflowButtons';