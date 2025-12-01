/**
 * SidebarHeader Component
 *
 * Two-tier header layout optimized for narrow sidebar:
 * - Row 1 (primary): App name + state chip (left) | icon actions (right)
 * - Row 2 (secondary): Device summary button → opens popover
 *
 * Constraints:
 * - Row 1 height ≤ 40px
 * - Row 2 is single line, collapses if not needed
 * - No text truncation in header
 * - Touch targets ≥ 24×24px
 * - Icons 14-16px with 8px gaps
 */

import React, { useRef, useState } from 'react';
import { Settings, ChevronRight, Bell, Smartphone, Plus } from 'lucide-react';
import type { ProcessingStatus, AgentType, ModelStatus, PatientSession } from '@/types/medical.types';
import type { StorageStats } from '@/types/persistence.types';
import { StateChip } from './StateChip';
import { DevicePopover } from './DevicePopover';
import { SessionDropdown } from './SessionDropdown';
import { QueueStatusDisplay } from './QueueStatusDisplay';
import { PipelineStrip, PipelineStageId } from './ui/PipelineStrip';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { formatDeviceSummary } from '@/utils/deviceNameUtils';
import Button from './buttons/Button';
import { IconButton } from './buttons/Button';
import { DropdownPortal } from './DropdownPortal';
import { MobileJobsPanel } from './MobileJobsPanel';
import type { MobileJobSummary } from '@/types/mobileJobs.types';

export interface SidebarHeaderProps {
  // Status
  status: ProcessingStatus;
  isRecording?: boolean;
  currentAgent?: AgentType | null;

  // Pipeline stage for PipelineStrip
  pipelineStage?: PipelineStageId;

  // Model/Services
  modelStatus: ModelStatus;
  onRefreshServices: () => Promise<void>;

  // Session management
  patientSessions?: PatientSession[];
  onRemoveSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onAgentReprocess?: (agentType: AgentType) => void; // Callback for reprocessing failed sessions
  selectedSessionId?: string | null;
  currentSessionId?: string | null;
  checkedSessionIds?: Set<string>; // All checked sessions (manual + auto-checked)
  onToggleSessionCheck?: (sessionId: string) => void; // Toggle session check state
  persistedSessionIds?: Set<string>; // IDs of sessions stored in local storage

  // Storage management
  storageStats?: StorageStats | null;
  onDeleteAllChecked?: () => Promise<void>;
  onDeleteOldSessions?: (daysOld: number) => Promise<void>;

  // Actions (none currently needed - settings opens extension options page)
  onTitleClick?: () => void;

