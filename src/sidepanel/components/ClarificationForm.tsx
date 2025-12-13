/**
 * ClarificationForm Component
 *
 * Inline form for collecting clarification values in the command bar.
 * Per UI Intent Section 9:
 * - Ask follow-up questions IN the command bar
 * - ≤3 fields → ask all at once
 * - Tab between fields, Enter submits
 * - >3 fields → staged steps
 * - No modals, no focus jumps
 * - Keyboard only
 */

/* global HTMLSelectElement */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { animation } from '@/utils/designTokens';
import type { ClarificationRequest, ClarificationField, ActionResult } from '@/services/ActionExecutor';

export interface ClarificationFormProps {
  /** The clarification request with fields to collect */
  request: ClarificationRequest;
  /** Called when user submits clarification values */
  onSubmit: (values: Record<string, string>) => Promise<ActionResult>;
  /** Called when user cancels clarification */
  onCancel: () => void;
}

/**
 * Individual field component for inline rendering
 */
interface ClarificationFieldInputProps {
  field: ClarificationField;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement>;
}

const ClarificationFieldInput: React.FC<ClarificationFieldInputProps> = memo(({
  field,
  value,
  onChange,
  onKeyDown,
  autoFocus,
  inputRef
}) => {
  const baseInputClasses = `
    w-full px-2.5 py-1.5
    text-[12px] text-neutral-900 placeholder-neutral-400
    bg-white border border-neutral-200 rounded-md
    outline-none
    transition-colors
    focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20
  `;

  if (field.type === 'select' && field.options) {
    return (
      <div className="flex-1 min-w-0">
        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
          {field.label}
          {field.required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          className={baseInputClasses}
          aria-label={field.label}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {field.helperText && (
          <p className="text-[10px] text-neutral-500 mt-0.5">{field.helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
        {field.label}
        {field.required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={field.placeholder}
        autoFocus={autoFocus}
        className={baseInputClasses}
        aria-label={field.label}
      />
      {field.helperText && (
        <p className="text-[10px] text-neutral-500 mt-0.5">{field.helperText}</p>
      )}
    </div>
  );
});

ClarificationFieldInput.displayName = 'ClarificationFieldInput';

/**
 * Main ClarificationForm component
 */
export const ClarificationForm: React.FC<ClarificationFormProps> = memo(({
  request,
  onSubmit,
  onCancel
}) => {
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Initialize with default values
    const initial: Record<string, string> = {};
    request.fields.forEach(field => {
      initial[field.id] = field.defaultValue || '';
    });
    return initial;
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Determine if we need staged steps (>3 fields)
  const useSteps = request.fields.length > 3;
  const fieldsPerStep = 3;
  const totalSteps = useSteps ? Math.ceil(request.fields.length / fieldsPerStep) : 1;

  // Get current fields to display
  const currentFields = useSteps
    ? request.fields.slice(currentStep * fieldsPerStep, (currentStep + 1) * fieldsPerStep)
    : request.fields;

  // Focus first input when form appears or step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Update a field value
  const updateValue = useCallback((fieldId: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setValidationError(null);
  }, []);

  // Validate current step fields
  const validateCurrentFields = useCallback((): boolean => {
    const fields = useSteps ? currentFields : request.fields;
    for (const field of fields) {
      if (field.required && !values[field.id]?.trim()) {
        setValidationError(`${field.label} is required`);
        return false;
      }
    }
    return true;
  }, [currentFields, request.fields, useSteps, values]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateCurrentFields()) return;

    // If using steps and not on last step, advance
    if (useSteps && currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    // Validate all required fields before final submit
    for (const field of request.fields) {
      if (field.required && !values[field.id]?.trim()) {
        setValidationError(`${field.label} is required`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateCurrentFields, useSteps, currentStep, totalSteps, request.fields, values, onSubmit]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [handleSubmit, onCancel]);

  // Handle back button for stepped form
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setValidationError(null);
    }
  }, [currentStep]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      transition={{ duration: animation.duration.fast / 1000 }}
      className="mt-1.5 bg-violet-50 border border-violet-200 rounded-lg overflow-hidden"
      role="form"
      aria-label="Clarification required"
    >
      {/* Header with message */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-100">
        <MessageSquare size={14} className="text-violet-600 flex-shrink-0" />
        <p className="text-[12px] font-medium text-violet-800 flex-1">
          {request.message}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded hover:bg-violet-100 transition-colors"
          aria-label="Cancel"
        >
          <X size={14} className="text-violet-600" />
        </button>
      </div>

      {/* Fields */}
      <div className="px-3 py-2 space-y-2">
        {/* Step indicator for multi-step forms */}
        {useSteps && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-violet-600">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`
                    w-1.5 h-1.5 rounded-full transition-colors
                    ${i === currentStep ? 'bg-violet-600' : i < currentStep ? 'bg-violet-400' : 'bg-violet-200'}
                  `}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inline fields */}
        <div className={`flex gap-2 ${currentFields.length === 1 ? '' : 'flex-wrap'}`}>
          {currentFields.map((field, idx) => (
            <ClarificationFieldInput
              key={field.id}
              field={field}
              value={values[field.id] || ''}
              onChange={(value) => updateValue(field.id, value)}
              onKeyDown={handleKeyDown}
              autoFocus={idx === 0}
              inputRef={idx === 0 ? firstInputRef : undefined}
            />
          ))}
        </div>

        {/* Validation error */}
        {validationError && (
          <p className="text-[11px] text-rose-600 mt-1">{validationError}</p>
        )}
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-violet-100/50 border-t border-violet-100">
        <div className="text-[10px] text-violet-600">
          <span className="font-medium">Tab</span> between fields • <span className="font-medium">Enter</span> submit • <span className="font-medium">Esc</span> cancel
        </div>

        <div className="flex items-center gap-1.5">
          {/* Back button for stepped form */}
          {useSteps && currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="
                flex items-center gap-1 px-2 py-1
                text-[11px] font-medium
                text-violet-700 bg-violet-100 hover:bg-violet-200
                rounded transition-colors
              "
            >
              <ChevronLeft size={12} />
              Back
            </button>
          )}

          {/* Submit/Next button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`
              flex items-center gap-1 px-2.5 py-1
              text-[11px] font-semibold
              text-white bg-violet-600 hover:bg-violet-700
              rounded transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isSubmitting ? (
              <>
                <span className="animate-pulse">Submitting...</span>
              </>
            ) : useSteps && currentStep < totalSteps - 1 ? (
              <>
                Next
                <ChevronRight size={12} />
              </>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

ClarificationForm.displayName = 'ClarificationForm';

export default ClarificationForm;
