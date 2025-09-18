/**
 * QueueStatusDisplay - Real-time Audio Processing Queue Status
 * 
 * Shows users the current state of the audio processing queue including:
 * - Number of jobs in queue and currently processing
 * - Queue position for individual jobs
 * - Overall processing status and statistics
 * - Simple, non-intrusive display
 */

import React, { useState, useEffect } from 'react';
import { Clock, Zap, BarChart3, AlertCircle } from 'lucide-react';
import { AudioProcessingQueueService, QueueStats } from '@/services/AudioProcessingQueueService';

interface QueueStatusDisplayProps {
  isCompact?: boolean;
  className?: string;
}

export const QueueStatusDisplay: React.FC<QueueStatusDisplayProps> = ({
  isCompact = false,
  className = ''
}) => {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const audioQueue = AudioProcessingQueueService.getInstance();
    
    const updateStats = () => {
      const stats = audioQueue.getQueueStats();
      setQueueStats(stats);
      
      // Show display when there are jobs in queue or processing
      const hasActivity = stats.queuedJobs > 0 || stats.processingJobs > 0;
      setIsVisible(hasActivity);
    };

    // Initial update
    updateStats();

    // Update every 2 seconds when visible
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !queueStats) {
    return null;
  }

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  if (isCompact) {
    return (
      <div className={`inline-flex items-center space-x-2 text-xs text-gray-600 ${className}`}>
        {queueStats.processingJobs > 0 && (
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-blue-500" />
            <span>{queueStats.processingJobs} processing</span>
          </div>
        )}
        
        {queueStats.queuedJobs > 0 && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{queueStats.queuedJobs} queued</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">Audio Queue</span>
        </div>
        
        {queueStats.currentConcurrency > 0 && (
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <Zap className="w-3 h-3" />
            <span>{queueStats.currentConcurrency}/{queueStats.maxConcurrency}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Processing Status */}
        <div className="space-y-1">
          {queueStats.processingJobs > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Processing</span>
              <div className="flex items-center space-x-1 text-blue-600">
                <Zap className="w-3 h-3" />
                <span className="font-medium">{queueStats.processingJobs}</span>
              </div>
            </div>
          )}
          
          {queueStats.queuedJobs > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Queued</span>
              <div className="flex items-center space-x-1 text-amber-600">
                <Clock className="w-3 h-3" />
                <span className="font-medium">{queueStats.queuedJobs}</span>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="space-y-1">
          {queueStats.completedJobs > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completed</span>
              <span className="font-medium text-green-600">{queueStats.completedJobs}</span>
            </div>
          )}
          
          {queueStats.failedJobs > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Failed</span>
              <div className="flex items-center space-x-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span className="font-medium">{queueStats.failedJobs}</span>
              </div>
            </div>
          )}
          
          {queueStats.averageProcessingTime > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg Time</span>
              <span className="font-medium text-gray-900">
                {formatTime(queueStats.averageProcessingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator for active processing */}
      {queueStats.processingJobs > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(queueStats.processingJobs / queueStats.maxConcurrency) * 100}%` 
                }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {queueStats.processingJobs}/{queueStats.maxConcurrency}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};