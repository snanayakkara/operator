import React, { memo, useMemo, useCallback, useEffect, useState } from 'react';
import {
  Users,
  Clock,
  Trash2,
  ChevronDown,
  Mic,
  Loader2,
  Cpu,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  ArrowRight,
  XCircle,
  HardDrive
} from 'lucide-react';
import { SessionProgressIndicator } from './SessionProgressIndicator';
import { DropdownPortal } from './DropdownPortal';
import type { PatientSession, SessionStatus } from '@/types/medical.types';
import { getStateColors, type ProcessingState } from '@/utils/stateColors';
import { getAgentColors, getAgentCategoryIcon } from '@/utils/agentCategories';

interface SessionDropdownProps {
  sessions: PatientSession[];
  onRemoveSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onStopRecording?: () => void;
  onMarkSessionComplete?: (session: PatientSession) => void;
  selectedSessionId?: string | null;
  activeRecordingSessionId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
  position?: { top: number; left?: number; right?: number };
  checkedSessionIds?: Set<string>; // All checked sessions (manual + auto-checked, from parent state)
  onToggleSessionCheck?: (sessionId: string) => void; // Callback to toggle check state in parent
  persistedSessionIds?: Set<string>; // Sessions stored locally (for hard drive icon)
}

// Performance constants
const INITIAL_VISIBLE_SESSIONS = 3; // Show only first 3 sessions in each category initially

type TimelineState =
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'needs_review'
  | 'completed'
  | 'error';

type TimelineMeta = {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon: React.ReactNode;
  description?: string;
  cardClass: string;
  chipClass: string;
  accentEdgeClass: string;
};

// Helper to generate timeline metadata from shared state colors
const getTimelineMetaFromState = (timelineState: TimelineState): TimelineMeta => {
  // Map timeline states to processing states
  const stateMapping: Record<TimelineState, ProcessingState> = {
    'recording': 'recording',
    'transcribing': 'transcribing',
    'processing': 'ai-analysis',
    'needs_review': 'needs_review',
    'completed': 'completed',
    'error': 'error'
  };

  const processingState = stateMapping[timelineState];
  const colors = getStateColors(processingState);

  // Icon mapping (using Tailwind classes instead of CSS variables)
  const iconMapping: Record<TimelineState, React.ReactNode> = {
    'recording': <Mic className={`w-3 h-3 text-${colors.indicator}`} />,
    'transcribing': <Loader2 className={`w-3 h-3 animate-spin text-${colors.indicator}`} />,
    'processing': <Cpu className={`w-3 h-3 text-${colors.indicator}`} />,
    'needs_review': <ClipboardList className={`w-3 h-3 text-${colors.text}`} />,
    'completed': <CheckCircle2 className={`w-3 h-3 text-${colors.text}`} />,
    'error': <AlertTriangle className={`w-3 h-3 text-${colors.text}`} />
  };

  // Description mapping
  const descriptionMapping: Record<TimelineState, string> = {
    'recording': 'Audio capture in progress',
    'transcribing': 'Converting speech to clinical text',
    'processing': 'AI drafting the note',
    'needs_review': 'Ready for clinician polish',
    'completed': 'Finalized and ready to send',
    'error': 'Resolve to keep queue moving'
  };

  // Label mapping
  const labelMapping: Record<TimelineState, string> = {
    'recording': 'Recording',
    'transcribing': 'Transcribing',
    'processing': 'Processing',
    'needs_review': 'Needs Review',
    'completed': 'Completed',
    'error': 'Attention Needed'
  };

  return {
    label: labelMapping[timelineState],
    badgeClass: `bg-gradient-to-br from-${colors.gradient.from} to-${colors.gradient.to} text-${colors.text} border border-${colors.border}/70`,
    dotClass: `bg-${colors.indicator} border-${colors.border}/60`,
    icon: iconMapping[timelineState],
    description: descriptionMapping[timelineState],
    cardClass: colors.bgGradient + ` border-${colors.border}/60`,
    chipClass: `text-${colors.text}`,
    accentEdgeClass: `before:bg-gradient-to-br before:from-${colors.gradient.from.replace('-50', '-300')}/40 before:via-${colors.gradient.to.replace('-50', '-200')}/30 before:to-transparent`
  };
};

