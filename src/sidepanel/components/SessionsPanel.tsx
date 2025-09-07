import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp, Trash2, FileText, Clock, CheckCircle, AlertCircle, XCircle, Loader2, Square, Mic, Activity, Zap, MoreHorizontal } from 'lucide-react';
import { PatientSessionHeader } from './PatientSessionHeader';
import type { PatientSession, SessionStatus } from '@/types/medical.types';

interface SessionsPanelProps {
  sessions: PatientSession[];
  onRemoveSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  isCollapsible?: boolean;
}

// Enhanced Report Preview Card Component
const ReportPreviewCard: React.FC<{ session: PatientSession }> = ({ session }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate comprehensive timing metrics
  const calculateTimingMetrics = (session: PatientSession) => {
    const metrics = {
      dictationDuration: null as number | null,
      transcriptionTime: null as number | null,
      agentProcessingTime: null as number | null,
      totalTime: session.processingTime || null
    };

    // Calculate timing phases if timestamps are available
    if (session.recordingStartTime && session.transcriptionStartTime) {
      metrics.dictationDuration = session.transcriptionStartTime - session.recordingStartTime;
    }
    
    if (session.transcriptionStartTime && session.processingStartTime) {
      metrics.transcriptionTime = session.processingStartTime - session.transcriptionStartTime;
    }
    
    if (session.processingStartTime && session.completedTime) {
      metrics.agentProcessingTime = session.completedTime - session.processingStartTime;
    }
    
    if (session.recordingStartTime && session.completedTime) {
      metrics.totalTime = session.completedTime - session.recordingStartTime;
    }

    return metrics;
  };

  // Format time with proper units
  const formatTime = (ms: number | null): string => {
    if (!ms) return '0s';
    const seconds = ms / 1000;
    
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  // Smart truncation at word boundaries
  const getPreviewText = (text: string, maxLength: number = 300): { preview: string; isTruncated: boolean } => {
    if (text.length <= maxLength) {
      return { preview: text, isTruncated: false };
    }
    
    // Find the last complete word before maxLength
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    const smartTruncated = lastSpaceIndex > maxLength * 0.7 ? truncated.substring(0, lastSpaceIndex) : truncated;
    
    return { preview: smartTruncated + '...', isTruncated: true };
  };

  const metrics = calculateTimingMetrics(session);
  const { preview, isTruncated } = getPreviewText(session.results, isExpanded ? session.results.length : 300);
  
  return (
    <div className="mt-2 ml-7 p-3 bg-green-50 rounded-lg text-xs text-gray-700 border border-green-200">
      {/* Header with metrics */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-3 h-3 text-green-600" />
          <span className="font-medium text-green-700">Report Generated</span>
          {metrics.totalTime && (
            <span className="text-gray-500">
              • {formatTime(metrics.totalTime)} total
            </span>
          )}
        </div>
        {isTruncated && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-green-600 hover:text-green-700 flex items-center space-x-1 transition-colors"
          >
            <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
            <MoreHorizontal className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Comprehensive timing breakdown */}
      {(metrics.dictationDuration || metrics.transcriptionTime || metrics.agentProcessingTime) && (
        <div className="mb-2 pb-2 border-b border-green-200">
          <div className="flex items-center justify-center space-x-3 text-xs">
            {metrics.dictationDuration && (
              <div className="flex items-center space-x-1 text-orange-600">
                <Mic className="w-3 h-3" />
                <span>📝 {formatTime(metrics.dictationDuration)}</span>
              </div>
            )}
            {metrics.transcriptionTime && (
              <div className="flex items-center space-x-1 text-blue-600">
                <Activity className="w-3 h-3" />
                <span>🎤 {formatTime(metrics.transcriptionTime)}</span>
              </div>
            )}
            {metrics.agentProcessingTime && (
              <div className="flex items-center space-x-1 text-purple-600">
                <Zap className="w-3 h-3" />
                <span>🤖 {formatTime(metrics.agentProcessingTime)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report preview */}
      <div 
        className={`text-gray-700 leading-relaxed ${isExpanded ? 'whitespace-pre-wrap' : ''}`}
        style={{ 
          maxHeight: isExpanded ? 'none' : '4.5rem',
          overflow: isExpanded ? 'visible' : 'hidden',
          display: isExpanded ? 'block' : '-webkit-box',
          WebkitLineClamp: isExpanded ? 'none' : 3,
          WebkitBoxOrient: 'vertical' as any
        }}
      >
        {preview}
      </div>
    </div>
  );
};

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

  // Get status icon and color for a session
  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'recording':
        return { icon: <Square className="w-3 h-3 text-red-500 animate-pulse fill-current" />, label: 'Recording', color: 'text-red-500' };
      case 'transcribing':
        return { icon: <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />, label: 'Transcribing', color: 'text-blue-500' };
      case 'processing':
        return { icon: <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />, label: 'Processing', color: 'text-purple-500' };
      case 'completed':
        return { icon: <CheckCircle className="w-3 h-3 text-green-500" />, label: 'Completed', color: 'text-green-500' };
      case 'error':
        return { icon: <AlertCircle className="w-3 h-3 text-red-500" />, label: 'Error', color: 'text-red-500' };
      case 'cancelled':
        return { icon: <XCircle className="w-3 h-3 text-gray-500" />, label: 'Cancelled', color: 'text-gray-500' };
      default:
        return { icon: <Clock className="w-3 h-3 text-gray-400" />, label: 'Unknown', color: 'text-gray-400' };
    }
  };

  // Group sessions by status for better organization
  const completedSessions = sessions.filter(session => session.status === 'completed');
  const activeSessions = sessions.filter(session => ['recording', 'transcribing', 'processing'].includes(session.status));
  const errorSessions = sessions.filter(session => ['error', 'cancelled'].includes(session.status));

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
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} • 
                {activeSessions.length > 0 && <span className="text-blue-600 font-medium"> {activeSessions.length} active</span>}
                {completedSessions.length > 0 && <span className="text-green-600"> • {completedSessions.length} completed</span>}
                {errorSessions.length > 0 && <span className="text-red-600"> • {errorSessions.length} failed</span>}
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
          {/* Active Sessions (recording, transcribing, processing) */}
          {activeSessions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 flex items-center space-x-2">
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                <span>Active Sessions ({activeSessions.length})</span>
              </h4>
              {activeSessions.map((session) => {
                const statusInfo = getStatusIcon(session.status);
                return (
                  <div
                    key={session.id}
                    className={`mb-3 ${onSessionSelect ? 'cursor-pointer' : ''}`}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-blue-900 truncate">
                                {session.patient.name}
                              </span>
                              <div className="flex items-center space-x-1">
                                {statusInfo.icon}
                                <span className={`text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-blue-700 mt-1">
                              <span>ID: {session.patient.id}</span>
                              <span>•</span>
                              <span>{session.agentType}</span>
                              <span>•</span>
                              <span>{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSession(session.id);
                          }}
                          className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Remove session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Show transcription preview if available */}
                      {session.transcription && (
                        <div className="mt-2 p-2 bg-white rounded text-xs text-gray-700 border border-blue-100">
                          <div className="flex items-center space-x-2 mb-1">
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span className="font-medium">Transcription:</span>
                          </div>
                          <p className="line-clamp-2">
                            {session.transcription.substring(0, 120)}
                            {session.transcription.length > 120 ? '...' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error/Cancelled Sessions */}
          {errorSessions.length > 0 && (
            <div>
              {activeSessions.length > 0 && <hr className="my-4 border-gray-200" />}
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 flex items-center space-x-2">
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span>Failed Sessions ({errorSessions.length})</span>
              </h4>
              {errorSessions.map((session) => {
                const statusInfo = getStatusIcon(session.status);
                return (
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
                    
                    {/* Show error information */}
                    {session.errors && session.errors.length > 0 && (
                      <div className="mt-2 ml-7 p-2 bg-red-50 rounded text-xs text-gray-700">
                        <div className="flex items-center space-x-2 mb-1">
                          {statusInfo.icon}
                          <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                        <p className="text-red-700">
                          {session.errors[0]}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div>
              {(activeSessions.length > 0 || errorSessions.length > 0) && (
                <hr className="my-4 border-gray-200" />
              )}
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Completed Sessions ({completedSessions.length})</span>
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
                    <ReportPreviewCard session={session} />
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