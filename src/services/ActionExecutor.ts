/**
 * ActionExecutor Service
 *
 * Central action execution pathway following UI Intent Section 4:
 * "All actions flow through [the registry]: command bar, keyboard shortcuts,
 * card footers, agent footers, favourites bar, help/discovery"
 *
 * This service provides:
 * - Unified execute() method for all action types
 * - Action availability checks
 * - Pre/post execution hooks
 * - Error capture for command bar display
 * - Event-based communication for UI updates
 */

import {
  type UnifiedAction,
  type InputMode,
  getActionById,
  getAllActions
} from '@/config/unifiedActionsConfig';
import type { AgentType as _AgentType } from '@/types/medical.types';

// ============================================
// Types
// ============================================

/**
 * Context provided to action handlers
 */
export interface ActionContext {
  /** Current patient session ID (if any) */
  sessionId?: string | null;
  /** Quick action field for EMR insertion */
  quickActionField?: string;
  /** Source of action invocation */
  origin: 'command-bar' | 'favourites' | 'keyboard' | 'card-footer' | 'agent-footer';
}

/**
 * Result of action execution
 */
export interface ActionResult {
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Suggested next step for user (gently corrective) */
  suggestion?: string;
  /** Data returned by action (if any) */
  data?: unknown;
}

/**
 * Handler function signature for action execution
 */
export type ActionHandler = (
  action: UnifiedAction,
  mode: InputMode | undefined,
  context: ActionContext
) => Promise<ActionResult> | ActionResult;

/**
 * Event types emitted by ActionExecutor
 */
export type ActionExecutorEventType =
  | 'action:start'
  | 'action:complete'
  | 'action:error'
  | 'error:set'
  | 'error:clear'
  | 'clarification:request'
  | 'clarification:clear';

export interface ActionExecutorEvent {
  type: ActionExecutorEventType;
  actionId?: string;
  mode?: InputMode;
  error?: string;
  suggestion?: string;
  result?: ActionResult;
  clarification?: ClarificationRequest;
}

export type ActionExecutorListener = (event: ActionExecutorEvent) => void;

// ============================================
// Clarification Types (UI Intent Section 9)
// ============================================

/**
 * A field to request from the user during clarification
 */
export interface ClarificationField {
  /** Unique field identifier */
  id: string;
  /** Display label */
  label: string;
  /** Input type */
  type: 'text' | 'number' | 'select';
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Options for select type */
  options?: { value: string; label: string }[];
  /** Default value */
  defaultValue?: string;
  /** Helper text shown below field */
  helperText?: string;
}

/**
 * Request for user clarification before action can proceed
 * Per UI Intent Section 9: "Ask follow-up questions IN the command bar"
 */
export interface ClarificationRequest {
  /** Action that needs clarification */
  actionId: string;
  /** Message to user explaining what's needed */
  message: string;
  /** Fields to collect (≤3 shown at once, >3 uses stepper) */
  fields: ClarificationField[];
  /** Called when user submits clarification values */
  onSubmit: (values: Record<string, string>) => Promise<ActionResult>;
  /** Called when user cancels clarification */
  onCancel?: () => void;
}

// ============================================
// ActionExecutor Class
// ============================================

/**
 * Singleton service for centralized action execution
 */
