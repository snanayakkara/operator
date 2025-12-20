/**
 * CommandBar Component
 *
 * Search input with inline dropdown for navigating all actions.
 * Features:
 * - ⌘K or / to open
 * - Fuzzy search across all workflows and actions
 * - Keyboard navigation (arrows, Enter, ESC)
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
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Search, Command, Mic, Keyboard, Camera, AlertCircle } from 'lucide-react';
import { colors, animation, radius, shadows, zIndex } from '@/utils/designTokens';
import {
  searchActions,
  ACTION_GROUPS,
  type UnifiedAction,
  type ActionGroup as ActionGroupType,
  type InputMode
} from '@/config/unifiedActionsConfig';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { ClarificationForm } from './ClarificationForm';

type SelectableMode = 'dictate' | 'type' | 'vision';

const MODE_ORDER: SelectableMode[] = ['dictate', 'type', 'vision'];

function getSelectableModes(action: UnifiedAction | null | undefined): SelectableMode[] {
  if (!action) return [];
  return MODE_ORDER.filter(mode => action.modes.includes(mode));
}

export interface CommandBarProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer should open */
  onOpen: () => void;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Whether hovering the bar should focus/open it (default: false) */
  activateOnHover?: boolean;
  /** Optional callback when query changes (for coordinating surrounding UI) */
  onQueryChange?: (query: string) => void;
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
 * Motion tuning notes (CommandBar dropdown):
 * - Panel: tweak `PANEL_SPRING` for the "mechanical lock-in" settle feel.
 * - Active row: tweak `ACTIVE_ROW_SPRING` for the "magnetic" glide.
 * - Item reveal: tweak `ITEM_STAGGER_SEC` and `ITEM_STAGGER_CAP` for subtle stagger.
 */
const PANEL_SPRING = {
  type: 'spring',
  stiffness: 520,
  damping: 32,
  mass: 1.0,
  bounce: 0.22
} as const;

const ACTIVE_ROW_SPRING = {
  type: 'spring',
  stiffness: 800,
  damping: 50,
  mass: 0.7,
  bounce: 0.08
} as const;

const ITEM_STAGGER_SEC = 0.01;
const ITEM_STAGGER_CAP = 12;

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: animation.duration.fast / 1000,
      ease: animation.easing.out,
      delay: Math.min(index, ITEM_STAGGER_CAP) * ITEM_STAGGER_SEC
    }
  })
} as const;

/**
 * ActionRow - Individual action item with hover-reveal mode selector
 */
interface ActionRowProps {
  action: UnifiedAction;
  isFocused: boolean;
  isKeyboardNavigating: boolean;
  selectedMode: SelectableMode | null;
  onSelect: (action: UnifiedAction, mode?: 'dictate' | 'type' | 'vision') => void;
  onMouseEnter: () => void;
}

