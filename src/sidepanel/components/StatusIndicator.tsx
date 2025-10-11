import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Volume2 as _Volume2,
  X,
  Trash2 as _Trash2,
  Wifi as _Wifi,
  WifiOff as _WifiOff,
  RefreshCw,
  ListRestart,
  Server,
  Settings,
  AlertTriangle,
  Bell,
  Square as _Square,
  BarChart3,
  Sparkles,
  Users as _Users,
  Target as _Target,
  TrendingUp as _TrendingUp
} from 'lucide-react';
import type { ProcessingStatus, AgentType, ModelStatus, WhisperServerStatus as _WhisperServerStatus, PatientSession } from '@/types/medical.types';
import { useDropdownPosition } from '../hooks/useDropdownPosition';
import { DropdownPortal } from './DropdownPortal';
import { RecordPanel } from './RecordPanel';
import { ThemeToggle } from './ThemeToggle';
import { SessionDropdown } from './SessionDropdown';
import { QueueStatusDisplay } from './QueueStatusDisplay';
import { ToastService } from '@/services/ToastService';
import { AudioDeviceSelector as _AudioDeviceSelector } from './AudioDeviceSelector';
import { CompactAudioDeviceDisplay } from './CompactAudioDeviceDisplay';
import { AgentFactory } from '@/services/AgentFactory';

interface StatusIndicatorProps {
  status: ProcessingStatus;
  currentAgent?: AgentType | null;
  onCompleteRecording?: () => void;
  onCancelProcessing?: () => void;
  isRecording?: boolean;
  // AI Services integration
  modelStatus: ModelStatus;
  onRefreshServices: () => Promise<void>;
  // Workflow selection integration
  onWorkflowSelect: (workflowId: AgentType) => void;
  activeWorkflow: AgentType | null;
  voiceActivityLevel?: number;
  recordingTime?: number;
  // Patient extraction state
  isExtractingPatients?: boolean;
  // Session management integration
  patientSessions?: PatientSession[];
  onRemoveSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  onSessionSelect?: (session: PatientSession) => void;
  onResumeRecording?: (session: PatientSession) => void;
  onMarkSessionComplete?: (session: PatientSession) => void;
  selectedSessionId?: string | null;
  currentSessionId?: string | null;
  // Metrics dashboard
  onShowMetrics?: () => void;
  // New recording functionality
  onNewRecording?: () => void;
  showNewRecording?: boolean;
}

