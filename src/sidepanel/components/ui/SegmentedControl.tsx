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
}

export const SegmentedControl: React.FC<SegmentedControlProps> = memo(({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
  successId,
  multiSelect = false,
  fullWidth = false
}) => {
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
      className={`inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 ${fullWidth ? 'w-full' : ''} ${className}`}
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
              rounded transition-all duration-150
              font-medium whitespace-nowrap
              ${sizeClasses[size]}
              ${isSelected && !multiSelect
                ? 'bg-white text-gray-900 shadow-sm'
                : isSuccess
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }
              ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1
            `}
          >
            {isSuccess ? (
              <Check className={iconSizes[size]} />
            ) : Icon && (
              <Icon className={iconSizes[size]} />
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
  actions = ['copy', 'insert']
}) => {
  // Build options based on requested actions
  const options: SegmentOption[] = [];

  if (actions.includes('copy') && onCopy) {
    options.push({ id: 'copy', label: 'Copy' });
  }
  if (actions.includes('insert') && onInsert) {
    options.push({ id: 'insert', label: 'Insert' });
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
