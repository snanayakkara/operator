import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShieldIcon,
  MonitorIcon
} from './icons/OptimizedIcons';
import { Keyboard } from 'lucide-react';
import { 
  staggerContainer,
  listItemVariants,
  workflowButtonVariants,
  voiceActivityVariants as _voiceActivityVariants,
  withReducedMotion,
  STAGGER_CONFIGS,
  ANIMATION_DURATIONS
} from '@/utils/animations';

interface WorkflowButtonsProps {
  onWorkflowSelect: (workflowId: AgentType) => void;
  activeWorkflow: AgentType | null;
  isRecording: boolean;
  disabled?: boolean;
  voiceActivityLevel?: number;
  recordingTime?: number;
  whisperServerRunning?: boolean;
  onPasteLetterClick?: () => void;
  onTypeClick?: (workflowId: AgentType) => void; // For expandable workflows that support Type mode
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
  Shield: ShieldIcon,
  Monitor: MonitorIcon
} as const;

export const WorkflowButtons: React.FC<WorkflowButtonsProps> = memo(({
  onWorkflowSelect,
  activeWorkflow,
  isRecording,
  disabled = false,
  voiceActivityLevel = 0,
  recordingTime = 0,
  whisperServerRunning = true,
  onTypeClick
}) => {
  const [hoveredExpandableId, setHoveredExpandableId] = React.useState<AgentType | null>(null);

  const handleWorkflowClick = useCallback((workflowId: AgentType) => {
    console.log('🎯 Workflow button clicked:', {
      workflowId,
      isRecording,
      activeWorkflow,
      disabled,
      whisperServerRunning
    });

    if (isRecording && activeWorkflow === workflowId) {
      // Stop recording for active workflow
      onWorkflowSelect(workflowId);
    } else if (!isRecording) {
      // Start recording immediately
      onWorkflowSelect(workflowId);
    }
  }, [isRecording, activeWorkflow, onWorkflowSelect, disabled, whisperServerRunning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonClasses = (workflow: WorkflowConfig, isActive: boolean) => {
    const baseClasses = "relative w-full aspect-square min-h-[96px] min-w-[96px] rounded-2xl border flex flex-col items-center justify-center p-3 font-medium text-[8px] leading-snug";
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
    const isHovered = hoveredExpandableId === workflow.id;
    const isExpandable = workflow.isExpandable && !isRecording && !disabled && whisperServerRunning && onTypeClick;

    // Generate tooltip with server status information
    const getTooltip = () => {
      if (!whisperServerRunning) {
        return "Whisper server not running. Please start server: ./start-whisper-server.sh";
      }
      return `${workflow.description} • ${workflow.estimatedTime} • ${workflow.complexity} complexity`;
    };

    // Determine animation state
    const getAnimationVariant = () => {
      if (disabled || !whisperServerRunning) return 'disabled';
      if (isActive && isRecording) return 'recording';
      if (isActive) return 'active';
      return 'inactive';
    };

    // Handle expandable workflow hover states
    const handleMouseEnter = useCallback(() => {
      if (isExpandable) {
        setHoveredExpandableId(workflow.id);
      }
    }, [isExpandable, workflow.id]);

    const handleMouseLeave = useCallback(() => {
      if (isExpandable) {
        setHoveredExpandableId(null);
      }
    }, [isExpandable]);

    const handleTypeClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (onTypeClick) {
        onTypeClick(workflow.id);
      }
      setHoveredExpandableId(null);
    }, [onTypeClick, workflow.id]);

    return (
      <motion.div
        key={workflow.id}
        variants={withReducedMotion(listItemVariants)}
        whileHover={!disabled && whisperServerRunning ? "hover" : undefined}
        whileTap={!disabled && whisperServerRunning ? "tap" : undefined}
        className="group relative w-full h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Non-expandable or collapsed state */}
        {(!isExpandable || !isHovered) && (
          <motion.button
          onClick={() => handleWorkflowClick(workflow.id)}
          disabled={disabled || (isRecording && !isActive) || !whisperServerRunning}
          className={getButtonClasses(workflow, isActive)}
          title={getTooltip()}
          variants={withReducedMotion(workflowButtonVariants)}
          animate={getAnimationVariant()}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300
          }}
        >
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            {/* Icon with animation */}
            <motion.div
              className="relative mb-1.5"
              animate={{
                rotate: isActive && isRecording ? [0, 2, -2, 0] : 0
              }}
              transition={{
                rotate: {
                  duration: 2,
                  repeat: isActive && isRecording ? Infinity : 0,
                  ease: "easeInOut"
                }
              }}
            >
              <AnimatePresence mode="wait">
                {isActive && isRecording ? (
                  <motion.div
                    key="stop-icon"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 300
                    }}
                  >
                    <SquareIcon className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="workflow-icon"
                    initial={{ scale: 0, rotate: 90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -90 }}
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 300
                    }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Recording indicator pulse */}
              {isActive && isRecording && (
                <motion.div 
                  className="absolute inset-0 rounded-full bg-red-500/20"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </motion.div>
            
            {/* Label with animation */}
            <motion.span
              className={`text-[10px] font-semibold text-center leading-snug w-full px-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center ${
                isActive && isRecording ? 'text-ink-primary font-bold' : ''
              }`}
              animate={{
                color: isActive && isRecording ? 'var(--ink-primary)' : 'var(--ink-secondary)'
              }}
            >
              {isActive && isRecording ? 'Complete' : workflow.label}
            </motion.span>
            
            {/* Recording time for active workflow */}
            <AnimatePresence>
              {isActive && isRecording && (
                <motion.span 
                  className="text-[10px] font-mono mt-1 text-center font-bold bg-surface-tertiary px-2 py-0.5 rounded-full text-ink-secondary"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  {formatTime(recordingTime)}
                </motion.span>
              )}
            </AnimatePresence>
            
            {/* Voice activity indicator with physics */}
            <AnimatePresence>
              {isActive && isRecording && (
                <motion.div 
                  className="absolute bottom-1 left-1/2"
                  style={{ translateX: "-50%" }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  <motion.div 
                    className="w-6 h-0.5 rounded-full"
                    style={{
                      backgroundColor: voiceActivityLevel > 0.1 ? 'var(--accent-emerald)' : 'var(--line-primary)',
                    }}
                    animate={{ 
                      opacity: 0.3 + (voiceActivityLevel * 0.7),
                      scaleX: Math.max(0.5, voiceActivityLevel * 2)
                    }}
                    transition={{ 
                      type: "spring",
                      damping: 25,
                      stiffness: 300
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Status badge */}
          <AnimatePresence>
            {isActive && isRecording && (
              <motion.div 
                className="absolute top-2 right-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <motion.div 
                  className="w-2 h-2 rounded-full"
                  style={{backgroundColor: 'var(--accent-red)'}}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        )}

        {/* Expandable split view - Dictate | Type */}
        {isExpandable && isHovered && (
          <motion.div
            className="absolute inset-0 grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {/* Dictate Button (Left Half) */}
            <motion.button
              onClick={() => handleWorkflowClick(workflow.id)}
              className="relative bg-surface-primary border border-line-primary rounded-l-2xl flex flex-col items-center justify-center p-3 hover:bg-blue-50 hover:border-blue-300 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MicIcon className="w-5 h-5 text-blue-600 mb-1.5" />
              <span className="text-[10px] font-semibold text-blue-700">Dictate</span>
            </motion.button>

            {/* Type Button (Right Half) */}
            <motion.button
              onClick={handleTypeClick}
              className="relative bg-surface-primary border border-line-primary rounded-r-2xl flex flex-col items-center justify-center p-3 hover:bg-purple-50 hover:border-purple-300 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Keyboard className="w-5 h-5 text-purple-600 mb-1.5" />
              <span className="text-[10px] font-semibold text-purple-700">Type</span>
            </motion.button>
          </motion.div>
        )}

        {/* Custom tooltip with fast appearance */}
        {!isRecording && !disabled && whisperServerRunning && !isHovered && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="bg-gray-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              <div className="font-medium">{workflow.description}</div>
              <div className="text-gray-300 mt-0.5">
                {workflow.estimatedTime} • {workflow.complexity} complexity
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      variants={withReducedMotion(staggerContainer)}
      initial="hidden"
      animate="visible"
      className="card-primary rounded-3xl p-4 w-full min-h-[140px]"
    >
      {/* Header */}
      <motion.div 
        className="mb-3 text-center"
        variants={withReducedMotion(listItemVariants)}
      >
        <h2 className="text-ink-primary text-base font-semibold">
          Select workflow
        </h2>
        <motion.p 
          className="text-ink-secondary text-[9px]"
          animate={{ 
            color: isRecording ? 'var(--accent-violet)' : 'var(--ink-secondary)'
          }}
          transition={{ duration: ANIMATION_DURATIONS.quick }}
        >
          {isRecording 
            ? `Recording ${WORKFLOWS.find(w => w.id === activeWorkflow)?.label}...`
            : 'Choose the type of medical report to create'
          }
        </motion.p>
      </motion.div>
      
      {/* Workflow buttons grid with stagger animation */}
      <motion.div
        className="grid grid-cols-3 auto-rows-fr gap-3 mb-3"
        variants={withReducedMotion(staggerContainer)}
        transition={{
          staggerChildren: STAGGER_CONFIGS.normal,
          delayChildren: 0.1
        }}
      >
        {WORKFLOWS.map(renderWorkflowButton)}
      </motion.div>
      
      {/* Instructions */}
      <AnimatePresence>
        {!isRecording && (
          <motion.div 
            className="text-center text-ink-tertiary text-[9px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
              type: "spring",
              damping: 20,
              stiffness: 300,
              delay: 0.3
            }}
          >
            {whisperServerRunning ? (
              <p>Tap workflow to start recording</p>
            ) : (
              <motion.p 
                className="text-accent-red font-medium"
                animate={{ 
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ⚠️ Whisper server not running - Please start server first
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording status */}
      <AnimatePresence>
        {isRecording && activeWorkflow && (
          <motion.div 
            className="bg-surface-tertiary rounded-2xl p-3 text-center border border-line-primary"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ 
              type: "spring",
              damping: 20,
              stiffness: 300,
              delay: 0.2
            }}
          >
            <div className="flex items-center justify-center space-x-2 mb-1">
              <motion.div 
                className="w-1.5 h-1.5 rounded-full"
                style={{backgroundColor: 'var(--accent-red)'}}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.6, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span className="text-ink-primary text-[9px] font-bold">
                Recording {WORKFLOWS.find(w => w.id === activeWorkflow)?.label}
              </span>
            </div>
            <motion.p 
              className="text-ink-secondary text-[9px] font-medium"
              animate={{ 
                color: voiceActivityLevel > 0.1 ? 'var(--accent-emerald)' : 'var(--ink-secondary)'
              }}
              transition={{ duration: ANIMATION_DURATIONS.quick }}
            >
              {voiceActivityLevel > 0.1 ? '🎤 Listening...' : '🔇 Speak now'} • Tap <strong>Complete</strong> when done
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

WorkflowButtons.displayName = 'WorkflowButtons';