import React, { useState, useRef, useEffect, memo } from 'react';
import { WORKFLOWS, type WorkflowConfig } from '@/config/workflowConfig';
import type { AgentType } from '@/types/medical.types';
import { Circle } from 'lucide-react';
import { DropdownPortal } from './DropdownPortal';
import { useDropdownPosition } from '../hooks/useDropdownPosition';
import { 
  MicIcon,
  SquareIcon,
  HeartIcon,
  FileTextIcon,
  ActivityIcon,
  StethoscopeIcon,
  CircleDotIcon,
  SearchIcon,
  UserIcon,
  PillIcon,
  ShieldIcon
} from './icons/OptimizedIcons';

interface RecordPanelProps {
  onWorkflowSelect: (workflowId: AgentType) => void;
  activeWorkflow: AgentType | null;
  isRecording: boolean;
  disabled?: boolean;
  voiceActivityLevel?: number;
  recordingTime?: number;
  whisperServerRunning?: boolean;
}

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

export const RecordPanel: React.FC<RecordPanelProps> = memo(({
  onWorkflowSelect,
  activeWorkflow,
  isRecording,
  disabled = false,
  voiceActivityLevel = 0,
  recordingTime = 0,
  whisperServerRunning = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const isHoveringRef = useRef<boolean>(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const menuIdRef = useRef<string>(`record-menu-${Math.random().toString(36).slice(2)}` as unknown as string);
  
  // Use dropdown positioning hook for portal-based positioning
  const { triggerRef, position } = useDropdownPosition({
    isOpen: isExpanded,
    alignment: 'center',
    offset: { x: 0, y: 8 },
    maxHeight: 400,
    dropdownWidth: 390
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle hover with delay for button - improved timeout management
  const handleMouseEnter = () => {
    if (disabled) {
      console.log('🚫 Mouse enter ignored - button disabled');
      return;
    }

    console.log('🖱️ Mouse entered record button', {
      isExpanded,
      hasTimeout: !!hoverTimeoutRef.current,
      isHoveringRefCurrent: isHoveringRef.current,
      whisperServerRunning,
      disabled,
      isRecording,
      activeWorkflow
    });

    isHoveringRef.current = true;
    setIsHovering(true);

    // ALWAYS clear any pending timeouts to prevent accumulation
    if (hoverTimeoutRef.current) {
      console.log('🧹 Clearing existing hover timeout');
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Show card with delay only if not already expanded
    if (!isExpanded) {
      console.log('⏰ Setting expand timeout');
      hoverTimeoutRef.current = window.setTimeout(() => {
        if (isHoveringRef.current) {
          console.log('🎯 Expanding card after hover delay');
          setIsExpanded(true);
        } else {
          console.log('🚫 Not expanding - mouse already left');
        }
        hoverTimeoutRef.current = null; // Clear the reference
      }, 50);
    }
  };

  const handleMouseLeave = () => {
    console.log('🖱️ Mouse left record button', {
      isExpanded,
      isHoveringRefCurrent: isHoveringRef.current
    });

    isHoveringRef.current = false;
    setIsHovering(false);

    // ALWAYS clear existing timeout first to prevent accumulation
    if (hoverTimeoutRef.current) {
      console.log('🧹 Clearing existing timeout on mouse leave');
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay collapse to allow mouse movement to card
    console.log('⏰ Setting collapse timeout');
    hoverTimeoutRef.current = window.setTimeout(() => {
      if (!isHoveringRef.current) {
        console.log('🔽 Collapsing card - mouse completely away');
        setIsExpanded(false);
      } else {
        console.log('🚫 Not collapsing - mouse returned');
      }
      hoverTimeoutRef.current = null; // Clear the reference
    }, 150);
  };

  // Handle mouse enter on the card - improved consistency
  const handleCardMouseEnter = () => {
    console.log('🖱️ Mouse entered card', {
      isExpanded,
      hasTimeout: !!hoverTimeoutRef.current
    });

    isHoveringRef.current = true;
    setIsHovering(true);

    // Clear any pending collapse timeouts
    if (hoverTimeoutRef.current) {
      console.log('🧹 Clearing timeout on card enter');
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Handle mouse leave from the card - improved consistency
  const handleCardMouseLeave = () => {
    console.log('🖱️ Mouse left card', {
      isExpanded,
      isHoveringRefCurrent: isHoveringRef.current
    });

    isHoveringRef.current = false;
    setIsHovering(false);

    // Clear any existing timeout first
    if (hoverTimeoutRef.current) {
      console.log('🧹 Clearing timeout on card leave');
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay collapse to prevent flickering when moving between card and button
    console.log('⏰ Setting collapse timeout from card');
    hoverTimeoutRef.current = window.setTimeout(() => {
      if (!isHoveringRef.current) {
        console.log('🔽 Collapsing card - mouse left card area');
        setIsExpanded(false);
      } else {
        console.log('🚫 Not collapsing - mouse returned to hover area');
      }
      hoverTimeoutRef.current = null; // Clear the reference
    }, 150);
  };


  // Enhanced cleanup when recording stops with better state reset
  useEffect(() => {
    if (!isRecording && activeWorkflow) {
      console.log('🔄 Recording stopped - resetting dropdown state after delay', {
        activeWorkflow,
        isExpanded,
        isHovering,
        hasTimeout: !!hoverTimeoutRef.current
      });

      const resetTimeout = window.setTimeout(() => {
        console.log('🔧 Performing full dropdown state reset', {
          wasExpanded: isExpanded,
          wasHovering: isHovering
        });

        // Force clear all hover-related state
        setIsExpanded(false);
        setIsHovering(false);
        isHoveringRef.current = false;

        // Clear any pending hover timeouts to prevent stale state
        if (hoverTimeoutRef.current) {
          console.log('🧹 Clearing hover timeout during recording stop reset');
          window.clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }

        console.log('✅ Dropdown state reset complete - ready for next recording');
      }, 1000);

      // Return cleanup function to prevent memory leaks
      return () => {
        console.log('🧹 Cleaning up recording stop timeout');
        window.clearTimeout(resetTimeout);
      };
    }
  }, [isRecording, activeWorkflow]);

  // Enhanced cleanup on unmount with debug logging
  useEffect(() => {
    return () => {
      console.log('🧹 RecordPanel unmounting - cleaning up timeouts and refs');
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      // Reset all refs to prevent memory leaks
      isHoveringRef.current = false;
    };
  }, []);

  // Enhanced state monitoring and auto-recovery for hover functionality
  useEffect(() => {
    console.log('🔧 RecordPanel state check:', {
      isExpanded,
      isHovering,
      isHoveringRefCurrent: isHoveringRef.current,
      disabled,
      whisperServerRunning,
      isRecording,
      activeWorkflow,
      hasTimeout: !!hoverTimeoutRef.current,
      timestamp: Date.now()
    });

    // Detect and fix stale states that could break hover functionality
    const hasStaleExpandedState = isExpanded && !isHoveringRef.current && !isRecording;
    const isButtonAccessible = !disabled && whisperServerRunning;

    if (hasStaleExpandedState) {
      console.warn('🚨 DETECTED STALE EXPANDED STATE - auto-fixing to restore hover functionality', {
        isExpanded,
        isHoveringRefCurrent: isHoveringRef.current,
        isRecording,
        isButtonAccessible
      });

      setIsExpanded(false);
      setIsHovering(false);
      isHoveringRef.current = false;

      if (hoverTimeoutRef.current) {
        console.log('🧹 Clearing stale timeout during auto-fix');
        window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      console.log('✅ Stale state auto-fix complete - hover should work now');
    }

    // Log button accessibility for debugging
    if (!isButtonAccessible) {
      console.log('⚠️ Button not accessible:', {
        disabled,
        whisperServerRunning,
        reason: disabled ? 'disabled=true' : 'whisper server not running'
      });
    }
  }, [disabled, whisperServerRunning, isRecording, isExpanded, activeWorkflow]);

  // Monitor hover events to detect if they're working
  useEffect(() => {
    // After component mounts or props change, test hover functionality after a delay
    const hoverTestTimeout = window.setTimeout(() => {
      if (!isRecording && !disabled && whisperServerRunning) {
        console.log('🔍 HOVER FUNCTIONALITY CHECK - button should be responsive', {
          componentReady: true,
          buttonAccessible: !disabled && whisperServerRunning,
          isExpanded,
          isHovering,
          currentState: 'ready-for-hover'
        });
      }
    }, 2000); // Wait 2 seconds for any state settling

    return () => {
      window.clearTimeout(hoverTestTimeout);
    };
  }, [isRecording, disabled, whisperServerRunning, activeWorkflow]);

  const getRecordButtonClasses = () => {
    const baseClasses = "relative flex items-center justify-center transition-all duration-300 cursor-pointer w-11 h-11 rounded-full border-2";
    
    if (disabled) {
      return `${baseClasses} bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed`;
    }
    
    if (isRecording) {
      return `${baseClasses} bg-red-500 border-red-600 record-button-recording text-white shadow-lg`;
    }
    
    return `${baseClasses} bg-emerald-100 border-emerald-300 record-button-idle text-emerald-600 hover:bg-emerald-200 hover:border-emerald-400`;
  };

  const getWorkflowButtonClasses = (workflow: WorkflowConfig, isActive: boolean) => {
    const baseClasses = "relative w-full h-12 rounded-lg border-2 flex items-center justify-start font-medium transition-all duration-200 overflow-hidden hover:shadow-md";
    
    if (disabled || !whisperServerRunning) {
      return `${baseClasses} bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 border-gray-300 opacity-50 cursor-not-allowed`;
    }
    
    if (isActive && isRecording) {
      const categoryClass = workflow.category === 'procedure' ? 'procedure-card' : 
                           workflow.category === 'documentation' ? 'documentation-card' : 
                           'investigation-card';
      return `${baseClasses} ${categoryClass} recording-glow border-2`;
    }
    
    const categoryClass = workflow.category === 'procedure' ? 'btn-procedure-outline' : 
                         workflow.category === 'documentation' ? 'btn-documentation-outline' : 
                         'btn-investigation-outline';
    return `${baseClasses} ${categoryClass} border-2 btn-hover-enhanced`;
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
        onClick={() => onWorkflowSelect(workflow.id)}
        disabled={disabled || (isRecording && !isActive) || !whisperServerRunning}
        className={getWorkflowButtonClasses(workflow, isActive)}
        title={getTooltip()}
        // Ensure keyboard focus order
        tabIndex={0}
      >
        <div className="relative flex items-center justify-start w-full h-full px-3 py-2">
          <div className="relative flex-shrink-0 mr-3">
            {isActive && isRecording ? (
              <>
                <SquareIcon className="w-5 h-5" />
                <div className="absolute inset-0 rounded-full bg-red-500/20 motion-safe:animate-ping" />
              </>
            ) : (
              <IconComponent className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 text-left">
            <span className={`text-sm font-semibold ${
              isActive && isRecording ? 'text-red-700 font-bold' : ''
            }`}>
              {isActive && isRecording ? 'Complete Recording' : workflow.label}
            </span>
            <div className={`text-xs mt-0.5 ${
              isActive && isRecording ? 'text-red-600' : 'text-gray-500'
            }`}>
              {isActive && isRecording ? 
                formatTime(recordingTime) : 
                workflow.estimatedTime
              }
            </div>
          </div>
          
          {isActive && isRecording && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
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
      </button>
    );
  };

  // Manage keyboard interactions for trigger
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  // Focus management when dialog opens
  useEffect(() => {
    if (isExpanded) {
      // Focus first focusable element inside the dialog
      const container = dialogRef.current;
      if (container) {
        // Delay to ensure elements are rendered in portal
        setTimeout(() => {
          const focusables = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            focusables[0].focus();
          }
        }, 0);
      }
    }
  }, [isExpanded]);

  // Trap focus and handle ESC inside dialog
  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isExpanded) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsExpanded(false);
      setIsHovering(false);
      // return focus to trigger
      (triggerRef.current as unknown as HTMLElement | null)?.focus?.();
      return;
    }
    if (e.key === 'Tab') {
      const container = dialogRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  return (
    <div className="relative">
      {/* Record Button */}
      <button
        ref={triggerRef}
        type="button"
        data-dropdown-trigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          console.log('🖱️ Record button clicked', {
            disabled,
            isExpanded,
            whisperServerRunning,
            currentTarget: e.currentTarget,
            timestamp: Date.now()
          });

          if (!disabled && whisperServerRunning) {
            // Force clear any stale timeouts before toggling
            if (hoverTimeoutRef.current) {
              window.clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }

            setIsExpanded((prev) => {
              const newState = !prev;
              console.log('🎯 Toggling dropdown expansion:', prev, '->', newState);
              return newState;
            });
          } else {
            console.log('⚠️ Click ignored - button disabled or whisper server not running');
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="dialog"
        aria-expanded={isExpanded}
        aria-controls={menuIdRef.current as unknown as string}
        aria-label={isRecording ? 'Recording menu, recording in progress' : 'Open recording menu'}
        className={getRecordButtonClasses()}
        disabled={disabled}
      >
        <Circle className={`w-5 h-5 ${isRecording ? 'fill-current' : ''}`} />
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-red-300 motion-safe:animate-ping opacity-40" />
            <div className="absolute inset-0 rounded-full border-1 border-white opacity-60" />
          </>
        )}
      </button>
      
      {/* Portal-Based Expanded Card */}
      <DropdownPortal 
        isOpen={isExpanded} 
        onClickOutside={() => {
          console.log('🖱️ Click outside detected - closing card');
          setIsExpanded(false);
          setIsHovering(false);
          isHoveringRef.current = false;
        }}
      >
        <div 
          data-dropdown-menu
          id={menuIdRef.current as unknown as string}
          role="dialog"
          aria-labelledby={`${menuIdRef.current}-label` as unknown as string}
          ref={dialogRef}
          onKeyDown={handleDialogKeyDown}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="record-card glass rounded-xl p-4 w-[390px] bg-white border border-gray-200 shadow-xl"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 999999
          }}
        >
            <div className="mb-3 text-center">
              <h2 id={`${menuIdRef.current}-label` as unknown as string} className="text-gray-900 text-base font-semibold">
                Record Now
              </h2>
              <p className="text-gray-600 text-sm">
                {isRecording 
                  ? `Recording ${WORKFLOWS.find(w => w.id === activeWorkflow)?.label}...`
                  : 'Choose the type of medical report to create'
                }
              </p>
            </div>
            
            {/* Workflow buttons list */}
            <div className="flex flex-col gap-2 mb-3">
              {WORKFLOWS.map(renderWorkflowButton)}
            </div>
            
            {/* Instructions */}
            {!isRecording && (
              <div className="text-center text-gray-500 text-sm">
                {whisperServerRunning ? (
                  <p>Tap workflow to start recording</p>
                ) : (
                  <p className="text-red-600 font-medium flex items-center justify-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-red-500" aria-hidden="true" /> Whisper server not running - Please start server first</p>
                )}
              </div>
            )}
            
            {/* Recording status */}
            {isRecording && activeWorkflow && (
              <div className="glass rounded-lg p-2 text-center bg-red-50 border border-red-200">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full motion-safe:animate-pulse" />
                  <span className="text-red-800 text-xs font-bold">
                    Recording {WORKFLOWS.find(w => w.id === activeWorkflow)?.label}
                  </span>
                </div>
                <p className="text-red-700 text-sm font-medium flex items-center justify-center gap-2">
                  {voiceActivityLevel > 0.1 ? <span className="inline-flex items-center gap-1"><MicIcon className="w-3.5 h-3.5" /> Listening...</span> : <span className="inline-flex items-center gap-1"><SquareIcon className="w-3.5 h-3.5" /> Speak now</span>} • Tap <strong>Complete</strong> when done
                </p>
              </div>
            )}
        </div>
      </DropdownPortal>
    </div>
  );
});

RecordPanel.displayName = 'RecordPanel';
