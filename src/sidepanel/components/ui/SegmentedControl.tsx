/**
 * SegmentedControl Component
 *
 * A horizontal segmented button group for multi-choice selection.
 * Designed for 360px sidepanel width - compact with icons + short labels.
 */

import React, { memo } from 'react';
import { Check } from 'lucide-react';

export interface SegmentOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

type AccentColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'gray' | 'violet';

const accentColors: Record<AccentColor, { selected: string; unselected: string }> = {
  blue: {
    selected: 'bg-blue-50 text-blue-900 border-blue-200',
    unselected: 'bg-white border-blue-100 text-gray-700 hover:border-blue-200 hover:bg-blue-50/30',
  },
  purple: {
    selected: 'bg-purple-50 text-purple-900 border-purple-200',
    unselected: 'bg-white border-purple-100 text-gray-700 hover:border-purple-200 hover:bg-purple-50/30',
  },
  emerald: {
    selected: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    unselected: 'bg-white border-emerald-100 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/30',
  },
  amber: {
    selected: 'bg-amber-50 text-amber-900 border-amber-200',
    unselected: 'bg-white border-amber-100 text-gray-700 hover:border-amber-200 hover:bg-amber-50/30',
  },
  gray: {
    selected: 'bg-gray-900 text-white border-gray-900',
    unselected: 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50',
  },
  violet: {
    selected: 'bg-violet-50 text-violet-900 border-violet-200',
    unselected: 'bg-white border-violet-100 text-gray-700 hover:border-violet-200 hover:bg-violet-50/30',
  },
};

interface SegmentedControlProps {
  options: SegmentOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  /** Show success state for a specific option */
  successId?: string;
  /** Allow multiple selection (acts as button group) */
  multiSelect?: boolean;
  /** Stretch control to fill available horizontal space */
  fullWidth?: boolean;
  /** Accent color for borders and backgrounds */
  accentColor?: AccentColor;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = memo(({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
  successId,
  multiSelect = false,
  fullWidth = false,
  accentColor = 'gray'
}) => {
  const colors = accentColors[accentColor];
  const sizeClasses = {
    sm: 'h-7 text-xs gap-1 px-2',
    md: 'h-8 text-sm gap-1.5 px-3'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5'
  };

  return (
    <div
      className={`inline-flex gap-0.5 ${fullWidth ? 'w-full' : ''} ${className}`}
      role={multiSelect ? 'group' : 'radiogroup'}
    >
      {options.map((option) => {
        const isSelected = value === option.id;
        const isSuccess = successId === option.id;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            type="button"
            role={multiSelect ? 'button' : 'radio'}
            aria-checked={!multiSelect ? isSelected : undefined}
            disabled={option.disabled}
            onClick={() => onChange?.(option.id)}
            className={`
              inline-flex items-center justify-center ${fullWidth ? 'flex-1' : ''}
              rounded-md transition-all duration-200 ease-out
              font-medium whitespace-nowrap
              ${sizeClasses[size]}
              ${isSelected && !multiSelect
                ? colors.selected
                : isSuccess
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
              }
              ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-1
            `}
          >
            {isSuccess ? (
              <Check className={`${iconSizes[size]} transition-transform duration-200`} />
            ) : Icon && (
              <Icon className={`${iconSizes[size]} transition-transform duration-200 group-hover:scale-110`} />
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
});

SegmentedControl.displayName = 'SegmentedControl';

/**
 * ActionSegmentedControl
 *
 * Pre-configured segmented control for common action patterns.
 * Used in card headers for Copy/Insert/Edit actions.
 */
/** Keyboard shortcut hints for action buttons */
const KEYBOARD_HINTS: Record<string, string> = {
  copy: '⇧C',
  insert: '⇧I'
};

interface ActionSegmentedControlProps {
  onCopy?: () => void;
  onInsert?: () => void;
  onEdit?: () => void;
  onTrain?: () => void;
  onDownload?: () => void;
  onReprocess?: () => void;
  onPatient?: () => void;
  onSkip?: () => void;
  copiedRecently?: boolean;
  insertedRecently?: boolean;
  className?: string;
  /** Which actions to show */
  actions?: ('copy' | 'insert' | 'edit' | 'train' | 'download' | 'reprocess' | 'patient' | 'skip')[];
  /** Show keyboard shortcut hints next to labels */
  showKeyboardHints?: boolean;
}

export const ActionSegmentedControl: React.FC<ActionSegmentedControlProps> = memo(({
  onCopy,
  onInsert,
  onEdit,
  onTrain,
  onDownload,
  onReprocess,
  onPatient,
  onSkip,
  copiedRecently = false,
  insertedRecently = false,
  className = '',
  actions = ['copy', 'insert'],
  showKeyboardHints = false
}) => {
  // Helper to add keyboard hint to label
  const withHint = (id: string, label: string): string => {
    if (showKeyboardHints && KEYBOARD_HINTS[id]) {
      return `${label} ${KEYBOARD_HINTS[id]}`;
    }
    return label;
  };

  // Build options based on requested actions
  const options: SegmentOption[] = [];

  if (actions.includes('copy') && onCopy) {
    options.push({ id: 'copy', label: withHint('copy', 'Copy') });
  }
  if (actions.includes('insert') && onInsert) {
    options.push({ id: 'insert', label: withHint('insert', 'Insert') });
  }
  if (actions.includes('edit') && onEdit) {
    options.push({ id: 'edit', label: 'Edit' });
  }
  if (actions.includes('train') && onTrain) {
    options.push({ id: 'train', label: 'Train' });
  }
  if (actions.includes('download') && onDownload) {
    options.push({ id: 'download', label: 'Download' });
  }
  if (actions.includes('reprocess') && onReprocess) {
    options.push({ id: 'reprocess', label: 'Redo' });
  }
  if (actions.includes('patient') && onPatient) {
    options.push({ id: 'patient', label: 'Patient' });
  }
  if (actions.includes('skip') && onSkip) {
    options.push({ id: 'skip', label: 'Skip' });
  }

  const handleChange = (id: string) => {
    switch (id) {
      case 'copy': onCopy?.(); break;
      case 'insert': onInsert?.(); break;
      case 'edit': onEdit?.(); break;
      case 'train': onTrain?.(); break;
      case 'download': onDownload?.(); break;
      case 'reprocess': onReprocess?.(); break;
      case 'patient': onPatient?.(); break;
      case 'skip': onSkip?.(); break;
    }
  };

  const successId = copiedRecently ? 'copy' : insertedRecently ? 'insert' : undefined;

  return (
    <SegmentedControl
      options={options}
      onChange={handleChange}
      successId={successId}
      multiSelect
      className={className}
    />
  );
});

ActionSegmentedControl.displayName = 'ActionSegmentedControl';

export default SegmentedControl;
