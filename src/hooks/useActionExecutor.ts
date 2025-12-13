/**
 * useActionExecutor Hook
 *
 * React hook providing access to the centralized ActionExecutor service.
 * Manages reactive state for:
 * - Current command bar error
 * - Action execution state
 * - Handler registration
 *
 * Usage:
 * ```tsx
 * const { execute, error, clearError, isExecuting, registerHandlers } = useActionExecutor();
 *
 * // Execute an action
 * await execute('quick-letter', 'dictate', { origin: 'command-bar' });
 *
 * // Display error in command bar
 * if (error) {
 *   return <ErrorDisplay message={error.message} suggestion={error.suggestion} />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ActionExecutor,
  getActionExecutor,
  type ActionHandler,
  type ActionContext,
  type ActionResult,
  type ActionExecutorEvent,
  type ClarificationRequest
} from '@/services/ActionExecutor';
import type { InputMode, UnifiedAction } from '@/config/unifiedActionsConfig';

// ============================================
// Types
// ============================================

export interface CommandBarError {
  message: string;
  suggestion?: string;
}

export interface UseActionExecutorReturn {
  /**
   * Execute an action by ID
   */
  execute: (
    actionId: string,
    mode?: InputMode,
    context?: Partial<ActionContext>
  ) => Promise<ActionResult>;

  /**
   * Execute an action by shortcut key
   */
  executeByShortcut: (
    key: string,
    mode?: InputMode,
    context?: Partial<ActionContext>
  ) => Promise<ActionResult | null>;

  /**
   * Current error to display in command bar
   */
  error: CommandBarError | null;

  /**
   * Clear the current error
   */
  clearError: () => void;

  /**
   * Set an error (for non-action errors like background failures)
   */
  setError: (message: string, suggestion?: string) => void;

  /**
   * Whether an action is currently executing
   */
  isExecuting: boolean;

  /**
   * Current clarification request (UI Intent Section 9)
   */
  clarification: ClarificationRequest | null;

  /**
   * Submit clarification values
   */
  submitClarification: (values: Record<string, string>) => Promise<ActionResult>;

  /**
   * Cancel clarification
   */
  cancelClarification: () => void;

  /**
   * Register action handlers
   */
  registerHandlers: (handlers: Record<string, ActionHandler>) => void;

  /**
   * Register a single handler
   */
  registerHandler: (actionId: string, handler: ActionHandler) => void;

  /**
   * Check if action is available
   */
  isActionAvailable: (actionId: string, mode?: InputMode) => boolean;

  /**
   * Get all available actions
   */
  getAvailableActions: () => UnifiedAction[];

  /**
   * The executor instance (for advanced usage)
   */
  executor: ActionExecutor;
}

// ============================================
// Hook Implementation
// ============================================

export function useActionExecutor(): UseActionExecutorReturn {
  const executorRef = useRef<ActionExecutor>(getActionExecutor());
  const [error, setErrorState] = useState<CommandBarError | null>(null);
  const [clarification, setClarification] = useState<ClarificationRequest | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Subscribe to executor events
  useEffect(() => {
    const executor = executorRef.current;

    const handleEvent = (event: ActionExecutorEvent) => {
      switch (event.type) {
        case 'action:start':
          setIsExecuting(true);
          break;

        case 'action:complete':
        case 'action:error':
          setIsExecuting(false);
          break;

        case 'error:set':
          setErrorState({
            message: event.error || 'An error occurred',
            suggestion: event.suggestion
          });
          break;

        case 'error:clear':
          setErrorState(null);
          break;

        case 'clarification:request':
          setClarification(event.clarification || null);
          break;

        case 'clarification:clear':
          setClarification(null);
          break;
      }
    };

    const unsubscribe = executor.subscribe(handleEvent);

    // Sync initial state
    const currentError = executor.getCurrentError();
    if (currentError) {
      setErrorState(currentError);
    }
    const currentClarification = executor.getCurrentClarification();
    if (currentClarification) {
      setClarification(currentClarification);
    }

    return unsubscribe;
  }, []);

  // Memoized execute function
  const execute = useCallback(
    async (
      actionId: string,
      mode?: InputMode,
      context?: Partial<ActionContext>
    ): Promise<ActionResult> => {
      return executorRef.current.execute(actionId, mode, context);
    },
    []
  );

  // Memoized executeByShortcut function
  const executeByShortcut = useCallback(
    async (
      key: string,
      mode?: InputMode,
      context?: Partial<ActionContext>
    ): Promise<ActionResult | null> => {
      return executorRef.current.executeByShortcut(key, mode, context);
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    executorRef.current.clearError();
  }, []);

  // Set error (for background/async errors)
  const setError = useCallback((message: string, suggestion?: string) => {
    executorRef.current.setError(message, suggestion);
  }, []);

  // Register handlers
  const registerHandlers = useCallback((handlers: Record<string, ActionHandler>) => {
    executorRef.current.registerHandlers(handlers);
  }, []);

  // Register single handler
  const registerHandler = useCallback((actionId: string, handler: ActionHandler) => {
    executorRef.current.registerHandler(actionId, handler);
  }, []);

  // Check action availability
  const isActionAvailable = useCallback((actionId: string, mode?: InputMode) => {
    return executorRef.current.isActionAvailable(actionId, mode);
  }, []);

  // Get available actions
  const getAvailableActions = useCallback(() => {
    return executorRef.current.getAvailableActions();
  }, []);

  // Submit clarification values (UI Intent Section 9)
  const submitClarification = useCallback(
    async (values: Record<string, string>): Promise<ActionResult> => {
      return executorRef.current.submitClarification(values);
    },
    []
  );

  // Cancel clarification
  const cancelClarification = useCallback(() => {
    executorRef.current.clearClarification();
  }, []);

  return useMemo(
    () => ({
      execute,
      executeByShortcut,
      error,
      clearError,
      setError,
      isExecuting,
      clarification,
      submitClarification,
      cancelClarification,
      registerHandlers,
      registerHandler,
      isActionAvailable,
      getAvailableActions,
      executor: executorRef.current
    }),
    [
      execute,
      executeByShortcut,
      error,
      clearError,
      setError,
      isExecuting,
      clarification,
      submitClarification,
      cancelClarification,
      registerHandlers,
      registerHandler,
      isActionAvailable,
      getAvailableActions
    ]
  );
}

// ============================================
// Helper Hook: Register Handlers on Mount
// ============================================

/**
 * Hook to register action handlers when a component mounts.
 * Useful for OptimizedApp to register all its workflow handlers.
 *
 * Usage:
 * ```tsx
 * useRegisterActionHandlers({
 *   'quick-letter': async (action, mode, ctx) => {
 *     // Handle quick letter
 *     return { success: true };
 *   },
 *   'consultation': async (action, mode, ctx) => {
 *     // Handle consultation
 *     return { success: true };
 *   }
 * });
 * ```
 */
export function useRegisterActionHandlers(
  handlers: Record<string, ActionHandler>
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const executor = getActionExecutor();

    // Register all handlers
    Object.entries(handlersRef.current).forEach(([actionId, handler]) => {
      executor.registerHandler(actionId, handler);
    });

    // Note: We don't unregister on unmount because handlers should persist
    // The executor is a singleton that lives for the app's lifetime
  }, []); // Only run once on mount
}

// ============================================
// Context-Based Alternative (Optional)
// ============================================

/**
 * For cases where you want to pass executor via context instead of singleton,
 * you can create an ActionExecutorContext. However, the singleton pattern
 * is preferred for Operator since there's only one executor instance.
 */

export default useActionExecutor;
