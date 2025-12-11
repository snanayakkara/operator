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
import { Search, Command } from 'lucide-react';
import { colors, animation, radius, shadows, zIndex } from '@/utils/designTokens';
import {
  searchActions,
  getActionByShortcut,
  ACTION_GROUPS,
  type UnifiedAction,
  type ActionGroup as ActionGroupType
} from '@/config/unifiedActionsConfig';

export interface CommandBarProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer should open */
  onOpen: () => void;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Callback when action is selected */
  onActionSelect: (action: UnifiedAction, mode?: 'dictate' | 'type' | 'vision') => void;
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

export const CommandBar: React.FC<CommandBarProps> = memo(({
  isOpen,
  onOpen,
  onClose,
  onActionSelect,
  placeholder = 'Search actions...',
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
          onActionSelect(action);
          handleClose();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, onOpen, onActionSelect]);

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
          onActionSelect(flatActions[focusedIndex]);
          handleClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  }, [focusedIndex, flatActions, onActionSelect]);

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

        {/* Keyboard hint */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="
            flex items-center gap-1
            px-1.5 py-0.5
            text-[10px] font-medium
            bg-neutral-100 text-neutral-500
            rounded
          ">
            <Command size={10} />K
          </span>
        </div>
      </motion.div>

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
                  <div className="py-1">
                    {group.actions.map((action) => {
                      const flatIndex = flatActions.indexOf(action);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <button
                          key={action.id}
                          onClick={() => {
                            onActionSelect(action);
                            handleClose();
                          }}
                          onMouseEnter={() => setFocusedIndex(flatIndex)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2
                            text-left
                            transition-colors
                            ${isFocused ? 'bg-violet-50' : 'hover:bg-neutral-50'}
                          `}
                          style={{ transitionDuration: `${animation.duration.fast}ms` }}
                          role="option"
                          aria-selected={isFocused}
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

                          {/* Shortcut */}
                          {action.shortcut && (
                            <span className={`
                              px-1.5 py-0.5
                              text-[10px] font-medium
                              rounded
                              ${isFocused
                                ? 'bg-violet-100 text-violet-600'
                                : 'bg-neutral-100 text-neutral-500'
                              }
                            `}>
                              {action.shortcut}
                            </span>
                          )}

                          {/* Mode selector buttons */}
                          {action.modes.length > 1 && (
                            <div className="flex gap-0.5">
                              {action.modes.includes('dictate') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onActionSelect(action, 'dictate');
                                    handleClose();
                                  }}
                                  className="
                                    px-1.5 py-0.5 rounded
                                    text-[9px] font-bold
                                    text-blue-600 hover:bg-blue-100
                                    transition-colors
                                  "
                                  title="Dictate"
                                >
                                  D
                                </button>
                              )}
                              {action.modes.includes('type') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onActionSelect(action, 'type');
                                    handleClose();
                                  }}
                                  className="
                                    px-1.5 py-0.5 rounded
                                    text-[9px] font-bold
                                    text-purple-600 hover:bg-purple-100
                                    transition-colors
                                  "
                                  title="Type"
                                >
                                  T
                                </button>
                              )}
                              {action.modes.includes('vision') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onActionSelect(action, 'vision');
                                    handleClose();
                                  }}
                                  className="
                                    px-1.5 py-0.5 rounded
                                    text-[9px] font-bold
                                    text-cyan-600 hover:bg-cyan-100
                                    transition-colors
                                  "
                                  title="Vision (scan image)"
                                >
                                  V
                                </button>
                              )}
                            </div>
                          )}

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
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Footer hint */}
            <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-100">
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>↑↓ Navigate • Enter Select • Click D/T/V for mode</span>
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
