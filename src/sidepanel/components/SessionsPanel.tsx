import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp, Trash2, FileText } from 'lucide-react';
import { PatientSessionHeader } from './PatientSessionHeader';
import type { PatientSession } from '@/types/medical.types';

interface SessionsPanelProps {
  sessions: PatientSession[];
  onRemoveSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  isCollapsible?: boolean;
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({
  sessions,
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  isCollapsible = true
}) => {
  const [isExpanded, setIsExpanded] = useState(sessions.length > 0);

  if (sessions.length === 0) {
    return null;
  }

  const completedSessions = sessions.filter(session => session.completed);
  const inProgressSessions = sessions.filter(session => !session.completed);

  const handleToggleExpanded = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSessionClick = (session: PatientSession) => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div 
        className={`p-4 border-b border-gray-200 ${isCollapsible ? 'cursor-pointer' : ''}`}
        onClick={handleToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-gray-900 font-medium text-sm">Patient Sessions</h3>
              <p className="text-gray-600 text-xs">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} • {completedSessions.length} completed
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {sessions.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAllSessions();
                }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear all sessions"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            {isCollapsible && (
              <div className="p-1">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session List */}
      {isExpanded && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {inProgressSessions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                In Progress
              </h4>
              {inProgressSessions.map((session) => (
                <div
                  key={session.id}
                  className={`mb-3 ${onSessionSelect ? 'cursor-pointer' : ''}`}
                  onClick={() => handleSessionClick(session)}
                >
                  <PatientSessionHeader
                    session={session}
                    onRemoveSession={onRemoveSession}
                    showRemoveButton={true}
                    isCompact={true}
                  />
                  
                  {/* Show preview of transcription if available */}
                  {session.transcription && (
                    <div className="mt-2 ml-7 p-2 bg-gray-50 rounded text-xs text-gray-700">
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="w-3 h-3" />
                        <span className="font-medium">Transcription Preview:</span>
                      </div>
                      <p className="line-clamp-2">
                        {session.transcription.substring(0, 120)}
                        {session.transcription.length > 120 ? '...' : ''}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {completedSessions.length > 0 && (
            <div>
              {inProgressSessions.length > 0 && (
                <hr className="my-4 border-gray-200" />
              )}
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                Completed
              </h4>
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className={`mb-3 ${onSessionSelect ? 'cursor-pointer' : ''}`}
                  onClick={() => handleSessionClick(session)}
                >
                  <PatientSessionHeader
                    session={session}
                    onRemoveSession={onRemoveSession}
                    showRemoveButton={true}
                    isCompact={true}
                  />
                  
                  {/* Show summary of results if available */}
                  {session.results && (
                    <div className="mt-2 ml-7 p-2 bg-green-50 rounded text-xs text-gray-700">
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="w-3 h-3 text-green-600" />
                        <span className="font-medium text-green-700">Report Generated</span>
                        {session.processingTime && (
                          <span className="text-gray-500">
                            • {(session.processingTime / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2">
                        {session.results.substring(0, 120)}
                        {session.results.length > 120 ? '...' : ''}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {isExpanded && sessions.length > 3 && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            💡 <strong>Tip:</strong> Click on any session to review details, or use the trash icon to remove individual sessions
          </p>
        </div>
      )}
    </div>
  );
};