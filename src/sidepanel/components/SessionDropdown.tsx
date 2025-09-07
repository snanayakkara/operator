import React, { memo } from 'react';
import { Users, Clock, Trash2 } from 'lucide-react';
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
  if (!isOpen || sessions.length === 0) {
    return null;
  }

  const completedSessions = sessions.filter(session => session.completed);
  const inProgressSessions = sessions.filter(session => !session.completed);

  const handleSessionClick = (session: PatientSession) => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
    onClose();
  };

  const handleRemoveSession = (sessionId: string) => {
    onRemoveSession(sessionId);
  };

  const handleClearAll = () => {
    onClearAllSessions();
    onClose();
  };

  // Calculate position based on trigger element or use provided position
  const getDropdownStyle = (): React.CSSProperties => {
    if (position) {
      return {
        position: 'absolute',
        top: position.top,
        left: position.left,
        right: position.right,
        width: '320px',
        maxHeight: '384px',
        zIndex: 999999
      };
    }

    // Fallback positioning if triggerRef is available
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      return {
        position: 'absolute',
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        width: '320px',
        maxHeight: '384px',
        zIndex: 999999
      };
    }

    // Default positioning
    return {
      position: 'fixed',
      top: '60px',
      right: '16px',
      width: '320px',
      maxHeight: '384px',
      zIndex: 999999
    };
  };

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
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} • {completedSessions.length} completed
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
        {inProgressSessions.length > 0 && (
          <div className="p-2">
            <div className="flex items-center space-x-1 mb-2 px-2">
              <Clock className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">In Progress</span>
            </div>
            <div className="space-y-2">
              {inProgressSessions.map((session) => (
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
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <div className={`p-2 ${inProgressSessions.length > 0 ? 'border-t border-gray-100' : ''}`}>
            {inProgressSessions.length > 0 && (
              <div className="flex items-center space-x-1 mb-2 px-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0" />
                <span className="text-xs font-medium text-emerald-700">Completed</span>
              </div>
            )}
            <div className="space-y-2">
              {completedSessions.slice(0, 5).map((session) => (
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
            </div>
            {completedSessions.length > 5 && (
              <div className="text-xs text-gray-500 text-center mt-2 px-2">
                And {completedSessions.length - 5} more completed session{completedSessions.length - 5 !== 1 ? 's' : ''}...
              </div>
            )}
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
});

SessionDropdown.displayName = 'SessionDropdown';