/**
 * PatientContextHeader - Display current patient information during recording/processing
 * Shows patient demographics and current agent/status in a clean header bar
 */

import React, { memo, useCallback, useEffect } from 'react';
import { User, FileText, ExternalLink } from 'lucide-react';
import type { PatientInfo, AgentType, ProcessingStatus } from '@/types/medical.types';
import { StatusBadge, StateIndicator } from './status';
import type { ProcessingState } from '@/utils/stateColors';

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

const mapToProcessingState = (processingStatus?: ProcessingStatus, isRecording?: boolean): ProcessingState => {
  if (isRecording) {
    return 'recording';
  }

  switch (processingStatus) {
    case 'transcribing':
      return 'transcribing';
    case 'processing':
      return 'processing';
    case 'complete':
      return 'completed';
    default:
      return 'processing';
  }
};

const getStatusColors = (processingStatus?: ProcessingStatus, isRecording?: boolean): { bg: string; text: string; accent: string } => {
  if (isRecording) {
    return { bg: 'bg-rose-50', text: 'text-rose-700', accent: 'text-rose-500' };
  }

  switch (processingStatus) {
    case 'transcribing':
      return { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'text-blue-500' };
    case 'processing':
      return { bg: 'bg-purple-50', text: 'text-purple-700', accent: 'text-purple-500' };
    case 'complete':
      return { bg: 'bg-slate-50', text: 'text-slate-700', accent: 'text-slate-500' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', accent: 'text-slate-500' };
  }
};

export const PatientContextHeader: React.FC<PatientContextHeaderProps> = memo(({
  patientInfo,
  agentType,
  processingStatus,
  isRecording = false,
  isViewingCompletedSession = false
}) => {
  const state = mapToProcessingState(processingStatus, isRecording);
  const colors = getStatusColors(processingStatus, isRecording);
  const agentDisplayName = AGENT_DISPLAY_NAMES[agentType] || agentType;

  // Handle navigation to patient in EMR
  const handleGoToPatient = useCallback(async () => {
    if (!isViewingCompletedSession || processingStatus !== 'complete') return;

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
  }, [isViewingCompletedSession, processingStatus, patientInfo.id, patientInfo.name]);

  // Keyboard shortcut: Shift+G for "Go to patient"
  useEffect(() => {
    if (!isViewingCompletedSession || processingStatus !== 'complete') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Shift+G without other modifiers
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleGoToPatient();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isViewingCompletedSession, processingStatus, handleGoToPatient]);

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
    <div className={`${colors.bg} ${colors.text} px-4 py-3 border-b border-slate-200`}>
      <div className="flex items-center justify-between">
        {/* Left: Patient Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <User className={`w-5 h-5 flex-shrink-0 ${colors.accent}`} />
          <div className="flex flex-col min-w-0">
            {/* Patient Name */}
            <div className="font-semibold text-base truncate">
              {patientInfo.name}
            </div>
            {/* Patient Details */}
            <div className="flex items-center space-x-2 text-sm opacity-75">
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
          <div className="hidden sm:flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{agentDisplayName}</span>
          </div>

          {/* Status Badge or Go To Patient Button */}
          {isViewingCompletedSession && processingStatus === 'complete' ? (
            <button
              type="button"
              onClick={handleGoToPatient}
              className="
                p-2 rounded-full
                bg-slate-700 hover:bg-slate-800
                text-white
                shadow-sm hover:shadow-md
                transition-colors
              "
              title="Go to patient (⇧G)"
              aria-label="Go to patient"
            >
              <ExternalLink size={16} />
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full">
              {/* Animated pulsing dot */}
              {(isRecording || processingStatus === 'transcribing' || processingStatus === 'processing') && (
                <StateIndicator state={state} size="sm" withTooltip={false} />
              )}
              <StatusBadge
                state={state}
                size="sm"
                showIcon={!(isRecording || processingStatus === 'transcribing' || processingStatus === 'processing')}
                label={processingStatus === 'processing' ? 'AI Processing' : undefined}
                className="bg-transparent border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PatientContextHeader.displayName = 'PatientContextHeader';
