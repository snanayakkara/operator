import React, { useState, useRef, useEffect, memo } from 'react';
import { WORKFLOWS, type WorkflowConfig } from '@/config/workflowConfig';
import type { AgentType } from '@/types/medical.types';
import {
  Circle,
  Heart,
  FileText,
  Activity,
  Stethoscope,
  CircleDot,
  Monitor,
  Zap,
  Shield,
  Square,
  Mic as MicIcon,
  Keyboard
} from 'lucide-react';
import { DropdownPortal } from './DropdownPortal';
import { useDropdownPosition } from '../hooks/useDropdownPosition';

interface RecordPanelProps {
  onWorkflowSelect: (workflowId: AgentType) => void;
  activeWorkflow: AgentType | null;
  isRecording: boolean;
  disabled?: boolean;
  voiceActivityLevel?: number;
  recordingTime?: number;
  whisperServerRunning?: boolean;
  onTypeClick?: (workflowId: AgentType) => void; // For expandable workflows that support Type mode
}

const iconMap = {
  Heart: Heart,
  FileText: FileText,
  Activity: Activity,
  Stethoscope: Stethoscope,
  CircleDot: CircleDot,
  Mic: MicIcon,
  Square: Square,
  Monitor: Monitor,
  Zap: Zap,
  Shield: Shield,
  ClipboardList: FileText // Fallback for ClipboardList
} as const;

