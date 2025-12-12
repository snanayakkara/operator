/**
 * AppHeader Component
 *
 * New unified header for the Operator side panel.
 * Replaces the footer-based QuickActionsGrouped with a command-bar-first design.
 *
 * Structure:
 * - Mini header row (logo, patient indicator, settings gear)
 * - Utility row (state chip, quick add, queue, mobile, sessions)
 * - Command bar (search with inline dropdown)
 * - Favourites row (4 quick-access actions) OR ActionsDrawer (when searching)
 *
 * This component manages its own state for the command bar and settings drawer,
 * but delegates action execution to the parent via callbacks.
 */

import React, { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, User } from 'lucide-react';
import { animation, colors, radius } from '@/utils/designTokens';
import { CommandBar } from './CommandBar';
import { ActionsDrawer } from './ActionsDrawer';
import { FavouritesRow } from './FavouritesRow';
import { UtilityRow } from './UtilityRow';
import { QuickSettingsDrawer } from './QuickSettingsDrawer';
import type { UnifiedAction } from '@/config/unifiedActionsConfig';
import type { PatientInfo, ProcessingStatus, AgentType, PatientSession, ModelStatus } from '@/types/medical.types';
import type { MobileJobSummary } from '@/types/mobileJobs.types';

export interface AppHeaderProps {
  // Action callbacks
  /** Callback when action is selected with dictate mode */
  onDictate: (action: UnifiedAction) => void;
  /** Callback when action is selected with type mode */
  onType: (action: UnifiedAction) => void;
  /** Callback when action is selected with vision mode */
  onVision: (action: UnifiedAction) => void;
  /** Callback when action is clicked (single-action) */
  onClick: (action: UnifiedAction) => void;
  /** Callback when Wrap Up is clicked */
  onWrapUp: () => void;
  /** Callback to open full settings page */
  onOpenFullSettings: () => void;

  // State display
  /** Current processing status */
  status: ProcessingStatus;
  /** Whether currently recording */
  isRecording?: boolean;
  /** Model/service status */
  modelStatus: ModelStatus;

  // Patient info
  /** Current patient info (if available) */
  patientInfo?: PatientInfo | null;

  // Session management
  /** All patient sessions */
  patientSessions?: PatientSession[];
  /** Currently selected session ID */
  selectedSessionId?: string | null;
  /** Currently recording session ID */
  currentSessionId?: string | null;
  /** Set of checked session IDs */
  checkedSessionIds?: Set<string>;
  /** Set of persisted session IDs */
  persistedSessionIds?: Set<string>;
  /** Callback when session is selected */
  onSessionSelect?: (session: PatientSession) => void;
  /** Callback to remove a session */
  onRemoveSession?: (sessionId: string) => void;
  /** Callback to clear all sessions */
  onClearAllSessions?: () => void;
  /** Callback to toggle session check */
  onToggleSessionCheck?: (sessionId: string) => void;
  /** Callback to resume recording */
  onResumeRecording?: (session: PatientSession) => void;
  /** Callback for agent reprocessing */
  onAgentReprocess?: (agentType: AgentType) => void;

  // Mobile jobs
  /** Mobile job summaries */
  mobileJobs?: MobileJobSummary[];
  /** Whether mobile jobs are loading */
  mobileJobsLoading?: boolean;
  /** Mobile jobs error message */
  mobileJobsError?: string | null;
  /** Callback to refresh mobile jobs */
  onRefreshMobileJobs?: () => Promise<void> | void;
  /** Callback to attach a mobile job */
  onAttachMobileJob?: (job: MobileJobSummary) => Promise<void> | void;
  /** Callback to delete a mobile job */
  onDeleteMobileJob?: (job: MobileJobSummary) => Promise<void> | void;
  /** ID of job being attached */
  attachingMobileJobId?: string | null;
  /** ID of job being deleted */
  deletingMobileJobId?: string | null;
  /** Set of attached job IDs */
  attachedMobileJobIds?: Set<string>;

  // Quick Add
  /** Callback to open Quick Add */
  onOpenQuickAdd?: () => void;

  // Loading/settings
  /** Currently loading action IDs */
  loadingActions?: Set<string>;
  /** Current dark mode state */
  isDarkMode?: boolean;
  /** Callback to toggle dark mode */
  onToggleDarkMode?: () => void;

