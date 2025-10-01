import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Users,
  Trash2,
  Clock,
  Mic,
  Loader2,
  Cpu,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Play,
  Copy,
  Check,
  ArrowRight,
  XCircle
} from 'lucide-react';
import { SessionProgressIndicator } from './SessionProgressIndicator';
import type { PatientSession, SessionStatus } from '@/types/medical.types';

interface SessionsPanelProps {
  sessions: PatientSession[];
  onRemoveSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onStopRecording?: () => void;
  onMarkSessionComplete?: (session: PatientSession) => void;
  selectedSessionId?: string | null;
  isCollapsible?: boolean;
  activeRecordingSessionId?: string | null;
}

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
  completeAnimation?: string;
};

const timelineStateMeta: Record<TimelineState, TimelineMeta> = {
  recording: {
    label: 'Recording',
    badgeClass: 'bg-red-50/80 text-red-600 border border-red-200/70',
    dotClass: 'bg-red-500 border-red-200/60',
    icon: <Mic className="icon-compact text-red-500" />,
    description: 'Audio capture in progress',
    cardClass: 'bg-white/95 border-red-100/60 shadow-[0_6px_18px_-12px_rgba(220,38,38,0.45)]',
    chipClass: 'text-red-600',
    accentEdgeClass: 'before:bg-gradient-to-br before:from-red-200/60 before:to-red-100/20'
  },
  transcribing: {
    label: 'Transcribing',
    badgeClass: 'bg-blue-50/80 text-blue-600 border border-blue-200/70',
    dotClass: 'bg-blue-500 border-blue-200/60',
    icon: <Loader2 className="icon-compact text-blue-500 animate-spin" />,
    description: 'Converting speech to clinical text',
    cardClass: 'bg-blue-50/30 border-blue-100/60 shadow-[0_6px_18px_-12px_rgba(37,99,235,0.45)]',
    chipClass: 'text-blue-600',
    accentEdgeClass: 'before:bg-gradient-to-br before:from-blue-200/60 before:to-blue-100/20'
  },
  processing: {
    label: 'Processing',
    badgeClass: 'bg-purple-50/80 text-purple-600 border border-purple-200/70',
    dotClass: 'bg-purple-500 border-purple-200/60',
    icon: <Cpu className="icon-compact text-purple-500" />,
    description: 'AI drafting the note',
    cardClass: 'bg-purple-50/40 border-purple-100/60 shadow-[0_6px_18px_-12px_rgba(168,85,247,0.45)]',
    chipClass: 'text-purple-600',
    accentEdgeClass: 'before:bg-gradient-to-br before:from-purple-200/70 before:to-purple-100/20'
  },
  needs_review: {
    label: 'Needs Review',
    badgeClass: 'bg-amber-50/80 text-amber-700 border border-amber-200/70',
    dotClass: 'bg-amber-500 border-amber-200/60',
    icon: <ClipboardList className="icon-compact text-amber-600" />,
    description: 'Ready for clinician polish',
    cardClass: 'bg-amber-50/35 border-amber-100/60 shadow-[0_6px_18px_-12px_rgba(217,119,6,0.45)]',
    chipClass: 'text-amber-700',
    accentEdgeClass: 'before:bg-gradient-to-br before:from-amber-200/60 before:to-amber-100/20'
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50/90 text-emerald-600 border border-emerald-200/70',
    dotClass: 'bg-emerald-500 border-emerald-200/60',
    icon: <CheckCircle2 className="icon-compact text-emerald-600" />,
    description: 'Finalized and ready to send',
    cardClass: 'bg-emerald-50/45 border-emerald-100/60 shadow-[0_8px_22px_-14px_rgba(22,163,74,0.55)]',
    chipClass: 'text-emerald-600',
    accentEdgeClass: 'before:bg-gradient-to-br before:from-emerald-200/70 before:to-emerald-100/20',
    completeAnimation: 'animate-complete-pop'
  },
  error: {
    label: 'Attention Needed',
    badgeClass: 'bg-rose-50/85 text-rose-600 border border-rose-200/70',
    dotClass: 'bg-rose-500 border-rose-200/60',
    icon: <AlertTriangle className="icon-compact text-rose-600" />,
    description: 'Resolve to keep queue moving',
    cardClass: 'bg-rose-50/40 border-rose-100/60 shadow-[0_6px_18px_-12px_rgba(225,29,72,0.5)]',
    chipClass: 'text-rose-600',
    accentEdgeClass: 'before:bg-gradient-to-br before:from-rose-200/70 before:to-rose-100/25'
  }
};