// Generate timeline state metadata using shared colors
const timelineStateMeta: Record<TimelineState, TimelineMeta> = {
  recording: getTimelineMetaFromState('recording'),
  transcribing: getTimelineMetaFromState('transcribing'),
  processing: getTimelineMetaFromState('processing'),
  needs_review: getTimelineMetaFromState('needs_review'),
  completed: getTimelineMetaFromState('completed'),
  error: getTimelineMetaFromState('error')
};

const formatDuration = (ms?: number | null) => {
  if (!ms || ms < 0) return '—';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
};

const formatClockTime = (timestamp?: number) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const deriveTimelineState = (session: PatientSession): TimelineState => {
  const baseStatus = session.status as SessionStatus | undefined;

  if (baseStatus === 'recording') return 'recording';
  if (baseStatus === 'transcribing') return 'transcribing';
  if (baseStatus === 'processing') return 'processing';
  if (baseStatus === 'error' || baseStatus === 'cancelled') return 'error';

  if (baseStatus === 'completed') {
    if (session.completed) {
      if (session.reviewedAt || session.finalizedAt) {
        return 'completed';
      }
      return 'needs_review';
    }
    return 'needs_review';
  }

  return 'needs_review';
};

const getProcessingDuration = (session: PatientSession): number | null => {
  if (session.processingTime) return session.processingTime;
  if (session.processingStartTime && session.completedTime) {
    return session.completedTime - session.processingStartTime;
  }
  return null;
};

const getDictationDuration = (session: PatientSession): number | null => {
  if (session.recordingStartTime && session.transcriptionStartTime) {
    return session.transcriptionStartTime - session.recordingStartTime;
  }
  return null;
};

// Enhanced Session Item Component with timeline features
interface EnhancedSessionItemProps {
  session: PatientSession;
  state: TimelineState;
  isSelected: boolean;
  isNextReview: boolean;
  isActiveRecording: boolean;
  copiedSessionId: string | null;
  isChecked: boolean;
  isCompact: boolean;
  isPersisted: boolean; // Session is stored locally
  onToggleCheck: (sessionId: string) => void;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onStopRecording?: () => void;
  onRemoveSession: (sessionId: string) => void;
  onMarkSessionComplete?: (session: PatientSession) => void;
  onCopyResults: (session: PatientSession) => Promise<void>;
}

