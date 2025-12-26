/**
 * useNextStepEngine Hook
 * 
 * Manages the Next-Step Engine state including:
 * - Triggering inference after letter generation
 * - Managing suggestion selection
 * - Handling letter integration
 * - Letter version history for undo support
 * 
 * @see docs/Operator_NextStep_Engine_Reference.md
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  NextStepSuggestion,
  NextStepEngineResult,
  NextStepStatus,
  NextStepPatientContext,
  LetterVersion,
  LetterVersionHistory
} from '@/types/nextStep.types';
import { getNextStepInferenceAgent } from '@/agents/specialized/NextStepInferenceAgent';
import { logger } from '@/utils/Logger';

/**
 * Configuration options for the hook.
 */
interface UseNextStepEngineOptions {
  /** Maximum versions to keep in history */
  maxVersions?: number;
  
  /** Whether to auto-run inference when letter is ready */
  autoRun?: boolean;
}

/**
 * State returned by the hook.
 */
interface NextStepEngineState {
  /** Current engine status */
  status: NextStepStatus;
  
  /** Engine result (null if not yet run) */
  result: NextStepEngineResult | null;
  
  /** Whether integration is in progress */
  isIntegrating: boolean;
  
  /** Integration error message */
  integrationError: string | null;
  
  /** Current letter content */
  currentLetter: string;
  
  /** Whether undo is available */
  canUndo: boolean;
  
  /** Whether redo is available (future feature) */
  canRedo: boolean;
  
  /** Version history for debugging */
  versionCount: number;
}

/**
 * Actions returned by the hook.
 */
interface NextStepEngineActions {
  /** Run the Next-Step inference */
  runInference: (letterText: string, patientContext: NextStepPatientContext, sessionId: string, sourceAgentType: string) => Promise<NextStepEngineResult>;
  
  /** Integrate selected suggestions into the letter */
  integrateSelected: (suggestions: NextStepSuggestion[]) => Promise<string | null>;
  
  /** Revert to the previous letter version */
  undo: () => string | null;
  
  /** Reset the engine state */
  reset: () => void;

  /** Load a stored result for a session without re-running inference */
  hydrateFromSession: (
    letterText: string,
    patientContext: NextStepPatientContext,
    sessionId: string,
    result: NextStepEngineResult | null
  ) => void;
  
  /** Set the current letter (for tracking external edits) */
  setCurrentLetter: (letter: string, source?: string) => void;
  
  /** Clear the integration error */
  clearIntegrationError: () => void;
}

/**
 * Hook for managing the Next-Step Engine.
 */
