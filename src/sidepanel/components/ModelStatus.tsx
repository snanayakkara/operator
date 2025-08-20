import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Server, 
  Zap,
  AlertTriangle,
  Settings,
  Mic,
  Play,
  AlertCircle
} from 'lucide-react';
import type { ModelStatus as ModelStatusType, WhisperServerStatus } from '@/types/medical.types';
import { useDropdownPosition } from '../hooks/useDropdownPosition';
import { DropdownPortal } from './DropdownPortal';

interface ModelStatusProps {
  status: ModelStatusType;
  onRefresh: () => Promise<void>;
  onRestartWhisper: () => Promise<WhisperServerStatus>;
}

export const ModelStatus: React.FC<ModelStatusProps> = ({ 
  status, 
  onRefresh,
  onRestartWhisper 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRestartingWhisper, setIsRestartingWhisper] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { triggerRef, position } = useDropdownPosition({
    isOpen: showDetails,
    alignment: 'right',
    offset: { x: 0, y: 8 },
    maxHeight: 400
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRestartWhisper = async () => {
    setIsRestartingWhisper(true);
    try {
      const result = await onRestartWhisper();
      
      // Show notification based on result
      if (result.running) {
        console.log('✅ Whisper server started successfully');
      } else {
        console.warn('⚠️ Failed to start Whisper server:', result.error);
      }
    } catch (error) {
      console.error('❌ Error restarting Whisper server:', error);
    } finally {
      setIsRestartingWhisper(false);
    }
  };

  const getOverallSystemStatus = () => {
    const lmStudioOk = status.isConnected;
    const whisperOk = status.whisperServer?.running || false;
    
    if (lmStudioOk && whisperOk) return 'healthy';
    if (lmStudioOk || whisperOk) return 'partial';
    return 'offline';
  };

  const getConnectionStatusColor = () => {
    const systemStatus = getOverallSystemStatus();
    if (systemStatus === 'offline') return 'text-red-400';
    if (systemStatus === 'partial') return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getConnectionStatusBg = () => {
    const systemStatus = getOverallSystemStatus();
    if (systemStatus === 'offline') return 'bg-red-500/20';
    if (systemStatus === 'partial') return 'bg-yellow-500/20';
    return 'bg-emerald-500/20';
  };

  const formatLatency = (latency: number) => {
    if (latency === 0) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const getLastPingStatus = () => {
    if (!status.lastPing) return 'Never';
    const now = Date.now();
    const diff = now - status.lastPing;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="relative">
      {/* Main Status Button */}
      <button
        ref={triggerRef}
        data-dropdown-trigger
        onClick={() => setShowDetails(!showDetails)}
        className={`
          glass-button p-2 rounded-lg transition-all relative
          ${getConnectionStatusBg()}
        `}
        title="AI Services Status"
      >
        {getOverallSystemStatus() === 'healthy' ? (
          <Wifi className={`w-4 h-4 ${getConnectionStatusColor()}`} />
        ) : getOverallSystemStatus() === 'partial' ? (
          <AlertCircle className={`w-4 h-4 ${getConnectionStatusColor()}`} />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
        
        {/* Status indicator dot */}
        <div className={`
          absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white/20
          ${getOverallSystemStatus() === 'healthy' ? 'bg-emerald-400' : 
            getOverallSystemStatus() === 'partial' ? 'bg-yellow-400' : 'bg-red-400'}
        `} />
      </button>

      {/* Detailed Status Panel - Portal Based */}
      <DropdownPortal
        isOpen={showDetails}
        onClickOutside={() => setShowDetails(false)}
      >
        <div 
          data-dropdown-menu
          className="glass rounded-lg border border-white/20 p-4"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            right: position.right,
            maxHeight: position.maxHeight,
            width: 320,
            zIndex: 999999
          }}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-gray-900 font-medium text-sm flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>AI Services Status</span>
              </h4>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="glass-button p-1.5 rounded hover:bg-white/20 transition-colors"
                title="Refresh all services"
              >
                <RefreshCw className={`w-3 h-3 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* LMStudio Status Section */}
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-800 text-sm font-medium">LMStudio</span>
                </div>
                <div className={`flex items-center space-x-1 ${status.isConnected ? 'text-emerald-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-xs">{status.isConnected ? 'Connected' : 'Offline'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Latency:</span>
                  <span className="text-gray-900 font-mono ml-1">{formatLatency(status.latency)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Last Check:</span>
                  <span className="text-gray-500 ml-1">{getLastPingStatus()}</span>
                </div>
              </div>
            </div>

            {/* Whisper Server Status Section */}
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-800 text-sm font-medium">Whisper Server</span>
                </div>
                <div className={`flex items-center space-x-1 ${status.whisperServer?.running ? 'text-emerald-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${status.whisperServer?.running ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-xs">{status.whisperServer?.running ? 'Running' : 'Stopped'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Port:</span>
                  <span className="text-gray-900 font-mono ml-1">{status.whisperServer?.port || '8001'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Model:</span>
                  <span className="text-gray-500 ml-1 truncate">{status.whisperServer?.model || 'whisper-large-v3-turbo'}</span>
                </div>
              </div>
              
              {/* Whisper Server Controls */}
              {!status.whisperServer?.running && (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-800 text-xs font-medium">Manual Start Required</p>
                        <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                          Run in terminal: <code className="bg-amber-100 px-1 rounded">./start-whisper-server.sh</code>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleRestartWhisper}
                    disabled={isRestartingWhisper}
                    className="w-full glass-button p-2 rounded flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 text-blue-600 ${isRestartingWhisper ? 'animate-spin' : ''}`} />
                    <span className="text-gray-900 text-xs">
                      {isRestartingWhisper ? 'Checking...' : 'Check Status'}
                    </span>
                  </button>
                </div>
              )}
              
              {status.whisperServer?.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 text-xs font-medium">Connection Error</p>
                      <p className="text-red-700 text-xs mt-1 leading-relaxed">
                        {status.whisperServer.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Model Information */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-gray-600 text-xs">Models</span>
              </div>
              
              <div className="space-y-1 pl-5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Classifier</span>
                  <span className="text-gray-900 text-xs font-mono truncate max-w-24" title={status.classifierModel}>
                    {status.classifierModel || 'Not set'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Processor</span>
                  <span className="text-gray-900 text-xs font-mono truncate max-w-24" title={status.processorModel}>
                    {status.processorModel || 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {!status.isConnected && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 text-xs font-medium">
                      LMStudio Disconnected
                    </p>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                      Make sure LMStudio is running on localhost:1234 with a model loaded.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status.isConnected && status.latency > 5000 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 text-xs font-medium">
                      High Latency
                    </p>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                      Consider using a smaller model for better performance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Link */}
            <div className="border-t border-gray-200 pt-3">
              <button className="w-full glass-button p-2 rounded flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors">
                <Settings className="w-3 h-3 text-blue-600" />
                <span className="text-gray-900 text-xs">Model Settings</span>
              </button>
            </div>
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
};