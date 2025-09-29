import React, { memo, useMemo, useCallback, useEffect, useState } from 'react';
import { Users, Clock, Trash2, ChevronDown } from 'lucide-react';
import { PatientSessionHeader } from './PatientSessionHeader';
import { DropdownPortal } from './DropdownPortal';
import type { PatientSession } from '@/types/medical.types';

interface SessionDropdownProps {
  sessions: PatientSession[];
  onRemoveSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
  position?: { top: number; left?: number; right?: number };
}

// Performance constants
const INITIAL_VISIBLE_SESSIONS = 3; // Show only first 3 sessions in each category initially
const MAX_SESSIONS_PER_CATEGORY = 8; // Maximum sessions to show even when expanded

export const SessionDropdown: React.FC<SessionDropdownProps> = memo(({
  sessions,
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  isOpen,
  onClose,
  triggerRef,
  position
}) => {
  // Local state for lazy loading
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllInProgress, setShowAllInProgress] = useState(false);
  const [showAllErrored, setShowAllErrored] = useState(false);

  // Optimized filtered lists with better caching and lazy loading
  const sessionCategories = useMemo(() => {
    const perfStart = performance.now();
    console.time('📊 Session Categorization Performance');
    console.log('📊 Starting session categorization...', { totalSessions: sessions.length });

    const completed: PatientSession[] = [];
    const inProgress: PatientSession[] = [];
    const errored: PatientSession[] = [];

    // Single pass through sessions for better performance
    sessions.forEach(session => {
      switch (session.status) {
        case 'completed':
          completed.push(session);
          break;
        case 'recording':
        case 'transcribing':
        case 'processing':
          inProgress.push(session);
          break;
        case 'error':
        case 'cancelled':
          errored.push(session);
          break;
      }
    });

    const perfEnd = performance.now();
    console.timeEnd('📊 Session Categorization Performance');
    console.log('📊 Session categorization completed', {
      duration: `${(perfEnd - perfStart).toFixed(2)}ms`,
      completed: completed.length,
      inProgress: inProgress.length,
      errored: errored.length
    });

    return { completed, inProgress, errored };
  }, [sessions]);

  // Apply lazy loading limits
  const visibleSessions = useMemo(() => {
    const perfStart = performance.now();
    console.time('📋 Visible Sessions Calculation Performance');

    const completedLimit = showAllCompleted ? MAX_SESSIONS_PER_CATEGORY : INITIAL_VISIBLE_SESSIONS;
    const inProgressLimit = showAllInProgress ? MAX_SESSIONS_PER_CATEGORY : INITIAL_VISIBLE_SESSIONS;
    const erroredLimit = showAllErrored ? MAX_SESSIONS_PER_CATEGORY : INITIAL_VISIBLE_SESSIONS;

    const result = {
      completed: sessionCategories.completed.slice(0, completedLimit),
      inProgress: sessionCategories.inProgress.slice(0, inProgressLimit),
      errored: sessionCategories.errored.slice(0, erroredLimit),
      hasMoreCompleted: sessionCategories.completed.length > completedLimit,
      hasMoreInProgress: sessionCategories.inProgress.length > inProgressLimit,
      hasMoreErrored: sessionCategories.errored.length > erroredLimit
    };

    const perfEnd = performance.now();
    console.timeEnd('📋 Visible Sessions Calculation Performance');
    console.log('📋 Visible sessions calculation completed', {
      duration: `${(perfEnd - perfStart).toFixed(2)}ms`,
      visibleCompleted: result.completed.length,
      visibleInProgress: result.inProgress.length,
      visibleErrored: result.errored.length
    });

    return result;
  }, [sessionCategories, showAllCompleted, showAllInProgress, showAllErrored]);

  const handleSessionClick = (session: PatientSession) => {
    console.log('🖱️ Session clicked in dropdown', {
      sessionId: session.id,
      patientName: session.patient.name,
      status: session.status,
      hasTranscription: !!session.transcription,
      hasResults: !!session.results,
      transcriptionLength: session.transcription?.length || 0,
      resultsLength: session.results?.length || 0,
      agentType: session.agentType,
      onSessionSelectExists: !!onSessionSelect
    });

    if (onSessionSelect) {
      console.log('🚀 Calling onSessionSelect...');
      onSessionSelect(session);
      console.log('✅ onSessionSelect called successfully');
    } else {
      console.warn('⚠️ onSessionSelect callback not provided!');
    }

    console.log('🔒 Closing session dropdown...');
    onClose();
  };

  const handleRemoveSession = (sessionId: string) => {
    onRemoveSession(sessionId);
  };

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
          setComputedPos({
            top: Math.round(rect.bottom + 8),
            right: Math.round(window.innerWidth - rect.right)
          });
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
        maxHeight: '384px',
        zIndex: 999999
      };
    }
    return {
      position: 'fixed',
      top: '60px',
      right: '16px',
      width: '320px',
      maxHeight: '384px',
      zIndex: 999999
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
      <div className="max-h-80 overflow-y-auto">
        {/* In Progress Sessions */}
        {sessionCategories.inProgress.length > 0 && (
          <div className="p-2">
            <div className="flex items-center space-x-1 mb-2 px-2">
              <Clock className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">In Progress</span>
            </div>
            <div className="space-y-2">
              {visibleSessions.inProgress.map((session) => (
                <div
                  key={session.id}
                  className="cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={(e) => {
                    console.log('🖱️ Raw in-progress session clicked!', {
                      sessionId: session.id,
                      patientName: session.patient.name
                    });
                    e.preventDefault();
                    e.stopPropagation();
                    handleSessionClick(session);
                  }}
                >
                  <PatientSessionHeader
                    session={session}
                    onRemoveSession={handleRemoveSession}
                    showRemoveButton={true}
                    isCompact={true}
                  />
                </div>
              ))}
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
              {visibleSessions.errored.map((session) => (
                <div
                  key={session.id}
                  className="cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => handleSessionClick(session)}
                >
                  <PatientSessionHeader
                    session={session}
                    onRemoveSession={handleRemoveSession}
                    showRemoveButton={true}
                    isCompact={true}
                  />
                </div>
              ))}
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
              {visibleSessions.completed.map((session) => (
                <div
                  key={session.id}
                  className="cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={(e) => {
                    console.log('🖱️ Raw completed session div clicked!', {
                      sessionId: session.id,
                      patientName: session.patient.name,
                      event: e.type,
                      target: e.target,
                      currentTarget: e.currentTarget
                    });
                    e.preventDefault();
                    e.stopPropagation();
                    handleSessionClick(session);
                  }}
                  onMouseDown={(_e) => {
                    console.log('🖱️ Completed session mousedown!', session.id);
                  }}
                >
                  <PatientSessionHeader
                    session={session}
                    onRemoveSession={handleRemoveSession}
                    showRemoveButton={true}
                    isCompact={true}
                  />
                </div>
              ))}
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
