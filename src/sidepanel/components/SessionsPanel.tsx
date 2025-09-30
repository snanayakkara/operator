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
  onMarkSessionComplete?: (session: PatientSession) => void;
  selectedSessionId?: string | null;
  isCollapsible?: boolean;
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
};

const timelineStateMeta: Record<TimelineState, TimelineMeta> = {
  recording: {
    label: 'Recording',
    badgeClass: 'bg-red-50 text-red-600 border border-red-200',
    dotClass: 'bg-red-500 border-red-200',
    icon: <Mic className="w-3.5 h-3.5" />,
    description: 'Audio capture in progress'
  },
  transcribing: {
    label: 'Transcribing',
    badgeClass: 'bg-blue-50 text-blue-600 border border-blue-200',
    dotClass: 'bg-blue-500 border-blue-200',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    description: 'Converting speech to clinical text'
  },
  processing: {
    label: 'Processing',
    badgeClass: 'bg-purple-50 text-purple-600 border border-purple-200',
    dotClass: 'bg-purple-500 border-purple-200',
    icon: <Cpu className="w-3.5 h-3.5" />,
    description: 'AI drafting the note'
  },
  needs_review: {
    label: 'Needs Review',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    dotClass: 'bg-amber-500 border-amber-200',
    icon: <ClipboardList className="w-3.5 h-3.5" />,
    description: 'Ready for clinician polish'
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    dotClass: 'bg-emerald-500 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: 'Finalized and ready to send'
  },
  error: {
    label: 'Attention Needed',
    badgeClass: 'bg-rose-50 text-rose-600 border border-rose-200',
    dotClass: 'bg-rose-500 border-rose-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    description: 'Resolve to keep queue moving'
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
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
      <div className="flex items-center gap-2 font-medium text-slate-700">
        <FileText className="w-3 h-3" />
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
  copiedSessionId: string | null;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
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
  copiedSessionId,
  onSessionSelect,
  onResumeRecording,
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
    if (state === 'recording' && onResumeRecording) {
      onResumeRecording(session);
      return;
    }
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  }, [state, onResumeRecording, onSessionSelect, session]);

  const handleMarkComplete = () => {
    if (onMarkSessionComplete) {
      onMarkSessionComplete(session);
    }
  };

  return (
    <div className="relative pl-6">
      {!isLast && (
        <span className="absolute left-3 top-7 h-[calc(100%-1.75rem)] w-px bg-slate-200" aria-hidden />
      )}

      <div
        className={`flex items-start gap-4 rounded-lg border px-4 py-3 transition-colors ${
          isSelected
            ? 'border-accent-violet/80 bg-accent-violet/[0.08] shadow-sm'
            : isNextReview
              ? 'border-amber-200 bg-amber-50/60'
              : 'border-transparent bg-white/60 hover:border-slate-200 hover:bg-white'
        }`}
      >
        <span
          className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full border ${meta.dotClass}`}
          aria-hidden
        />

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {session.patient?.name || 'Unnamed patient'}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}>
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
                  <span className="rounded-full bg-accent-violet/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-violet">
                    In focus
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatClockTime(session.timestamp)}
                </span>
                {session.patient?.id && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {session.patient.id}
                  </span>
                )}
                <span>{session.agentName || session.agentType}</span>
                <span>Updated {formatRelativeTime(lastUpdate)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrimaryAction}
                disabled={!onSessionSelect && state !== 'recording'}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  state === 'recording'
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                } ${!onSessionSelect && state !== 'recording' ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {state === 'recording' ? <Play className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                <span>
                  {state === 'recording'
                    ? 'Resume recording'
                    : state === 'needs_review' || state === 'completed'
                      ? 'Open results'
                      : 'View session'}
                </span>
              </button>

              {(state === 'needs_review' || state === 'completed') && (
                <button
                  onClick={() => onCopyResults(session)}
                  disabled={!hasResults}
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    hasResults
                      ? 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                      : 'border-slate-200 bg-white text-slate-400 cursor-not-allowed'
                  }`}
                  title={hasResults ? 'Copy letter content to clipboard' : 'Letter not ready yet'}
                >
                  {isCopying ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopying ? 'Copied' : 'Copy letter'}</span>
                </button>
              )}

              {state === 'needs_review' && onMarkSessionComplete && (
                <button
                  onClick={handleMarkComplete}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Mark complete</span>
                </button>
              )}

              <button
                onClick={() => onRemoveSession(session.id)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                title="Remove session"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
            {dictationDuration !== null && (
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Dictation {formatDuration(dictationDuration)}
              </span>
            )}
            {processingDuration !== null && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                Processing {formatDuration(processingDuration)}
              </span>
            )}
            {state === 'error' && session.errors?.length ? (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertTriangle className="w-3 h-3" />
                {session.errors[0]}
              </span>
            ) : null}
            {state === 'error' && !session.errors?.length && session.status === 'cancelled' && (
              <span className="flex items-center gap-1 text-slate-500">
                <XCircle className="w-3 h-3" />
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
  onMarkSessionComplete,
  selectedSessionId,
  isCollapsible = true
}) => {
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!copiedSessionId) return;
    const timeout = setTimeout(() => setCopiedSessionId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedSessionId]);

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
            <h3 className="text-sm font-semibold text-slate-800">Session timeline</h3>
            <span className="text-xs text-slate-500">
              {headerDescription() || `${timelineSessions.length} session${timelineSessions.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Next focus: {nextReviewHint}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onClearAllSessions();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear all</span>
          </button>
          {isCollapsible && (
            <span className="text-xs font-medium text-slate-500">
              {isCollapsed ? 'Show' : 'Hide'}
            </span>
          )}
        </div>
      </button>

      {!isCollapsed && (
        <div className="max-h-[28rem] space-y-3 overflow-y-auto px-2 py-4">
          {timelineStates.map(({ session, state }, index) => (
            <SessionTimelineItem
              key={session.id}
              session={session}
              state={state}
              isLast={index === timelineStates.length - 1}
              isSelected={selectedSessionId === session.id}
              isNextReview={nextReviewSession?.session.id === session.id}
              copiedSessionId={copiedSessionId}
              onSessionSelect={onSessionSelect}
              onResumeRecording={onResumeRecording}
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