const ACTIVE_STATES: TimelineState[] = ['recording', 'transcribing', 'processing'];

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

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return 'just now';
  const diff = Date.now() - timestamp;
  if (diff < 0) return 'just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const deriveTimelineState = (session: PatientSession): TimelineState => {
  const baseStatus = session.status as SessionStatus | undefined;

  if (baseStatus === 'recording') return 'recording';
  if (baseStatus === 'transcribing') return 'transcribing';
  if (baseStatus === 'processing') return 'processing';
  if (baseStatus === 'error' || baseStatus === 'cancelled') return 'error';

  if (baseStatus === 'completed') {
    // Sessions default to needing review until clinician finalizes them.
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

const getLastUpdatedAt = (session: PatientSession): number | undefined => {
  return (
    session.completedTime ||
    session.processingStartTime ||
    session.transcriptionStartTime ||
    session.recordingStartTime ||
    session.timestamp
  );
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

const ReportSnippet: React.FC<{ session: PatientSession }> = ({ session }) => {
  if (!session.results) {
    return null;
  }

  const trimmed = session.results.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const preview = trimmed.length > 320 ? `${trimmed.slice(0, 320)}…` : trimmed;

  return (
    <div className="mt-3 rounded-lg border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
      <div className="flex items-center gap-2 font-medium text-slate-700">
        <FileText className="icon-compact text-slate-500" />
        <span>Letter preview</span>
      </div>
      <p className="mt-1 line-clamp-3 leading-relaxed">
        {preview}
      </p>
    </div>
  );
};

interface TimelineItemProps {
  session: PatientSession;
  state: TimelineState;
  isLast: boolean;
  isSelected: boolean;
  isNextReview: boolean;
  isActiveRecording: boolean;
  copiedSessionId: string | null;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onStopRecording?: () => void;
  onRemoveSession: (sessionId: string) => void;
  onMarkSessionComplete?: (session: PatientSession) => void;
  onCopyResults: (session: PatientSession) => Promise<void>;
}

const SessionTimelineItem: React.FC<TimelineItemProps> = ({
  session,
  state,
  isLast,
  isSelected,
  isNextReview,
  isActiveRecording,
  copiedSessionId,
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
  const lastUpdate = getLastUpdatedAt(session);

  const handlePrimaryAction = useCallback(() => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  }, [onSessionSelect, session]);

  const handleMarkComplete = () => {
    if (onMarkSessionComplete) {
      onMarkSessionComplete(session);
    }
  };

  return (
    <div className="relative pl-7">
      {!isLast && (
        <span className="absolute left-3.5 top-8 h-[calc(100%-2rem)] w-px bg-slate-200" aria-hidden />
      )}

      <div
        className={`relative flex items-start gap-4 rounded-xl border px-5 py-4 transition-all duration-200 ease-out ${meta.cardClass} ${
          isSelected
            ? 'scale-[1.01] border-accent-violet/70 shadow-[0_10px_28px_-20px_rgba(124,58,237,0.6)]'
            : 'hover:shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)]'
        } ${meta.accentEdgeClass} ${meta.completeAnimation ?? ''} before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-full before:opacity-80 before:content-['']`}
      >
        <span
          className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full border ${meta.dotClass}`}
          aria-hidden
        />

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-[15px] leading-5 text-slate-900">
                  {session.patient?.name || 'Unnamed patient'}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 ${meta.badgeClass} ${meta.chipClass}`}>
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                  {state === 'processing' && session.processingProgress && (
                    <SessionProgressIndicator
                      phase={session.processingProgress.phase || 'Processing'}
                      progress={session.processingProgress.progress}
                      compact={true}
                    />
                  )}
                </div>
                {isNextReview && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Next to review
                  </span>
                )}
                {isSelected && (
                  <span className="rounded-full bg-accent-violet/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-violet">
                    In focus
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="icon-compact text-slate-400" />
                  {formatClockTime(session.timestamp)}
                </span>
                {session.patient?.id && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <Users className="icon-compact text-slate-400" />
                    {session.patient.id}
                  </span>
                )}
                <span className="text-slate-500">{session.agentName || session.agentType}</span>
                <span className="text-slate-500">Updated {formatRelativeTime(lastUpdate)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Recording state with active recording: show Stop button */}
              {state === 'recording' && isActiveRecording && onStopRecording && (
                <button
                  onClick={onStopRecording}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200/80 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition-all duration-200 hover:bg-red-50"
                >
                  <XCircle className="icon-compact text-red-500" />
                  <span>Stop recording</span>
                </button>
              )}

              {/* Recording state without active recording (paused/abandoned): show Resume button */}
              {state === 'recording' && !isActiveRecording && onResumeRecording && (
                <button
                  onClick={() => onResumeRecording(session)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200/80 bg-red-50/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition-all duration-200 hover:bg-red-100"
                >
                  <Play className="icon-compact text-red-500" />
                  <span>Resume recording</span>
                </button>
              )}

              {/* Other states: show View/Open button */}
              {state !== 'recording' && onSessionSelect && (
                <button
                  onClick={handlePrimaryAction}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowRight className="icon-compact text-slate-500" />
                  <span>
                    {state === 'needs_review' || state === 'completed'
                      ? 'Open results'
                      : 'View session'}
                  </span>
                </button>
              )}

              {(state === 'needs_review' || state === 'completed') && (
                <button
                  onClick={() => onCopyResults(session)}
                  disabled={!hasResults}
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                    hasResults
                      ? 'border-emerald-200/80 bg-white text-emerald-600 hover:bg-emerald-50'
                      : 'border-slate-200/80 bg-white text-slate-400 cursor-not-allowed'
                  }`}
                  title={hasResults ? 'Copy letter content to clipboard' : 'Letter not ready yet'}
                >
                  {isCopying ? <Check className="icon-compact text-emerald-600" /> : <Copy className="icon-compact text-emerald-600" />}
                  <span>{isCopying ? 'Copied' : 'Copy letter'}</span>
                </button>
              )}

              {state === 'needs_review' && onMarkSessionComplete && (
                <button
                  onClick={handleMarkComplete}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <CheckCircle2 className="icon-compact text-emerald-500" />
                  <span>Mark complete</span>
                </button>
              )}

              <button
                onClick={() => onRemoveSession(session.id)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-all duration-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                title="Remove session"
              >
                <Trash2 className="icon-compact text-rose-500" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {dictationDuration !== null && (
              <span className="flex items-center gap-1">
                <Mic className="icon-compact text-slate-400" />
                Dictation {formatDuration(dictationDuration)}
              </span>
            )}
            {processingDuration !== null && (
              <span className="flex items-center gap-1">
                <Cpu className="icon-compact text-slate-400" />
                Processing {formatDuration(processingDuration)}
              </span>
            )}
            {state === 'error' && session.errors?.length ? (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertTriangle className="icon-compact text-rose-600" />
                {session.errors[0]}
              </span>
            ) : null}
            {state === 'error' && !session.errors?.length && session.status === 'cancelled' && (
              <span className="flex items-center gap-1 text-slate-500">
                <XCircle className="icon-compact text-slate-500" />
                Session cancelled
              </span>
            )}
          </div>

          {(state === 'needs_review' || state === 'completed') && <ReportSnippet session={session} />}
        </div>
      </div>
    </div>
  );
};

export const SessionsPanel: React.FC<SessionsPanelProps> = ({
  sessions,
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  onResumeRecording,
  onStopRecording,
  onMarkSessionComplete,
  selectedSessionId,
  isCollapsible = true,
  activeRecordingSessionId = null
}) => {
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!copiedSessionId) return;
    const timeout = setTimeout(() => setCopiedSessionId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedSessionId]);

  // Auto-collapse behavior:
  // - Collapse when recording to avoid overlap with recording UI
  // - Collapse when all work completes (after a delay)
  // - Expand for transcribing/processing to show progress
  useEffect(() => {
    const hasRecording = sessions.some(s => s.status === 'recording');
    const hasActiveWork = sessions.some(s => ['recording', 'transcribing', 'processing'].includes(s.status));

    if (hasRecording) {
      // Immediately collapse when recording to prevent overlap with recording interface
      setIsCollapsed(true);
    } else if (!hasActiveWork && sessions.length > 0) {
      // All sessions completed - auto-collapse after a short delay to let user see completion
      const collapseTimeout = setTimeout(() => setIsCollapsed(true), 1000);
      return () => clearTimeout(collapseTimeout);
    } else if (hasActiveWork) {
      // Expand when there's transcribing/processing work to show progress
      setIsCollapsed(false);
    }
  }, [sessions]);

  const timelineSessions = useMemo(() => {
    return [...sessions].sort((a, b) => (a.recordingStartTime || a.timestamp) - (b.recordingStartTime || b.timestamp));
  }, [sessions]);

  const timelineStates = useMemo(() => {
    return timelineSessions.map((session) => ({
      session,
      state: deriveTimelineState(session)
    }));
  }, [timelineSessions]);

  const queueStats = useMemo(() => {
    return timelineStates.reduce(
      (acc, item) => {
        if (ACTIVE_STATES.includes(item.state)) acc.active += 1;
        if (item.state === 'needs_review') acc.review += 1;
        if (item.state === 'completed') acc.completed += 1;
        if (item.state === 'error') acc.error += 1;
        return acc;
      },
      { active: 0, review: 0, completed: 0, error: 0 }
    );
  }, [timelineStates]);

  const nextReviewSession = useMemo(() => {
    return (
      timelineStates.find(item => item.state === 'needs_review') ||
      timelineStates.find(item => item.state === 'completed')
    );
  }, [timelineStates]);

  const handleCopyResults = useCallback(async (session: PatientSession) => {
    if (!session.results || session.results.trim().length === 0) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(session.results);
      } else {
        // Fallback for older browsers
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

  if (timelineSessions.length === 0) {
    return null;
  }

  const headerDescription = () => {
    const parts: string[] = [];
    if (queueStats.active > 0) {
      parts.push(`${queueStats.active} active`);
    }
    if (queueStats.review > 0) {
      parts.push(`${queueStats.review} to review`);
    }
    if (queueStats.completed > 0) {
      parts.push(`${queueStats.completed} completed`);
    }
    if (queueStats.error > 0) {
      parts.push(`${queueStats.error} attention`);
    }
    return parts.join(' • ');
  };

  const nextReviewHint = nextReviewSession
    ? `${nextReviewSession.session.patient?.name || 'Patient'} · ${formatClockTime(nextReviewSession.session.timestamp)}`
    : 'Queue is clear';

  return (
    <div className="glass rounded-xl border border-slate-200/70 bg-white/70">
      <button
        type="button"
        className={`flex w-full items-center justify-between border-b border-slate-200 px-4 py-3 text-left transition-colors ${
          isCollapsible ? 'hover:bg-white' : 'cursor-default'
        }`}
        onClick={() => {
          if (isCollapsible) {
            setIsCollapsed(prev => !prev);
          }
        }}
      >
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-semibold text-[15px] leading-5 text-slate-900">Session timeline</h3>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {headerDescription() || `${timelineSessions.length} session${timelineSessions.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Next focus: {nextReviewHint}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onClearAllSessions();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-all duration-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="icon-compact text-rose-500" />
            <span>Clear all</span>
          </button>
          {isCollapsible && (
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isCollapsed ? 'Show' : 'Hide'}
            </span>
          )}
        </div>
      </button>

      {!isCollapsed && (
        <div className="max-h-[28rem] space-y-4 overflow-y-auto px-4 pb-5 pt-4">
          {timelineStates.map(({ session, state }, index) => (
            <SessionTimelineItem
              key={session.id}
              session={session}
              state={state}
              isLast={index === timelineStates.length - 1}
              isSelected={selectedSessionId === session.id}
              isNextReview={nextReviewSession?.session.id === session.id}
              isActiveRecording={session.id === activeRecordingSessionId}
              copiedSessionId={copiedSessionId}
              onSessionSelect={onSessionSelect}
              onResumeRecording={onResumeRecording}
              onStopRecording={onStopRecording}
              onRemoveSession={onRemoveSession}
              onMarkSessionComplete={onMarkSessionComplete}
              onCopyResults={handleCopyResults}
            />
          ))}
        </div>
      )}
    </div>
  );
};
