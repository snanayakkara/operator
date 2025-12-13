/**
 * CommandBar Component
 *
 * Search input with inline dropdown for navigating all actions.
 * Features:
 * - ⌘K or / to open
 * - Fuzzy search across all workflows and actions
 * - Keyboard navigation (arrows, Enter, ESC)
 * - Single-key shortcuts when open
 * - Slides down from input (dropdown style)
 * - Error display slot (per UI Intent Section 8)
 * - Optional ActionExecutor integration for unified action dispatch
 */

import React, {
  memo,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Mic, Keyboard, Camera, AlertCircle } from 'lucide-react';
import { colors, animation, radius, shadows, zIndex } from '@/utils/designTokens';
import {
  searchActions,
  getActionByShortcut,
  ACTION_GROUPS,
  type UnifiedAction,
  type ActionGroup as ActionGroupType,
  type InputMode
} from '@/config/unifiedActionsConfig';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { ClarificationForm } from './ClarificationForm';

export interface CommandBarProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer should open */
  onOpen: () => void;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Callback when action is selected (legacy - use executor when available) */
  onActionSelect: (action: UnifiedAction, mode?: 'dictate' | 'type' | 'vision') => void;
  /** Whether to use ActionExecutor for action dispatch (default: true) */
  useExecutor?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className */
  className?: string;
}

const inputVariants = {
  idle: {
    boxShadow: shadows.sm,
    borderColor: colors.neutral[200]
  },
  focused: {
    boxShadow: shadows.focusRing,
    borderColor: colors.primary.DEFAULT
  }
};

const modeSplitVariants = {
  hidden: { opacity: 0, width: 0 },
  visible: { opacity: 1, width: 'auto' }
};

/**
 * ActionRow - Individual action item with hover-reveal mode selector
 */
interface ActionRowProps {
  action: UnifiedAction;
  isFocused: boolean;
  onSelect: (action: UnifiedAction, mode?: 'dictate' | 'type' | 'vision') => void;
  onMouseEnter: () => void;
}

const ActionRow: React.FC<ActionRowProps> = memo(({
  action,
  isFocused,
  onSelect,
  onMouseEnter
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasMultipleModes = action.modes.length > 1;

  return (
    <div
      className={`
        relative flex items-center gap-3 px-3 py-2
        cursor-pointer
        transition-colors
        ${isFocused ? 'bg-violet-50' : 'hover:bg-neutral-50'}
      `}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter();
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(action)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(action);
        }
      }}
      tabIndex={0}
    >
      {/* Icon */}
      <action.icon
        size={16}
        className={isFocused ? 'text-violet-600' : 'text-neutral-500'}
        strokeWidth={1.5}
      />

      {/* Label & Description */}
      <div className="flex-1 min-w-0">
        <div className={`
          text-[13px] font-medium truncate
          ${isFocused ? 'text-violet-900' : 'text-neutral-700'}
        `}>
          {action.label}
        </div>
        <div className="text-[11px] text-neutral-500 truncate">
          {action.description}
        </div>
      </div>

      {/* Right side: Shortcut OR Mode split on hover */}
      <div className="flex items-center gap-1.5">
        {/* Shortcut badge - hide when hovering multi-mode actions */}
        <AnimatePresence>
          {action.shortcut && !(hasMultipleModes && isHovered) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`
                px-1.5 py-0.5
                text-[10px] font-medium
                rounded
                ${isFocused
                  ? 'bg-violet-100 text-violet-600'
                  : 'bg-neutral-100 text-neutral-500'
                }
              `}
            >
              {action.shortcut}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Mode split - reveal on hover for multi-mode actions */}
        <AnimatePresence>
          {hasMultipleModes && isHovered && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modeSplitVariants}
              transition={{ duration: animation.duration.fast / 1000 }}
              className="flex overflow-hidden rounded-md border border-neutral-200"
            >
              {action.modes.includes('dictate') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(action, 'dictate');
                  }}
                  className="
                    flex items-center gap-1 px-2 py-1
                    text-[10px] font-semibold
                    text-blue-600 bg-blue-50
                    hover:bg-blue-100
                    transition-colors
                    border-r border-neutral-200
                    last:border-r-0
                  "
                  title="Dictate"
                >
                  <Mic size={14} strokeWidth={2} />
                  <span>D</span>
                </button>
              )}
              {action.modes.includes('type') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(action, 'type');
                  }}
                  className="
                    flex items-center gap-1 px-2 py-1
                    text-[10px] font-semibold
                    text-purple-600 bg-purple-50
                    hover:bg-purple-100
                    transition-colors
                    border-r border-neutral-200
                    last:border-r-0
                  "
                  title="Type"
                >
                  <Keyboard size={14} strokeWidth={2} />
                  <span>T</span>
                </button>
              )}
              {action.modes.includes('vision') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(action, 'vision');
                  }}
                  className="
                    flex items-center gap-1 px-2 py-1
                    text-[10px] font-semibold
                    text-cyan-600 bg-cyan-50
                    hover:bg-cyan-100
                    transition-colors
                  "
                  title="Vision (scan image)"
                >
                  <Camera size={14} strokeWidth={2} />
                  <span>V</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coming soon badge */}
        {action.comingSoon && (
          <span className="
            px-1.5 py-0.5
            text-[9px] font-semibold uppercase
            bg-amber-100 text-amber-700
            rounded-full
          ">
            Soon
          </span>
        )}
      </div>
    </div>
  );
});

ActionRow.displayName = 'ActionRow';