export class ActionExecutor {
  private static instance: ActionExecutor | null = null;
  private handlers: Map<string, ActionHandler> = new Map();
  private listeners: Set<ActionExecutorListener> = new Set();
  private currentError: { message: string; suggestion?: string } | null = null;
  private currentClarification: ClarificationRequest | null = null;
  private isExecuting = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ActionExecutor {
    if (!ActionExecutor.instance) {
      ActionExecutor.instance = new ActionExecutor();
    }
    return ActionExecutor.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    ActionExecutor.instance = null;
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Subscribe to executor events
   */
  subscribe(listener: ActionExecutorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ActionExecutorEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('[ActionExecutor] Listener error:', err);
      }
    });
  }

  // ============================================
  // Handler Registration
  // ============================================

  /**
   * Register a handler for a specific action ID
   */
  registerHandler(actionId: string, handler: ActionHandler): void {
    this.handlers.set(actionId, handler);
  }

  /**
   * Register handlers for multiple actions
   */
  registerHandlers(handlers: Record<string, ActionHandler>): void {
    Object.entries(handlers).forEach(([actionId, handler]) => {
      this.registerHandler(actionId, handler);
    });
  }

  /**
   * Check if a handler is registered for an action
   */
  hasHandler(actionId: string): boolean {
    return this.handlers.has(actionId);
  }

  // ============================================
  // Action Availability
  // ============================================

  /**
   * Check if an action is available for execution
   */
  isActionAvailable(actionId: string, mode?: InputMode): boolean {
    const action = getActionById(actionId);
    if (!action) return false;

    // Check if coming soon
    if (action.comingSoon) return false;

    // Check if mode is supported
    if (mode && !action.modes.includes(mode)) return false;

    // Check if handler is registered
    if (!this.handlers.has(actionId)) {
      // Allow actions that route to agents even without explicit handler
      return !!action.agentType;
    }

    return true;
  }

  /**
   * Get all available actions
   */
  getAvailableActions(): UnifiedAction[] {
    return getAllActions().filter(action =>
      !action.comingSoon && (this.handlers.has(action.id) || action.agentType)
    );
  }

  // ============================================
  // Error Management
  // ============================================

  /**
   * Get current error (for command bar display)
   */
  getCurrentError(): { message: string; suggestion?: string } | null {
    return this.currentError;
  }

  /**
   * Set error (surfaces in command bar per UI Intent Section 8)
   */
  setError(message: string, suggestion?: string): void {
    this.currentError = { message, suggestion };
    this.emit({ type: 'error:set', error: message, suggestion });
  }

  /**
   * Clear error (called on next command)
   */
  clearError(): void {
    if (this.currentError) {
      this.currentError = null;
      this.emit({ type: 'error:clear' });
    }
  }

  /**
   * Route a background error to the command bar
   * (per UI Intent Section 8: errors surface in command bar, not toasts)
   *
   * Use this for service failures, connection issues, etc.
   * that occur outside of direct action execution.
   */
  errorFromBackground(
    message: string,
    options?: {
      suggestion?: string;
      /** Auto-clear after milliseconds (default: no auto-clear) */
      autoClearMs?: number;
      /** Category for grouping/filtering */
      category?: 'service' | 'transcription' | 'generation' | 'storage';
    }
  ): void {
    this.setError(message, options?.suggestion);

    if (options?.autoClearMs && options.autoClearMs > 0) {
      setTimeout(() => this.clearError(), options.autoClearMs);
    }
  }

  // ============================================
  // Clarification Management (UI Intent Section 9)
  // ============================================

  /**
   * Get current clarification request (for command bar display)
   */
  getCurrentClarification(): ClarificationRequest | null {
    return this.currentClarification;
  }

  /**
   * Request clarification from user before action can proceed
   * Per UI Intent Section 9: "Ask follow-up questions IN the command bar"
   *
   * @param request - The clarification request with fields to collect
   */
  requestClarification(request: ClarificationRequest): void {
    // Clear any existing error when requesting clarification
    this.clearError();

    this.currentClarification = request;
    this.emit({
      type: 'clarification:request',
      actionId: request.actionId,
      clarification: request
    });
  }

  /**
   * Clear clarification (called on cancel or after submit)
   */
  clearClarification(): void {
    if (this.currentClarification) {
      const onCancel = this.currentClarification.onCancel;
      this.currentClarification = null;
      this.emit({ type: 'clarification:clear' });
      onCancel?.();
    }
  }

  /**
   * Submit clarification values and retry the action
   */
  async submitClarification(values: Record<string, string>): Promise<ActionResult> {
    if (!this.currentClarification) {
      return {
        success: false,
        error: 'No clarification pending',
        suggestion: 'Try starting the action again'
      };
    }

    const { onSubmit } = this.currentClarification;

    // Clear clarification before submitting (prevents double-submit)
    this.currentClarification = null;
    this.emit({ type: 'clarification:clear' });

    try {
      const result = await onSubmit(values);

      if (!result.success) {
        this.setError(result.error || 'Action failed', result.suggestion);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.setError(errorMessage, 'Please try again');
      return {
        success: false,
        error: errorMessage,
        suggestion: 'Please try again'
      };
    }
  }

  // ============================================
  // Action Execution
  // ============================================

  /**
   * Execute an action through the central registry
   *
   * This is the ONLY way actions should be executed in Operator.
   * UI components must call this method, never bypass to handlers directly.
   */
  async execute(
    actionId: string,
    mode?: InputMode,
    context: Partial<ActionContext> = {}
  ): Promise<ActionResult> {
    // Clear previous error and clarification on new command (per UI Intent Section 8)
    this.clearError();
    if (this.currentClarification) {
      this.currentClarification = null;
      this.emit({ type: 'clarification:clear' });
    }

    // Prevent concurrent execution
    if (this.isExecuting) {
      return {
        success: false,
        error: 'Action already in progress',
        suggestion: 'Please wait for the current action to complete'
      };
    }

    const action = getActionById(actionId);
    if (!action) {
      const result: ActionResult = {
        success: false,
        error: `Unknown action: ${actionId}`,
        suggestion: 'Try searching in the command bar'
      };
      this.setError(result.error!, result.suggestion);
      return result;
    }

    // Check if action is available
    if (action.comingSoon) {
      const result: ActionResult = {
        success: false,
        error: `${action.label} is coming soon`,
        suggestion: 'This feature is not yet available'
      };
      this.setError(result.error!, result.suggestion);
      return result;
    }

    // Check if mode is supported
    if (mode && !action.modes.includes(mode)) {
      const result: ActionResult = {
        success: false,
        error: `${action.label} does not support ${mode} mode`,
        suggestion: `Available modes: ${action.modes.join(', ')}`
      };
      this.setError(result.error!, result.suggestion);
      return result;
    }

    // Build full context
    const fullContext: ActionContext = {
      sessionId: null,
      origin: 'command-bar',
      ...context,
      quickActionField: context.quickActionField || action.quickActionField
    };

    // Find handler
    const handler = this.handlers.get(actionId);
    if (!handler) {
      // For actions without explicit handlers but with agentType,
      // we need the app to have registered a default workflow handler
      const defaultHandler = this.handlers.get('__default_workflow__');
      if (defaultHandler && action.agentType) {
        return this.executeWithHandler(action, defaultHandler, mode, fullContext);
      }

      const result: ActionResult = {
        success: false,
        error: `No handler registered for: ${action.label}`,
        suggestion: 'This action is not yet implemented'
      };
      this.setError(result.error!, result.suggestion);
      return result;
    }

    return this.executeWithHandler(action, handler, mode, fullContext);
  }

  private async executeWithHandler(
    action: UnifiedAction,
    handler: ActionHandler,
    mode: InputMode | undefined,
    context: ActionContext
  ): Promise<ActionResult> {
    this.isExecuting = true;
    this.emit({ type: 'action:start', actionId: action.id, mode });

    try {
      console.log(`[ActionExecutor] Executing: ${action.id} (${mode || 'default'})`, context);

      const result = await handler(action, mode, context);

      if (result.success) {
        this.emit({ type: 'action:complete', actionId: action.id, mode, result });
      } else {
        this.setError(result.error || 'Action failed', result.suggestion);
        this.emit({ type: 'action:error', actionId: action.id, error: result.error });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const result: ActionResult = {
        success: false,
        error: errorMessage,
        suggestion: 'Please try again or check the console for details'
      };

      this.setError(result.error!, result.suggestion);
      this.emit({ type: 'action:error', actionId: action.id, error: result.error });

      console.error(`[ActionExecutor] Error executing ${action.id}:`, err);
      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute by shortcut key (for global keyboard handler)
   */
  async executeByShortcut(
    key: string,
    mode?: InputMode,
    context: Partial<ActionContext> = {}
  ): Promise<ActionResult | null> {
    const upperKey = key.toUpperCase();
    const actions = getAllActions();
    const action = actions.find(a => a.shortcut === upperKey);

    if (!action) {
      return null; // No action for this shortcut
    }

    return this.execute(action.id, mode, { ...context, origin: 'keyboard' });
  }
}

// ============================================
// Convenience Export
// ============================================

/**
 * Get the ActionExecutor singleton instance
 */
export const getActionExecutor = (): ActionExecutor => ActionExecutor.getInstance();
