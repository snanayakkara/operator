import React from 'react';
import { User, Clock, FileText, X, Phone, CreditCard } from 'lucide-react';
import type { PatientSession } from '@/types/medical.types';

interface PatientSessionHeaderProps {
  session: PatientSession;
  onRemoveSession?: (sessionId: string) => void;
  showRemoveButton?: boolean;
  isCompact?: boolean;
}

export const PatientSessionHeader: React.FC<PatientSessionHeaderProps> = ({
  session,
  onRemoveSession,
  showRemoveButton = false,
  isCompact = false
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getAgentIcon = (agentType: string) => {
    // Return appropriate icon based on agent type
    return <FileText className="w-4 h-4" />;
  };

  if (isCompact) {
    // Compact version for use in lists
    return (
      <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
        <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-blue-900 truncate">
              {session.patient.name}
            </span>
            <span className="text-xs text-blue-600 font-medium">
              {session.agentName || session.agentType}
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-1 text-xs text-blue-700">
            <span>ID: {session.patient.id}</span>
            <span>•</span>
            <span>{formatTime(session.timestamp)}</span>
          </div>
        </div>
        {showRemoveButton && onRemoveSession && (
          <button
            onClick={() => onRemoveSession(session.id)}
            className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Remove session"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Full version for use as main header
  return (
    <div className="glass rounded-xl p-4 border-l-4 border-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <User className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-blue-900">
                {session.patient.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                {getAgentIcon(session.agentType)}
                <span className="text-sm text-blue-600 font-medium">
                  {session.agentName || session.agentType}
                </span>
              </div>
            </div>
            
            {/* Patient Details */}
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-3">
              <div>
                <span className="font-medium">ID:</span> {session.patient.id}
              </div>
              <div>
                <span className="font-medium">Age:</span> {session.patient.age}
              </div>
              <div>
                <span className="font-medium">DOB:</span> {session.patient.dob}
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(session.timestamp)}</span>
              </div>
            </div>

            {/* Optional Additional Details */}
            {(session.patient.phone || session.patient.medicare) && (
              <div className="text-xs text-gray-600 space-y-1">
                {session.patient.phone && (
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {session.patient.phone}</div>
                )}
                {session.patient.medicare && (
                  <div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Medicare: {session.patient.medicare}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {session.completed && (
            <div className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
              ✓ Complete
            </div>
          )}
          {showRemoveButton && onRemoveSession && (
            <button
              onClick={() => onRemoveSession(session.id)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove session"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