export const CommandBar: React.FC<CommandBarProps> = memo(({
  isOpen,
  onOpen,
  onClose,
  onActionSelect,
  useExecutor = true,
  placeholder = 'Search actions...',
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ActionExecutor integration for unified action dispatch and clarification (UI Intent Section 9)
  const {
    execute,
    error,
    isExecuting,
    clarification,
    submitClarification,
    cancelClarification
  } = useActionExecutor();

  // Unified action dispatch - uses executor or falls back to callback
  const dispatchAction = useCallback(async (action: UnifiedAction, mode?: 'dictate' | 'type' | 'vision') => {
    if (useExecutor) {
      // Use central ActionExecutor (preferred path per UI Intent Section 4)
      await execute(action.id, mode as InputMode, { origin: 'command-bar' });
    } else {
      // Legacy callback path
      onActionSelect(action, mode);
    }
  }, [useExecutor, execute, onActionSelect]);

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    return searchActions(query);
  }, [query]);

  // Group filtered actions
  const groupedActions = useMemo(() => {
    const groups = new Map<ActionGroupType, UnifiedAction[]>();

    filteredActions.forEach(action => {
      const existing = groups.get(action.group) || [];
      existing.push(action);
      groups.set(action.group, existing);
    });

    // Return in order of ACTION_GROUPS
    return ACTION_GROUPS
      .map(groupMeta => ({
        ...groupMeta,
        actions: groups.get(groupMeta.id) || []
      }))
      .filter(g => g.actions.length > 0);
  }, [filteredActions]);

  // Flatten for keyboard navigation
  const flatActions = useMemo(() => {
    return groupedActions.flatMap(g => g.actions);
  }, [groupedActions]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or / to open
      if ((e.metaKey && e.key === 'k') || (e.key === '/' && !isOpen)) {
        e.preventDefault();
        if (!isOpen) {
          onOpen();
          inputRef.current?.focus();
        }
        return;
      }

      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
        return;
      }

      // Single-key shortcuts when drawer is open and no query
      if (isOpen && query === '' && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        const action = getActionByShortcut(e.key);
        if (action) {
          e.preventDefault();
          dispatchAction(action);
          handleClose();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, onOpen, dispatchAction]);

  // Handle input keyboard navigation
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < flatActions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : flatActions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && flatActions[focusedIndex]) {
          dispatchAction(flatActions[focusedIndex]);
          handleClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  }, [focusedIndex, flatActions, dispatchAction]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (!isOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  // Handle close
  const handleClose = useCallback(() => {
    setQuery('');
    setFocusedIndex(-1);
    onClose();
    inputRef.current?.blur();
  }, [onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  // Reset focused index when query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [query]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ zIndex: zIndex.dropdown }}
    >
      {/* Search Input */}
      <motion.div
        className="relative"
        variants={inputVariants}
        animate={isOpen ? 'focused' : 'idle'}
        transition={{ duration: animation.duration.fast / 1000 }}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search size={16} className="text-neutral-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="
            w-full pl-9 pr-12 py-2.5
            text-[13px] text-neutral-900 placeholder-neutral-400
            bg-white border rounded-lg
            outline-none
            transition-all
          "
          style={{
            borderRadius: radius.md,
            borderColor: isOpen ? colors.primary.DEFAULT : colors.neutral[200],
            boxShadow: isOpen ? shadows.focusRing : shadows.sm,
            transitionDuration: `${animation.duration.fast}ms`
          }}
          aria-label="Search actions"
          aria-expanded={isOpen}
          aria-controls="command-bar-dropdown"
          role="combobox"
        />

        {/* Keyboard hint - hide when executing */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isExecuting ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-600 rounded animate-pulse">
              Running...
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-500 rounded">
              <Command size={10} />K
            </span>
          )}
        </div>
      </motion.div>

      {/* Error Display Slot (per UI Intent Section 8) */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: animation.duration.fast / 1000 }}
            className="mt-1.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-rose-800">
                  {error.message}
                </p>
                {error.suggestion && (
                  <p className="text-[11px] text-rose-600 mt-0.5">
                    {error.suggestion}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clarification Form Slot (per UI Intent Section 9) */}
      <AnimatePresence>
        {clarification && (
          <ClarificationForm
            request={clarification}
            onSubmit={submitClarification}
            onCancel={cancelClarification}
          />
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="command-bar-dropdown"
            role="listbox"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{
              duration: animation.duration.normal / 1000,
              ease: animation.easing.out
            }}
            className="
              absolute top-full left-0 right-0 mt-1
              bg-white border border-neutral-200
              rounded-lg overflow-hidden
            "
            style={{
              borderRadius: radius.lg,
              boxShadow: shadows.dropdown,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto'
            }}
          >
            {groupedActions.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                No actions found for "{query}"
              </div>
            ) : (
              groupedActions.map((group, groupIndex) => (
                <div key={group.id} className={groupIndex > 0 ? 'border-t border-neutral-100' : ''}>
                  {/* Group Header */}
                  <div className="px-3 py-2 bg-neutral-50">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      {group.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="py-1" role="group">
                    {group.actions.map((action) => {
                      const flatIndex = flatActions.indexOf(action);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <ActionRow
                          key={action.id}
                          action={action}
                          isFocused={isFocused}
                          onSelect={(a, mode) => {
                            dispatchAction(a, mode);
                            handleClose();
                          }}
                          onMouseEnter={() => setFocusedIndex(flatIndex)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Footer hint */}
            <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-100">
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>↑↓ Navigate • Enter Select • Hover for D|T|V</span>
                <span>Single key shortcuts when empty</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CommandBar.displayName = 'CommandBar';

export default CommandBar;
