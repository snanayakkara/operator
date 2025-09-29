import React from 'react';
import { Mic, MicOff, AlertTriangle, CheckCircle as _CheckCircle, Activity } from 'lucide-react';

interface AudioDeviceMonitorProps {
  isRecording: boolean;
  voiceActivityLevel: number;
  frequencyData: number[];
  activeDeviceInfo: {
    label: string;
    deviceId: string;
    isWorking: boolean;
  } | null;
  audioLevelHistory: number[];
  className?: string;
}

export const AudioDeviceMonitor: React.FC<AudioDeviceMonitorProps> = ({
  isRecording,
  voiceActivityLevel,
  frequencyData,
  activeDeviceInfo,
  audioLevelHistory,
  className = ""
}) => {
  // Debounced device status state to prevent flashing
  const [debouncedStatus, setDebouncedStatus] = React.useState({ 
    status: 'idle', 
    message: 'Not recording', 
    color: 'gray' 
  });
  const [showWarning, setShowWarning] = React.useState(false);
  const statusDebounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Calculate audio statistics
  const averageLevel = audioLevelHistory.length > 0 
    ? audioLevelHistory.reduce((sum, level) => sum + level, 0) / audioLevelHistory.length 
    : 0;
  
  const maxLevel = audioLevelHistory.length > 0 
    ? Math.max(...audioLevelHistory) 
    : 0;
  
  const hasRecentActivity = audioLevelHistory.slice(-10).some(level => level > 0.05);
  
  // Determine immediate status (for internal calculations)
  const getImmediateDeviceStatus = () => {
    if (!isRecording) return { status: 'idle', message: 'Not recording', color: 'gray' };
    if (!activeDeviceInfo) return { status: 'unknown', message: 'No device info', color: 'yellow' };
    
    if (audioLevelHistory.length < 5) {
      return { status: 'initializing', message: 'Initializing...', color: 'blue' };
    }
    
    if (hasRecentActivity) {
      return { status: 'working', message: 'Audio detected', color: 'green' };
    }
    
    if (maxLevel < 0.01) {
      return { status: 'silent', message: 'No audio detected', color: 'red' };
    }
    
    return { status: 'low', message: 'Very low audio', color: 'yellow' };
  };

  // Debounce device status changes to prevent flashing UI
  React.useEffect(() => {
    const immediateStatus = getImmediateDeviceStatus();
    
    // Clear existing timeout
    if (statusDebounceRef.current) {
      clearTimeout(statusDebounceRef.current);
    }
    
    // For good states, update immediately
    if (immediateStatus.status === 'working' || immediateStatus.status === 'initializing' || immediateStatus.status === 'idle') {
      setDebouncedStatus(immediateStatus);
      setShowWarning(false);
      return;
    }
    
    // For problem states (silent, low, unknown), debounce for 3 seconds
    statusDebounceRef.current = setTimeout(() => {
      setDebouncedStatus(immediateStatus);
      // Only show detailed warning after extended issues (20+ samples)
      if ((immediateStatus.status === 'silent' || immediateStatus.status === 'low') && audioLevelHistory.length > 20) {
        setShowWarning(true);
      }
    }, 3000);
    
    return () => {
      if (statusDebounceRef.current) {
        clearTimeout(statusDebounceRef.current);
      }
    };
  }, [isRecording, hasRecentActivity, maxLevel, audioLevelHistory.length, activeDeviceInfo]);

  const deviceStatus = debouncedStatus;
  
  // Format device name for display
  const formatDeviceName = (name: string) => {
    if (name.length <= 25) return name;
    return name.substring(0, 22) + '...';
  };
  
  return (
    <div className={`bg-white border rounded-lg p-3 shadow-sm ${className}`}>
      {/* Header with device info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {deviceStatus.status === 'working' && <Mic className="w-4 h-4 text-green-500" />}
          {deviceStatus.status === 'silent' && <MicOff className="w-4 h-4 text-red-500" />}
          {deviceStatus.status === 'low' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
          {deviceStatus.status === 'initializing' && <Activity className="w-4 h-4 text-blue-500 animate-spin" />}
          {deviceStatus.status === 'idle' && <Mic className="w-4 h-4 text-gray-400" />}
          {deviceStatus.status === 'unknown' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
          
          <span className="text-sm font-medium text-gray-700">
            {activeDeviceInfo ? formatDeviceName(activeDeviceInfo.label) : 'No Device'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            deviceStatus.color === 'green' ? 'bg-green-500' :
            deviceStatus.color === 'red' ? 'bg-red-500' :
            deviceStatus.color === 'yellow' ? 'bg-yellow-500' :
            deviceStatus.color === 'blue' ? 'bg-blue-500' :
            'bg-gray-400'
          }`} />
          <span className={`text-xs ${
            deviceStatus.color === 'green' ? 'text-green-600' :
            deviceStatus.color === 'red' ? 'text-red-600' :
            deviceStatus.color === 'yellow' ? 'text-yellow-600' :
            deviceStatus.color === 'blue' ? 'text-blue-600' :
            'text-gray-500'
          }`}>
            {deviceStatus.message}
          </span>
        </div>
      </div>
      
      {/* Audio level visualization */}
      {isRecording && (
        <>
          {/* Main level bar */}
          <div className="mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 w-12">Level:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-100 ${
                    voiceActivityLevel > 0.7 ? 'bg-green-500' :
                    voiceActivityLevel > 0.3 ? 'bg-yellow-500' :
                    voiceActivityLevel > 0.05 ? 'bg-blue-500' :
                    'bg-gray-300'
                  }`}
                  style={{ width: `${Math.min(voiceActivityLevel * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">
                {Math.round(voiceActivityLevel * 100)}%
              </span>
            </div>
          </div>
          
          {/* Frequency bars */}
          {frequencyData.length > 0 && (
            <div className="mb-2">
              <div className="flex items-end space-x-0.5 h-8">
                {frequencyData.map((freq, index) => (
                  <div
                    key={index}
                    className={`flex-1 rounded-t transition-all duration-100 ${
                      freq > 0.7 ? 'bg-green-500' :
                      freq > 0.3 ? 'bg-yellow-500' :
                      freq > 0.1 ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}
                    style={{ height: `${Math.max(freq * 100, 4)}%` }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Audio statistics */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Avg: {Math.round(averageLevel * 100)}%</span>
            <span>Max: {Math.round(maxLevel * 100)}%</span>
            <span>Samples: {audioLevelHistory.length}</span>
          </div>
        </>
      )}
      
      {/* Fixed Layout Device Troubleshooting Hints - Always reserves space */}
      <div className="mt-2 min-h-[40px] flex items-center">
        {isRecording && showWarning && (
          <div className="w-full p-2 bg-red-50 border border-red-200 rounded text-xs transition-all duration-300">
            <div className="font-medium text-red-800 mb-1">⚠️ {deviceStatus.message}</div>
            <div className="text-red-600">
              • Check if microphone is muted<br/>
              • Ensure device is connected (AirPods, etc.)<br/>
              • Try speaking louder or closer to microphone<br/>
              • Switch to a different microphone if available
            </div>
          </div>
        )}
        {isRecording && !showWarning && (
          <div className="text-xs text-gray-500 opacity-60 text-center w-full">
            Device monitoring: {deviceStatus.message.toLowerCase()}
          </div>
        )}
      </div>
      
      {/* Device info when not recording */}
      {!isRecording && activeDeviceInfo && (
        <div className="text-xs text-gray-500">
          Device ID: {activeDeviceInfo.deviceId.substring(0, 12)}...
        </div>
      )}
    </div>
  );
};