const STATUS_CONFIGS = {
  idle: {
    icon: Mic,
    label: 'operator',
    description: 'Ready to record',
    color: 'text-ink-secondary',
    bgColor: 'bg-surface-tertiary',
    animate: false
  },
  'extracting-patient': {
    icon: Loader2,
    label: 'Preparing',
    description: 'Extracting patient context from EMR...',
    color: 'text-accent-violet',
    bgColor: 'bg-surface-tertiary',
    animate: true
  },
  recording: {
    icon: Mic,
    label: 'Recording',
    description: 'Listening to your voice...',
    color: 'text-accent-red',
    bgColor: 'bg-surface-tertiary',
    animate: false
  },
  transcribing: {
    icon: Loader2,
    label: 'Transcribing',
    description: 'Converting speech to text...',
    color: 'text-accent-violet',
    bgColor: 'bg-surface-tertiary',
    animate: true
  },
  classifying: {
    icon: Brain,
    label: 'Analyzing',
    description: 'Determining the best medical agent...',
    color: 'text-accent-violet',
    bgColor: 'bg-surface-tertiary',
    animate: true
  },
  processing: {
    icon: Zap,
    label: 'Processing',
    description: 'Generating medical report...',
    color: 'text-accent-violet',
    bgColor: 'bg-surface-tertiary',
    animate: true
  },
  enhancing: {
    icon: Brain,
    label: 'Enhancing',
    description: 'Refining medical content...',
    color: 'text-accent-violet',
    bgColor: 'bg-surface-tertiary',
    animate: true
  },
  complete: {
    icon: CheckCircle,
    label: 'Complete',
    description: 'Medical report generated successfully',
    color: 'text-accent-emerald',
    bgColor: 'bg-surface-tertiary',
    animate: false
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    description: 'Something went wrong. Click any workflow to restart.',
    color: 'text-accent-red',
    bgColor: 'bg-surface-tertiary',
    animate: false
  },
  cancelled: {
    icon: X,
    label: 'Cancelled',
    description: 'Recording cancelled. Click any workflow to start again.',
    color: 'text-ink-secondary',
    bgColor: 'bg-surface-tertiary',
    animate: false
  },
  cancelling: {
    icon: Loader2,
    label: 'Cancelling',
    description: 'Cancelling operation...',
    color: 'text-accent-amber',
    bgColor: 'bg-surface-tertiary',
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
  onCompleteRecording: _onCompleteRecording,
  onCancelProcessing,
  isRecording = false,
  modelStatus,
  onRefreshServices,
  onWorkflowSelect,
  activeWorkflow,
  voiceActivityLevel = 0,
  recordingTime = 0,
  isExtractingPatients = false,
  patientSessions = [],
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  onResumeRecording,
  onMarkSessionComplete,
  selectedSessionId,
  currentSessionId,
  onShowMetrics,
  onNewRecording,
  showNewRecording = false
}) => {
  const config = STATUS_CONFIGS[status];
  const Icon = isExtractingPatients ? Loader2 : config.icon;
  
  // AI Services dropdown state
  const [showServicesDetails, setShowServicesDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Intelligent Features State
  const [phase4Stats, setPhase4Stats] = useState<any>(null);
  
  // Session notification state
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [isOpeningSessions, setIsOpeningSessions] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  const SERVICE_DROPDOWN_WIDTH = 360;
  const SERVICE_DROPDOWN_MAX_HEIGHT = 520;

  const { triggerRef, position } = useDropdownPosition({
    isOpen: showServicesDetails,
    alignment: 'right',
    offset: { x: 0, y: 8 },
    maxHeight: SERVICE_DROPDOWN_MAX_HEIGHT,
    dropdownWidth: SERVICE_DROPDOWN_WIDTH
  });

  const dropdownMaxHeight = position.maxHeight && position.maxHeight < SERVICE_DROPDOWN_MAX_HEIGHT
    ? position.maxHeight
    : undefined;

  // Keyboard escape handling for AI Services modal
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showServicesDetails) {
        setShowServicesDetails(false);
      }
    };

    if (showServicesDetails) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showServicesDetails]);

  // Click-outside handling is managed by DropdownPortal component

  // Load Phase 4 statistics
  useEffect(() => {
    const loadPhase4Stats = () => {
      try {
        const stats = AgentFactory.getPhase4PerformanceStats();
        setPhase4Stats(stats);
      } catch (error) {
        console.warn('Phase 4 stats not available:', error);
        setPhase4Stats(null);
      }
    };

    // Load stats initially and every 30 seconds
    loadPhase4Stats();
    const interval = setInterval(loadPhase4Stats, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getDetailedDescription = () => {
    if (isExtractingPatients) {
      return 'Extracting patient data from EMR...';
    }
    
    if (status === 'processing' && currentAgent) {
      // Special handling for AI Review to avoid redundancy since badge won't show
      if (currentAgent === 'ai-medical-review') {
        return 'Analyzing clinical data against Australian guidelines...';
      }
      const agentName = AGENT_DISPLAY_NAMES[currentAgent as keyof typeof AGENT_DISPLAY_NAMES] || currentAgent.toUpperCase();
      return `${agentName} is analyzing your input...`;
    }
    
    // For idle state, we'll show device information separately
    return config.description;
  };

  const getProgressPercentage = () => {
    const progressMap = {
      idle: 0,
      'extracting-patient': 10,
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

  // AI Services helper functions
  const handleRefreshServices = async () => {
    setIsRefreshing(true);
    const toastService = ToastService.getInstance();
    
    try {
      await onRefreshServices();
      
      // Show success/status toast based on results
      const lmStudioOk = modelStatus.isConnected;
      const whisperOk = modelStatus.whisperServer?.running || false;
      
      if (lmStudioOk && whisperOk) {
        toastService.success('Services Status', 'All AI services are running normally');
      } else if (lmStudioOk || whisperOk) {
        toastService.warning('Partial Service Status', 
          `${lmStudioOk ? 'LMStudio connected' : 'LMStudio offline'}, ${whisperOk ? 'Whisper running' : 'Whisper stopped'}`);
      } else {
        toastService.error('Services Offline', 'Both LMStudio and Whisper server are offline');
      }
    } catch (error) {
      toastService.error('Status Check Failed', 
        error instanceof Error ? error.message : 'Failed to check service status');
    } finally {
      setIsRefreshing(false);
    }
  };


  const getOverallSystemStatus = () => {
    const lmStudioOk = modelStatus.isConnected;
    const whisperOk = modelStatus.whisperServer?.running || false;
    
    if (lmStudioOk && whisperOk) return 'healthy';
    if (lmStudioOk || whisperOk) return 'partial';
    return 'offline';
  };

  const _getConnectionStatusColor = () => {
    const systemStatus = getOverallSystemStatus();
    if (systemStatus === 'offline') return 'text-accent-red';
    if (systemStatus === 'partial') return 'text-accent-amber';
    return 'text-accent-emerald';
  };

  const formatLatency = (latency: number) => {
    if (latency === 0) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const getLastPingStatus = () => {
    if (!modelStatus.lastPing) return 'Never';
    const now = Date.now();
    const diff = now - modelStatus.lastPing;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <>
      {/* Full-Width Status Bar - Fixed Height */}
      <div className={`w-full h-16 ${config.bgColor} border-b border-white/20 px-4 py-3`}>
        <div className="flex items-center justify-between h-full">
          {/* Left Side: Record Panel + Status Information */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Record Panel */}
            <div className="flex-shrink-0">
              <RecordPanel
                onWorkflowSelect={onWorkflowSelect}
                activeWorkflow={activeWorkflow}
                isRecording={isRecording}
                disabled={false}
                voiceActivityLevel={voiceActivityLevel}
                recordingTime={recordingTime}
                whisperServerRunning={modelStatus.whisperServer?.running}
              />
            </div>
            
            {/* Status Icon */}
            <div className="relative flex-shrink-0">
              <Icon 
                className={`w-5 h-5 ${config.color} ${
                  config.animate || isExtractingPatients ? 'motion-safe:animate-spin' : ''
                }`} 
              />
              
              {/* Animated ring for active states */}
              {config.animate && (
                <div className={`absolute inset-0 rounded-full border-2 ${config.color.replace('text-', 'border-')} motion-safe:animate-ping opacity-30`} />
              )}
            </div>

            {/* Status Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className={`font-medium text-sm ${config.color}`}>
                  {/* Hide redundant "Recording" label during recording - RecordPanel handles this */}
                  {isRecording ? 'Ready' : config.label}
                </h3>
                
                {/* Agent indicator removed - agent name now shown in subtitle only */}
              </div>
              
              <p className="text-ink-secondary text-xs mt-0.5 truncate">
                {getDetailedDescription()}
              </p>
              
              {/* Compact audio device display - individual dropdowns below Ready status */}
              {status === 'idle' && !isRecording && (
                <div className="mt-1">
                  <CompactAudioDeviceDisplay disabled={false} />
                </div>
              )}
            </div>

            {/* Audio Processing Queue Status */}
            <div className="flex-shrink-0">
              <QueueStatusDisplay isCompact={true} className="mx-2" />
            </div>

            {/* Cancel Button - Compact version, positioned to avoid overlap */}
            {(status === 'transcribing' || status === 'processing' || status === 'cancelling') && onCancelProcessing && (
              <div className="flex-shrink-0 ml-2">
                <button
                  onClick={onCancelProcessing}
                  disabled={status === 'cancelling'}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 flex items-center space-x-1 ${
                    status === 'cancelling' 
                      ? 'bg-orange-500/10 border border-orange-300 text-orange-600 cursor-not-allowed' 
                      : 'bg-red-500/10 border border-red-300 text-red-600 hover:bg-red-500/20 hover:border-red-400'
                  }`}
                  title={
                    status === 'transcribing' 
                      ? "Cancel audio transcription"
                      : "Cancel AI report generation"
                  }
                >
                  {status === 'cancelling' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  <span>{status === 'cancelling' ? 'Cancelling...' : 'Cancel'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Side: New Recording, Session Notification & AI Services Status */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Latency Display - Hide during recording to save space */}
            {!isRecording && (
              <div className="text-xs text-ink-secondary hidden md:block">
                {formatLatency(modelStatus.latency)}
              </div>
            )}

            {/* New Recording Button - Compact Icon */}
            {showNewRecording && onNewRecording && (
              <button
                onClick={onNewRecording}
                disabled={isRecording || ['recording', 'transcribing', 'processing', 'enhancing', 'cancelling'].includes(status)}
                className={`bg-white border border-gray-200 transition-all duration-200 ease-out rounded-lg p-2 ${
                  isRecording || ['recording', 'transcribing', 'processing', 'enhancing', 'cancelling'].includes(status)
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer'
                }`}
                title="Clear previous recording and start fresh"
              >
                <ListRestart className={`w-4 h-4 ${
                  isRecording || ['recording', 'transcribing', 'processing', 'enhancing', 'cancelling'].includes(status)
                    ? 'text-ink-secondary' 
                    : 'text-green-600'
                }`} />
              </button>
            )}

            {/* Session Notification Button - Minimize during recording */}
            {patientSessions.length > 0 && (
              <div className="relative">
                <button
                  ref={bellButtonRef}
                  onClick={() => {
                    console.time('🔔 Notification Bell Click Performance');
                    const startTime = performance.now();
                    console.log('🔔 Bell clicked, opening sessions dropdown...', {
                      sessionCount: patientSessions.length,
                      timestamp: Date.now()
                    });

                    setIsOpeningSessions(true);
                    setShowSessionDropdown(!showSessionDropdown);

                    setTimeout(() => {
                      setIsOpeningSessions(false);
                      const endTime = performance.now();
                      console.timeEnd('🔔 Notification Bell Click Performance');
                      console.log('🔔 Bell opening completed', {
                        duration: `${(endTime - startTime).toFixed(2)}ms`,
                        sessionCount: patientSessions.length
                      });
                    }, 180);
                  }}
                  className={`bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ease-out rounded-lg p-2 relative ${
                    isRecording ? 'scale-90' : ''
                  }`}
                  title={`${patientSessions.length} recent session${patientSessions.length !== 1 ? 's' : ''}`}
                  data-dropdown-trigger
                >
                  <Bell className="w-4 h-4 text-accent-violet" />
                  {isOpeningSessions && (
                    <span className="absolute -top-1 -left-1">
                      <Loader2 className="w-3 h-3 text-accent-violet animate-spin" />
                    </span>
                  )}
                  
                  {/* Red notification badge - smaller during recording */}
                  <div className={`absolute -top-1 -right-1 bg-red-500 rounded-full flex items-center justify-center border-2 border-white ${
                    isRecording ? 'w-4 h-4' : 'w-5 h-5'
                  }`}>
                    <span className={`font-bold text-surface-primary leading-none ${
                      isRecording ? 'text-xs' : 'text-xs'
                    }`}>
                      {patientSessions.length > 9 ? '9+' : patientSessions.length}
                    </span>
                  </div>
                </button>
                
                {/* Session Dropdown */}
                <SessionDropdown
                  sessions={patientSessions}
                  onRemoveSession={onRemoveSession || (() => {})}
                  onClearAllSessions={onClearAllSessions || (() => {})}
                  onSessionSelect={onSessionSelect}
                  onResumeRecording={onResumeRecording}
                  onStopRecording={_onCompleteRecording}
                  onMarkSessionComplete={onMarkSessionComplete}
                  selectedSessionId={selectedSessionId}
                  activeRecordingSessionId={currentSessionId}
                  isOpen={showSessionDropdown}
                  onClose={() => setShowSessionDropdown(false)}
                  triggerRef={bellButtonRef}
                />
              </div>
            )}


            {/* Theme Toggle */}
            <ThemeToggle compact className="mr-1" />

            {/* Settings quick view trigger */}
            <button
              ref={triggerRef}
              data-dropdown-trigger
              onClick={() => setShowServicesDetails(!showServicesDetails)}
              className="inline-flex items-center justify-center w-11 h-11 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Settings quick view"
              title="Settings Quick View"
            >
              <Settings className="w-5 h-5 text-ink-secondary" />
            </button>
          </div>
        </div>

        {/* Progress Bar - Only show when active */}
        {status !== 'idle' && status !== 'error' && (
          <div className="mt-1">
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
      </div>

      {/* AI Services Dropdown - Portal Based */}
      <DropdownPortal
        isOpen={showServicesDetails}
        onClickOutside={() => setShowServicesDetails(false)}
      >
        <div
          data-dropdown-menu
          className="glass rounded-xl border border-white/20 p-4"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            right: position.right,
            maxHeight: dropdownMaxHeight,
            width: SERVICE_DROPDOWN_WIDTH,
            minWidth: SERVICE_DROPDOWN_WIDTH,
            maxWidth: `min(${SERVICE_DROPDOWN_WIDTH}px, calc(100vw - 24px))`,
            overflowY: dropdownMaxHeight ? 'auto' : 'visible',
            zIndex: 9999
          }}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-ink-primary font-medium text-sm flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings Quick View</span>
              </h4>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefreshServices}
                  disabled={isRefreshing}
                  className="bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 ease-out rounded p-1.5"
                  title="Refresh all services"
                >
                  <RefreshCw className={`w-3 h-3 text-accent-violet ${isRefreshing ? 'motion-safe:animate-spin' : ''}`} />
                </button>
                
                <button
                  onClick={() => setShowServicesDetails(false)}
                  className="bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 ease-out rounded p-1.5"
                  title="Close"
                >
                  <X className="w-3 h-3 text-ink-secondary" />
                </button>
              </div>
            </div>

            {/* Intelligent Features Quick View */}
            <div className="bg-gradient-to-br from-purple-50/50 to-violet-50/40 border border-purple-100/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-ink-primary text-sm font-medium">Intelligent Features</span>
                </div>
                <div className="text-xs text-ink-secondary">
                  {phase4Stats ? 'Active' : 'Loading...'}
                </div>
              </div>
              {phase4Stats ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-ink-secondary">Agent Cache:</span>
                    <span className="text-ink-primary ml-1">
                      {Math.round((phase4Stats.agentLoader?.cacheHitRate || 0) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Avg Load:</span>
                    <span className="text-ink-primary ml-1">
                      {(phase4Stats.agentLoader?.averageLoadTime || 0) > 0 ? `${Math.round(phase4Stats.agentLoader.averageLoadTime)}ms` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Cross-Agent:</span>
                    <span className="text-ink-primary ml-1">
                      {phase4Stats.crossAgentIntelligence?.globalInsights || 'Learning'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Profiles:</span>
                    <span className="text-ink-primary ml-1">
                      {phase4Stats.crossAgentIntelligence?.activeProfiles || '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-ink-tertiary">Gathering performance metrics…</div>
              )}
            </div>

            {/* LMStudio Status Section */}
            <div className="bg-gradient-to-br from-blue-50/40 to-indigo-50/30 border border-blue-100/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-ink-primary" />
                  <span className="text-ink-primary text-sm font-medium">LMStudio</span>
                </div>
                <div className={`flex items-center space-x-1 ${modelStatus.isConnected ? 'text-accent-emerald' : 'text-accent-red'}`}>
                  <div className={`w-2 h-2 rounded-full ${modelStatus.isConnected ? 'bg-accent-emerald' : 'bg-accent-red'}`} />
                  <span className="text-xs">{modelStatus.isConnected ? 'Connected' : 'Offline'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-ink-secondary">Latency:</span>
                  <span className="text-ink-primary font-mono ml-1">{formatLatency(modelStatus.latency)}</span>
                </div>
                <div>
                  <span className="text-ink-secondary">Last Check:</span>
                  <span className="text-ink-secondary ml-1">{getLastPingStatus()}</span>
                </div>
              </div>
            </div>

            {/* Whisper Server Status Section */}
            <div className="bg-gradient-to-br from-emerald-50/40 to-teal-50/30 border border-emerald-100/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-ink-primary" />
                  <span className="text-ink-primary text-sm font-medium">Whisper Server</span>
                </div>
                <div className={`flex items-center space-x-1 ${modelStatus.whisperServer?.running ? 'text-accent-emerald' : 'text-accent-red'}`}>
                  <div className={`w-2 h-2 rounded-full ${modelStatus.whisperServer?.running ? 'bg-accent-emerald' : 'bg-accent-red'}`} />
                  <span className="text-xs">{modelStatus.whisperServer?.running ? 'Running' : 'Stopped'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-ink-secondary">Port:</span>
                  <span className="text-ink-primary font-mono ml-1">{modelStatus.whisperServer?.port || '8001'}</span>
                </div>
                <div>
                  <span className="text-ink-secondary">Model:</span>
                  <span className="text-ink-secondary ml-1 break-words leading-snug">
                    {modelStatus.whisperServer?.model || 'whisper-large-v3-turbo'}
                  </span>
                </div>
              </div>
              
              {/* Whisper Server Controls - Show guidance when not running */}
              {!modelStatus.whisperServer?.running && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-amber-800 text-xs font-medium">
                        {modelStatus.whisperServer?.error?.includes('timeout') ? 'Server Starting Up' : 'Manual Start Required'}
                      </p>
                      <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                        {modelStatus.whisperServer?.error?.includes('timeout') ? (
                          <>Server may be initializing. Use "Refresh All Services" button above to check again.</>
                        ) : (
                          <>Run in terminal: <code className="bg-amber-100 px-1 rounded">./start-whisper-server.sh</code></>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {modelStatus.whisperServer?.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 text-xs font-medium">Connection Error</p>
                      <p className="text-red-700 text-xs mt-1 leading-relaxed">
                        {modelStatus.whisperServer.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {!modelStatus.isConnected && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 text-xs font-medium">
                      LMStudio Disconnected
                    </p>
                    <div className="text-gray-500 text-xs mt-1 leading-relaxed space-y-1">
                      <p>To fix this:</p>
                      <ol className="list-decimal list-inside space-y-0.5 ml-1">
                        <li>Open LMStudio application</li>
                        <li>Load MedGemma-27b MLX model</li>
                        <li>Start server on localhost:1234</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Dashboard */}
            {onShowMetrics && (
              <div className="border-t border-gray-200 pt-3">
                <button 
                  onClick={() => {
                    try {
                      const targetUrl = chrome?.runtime?.getURL
                        ? `${chrome.runtime.getURL('src/options/index.html')}#performance-metrics`
                        : null;

                      if (targetUrl) {
                        window.open(targetUrl, '_blank', 'noopener');
                      } else if (onShowMetrics) {
                        onShowMetrics();
                      }
                    } catch (error) {
                      console.warn('Failed to open performance metrics settings:', error);
                      onShowMetrics?.();
                    }
                  }}
                  className="w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ease-out rounded p-2 flex items-center justify-center space-x-2"
                >
                  <BarChart3 className="w-3 h-3 text-accent-violet" />
                  <span className="text-ink-primary text-xs">Performance Metrics</span>
                </button>
              </div>
            )}
            
            {/* Settings Link */}
            <div className="border-t border-gray-200 pt-3">
              <button 
                onClick={() => {
                  // Open options page in new tab
                  if (chrome?.runtime?.openOptionsPage) {
                    chrome.runtime.openOptionsPage();
                  } else {
                    // Fallback for development or if API is unavailable
                    window.open(chrome.runtime.getURL('src/options/index.html'), '_blank');
                  }
                }}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ease-out rounded p-2 flex items-center justify-center space-x-2"
                title="Open settings page in new tab"
              >
                <Settings className="w-3 h-3 text-ink-secondary" />
                <span className="text-ink-primary text-xs">Open Full Settings</span>
              </button>
            </div>
          </div>
        </div>
      </DropdownPortal>

    </>
  );
};