  /** Additional className */
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = memo(({
  // Action callbacks
  onDictate,
  onType,
  onVision,
  onClick,
  onWrapUp,
  onOpenFullSettings,

  // State display
  status,
  isRecording = false,
  modelStatus,

  // Patient info
  patientInfo,

  // Session management
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

  // Mobile jobs
  mobileJobs = [],
  mobileJobsLoading = false,
  mobileJobsError,
  onRefreshMobileJobs,
  onAttachMobileJob,
  onDeleteMobileJob,
  attachingMobileJobId,
  deletingMobileJobId,
  attachedMobileJobIds,

  // Quick Add
  onOpenQuickAdd,

  // Loading/settings
  loadingActions = new Set<string>(),
  isDarkMode = false,
  onToggleDarkMode = () => {},

  className = ''
}) => {
  // Local state for command bar and settings
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Handle action selection from command bar dropdown
  const handleActionSelect = useCallback((action: UnifiedAction, mode?: 'dictate' | 'type' | 'vision') => {
    setIsCommandOpen(false);

    // Route to appropriate handler based on mode or action configuration
    if (mode === 'dictate' || (action.modes.includes('dictate') && action.modes.length === 1)) {
      onDictate(action);
    } else if (mode === 'type') {
      onType(action);
    } else if (mode === 'vision') {
      onVision(action);
    } else if (action.modes.includes('click')) {
      onClick(action);
    } else {
      // Default to dictate for multi-mode actions
      onDictate(action);
    }
  }, [onDictate, onType, onVision, onClick]);

  return (
    <>
      <div className={`bg-white border-b border-neutral-200 ${className}`}>
        {/* Mini Header Row */}
        <div className="flex items-center justify-between px-3 py-2">
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: colors.primary.subtle }}
            >
              <span className="text-[11px] font-bold" style={{ color: colors.primary.DEFAULT }}>
                O
              </span>
            </div>
            <span className="text-[13px] font-semibold text-neutral-900">
              Operator
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Patient indicator (if available) */}
            {patientInfo && (
              <div className="
                flex items-center gap-1.5
                px-2 py-1
                bg-emerald-50 border border-emerald-200
                rounded-md
              "
                style={{ borderRadius: radius.sm }}
              >
                <User size={14} className="text-emerald-600" />
                <span className="text-[11px] font-medium text-emerald-700 max-w-[120px] truncate">
                  {(() => {
                    const name = patientInfo.name || 'Patient';
                    const titles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'];
                    const words = name.split(' ');
                    // Skip first word if it's a title (with or without period)
                    const firstName = titles.includes(words[0]?.replace(/\./, '')) && words.length > 1
                      ? words[1]
                      : words[0];
                    return firstName || 'Patient';
                  })()}
                </span>
              </div>
            )}

            {/* Settings gear */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="
                p-1.5 rounded-md
                text-neutral-500 hover:text-neutral-700
                hover:bg-neutral-100
                transition-colors
              "
              style={{
                borderRadius: radius.sm,
                transitionDuration: `${animation.duration.fast}ms`
              }}
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Utility Row */}
        <UtilityRow
          status={status}
          isRecording={isRecording}
          modelStatus={modelStatus}
          patientSessions={patientSessions}
          selectedSessionId={selectedSessionId}
          currentSessionId={currentSessionId}
          checkedSessionIds={checkedSessionIds}
          persistedSessionIds={persistedSessionIds}
          onSessionSelect={onSessionSelect}
          onRemoveSession={onRemoveSession}
          onClearAllSessions={onClearAllSessions}
          onToggleSessionCheck={onToggleSessionCheck}
          onResumeRecording={onResumeRecording}
          onAgentReprocess={onAgentReprocess}
          mobileJobs={mobileJobs}
          mobileJobsLoading={mobileJobsLoading}
          mobileJobsError={mobileJobsError}
          onRefreshMobileJobs={onRefreshMobileJobs}
          onAttachMobileJob={onAttachMobileJob}
          onDeleteMobileJob={onDeleteMobileJob}
          attachingMobileJobId={attachingMobileJobId}
          deletingMobileJobId={deletingMobileJobId}
          attachedMobileJobIds={attachedMobileJobIds}
          onOpenQuickAdd={onOpenQuickAdd}
        />

        {/* Command Bar */}
        <div className="px-3 py-2">
          <CommandBar
            isOpen={isCommandOpen}
            onOpen={() => setIsCommandOpen(true)}
            onClose={() => setIsCommandOpen(false)}
            onActionSelect={handleActionSelect}
            placeholder="Type or press ⌘K..."
          />
        </div>

        {/* Actions Drawer (slides down from command bar) */}
        {isCommandOpen && (
          <div className="px-3 pb-2">
            <ActionsDrawer
              isOpen={isCommandOpen}
              onDictate={onDictate}
              onType={onType}
              onVision={onVision}
              onClick={onClick}
              loadingActions={loadingActions}
            />
          </div>
        )}

        {/* Favourites Row (only visible when drawer is closed) */}
        {!isCommandOpen && (
          <motion.div
            className="px-3 pb-2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animation.duration.fast / 1000 }}
          >
            <FavouritesRow
              onDictate={onDictate}
              onType={onType}
              onVision={onVision}
              onWrapUp={onWrapUp}
              loadingActions={loadingActions}
            />
          </motion.div>
        )}
      </div>

      {/* Quick Settings Drawer */}
      <QuickSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onOpenFullSettings={onOpenFullSettings}
      />
    </>
  );
});

AppHeader.displayName = 'AppHeader';

export default AppHeader;
