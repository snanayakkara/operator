/**
 * PatientContextHeader - Display current patient information during recording/processing
 * Shows patient demographics and current agent/status in a clean header bar
 */

import React, { memo } from 'react';
import { User, FileText, Mic, Loader2, Zap, CheckCircle } from 'lucide-react';
import type { PatientInfo, AgentType, ProcessingStatus } from '@/types/medical.types';

interface PatientContextHeaderProps {
  patientInfo: PatientInfo;
  agentType: AgentType;
  processingStatus?: ProcessingStatus;
  isRecording?: boolean;
  isViewingCompletedSession?: boolean;
}

const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  'tavi': 'TAVI Workup',
  'tavi-workup': 'TAVI Workup',
  'angiogram-pci': 'Angiogram/PCI Report',
  'quick-letter': 'Quick Letter',
  'consultation': 'Consultation Report',
  'investigation-summary': 'Investigation Summary',
  'background': 'Background Summary',
  'medication': 'Medication Review',
  'bloods': 'Blood Results',
  'imaging': 'Imaging Review',
  'patient-education': 'Patient Education',
  'batch-ai-review': 'Batch AI Review',
  'ai-medical-review': 'AI Medical Review',
  'aus-medical-review': 'Australian Medical Review',
  'mteer': 'MitraClip/TEER',
  'tteer': 'TEER',
  'pfo-closure': 'PFO Closure',
  'asd-closure': 'ASD Closure',
  'pvl-plug': 'PVL Plug',
  'bypass-graft': 'Bypass Graft',
  'right-heart-cath': 'Right Heart Catheterization',
  'pre-op-plan': 'Pre-Op Plan',
  'ohif-viewer': 'OHIF Viewer',
  'enhancement': 'Enhancement',
  'transcription': 'Transcription',
  'generation': 'Generation'
};

const getStatusInfo = (processingStatus?: ProcessingStatus, isRecording?: boolean) => {
  if (isRecording) {
    return {
      icon: <Mic className="w-4 h-4" />,
      label: 'Recording',
      bgColor: 'bg-gradient-to-r from-red-500 to-rose-600',
      textColor: 'text-white',
      dotColor: 'bg-red-400'
    };
  }

  switch (processingStatus) {
    case 'transcribing':
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        label: 'Transcribing',
        bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-600',
        textColor: 'text-white',
        dotColor: 'bg-blue-400'
      };
    case 'processing':
      return {
        icon: <Zap className="w-4 h-4" />,
        label: 'AI Processing',
        bgColor: 'bg-gradient-to-r from-purple-500 to-violet-600',
        textColor: 'text-white',
        dotColor: 'bg-purple-400'
      };
    case 'complete':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Complete',
        bgColor: 'bg-gradient-to-r from-emerald-500 to-teal-600',
        textColor: 'text-white',
        dotColor: 'bg-emerald-400'
      };
    default:
      return {
        icon: <FileText className="w-4 h-4" />,
        label: 'Ready',
        bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-600',
        textColor: 'text-white',
        dotColor: 'bg-blue-400'
      };
  }
};

export const PatientContextHeader: React.FC<PatientContextHeaderProps> = memo(({
  patientInfo,
  agentType,
  processingStatus,
  isRecording = false,
  isViewingCompletedSession = false
}) => {
  const statusInfo = getStatusInfo(processingStatus, isRecording);
  const agentDisplayName = AGENT_DISPLAY_NAMES[agentType] || agentType;

  // Format age from DOB if available
  const calculateAge = (dob: string): string => {
    if (!dob) return '';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age}y`;
    } catch {
      return '';
    }
  };

  const ageDisplay = patientInfo.age || calculateAge(patientInfo.dob);

  return (
    <div className={`${statusInfo.bgColor} ${statusInfo.textColor} px-4 py-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        {/* Left: Patient Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <User className="w-5 h-5 flex-shrink-0 opacity-90" />
          <div className="flex flex-col min-w-0">
            {/* Patient Name */}
            <div className="font-semibold text-base truncate">
              {patientInfo.name}
            </div>
            {/* Patient Details */}
            <div className="flex items-center space-x-2 text-sm opacity-90">
              <span className="truncate">ID: {patientInfo.id}</span>
              {patientInfo.dob && (
                <>
                  <span>•</span>
                  <span className="truncate">DOB: {patientInfo.dob}</span>
                </>
              )}
              {ageDisplay && (
                <>
                  <span>•</span>
                  <span>{ageDisplay}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Agent Type & Status */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Agent Type */}
          <div className="hidden sm:flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium whitespace-nowrap">{agentDisplayName}</span>
          </div>

          {/* Status Badge or Go To Patient Button */}
          {isViewingCompletedSession && processingStatus === 'complete' ? (
            <button
              onClick={async () => {
                try {
                  await chrome.runtime.sendMessage({
                    type: 'NAVIGATE_TO_PATIENT',
                    fileNumber: patientInfo.id,
                    patientName: patientInfo.name
                  });
                  console.log('✅ Navigate to patient requested:', patientInfo.id);
                } catch (error) {
                  console.error('❌ Failed to navigate to patient:', error);
                }
              }}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2 rounded-full font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <User className="w-4 h-4" />
              <span className="text-sm whitespace-nowrap">Go To Patient</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {/* Animated pulsing dot */}
              {(isRecording || processingStatus === 'transcribing' || processingStatus === 'processing') && (
                <div className="relative">
                  <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor} animate-pulse`}></div>
                </div>
              )}
              {statusInfo.icon}
              <span className="text-sm font-semibold whitespace-nowrap">{statusInfo.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PatientContextHeader.displayName = 'PatientContextHeader';
