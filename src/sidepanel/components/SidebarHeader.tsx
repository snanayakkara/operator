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

import React, { useState, useRef } from 'react';
import { Settings, ChevronRight, Bell } from 'lucide-react';
import type { ProcessingStatus, AgentType, ModelStatus, PatientSession } from '@/types/medical.types';
import type { StorageStats } from '@/types/persistence.types';
import { StateChip } from './StateChip';
import { DevicePopover } from './DevicePopover';
import { SessionDropdown } from './SessionDropdown';
import { QueueStatusDisplay } from './QueueStatusDisplay';
import { StorageIconButton } from './StorageIconButton';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { formatDeviceSummary } from '@/utils/deviceNameUtils';

export interface SidebarHeaderProps {
  // Status
  status: ProcessingStatus;
  isRecording?: boolean;
  currentAgent?: AgentType | null;

  // Model/Services
  modelStatus: ModelStatus;
  onRefreshServices: () => Promise<void>;

  // Session management
  patientSessions?: PatientSession[];
  onRemoveSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  selectedSessionId?: string | null;
  currentSessionId?: string | null;
  checkedSessionIds?: Set<string>; // All checked sessions (manual + auto-checked)
  onToggleSessionCheck?: (sessionId: string) => void; // Toggle session check state
  persistedSessionIds?: Set<string>; // IDs of sessions stored in local storage

  // Storage management
  storageStats?: StorageStats | null;
  onStorageClick?: () => void;

  // Actions (none currently needed - settings opens extension options page)
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  status,
  isRecording = false,
  currentAgent: _currentAgent,
  modelStatus,
  onRefreshServices: _onRefreshServices,
  patientSessions = [],
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  onResumeRecording,
  selectedSessionId,
  currentSessionId,
  checkedSessionIds,
  onToggleSessionCheck,
  persistedSessionIds,
  storageStats,
  onStorageClick
}) => {
  const [devicePopoverOpen, setDevicePopoverOpen] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const deviceButtonRef = useRef<HTMLButtonElement>(null);
  const sessionButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleSettingsClick = () => {
    // Open Chrome extension options page
    chrome.runtime.openOptionsPage();
  };

  // Calculate unchecked (active) sessions
  const uncheckedCount = patientSessions.filter(s => !checkedSessionIds?.has(s.id)).length;

  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-200">
      {/* Row 1: Primary header (≤ 40px) */}
      <div className="flex items-center justify-between h-10 px-2.5">
        {/* Left: App name + State chip */}
        <div className="flex items-center gap-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 flex-shrink-0">
            operator
          </h1>
          <StateChip
            status={status}
            isRecording={isRecording}
            micAvailable={micAvailable}
            className="flex-shrink-0"
          />
        </div>

        {/* Right: Icon actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Queue Status */}
          <QueueStatusDisplay isCompact={true} />

          {/* Session Notifications */}
          {uncheckedCount > 0 && (
            <button
              ref={sessionButtonRef}
              onClick={handleSessionDropdownToggle}
              className="
                relative p-1.5 rounded hover:bg-gray-100 transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
              aria-label={`${uncheckedCount} active session${uncheckedCount !== 1 ? 's' : ''}`}
              title="View active sessions"
            >
              <Bell className="w-4 h-4 text-gray-600" />
              {uncheckedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {uncheckedCount > 9 ? '9+' : uncheckedCount}
                </span>
              )}
            </button>
          )}

          {/* Storage Indicator */}
          {storageStats && storageStats.sessionCount > 0 && (
            <StorageIconButton
              stats={storageStats}
              onClick={onStorageClick}
            />
          )}

          {/* Settings */}
          <button
            onClick={handleSettingsClick}
            className="
              p-1.5 rounded hover:bg-gray-100 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
            aria-label="Open settings"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Row 2: Device summary (collapsible) */}
      {hasPermission && (
        <div className="px-2.5 pb-2">
          <button
            ref={deviceButtonRef}
            onClick={handleDevicePopoverToggle}
            data-dropdown-trigger
            className="
              w-full flex items-center justify-between gap-2
              px-2 py-1.5 rounded-md text-xs
              text-gray-600 hover:bg-gray-50 hover:text-gray-900
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
            aria-label="Change audio devices"
            aria-expanded={devicePopoverOpen}
          >
            <span className="truncate">{deviceSummary}</span>
            <ChevronRight
              className={`w-3 h-3 flex-shrink-0 transition-transform ${
                devicePopoverOpen ? 'rotate-90' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {/* Device Popover */}
      <DevicePopover
        isOpen={devicePopoverOpen}
        onClose={() => setDevicePopoverOpen(false)}
        triggerRef={deviceButtonRef}
      />

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
              selectedSessionId={selectedSessionId}
          activeRecordingSessionId={currentSessionId}
          checkedSessionIds={checkedSessionIds}
          onToggleSessionCheck={onToggleSessionCheck}
          persistedSessionIds={persistedSessionIds}
        />
      )}
    </header>
  );
};
