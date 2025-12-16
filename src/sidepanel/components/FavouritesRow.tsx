/**
 * FavouritesRow Component
 *
 * Horizontal row of 4 favourite actions with one-click access.
 * Default favourites: Quick Letter, Background, Investigations, Wrap Up
 *
 * Features:
 * - Quick Letter uses DualModeButton (D|T split)
 * - Investigations uses TriModeButton (D|T|V split)
 * - Background uses DualModeButton (D|T split)
 * - Wrap Up uses ActionButton (single click → opens drawer)
 * - Compact, horizontal layout optimized for narrow panel
 * - Optional ActionExecutor integration for unified dispatch
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { animation } from '@/utils/designTokens';
import {
  getActionById,
  APPOINTMENT_WRAP_UP,
  isDualMode,
  isTriMode,
  type UnifiedAction,
  type InputMode
} from '@/config/unifiedActionsConfig';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { ActionButton } from './ui/ActionButton';
import { DualModeButton } from './ui/DualModeButton';
import { TriModeButton } from './ui/TriModeButton';

export interface FavouritesRowProps {
  /** Callback when action is selected with dictate mode (legacy) */
  onDictate: (action: UnifiedAction) => void;
  /** Callback when action is selected with type mode (legacy) */
  onType: (action: UnifiedAction) => void;
  /** Callback when action is selected with vision mode (legacy) */
  onVision: (action: UnifiedAction) => void;
  /** Callback when Wrap Up is clicked (legacy) */
  onWrapUp: () => void;
  /** Whether to use ActionExecutor for dispatch (default: true) */
  useExecutor?: boolean;
  /** Currently loading action IDs */
  loadingActions?: Set<string>;
  /** Additional className */
  className?: string;
}

// Default favourites (fixed for now)
const FAVOURITE_IDS = ['quick-letter', 'background', 'investigation-summary'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animation.duration.normal / 1000
    }
  }
};

export const FavouritesRow: React.FC<FavouritesRowProps> = memo(({
  onDictate,
  onType,
  onVision,
  onWrapUp,
  useExecutor = true,
  loadingActions = new Set(),
  className = ''
}) => {
  // ActionExecutor integration
  const { execute, isExecuting } = useActionExecutor();

  // Unified dispatch - uses executor or falls back to callbacks
  const dispatchAction = useCallback(async (action: UnifiedAction, mode: InputMode) => {
    if (useExecutor) {
      await execute(action.id, mode, { origin: 'favourites' });
    } else {
      // Legacy callback path
      if (mode === 'dictate') onDictate(action);
      else if (mode === 'type') onType(action);
      else if (mode === 'vision') onVision(action);
    }
  }, [useExecutor, execute, onDictate, onType, onVision]);

  const dispatchWrapUp = useCallback(async () => {
    if (useExecutor) {
      await execute('appointment-wrap-up', 'click', { origin: 'favourites' });
    } else {
      onWrapUp();
    }
  }, [useExecutor, execute, onWrapUp]);

  // Get favourite actions
  const favourites = FAVOURITE_IDS
    .map(id => getActionById(id))
    .filter(Boolean) as UnifiedAction[];

  return (
    <motion.div
      className={`flex items-stretch gap-1.5 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {favourites.map((action) => {
        const isLoading = loadingActions.has(action.id);

        if (isTriMode(action)) {
          return (
            <motion.div key={action.id} className="flex-1 min-w-0" variants={itemVariants}>
              <TriModeButton
                id={action.id}
                label={action.label}
                alias={action.alias}
                icon={action.icon}
                onDictate={() => dispatchAction(action, 'dictate')}
                onType={() => dispatchAction(action, 'type')}
                onVision={() => dispatchAction(action, 'vision')}
                shortcut={action.shortcut}
                isLoading={isLoading || isExecuting}
                colorTheme={action.colorTheme}
                compact
              />
            </motion.div>
          );
        }

        if (isDualMode(action)) {
          return (
            <motion.div key={action.id} className="flex-1 min-w-0" variants={itemVariants}>
              <DualModeButton
                id={action.id}
                label={action.label}
                alias={action.alias}
                icon={action.icon}
                onDictate={() => dispatchAction(action, 'dictate')}
                onType={() => dispatchAction(action, 'type')}
                shortcut={action.shortcut}
                isLoading={isLoading || isExecuting}
                colorTheme={action.colorTheme}
                compact
              />
            </motion.div>
          );
        }

        // Fallback to ActionButton (shouldn't happen for these favourites)
        return (
          <motion.div key={action.id} className="flex-1 min-w-0" variants={itemVariants}>
            <ActionButton
              id={action.id}
              label={action.label}
              alias={action.alias}
              icon={action.icon}
              onClick={() => dispatchAction(action, 'dictate')}
              shortcut={action.shortcut}
              isLoading={isLoading || isExecuting}
              colorTheme={action.colorTheme}
              compact
            />
          </motion.div>
        );
      })}

      {/* Wrap Up - special action that opens a drawer/modal */}
      <motion.div className="flex-[1.25] min-w-0" variants={itemVariants}>
        <ActionButton
          id={APPOINTMENT_WRAP_UP.id}
          label={APPOINTMENT_WRAP_UP.label}
          alias={APPOINTMENT_WRAP_UP.alias}
          icon={APPOINTMENT_WRAP_UP.icon}
          onClick={dispatchWrapUp}
          shortcut={APPOINTMENT_WRAP_UP.shortcut}
          isLoading={loadingActions.has(APPOINTMENT_WRAP_UP.id) || isExecuting}
          colorTheme={APPOINTMENT_WRAP_UP.colorTheme}
          compact
        />
      </motion.div>
    </motion.div>
  );
});

FavouritesRow.displayName = 'FavouritesRow';

export default FavouritesRow;
