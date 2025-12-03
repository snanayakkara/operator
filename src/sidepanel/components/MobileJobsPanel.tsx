import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import type { MobileJobSummary } from '@/types/mobileJobs.types';
import Button, { IconButton } from './buttons/Button';

interface MobileJobsPanelProps {
  jobs: MobileJobSummary[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onAttach?: (job: MobileJobSummary) => Promise<void> | void;
  onDelete?: (job: MobileJobSummary) => Promise<void> | void;
  attachingJobId?: string | null;
  deletingJobId?: string | null;
  attachedJobIds?: Set<string>;
}

const formatRelative = (iso: string): string => {
  const created = Date.parse(iso);
  if (Number.isNaN(created)) return iso;
  const diff = Date.now() - created;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} h ago`;
  const date = new Date(created);
  return date.toLocaleDateString();
};

const DICTATION_LABELS: Record<string, string> = {
  clinic_letter: 'Clinic Letter',
  procedure_report: 'Procedure Report',
  echo_report: 'Echo Report',
  task: 'Task',
  note: 'Note',
  unknown: 'Dictation'
};

const JOB_TYPE_LABELS: Record<string, string> = {
  phone_call_note: 'Phone Call Note',
  audio_dictation: 'Dictation'
};

export const MobileJobsPanel: React.FC<MobileJobsPanelProps> = ({
  jobs,
  isLoading = false,
  error,
  onRefresh,
  onAttach,
  onDelete,
  attachingJobId,
  deletingJobId,
  attachedJobIds
}) => {
  const attachedLookup = attachedJobIds ?? new Set<string>();
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedJobs(prev => {
      const next = { ...prev };
      const seen = new Set<string>();
      for (const job of jobs) {
        const attached = Boolean(job.attached_session_id) || attachedLookup.has(job.id);
        if (next[job.id] === undefined) {
          next[job.id] = !attached;
        } else if (attached && next[job.id]) {
          next[job.id] = false;
        }
        seen.add(job.id);
      }
      Object.keys(next).forEach(id => {
        if (!seen.has(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [attachedJobIds, jobs]);
  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const aAttached = attachedLookup.has(a.id) || !!a.attached_session_id;
        const bAttached = attachedLookup.has(b.id) || !!b.attached_session_id;
        if (aAttached === bAttached) {
          return Date.parse(b.created_at) - Date.parse(a.created_at);
        }
        return aAttached ? 1 : -1;
      }),
    [attachedLookup, jobs]
  );

  const handleActionClick = (
    event: React.MouseEvent,
    callback?: (job: MobileJobSummary) => Promise<void> | void,
    job?: MobileJobSummary
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (callback && job) {
      void callback(job);
    }
  };

  const renderJobCard = (job: MobileJobSummary) => {
    const isPhoneNote = job.job_type === 'phone_call_note';
    const label = JOB_TYPE_LABELS[job.job_type || ''] || DICTATION_LABELS[job.dictation_type] || 'Dictation';
    const attached = Boolean(job.attached_session_id) || attachedLookup.has(job.id);
    const isDeleting = deletingJobId === job.id;
    const isAttaching = attachingJobId === job.id;

    const isOpen = expandedJobs[job.id] ?? !attached;

    return (
      <details
        key={`${job.id}-${attached ? 'attached' : 'unattached'}`}
        className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-all ${
          attached ? 'opacity-80' : ''
        }`}
        open={isOpen}
        onToggle={event => {
          const { open } = event.currentTarget;
          setExpandedJobs(prev => ({ ...prev, [job.id]: open }));
        }}
      >
        <summary className="list-none cursor-pointer">
          <div className="flex items-start justify-between px-3 py-2 gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{formatRelative(job.created_at)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    job.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : job.status === 'needs_review'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {job.status.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-gray-500">{Math.round(job.confidence * 100)}%</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {(attached || isPhoneNote) && (
                <span className="text-[11px] text-emerald-600 font-semibold uppercase">
                  {isPhoneNote ? 'Saved to rounds' : 'Attached'}
                </span>
              )}
              <div className="flex items-center gap-2">
                {onDelete && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs text-red-600 hover:text-red-700"
                    disabled={isDeleting || attached}
                    isLoading={isDeleting}
                    onClick={event => handleActionClick(event, onDelete, job)}
                    startIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </Button>
                )}
                {onAttach && !isPhoneNote && (
                  <Button
                    size="sm"
                    variant={attached ? 'outline' : 'primary'}
                    disabled={attached || isAttaching}
                    isLoading={isAttaching}
                    onClick={event => handleActionClick(event, onAttach, job)}
                    className="text-xs px-2 py-1"
                  >
                    {attached ? 'Attached' : 'Attach to EMR'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </summary>
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
          {job.triage_metadata?.patient_name && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Header:</span> {job.triage_metadata.patient_name}
            </div>
          )}

          {job.header_text && (
            <p className="text-sm text-gray-700 bg-gray-50 border border-dashed border-gray-200 rounded p-2">
              {job.header_text}
            </p>
          )}

          {job.transcript_preview && (
            <p className="text-xs text-gray-500 whitespace-pre-line">
              {job.transcript_preview}
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>{job.triage_metadata?.hospital || 'Unassigned hospital'}</span>
            <span>{job.audio_filename}</span>
          </div>
        </div>
      </details>
    );
  };

  return (
    <div className="w-[340px] max-h-[720px] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 rounded-full p-1.5">
            <Smartphone className="w-4 h-4 text-gray-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Mobile Dictations</p>
            <p className="text-xs text-gray-500">Jobs synced from Operator Ingest</p>
          </div>
        </div>
        {onRefresh && (
          <IconButton
            onClick={onRefresh}
            icon={<RefreshCw />}
            variant="ghost"
            size="sm"
            className="rounded-full"
            title="Refresh list"
            aria-label="Refresh list"
          />
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-gray-500">Loading mobile dictations…</div>
      )}

      {!isLoading && !error && jobs.length === 0 && (
        <div className="text-sm text-gray-500">
          No mobile recordings yet. Drop audio into the Operator Ingest inbox to sync.
        </div>
      )}

      <div className="space-y-3">
        {sortedJobs.map(renderJobCard)}
      </div>
    </div>
  );
};
