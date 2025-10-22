/**
 * OptimizationPanel - Settings Panel for ASR and GEPA Optimization
 * 
 * Main settings interface for optimization features including:
 * - ASR corrections management (Whisper improvements)
 * - GEPA optimization (LLM prompt optimization)
 * - Overnight combined optimization workflows
 * 
 * Features:
 * - Three accordion sections for different optimization types
 * - Real-time server status monitoring
 * - Progress tracking for long-running operations
 * - Error handling with user-friendly messages
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Settings, Zap, Moon, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { OptimizationService } from '@/services/OptimizationService';
import { ASROptimizationSection } from './ASROptimizationSection';
import { GEPAOptimizationSection } from './GEPAOptimizationSection';
import { OvernightOptimizationCard } from './OvernightOptimizationCard';
import { MorningReviewCard } from './MorningReviewCard';
import { logger } from '@/utils/Logger';
import type {
  ServerHealthStatus,
  OvernightJob
} from '@/types/optimization';

import {
  OptimizationError
} from '@/types/optimization';

interface OptimizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type OptimizationSection = 'asr' | 'gepa' | 'overnight' | 'review';

interface SectionState {
  isExpanded: boolean;
  isLoading: boolean;
  lastError: string | null;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  isOpen,
  onClose
}) => {
  // Service instance
  const optimizationService = useMemo(() => OptimizationService.getInstance(), []);

  // Server status state
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Section states
  const [sections, setSections] = useState<Record<OptimizationSection, SectionState>>({
    asr: { isExpanded: true, isLoading: false, lastError: null },
    gepa: { isExpanded: false, isLoading: false, lastError: null },
    overnight: { isExpanded: false, isLoading: false, lastError: null },
    review: { isExpanded: false, isLoading: false, lastError: null }
  });

  // Panel state
  const [isInitialized, setIsInitialized] = useState(false);

  // Morning review state
  const [completedJobs, setCompletedJobs] = useState<OvernightJob[]>([]);
  const [selectedReviewJob, setSelectedReviewJob] = useState<OvernightJob | null>(null);

  const updateSectionState = useCallback((section: OptimizationSection, updates: Partial<SectionState>) => {
    setSections(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  }, []);

  const initializePanel = useCallback(async () => {
    logger.info('Initializing optimization panel', {
      component: 'OptimizationPanel'
    });

    try {
      setIsCheckingHealth(true);
      setConnectionError(null);

      const health = await optimizationService.checkHealth();
      setServerHealth(health);
      
      if (health.status === 'healthy') {
        setIsInitialized(true);
        logger.info('Optimization panel initialized successfully', {
          component: 'OptimizationPanel',
          serverStatus: health.status
        });
      } else {
        setConnectionError('DSPy server is unhealthy');
      }

    } catch (error) {
      const errorMsg = error instanceof OptimizationError ? error.message : 'Failed to connect to DSPy server';
      setConnectionError(errorMsg);
      logger.error('Failed to initialize optimization panel', new Error(errorMsg), { component: 'OptimizationPanel' });
    } finally {
      setIsCheckingHealth(false);
    }
  }, [optimizationService]);

  // Initialize panel when opened
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializePanel();
    }
  }, [isOpen, isInitialized, initializePanel]);

  // Load completed jobs when review section is expanded (will be added after function declaration)

  const loadCompletedJobs = useCallback(async () => {
    try {
      updateSectionState('review', { isLoading: true, lastError: null });
      
      // Load completed jobs from API
      try {
        const jobs = await optimizationService.getCompletedJobs();
        setCompletedJobs(jobs);
        
        logger.info('Completed jobs loaded from API', {
          component: 'OptimizationPanel',
          jobsCount: jobs.length
        });
      } catch (error) {
        logger.error('Failed to load completed jobs', error instanceof Error ? error : new Error(String(error)), {
          component: 'OptimizationPanel'
        });
        
        // Fallback to empty jobs list on error
        setCompletedJobs([]);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load completed jobs';
      updateSectionState('review', { lastError: errorMsg });
      logger.error('Failed to load completed jobs', new Error(errorMsg), { component: 'OptimizationPanel' });
    } finally {
      updateSectionState('review', { isLoading: false });
    }
  }, [optimizationService, updateSectionState]);

  // Load completed jobs when review section is expanded
  useEffect(() => {
    if (sections.review.isExpanded && completedJobs.length === 0) {
      loadCompletedJobs();
    }
  }, [sections.review.isExpanded, completedJobs.length, loadCompletedJobs]);

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
    
    logger.error(`Optimization section error: ${section}`, new Error(errorMsg), {
      component: 'OptimizationPanel',
      section,
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
        <div className="flex items-center space-x-2 text-blue-600">
          <Clock className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking server status...</span>
        </div>
      );
    }

    if (connectionError) {
      return (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Connection Error</span>
          </div>
          <button
            onClick={refreshHealth}
            className="text-red-600 text-sm underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      );
    }

    if (serverHealth?.status === 'healthy') {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">DSPy server ready</span>
          <span className="text-xs text-gray-500">
            ({serverHealth.dspy.enabled_agents.length} agents enabled)
          </span>
        </div>
      );
    }

    return null;
  };

  // Section header component
  const SectionHeader: React.FC<{
    section: OptimizationSection;
    icon: React.ReactNode;
    title: string;
    description: string;
  }> = ({ section, icon, title, description }) => {
    const state = sections[section];
    
    return (
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-blue-600">{icon}</div>
          <div className="text-left">
            <div className="font-medium text-gray-900">{title}</div>
            <div className="text-sm text-gray-600">{description}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {state.isLoading && <Clock className="w-4 h-4 animate-spin text-blue-500" />}
          {state.lastError && <AlertCircle className="w-4 h-4 text-red-500" />}
          {state.isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Optimization Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="mt-4">
            {renderServerStatus()}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {connectionError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                DSPy Server Unavailable
              </h3>
              <p className="text-gray-600 mb-4">
                Optimization features require the DSPy server to be running on localhost:8002.
              </p>
              <button
                onClick={refreshHealth}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry Connection
              </button>
            </div>
          ) : !isInitialized ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900">
                Initializing Optimization Panel
              </h3>
              <p className="text-gray-600">
                Connecting to DSPy server and loading configuration...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ASR Optimization Section */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <SectionHeader
                  section="asr"
                  icon={<Zap className="w-5 h-5" />}
                  title="Whisper Improvements"
                  description="Batch process daily transcript corrections to improve ASR accuracy"
                />
                
                {sections.asr.isExpanded && (
                  <div className="p-6 border-t border-gray-200">
                    <ASROptimizationSection
                      onError={(error) => handleSectionError('asr', error)}
                      onLoadingChange={(isLoading) => updateSectionState('asr', { isLoading })}
                    />
                  </div>
                )}
              </div>

              {/* GEPA Optimization Section */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <SectionHeader
                  section="gepa"
                  icon={<Settings className="w-5 h-5" />}
                  title="Report Quality"
                  description="Optimize medical agent prompts using GEPA for better reports"
                />
                
                {sections.gepa.isExpanded && (
                  <div className="p-6 border-t border-gray-200">
                    <GEPAOptimizationSection
                      onError={(error) => handleSectionError('gepa', error)}
                      onLoadingChange={(isLoading) => updateSectionState('gepa', { isLoading })}
                    />
                  </div>
                )}
              </div>

              {/* Overnight Optimization Section */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <SectionHeader
                  section="overnight"
                  icon={<Moon className="w-5 h-5" />}
                  title="Overnight Optimization"
                  description="Combined ASR + GEPA optimization with morning review"
                />
                
                {sections.overnight.isExpanded && (
                  <div className="p-6 border-t border-gray-200">
                    <OvernightOptimizationCard
                      onError={(error) => handleSectionError('overnight', error)}
                      onLoadingChange={(isLoading) => updateSectionState('overnight', { isLoading })}
                    />
                  </div>
                )}
              </div>

              {/* Morning Review Section */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <SectionHeader
                  section="review"
                  icon={<CheckCircle className="w-5 h-5" />}
                  title="Morning Review"
                  description="Review and apply completed overnight optimization results"
                />
                
                {sections.review.isExpanded && (
                  <div className="p-6 border-t border-gray-200">
                    {selectedReviewJob ? (
                      <MorningReviewCard
                        job={selectedReviewJob}
                        onJobUpdate={(jobId, status) => {
                          logger.info('Job updated from morning review', { jobId, status });
                          // Refresh completed jobs list
                          loadCompletedJobs();
                        }}
                        onClose={() => setSelectedReviewJob(null)}
                      />
                    ) : (
                      <div className="space-y-4">
                        {completedJobs.length > 0 ? (
                          <>
                            <h4 className="font-medium text-gray-900">Completed Optimization Jobs</h4>
                            <div className="space-y-2">
                              {completedJobs.map((job) => (
                                <div
                                  key={job.job_id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <div className="font-medium text-sm">
                                      Job {job.job_id.split('-').pop()}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'Recently completed'}
                                    </div>
                                    {job.summary && (
                                      <div className="text-xs text-gray-700 mt-1">
                                        {job.summary}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setSelectedReviewJob(job)}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Review
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <h4 className="font-medium mb-2">No Completed Jobs</h4>
                            <p className="text-sm">
                              Run overnight optimizations to see results here for morning review.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
