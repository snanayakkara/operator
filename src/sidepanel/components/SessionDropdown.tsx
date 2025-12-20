import React, { memo, useMemo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  ArrowRight as _ArrowRight,
  XCircle,
  Search,
  HardDrive,
  Calendar,
  RefreshCw
} from 'lucide-react';
import Button, { IconButton } from './buttons/Button';
import { SessionProgressIndicator } from './SessionProgressIndicator';
import { DropdownPortal } from './DropdownPortal';
import type { PatientSession, SessionStatus, AgentType } from '@/types/medical.types';
import { getStateColors, type ProcessingState } from '@/utils/stateColors';
import { getAgentColors, getAgentCategoryIcon } from '@/utils/agentCategories';

interface SessionDropdownProps {
  sessions: PatientSession[];
  onRemoveSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onStopRecording?: () => void;
  onAgentReprocess?: (agentType: AgentType) => void; // Callback for reprocessing failed sessions
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

const formatRecordedDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset hours for date comparison
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  const todayOnly = new Date(today);
  todayOnly.setHours(0, 0, 0, 0);
  const yesterdayOnly = new Date(yesterday);
  yesterdayOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  }
  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  }

  // Format as "Mon, 4 Nov"
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

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

// Helper to extract RGB color from Tailwind indicator class for animations
const getIndicatorRgb = (indicatorClass: string): string => {
  // Map Tailwind classes to RGB values
  const colorMap: Record<string, string> = {
    'bg-blue-500': '59, 130, 246',      // Letters & Correspondence
    'bg-emerald-500': '16, 185, 129',   // Clinical Data
    'bg-purple-500': '168, 85, 247',    // Procedures
    'bg-amber-500': '245, 158, 11',     // AI Review
  };

  return colorMap[indicatorClass] || '168, 85, 247'; // Default to purple
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
  onAgentReprocess?: (agentType: AgentType) => void; // Callback for reprocessing failed sessions
  onRemoveSession: (sessionId: string) => void;
  onCopyResults: (session: PatientSession) => Promise<void>;
  onClose?: () => void; // Function to close the dropdown
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
  onAgentReprocess,
  onRemoveSession,
  onCopyResults,
  onClose
}) => {
  const meta = timelineStateMeta[state];
  const hasResults = Boolean(session.results && session.results.trim().length > 0);
  const isCopying = copiedSessionId === session.id;
  const dictationDuration = getDictationDuration(session);
  const processingDuration = getProcessingDuration(session);
  const [isClicking, setIsClicking] = useState(false);

  // Get category-based colors for this agent
  const categoryColors = getAgentColors(session.agentType);
  const categoryIcon = getAgentCategoryIcon(session.agentType);

  const handlePrimaryAction = useCallback(() => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  }, [onSessionSelect, session]);

  const handleCardClick = useCallback(() => {
    if (state !== 'recording' && onSessionSelect) {
      setIsClicking(true);
      setTimeout(() => setIsClicking(false), 200);
      handlePrimaryAction();
      // Close dropdown after opening session
      if (onClose) {
        setTimeout(onClose, 250); // Slight delay to allow animation to complete
      }
    }
  }, [state, onSessionSelect, handlePrimaryAction, onClose]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCheck(session.id);
  }, [onToggleCheck, session.id]);

  // Compact mode: smaller padding, hide details
  const agentRgb = getIndicatorRgb(categoryColors.indicator);

  if (isCompact) {
    return (
      <div
        className={`relative rounded-lg border-l-4 transition-all duration-300 px-2 py-1.5 ${categoryColors.bg} ${categoryColors.border} opacity-60 hover:opacity-80 ${
          isSelected ? `ring-2` : ''
        } ${state !== 'recording' && onSessionSelect ? 'cursor-pointer' : ''}`}
        style={{
          borderLeftColor: `var(--${categoryColors.indicator.replace('bg-', '')})`,
          ...(isSelected ? { '--tw-ring-color': `rgba(${agentRgb}, 0.5)` } as React.CSSProperties : {}),
          ...(isClicking ? {
            animation: 'clickFeedback 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '--click-shadow-color': `rgba(${agentRgb}, 0.3)`
          } as React.CSSProperties : {})
        }}
        onClick={handleCardClick}
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
          <IconButton
            onClick={(e) => { e.stopPropagation(); onRemoveSession(session.id); }}
            icon={<Trash2 />}
            variant="ghost"
            size="sm"
            aria-label="Remove"
            className="flex-shrink-0 text-slate-400 hover:text-rose-600 w-auto h-auto p-1"
            title="Remove"
          />
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`relative rounded-card border-l-4 transition-all duration-300 px-3 py-2 ${categoryColors.bg} ${categoryColors.border} ${
        isSelected ? 'ring-2' : ''
      } ${state !== 'recording' && onSessionSelect ? 'cursor-pointer' : ''}`}
      style={{
        borderLeftColor: `var(--${categoryColors.indicator.replace('bg-', '')})`,
        ...(isSelected ? { '--tw-ring-color': `rgba(${agentRgb}, 0.5)` } as React.CSSProperties : {}),
        ...(isClicking ? {
          animation: 'clickFeedback 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '--click-shadow-color': `rgba(${agentRgb}, 0.3)`
        } as React.CSSProperties : {})
      }}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-2">

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
              <span className="text-base opacity-40 flex-shrink-0">
                {categoryIcon}
              </span>
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
                <Calendar className="w-2.5 h-2.5 text-slate-400" />
                {formatRecordedDate(session.timestamp)}
              </span>
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
              <div className="mt-1 space-y-1">
                <div className="text-[10px] text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="font-medium">{session.errors[0]}</span>
                </div>

                {session.errors.length > 1 && (
                  <details className="text-[9px] text-rose-500">
                    <summary className="cursor-pointer hover:text-rose-700 ml-3">
                      Show {session.errors.length - 1} more error{session.errors.length > 2 ? 's' : ''}
                    </summary>
                    <ul className="mt-0.5 pl-3 space-y-0.5 list-disc">
                      {session.errors.slice(1).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="flex items-start gap-1.5 ml-3">
                  <div className="text-[9px] text-amber-600 flex-1">
                    💡 Try: Check LM Studio is running → Click "Retry"
                  </div>
                  {onAgentReprocess && onSessionSelect && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionSelect(session); // Open session first
                        setTimeout(() => onAgentReprocess(session.agentType), 100); // Then reprocess
                      }}
                      variant="outline"
                      size="sm"
                      startIcon={<RefreshCw />}
                      className="border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-semibold uppercase w-auto h-auto px-1.5 py-0.5"
                      title="Retry processing this session"
                    >
                      Retry
                    </Button>
                  )}
                </div>
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

          <div className="flex flex-col gap-1.5">
            {state === 'recording' && isActiveRecording && onStopRecording && (
              <IconButton
                onClick={(e) => { e.stopPropagation(); onStopRecording(); }}
                icon={<XCircle />}
                variant="outline"
                size="sm"
                aria-label="Stop recording"
                className="border-red-200/80 bg-white text-red-600 hover:bg-red-50 w-auto h-auto px-2 py-1"
                title="Stop recording"
              />
            )}

            {state === 'recording' && !isActiveRecording && onResumeRecording && (
              <IconButton
                onClick={(e) => { e.stopPropagation(); onResumeRecording(session); }}
                icon={<Play />}
                variant="outline"
                size="sm"
                aria-label="Resume recording"
                className="border-red-200/80 bg-red-50/80 text-red-600 hover:bg-red-100 w-auto h-auto px-2 py-1"
                title="Resume recording"
              />
            )}

            {(state === 'needs_review' || state === 'completed') && (
              <IconButton
                onClick={(e) => { e.stopPropagation(); onCopyResults(session); }}
                disabled={!hasResults}
                icon={isCopying ? <Check /> : <Copy />}
                variant="outline"
                size="sm"
                aria-label="Copy letter"
                className={`w-auto h-auto px-2 py-1 ${
                  hasResults
                    ? 'border-emerald-200/80 bg-white text-emerald-600 hover:bg-emerald-50'
                    : 'border-slate-200/80 bg-white text-slate-400'
                }`}
                title="Copy letter"
              />
            )}

            <IconButton
              onClick={(e) => { e.stopPropagation(); onRemoveSession(session.id); }}
              icon={<Trash2 />}
              variant="outline"
              size="sm"
              aria-label="Remove"
              className="border-slate-200/80 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 w-auto h-auto px-2 py-1"
              title="Remove"
            />
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
  onAgentReprocess,
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
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pendingAutoScrollRef = useRef<number | null>(null);

  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  // Local state for lazy loading
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllInProgress, setShowAllInProgress] = useState(false);
  const [showAllErrored, setShowAllErrored] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredSessions = useMemo(() => {
    if (!normalizedSearchTerm) {
      return sessions;
    }
    return sessions.filter((session) => {
      const patientName = session.patient?.name?.toLowerCase() ?? '';
      const agentName = session.agentName?.toLowerCase() ?? '';
      const agentType = session.agentType?.toLowerCase() ?? '';
      const quickField = session.quickActionField?.toLowerCase() ?? '';
      const transcript = session.transcription?.toLowerCase() ?? '';
      return (
        patientName.includes(normalizedSearchTerm) ||
        agentName.includes(normalizedSearchTerm) ||
        agentType.includes(normalizedSearchTerm) ||
        quickField.includes(normalizedSearchTerm) ||
        transcript.includes(normalizedSearchTerm)
      );
    });
  }, [sessions, normalizedSearchTerm]);

  useEffect(() => {
    setShowAllCompleted(false);
    setShowAllInProgress(false);
    setShowAllErrored(false);
  }, [normalizedSearchTerm]);

  const isSearchActive = normalizedSearchTerm.length > 0;

  // Timeline sessions with derived states
  const timelineStates = useMemo(() => {
    return filteredSessions.map((session) => ({
      session,
      state: deriveTimelineState(session),
      isChecked: checkedSessionIds.has(session.id)
    }));
  }, [filteredSessions, checkedSessionIds]);

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
    const completedLimit = isSearchActive || showAllCompleted ? sessionCategories.completed.length : INITIAL_VISIBLE_SESSIONS;
    const inProgressLimit = isSearchActive || showAllInProgress ? sessionCategories.inProgress.length : INITIAL_VISIBLE_SESSIONS;
    const erroredLimit = isSearchActive || showAllErrored ? sessionCategories.errored.length : INITIAL_VISIBLE_SESSIONS;

    const result = {
      completed: sessionCategories.completed.slice(0, completedLimit),
      inProgress: sessionCategories.inProgress.slice(0, inProgressLimit),
      errored: sessionCategories.errored.slice(0, erroredLimit),
      hasMoreCompleted: !isSearchActive && sessionCategories.completed.length > completedLimit,
      hasMoreInProgress: !isSearchActive && sessionCategories.inProgress.length > inProgressLimit,
      hasMoreErrored: !isSearchActive && sessionCategories.errored.length > erroredLimit
    };

    return result;
  }, [sessionCategories, showAllCompleted, showAllInProgress, showAllErrored, isSearchActive]);

  const expandBottomCategory = useCallback((): boolean => {
    if (isSearchActive) return false;

    // Expand only the bottom-most visible category to avoid shifting items the user is already looking at.
    if (sessionCategories.completed.length > 0) {
      if (visibleSessions.hasMoreCompleted && !showAllCompleted) {
        setShowAllCompleted(true);
        return true;
      }
      return false;
    }
    if (sessionCategories.errored.length > 0) {
      if (visibleSessions.hasMoreErrored && !showAllErrored) {
        setShowAllErrored(true);
        return true;
      }
      return false;
    }
    if (sessionCategories.inProgress.length > 0) {
      if (visibleSessions.hasMoreInProgress && !showAllInProgress) {
        setShowAllInProgress(true);
        return true;
      }
    }
    return false;
  }, [
    isSearchActive,
    sessionCategories.completed.length,
    sessionCategories.errored.length,
    sessionCategories.inProgress.length,
    showAllCompleted,
    showAllErrored,
    showAllInProgress,
    visibleSessions.hasMoreCompleted,
    visibleSessions.hasMoreErrored,
    visibleSessions.hasMoreInProgress
  ]);

  const handleListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (isSearchActive) return;

    const target = event.currentTarget;
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

    if (isNearBottom) {
      expandBottomCategory();
    }
  }, [expandBottomCategory, isSearchActive]);

  const handleListWheelNative = useCallback((event: any) => {
    const el = listRef.current;
    if (!el) return;

    const deltaY = Number(event?.deltaY ?? 0);
    if (deltaY === 0) return;
    if (isSearchActive) return;

    const eventTarget = event?.target as Node | null | undefined;
    const shouldRouteScrollToList = !!eventTarget && !el.contains(eventTarget);

    // If the wheel gesture starts on the header/search/etc, route it to the list and prevent
    // the underlying app from scrolling.
    if (shouldRouteScrollToList) {
      event.preventDefault();
      event.stopPropagation();
      const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.min(Math.max(0, el.scrollTop + deltaY), maxScrollTop);
    }

    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    // If we're in the middle of expanding + auto-scrolling, keep the scroll "inside" the dropdown
    // and accumulate additional wheel deltas so one gesture both loads and advances.
    if (pendingAutoScrollRef.current !== null) {
      if (deltaY > 0) {
        event.preventDefault();
        event.stopPropagation();
        pendingAutoScrollRef.current += Math.min(240, deltaY);
      } else if (atTop) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    // If the list isn't scrollable yet (e.g. only the initial items are rendered),
    // a downward scroll gesture should reveal more AND not scroll the background.
    if (atBottom && deltaY > 0) {
      const didExpand = expandBottomCategory();
      if (didExpand) {
        event.preventDefault();
        event.stopPropagation();
        pendingAutoScrollRef.current = el.scrollTop + Math.min(240, deltaY);
        return;
      }
      // No more to expand; keep scroll locked to the dropdown.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (atTop && deltaY < 0) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [expandBottomCategory, isSearchActive]);

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
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      fullWidth
      startIcon={<ChevronDown />}
      className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50"
    >
      Scroll to load {hiddenCount} more {category}
    </Button>
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

  const getCascadeMotionProps = useCallback((extraIndex: number) => {
    const delay = Math.min(0.7, extraIndex * 0.05);
    return {
      initial: { y: 8 },
      animate: { y: 0 },
      exit: { y: -6 },
      transition: { duration: 0.32, ease: 'easeOut' as const, delay }
    };
  }, []);

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

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (pendingAutoScrollRef.current === null) return;

    let cancelled = false;
    let rafId = 0;
    let attempts = 0;

    const applyUntilScrollable = () => {
      if (cancelled) return;
      attempts += 1;

      const desiredScrollTop = pendingAutoScrollRef.current ?? 0;
      const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.min(desiredScrollTop, maxScrollTop);

      // During the fold-in height animation, the list might not be scrollable yet.
      // Keep trying for a few frames until enough content height exists.
      if (attempts < 30 && maxScrollTop < desiredScrollTop) {
        rafId = requestAnimationFrame(applyUntilScrollable);
        return;
      }

      // Done: either we reached the desired position, or the list can't scroll further.
      pendingAutoScrollRef.current = null;
    };

    rafId = requestAnimationFrame(applyUntilScrollable);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    showAllCompleted,
    showAllErrored,
    showAllInProgress,
    visibleSessions.completed.length,
    visibleSessions.errored.length,
    visibleSessions.inProgress.length
  ]);

  // Track when dropdown ref is mounted (needed because portal renders async)
  const [dropdownMounted, setDropdownMounted] = useState(false);
  
  // Callback ref to detect when the dropdown element is actually in the DOM
  const dropdownRefCallback = useCallback((node: HTMLDivElement | null) => {
    dropdownRef.current = node;
    setDropdownMounted(!!node);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !dropdownMounted) return;
    const el = dropdownRef.current;
    if (!el) return;

    // React's synthetic onWheel can be passive in some setups; attach a non-passive listener
    // so we can prevent background scroll while we expand + auto-scroll.
    const handler = handleListWheelNative;
    el.addEventListener('wheel', handler, { passive: false });
    return () => {
      el.removeEventListener('wheel', handler);
    };
  }, [handleListWheelNative, isOpen, dropdownMounted]);

  // Early return AFTER all hooks to avoid React hook rule violations
  if (!isOpen) {
    return null;
  }

  const totalSessionsCount = sessions.length;
  const matchingSessionsCount = filteredSessions.length;

  const dropdownContent = (
    <motion.div
      ref={dropdownRefCallback}
      style={getDropdownStyle()}
      className="bg-white rounded-card shadow-modal border border-gray-200 overflow-hidden"
      data-dropdown-menu
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-gray-900 font-medium text-sm">Recent Sessions</h3>
              <p className="text-gray-600 text-xs">
                {isSearchActive ? (
                  <>
                    {matchingSessionsCount} match{matchingSessionsCount === 1 ? '' : 'es'}
                    {searchTerm && <> for “{searchTerm}”</>}
                    {matchingSessionsCount !== totalSessionsCount && (
                      <> • {totalSessionsCount} total</>
                    )}
                  </>
                ) : (
                  <>
                    {totalSessionsCount} total • {sessionCategories.inProgress.length} processing • {sessionCategories.completed.length} completed
                    {sessionCategories.errored.length > 0 && ` • ${sessionCategories.errored.length} error${sessionCategories.errored.length !== 1 ? 's' : ''}`}
                  </>
                )}
              </p>
            </div>
          </div>

          {sessions.length > 0 && (
            <IconButton
              onClick={handleClearAll}
              icon={<Trash2 />}
              variant="ghost"
              size="sm"
              aria-label="Clear all sessions"
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
              title="Clear all sessions"
            />
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100 bg-white">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search patients, agents, or transcripts"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-8 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            autoFocus={sessions.length > 10}
          />
          {searchTerm && (
            <IconButton
              onClick={() => setSearchTerm('')}
              icon={<XCircle className="h-3.5 w-3.5" />}
              variant="ghost"
              size="sm"
              aria-label="Clear session search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-auto h-auto p-1 text-gray-400 hover:text-gray-600"
            />
          )}
        </div>
      </div>

      {/* Sessions List */}
      <div
        ref={listRef}
        className="max-h-[calc(100vh-160px)] overflow-y-auto overscroll-contain"
        onScroll={handleListScroll}
      >
        {matchingSessionsCount === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            {isSearchActive ? (
              <>
                No sessions found for “{searchTerm}”.
                <br />
                Try a different patient name or agent.
              </>
            ) : (
              'No recent sessions'
            )}
          </div>
        ) : (
          <>
            {/* In Progress Sessions */}
            {sessionCategories.inProgress.length > 0 && (
              <div className="p-2">
                <div className="flex items-center space-x-1 mb-2 px-2">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">In Progress</span>
                </div>
                <div className="space-y-2">
                  {visibleSessions.inProgress.slice(0, INITIAL_VISIBLE_SESSIONS).map(({ session, isChecked }) => {
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
                        onAgentReprocess={onAgentReprocess}
                        onRemoveSession={onRemoveSession}
                        onCopyResults={handleCopyResults}
                        onClose={onClose}
                      />
                    );
                  })}
                  <AnimatePresence initial={false}>
                    {showAllInProgress && !isSearchActive && visibleSessions.inProgress.length > INITIAL_VISIBLE_SESSIONS && (
                      <motion.div
                        key="inProgress-extra"
                        className="overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.44, ease: 'easeOut' }}
                      >
                        <div className="space-y-2">
                          {visibleSessions.inProgress.slice(INITIAL_VISIBLE_SESSIONS).map(({ session, isChecked }, extraIndex) => {
                            const sessionState = timelineStates.find(ts => ts.session.id === session.id);
                            return (
                              <motion.div key={session.id} {...getCascadeMotionProps(extraIndex)}>
                                <EnhancedSessionItem
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
                                  onAgentReprocess={onAgentReprocess}
                                  onRemoveSession={onRemoveSession}
                                  onCopyResults={handleCopyResults}
                                  onClose={onClose}
                                />
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {visibleSessions.hasMoreInProgress && (
                    <ShowMoreButton
                      onClick={() => setShowAllInProgress(true)}
                      hiddenCount={sessionCategories.inProgress.length - visibleSessions.inProgress.length}
                      category="in-progress sessions"
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
                  <span className="text-xs font-medium text-red-700">Needs Attention</span>
                </div>
                <div className="space-y-2">
                  {visibleSessions.errored.slice(0, INITIAL_VISIBLE_SESSIONS).map(({ session, isChecked }) => {
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
                        onAgentReprocess={onAgentReprocess}
                        onRemoveSession={onRemoveSession}
                        onCopyResults={handleCopyResults}
                        onClose={onClose}
                      />
                    );
                  })}
                  <AnimatePresence initial={false}>
                    {showAllErrored && !isSearchActive && visibleSessions.errored.length > INITIAL_VISIBLE_SESSIONS && (
                      <motion.div
                        key="errored-extra"
                        className="overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.44, ease: 'easeOut' }}
                      >
                        <div className="space-y-2">
                          {visibleSessions.errored.slice(INITIAL_VISIBLE_SESSIONS).map(({ session, isChecked }, extraIndex) => {
                            const sessionState = timelineStates.find(ts => ts.session.id === session.id);
                            return (
                              <motion.div key={session.id} {...getCascadeMotionProps(extraIndex)}>
                                <EnhancedSessionItem
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
                                  onAgentReprocess={onAgentReprocess}
                                  onRemoveSession={onRemoveSession}
                                  onCopyResults={handleCopyResults}
                                  onClose={onClose}
                                />
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {visibleSessions.hasMoreErrored && (
                    <ShowMoreButton
                      onClick={() => setShowAllErrored(true)}
                      hiddenCount={sessionCategories.errored.length - visibleSessions.errored.length}
                      category="sessions needing attention"
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
                  {visibleSessions.completed.slice(0, INITIAL_VISIBLE_SESSIONS).map(({ session, isChecked }) => {
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
                        onAgentReprocess={onAgentReprocess}
                        onRemoveSession={onRemoveSession}
                        onCopyResults={handleCopyResults}
                        onClose={onClose}
                      />
                    );
                  })}
                  <AnimatePresence initial={false}>
                    {showAllCompleted && !isSearchActive && visibleSessions.completed.length > INITIAL_VISIBLE_SESSIONS && (
                      <motion.div
                        key="completed-extra"
                        className="overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.44, ease: 'easeOut' }}
                      >
                        <div className="space-y-2">
                          {visibleSessions.completed.slice(INITIAL_VISIBLE_SESSIONS).map(({ session, isChecked }, extraIndex) => {
                            const sessionState = timelineStates.find(ts => ts.session.id === session.id);
                            return (
                              <motion.div key={session.id} {...getCascadeMotionProps(extraIndex)}>
                                <EnhancedSessionItem
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
                                  onAgentReprocess={onAgentReprocess}
                                  onRemoveSession={onRemoveSession}
                                  onCopyResults={handleCopyResults}
                                  onClose={onClose}
                                />
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {visibleSessions.hasMoreCompleted && (
                    <ShowMoreButton
                      onClick={() => setShowAllCompleted(true)}
                      hiddenCount={sessionCategories.completed.length - visibleSessions.completed.length}
                      category="completed sessions"
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );

  return (
    <DropdownPortal isOpen={isOpen} onClickOutside={onClose}>
      <AnimatePresence mode="wait">
        {dropdownContent}
      </AnimatePresence>
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