const ActionRow: React.FC<ActionRowProps> = memo(({
  action,
  isFocused,
  isKeyboardNavigating,
  selectedMode,
  onSelect,
  onMouseEnter
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<SelectableMode | null>(null);
  const hasMultipleModes = action.modes.length > 1;
  const showModeSplit = hasMultipleModes && (isHovered || (isFocused && isKeyboardNavigating));

  return (
    <div
      className={`
        relative flex items-center gap-3 px-3 py-2
        cursor-pointer
        transition-colors
        ${isFocused ? '' : 'hover:bg-neutral-50'}
      `}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredMode(null);
      }}
      onClick={() => onSelect(action)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(action);
        }
      }}
      tabIndex={0}
    >
      {isFocused && (
        <motion.div
          layoutId="commandbar-active-row"
          transition={ACTIVE_ROW_SPRING}
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            backgroundImage: isKeyboardNavigating
              ? 'linear-gradient(180deg, rgba(139, 92, 246, 0.18), rgba(139, 92, 246, 0.12))'
              : 'linear-gradient(180deg, rgba(139, 92, 246, 0.14), rgba(139, 92, 246, 0.09))',
            boxShadow: isKeyboardNavigating
              ? 'inset 0 0 0 1px rgba(139, 92, 246, 0.26), 0 1px 2px rgba(17, 24, 39, 0.06)'
              : 'inset 0 0 0 1px rgba(139, 92, 246, 0.2), 0 1px 2px rgba(17, 24, 39, 0.04)'
          }}
        />
      )}

      {/* Icon */}
      <action.icon
        size={16}
        className={`${isFocused ? 'text-violet-600' : 'text-neutral-500'} relative z-10`}
        strokeWidth={1.5}
      />

      {/* Label & Description */}
      <div className="flex-1 min-w-0 relative z-10">
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
      <div className="flex items-center gap-1.5 relative z-10">
        {/* Mode split - reveal on hover for multi-mode actions */}
        <AnimatePresence>
          {showModeSplit && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modeSplitVariants}
              transition={{ duration: animation.duration.fast / 1000 }}
              className="flex overflow-hidden rounded-md border border-neutral-200"
            >
              {action.modes.includes('dictate') && (
                (() => {
                  const isExpanded = selectedMode === 'dictate' || hoveredMode === 'dictate';
                  return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(action, 'dictate');
                  }}
                  onMouseEnter={() => setHoveredMode('dictate')}
                  onMouseLeave={() => setHoveredMode(null)}
                  className={`
                    relative flex items-center gap-1 py-1
                    text-[10px] font-semibold
                    text-blue-600 bg-blue-50
                    hover:bg-blue-100
                    transition-all
                    border-r border-neutral-200
                    last:border-r-0
                    first:rounded-l-md last:rounded-r-md
                    ${isExpanded ? 'px-2.5' : 'px-2'}
                  `}
                  title="Dictate"
                  aria-pressed={selectedMode === 'dictate'}
                >
                  <Mic size={14} strokeWidth={2} />
                  <span className="whitespace-nowrap">
                    {selectedMode === 'dictate' || hoveredMode === 'dictate' ? 'Dictate' : 'D'}
                  </span>
                  {selectedMode === 'dictate' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none"
                      style={{ borderRadius: 'inherit', boxShadow: 'inset 0 0 0 1px rgba(37, 99, 235, 0.55)' }}
                    />
                  )}
                </button>
                  );
                })()
              )}
              {action.modes.includes('type') && (
                (() => {
                  const isExpanded = selectedMode === 'type' || hoveredMode === 'type';
                  return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(action, 'type');
                  }}
                  onMouseEnter={() => setHoveredMode('type')}
                  onMouseLeave={() => setHoveredMode(null)}
                  className={`
                    relative flex items-center gap-1 py-1
                    text-[10px] font-semibold
                    text-purple-600 bg-purple-50
                    hover:bg-purple-100
                    transition-all
                    border-r border-neutral-200
                    last:border-r-0
                    first:rounded-l-md last:rounded-r-md
                    ${isExpanded ? 'px-2.5' : 'px-2'}
                  `}
                  title="Type"
                  aria-pressed={selectedMode === 'type'}
                >
                  <Keyboard size={14} strokeWidth={2} />
                  <span className="whitespace-nowrap">
                    {selectedMode === 'type' || hoveredMode === 'type' ? 'Type' : 'T'}
                  </span>
                  {selectedMode === 'type' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none"
                      style={{ borderRadius: 'inherit', boxShadow: 'inset 0 0 0 1px rgba(147, 51, 234, 0.55)' }}
                    />
                  )}
                </button>
                  );
                })()
              )}
              {action.modes.includes('vision') && (
                (() => {
                  const isExpanded = selectedMode === 'vision' || hoveredMode === 'vision';
                  return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(action, 'vision');
                  }}
                  onMouseEnter={() => setHoveredMode('vision')}
                  onMouseLeave={() => setHoveredMode(null)}
                  className={`
                    relative flex items-center gap-1 py-1
                    text-[10px] font-semibold
                    text-cyan-600 bg-cyan-50
                    hover:bg-cyan-100
                    transition-all
                    first:rounded-l-md last:rounded-r-md
                    ${isExpanded ? 'px-2.5' : 'px-2'}
                  `}
                  title="Vision (scan image)"
                  aria-pressed={selectedMode === 'vision'}
                >
                  <Camera size={14} strokeWidth={2} />
                  <span className="whitespace-nowrap">
                    {selectedMode === 'vision' || hoveredMode === 'vision' ? 'Vision' : 'V'}
                  </span>
                  {selectedMode === 'vision' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none"
                      style={{ borderRadius: 'inherit', boxShadow: 'inset 0 0 0 1px rgba(8, 145, 178, 0.55)' }}
                    />
                  )}
                </button>
                  );
                })()
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
  activateOnHover = false,
  onQueryChange,
  onActionSelect,
  useExecutor = true,
  placeholder = 'Search actions...',
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [focusedMode, setFocusedMode] = useState<SelectableMode | null>(null);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const [openedByHover, setOpenedByHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedOpenRef = useRef(false);
  const hoverCloseTimeoutRef = useRef<number | null>(null);

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

  const focusedAction = useMemo(() => {
    if (focusedIndex < 0) return null;
    return flatActions[focusedIndex] || null;
  }, [focusedIndex, flatActions]);

  const focusedActionModes = useMemo(() => {
    return getSelectableModes(focusedAction);
  }, [focusedAction]);

  // Default focused mode when moving between actions
  useEffect(() => {
    if (!focusedAction) {
      setFocusedMode(null);
      return;
    }

    const selectable = getSelectableModes(focusedAction);
    if (selectable.length === 0) {
      setFocusedMode(null);
      return;
    }

    setFocusedMode(selectable.includes('dictate') ? 'dictate' : selectable[0]);
  }, [focusedAction?.id]);

  // Handle close
  const handleClose = useCallback(() => {
    setQuery('');
    onQueryChange?.('');
    setFocusedIndex(-1);
    setFocusedMode(null);
    setIsKeyboardNavigating(false);
    setOpenedByHover(false);
    onClose();
    inputRef.current?.blur();
  }, [onClose, onQueryChange]);

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimeoutRef.current !== null) {
      window.clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    if (!activateOnHover) return;
    if (!openedByHover) return;
    cancelHoverClose();
    hoverCloseTimeoutRef.current = window.setTimeout(() => {
      handleClose();
    }, 90);
  }, [activateOnHover, cancelHoverClose, handleClose, openedByHover]);

  useEffect(() => {
    return () => cancelHoverClose();
  }, [cancelHoverClose]);

  useEffect(() => {
    if (!isOpen) {
      hasAnimatedOpenRef.current = false;
      return;
    }
    hasAnimatedOpenRef.current = true;
  }, [isOpen]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or / to open
      if ((e.metaKey && e.key === 'k') || (e.key === '/' && !isOpen)) {
        e.preventDefault();
        if (!isOpen) {
          setOpenedByHover(false);
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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpen, handleClose]);

  // Handle input keyboard navigation
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsKeyboardNavigating(true);
        setFocusedIndex(prev =>
          prev < flatActions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsKeyboardNavigating(true);
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : flatActions.length - 1
        );
        break;
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (!isKeyboardNavigating) return;
        if (!focusedAction) return;
        if (focusedActionModes.length <= 1) return;

        e.preventDefault();
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        setFocusedMode(prev => {
          const current = prev ?? (focusedActionModes.includes('dictate') ? 'dictate' : focusedActionModes[0]);
          const currentIndex = focusedActionModes.indexOf(current);
          const safeIndex = currentIndex >= 0 ? currentIndex : 0;
          const nextIndex = (safeIndex + direction + focusedActionModes.length) % focusedActionModes.length;
          return focusedActionModes[nextIndex];
        });
        break;
      }
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && flatActions[focusedIndex]) {
          const action = flatActions[focusedIndex];
          dispatchAction(action, focusedMode ?? undefined);
          handleClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  }, [focusedIndex, flatActions, dispatchAction, focusedAction, focusedActionModes, focusedMode, handleClose, isKeyboardNavigating]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (!isOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  const handleMouseEnter = useCallback(() => {
    if (!activateOnHover) return;
    cancelHoverClose();
    if (document.activeElement === inputRef.current) return;
    if (!isOpen) setOpenedByHover(true);
    inputRef.current?.focus();
  }, [activateOnHover, cancelHoverClose, isOpen]);

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

  // Focus first match when searching (keeps Enter useful)
  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setFocusedIndex(-1);
      setIsKeyboardNavigating(false);
      return;
    }
    setFocusedIndex(flatActions.length > 0 ? 0 : -1);
  }, [query, isOpen, flatActions.length]);

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={scheduleHoverClose}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search size={16} className="text-neutral-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onMouseDown={() => setOpenedByHover(false)}
          onChange={(e) => {
            const nextQuery = e.target.value;
            setQuery(nextQuery);
            onQueryChange?.(nextQuery);
            setIsKeyboardNavigating(false);
            setOpenedByHover(false);
          }}
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
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{
              y: PANEL_SPRING,
              scale: PANEL_SPRING,
              opacity: { duration: animation.duration.normal / 1000, ease: animation.easing.out }
            }}
            onMouseEnter={cancelHoverClose}
            onMouseLeave={scheduleHoverClose}
            className="
              absolute top-full left-0 right-0 mt-1
              border border-neutral-200
              rounded-lg overflow-hidden
            "
            style={{
              borderRadius: radius.lg,
              backgroundColor: 'rgba(255, 255, 255, 0.82)',
              boxShadow: shadows.dropdown,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              backdropFilter: 'blur(12px) saturate(1.15)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.15)',
              willChange: 'transform, opacity'
            }}
          >
            {groupedActions.length === 0 ? (
              <div className="relative px-4 py-8 text-center text-neutral-500 text-sm">
                No actions found for "{query}"
              </div>
            ) : (
              <LayoutGroup id="commandbar-results">
                <div className="relative">
                  {groupedActions.map((group, groupIndex) => (
                    <div key={group.id} className={groupIndex > 0 ? 'border-t border-neutral-100' : ''}>
                      {/* Group Header */}
                      <div className="px-3 py-2 bg-neutral-50/70">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          {group.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="py-1" role="group">
                        {group.actions.map((action) => {
                          const flatIndex = flatActions.indexOf(action);
                          const isFocused = flatIndex === focusedIndex;
                          const shouldAnimateItems = isOpen && !hasAnimatedOpenRef.current;
                          const motionIndex = flatIndex >= 0 ? flatIndex : 0;

                          return (
                            <motion.div
                              key={action.id}
                              custom={motionIndex}
                              variants={itemVariants}
                              initial={shouldAnimateItems ? 'hidden' : false}
                              animate="visible"
                            >
                              <ActionRow
                                action={action}
                                isFocused={isFocused}
                                isKeyboardNavigating={isKeyboardNavigating}
                                selectedMode={isFocused ? focusedMode : null}
                                onSelect={(a, mode) => {
                                  dispatchAction(a, mode);
                                  handleClose();
                                }}
                                onMouseEnter={() => {
                                  if (flatIndex >= 0) setFocusedIndex(flatIndex);
                                }}
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </LayoutGroup>
            )}

            {/* Footer hint */}
            <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-100">
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>↑↓ Navigate • ←→ Mode • Enter Select</span>
                <span>Type to filter</span>
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