export const RecordPanel: React.FC<RecordPanelProps> = memo(({
  onWorkflowSelect,
  activeWorkflow,
  isRecording,
  disabled = false,
  voiceActivityLevel = 0,
  recordingTime = 0,
  whisperServerRunning = true,
  onTypeClick
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredExpandableId, setHoveredExpandableId] = useState<AgentType | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const isHoveringRef = useRef<boolean>(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const menuIdRef = useRef<string>(`record-menu-${Math.random().toString(36).slice(2)}` as unknown as string);

  // Debug logging for component mount and state changes
  useEffect(() => {
    console.log('🎬 RecordPanel mounted', {
      disabled,
      whisperServerRunning,
      isRecording,
      activeWorkflow
    });

    // Force clean state on mount to prevent stale state from previous sessions
    setIsExpanded(false);
    setIsHovering(false);
    isHoveringRef.current = false;
    setHoveredExpandableId(null);

    if (hoverTimeoutRef.current) {
      console.log('🧹 Clearing stale timeout on mount');
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    console.log('✅ RecordPanel state reset on mount');

    return () => console.log('🎬 RecordPanel unmounted');
  }, []);

  useEffect(() => {
    console.log('🔄 RecordPanel isExpanded changed:', isExpanded, {
      isHovering,
      disabled,
      whisperServerRunning
    });
  }, [isExpanded, isHovering, disabled, whisperServerRunning]);

  // Use dropdown positioning hook for portal-based positioning
  // Force upward positioning since RecordPanel is in footer
  const { triggerRef, position } = useDropdownPosition({
    isOpen: isExpanded,
    alignment: 'center',
    offset: { x: 0, y: -50 }, // Larger negative value to close the gap with actions bar
    maxHeight: 480,
    dropdownWidth: 340, // Sidepanel is 360px, leave 20px margins
    preferredDirection: 'up'
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

    // Defensive check: ensure triggerRef is still connected
    if (triggerRef.current && !triggerRef.current.isConnected) {
      console.warn('🚨 handleMouseEnter: triggerRef is stale, resetting state');
      setIsExpanded(false);
      setIsHovering(false);
      isHoveringRef.current = false;
      return;
    }

    console.log('🖱️ Mouse entered record button', {
      isExpanded,
      hasTimeout: !!hoverTimeoutRef.current,
      isHoveringRefCurrent: isHoveringRef.current,
      whisperServerRunning,
      disabled,
      isRecording,
      activeWorkflow,
      triggerConnected: triggerRef.current?.isConnected
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

  // Periodic state recovery to fix stuck states (runs every 2 seconds for faster recovery)
  useEffect(() => {
    const recoveryInterval = window.setInterval(() => {
      // Only attempt recovery when not recording and button should be accessible
      if (!isRecording && !disabled && whisperServerRunning) {
        // Check for stuck expanded state with no hover
        if (isExpanded && !isHoveringRef.current) {
          console.warn('🔧 PERIODIC RECOVERY: Detected stuck expanded state, resetting', {
            isExpanded,
            isHoveringRefCurrent: isHoveringRef.current,
            triggerConnected: triggerRef.current?.isConnected,
            timestamp: Date.now()
          });

          setIsExpanded(false);
          setIsHovering(false);
          isHoveringRef.current = false;

          if (hoverTimeoutRef.current) {
            window.clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
        }

        // Additional check: ensure triggerRef is still valid
        if (triggerRef.current && !triggerRef.current.isConnected) {
          console.warn('🔧 PERIODIC RECOVERY: Detected stale triggerRef, resetting state', {
            triggerConnected: false,
            timestamp: Date.now()
          });

          setIsExpanded(false);
          setIsHovering(false);
          isHoveringRef.current = false;

          if (hoverTimeoutRef.current) {
            window.clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
        }
      }
    }, 2000); // Check every 2 seconds (reduced from 5s for faster recovery)

    return () => {
      window.clearInterval(recoveryInterval);
    };
  }, [isRecording, disabled, whisperServerRunning, isExpanded]);

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
    const baseClasses = "relative w-full aspect-square min-h-[96px] min-w-[96px] flex flex-col items-center justify-center p-3 rounded-card border-2 transition-all duration-200 hover:shadow-card-hover";

    if (disabled || !whisperServerRunning) {
      return `${baseClasses} bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed`;
    }

    if (isActive && isRecording) {
      return `${baseClasses} bg-red-50 border-red-300 shadow-lg ring-2 ring-red-200`;
    }

    const categoryColors = {
      procedure: 'border-red-200 hover:border-red-300 hover:bg-red-50',
      documentation: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50',
      investigation: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50',
      batch: 'border-green-200 hover:border-green-300 hover:bg-green-50',
      advanced: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50'
    };

    return `${baseClasses} bg-white ${categoryColors[workflow.category]}`;
  };

  const renderWorkflowButton = (workflow: WorkflowConfig) => {
    const IconComponent = iconMap[workflow.icon as keyof typeof iconMap] || FileText;
    const isActive = activeWorkflow === workflow.id;
    const isHovered = hoveredExpandableId === workflow.id;
    const isExpandable = workflow.isExpandable && !isRecording && !disabled && whisperServerRunning && onTypeClick;

    // Generate tooltip with server status information
    const getTooltip = () => {
      if (!whisperServerRunning) {
        return "Transcription server not running. Please run: ./dev";
      }
      return `${workflow.description} • ${workflow.estimatedTime} • ${workflow.complexity} complexity`;
    };

    const handleMouseEnter = () => {
      if (isExpandable) {
        setHoveredExpandableId(workflow.id);
      }
    };

    const handleMouseLeave = () => {
      if (isExpandable) {
        setHoveredExpandableId(null);
      }
    };

    const handleTypeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onTypeClick) {
        onTypeClick(workflow.id);
        setIsExpanded(false); // Close dropdown after selection
        setHoveredExpandableId(null);
      }
    };

    return (
      <div
        key={workflow.id}
        className="relative w-full h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Non-expandable or collapsed state */}
        {(!isExpandable || !isHovered) && (
          <button
            onClick={() => onWorkflowSelect(workflow.id)}
            disabled={disabled || (isRecording && !isActive) || !whisperServerRunning}
            className={getWorkflowButtonClasses(workflow, isActive)}
            title={getTooltip()}
            tabIndex={0}
          >
        {/* Icon */}
        <div className="relative mb-2.5">
          {isActive && isRecording ? (
            <>
              <Square className="w-7 h-7 text-red-600" />
              <div className="absolute inset-0 rounded-full bg-red-500/20 motion-safe:animate-ping" />
            </>
          ) : (
            <IconComponent className={`w-7 h-7 ${
              workflow.category === 'procedure' ? 'text-red-500' :
              workflow.category === 'documentation' ? 'text-blue-500' :
              workflow.category === 'investigation' ? 'text-purple-500' :
              workflow.category === 'batch' ? 'text-green-500' :
              'text-orange-500'
            }`} />
          )}
        </div>

        {/* Label */}
        <div className={`text-[10px] font-semibold text-center leading-snug min-h-[2.5rem] flex items-center justify-center w-full px-1 ${
          isActive && isRecording ? 'text-red-700' : 'text-gray-700'
        }`}>
          {isActive && isRecording ? 'Stop' : workflow.label}
        </div>

        {/* Time/Status */}
        {isActive && isRecording && (
          <div className="text-xs text-red-600 font-medium mt-1">
            {formatTime(recordingTime)}
          </div>
        )}
      </button>
        )}

        {/* Expandable split view - Dictate | Type */}
        {isExpandable && isHovered && (
          <div className="absolute inset-0 grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
            {/* Dictate Button (Left Half) */}
            <button
              onClick={() => onWorkflowSelect(workflow.id)}
              className="relative bg-white border-2 border-blue-200 rounded-l-lg flex flex-col items-center justify-center p-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <MicIcon className="w-5 h-5 text-blue-600 mb-1" strokeWidth={2} />
              <span className="text-[10px] font-semibold text-blue-700">Dictate</span>
            </button>

            {/* Type Button (Right Half) */}
            <button
              onClick={handleTypeClick}
              className="relative bg-white border-2 border-purple-200 rounded-r-lg flex flex-col items-center justify-center p-2 hover:bg-purple-50 hover:border-purple-300 transition-all"
            >
              <Keyboard className="w-5 h-5 text-purple-600 mb-1" strokeWidth={2} />
              <span className="text-[10px] font-semibold text-purple-700">Type</span>
            </button>
          </div>
        )}
      </div>
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

          // Record button click is a no-op - menu is controlled by hover state only
          // This prevents conflicts between click-toggle and hover-expand/collapse logic
          console.log('ℹ️ Click on record button - menu is hover-controlled, no action taken');
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
          className="record-card glass rounded-card p-3 w-[340px] bg-white border border-gray-200 shadow-modal pointer-events-auto"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 9990
          }}
        >
            <div className="mb-3 text-center">
              <h2 id={`${menuIdRef.current}-label` as unknown as string} className="text-gray-900 text-sm font-semibold">
                {isRecording
                  ? `Recording ${WORKFLOWS.find(w => w.id === activeWorkflow)?.label}...`
                  : 'Choose Workflow'
                }
              </h2>
            </div>

            {/* Workflow buttons grid */}
            <div className="grid grid-cols-3 auto-rows-fr gap-3 mb-3">
              {WORKFLOWS.map(renderWorkflowButton)}
            </div>

            {/* Instructions */}
            {!isRecording && !whisperServerRunning && (
              <div className="text-center text-red-600 text-xs font-medium flex items-center justify-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                Transcription server not running - run ./dev
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
                  {voiceActivityLevel > 0.1 ? <span className="inline-flex items-center gap-1"><MicIcon className="w-3.5 h-3.5" /> Listening...</span> : <span className="inline-flex items-center gap-1"><Square className="w-3.5 h-3.5" /> Speak now</span>} • Tap <strong>Complete</strong> when done
                </p>
              </div>
            )}
        </div>
      </DropdownPortal>
    </div>
  );
});

RecordPanel.displayName = 'RecordPanel';