export function useNextStepEngine(
  options: UseNextStepEngineOptions = {}
): [NextStepEngineState, NextStepEngineActions] {
  const { maxVersions = 10 } = options;
  
  // Engine state
  const [status, setStatus] = useState<NextStepStatus>('idle');
  const [result, setResult] = useState<NextStepEngineResult | null>(null);
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  
  // Letter versioning
  const [versionHistory, setVersionHistory] = useState<LetterVersionHistory>({
    currentIndex: -1,
    versions: [],
    maxVersions
  });
  
  // Current letter content (may include manual edits)
  const [currentLetter, setCurrentLetterState] = useState<string>('');
  
  // Patient context for integration
  const patientContextRef = useRef<NextStepPatientContext>({});
  const sessionIdRef = useRef<string>('');
  
  /**
   * Create a new letter version.
   */
  const createVersion = useCallback((content: string, changeDescription?: string, integratedIds?: string[]): LetterVersion => {
    return {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: Date.now(),
      changeDescription,
      integratedSuggestionIds: integratedIds
    };
  }, []);
  
  /**
   * Add a version to history.
   */
  const addVersion = useCallback((version: LetterVersion) => {
    setVersionHistory(prev => {
      // Truncate any versions after current index (discard redo history)
      const versions = prev.versions.slice(0, prev.currentIndex + 1);
      
      // Add new version
      versions.push(version);
      
      // Trim to max versions
      const trimmedVersions = versions.slice(-maxVersions);
      
      return {
        ...prev,
        versions: trimmedVersions,
        currentIndex: trimmedVersions.length - 1
      };
    });
  }, [maxVersions]);
  
  /**
   * Run the Next-Step inference.
   */
  const runInference = useCallback(async (
    letterText: string,
    patientContext: NextStepPatientContext,
    sessionId: string,
    sourceAgentType: string
  ): Promise<NextStepEngineResult> => {
    // Store context for later integration
    patientContextRef.current = patientContext;
    sessionIdRef.current = sessionId;
    
    // Initialize current letter and create first version
    setCurrentLetterState(letterText);
    const initialVersion = createVersion(letterText, 'Initial letter');
    addVersion(initialVersion);
    
    setStatus('processing');
    setResult(null);
    setIntegrationError(null);
    
    logger.info('useNextStepEngine: Starting inference', {
      component: 'next-step-hook',
      operation: 'run-inference',
      sessionId,
      letterLength: letterText.length
    });
    
    try {
      const agent = getNextStepInferenceAgent();
      const engineResult = await agent.inferNextSteps({
        letterText,
        patientContext,
        sessionId,
        sourceAgentType
      });
      
      setResult(engineResult);
      setStatus(engineResult.status);
      
      logger.info('useNextStepEngine: Inference complete', {
        component: 'next-step-hook',
        operation: 'inference-complete',
        sessionId,
        suggestionCount: engineResult.suggestions.length,
        processingTime: engineResult.processingTime
      });

      return engineResult;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorResult: NextStepEngineResult = {
        suggestions: [],
        status: 'error',
        processingTime: 0,
        error: errorMessage,
        timestamp: Date.now()
      };
      
      setResult(errorResult);
      setStatus('error');
      
      logger.error('useNextStepEngine: Inference failed', error as Error, {
        component: 'next-step-hook',
        operation: 'inference-error',
        sessionId
      });

      return errorResult;
    }
  }, [createVersion, addVersion]);
  
  /**
   * Integrate selected suggestions into the letter.
   */
  const integrateSelected = useCallback(async (suggestions: NextStepSuggestion[]): Promise<string | null> => {
    if (suggestions.length === 0) {
      return null;
    }
    
    setIsIntegrating(true);
    setIntegrationError(null);
    
    logger.info('useNextStepEngine: Starting integration', {
      component: 'next-step-hook',
      operation: 'integrate',
      sessionId: sessionIdRef.current,
      suggestionCount: suggestions.length
    });
    
    try {
      const agent = getNextStepInferenceAgent();
      const integrationResult = await agent.integrateIntoLetter({
        currentLetter,
        suggestions,
        sessionId: sessionIdRef.current,
        patientContext: patientContextRef.current
      });
      
      if (!integrationResult.success) {
        throw new Error(integrationResult.error || 'Integration failed');
      }
      
      // Create new version with the integrated letter
      const newVersion = createVersion(
        integrationResult.rewrittenLetter,
        `Integrated ${suggestions.length} suggestion(s): ${suggestions.map(s => s.title).join(', ')}`,
        integrationResult.integratedSuggestionIds
      );
      addVersion(newVersion);
      
      // Update current letter
      setCurrentLetterState(integrationResult.rewrittenLetter);
      
      logger.info('useNextStepEngine: Integration complete', {
        component: 'next-step-hook',
        operation: 'integrate-complete',
        sessionId: sessionIdRef.current,
        processingTime: integrationResult.processingTime
      });
      
      setIsIntegrating(false);
      return integrationResult.rewrittenLetter;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setIntegrationError(errorMessage);
      setIsIntegrating(false);
      
      logger.error('useNextStepEngine: Integration failed', error as Error, {
        component: 'next-step-hook',
        operation: 'integrate-error',
        sessionId: sessionIdRef.current
      });
      
      return null;
    }
  }, [currentLetter, createVersion, addVersion]);
  
  /**
   * Revert to the previous letter version.
   */
  const undo = useCallback((): string | null => {
    if (versionHistory.currentIndex <= 0) {
      return null;
    }
    
    const previousIndex = versionHistory.currentIndex - 1;
    const previousVersion = versionHistory.versions[previousIndex];
    
    if (!previousVersion) {
      return null;
    }
    
    setVersionHistory(prev => ({
      ...prev,
      currentIndex: previousIndex
    }));
    
    setCurrentLetterState(previousVersion.content);
    
    logger.info('useNextStepEngine: Undo performed', {
      component: 'next-step-hook',
      operation: 'undo',
      sessionId: sessionIdRef.current,
      restoredVersionId: previousVersion.id
    });
    
    return previousVersion.content;
  }, [versionHistory]);
  
  /**
   * Reset the engine state.
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setIsIntegrating(false);
    setIntegrationError(null);
    setCurrentLetterState('');
    setVersionHistory({
      currentIndex: -1,
      versions: [],
      maxVersions
    });
    patientContextRef.current = {};
    sessionIdRef.current = '';
    
    logger.info('useNextStepEngine: Reset', {
      component: 'next-step-hook',
      operation: 'reset'
    });
  }, [maxVersions]);

  /**
   * Hydrate the engine state from a stored session result.
   */
  const hydrateFromSession = useCallback((
    letterText: string,
    patientContext: NextStepPatientContext,
    sessionId: string,
    storedResult: NextStepEngineResult | null
  ) => {
    patientContextRef.current = patientContext;
    sessionIdRef.current = sessionId;

    setCurrentLetterState(letterText);
    setIsIntegrating(false);
    setIntegrationError(null);

    if (letterText && letterText.trim().length > 0) {
      const initialVersion = createVersion(letterText, 'Initial letter');
      setVersionHistory({
        currentIndex: 0,
        versions: [initialVersion],
        maxVersions
      });
    } else {
      setVersionHistory({
        currentIndex: -1,
        versions: [],
        maxVersions
      });
    }

    if (storedResult) {
      setResult(storedResult);
      setStatus(storedResult.status);
    } else {
      setResult(null);
      setStatus('idle');
    }

    logger.info('useNextStepEngine: Hydrated from session', {
      component: 'next-step-hook',
      operation: 'hydrate',
      sessionId,
      hasStoredResult: !!storedResult
    });
  }, [createVersion, maxVersions]);
  
  /**
   * Set the current letter (for tracking external edits).
   */
  const setCurrentLetter = useCallback((letter: string, source?: string) => {
    // Only create a new version if content actually changed
    if (letter !== currentLetter && letter.trim().length > 0) {
      setCurrentLetterState(letter);
      
      // If this is a manual edit, create a version
      if (source === 'manual-edit') {
        const editVersion = createVersion(letter, 'Manual edit');
        addVersion(editVersion);
      }
    }
  }, [currentLetter, createVersion, addVersion]);
  
  /**
   * Clear the integration error.
   */
  const clearIntegrationError = useCallback(() => {
    setIntegrationError(null);
  }, []);
  
  // Compute derived state
  const canUndo = versionHistory.currentIndex > 0;
  const canRedo = versionHistory.currentIndex < versionHistory.versions.length - 1;
  const versionCount = versionHistory.versions.length;
  
  // Memoize state object
  const state = useMemo<NextStepEngineState>(() => ({
    status,
    result,
    isIntegrating,
    integrationError,
    currentLetter,
    canUndo,
    canRedo,
    versionCount
  }), [status, result, isIntegrating, integrationError, currentLetter, canUndo, canRedo, versionCount]);
  
  // Memoize actions object
  const actions = useMemo<NextStepEngineActions>(() => ({
    runInference,
    integrateSelected,
    undo,
    reset,
    hydrateFromSession,
    setCurrentLetter,
    clearIntegrationError
  }), [runInference, integrateSelected, undo, reset, hydrateFromSession, setCurrentLetter, clearIntegrationError]);
  
  return [state, actions];
}
