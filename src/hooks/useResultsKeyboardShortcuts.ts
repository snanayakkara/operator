/**
 * useResultsKeyboardShortcuts Hook
 * 
 * Provides keyboard shortcuts for Copy (Shift+C) and Insert (Shift+I) actions
 * in the results panel. Only active when results are visible.
 * 
 * Uses Shift+letter combinations to avoid conflicts with Chrome shortcuts.
 */

import { useEffect, useCallback } from 'react';

interface UseResultsKeyboardShortcutsOptions {
  /** Handler for copy action (Shift+C) */
  onCopy?: () => void;
  /** Handler for insert action (Shift+I) */
  onInsert?: () => void;
  /** Whether shortcuts are enabled (e.g., results are visible) */
  enabled?: boolean;
}

/**
 * Hook to enable keyboard shortcuts for results panel actions
 * 
 * Shortcuts:
 * - Shift+C: Copy to clipboard
 * - Shift+I: Insert to EMR
 */
export function useResultsKeyboardShortcuts({
  onCopy,
  onInsert,
  enabled = true
}: UseResultsKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only process if enabled
    if (!enabled) return;

    // Ignore if user is typing in an input field
    const target = event.target as HTMLElement;
    const isInputField = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable;
    
    if (isInputField) return;

    // Check for Shift key without Ctrl/Alt/Meta modifiers
    if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    switch (event.key.toLowerCase()) {
      case 'c':
        if (onCopy) {
          event.preventDefault();
          onCopy();
        }
        break;
      case 'i':
        if (onInsert) {
          event.preventDefault();
          onInsert();
        }
        break;
    }
  }, [onCopy, onInsert, enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Keyboard shortcut hint text for display in UI
 */
export const KEYBOARD_SHORTCUTS = {
  copy: '⇧C',
  insert: '⇧I'
} as const;

export default useResultsKeyboardShortcuts;
