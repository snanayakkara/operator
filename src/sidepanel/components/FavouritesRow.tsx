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
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { animation } from '@/utils/designTokens';
import {
  getActionById,
  APPOINTMENT_WRAP_UP,
  isDualMode,
  isTriMode,
  type UnifiedAction
} from '@/config/unifiedActionsConfig';
import { ActionButton } from './ui/ActionButton';
import { DualModeButton } from './ui/DualModeButton';
import { TriModeButton } from './ui/TriModeButton';

export interface FavouritesRowProps {
  /** Callback when action is selected with dictate mode */
  onDictate: (action: UnifiedAction) => void;
  /** Callback when action is selected with type mode */
  onType: (action: UnifiedAction) => void;
  /** Callback when action is selected with vision mode */
  onVision: (action: UnifiedAction) => void;
  /** Callback when Wrap Up is clicked */
  onWrapUp: () => void;
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
  loadingActions = new Set(),
  className = ''
}) => {
  // Get favourite actions
  const favourites = FAVOURITE_IDS
    .map(id => getActionById(id))
    .filter(Boolean) as UnifiedAction[];

  return (
    <motion.div
      className={`flex gap-1.5 ${className}`}
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
                onDictate={() => onDictate(action)}
                onType={() => onType(action)}
                onVision={() => onVision(action)}
                shortcut={action.shortcut}
                isLoading={isLoading}
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
                onDictate={() => onDictate(action)}
                onType={() => onType(action)}
                shortcut={action.shortcut}
                isLoading={isLoading}
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
              onClick={() => onDictate(action)}
              shortcut={action.shortcut}
              isLoading={isLoading}
              colorTheme={action.colorTheme}
              compact
            />
          </motion.div>
        );
      })}

      {/* Wrap Up - special action that opens a drawer/modal */}
      <motion.div className="flex-1 min-w-0" variants={itemVariants}>
        <ActionButton
          id={APPOINTMENT_WRAP_UP.id}
          label={APPOINTMENT_WRAP_UP.label}
          alias={APPOINTMENT_WRAP_UP.alias}
          icon={APPOINTMENT_WRAP_UP.icon}
          onClick={onWrapUp}
          shortcut={APPOINTMENT_WRAP_UP.shortcut}
          isLoading={loadingActions.has(APPOINTMENT_WRAP_UP.id)}
          colorTheme={APPOINTMENT_WRAP_UP.colorTheme}
          compact
        />
      </motion.div>
    </motion.div>
  );
});

FavouritesRow.displayName = 'FavouritesRow';

export default FavouritesRow;
