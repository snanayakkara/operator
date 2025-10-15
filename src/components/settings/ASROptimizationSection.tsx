/**
 * ASROptimizationSection - Whisper Corrections Management UI
 * 
 * Handles ASR (Automatic Speech Recognition) optimization workflow:
 * 1. Load daily corrections from Chrome storage
 * 2. Preview suggested glossary terms and correction rules
 * 3. Allow user approval/rejection of suggestions
 * 4. Apply approved changes to dynamic correction files
 * 
 * Features:
 * - Glossary terms preview with frequency counts
 * - Correction rules with examples and context
 * - Batch selection/deselection
 * - Current state display showing active corrections
 * - Upload corrections from Chrome storage to server
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Check, RefreshCw, AlertTriangle, ServerOff } from 'lucide-react';
import { OptimizationService } from '@/services/OptimizationService';
import { ASRCorrectionsLog } from '@/services/ASRCorrectionsLog';
import { DynamicASRCorrections } from '@/utils/DynamicASRCorrections';
import { LocalCorrectionsViewer } from './LocalCorrectionsViewer';
import { logger } from '@/utils/Logger';
import { ASROptimizationError } from '@/types/optimization';
import type {
  ASRPreview,
  ASRCurrentState
} from '@/types/optimization';

interface ASROptimizationSectionProps {
  onError: (error: ASROptimizationError) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

export const ASROptimizationSection: React.FC<ASROptimizationSectionProps> = ({
  onError,
  onLoadingChange
}) => {
  // Services
  const optimizationService = useMemo(() => OptimizationService.getInstance(), []);
  const asrLog = useMemo(() => ASRCorrectionsLog.getInstance(), []);
  const dynamicASR = useMemo(() => DynamicASRCorrections.getInstance(), []);

  // State
  const [preview, setPreview] = useState<ASRPreview | null>(null);
  const [currentState, setCurrentState] = useState<ASRCurrentState | null>(null);
  const [correctionsCount, setCorrectionsCount] = useState(0);
  const [selectedGlossaryTerms, setSelectedGlossaryTerms] = useState<Set<string>>(new Set());
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isUploadingCorrections, setIsUploadingCorrections] = useState(false);
  
  const [showCurrentState, setShowCurrentState] = useState(false);
  const [lastApplied, setLastApplied] = useState<Date | null>(null);
  
  // Server availability state
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Load initial data
  useEffect(() => {
    const abortController = new AbortController();

    loadInitialData();

    // Cleanup: prevent state updates after unmount
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      // Check server availability first
      setIsCheckingServer(true);
      const serverStatus = await checkServerAvailability();
      setServerAvailable(serverStatus);

      // Always load local corrections count (works without server)
      const corrections = await asrLog.getCorrections({ limit: 1000 });
      setCorrectionsCount(corrections.length);

      // Only load server-dependent data if server is available
      if (serverStatus) {
        const state = await optimizationService.getCurrentASRState();
        setCurrentState(state);
        logger.info('ASR server data loaded successfully', {
          component: 'ASROptimizationSection',
          glossaryTerms: state.glossary?.length || 0,
          rules: state.rules?.length || 0
        });
      } else {
        // Clear server-dependent state when server is unavailable
        setCurrentState(null);
        setPreview(null);
        logger.info('ASR server unavailable, using local-only mode', {
          component: 'ASROptimizationSection',
          localCorrections: corrections.length
        });
      }

    } catch (error) {
      logger.warn('Failed to load ASR data', {
        component: 'ASROptimizationSection',
        error: error instanceof Error ? error.message : String(error)
      });
      setServerAvailable(false);
    } finally {
      setIsCheckingServer(false);
    }
  }, [optimizationService, asrLog]);

  const checkServerAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const connection = await optimizationService.testConnection();
      return connection;
    } catch (error) {
      logger.debug('ASR server connection test failed', {
        component: 'ASROptimizationSection',
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }, [optimizationService]);

  const uploadCorrections = useCallback(async () => {
    try {
      setIsUploadingCorrections(true);
      onLoadingChange(true);

      // Get corrections from Chrome storage
      const corrections = await asrLog.getCorrections({
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      });

      if (corrections.length === 0) {
        throw new Error('No corrections found in the last 7 days');
      }

      // Upload to server
      const result = await optimizationService.uploadCorrections(corrections);
      
      logger.info('Corrections uploaded successfully', {
        component: 'ASROptimizationSection',
        uploaded: result.uploaded
      });

      setCorrectionsCount(result.uploaded);

    } catch (error) {
      onError(error instanceof ASROptimizationError ? error : new ASROptimizationError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploadingCorrections(false);
      onLoadingChange(false);
    }
  }, [asrLog, optimizationService, onError, onLoadingChange]);

  const generatePreview = useCallback(async () => {
    try {
      setIsPreviewLoading(true);
      onLoadingChange(true);

      // Request preview from server
      const previewData = await optimizationService.previewASRCorrections({
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        maxTerms: 50,
        maxRules: 30
      });

      setPreview(previewData);

      // Pre-select high-frequency items
      const highFreqTerms = previewData.glossary_additions
        .filter(term => term.count >= 3)
        .map(term => term.term);
      setSelectedGlossaryTerms(new Set(highFreqTerms));

      const highFreqRules = previewData.rule_candidates
        .filter(rule => rule.count >= 3)
        .map(rule => `${rule.raw}→${rule.fix}`);
      setSelectedRules(new Set(highFreqRules));

      logger.info('ASR preview generated', {
        component: 'ASROptimizationSection',
        glossaryTerms: previewData.glossary_additions.length,
        rules: previewData.rule_candidates.length,
        preselected: { terms: highFreqTerms.length, rules: highFreqRules.length }
      });

    } catch (error) {
      onError(error instanceof ASROptimizationError ? error : new ASROptimizationError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsPreviewLoading(false);
      onLoadingChange(false);
    }
  }, [optimizationService, onError, onLoadingChange]);

  const applyChanges = useCallback(async () => {
    if (!preview) return;

    try {
      setIsApplying(true);
      onLoadingChange(true);

      const approvedGlossary = Array.from(selectedGlossaryTerms);
      const approvedRules = Array.from(selectedRules).map(ruleKey => {
        const [raw, fix] = ruleKey.split('→');
        return { raw, fix };
      });

      const result = await optimizationService.applyASRCorrections({
        approve_glossary: approvedGlossary,
        approve_rules: approvedRules
      });

      // Refresh current state
      const newState = await optimizationService.getCurrentASRState();
      setCurrentState(newState);

      // Clear preview
      setPreview(null);
      setSelectedGlossaryTerms(new Set());
      setSelectedRules(new Set());
      setLastApplied(new Date());

      // Refresh dynamic corrections cache
      await dynamicASR.refreshDynamicCorrections();

      logger.info('ASR corrections applied successfully', {
        component: 'ASROptimizationSection',
        applied: result.written,
        paths: result.paths
      });

    } catch (error) {
      onError(error instanceof ASROptimizationError ? error : new ASROptimizationError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsApplying(false);
      onLoadingChange(false);
    }
  }, [preview, selectedGlossaryTerms, selectedRules, optimizationService, dynamicASR, onError, onLoadingChange]);

  const toggleGlossaryTerm = useCallback((term: string) => {
    setSelectedGlossaryTerms(prev => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  }, []);

  const toggleRule = useCallback((ruleKey: string) => {
    setSelectedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleKey)) {
        next.delete(ruleKey);
      } else {
        next.add(ruleKey);
      }
      return next;
    });
  }, []);

  const selectAllGlossary = useCallback(() => {
    if (!preview) return;
    const allTerms = preview.glossary_additions.map(item => item.term);
    setSelectedGlossaryTerms(new Set(allTerms));
  }, [preview]);

  const selectAllRules = useCallback(() => {
    if (!preview) return;
    const allRules = preview.rule_candidates.map(rule => `${rule.raw}→${rule.fix}`);
    setSelectedRules(new Set(allRules));
  }, [preview]);

  const clearAllSelections = useCallback(() => {
    setSelectedGlossaryTerms(new Set());
    setSelectedRules(new Set());
  }, []);

  // Current state display
  const renderCurrentState = () => {
    if (!currentState) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-blue-900">Current ASR Corrections</h4>
          <button
            onClick={() => setShowCurrentState(!showCurrentState)}
            className="text-blue-600 text-sm underline"
          >
            {showCurrentState ? 'Hide' : 'Show'} Details
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Glossary Terms:</span>
            <span className="ml-2 text-blue-900">{currentState.glossary.length}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Correction Rules:</span>
            <span className="ml-2 text-blue-900">{currentState.rules.length}</span>
          </div>
        </div>

        {showCurrentState && (
          <div className="mt-4 space-y-3">
            {currentState.glossary.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-800 mb-2">Active Glossary Terms:</h5>
                <div className="flex flex-wrap gap-1">
                  {currentState.glossary.slice(0, 10).map(term => (
                    <span key={term} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {term}
                    </span>
                  ))}
                  {currentState.glossary.length > 10 && (
                    <span className="px-2 py-1 text-blue-600 text-xs">
                      +{currentState.glossary.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {currentState.rules.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-800 mb-2">Active Rules (showing 5):</h5>
                <div className="space-y-1 text-xs">
                  {currentState.rules.slice(0, 5).map((rule, idx) => (
                    <div key={idx} className="text-blue-700">
                      <span className="font-mono bg-blue-100 px-1 rounded">{rule.raw}</span>
                      {' → '}
                      <span className="font-mono bg-green-100 px-1 rounded">{rule.fix}</span>
                    </div>
                  ))}
                  {currentState.rules.length > 5 && (
                    <div className="text-blue-600">+{currentState.rules.length - 5} more rules</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Handle error propagation to LocalCorrectionsViewer
  const handleLocalError = useCallback((error: Error) => {
    onError(error instanceof ASROptimizationError ? error : new ASROptimizationError(error.message));
  }, [onError]);

  return (
    <div className="space-y-6">
      {/* Server Status Banner */}
      {serverAvailable === false && (
        <div className="flex items-center space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <ServerOff className="w-5 h-5 text-orange-600" />
          <div className="flex-1">
            <p className="font-medium text-orange-800">DSPy Server Unavailable</p>
            <p className="text-sm text-orange-700">
              Advanced batch processing requires the DSPy server. You can still view and manage local corrections below.
            </p>
          </div>
          <button
            onClick={() => loadInitialData()}
            disabled={isCheckingServer}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-orange-300 rounded hover:bg-orange-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingServer ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Current State Display - only show if server is available */}
      {serverAvailable && renderCurrentState()}

      {/* Local Corrections Viewer - always visible */}
      <div className="border-t pt-6">
        <LocalCorrectionsViewer
          onError={handleLocalError}
          onLoadingChange={onLoadingChange}
        />
      </div>

      {/* Server-dependent features - only show if server is available */}
      {serverAvailable && (
        <>
          {/* Upload Corrections */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Upload to DSPy Server</h4>
              <p className="text-sm text-gray-600">
                Send {correctionsCount} local corrections to the DSPy server for batch analysis
              </p>
            </div>
            <button
              onClick={uploadCorrections}
              disabled={isUploadingCorrections || correctionsCount === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploadingCorrections ? 'Uploading...' : 'Upload to Server'}</span>
            </button>
          </div>

          {/* Generate Preview */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Batch Corrections Analysis</h4>
              <p className="text-sm text-gray-600">
                Analyze patterns and generate improvement suggestions via DSPy server
              </p>
            </div>
            <button
              onClick={generatePreview}
              disabled={isPreviewLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isPreviewLoading ? 'animate-spin' : ''}`} />
              <span>{isPreviewLoading ? 'Analyzing...' : 'Prepare Batch'}</span>
            </button>
          </div>

          {/* Preview Results */}
          {preview && (
            <div className="space-y-6">
              {/* Selection Controls */}
              <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    Review and approve suggestions before applying
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllGlossary}
                    className="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    Select All Terms
                  </button>
                  <button
                    onClick={selectAllRules}
                    className="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    Select All Rules
                  </button>
                  <button
                    onClick={clearAllSelections}
                    className="text-sm text-red-600 underline hover:text-red-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Glossary Terms */}
              {preview.glossary_additions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Glossary Terms ({preview.glossary_additions.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {preview.glossary_additions.map((item) => {
                      const isSelected = selectedGlossaryTerms.has(item.term);
                      return (
                        <label
                          key={item.term}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleGlossaryTerm(item.term)}
                              className="rounded text-green-600"
                            />
                            <span className="font-mono text-sm">{item.term}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {item.count}x
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Correction Rules */}
              {preview.rule_candidates.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Correction Rules ({preview.rule_candidates.length})
                  </h4>
                  <div className="space-y-3">
                    {preview.rule_candidates.map((rule) => {
                      const ruleKey = `${rule.raw}→${rule.fix}`;
                      const isSelected = selectedRules.has(ruleKey);
                      return (
                        <label
                          key={ruleKey}
                          className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRule(ruleKey)}
                              className="rounded text-green-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="font-mono bg-red-100 px-2 py-1 rounded">
                                  {rule.raw}
                                </span>
                                <span>→</span>
                                <span className="font-mono bg-green-100 px-2 py-1 rounded">
                                  {rule.fix}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({rule.count}x)
                                </span>
                              </div>
                              {rule.examples.length > 0 && (
                                <div className="mt-2 text-xs text-gray-600">
                                  <span className="font-medium">Example:</span> {rule.examples[0]}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Apply Changes */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    Ready to Apply: {selectedGlossaryTerms.size + selectedRules.size} items
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedGlossaryTerms.size} glossary terms, {selectedRules.size} correction rules
                  </div>
                </div>
                <button
                  onClick={applyChanges}
                  disabled={isApplying || (selectedGlossaryTerms.size === 0 && selectedRules.size === 0)}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>{isApplying ? 'Applying...' : 'Apply Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Last Applied Info */}
          {lastApplied && (
            <div className="text-center text-sm text-green-600">
              ✓ Changes applied successfully at {lastApplied.toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </div>
  );
};
