/**
 * QuickActionItem Component
 *
 * Individual action button with:
 * - Vertical layout (icon above, label below)
 * - Alias support for long labels
 * - 2-line wrapping capability
 * - Tooltip showing full label
 * - Normalized icon sizing
 * - EXPANDABLE: Hover reveals Dictate/Type options for certain actions
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Mic, Keyboard } from 'lucide-react';
import { buttonVariants, withReducedMotion } from '@/utils/animations';
import type { AgentType } from '@/types/medical.types';

export interface QuickActionItemProps {
  id: string;
  label: string;
  alias?: string; // Short form for long labels (e.g., "Pt Ed" for "Patient Education")
  icon: LucideIcon;
  category: 'core' | 'secondary';
  onClick: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
  // Expandable action support (Dictate vs Type)
  isExpandable?: boolean;
  workflowId?: AgentType;
  onDictate?: (workflowId: AgentType, actionId: string) => void;
  onType?: (actionId: string) => void;
  // Color theme for functional grouping
  colorTheme?: 'blue' | 'cyan' | 'purple' | 'emerald' | 'violet';
}

/**
 * Color theme mapping for icons and hover states
 */
const COLOR_THEMES = {
  blue: {
    icon: 'text-blue-600',
    hover: 'hover:bg-blue-50',
    spinner: 'border-blue-600'
  },
  cyan: {
    icon: 'text-cyan-600',
    hover: 'hover:bg-cyan-50',
    spinner: 'border-cyan-600'
  },
  purple: {
    icon: 'text-purple-600',
    hover: 'hover:bg-purple-50',
    spinner: 'border-purple-600'
  },
  emerald: {
    icon: 'text-emerald-600',
    hover: 'hover:bg-emerald-50',
    spinner: 'border-emerald-600'
  },
  violet: {
    icon: 'text-violet-600',
    hover: 'hover:bg-violet-50',
    spinner: 'border-violet-600'
  }
} as const;

/**
 * Determines if we should use alias based on label length
 */
function shouldUseAlias(label: string, alias?: string): boolean {
  if (!alias) return false;
  // Use alias if label is longer than 12 characters
  return label.length > 12;
}

export const QuickActionItem: React.FC<QuickActionItemProps> = ({
  id,
  label,
  alias,
  icon: Icon,
  category,
  onClick,
  isProcessing = false,
  disabled = false,
  className = '',
  isExpandable = false,
  workflowId,
  onDictate,
  onType,
  colorTheme
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const displayLabel = shouldUseAlias(label, alias) && alias ? alias : label;
  const showTooltip = (alias && shouldUseAlias(label, alias)) || label.length > 15;

  // Determine colors based on theme or default (blue for core, gray for secondary)
  const theme = colorTheme ? COLOR_THEMES[colorTheme] : (category === 'core' ? COLOR_THEMES.blue : { icon: 'text-gray-600', hover: 'hover:bg-gray-50', spinner: 'border-gray-600' });

  const handleMouseEnter = useCallback(() => {
    if (!isProcessing && isExpandable) {
      setIsHovered(true);
    }
  }, [isProcessing, isExpandable]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleDictate = useCallback(async () => {
    if (onDictate && workflowId) {
      onDictate(workflowId, id);
    }
    setIsHovered(false);
  }, [onDictate, workflowId, id]);

  const handleType = useCallback(async () => {
    if (onType) {
      onType(id);
    }
    setIsHovered(false);
  }, [onType, id]);

  // Non-expandable actions - simple button
  if (!isExpandable) {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className={`
          group relative flex flex-col items-center justify-center
          p-2 rounded-lg
          transition-all duration-150
          ${disabled || isProcessing
            ? 'opacity-50 cursor-not-allowed'
            : `${theme.hover} active:bg-gray-100 cursor-pointer`
          }
          ${className}
        `}
        variants={withReducedMotion(buttonVariants)}
        whileHover={!disabled && !isProcessing ? "hover" : undefined}
        whileTap={!disabled && !isProcessing ? "tap" : undefined}
        aria-label={label}
        title={showTooltip ? label : undefined}
        data-action-id={id}
      >
        {/* Icon container - normalized 24x24px bounding box */}
        <div className="
          w-6 h-6 mb-1.5 flex items-center justify-center
          transition-transform duration-150
          group-hover:scale-110
        ">
          <Icon
            className={`
              w-5 h-5
              ${theme.icon}
              ${isProcessing ? 'animate-pulse' : ''}
            `}
            strokeWidth={2}
          />
        </div>

        {/* Label - max 2 lines, centered, 11px font for better 5-col fit */}
        <div className="
          text-[11px] font-medium text-gray-700 text-center leading-tight
          max-w-full
          line-clamp-2
        ">
          {displayLabel}
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={`w-4 h-4 border-2 ${theme.spinner} border-t-transparent rounded-full animate-spin`} />
          </motion.div>
        )}

        {/* Focus ring */}
        <div className="
          absolute inset-0 rounded-lg
          ring-2 ring-transparent ring-offset-0
          group-focus-visible:ring-blue-500
          transition-all duration-150
        " />
      </motion.button>
    );
  }

  // Expandable actions - hover to reveal Dictate/Type split
  return (
    <div
      className={`relative overflow-hidden w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ minHeight: '64px' }} // Ensure consistent height
    >
      {/* Collapsed state - single button */}
      <div className={`
        absolute inset-0 transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
      `}>
        <button
          disabled={isProcessing}
          className={`
            group w-full h-full flex flex-col items-center justify-center
            p-2 rounded-lg transition-all duration-150
            ${theme.hover}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={label}
          title={showTooltip ? label : undefined}
        >
          {/* Icon */}
          <div className="w-6 h-6 mb-1.5 flex items-center justify-center">
            <Icon
              className={`w-5 h-5 ${theme.icon}`}
              strokeWidth={2}
            />
          </div>

          {/* Label */}
          <div className="text-[11px] font-medium text-gray-700 text-center leading-tight line-clamp-2">
            {displayLabel}
          </div>

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
              <div className={`w-4 h-4 border-2 ${theme.spinner} border-t-transparent rounded-full animate-spin`} />
            </div>
          )}
        </button>
      </div>

      {/* Expanded state - split Dictate|Type buttons */}
      <div className={`
        absolute inset-0 transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}>
        <div className="grid grid-cols-2 gap-0.5 h-full">
          {/* Dictate Button */}
          <button
            onClick={handleDictate}
            disabled={isProcessing}
            className={`
              flex flex-col items-center justify-center
              rounded-l-lg border-r border-gray-200
              transition-all duration-150
              ${theme.hover}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title={`Dictate ${label}`}
            aria-label={`Dictate ${label} with voice`}
          >
            <Mic className={`w-4 h-4 ${theme.icon} mb-1`} strokeWidth={2} />
            <div className={`text-[10px] font-medium ${theme.icon.replace('text-', 'text-').replace('-600', '-700')} leading-none`}>
              Dict
            </div>
          </button>

          {/* Type Button */}
          <button
            onClick={handleType}
            disabled={isProcessing}
            className={`
              flex flex-col items-center justify-center
              rounded-r-lg
              transition-all duration-150
              ${theme.hover}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title={`Type ${label}`}
            aria-label={`Type ${label} manually`}
          >
            <Keyboard className={`w-4 h-4 ${theme.icon} mb-1`} strokeWidth={2} />
            <div className={`text-[10px] font-medium ${theme.icon.replace('text-', 'text-').replace('-600', '-700')} leading-none`}>
              Type
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
