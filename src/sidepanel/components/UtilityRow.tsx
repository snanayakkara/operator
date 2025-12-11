/**
 * UtilityRow Component
 *
 * Compact horizontal row (32px height) for secondary header elements.
 * Contains: StateChip, Quick Add, Queue Status, Mobile Jobs, Sessions
 *
 * This component extracts functionality from SidebarHeader into a
 * dedicated utility row that sits between MiniHeader and CommandBar.
 */

import React, { memo, useState, useRef } from 'react';
import { Plus, Smartphone, Bell } from 'lucide-react';
import { animation } from '@/utils/designTokens';
import { StateChip } from './StateChip';
import { QueueStatusDisplay } from './QueueStatusDisplay';
import { SessionDropdown } from './SessionDropdown';
import { MobileJobsPanel } from './MobileJobsPanel';
import { DropdownPortal } from './DropdownPortal';
import { IconButton } from './buttons/Button';
import type { ProcessingStatus, AgentType, PatientSession, ModelStatus } from '@/types/medical.types';
import type { MobileJobSummary } from '@/types/mobileJobs.types';

export interface UtilityRowProps {
  // State display
  status: ProcessingStatus;
  isRecording?: boolean;
  modelStatus: ModelStatus;

  // Session management
  patientSessions?: PatientSession[];
  selectedSessionId?: string | null;
  currentSessionId?: string | null;
  checkedSessionIds?: Set<string>;
  persistedSessionIds?: Set<string>;
  onSessionSelect?: (session: PatientSession) => void;
  onRemoveSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  onToggleSessionCheck?: (sessionId: string) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onAgentReprocess?: (agentType: AgentType) => void;

  // Mobile jobs
  mobileJobs?: MobileJobSummary[];
  mobileJobsLoading?: boolean;
  mobileJobsError?: string | null;
  onRefreshMobileJobs?: () => Promise<void> | void;
  onAttachMobileJob?: (job: MobileJobSummary) => Promise<void> | void;
  onDeleteMobileJob?: (job: MobileJobSummary) => Promise<void> | void;
  attachingMobileJobId?: string | null;
  deletingMobileJobId?: string | null;
  attachedMobileJobIds?: Set<string>;

  // Quick Add
  onOpenQuickAdd?: () => void;

  /** Additional className */
  className?: string;
}

