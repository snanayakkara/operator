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

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, User, Plus, Smartphone, Bell } from 'lucide-react';
import { animation, colors, radius, zIndex } from '@/utils/designTokens';
import { CommandBar } from './CommandBar';
import { ActionsDrawer } from './ActionsDrawer';
import { FavouritesRow } from './FavouritesRow';
import { StateChip } from './StateChip';
import { QueueStatusDisplay } from './QueueStatusDisplay';
import { SessionDropdown } from './SessionDropdown';
import { MobileJobsPanel } from './MobileJobsPanel';
import { DropdownPortal } from './DropdownPortal';
import { IconButton } from './buttons/Button';
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
  const [commandQuery, setCommandQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [mobileJobsOpen, setMobileJobsOpen] = useState(false);
  const [mobileJobsLoaded, setMobileJobsLoaded] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  
  const sessionButtonRef = useRef<HTMLButtonElement>(null);
  const mobileJobsButtonRef = useRef<HTMLButtonElement>(null);
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef<ProcessingStatus>(status);

  // Calculate unchecked (active) sessions
  const uncheckedCount = patientSessions.filter(s => !checkedSessionIds?.has(s.id)).length;
  
  // Filter unattached mobile jobs
  const unattachedMobileJobs = mobileJobs.filter(job => !job.attached_session_id);
  
  const micAvailable = modelStatus.whisperServer?.running;

  // Handle status visibility logic
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    
    // Clear any existing timeout
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
    
    // If actively processing, show status
    const isActiveStatus = ['recording', 'transcribing', 'classifying', 'processing', 'formatting', 'enhancing', 'extracting-patient', 'cancelling'].includes(status);
    
    if (isActiveStatus) {
      setShowStatus(true);
    } else if (status === 'complete') {
      // Just completed - show for 10 seconds
      setShowStatus(true);
      completeTimeoutRef.current = setTimeout(() => {
        setShowStatus(false);
      }, 10000);
    } else if (status === 'idle' && prevStatus === 'complete') {
      // Transitioning from complete to idle - keep showing for remaining time
      // (timeout already set from complete transition)
    } else if (status === 'error' || status === 'cancelled') {
      // Show error/cancelled briefly then hide
      setShowStatus(true);
      completeTimeoutRef.current = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
    } else {
      // For idle and other states, hide status
      setShowStatus(false);
    }
    
    return () => {
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
      }
    };
  }, [status]);

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

  // Format patient name to show first and last name
  const formatPatientName = (name: string | undefined): string => {
    if (!name) return 'Patient';
    const titles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'];
    const words = name.split(' ').filter(w => w.length > 0);
    
    // Skip title if present
    let startIndex = 0;
    if (titles.includes(words[0]?.replace(/\./, '')) && words.length > 1) {
      startIndex = 1;
    }
    
    // Get first and last name
    const firstName = words[startIndex] || 'Patient';
    const lastName = words.length > startIndex + 1 ? words[words.length - 1] : '';
    
    return lastName ? `${firstName} ${lastName}` : firstName;
  };

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
        {/* Consolidated Header Row */}
        <div className="flex items-center justify-between px-3 py-2">
          {/* Left side: Logo/Status + Patient Name */}
          <div className="flex items-center gap-2">
            {/* Logo / Title OR Status */}
            <AnimatePresence mode="wait">
              {showStatus ? (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <StateChip
                    status={status}
                    isRecording={isRecording}
                    micAvailable={micAvailable}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: colors.primary.subtle }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: colors.primary.DEFAULT }}>
                      O
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-neutral-900">
                    operator
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            
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
                  {formatPatientName(patientInfo.name)}
                </span>
              </div>
            )}
          </div>

          {/* Right side: All icons in one row */}
          <div className="flex items-center gap-1">
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

        {/* Command Bar */}
        <div className="px-3 py-2">
          <CommandBar
            isOpen={isCommandOpen}
            onOpen={() => setIsCommandOpen(true)}
            onClose={() => {
              setIsCommandOpen(false);
              setCommandQuery('');
            }}
            activateOnHover
            onQueryChange={setCommandQuery}
            onActionSelect={handleActionSelect}
            placeholder="Type or press ⌘K..."
          />
        </div>

        {/* Actions Drawer (slides down from command bar) */}
        {isCommandOpen && commandQuery.trim() === '' && (
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

      {/* Mobile Jobs Panel (Portal) */}
      {mobileJobsOpen && (
        <DropdownPortal
          isOpen={mobileJobsOpen}
          onClickOutside={() => setMobileJobsOpen(false)}
        >
          <div
            data-dropdown-menu
            style={{
              position: 'fixed',
              top: `${(mobileJobsButtonRef.current?.getBoundingClientRect().bottom || 0) + 8}px`,
              left: `${Math.max(8, (mobileJobsButtonRef.current?.getBoundingClientRect().right || 340) - 360)}px`,
              zIndex: zIndex.dropdown
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
