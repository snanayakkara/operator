/**
 * useGlobalKeyboardShortcuts Hook
 *
 * Per UI Intent Section 5.5: "Global shortcuts bind Shift+Letter to each action's
 * single-key shortcut. E.g., Shift+L immediately starts Quick Letter dictation."
 *
 * This hook provides:
 * - Global Shift+Letter shortcuts that work anytime (not just when command bar is open)
 * - Routes through ActionExecutor for consistent action execution
 * - Respects input field focus (disables when typing)
 */

import { useEffect, useCallback } from 'react';
import { getActionExecutor } from '@/services/ActionExecutor';
import { getActionByShortcut, type InputMode } from '@/config/unifiedActionsConfig';

interface UseGlobalKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Default input mode when triggering actions (default: 'dictate') */
  defaultMode?: InputMode;
  /** Callback when an action is triggered */
  onActionTriggered?: (actionId: string, key: string) => void;
}

/**
 * Hook to enable global Shift+Letter keyboard shortcuts
 *
 * Shortcuts are Shift+Letter combinations to avoid conflicts:
 * - Shift+L: Quick Letter
 * - Shift+C: Consultation (when results not visible)
 * - Shift+T: TAVI Report
 * - Shift+R: Right Heart Cath
 * - Shift+B: Background
 * - Shift+M: Medications
 * - Shift+I: Investigation Summary (when results not visible)
 * - Shift+P: Pre-Op Plan
 *
 * Note: Shift+C and Shift+I are overridden by useResultsKeyboardShortcuts
 * when results are visible (Copy and Insert actions take priority).
 */
export function useGlobalKeyboardShortcuts({
  enabled = true,
  defaultMode = 'dictate',
  onActionTriggered
}: UseGlobalKeyboardShortcutsOptions = {}) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if user is typing in an input field
    const target = event.target as HTMLElement;
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('[role="combobox"]') ||
      target.closest('[data-command-bar]');

    if (isInputField) return;

    // Only process Shift+Letter without other modifiers
    if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    // Must be a single letter key
    if (event.key.length !== 1 || !/[a-zA-Z]/.test(event.key)) return;

    const key = event.key.toUpperCase();
    const action = getActionByShortcut(key);

    if (action && !action.comingSoon) {
      event.preventDefault();
      event.stopPropagation();

      // Determine mode - use first supported mode or default
      const mode = action.modes.includes(defaultMode)
        ? defaultMode
        : action.modes[0];

      // Execute through ActionExecutor
      const executor = getActionExecutor();
      executor.execute(action.id, mode, { origin: 'keyboard' }).then(result => {
        if (result.success) {
          onActionTriggered?.(action.id, key);
        }
      });
    }
  }, [enabled, defaultMode, onActionTriggered]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Global keyboard shortcuts reference for display
 */
export const GLOBAL_SHORTCUTS = {
  'L': { action: 'Quick Letter', mode: 'dictate' },
  'C': { action: 'Consultation', mode: 'dictate' },
  'T': { action: 'TAVI Report', mode: 'dictate' },
  'R': { action: 'Right Heart Cath', mode: 'dictate' },
  'B': { action: 'Background', mode: 'dictate' },
  'M': { action: 'Medications', mode: 'dictate' },
  'I': { action: 'Investigations', mode: 'dictate' },
  'P': { action: 'Pre-Op Plan', mode: 'click' }
} as const;

export default useGlobalKeyboardShortcuts;
