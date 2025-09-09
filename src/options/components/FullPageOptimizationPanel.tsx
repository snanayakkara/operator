/**
 * FullPageOptimizationPanel - Full-page settings panel for ASR and GEPA optimization
 * 
 * Expanded version of OptimizationPanel designed for full-page layout with:
 * - Full viewport utilization for optimization features
 * - Enhanced UI with better spacing and organization
 * - Professional monochrome design system
 * - Improved accessibility and keyboard navigation
 * 
 * Features:
 * - ASR corrections management (Whisper improvements)
 * - GEPA optimization (LLM prompt optimization)
 * - Overnight combined optimization workflows
 * - Morning review section
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Settings, Zap, Moon, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { OptimizationService } from '@/services/OptimizationService';
import { ASROptimizationSection } from '@/components/settings/ASROptimizationSection';
import { GEPAOptimizationSection } from '@/components/settings/GEPAOptimizationSection';
import { OvernightOptimizationCard } from '@/components/settings/OvernightOptimizationCard';
import { MorningReviewCard } from '@/components/settings/MorningReviewCard';
import { logger } from '@/utils/Logger';
import type { 
  ServerHealthStatus,
  OvernightJob,
  AgentType
} from '@/types/optimization';

import { 
  OptimizationError,
  ASROptimizationError,
  GEPAOptimizationError,
  OvernightOptimizationError
} from '@/types/optimization';

type OptimizationSection = 'asr' | 'gepa' | 'overnight' | 'review';

interface SectionState {
  isExpanded: boolean;
  isLoading: boolean;
  lastError: string | null;
}

interface OptimizationSectionConfig {
  id: OptimizationSection;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultExpanded?: boolean;
}

const OPTIMIZATION_SECTIONS: OptimizationSectionConfig[] = [
  {
    id: 'asr',
    title: 'Whisper Improvements',
    description: 'Batch process daily transcript corrections to improve ASR accuracy and medical terminology recognition',
    icon: Zap,
    defaultExpanded: true
  },
  {
    id: 'gepa',
    title: 'Report Quality',
    description: 'Optimize medical agent prompts using GEPA algorithms for better clinical report generation',
    icon: Settings,
    defaultExpanded: false
  },
  {
    id: 'overnight',
    title: 'Overnight Optimization',
    description: 'Combined ASR and GEPA optimization workflows that run automatically during off-hours',
    icon: Moon,
    defaultExpanded: false
  },
  {
    id: 'review',
    title: 'Morning Review',
    description: 'Review and apply completed overnight optimization results with detailed analysis reports',
    icon: CheckCircle,
    defaultExpanded: false
  }
];

export const FullPageOptimizationPanel: React.FC = () => {
  // Service instance
  const optimizationService = useMemo(() => OptimizationService.getInstance(), []);

  // Server status state
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Section states - Initialize with configuration defaults
  const [sections, setSections] = useState<Record<OptimizationSection, SectionState>>(() => {
    const initialState: Record<OptimizationSection, SectionState> = {} as any;
    OPTIMIZATION_SECTIONS.forEach(section => {
      initialState[section.id] = {
        isExpanded: section.defaultExpanded || false,
        isLoading: false,
        lastError: null
      };
    });
    return initialState;
  });

  // Panel state
  const [isInitialized, setIsInitialized] = useState(false);

  // Morning review state
  const [completedJobs, setCompletedJobs] = useState<OvernightJob[]>([]);
  const [selectedReviewJob, setSelectedReviewJob] = useState<OvernightJob | null>(null);

  // Initialize panel on mount
  useEffect(() => {
    initializePanel();
  }, []);

  // Load completed jobs when review section is expanded
  useEffect(() => {
    if (sections.review.isExpanded && completedJobs.length === 0) {
      loadCompletedJobs();
    }
  }, [sections.review.isExpanded, completedJobs.length]);

  const loadCompletedJobs = useCallback(async () => {
    try {
      updateSectionState('review', { isLoading: true, lastError: null });
      
      try {
        const jobs = await optimizationService.getCompletedJobs();
        setCompletedJobs(jobs);
        
        logger.info('Completed jobs loaded from API', {
          component: 'FullPageOptimizationPanel',
          jobsCount: jobs.length
        });
      } catch (error) {
        logger.error('Failed to load completed jobs', {
          component: 'FullPageOptimizationPanel',
          error: error instanceof Error ? error.message : String(error)
        });
        
        setCompletedJobs([]);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load completed jobs';
      updateSectionState('review', { lastError: errorMsg });
    } finally {
      updateSectionState('review', { isLoading: false });
    }
  }, [optimizationService]);

  const initializePanel = useCallback(async () => {
    logger.info('Initializing full-page optimization panel', {
      component: 'FullPageOptimizationPanel'
    });

    try {
      setIsCheckingHealth(true);
      setConnectionError(null);

      const health = await optimizationService.checkHealth();
      setServerHealth(health);
      
      if (health.status === 'healthy') {
        setIsInitialized(true);
        logger.info('Full-page optimization panel initialized successfully', {
          component: 'FullPageOptimizationPanel',
          serverStatus: health.status
        });
      } else {
        setConnectionError('DSPy server is unhealthy');
      }

    } catch (error) {
      const errorMsg = error instanceof OptimizationError ? error.message : 'Failed to connect to DSPy server';
      setConnectionError(errorMsg);
      logger.error('Failed to initialize full-page optimization panel', {
        component: 'FullPageOptimizationPanel',
        error: errorMsg
      });
    } finally {
      setIsCheckingHealth(false);
    }
  }, [optimizationService]);

  const updateSectionState = useCallback((section: OptimizationSection, updates: Partial<SectionState>) => {
    setSections(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  }, []);

  const toggleSection = useCallback((section: OptimizationSection) => {
    setSections(prev => ({
      ...prev,
      [section]: { 
        ...prev[section], 
        isExpanded: !prev[section].isExpanded 
      }
    }));
  }, []);

  const handleSectionError = useCallback((section: OptimizationSection, error: OptimizationError) => {
    const errorMsg = error.message;
    updateSectionState(section, { isLoading: false, lastError: errorMsg });
    
    logger.error(`Optimization section error: ${section}`, {
      component: 'FullPageOptimizationPanel',
      section,
      error: errorMsg,
      code: error.code
    });
  }, [updateSectionState]);

  const refreshHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    setConnectionError(null);
    
    try {
      const health = await optimizationService.checkHealth();
      setServerHealth(health);
      
      if (health.status !== 'healthy') {
        setConnectionError('DSPy server is unhealthy');
      } else {
        setIsInitialized(true);
      }
    } catch (error) {
      const errorMsg = error instanceof OptimizationError ? error.message : 'Health check failed';
      setConnectionError(errorMsg);
    } finally {
      setIsCheckingHealth(false);
    }
  }, [optimizationService]);

  // Server status indicator
  const renderServerStatus = () => {
    if (isCheckingHealth) {
      return (
        <div className="flex items-center space-x-3 px-6 py-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Clock className="w-5 h-5 animate-spin text-blue-600" />
          <div>
            <div className="text-sm font-medium text-blue-900">Checking Server Status</div>
            <div className="text-xs text-blue-700">Connecting to DSPy optimization server...</div>
          </div>
        </div>
      );
    }

    if (connectionError) {
      return (
        <div className="px-6 py-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-sm font-medium text-red-900">Connection Error</div>
                <div className="text-xs text-red-700 mt-1">{connectionError}</div>
              </div>
            </div>
            <button
              onClick={refreshHealth}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
          
          <div className="mt-3 p-3 bg-red-100 rounded-lg">
            <div className="text-xs text-red-800 font-medium mb-2">To fix this issue:</div>
            <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
              <li>Ensure DSPy server is running on localhost:8002</li>
              <li>Check your Python environment and dependencies</li>
              <li>Verify firewall and network settings</li>
            </ol>
          </div>
        </div>
      );
    }

    if (serverHealth?.status === 'healthy') {
      return (
        <div className="px-6 py-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-900">DSPy Server Ready</div>
              <div className="text-xs text-green-700">
                {serverHealth.dspy.enabled_agents.length} optimization agents available
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Section card component for full-page layout
  const SectionCard: React.FC<{
    config: OptimizationSectionConfig;
    children: React.ReactNode;
  }> = ({ config, children }) => {
    const state = sections[config.id];
    const Icon = config.icon;
    
    return (
      <div className="bg-surface-primary border-2 border-line-primary rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(config.id)}
          className="w-full p-6 bg-surface-secondary hover:bg-surface-tertiary transition-all duration-200 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-surface-primary rounded-lg border border-line-secondary">
              <Icon className="w-6 h-6 text-accent-info" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-ink-primary text-lg">{config.title}</div>
              <div className="text-sm text-ink-secondary mt-1 max-w-2xl">{config.description}</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {state.isLoading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
            {state.lastError && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Error</span>
              </div>
            )}
            {state.isExpanded ? (
              <ChevronDown className="w-6 h-6 text-ink-tertiary" />
            ) : (
              <ChevronRight className="w-6 h-6 text-ink-tertiary" />
            )}
          </div>
        </button>
        
        {state.isExpanded && (
          <div className="p-6 border-t-2 border-line-primary">
            {state.lastError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Section Error</span>
                </div>
                <div className="text-sm text-red-600 mt-1">{state.lastError}</div>
              </div>
            )}
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Server Status Header */}
      <div className="space-y-6">
        {renderServerStatus()}
      </div>

      {/* Main Content */}
      {connectionError ? (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h3 className="text-xl font-medium text-ink-primary mb-4">
            DSPy Server Unavailable
          </h3>
          <p className="text-ink-secondary mb-6 max-w-2xl mx-auto">
            Optimization features require the DSPy server to be running on localhost:8002. 
            Please ensure the server is properly configured and accessible.
          </p>
          <button
            onClick={refreshHealth}
            className="mono-button-primary flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : !isInitialized ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-blue-500 mx-auto mb-6 animate-spin" />
          <h3 className="text-xl font-medium text-ink-primary mb-2">
            Initializing Optimization Panel
          </h3>
          <p className="text-ink-secondary">
            Connecting to DSPy server and loading configuration...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ASR Optimization Section */}
          <SectionCard config={OPTIMIZATION_SECTIONS[0]}>
            <ASROptimizationSection
              onError={(error) => handleSectionError('asr', error)}
              onLoadingChange={(isLoading) => updateSectionState('asr', { isLoading })}
            />
          </SectionCard>

          {/* GEPA Optimization Section */}
          <SectionCard config={OPTIMIZATION_SECTIONS[1]}>
            <GEPAOptimizationSection
              onError={(error) => handleSectionError('gepa', error)}
              onLoadingChange={(isLoading) => updateSectionState('gepa', { isLoading })}
            />
          </SectionCard>

          {/* Overnight Optimization Section */}
          <SectionCard config={OPTIMIZATION_SECTIONS[2]}>
            <OvernightOptimizationCard
              onError={(error) => handleSectionError('overnight', error)}
              onLoadingChange={(isLoading) => updateSectionState('overnight', { isLoading })}
            />
          </SectionCard>

          {/* Morning Review Section */}
          <SectionCard config={OPTIMIZATION_SECTIONS[3]}>
            {selectedReviewJob ? (
              <MorningReviewCard
                job={selectedReviewJob}
                onJobUpdate={(jobId, status) => {
                  logger.info('Job updated from morning review', { jobId, status });
                  loadCompletedJobs();
                }}
                onClose={() => setSelectedReviewJob(null)}
              />
            ) : (
              <div className="space-y-6">
                {completedJobs.length > 0 ? (
                  <>
                    <h4 className="font-semibold text-ink-primary text-lg">Completed Optimization Jobs</h4>
                    <div className="space-y-4">
                      {completedJobs.map((job) => (
                        <div
                          key={job.job_id}
                          className="flex items-center justify-between p-4 bg-surface-secondary border border-line-primary rounded-lg hover:bg-surface-tertiary transition-colors"
                        >
                          <div>
                            <div className="font-medium text-ink-primary">
                              Job {job.job_id.split('-').pop()}
                            </div>
                            <div className="text-sm text-ink-secondary">
                              {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'Recently completed'}
                            </div>
                            {job.summary && (
                              <div className="text-sm text-ink-secondary mt-1">
                                {job.summary}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedReviewJob(job)}
                            className="mono-button-primary"
                          >
                            Review Results
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-6 text-ink-tertiary" />
                    <h4 className="font-medium text-ink-primary text-lg mb-2">No Completed Jobs</h4>
                    <p className="text-ink-secondary max-w-md mx-auto">
                      Run overnight optimizations to see results here for morning review. 
                      Optimization jobs will appear once they complete successfully.
                    </p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
};