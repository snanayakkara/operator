/**
 * Inline Field Editor Component
 *
 * Lightweight click-to-edit component for RHC measured fields:
 * - Click any measured field to edit inline
 * - Auto-save on blur or Enter key
 * - No strict validation - allow any value with warnings
 * - Show warning if value is out of normal range
 * - Escape key to cancel
 */

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface InlineFieldEditorProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  normalRange?: { min: number; max: number };
  onSave: (newValue: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  fieldType?: 'number' | 'text';
}

export const InlineFieldEditor: React.FC<InlineFieldEditorProps> = ({
  label: _label,
  value,
  unit,
  normalRange,
  onSave,
  onCancel,
  placeholder = 'Enter value',
  fieldType = 'number'
}) => {
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const checkWarning = (val: string) => {
    if (!normalRange || !val) return false;
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return false;
    return numVal < normalRange.min || numVal > normalRange.max;
  };

  const handleSave = () => {
    const trimmed = editValue.trim();

    // Check if value changed
    if (trimmed === String(value ?? '')) {
      onCancel?.();
      return;
    }

    // Allow any value (including empty, letters, etc.)
    onSave(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  const handleBlur = () => {
    // Auto-save on blur
    handleSave();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditValue(val);
    setShowWarning(checkWarning(val));
  };

  return (
    <div className="inline-flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 flex-1">
        <input
          ref={inputRef}
          type={fieldType}
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
          step={fieldType === 'number' ? 'any' : undefined}
        />
        {unit && <span className="text-sm text-gray-600">{unit}</span>}
      </div>

      {showWarning && normalRange && (
        <div className="flex items-center gap-1 text-orange-600 text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span>Out of range ({normalRange.min}-{normalRange.max})</span>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-gray-500">
        <CheckCircle2 className="w-3 h-3" />
        <span>Enter</span>
        <span className="mx-1">|</span>
        <X className="w-3 h-3" />
        <span>Esc</span>
      </div>
    </div>
  );
};

/**
 * Clickable Field Display
 * Shows field value with click-to-edit functionality
 */

interface ClickableFieldProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  normalRange?: { min: number; max: number };
  onEdit: (newValue: string) => void;
  isCalculated?: boolean;
  fieldType?: 'number' | 'text';
}

export const ClickableField: React.FC<ClickableFieldProps> = ({
  label,
  value,
  unit,
  normalRange,
  onEdit,
  isCalculated = false,
  fieldType = 'number'
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (newValue: string) => {
    onEdit(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleClick = () => {
    if (!isCalculated) {
      setIsEditing(true);
    }
  };

  const displayValue = value ?? '–';
  const isOutOfRange = normalRange && value && !isNaN(Number(value))
    ? Number(value) < normalRange.min || Number(value) > normalRange.max
    : false;

  if (isEditing) {
    return (
      <InlineFieldEditor
        label={label}
        value={value}
        unit={unit}
        normalRange={normalRange}
        onSave={handleSave}
        onCancel={handleCancel}
        fieldType={fieldType}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded
        ${isCalculated
          ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
          : 'bg-gray-50 text-gray-900 hover:bg-blue-50 hover:border-blue-200 border border-transparent cursor-pointer transition-all'
        }
        ${isOutOfRange ? 'ring-1 ring-orange-300' : ''}
      `}
      title={isCalculated ? `${label} (Calculated - Read Only)` : `Click to edit ${label}`}
    >
      <span className="font-medium text-sm">
        {displayValue}
        {unit && ` ${unit}`}
      </span>
      {!isCalculated && (
        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">✎</span>
      )}
      {isOutOfRange && (
        <div title="Out of normal range">
          <AlertTriangle className="w-3 h-3 text-orange-500" />
        </div>
      )}
    </div>
  );
};
