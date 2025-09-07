import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { LMStudioService } from '@/services/LMStudioService';
import type { ModelStatus } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

// Optimized health check intervals to reduce API spam
const HEALTH_CHECK_INTERVALS = {
  NORMAL: 900000,      // 15 minutes when everything is working (increased from 10min)
  DEGRADED: 300000,    // 5 minutes when partially working (increased from 2min) 
  OFFLINE: 600000,     // 10 minutes when offline (increased from 5min)
  PAGE_HIDDEN: false,  // No polling when page is not visible
} as const;

// Global state for circuit breaker pattern
let lastHealthCheckTime = 0;
let consecutiveFailures = 0;
let isCircuitOpen = false;

// Hook to detect if page is visible to user (for lazy health checking)
function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

// React Query hook for model status with optimized polling, circuit breaker, and lazy checking
export function useModelStatus() {
  const lmStudioService = LMStudioService.getInstance();
  const isPageVisible = usePageVisibility();

  return useQuery({
    queryKey: ['modelStatus'],
    queryFn: async (): Promise<ModelStatus> => {
      const now = Date.now();
      
      // Circuit breaker: Skip health check if we've failed too many times recently
      if (isCircuitOpen && now - lastHealthCheckTime < 60000) { // 1 minute circuit breaker
        logger.debug('Health check circuit breaker active - skipping check', { component: 'health-check' });
        return {
          isConnected: false,
          classifierModel: '',
          processorModel: '',
          lastPing: lastHealthCheckTime,
          latency: 0,
          whisperServer: {
            running: false,
            model: 'whisper-large-v3-turbo',
            port: 8001,
            lastChecked: lastHealthCheckTime,
            error: 'Circuit breaker active - too many consecutive failures'
          },
          dspyServer: {
            running: false,
            ready: false,
            port: 8002,
            lastChecked: lastHealthCheckTime,
            error: 'Circuit breaker active - too many consecutive failures'
          }
        };
      }

      try {
        // Health checks performed silently to avoid console spam
        // Use chrome dev tools or enable debug logging if needed
        lastHealthCheckTime = now;
        
        const status = await lmStudioService.checkConnection();
        
        // Cache status in session storage for popup access
        try {
          await chrome.storage.session.set({
            modelStatus: status,
            lastStatusCheck: now
          });
        } catch (error) {
          console.warn('Failed to cache status in session storage:', error);
        }
        
        // Reset circuit breaker on success (any service running is considered success)
        if (status.isConnected || status.whisperServer?.running || status.dspyServer?.running) {
          consecutiveFailures = 0;
          isCircuitOpen = false;
        } else {
          consecutiveFailures++;
        }
        
        // Open circuit breaker after 3 consecutive failures
        if (consecutiveFailures >= 3) {
          isCircuitOpen = true;
          logger.warn('Opening health check circuit breaker after 3 consecutive failures', { component: 'health-check' });
        }
        
        return status;
      } catch (error) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          isCircuitOpen = true;
        }
        
        logger.warn('Health check failed', { 
          component: 'health-check',
          error: error instanceof Error ? error.message : String(error)
        });
        return {
          isConnected: false,
          classifierModel: '',
          processorModel: '',
          lastPing: now,
          latency: 0,
          whisperServer: {
            running: false,
            model: 'whisper-large-v3-turbo',
            port: 8001,
            lastChecked: now,
            error: error instanceof Error ? error.message : 'Health check failed'
          },
          dspyServer: {
            running: false,
            ready: false,
            port: 8002,
            lastChecked: now,
            error: error instanceof Error ? error.message : 'Health check failed'
          }
        };
      }
    },
    // Smart polling: Adjust interval based on system health and page visibility
    refetchInterval: (query) => {
      // Don't poll when page is not visible to save resources
      if (!isPageVisible) {
        // Health checks paused silently when page not visible
        return HEALTH_CHECK_INTERVALS.PAGE_HIDDEN;
      }

      const data = query.state.data as ModelStatus | undefined;
      if (!data) return HEALTH_CHECK_INTERVALS.NORMAL;
      
      const isLMStudioOk = data.isConnected;
      const isWhisperOk = data.whisperServer?.running || false;
      const isDSPyOk = data.dspyServer?.running || false;
      
      const servicesRunning = [isLMStudioOk, isWhisperOk, isDSPyOk].filter(Boolean).length;
      
      if (servicesRunning >= 2) {
        return HEALTH_CHECK_INTERVALS.NORMAL;    // 15 minutes when most services healthy
      } else if (servicesRunning >= 1) {
        return HEALTH_CHECK_INTERVALS.DEGRADED;  // 5 minutes when partially working
      } else {
        return HEALTH_CHECK_INTERVALS.OFFLINE;   // 10 minutes when all offline
      }
    },
    // Prevent excessive refetching
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    
    // Keep previous data while fetching new data
    placeholderData: (prev: ModelStatus | undefined) => prev,
    
    // Consider data stale after 5 minutes to reduce requests (increased from 2min)
    staleTime: 300000,
    
    // Cache data for 30 minutes (increased from 15min)
    gcTime: 1800000,
    
    // Enable request deduplication
    structuralSharing: true,
  });
}