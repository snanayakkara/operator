import React from 'react';
import { 
  Mic, 
  Brain, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Volume2,
  X,
  Trash2
} from 'lucide-react';
import type { ProcessingStatus, AgentType } from '@/types/medical.types';

interface StatusIndicatorProps {
  status: ProcessingStatus;
  currentAgent?: AgentType | null;
  onCompleteRecording?: () => void;
  onCancelProcessing?: () => void;
  isRecording?: boolean;
}

const STATUS_CONFIGS = {
  idle: {
    icon: Mic,
    label: 'Ready',
    description: 'Ready to record',
    color: 'text-gray-500',
    bgColor: 'bg-white/10',
    animate: false
  },
  recording: {
    icon: Volume2,
    label: 'Recording',
    description: 'Listening to your voice...',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    animate: true
  },
  transcribing: {
    icon: Loader2,
    label: 'Transcribing',
    description: 'Converting speech to text...',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    animate: true
  },
  classifying: {
    icon: Brain,
    label: 'Analyzing',
    description: 'Determining the best medical agent...',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    animate: true
  },
  processing: {
    icon: Zap,
    label: 'Processing',
    description: 'Generating medical report...',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    animate: true
  },
  enhancing: {
    icon: Brain,
    label: 'Enhancing',
    description: 'Refining medical content...',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    animate: true
  },
  complete: {
    icon: CheckCircle,
    label: 'Complete',
    description: 'Medical report generated successfully',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    animate: false
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    description: 'Something went wrong. Please try again.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    animate: false
  },
  cancelled: {
    icon: X,
    label: 'Cancelled',
    description: 'Operation cancelled by user',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    animate: false
  },
  cancelling: {
    icon: Loader2,
    label: 'Cancelling',
    description: 'Cancelling operation...',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    animate: true
  }
};

const AGENT_DISPLAY_NAMES = {
  'tavi': 'TAVI Agent',
  'angiogram-pci': 'Angiogram/PCI Agent',
  'quick-letter': 'Quick Letter Agent',
  'consultation': 'Consultation Agent',
  'investigation-summary': 'Investigation Summary Agent',
  'background': 'Background Agent',
  'medication': 'Medication Agent',
  'mteer': 'MTEER Agent',
  'tteer': 'TTEER Agent',
  'pfo-closure': 'PFO Closure Agent',
  'asd-closure': 'ASD Closure Agent',
  'right-heart-cath': 'RHC Agent',
  'pvl-plug': 'PVL Plug Agent',
  'bypass-graft': 'Bypass Graft Agent',
  'tavi-workup': 'TAVI Workup Agent',
  'enhancement': 'Enhancement Agent',
  'transcription': 'Transcription Agent',
  'generation': 'Generation Agent',
  'ai-medical-review': 'AI Medical Review'
} as const;

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  currentAgent,
  onCompleteRecording,
  onCancelProcessing,
  isRecording = false
}) => {
  const config = STATUS_CONFIGS[status];
  const Icon = config.icon;
  
  const getDetailedDescription = () => {
    if (status === 'processing' && currentAgent) {
      // Special handling for AI Review to avoid redundancy since badge won't show
      if (currentAgent === 'ai-medical-review') {
        return 'Analyzing clinical data against Australian guidelines...';
      }
      const agentName = AGENT_DISPLAY_NAMES[currentAgent as keyof typeof AGENT_DISPLAY_NAMES] || currentAgent.toUpperCase();
      return `${agentName} is analyzing your input...`;
    }
    return config.description;
  };

  const getProgressPercentage = () => {
    const progressMap = {
      idle: 0,
      recording: 20,
      transcribing: 40,
      classifying: 60,
      processing: 80,
      enhancing: 90,
      complete: 100,
      error: 0,
      cancelled: 0,
      cancelling: 0
    };
    return progressMap[status];
  };

  return (
    <div className={`glass rounded-2xl p-4 ${config.bgColor} border-white/20`}>
      <div className="flex items-center space-x-3">
        {/* Status Icon */}
        <div className="relative">
          <Icon 
            className={`w-6 h-6 ${config.color} ${
              config.animate ? 'animate-pulse' : ''
            }`} 
          />
          
          {/* Animated ring for active states */}
          {config.animate && (
            <div className={`absolute inset-0 rounded-full border-2 ${config.color.replace('text-', 'border-')} animate-ping opacity-30`} />
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className={`font-medium text-sm ${config.color}`}>
              {config.label}
            </h3>
            
            {/* Agent indicator - hide for AI Review to avoid redundancy */}
            {currentAgent && status === 'processing' && currentAgent !== 'ai-medical-review' && (
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {AGENT_DISPLAY_NAMES[currentAgent as keyof typeof AGENT_DISPLAY_NAMES] || currentAgent.toUpperCase()}
              </span>
            )}
          </div>
          
          <p className="text-gray-600 text-xs mt-0.5 break-words">
            {getDetailedDescription()}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex-shrink-0 flex items-center space-x-2">
          {/* Complete Recording Button - Show during recording */}
          {isRecording && onCompleteRecording && (
            <button
              onClick={onCompleteRecording}
              className="glass-button bg-emerald-500/10 border border-emerald-200 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-300 hover:text-emerald-800 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center space-x-1.5 hover:shadow-md hover:scale-105"
              title="Stop recording and process audio into medical report"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Complete</span>
            </button>
          )}
          
          {/* Cancel Button - Show during active operations */}
          {(isRecording || status === 'transcribing' || status === 'processing' || status === 'cancelling') && onCancelProcessing && (
            <button
              onClick={onCancelProcessing}
              disabled={status === 'cancelling'}
              className={`glass-button px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center space-x-1 ${
                status === 'cancelling' 
                  ? 'bg-orange-500/10 border border-orange-200 text-orange-600 cursor-not-allowed' 
                  : 'bg-red-500/10 border border-red-200 text-red-600 hover:bg-red-500/20 hover:border-red-300 hover:text-red-700 hover:shadow-md hover:scale-105'
              }`}
              title={
                isRecording 
                  ? "Stop recording and discard audio without processing"
                  : status === 'transcribing' 
                  ? "Cancel audio transcription and discard"
                  : "Cancel AI report generation and discard"
              }
            >
              {status === 'cancelling' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isRecording ? (
                <Trash2 className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              <span>
                {status === 'cancelling' ? 'Cancelling...' : 'Cancel'}
              </span>
            </button>
          )}
          
          {/* Loading spinner for non-interactive states */}
          {config.animate && !isRecording && status !== 'transcribing' && status !== 'processing' && status !== 'cancelling' && (
            <div className="flex-shrink-0">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status !== 'idle' && status !== 'error' && (
        <div className="mt-3">
          <div className="w-full bg-white/10 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-500 ease-out ${
                config.color.replace('text-', 'bg-')
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing Steps Indicator */}
      {(status === 'processing' || status === 'enhancing') && (
        <div className="mt-3 flex items-center justify-center space-x-2">
          {['Analyzing', 'Structuring', 'Formatting'].map((step, index) => (
            <div 
              key={step}
              className="flex items-center space-x-1"
            >
              <div 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === 0 ? config.color.replace('text-', 'bg-') : 'bg-white/20'
                }`}
              />
              <span className="text-gray-500 text-xs">{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error Recovery */}
      {status === 'error' && (
        <div className="mt-3">
          <button 
            onClick={() => window.location.reload()}
            className="text-xs text-gray-600 hover:text-gray-800 underline"
          >
            Refresh to try again
          </button>
        </div>
      )}
    </div>
  );
};