  // Mobile jobs integration
  mobileJobs?: MobileJobSummary[];
  mobileJobsLoading?: boolean;
  mobileJobsError?: string | null;
  onRefreshMobileJobs?: () => Promise<void> | void;
  onAttachMobileJob?: (job: MobileJobSummary) => Promise<void> | void;
  onDeleteMobileJob?: (job: MobileJobSummary) => Promise<void> | void;
  attachingMobileJobId?: string | null;
  deletingMobileJobId?: string | null;
  attachedMobileJobIds?: Set<string>;
  onOpenQuickAdd?: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  status,
  isRecording = false,
  currentAgent: _currentAgent,
  pipelineStage,
  modelStatus,
  onRefreshServices: _onRefreshServices,
  patientSessions = [],
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  onResumeRecording,
  onAgentReprocess,
  selectedSessionId,
  currentSessionId,
  checkedSessionIds,
  onToggleSessionCheck,
  persistedSessionIds,
  storageStats,
  onDeleteAllChecked,
  onDeleteOldSessions,
  onTitleClick,
  mobileJobs = [],
  mobileJobsLoading = false,
  mobileJobsError,
  onRefreshMobileJobs,
  onAttachMobileJob,
  onDeleteMobileJob,
  attachingMobileJobId,
  deletingMobileJobId,
  attachedMobileJobIds,
  onOpenQuickAdd
}) => {
  const [devicePopoverOpen, setDevicePopoverOpen] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [mobileJobsOpen, setMobileJobsOpen] = useState(false);
  const [mobileJobsLoaded, setMobileJobsLoaded] = useState(false);
  const deviceButtonRef = useRef<HTMLButtonElement>(null);
  const sessionButtonRef = useRef<HTMLButtonElement>(null);
  const mobileJobsButtonRef = useRef<HTMLButtonElement>(null);

  const {
    getCurrentMicrophoneLabel,
    getCurrentSpeakerLabel,
    hasPermission
  } = useAudioDevices();

  const micAvailable = modelStatus.whisperServer?.running && hasPermission;

  // Format device summary
  const deviceSummary = hasPermission
    ? formatDeviceSummary(getCurrentMicrophoneLabel(), getCurrentSpeakerLabel())
    : 'Audio access required';

  const handleDevicePopoverToggle = () => {
    setDevicePopoverOpen(!devicePopoverOpen);

    // Log telemetry
    console.log('[SidebarHeader] Device popover toggled', {
      isOpen: !devicePopoverOpen,
      timestamp: Date.now()
    });
  };

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

  const handleSettingsClick = () => {
    // Open Chrome extension options page
    chrome.runtime.openOptionsPage();
  };

  // Calculate unchecked (active) sessions
  const uncheckedCount = patientSessions.filter(s => !checkedSessionIds?.has(s.id)).length;

  const unattachedMobileJobs = mobileJobs.filter(job => !job.attached_session_id);

  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-200">
      {/* Row 1: Primary header (≤ 40px) */}
      <div className="flex items-center justify-between h-10 px-2.5">
        {/* Left: App name + State chip */}
        <div className="flex items-center gap-1 min-w-0">
          {onTitleClick ? (
            <Button
              type="button"
              onClick={onTitleClick}
              variant="ghost"
              size="sm"
              className="text-sm font-semibold text-gray-900 flex-shrink-0 !h-auto !px-0 hover:bg-transparent"
              title="Return to home"
              aria-label="Return to home"
            >
              operator
            </Button>
          ) : (
            <h1 className="text-sm font-semibold text-gray-900 flex-shrink-0">
              operator
            </h1>
          )}
          <StateChip
            status={status}
            isRecording={isRecording}
            micAvailable={micAvailable}
            className="flex-shrink-0"
          />
        </div>

        {/* Right: Icon actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenQuickAdd && (
            <IconButton
              onClick={onOpenQuickAdd}
              variant="ghost"
              size="sm"
              icon={<Plus />}
              aria-label="Quick Add"
              title="Quick Add"
              className="text-gray-600 hover:text-gray-900"
            />
          )}

          {/* Queue Status */}
          <QueueStatusDisplay isCompact={true} />

          {/* Mobile Jobs */}
          <div className="relative">
            <IconButton
              ref={mobileJobsButtonRef}
              data-dropdown-trigger
              onClick={handleMobileJobsToggle}
              icon={<Smartphone />}
              variant="ghost"
              size="sm"
              className={`text-gray-600 !w-auto !h-auto p-1.5 ${mobileJobsOpen ? 'bg-gray-100' : ''}`}
              aria-label={unattachedMobileJobs.length > 0 ? `${unattachedMobileJobs.length} mobile dictations awaiting attachment` : 'Mobile dictations'}
              title="Mobile dictations"
            />
            {unattachedMobileJobs.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10 px-1.5 min-w-[18px] h-4 leading-tight">
                {unattachedMobileJobs.length}
              </span>
            )}
          </div>

          {/* Session Manager */}
          <div className="relative">
            <IconButton
              ref={sessionButtonRef}
              onClick={handleSessionDropdownToggle}
              icon={<Bell />}
              variant="ghost"
              size="sm"
              className="text-gray-600 !w-auto !h-auto p-1.5"
              aria-label={uncheckedCount > 0 ? `${uncheckedCount} active session${uncheckedCount !== 1 ? 's' : ''}` : 'Session history'}
              title={uncheckedCount > 0 ? 'View active sessions' : 'Session history'}
            />
            {uncheckedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 min-w-[18px] h-4 leading-tight">
                {uncheckedCount}
              </span>
            )}
          </div>

          {/* Settings */}
          <IconButton
            onClick={handleSettingsClick}
            icon={<Settings />}
            variant="ghost"
            size="sm"
            className="text-gray-600 !w-auto !h-auto p-1.5"
            aria-label="Open settings"
            title="Settings"
          />
        </div>
      </div>

      {/* Row 2: Device summary (collapsible) */}
      {hasPermission && (
        <div className="px-2.5 pb-2">
          <Button
            ref={deviceButtonRef}
            onClick={handleDevicePopoverToggle}
            data-dropdown-trigger
            variant="ghost"
            size="sm"
            fullWidth
            endIcon={<ChevronRight className={`transition-transform ${devicePopoverOpen ? 'rotate-90' : ''}`} />}
            className="
              !justify-between !h-auto px-2 py-1.5 text-xs
              text-gray-600 hover:bg-gray-50 hover:text-gray-900
            "
            aria-label="Change audio devices"
            aria-expanded={devicePopoverOpen}
          >
            <span className="truncate">{deviceSummary}</span>
          </Button>
        </div>
      )}

      {/* Pipeline Strip - shows current workflow stage */}
      <PipelineStrip
        activeStage={pipelineStage}
        className="border-t border-gray-100"
      />

      {/* Device Popover */}
      <DevicePopover
        isOpen={devicePopoverOpen}
        onClose={() => setDevicePopoverOpen(false)}
        triggerRef={deviceButtonRef}
      />

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
                setMobileJobsOpen(false); // Close dropdown to expose workflow menu
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
          storageStats={storageStats}
          onDeleteAllChecked={onDeleteAllChecked}
          onDeleteOldSessions={onDeleteOldSessions}
        />
      )}
    </header>
  );
};
