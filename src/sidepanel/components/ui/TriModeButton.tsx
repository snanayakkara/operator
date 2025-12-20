/**
 * TriModeButton Component
 *
 * A split button for actions that support Dictate, Type, and Vision modes.
 * Three distinct hit areas within one button:
 * - Left = Dictate (microphone icon)
 * - Center = Type (keyboard icon)
 * - Right = Vision (camera icon)
 *
 * Used by: Investigation Summary (future: others may gain Vision)
 */

import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Mic, Keyboard, Camera, Loader2 } from 'lucide-react';
import { colors, animation, radius, layout } from '@/utils/designTokens';

export interface TriModeButtonProps {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Short alias for constrained spaces */
  alias?: string;
  /** Main icon (shown in collapsed state) */
  icon: LucideIcon;
  /** Dictate click handler */
  onDictate: () => void;
  /** Type click handler */
  onType: () => void;
  /** Vision click handler */
  onVision: () => void;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Color theme */
  colorTheme?: keyof typeof colors.themes;
  /** Compact mode for grid layout */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const containerVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 }
};

const splitVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};

export const TriModeButton: React.FC<TriModeButtonProps> = memo(({
  id,
  label,
  alias,
  icon: Icon,
  onDictate,
  onType,
  onVision,
  shortcut,
  isLoading = false,
  disabled = false,
  colorTheme = 'blue',
  compact = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = colors.themes[colorTheme];
  const isDisabled = disabled || isLoading;
  const displayLabel = compact && alias ? alias : label;

  const handleMouseEnter = () => {
    if (!isDisabled) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
  };

  const handleDictateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) {
      onDictate();
      setIsExpanded(false);
    }
  };

  const handleTypeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) {
      onType();
      setIsExpanded(false);
    }
  };

  const handleVisionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) {
      onVision();
      setIsExpanded(false);
    }
  };

  return (
    <motion.div
      data-action-id={id}
      className={`
        relative overflow-hidden
        ${compact ? '' : 'min-h-[40px]'}
        ${className}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      variants={!isDisabled && !compact ? containerVariants : undefined}
      whileHover={!isDisabled && !compact ? 'hover' : undefined}
      style={compact ? { height: layout.header.favourites, minHeight: layout.header.favourites } : undefined}
    >
      {/* Collapsed state - shows main icon and label */}
      <motion.button
        className={`
          absolute inset-0
          flex
          ${compact ? 'flex-col items-center justify-center gap-1 p-1.5' : 'items-center gap-2 px-3 py-2'}
          rounded-lg border
          transition-colors
          ${isDisabled
            ? 'bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed'
            : 'bg-white border-neutral-200 hover:border-neutral-300 cursor-pointer'
          }
        `}
        style={{
          borderRadius: radius.md,
          transitionDuration: `${animation.duration.fast}ms`,
          opacity: isExpanded && !isDisabled ? 0 : 1,
          pointerEvents: isExpanded && !isDisabled ? 'none' : 'auto'
        }}
        disabled={isDisabled}
        aria-label={label}
        aria-disabled={isDisabled}
        title={label}
      >
        {/* Icon */}
        <div className={`
          flex items-center justify-center
          ${compact ? 'w-5 h-5' : 'w-4 h-4'}
        `}>
          {isLoading ? (
            <Loader2
              className="animate-spin"
              style={{ color: theme.icon }}
              size={compact ? 18 : 16}
            />
          ) : (
            <Icon
              size={compact ? 18 : 16}
              style={{ color: isDisabled ? colors.neutral[400] : theme.icon }}
              strokeWidth={1.5}
            />
          )}
        </div>

        {/* Label */}
        <span className={`
          ${compact ? 'text-[10px] text-center leading-tight whitespace-nowrap' : 'text-[13px]'}
          font-medium
          ${isDisabled ? 'text-neutral-400' : 'text-neutral-700'}
          ${compact ? '' : 'truncate'}
        `}>
          {displayLabel}
        </span>

        {/* Shortcut hint */}
        {shortcut && !compact && !isDisabled && (
          <span className="
            ml-auto px-1.5 py-0.5
            text-[10px] font-medium
            bg-neutral-100 text-neutral-500
            rounded
          ">
            {shortcut}
          </span>
        )}
      </motion.button>

      {/* Expanded state - shows Dictate | Type | Vision split */}
      <motion.div
        className="absolute inset-0 grid grid-cols-3 gap-0.5"
        initial="hidden"
        animate={isExpanded && !isDisabled ? 'visible' : 'hidden'}
        variants={splitVariants}
        transition={{ duration: animation.duration.fast / 1000 }}
        style={{
          pointerEvents: isExpanded && !isDisabled ? 'auto' : 'none'
        }}
      >
        {/* Dictate Button */}
        <button
          onClick={handleDictateClick}
          disabled={isDisabled}
          className="
            flex flex-col items-center justify-center
            rounded-l-lg border-2
            bg-white
            transition-colors
            hover:bg-blue-50 hover:border-blue-300
            border-blue-200
          "
          style={{
            borderRadius: `${radius.md} 0 0 ${radius.md}`,
            transitionDuration: `${animation.duration.fast}ms`
          }}
          title={`Dictate ${label}`}
          aria-label={`Dictate ${label} with voice`}
        >
          <Mic
            size={compact ? 16 : 14}
            className="text-blue-600 mb-0.5"
            strokeWidth={2}
          />
          <span className="text-[10px] font-semibold text-blue-700">
            D
          </span>
        </button>

        {/* Type Button */}
        <button
          onClick={handleTypeClick}
          disabled={isDisabled}
          className="
            flex flex-col items-center justify-center
            border-2 border-l-0 border-r-0
            bg-white
            transition-colors
            hover:bg-purple-50 hover:border-purple-300
            border-purple-200
          "
          style={{
            borderRadius: 0,
            transitionDuration: `${animation.duration.fast}ms`
          }}
          title={`Type ${label}`}
          aria-label={`Type ${label} manually`}
        >
          <Keyboard
            size={compact ? 16 : 14}
            className="text-purple-600 mb-0.5"
            strokeWidth={2}
          />
          <span className="text-[10px] font-semibold text-purple-700">
            T
          </span>
        </button>

        {/* Vision Button */}
        <button
          onClick={handleVisionClick}
          disabled={isDisabled}
          className="
            flex flex-col items-center justify-center
            rounded-r-lg border-2
            bg-white
            transition-colors
            hover:bg-cyan-50 hover:border-cyan-300
            border-cyan-200
          "
          style={{
            borderRadius: `0 ${radius.md} ${radius.md} 0`,
            transitionDuration: `${animation.duration.fast}ms`
          }}
          title={`Scan ${label} from image`}
          aria-label={`Scan ${label} from photo or screenshot`}
        >
          <Camera
            size={compact ? 16 : 14}
            className="text-cyan-600 mb-0.5"
            strokeWidth={2}
          />
          <span className="text-[10px] font-semibold text-cyan-700">
            V
          </span>
        </button>
      </motion.div>

      {/* Focus ring */}
      <div className="
        absolute inset-0 rounded-lg
        ring-2 ring-transparent
        pointer-events-none
        focus-within:ring-violet-500/40
      " />
    </motion.div>
  );
});

TriModeButton.displayName = 'TriModeButton';

export default TriModeButton;