export const UtilityRow: React.FC<UtilityRowProps> = memo(({
  status,
  isRecording = false,
  modelStatus,
  patientSessions = [],
  selectedSessionId,
  currentSessionId,
  checkedSessionIds,
  persistedSessionIds,
  onSessionSelect,
  onRemoveSession,
  onClearAllSessions,
  onToggleSessionCheck,
  onResumeRecording,
  onAgentReprocess,
  mobileJobs = [],
  mobileJobsLoading = false,
  mobileJobsError,
  onRefreshMobileJobs,
  onAttachMobileJob,
  onDeleteMobileJob,
  attachingMobileJobId,
  deletingMobileJobId,
  attachedMobileJobIds,
  onOpenQuickAdd,
  className = ''
}) => {
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [mobileJobsOpen, setMobileJobsOpen] = useState(false);
  const [mobileJobsLoaded, setMobileJobsLoaded] = useState(false);

  const sessionButtonRef = useRef<HTMLButtonElement>(null);
  const mobileJobsButtonRef = useRef<HTMLButtonElement>(null);

  const micAvailable = modelStatus.whisperServer?.running;

  // Calculate unchecked (active) sessions
  const uncheckedCount = patientSessions.filter(s => !checkedSessionIds?.has(s.id)).length;

  // Filter unattached mobile jobs
  const unattachedMobileJobs = mobileJobs.filter(job => !job.attached_session_id);

  const handleSessionDropdownToggle = () => {
    setSessionDropdownOpen(!sessionDropdownOpen);
  };

  const handleMobileJobsToggle = () => {
    const next = !mobileJobsOpen;
    setMobileJobsOpen(next);
    if (next && !mobileJobsLoaded) {
      onRefreshMobileJobs?.();
      setMobileJobsLoaded(true);
    }
  };

  return (
    <div className={`
      flex items-center justify-between
      h-8 px-3
      border-b border-neutral-100
      ${className}
    `}>
      {/* Left side: State + Quick Add */}
      <div className="flex items-center gap-2">
        {/* State Chip */}
        <StateChip
          status={status}
          isRecording={isRecording}
          micAvailable={micAvailable}
        />

        {/* Quick Add */}
        {onOpenQuickAdd && (
          <IconButton
            onClick={onOpenQuickAdd}
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            aria-label="Quick Add"
            title="Quick Add patient"
            className="!p-1 !h-6 !w-6 text-neutral-500 hover:text-violet-600 hover:bg-violet-50"
          />
        )}
      </div>

      {/* Right side: Queue, Mobile, Sessions */}
      <div className="flex items-center gap-1">
        {/* Queue Status */}
        <QueueStatusDisplay isCompact={true} />

        {/* Mobile Jobs */}
        <div className="relative">
          <IconButton
            ref={mobileJobsButtonRef}
            data-dropdown-trigger
            onClick={handleMobileJobsToggle}
            icon={<Smartphone size={14} />}
            variant="ghost"
            size="sm"
            className={`
              !p-1 !h-6 !w-6
              text-neutral-500 hover:text-violet-600 hover:bg-violet-50
              ${mobileJobsOpen ? 'bg-violet-50 text-violet-600' : ''}
            `}
            style={{ transitionDuration: `${animation.duration.fast}ms` }}
            aria-label={unattachedMobileJobs.length > 0
              ? `${unattachedMobileJobs.length} mobile dictations awaiting attachment`
              : 'Mobile dictations'}
            title="Mobile dictations"
          />
          {unattachedMobileJobs.length > 0 && (
            <span className="
              absolute -top-1 -right-1
              bg-emerald-500 text-white
              text-[9px] font-bold
              rounded-full
              flex items-center justify-center
              min-w-[14px] h-[14px] px-1
              leading-none
            ">
              {unattachedMobileJobs.length}
            </span>
          )}
        </div>

        {/* Sessions */}
        <div className="relative">
          <IconButton
            ref={sessionButtonRef}
            onClick={handleSessionDropdownToggle}
            icon={<Bell size={14} />}
            variant="ghost"
            size="sm"
            className={`
              !p-1 !h-6 !w-6
              text-neutral-500 hover:text-violet-600 hover:bg-violet-50
              ${sessionDropdownOpen ? 'bg-violet-50 text-violet-600' : ''}
            `}
            style={{ transitionDuration: `${animation.duration.fast}ms` }}
            aria-label={uncheckedCount > 0
              ? `${uncheckedCount} active session${uncheckedCount !== 1 ? 's' : ''}`
              : 'Session history'}
            title={uncheckedCount > 0 ? 'View active sessions' : 'Session history'}
          />
          {uncheckedCount > 0 && (
            <span className="
              absolute -top-1 -right-1
              bg-blue-500 text-white
              text-[9px] font-bold
              rounded-full
              flex items-center justify-center
              min-w-[14px] h-[14px] px-1
              leading-none
            ">
              {uncheckedCount}
            </span>
          )}
        </div>
      </div>

      {/* Mobile Jobs Panel (Portal) */}
      {mobileJobsOpen && (
        <DropdownPortal
          isOpen={mobileJobsOpen}
          onClickOutside={() => setMobileJobsOpen(false)}
        >
          <div
            data-dropdown-menu
            className="z-50"
            style={{
              position: 'fixed',
              top: `${(mobileJobsButtonRef.current?.getBoundingClientRect().bottom || 0) + 8}px`,
              left: `${Math.max(8, (mobileJobsButtonRef.current?.getBoundingClientRect().right || 340) - 360)}px`
            }}
          >
            <MobileJobsPanel
              jobs={mobileJobs}
              isLoading={mobileJobsLoading}
              error={mobileJobsError}
              onRefresh={onRefreshMobileJobs}
              onAttach={(job) => {
                setMobileJobsOpen(false);
                onAttachMobileJob?.(job);
              }}
              onDelete={onDeleteMobileJob}
              attachingJobId={attachingMobileJobId || null}
              deletingJobId={deletingMobileJobId || null}
              attachedJobIds={attachedMobileJobIds}
            />
          </div>
        </DropdownPortal>
      )}

      {/* Session Dropdown */}
      {sessionDropdownOpen && onRemoveSession && onClearAllSessions && (
        <SessionDropdown
          isOpen={sessionDropdownOpen}
          onClose={() => setSessionDropdownOpen(false)}
          triggerRef={sessionButtonRef}
          sessions={patientSessions}
          onRemoveSession={onRemoveSession}
          onClearAllSessions={onClearAllSessions}
          onSessionSelect={onSessionSelect}
          onResumeRecording={onResumeRecording}
          onAgentReprocess={onAgentReprocess}
          selectedSessionId={selectedSessionId}
          activeRecordingSessionId={currentSessionId}
          checkedSessionIds={checkedSessionIds}
          onToggleSessionCheck={onToggleSessionCheck}
          persistedSessionIds={persistedSessionIds}
        />
      )}
    </div>
  );
});

UtilityRow.displayName = 'UtilityRow';

export default UtilityRow;
