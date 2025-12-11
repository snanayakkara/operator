/**
 * ActionGroup Component
 *
 * A collapsible section for organizing actions in the drawer.
 * Features:
 * - Expand/collapse with animation
 * - Sticky header option
 * - Persisted state via localStorage
 * - Clean visual separation
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { colors, animation, radius, spacing } from '@/utils/designTokens';

export interface ActionGroupProps {
  /** Unique group ID (used for persistence) */
  id: string;
  /** Group label */
  label: string;
  /** Optional description */
  description?: string;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Children (action buttons) */
  children: React.ReactNode;
  /** Number of items for badge */
  itemCount?: number;
  /** Disable collapse (always expanded) */
  alwaysExpanded?: boolean;
  /** Additional className for wrapper */
  className?: string;
}

const STORAGE_KEY_PREFIX = 'operator-action-group-';

const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: animation.duration.normal / 1000 },
      opacity: { duration: animation.duration.fast / 1000 }
    }
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: animation.duration.normal / 1000 },
      opacity: { duration: animation.duration.fast / 1000, delay: 0.05 }
    }
  }
};

const chevronVariants = {
  collapsed: { rotate: -90 },
  expanded: { rotate: 0 }
};

export const ActionGroup: React.FC<ActionGroupProps> = memo(({
  id,
  label,
  description,
  defaultExpanded = true,
  children,
  itemCount,
  alwaysExpanded = false,
  className = ''
}) => {
  // Load persisted state
  const [isExpanded, setIsExpanded] = useState(() => {
    if (alwaysExpanded) return true;
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (stored !== null) {
      return stored === 'true';
    }
    return defaultExpanded;
  });

  // Persist state changes
  useEffect(() => {
    if (!alwaysExpanded) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, isExpanded.toString());
    }
  }, [id, isExpanded, alwaysExpanded]);

  const toggleExpanded = useCallback(() => {
    if (!alwaysExpanded) {
      setIsExpanded(prev => !prev);
    }
  }, [alwaysExpanded]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded();
    }
  }, [toggleExpanded]);

  return (
    <div className={`${className}`}>
      {/* Header */}
      <button
        onClick={toggleExpanded}
        onKeyDown={handleKeyDown}
        disabled={alwaysExpanded}
        className={`
          w-full flex items-center gap-2 px-3 py-2
          text-left
          transition-colors
          ${alwaysExpanded
            ? 'cursor-default'
            : 'cursor-pointer hover:bg-neutral-50'
          }
          focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40
        `}
        style={{
          borderRadius: radius.sm,
          transitionDuration: `${animation.duration.fast}ms`
        }}
        aria-expanded={isExpanded}
        aria-controls={`action-group-content-${id}`}
      >
        {/* Chevron indicator */}
        {!alwaysExpanded && (
          <motion.div
            variants={chevronVariants}
            animate={isExpanded ? 'expanded' : 'collapsed'}
            transition={{ duration: animation.duration.fast / 1000 }}
            className="flex-shrink-0"
          >
            <ChevronDown
              size={14}
              className="text-neutral-400"
              strokeWidth={2}
            />
          </motion.div>
        )}

        {/* Label */}
        <span className="
          text-[11px] font-semibold uppercase tracking-wider
          text-neutral-500
        ">
          {label}
        </span>

        {/* Item count badge */}
        {itemCount !== undefined && (
          <span className="
            px-1.5 py-0.5
            text-[10px] font-medium
            bg-neutral-100 text-neutral-500
            rounded-full
          ">
            {itemCount}
          </span>
        )}

        {/* Description (optional) */}
        {description && isExpanded && (
          <span className="
            ml-auto
            text-[10px] text-neutral-400
            truncate max-w-[120px]
          ">
            {description}
          </span>
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`action-group-content-${id}`}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={contentVariants}
            className="overflow-hidden"
          >
            <div
              className="px-2 pb-2 pt-1"
              style={{ paddingLeft: spacing.sm, paddingRight: spacing.sm }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ActionGroup.displayName = 'ActionGroup';

export default ActionGroup;
