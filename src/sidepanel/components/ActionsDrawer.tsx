/**
 * ActionsDrawer Component
 *
 * Full actions panel with grouped, collapsible sections.
 * Renders action buttons based on their mode configuration:
 * - Single mode (click) → ActionButton
 * - Dual mode (dictate + type) → DualModeButton
 * - Tri mode (dictate + type + vision) → TriModeButton
 *
 * Features:
 * - Visual grouping with accordions
 * - Grid layout for compact display
 * - Persisted expand/collapse state
 * - Keyboard shortcut hints
 */

import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animation, radius, shadows } from '@/utils/designTokens';
import {
  UNIFIED_ACTIONS,
  ACTION_GROUPS,
  APPOINTMENT_WRAP_UP,
  isDualMode,
  isTriMode,
  isClickOnly,
  type UnifiedAction
} from '@/config/unifiedActionsConfig';
import { ActionButton } from './ui/ActionButton';
import { DualModeButton } from './ui/DualModeButton';
import { TriModeButton } from './ui/TriModeButton';
import { ActionGroup } from './ui/ActionGroup';

export interface ActionsDrawerProps {
  /** Whether the drawer is visible */
  isOpen: boolean;
  /** Callback when action is selected with dictate mode */
  onDictate: (action: UnifiedAction) => void;
  /** Callback when action is selected with type mode */
  onType: (action: UnifiedAction) => void;
  /** Callback when action is selected with vision mode */
  onVision: (action: UnifiedAction) => void;
  /** Callback when action is clicked (single-action) */
  onClick: (action: UnifiedAction) => void;
  /** Currently loading action IDs */
  loadingActions?: Set<string>;
  /** Additional className */
  className?: string;
}

const drawerVariants = {
  hidden: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: {
      duration: animation.duration.normal / 1000,
      ease: animation.easing.in
    }
  },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: {
      duration: animation.duration.normal / 1000,
      ease: animation.easing.out
    }
  }
};

export const ActionsDrawer: React.FC<ActionsDrawerProps> = memo(({
  isOpen,
  onDictate,
  onType,
  onVision,
  onClick,
  loadingActions = new Set(),
  className = ''
}) => {
  // Render the appropriate button type for an action
  const renderActionButton = useCallback((action: UnifiedAction) => {
    const isLoading = loadingActions.has(action.id);

    if (isTriMode(action)) {
      return (
        <TriModeButton
          key={action.id}
          id={action.id}
          label={action.label}
          alias={action.alias}
          icon={action.icon}
          onDictate={() => onDictate(action)}
          onType={() => onType(action)}
          onVision={() => onVision(action)}
          shortcut={action.shortcut}
          isLoading={isLoading}
          disabled={action.comingSoon}
          colorTheme={action.colorTheme}
          compact
        />
      );
    }

    if (isDualMode(action)) {
      return (
        <DualModeButton
          key={action.id}
          id={action.id}
          label={action.label}
          alias={action.alias}
          icon={action.icon}
          onDictate={() => onDictate(action)}
          onType={() => onType(action)}
          shortcut={action.shortcut}
          isLoading={isLoading}
          disabled={action.comingSoon}
          colorTheme={action.colorTheme}
          compact
        />
      );
    }

    // Click-only action
    return (
      <ActionButton
        key={action.id}
        id={action.id}
        label={action.label}
        alias={action.alias}
        icon={action.icon}
        onClick={() => onClick(action)}
        shortcut={action.shortcut}
        isLoading={isLoading}
        disabled={action.comingSoon}
        comingSoon={action.comingSoon}
        colorTheme={action.colorTheme}
        compact
      />
    );
  }, [loadingActions, onDictate, onType, onVision, onClick]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={`
            bg-white border border-neutral-200
            overflow-hidden
            ${className}
          `}
          style={{
            borderRadius: radius.lg,
            boxShadow: shadows.dropdown,
            maxHeight: 'calc(100vh - 220px)',
            overflowY: 'auto'
          }}
        >
          {/* Grouped Actions */}
          {ACTION_GROUPS.map((groupMeta) => {
            const groupActions = UNIFIED_ACTIONS.filter(a => a.group === groupMeta.id);

            if (groupActions.length === 0) {
              return null;
            }

            return (
              <ActionGroup
                key={groupMeta.id}
                id={groupMeta.id}
                label={groupMeta.label}
                description={groupMeta.description}
                defaultExpanded={groupMeta.defaultExpanded}
                itemCount={groupActions.length}
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {groupActions.map(renderActionButton)}
                </div>
              </ActionGroup>
            );
          })}

          {/* Footer with keyboard hints */}
          <div className="
            px-3 py-2
            bg-neutral-50 border-t border-neutral-100
            sticky bottom-0
          ">
            <div className="flex items-center justify-between text-[10px] text-neutral-500">
              <span>Hover for D|T split • Single keys when search empty</span>
              <span className="font-medium">ESC to close</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ActionsDrawer.displayName = 'ActionsDrawer';

export default ActionsDrawer;
