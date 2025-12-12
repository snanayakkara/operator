/**
 * ActionButton Component
 *
 * A standard single-action button for the actions drawer and favourites row.
 * Supports:
 * - Icon + label layout
 * - Keyboard shortcut hint
 * - Loading and disabled states
 * - Color themes
 * - Hover animations
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { colors, animation, radius } from '@/utils/designTokens';

export interface ActionButtonProps {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Short alias for constrained spaces */
  alias?: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Click handler */
  onClick: () => void;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Coming soon (shows as disabled with badge) */
  comingSoon?: boolean;
  /** Color theme */
  colorTheme?: keyof typeof colors.themes;
  /** Compact mode for grid layout */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

export const ActionButton: React.FC<ActionButtonProps> = memo(({
  id,
  label,
  alias,
  icon: Icon,
  onClick,
  shortcut,
  isLoading = false,
  disabled = false,
  comingSoon = false,
  colorTheme = 'blue',
  compact = false,
  className = ''
}) => {
  const theme = colors.themes[colorTheme];
  const isDisabled = disabled || isLoading || comingSoon;
  const displayLabel = compact && alias ? alias : label;

  return (
    <motion.button
      data-action-id={id}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        group relative flex items-center gap-2
        ${compact ? 'flex-col justify-center p-2 min-h-[56px]' : 'px-3 py-2'}
        rounded-[${radius.md}] border
        transition-colors duration-[${animation.duration.fast}ms]
        ${isDisabled
          ? 'bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed'
          : `bg-white border-neutral-200 hover:bg-[${theme.bg}] hover:border-[${theme.border}] cursor-pointer`
        }
        ${className}
      `}
      style={{
        borderRadius: radius.md,
        transitionDuration: `${animation.duration.fast}ms`
      }}
      variants={!isDisabled ? buttonVariants : undefined}
      whileHover={!isDisabled ? 'hover' : undefined}
      whileTap={!isDisabled ? 'tap' : undefined}
      aria-label={label}
      aria-disabled={isDisabled}
      title={comingSoon ? `${label} - Coming soon` : label}
    >
      {/* Icon */}
      <div className={`
        flex items-center justify-center
        ${compact ? 'w-5 h-5' : 'w-4 h-4'}
        transition-transform duration-[${animation.duration.fast}ms]
        ${!isDisabled ? 'group-hover:scale-110' : ''}
      `}>
        {isLoading ? (
          <Loader2
            className="animate-spin"
            style={{ color: theme.icon }}
            size={compact ? 20 : 16}
          />
        ) : (
          <Icon
            size={compact ? 20 : 16}
            style={{ color: isDisabled ? colors.neutral[400] : theme.icon }}
            strokeWidth={1.5}
          />
        )}
      </div>

      {/* Label */}
      <span className={`
        ${compact ? 'text-[11px] text-center leading-tight whitespace-nowrap' : 'text-[13px]'}
        font-medium
        ${isDisabled ? 'text-neutral-400' : 'text-neutral-700'}
        ${compact ? '' : 'truncate'}
      `}>
        {displayLabel}
      </span>

      {/* Keyboard shortcut hint */}
      {shortcut && !compact && !isDisabled && (
        <span className="
          ml-auto px-1.5 py-0.5
          text-[10px] font-medium
          bg-neutral-100 text-neutral-500
          rounded
          opacity-0 group-hover:opacity-100
          transition-opacity duration-[${animation.duration.fast}ms]
        ">
          {shortcut}
        </span>
      )}

      {/* Coming soon badge */}
      {comingSoon && (
        <span className={`
          absolute ${compact ? '-top-1 -right-1' : 'top-1 right-1'}
          px-1.5 py-0.5
          text-[9px] font-semibold uppercase
          bg-amber-100 text-amber-700
          rounded-full
        `}>
          Soon
        </span>
      )}

      {/* Focus ring */}
      <div className="
        absolute inset-0 rounded-[inherit]
        ring-2 ring-transparent
        group-focus-visible:ring-violet-500/40
        pointer-events-none
      " />
    </motion.button>
  );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;