const EnhancedSessionItem: React.FC<EnhancedSessionItemProps> = ({
  session,
  state,
  isSelected,
  isNextReview,
  isActiveRecording,
  copiedSessionId,
  isChecked,
  isCompact,
  isPersisted,
  onToggleCheck,
  onSessionSelect,
  onResumeRecording,
  onStopRecording,
  onRemoveSession,
  onMarkSessionComplete,
  onCopyResults
}) => {
  const meta = timelineStateMeta[state];
  const hasResults = Boolean(session.results && session.results.trim().length > 0);
  const isCopying = copiedSessionId === session.id;
  const dictationDuration = getDictationDuration(session);
  const processingDuration = getProcessingDuration(session);

  // Get category-based colors for this agent
  const categoryColors = getAgentColors(session.agentType);
  const categoryIcon = getAgentCategoryIcon(session.agentType);

  const handlePrimaryAction = useCallback(() => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  }, [onSessionSelect, session]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCheck(session.id);
  }, [onToggleCheck, session.id]);

  // Compact mode: smaller padding, hide details
  if (isCompact) {
    return (
      <div
        className={`relative rounded-lg border-l-4 transition-all duration-300 px-2 py-1.5 ${categoryColors.bg} ${categoryColors.border} opacity-60 hover:opacity-80 ${
          isSelected ? 'ring-2 ring-accent-violet/50' : ''
        }`}
        style={{ borderLeftColor: `var(--${categoryColors.indicator.replace('bg-', '')})` }}
      >
        <div className="flex items-center gap-2">
          {/* Checkbox */}
          <div
            className="flex-shrink-0 cursor-pointer group"
            onClick={handleCheckboxClick}
            role="button"
            aria-label="Unmark session as complete"
          >
            <div className="w-5 h-5 rounded border-2 bg-emerald-500 border-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs">{categoryIcon}</span>
                <p className="truncate font-medium text-xs text-slate-700">
                  {session.patient?.name || 'Unnamed patient'}
                </p>
              </div>
              <span className="text-[9px] text-slate-500 whitespace-nowrap">
                {formatClockTime(session.timestamp)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500 truncate">
              {isPersisted && (
                <span title="Stored locally">
                  <HardDrive className="w-2.5 h-2.5 flex-shrink-0" />
                </span>
              )}
              <span className="truncate">{session.agentName || session.agentType}</span>
            </div>
          </div>

          {/* Minimal actions */}
          <button
            onClick={() => onRemoveSession(session.id)}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`relative rounded-xl border-l-4 transition-all duration-300 px-3 py-2 ${categoryColors.bg} ${categoryColors.border} ${
        isSelected ? 'ring-2 ring-accent-violet/50' : ''
      }`}
      style={{ borderLeftColor: `var(--${categoryColors.indicator.replace('bg-', '')})` }}
    >
      <div className="flex items-start gap-2">
        {/* Category icon badge */}
        <div className="absolute top-2 right-2 text-lg opacity-30">
          {categoryIcon}
        </div>

        {/* Larger checkbox */}
        <div
          className="flex-shrink-0 pt-0.5 cursor-pointer group"
          onClick={handleCheckboxClick}
          role="button"
          aria-label={isChecked ? "Unmark session as complete" : "Mark session as complete"}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isChecked
              ? 'bg-emerald-500 border-emerald-600'
              : 'bg-white border-slate-300 group-hover:border-emerald-400 group-hover:bg-emerald-50'
          }`}>
            {isChecked && (
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <p className="truncate font-semibold text-sm text-slate-900">
                {session.patient?.name || 'Unnamed patient'}
              </p>
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass} ${meta.chipClass}`}>
                {meta.icon}
                <span>{meta.label}</span>
              </span>
              {state === 'processing' && session.pipelineProgress && (
                <SessionProgressIndicator
                  phase={session.pipelineProgress.details || session.pipelineProgress.stage || 'Processing'}
                  progress={session.pipelineProgress.stageProgress || session.pipelineProgress.progress}
                  compact={true}
                />
              )}
              {isNextReview && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                  Next
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5 text-slate-400" />
                {formatClockTime(session.timestamp)}
              </span>
              <span className="flex items-center gap-0.5">
                {isPersisted && (
                  <span title="Stored locally">
                    <HardDrive className="w-2.5 h-2.5 flex-shrink-0" />
                  </span>
                )}
                <span>{session.agentName || session.agentType}</span>
              </span>
              {dictationDuration !== null && (
                <span className="flex items-center gap-0.5">
                  <Mic className="w-2.5 h-2.5 text-slate-400" />
                  {formatDuration(dictationDuration)}
                </span>
              )}
              {processingDuration !== null && (
                <span className="flex items-center gap-0.5">
                  <Cpu className="w-2.5 h-2.5 text-slate-400" />
                  {formatDuration(processingDuration)}
                </span>
              )}
            </div>

            {state === 'error' && session.errors?.length ? (
              <div className="mt-1 text-[10px] text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                {session.errors[0]}
              </div>
            ) : null}

            {(state === 'needs_review' || state === 'completed') && hasResults && (
              <div className="mt-2 rounded border border-slate-200/70 bg-slate-50/80 px-2 py-1 text-[10px] text-slate-600">
                <p className="line-clamp-2 leading-relaxed">
                  {session.results!.slice(0, 120)}…
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {state === 'recording' && isActiveRecording && onStopRecording && (
              <button
                onClick={onStopRecording}
                className="inline-flex items-center gap-0.5 rounded border border-red-200/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600 hover:bg-red-50"
                title="Stop recording"
              >
                <XCircle className="w-2.5 h-2.5" />
              </button>
            )}

            {state === 'recording' && !isActiveRecording && onResumeRecording && (
              <button
                onClick={() => onResumeRecording(session)}
                className="inline-flex items-center gap-0.5 rounded border border-red-200/80 bg-red-50/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600 hover:bg-red-100"
                title="Resume recording"
              >
                <Play className="w-2.5 h-2.5" />
              </button>
            )}

            {state !== 'recording' && onSessionSelect && (
              <button
                onClick={handlePrimaryAction}
                className="inline-flex items-center gap-0.5 rounded border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700 hover:bg-slate-50"
                title="View session"
              >
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}

            {(state === 'needs_review' || state === 'completed') && (
              <button
                onClick={() => onCopyResults(session)}
                disabled={!hasResults}
                className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  hasResults
                    ? 'border-emerald-200/80 bg-white text-emerald-600 hover:bg-emerald-50'
                    : 'border-slate-200/80 bg-white text-slate-400 cursor-not-allowed'
                }`}
                title="Copy letter"
              >
                {isCopying ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
            )}

            <button
              onClick={() => onRemoveSession(session.id)}
              className="inline-flex items-center gap-0.5 rounded border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              title="Remove"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SessionDropdown: React.FC<SessionDropdownProps> = memo(({
  sessions,
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  onResumeRecording,
  onStopRecording,
  onMarkSessionComplete,
  selectedSessionId,
  activeRecordingSessionId = null,
  isOpen,
  onClose,
  triggerRef,
  position,
  checkedSessionIds = new Set(),
  onToggleSessionCheck,
  persistedSessionIds = new Set()
}) => {
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  // Local state for lazy loading
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllInProgress, setShowAllInProgress] = useState(false);
  const [showAllErrored, setShowAllErrored] = useState(false);

  useEffect(() => {
    if (!copiedSessionId) return;
    const timeout = setTimeout(() => setCopiedSessionId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedSessionId]);

  const handleToggleCheck = useCallback((sessionId: string) => {
    if (onToggleSessionCheck) {
      onToggleSessionCheck(sessionId);
    }
  }, [onToggleSessionCheck]);

  const handleCopyResults = useCallback(async (session: PatientSession) => {
    if (!session.results || session.results.trim().length === 0) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(session.results);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = session.results;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSessionId(session.id);
    } catch (error) {
      console.error('Failed to copy letter content:', error);
    }
  }, []);

  // Timeline sessions with derived states
  const timelineStates = useMemo(() => {
    return sessions.map((session) => ({
      session,
      state: deriveTimelineState(session),
      isChecked: checkedSessionIds.has(session.id)
    }));
  }, [sessions, checkedSessionIds]);

  // Next review session
  const nextReviewSession = useMemo(() => {
    return (
      timelineStates.find(item => item.state === 'needs_review' && !item.isChecked) ||
      timelineStates.find(item => item.state === 'completed' && !item.isChecked)
    );
  }, [timelineStates]);

  // Optimized filtered lists with smart reordering: unchecked first, checked last
  const sessionCategories = useMemo(() => {
    const completed: { session: PatientSession; isChecked: boolean }[] = [];
    const inProgress: { session: PatientSession; isChecked: boolean }[] = [];
    const errored: { session: PatientSession; isChecked: boolean }[] = [];

    // Single pass through sessions for better performance
    timelineStates.forEach(({ session, state, isChecked }) => {
      const item = { session, isChecked };
      if (state === 'recording' || state === 'transcribing' || state === 'processing') {
        inProgress.push(item);
      } else if (state === 'error') {
        errored.push(item);
      } else if (state === 'needs_review' || state === 'completed') {
        completed.push(item);
      }
    });

    // Sort each category: unchecked first, checked last
    const sortByChecked = (a: { isChecked: boolean }, b: { isChecked: boolean }) => {
      if (a.isChecked === b.isChecked) return 0;
      return a.isChecked ? 1 : -1;
    };

    completed.sort(sortByChecked);
    inProgress.sort(sortByChecked);
    errored.sort(sortByChecked);

    return { completed, inProgress, errored };
  }, [timelineStates]);

  // Apply lazy loading limits
  const visibleSessions = useMemo(() => {
    const completedLimit = showAllCompleted ? sessionCategories.completed.length : INITIAL_VISIBLE_SESSIONS;
    const inProgressLimit = showAllInProgress ? sessionCategories.inProgress.length : INITIAL_VISIBLE_SESSIONS;
    const erroredLimit = showAllErrored ? sessionCategories.errored.length : INITIAL_VISIBLE_SESSIONS;

    const result = {
      completed: sessionCategories.completed.slice(0, completedLimit),
      inProgress: sessionCategories.inProgress.slice(0, inProgressLimit),
      errored: sessionCategories.errored.slice(0, erroredLimit),
      hasMoreCompleted: sessionCategories.completed.length > completedLimit,
      hasMoreInProgress: sessionCategories.inProgress.length > inProgressLimit,
      hasMoreErrored: sessionCategories.errored.length > erroredLimit
    };

    return result;
  }, [sessionCategories, showAllCompleted, showAllInProgress, showAllErrored]);

  const handleClearAll = () => {
    onClearAllSessions();
    onClose();
  };

  // Optimized position calculation with debouncing and caching
  const [computedPos, setComputedPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const positionTimeoutRef = React.useRef<NodeJS.Timeout>();

  const recalcPosition = useCallback(() => {
    if (position) {
      setComputedPos(position);
      return;
    }
    if (triggerRef?.current) {
      // Use requestAnimationFrame for immediate, smooth position updates
      requestAnimationFrame(() => {
        if (triggerRef?.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const DROPDOWN_WIDTH = 320;
          const VIEWPORT_MARGIN = 16;

          // Calculate potential left position (align right edges)
          const leftPosition = rect.right - DROPDOWN_WIDTH;

          // Check if dropdown would overflow left edge
          const wouldOverflowLeft = leftPosition < VIEWPORT_MARGIN;

          if (wouldOverflowLeft) {
            // Use left positioning with minimum margin
            setComputedPos({
              top: Math.round(rect.bottom + 8),
              left: VIEWPORT_MARGIN
            });
          } else {
            // Use calculated left position (right-aligned with button)
            setComputedPos({
              top: Math.round(rect.bottom + 8),
              left: Math.round(leftPosition)
            });
          }
        }
      });
      return;
    }
    setComputedPos(null);
  }, [position, triggerRef]);

  // Helper component for "Show More" buttons
  const ShowMoreButton: React.FC<{
    onClick: () => void;
    hiddenCount: number;
    category: string
  }> = ({ onClick, hiddenCount, category }) => (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center space-x-1"
    >
      <ChevronDown className="w-3 h-3" />
      <span>Show {hiddenCount} more {category}</span>
    </button>
  );

  useEffect(() => {
    if (!isOpen) return;
    recalcPosition();
    const onResize = () => recalcPosition();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      // Cleanup position calculation timeout
      if (positionTimeoutRef.current) {
        clearTimeout(positionTimeoutRef.current);
      }
    };
  }, [isOpen, recalcPosition]);

  const getDropdownStyle = useCallback((): React.CSSProperties => {
    if (computedPos) {
      return {
        position: 'absolute',
        top: computedPos.top,
        left: computedPos.left,
        right: computedPos.right,
        width: '320px',
        maxHeight: 'calc(100vh - 80px)', // Increased from 960px
        zIndex: 9990
      };
    }
    return {
      position: 'fixed',
      top: '60px',
      right: '16px',
      width: '320px',
      maxHeight: 'calc(100vh - 80px)', // Increased from 960px
      zIndex: 9990
    };
  }, [computedPos]);

  // Early return AFTER all hooks to avoid React hook rule violations
  if (!isOpen || sessions.length === 0) {
    return null;
  }


  const dropdownContent = (
    <div
      style={getDropdownStyle()}
      className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      data-dropdown-menu
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-gray-900 font-medium text-sm">Recent Sessions</h3>
              <p className="text-gray-600 text-xs">
                {sessions.length} total • {sessionCategories.inProgress.length} processing • {sessionCategories.completed.length} completed
                {sessionCategories.errored.length > 0 && ` • ${sessionCategories.errored.length} error${sessionCategories.errored.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {sessions.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear all sessions"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
        {/* In Progress Sessions */}
        {sessionCategories.inProgress.length > 0 && (
          <div className="p-2">
            <div className="flex items-center space-x-1 mb-2 px-2">
              <Clock className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">In Progress</span>
            </div>
            <div className="space-y-2">
              {visibleSessions.inProgress.map(({ session, isChecked }) => {
                const sessionState = timelineStates.find(ts => ts.session.id === session.id);
                return (
                  <EnhancedSessionItem
                    key={session.id}
                    session={session}
                    state={sessionState?.state || 'processing'}
                    isSelected={selectedSessionId === session.id}
                    isNextReview={nextReviewSession?.session.id === session.id}
                    isActiveRecording={session.id === activeRecordingSessionId}
                    copiedSessionId={copiedSessionId}
                    isChecked={isChecked}
                    isCompact={isChecked}
                    isPersisted={persistedSessionIds.has(session.id)}
                    onToggleCheck={handleToggleCheck}
                    onSessionSelect={onSessionSelect}
                    onResumeRecording={onResumeRecording}
                    onStopRecording={onStopRecording}
                    onRemoveSession={onRemoveSession}
                    onMarkSessionComplete={onMarkSessionComplete}
                    onCopyResults={handleCopyResults}
                  />
                );
              })}
              {/* Show More Button for In Progress */}
              {visibleSessions.hasMoreInProgress && (
                <ShowMoreButton
                  onClick={() => setShowAllInProgress(true)}
                  hiddenCount={sessionCategories.inProgress.length - visibleSessions.inProgress.length}
                  category="in progress"
                />
              )}
            </div>
          </div>
        )}

        {/* Error/Cancelled Sessions */}
        {sessionCategories.errored.length > 0 && (
          <div className={`p-2 ${sessionCategories.inProgress.length > 0 ? 'border-t border-gray-100' : ''}`}>
            <div className="flex items-center space-x-1 mb-2 px-2">
              <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" />
              <span className="text-xs font-medium text-red-700">Issues</span>
            </div>
            <div className="space-y-2">
              {visibleSessions.errored.map(({ session, isChecked }) => {
                const sessionState = timelineStates.find(ts => ts.session.id === session.id);
                return (
                  <EnhancedSessionItem
                    key={session.id}
                    session={session}
                    state={sessionState?.state || 'error'}
                    isSelected={selectedSessionId === session.id}
                    isNextReview={nextReviewSession?.session.id === session.id}
                    isActiveRecording={session.id === activeRecordingSessionId}
                    copiedSessionId={copiedSessionId}
                    isChecked={isChecked}
                    isCompact={isChecked}
                    isPersisted={persistedSessionIds.has(session.id)}
                    onToggleCheck={handleToggleCheck}
                    onSessionSelect={onSessionSelect}
                    onResumeRecording={onResumeRecording}
                    onStopRecording={onStopRecording}
                    onRemoveSession={onRemoveSession}
                    onMarkSessionComplete={onMarkSessionComplete}
                    onCopyResults={handleCopyResults}
                  />
                );
              })}
              {/* Show More Button for Errored */}
              {visibleSessions.hasMoreErrored && (
                <ShowMoreButton
                  onClick={() => setShowAllErrored(true)}
                  hiddenCount={sessionCategories.errored.length - visibleSessions.errored.length}
                  category="issues"
                />
              )}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {sessionCategories.completed.length > 0 && (
          <div className={`p-2 ${(sessionCategories.inProgress.length > 0 || sessionCategories.errored.length > 0) ? 'border-t border-gray-100' : ''}`}>
            {(sessionCategories.inProgress.length > 0 || sessionCategories.errored.length > 0) && (
              <div className="flex items-center space-x-1 mb-2 px-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0" />
                <span className="text-xs font-medium text-emerald-700">Completed</span>
              </div>
            )}
            <div className="space-y-2">
              {visibleSessions.completed.map(({ session, isChecked }) => {
                const sessionState = timelineStates.find(ts => ts.session.id === session.id);
                return (
                  <EnhancedSessionItem
                    key={session.id}
                    session={session}
                    state={sessionState?.state || 'needs_review'}
                    isSelected={selectedSessionId === session.id}
                    isNextReview={nextReviewSession?.session.id === session.id}
                    isActiveRecording={session.id === activeRecordingSessionId}
                    copiedSessionId={copiedSessionId}
                    isChecked={isChecked}
                    isCompact={isChecked}
                    isPersisted={persistedSessionIds.has(session.id)}
                    onToggleCheck={handleToggleCheck}
                    onSessionSelect={onSessionSelect}
                    onResumeRecording={onResumeRecording}
                    onStopRecording={onStopRecording}
                    onRemoveSession={onRemoveSession}
                    onMarkSessionComplete={onMarkSessionComplete}
                    onCopyResults={handleCopyResults}
                  />
                );
              })}
              {/* Show More Button for Completed */}
              {visibleSessions.hasMoreCompleted && (
                <ShowMoreButton
                  onClick={() => setShowAllCompleted(true)}
                  hiddenCount={sessionCategories.completed.length - visibleSessions.completed.length}
                  category="completed"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Empty State (shouldn't show due to early return, but for safety) */}
      {sessions.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          No recent sessions
        </div>
      )}
    </div>
  );

  return (
    <DropdownPortal isOpen={isOpen} onClickOutside={onClose}>
      {dropdownContent}
    </DropdownPortal>
  );
}, (prev, next) => {
  // Avoid re-render if visibility and core references haven't changed meaningfully
  if (prev.isOpen !== next.isOpen) return false;
  if (prev.sessions.length !== next.sessions.length) return false;
  if (prev.onRemoveSession !== next.onRemoveSession) return false;
  if (prev.onClearAllSessions !== next.onClearAllSessions) return false;
  if (prev.onSessionSelect !== next.onSessionSelect) return false;
  // Position shallow compare
  const pPos = prev.position; const nPos = next.position;
  if (pPos?.top !== nPos?.top || pPos?.left !== nPos?.left || pPos?.right !== nPos?.right) return false;
  return true;
});

SessionDropdown.displayName = 'SessionDropdown';
