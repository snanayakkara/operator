import React, { memo } from 'react';
import { User, Clock, FileText, X, Phone, CreditCard, Mic, Loader2, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import type { PatientSession } from '@/types/medical.types';

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

  const getAgentIcon = (agentType: string) => {
    // Return appropriate icon based on agent type
    return <FileText className="w-4 h-4" />;
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'recording':
        return {
          icon: <Mic className="w-3 h-3 text-red-500" />,
          label: 'Recording',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      case 'transcribing':
        return {
          icon: <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />,
          label: 'Transcribing',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      case 'processing':
        return {
          icon: <Zap className="w-3 h-3 text-purple-500" />,
          label: 'Processing',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-3 h-3 text-green-500" />,
          label: 'Completed',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3 text-red-500" />,
          label: 'Error',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      case 'cancelled':
        return {
          icon: <X className="w-3 h-3 text-gray-500" />,
          label: 'Cancelled',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200'
        };
      default:
        return {
          icon: <Clock className="w-3 h-3 text-gray-500" />,
          label: 'Unknown',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200'
        };
    }
  };

  if (isCompact) {
    const statusInfo = getStatusIndicator(session.status);
    
    // Compact version for use in lists with enhanced status indicators
    return (
      <div className={`flex items-center space-x-3 p-2 ${statusInfo.bgColor} rounded-lg border ${statusInfo.borderColor}`}>
        <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1">
              <span className={`text-sm font-semibold truncate ${statusInfo.textColor}`}>
                {session.patient.name}
              </span>
              <span className="text-xs text-gray-600 font-medium">
                {session.agentName || session.agentType}
              </span>
            </div>
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
            <span>ID: {session.patient.id}</span>
            <span>•</span>
            <span>{formatTime(session.timestamp)}</span>
          </div>
        </div>
        {showRemoveButton && onRemoveSession && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent session selection when removing
              onRemoveSession(session.id);
            }}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
            <div className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
              ✓ Complete
            </div>
          )}
          {showRemoveButton && onRemoveSession && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent session selection when removing
                onRemoveSession(session.id);
              }}
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
});
