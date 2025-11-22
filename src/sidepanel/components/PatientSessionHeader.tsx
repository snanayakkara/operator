import React, { memo } from 'react';
import { User, Clock, FileText, X, Phone, CreditCard } from 'lucide-react';
import type { PatientSession } from '@/types/medical.types';
import { Button, IconButton } from './buttons';
import { StatusBadge } from './status';
import type { ProcessingState } from '@/utils/stateColors';

interface PatientSessionHeaderProps {
  session: PatientSession;
  onRemoveSession?: (sessionId: string) => void;
  onSessionClick?: (session: PatientSession) => void;
  showRemoveButton?: boolean;
  isCompact?: boolean;
}

export const PatientSessionHeader: React.FC<PatientSessionHeaderProps> = memo(({
  session,
  onRemoveSession,
  onSessionClick,
  showRemoveButton = false,
  isCompact = false
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getAgentIcon = (_agentType: string) => {
    // Return appropriate icon based on agent type
    return <FileText className="w-4 h-4" />;
  };

  const mapStatusToState = (status: string): ProcessingState => {
    switch (status) {
      case 'recording':
        return 'recording';
      case 'transcribing':
        return 'transcribing';
      case 'processing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'error':
        return 'error';
      case 'cancelled':
        return 'error'; // Use error state for cancelled
      default:
        return 'processing'; // Default fallback
    }
  };

  const getStatusBorderColor = (status: string): string => {
    switch (status) {
      case 'recording':
        return 'border-red-200';
      case 'transcribing':
        return 'border-blue-200';
      case 'processing':
        return 'border-purple-200';
      case 'completed':
        return 'border-green-200';
      case 'error':
        return 'border-red-200';
      case 'cancelled':
        return 'border-gray-200';
      default:
        return 'border-gray-200';
    }
  };

  const getStatusBgColor = (status: string): string => {
    switch (status) {
      case 'recording':
        return 'bg-red-50';
      case 'transcribing':
        return 'bg-blue-50';
      case 'processing':
        return 'bg-purple-50';
      case 'completed':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'cancelled':
        return 'bg-gray-50';
      default:
        return 'bg-gray-50';
    }
  };

  if (isCompact) {
    const state = mapStatusToState(session.status);
    const borderColor = getStatusBorderColor(session.status);
    const bgColor = getStatusBgColor(session.status);

    // Compact version for use in lists with enhanced status indicators
    return (
      <div className={`flex items-center space-x-3 p-2 ${bgColor} rounded-lg border ${borderColor}`}>
        <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold truncate text-gray-900">
                {session.patient.name}
              </span>
              <span className="text-xs text-gray-600 font-medium">
                {session.agentName || session.agentType}
              </span>
            </div>
            <StatusBadge
              state={state}
              size="sm"
              label={session.status === 'cancelled' ? 'Cancelled' : undefined}
            />
          </div>
          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
            <span>ID: {session.patient.id}</span>
            <span>•</span>
            <span>{formatTime(session.timestamp)}</span>
          </div>
        </div>
        {showRemoveButton && onRemoveSession && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation(); // Prevent session selection when removing
              onRemoveSession(session.id);
            }}
            icon={X}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
            title="Remove session"
            aria-label="Remove session"
          />
        )}
      </div>
    );
  }

  // Full version for use as main header
  return (
    <div 
      className={`glass rounded-xl p-4 border-l-4 border-blue-500 ${
        onSessionClick ? 'cursor-pointer hover:bg-gray-50/50 transition-colors' : ''
      }`}
      onClick={() => onSessionClick?.(session)}
    >
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
            <StatusBadge
              state="completed"
              size="sm"
              label="Complete"
            />
          )}
          {showRemoveButton && onRemoveSession && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation(); // Prevent session selection when removing
                onRemoveSession(session.id);
              }}
              icon={X}
              variant="ghost"
              size="md"
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
              title="Remove session"
              aria-label="Remove session"
            />
          )}
        </div>
      </div>
    </div>
  );
});
