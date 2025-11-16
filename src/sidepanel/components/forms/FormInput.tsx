/**
 * FormInput Component
 *
 * Unified form input component with consistent styling and validation
 * Consolidates mono-input, pill-input, and glass-input patterns
 */

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { FieldValidationWrapper } from './ValidationMessage';
import { tokens } from '@/utils/design-tokens';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'error' | 'warning' | 'success';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Visual variant
   */
  variant?: InputVariant;

  /**
   * Input size
   */
  size?: InputSize;

  /**
   * Validation state
   */
  state?: InputState;

  /**
   * Label text
   */
  label?: string;

  /**
   * Error message (shows below input)
   */
  error?: string;

  /**
   * Warning message (shows below input)
   */
  warning?: string;

  /**
   * Success message (shows below input)
   */
  success?: string;

  /**
   * Helper text (shows below input when no validation message)
   */
  helperText?: string;

  /**
   * Icon to display on the left
   */
  startIcon?: React.ReactNode;

  /**
   * Icon to display on the right
   */
  endIcon?: React.ReactNode;

  /**
   * Additional class names for the container
   */
  containerClassName?: string;

  /**
   * Additional class names for the label
   */
  labelClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      state = 'default',
      label,
      error,
      warning,
      success,
      helperText,
      startIcon,
      endIcon,
      containerClassName = '',
      labelClassName = '',
      className = '',
      disabled,
      required,
      ...inputProps
    },
    ref
  ) => {
    // Determine effective state based on validation props
    const effectiveState = error ? 'error' : warning ? 'warning' : success ? 'success' : state;

    // Size classes
    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-5 text-lg',
    };

    // Variant base classes
    const variantClasses = {
      default: 'bg-white border-gray-300 hover:border-gray-400 focus:border-violet-500',
      filled: 'bg-gray-50 border-gray-200 hover:bg-gray-100 focus:bg-white focus:border-violet-500',
      outlined: 'bg-transparent border-2 border-gray-300 hover:border-gray-400 focus:border-violet-500',
    };

    // State-specific border colors
    const stateClasses = {
      default: '',
      error: '!border-rose-500 focus:!border-rose-500 focus:ring-rose-100',
      warning: '!border-amber-500 focus:!border-amber-500 focus:ring-amber-100',
      success: '!border-emerald-500 focus:!border-emerald-500 focus:ring-emerald-100',
    };

    // Icon colors based on state
    const iconColorClasses = {
      default: 'text-gray-400',
      error: 'text-rose-500',
      warning: 'text-amber-500',
      success: 'text-emerald-500',
    };

    // Disabled styles
    const disabledClasses = disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
      : '';

    // Label classes
    const labelClasses = `
      block text-sm font-medium mb-1.5
      ${effectiveState === 'error' ? 'text-rose-700' : 'text-gray-700'}
      ${disabled ? 'text-gray-400' : ''}
      ${labelClassName}
    `.trim();

    // Input wrapper classes (for icon positioning)
    const inputWrapperClasses = `
      relative flex items-center
      ${startIcon ? 'pl-10' : ''}
      ${endIcon ? 'pr-10' : ''}
    `.trim();

    // Input classes
    const inputClasses = `
      w-full
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${stateClasses[effectiveState]}
      ${disabledClasses}
      ${startIcon ? '!pl-10' : ''}
      ${endIcon ? '!pr-10' : ''}
      border rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-violet-100
      placeholder-gray-400
      ${className}
    `.trim();

    return (
      <FieldValidationWrapper
        error={error}
        warning={warning}
        success={success}
        helperText={helperText}
        className={containerClassName}
      >
        {label && (
          <label className={labelClasses}>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {startIcon && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconColorClasses[effectiveState]}`}
            >
              {startIcon}
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled}
            required={required}
            className={inputClasses}
            aria-invalid={effectiveState === 'error'}
            aria-describedby={
              error || warning || success || helperText
                ? `${inputProps.id}-message`
                : undefined
            }
            {...inputProps}
          />

          {endIcon && (
            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconColorClasses[effectiveState]}`}
            >
              {endIcon}
            </div>
          )}
        </div>
      </FieldValidationWrapper>
    );
  }
);

FormInput.displayName = 'FormInput';

/**
 * FormTextarea Component
 * Textarea variant with same validation patterns
 */
interface FormTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  variant?: InputVariant;
  state?: InputState;
  label?: string;
  error?: string;
  warning?: string;
  success?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  rows?: number;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      variant = 'default',
      state = 'default',
      label,
      error,
      warning,
      success,
      helperText,
      containerClassName = '',
      labelClassName = '',
      className = '',
      disabled,
      required,
      rows = 4,
      ...textareaProps
    },
    ref
  ) => {
    const effectiveState = error ? 'error' : warning ? 'warning' : success ? 'success' : state;

    const variantClasses = {
      default: 'bg-white border-gray-300 hover:border-gray-400 focus:border-violet-500',
      filled: 'bg-gray-50 border-gray-200 hover:bg-gray-100 focus:bg-white focus:border-violet-500',
      outlined: 'bg-transparent border-2 border-gray-300 hover:border-gray-400 focus:border-violet-500',
    };

    const stateClasses = {
      default: '',
      error: '!border-rose-500 focus:!border-rose-500 focus:ring-rose-100',
      warning: '!border-amber-500 focus:!border-amber-500 focus:ring-amber-100',
      success: '!border-emerald-500 focus:!border-emerald-500 focus:ring-emerald-100',
    };

    const disabledClasses = disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
      : '';

    const labelClasses = `
      block text-sm font-medium mb-1.5
      ${effectiveState === 'error' ? 'text-rose-700' : 'text-gray-700'}
      ${disabled ? 'text-gray-400' : ''}
      ${labelClassName}
    `.trim();

    const textareaClasses = `
      w-full px-4 py-3 text-base
      ${variantClasses[variant]}
      ${stateClasses[effectiveState]}
      ${disabledClasses}
      border rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-violet-100
      placeholder-gray-400
      resize-y
      ${className}
    `.trim();

    return (
      <FieldValidationWrapper
        error={error}
        warning={warning}
        success={success}
        helperText={helperText}
        className={containerClassName}
      >
        {label && (
          <label className={labelClasses}>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          required={required}
          rows={rows}
          className={textareaClasses}
          aria-invalid={effectiveState === 'error'}
          aria-describedby={
            error || warning || success || helperText
              ? `${textareaProps.id}-message`
              : undefined
          }
          {...textareaProps}
        />
      </FieldValidationWrapper>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

/**
 * FormSelect Component
 * Select dropdown with same validation patterns
 */
interface FormSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  state?: InputState;
  label?: string;
  error?: string;
  warning?: string;
  success?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      variant = 'default',
      size = 'md',
      state = 'default',
      label,
      error,
      warning,
      success,
      helperText,
      containerClassName = '',
      labelClassName = '',
      className = '',
      disabled,
      required,
      options,
      placeholder,
      ...selectProps
    },
    ref
  ) => {
    const effectiveState = error ? 'error' : warning ? 'warning' : success ? 'success' : state;

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-5 text-lg',
    };

    const variantClasses = {
      default: 'bg-white border-gray-300 hover:border-gray-400 focus:border-violet-500',
      filled: 'bg-gray-50 border-gray-200 hover:bg-gray-100 focus:bg-white focus:border-violet-500',
      outlined: 'bg-transparent border-2 border-gray-300 hover:border-gray-400 focus:border-violet-500',
    };

    const stateClasses = {
      default: '',
      error: '!border-rose-500 focus:!border-rose-500 focus:ring-rose-100',
      warning: '!border-amber-500 focus:!border-amber-500 focus:ring-amber-100',
      success: '!border-emerald-500 focus:!border-emerald-500 focus:ring-emerald-100',
    };

    const disabledClasses = disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
      : '';

    const labelClasses = `
      block text-sm font-medium mb-1.5
      ${effectiveState === 'error' ? 'text-rose-700' : 'text-gray-700'}
      ${disabled ? 'text-gray-400' : ''}
      ${labelClassName}
    `.trim();

    const selectClasses = `
      w-full
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${stateClasses[effectiveState]}
      ${disabledClasses}
      border rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-violet-100
      ${className}
    `.trim();

    return (
      <FieldValidationWrapper
        error={error}
        warning={warning}
        success={success}
        helperText={helperText}
        className={containerClassName}
      >
        {label && (
          <label className={labelClasses}>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          disabled={disabled}
          required={required}
          className={selectClasses}
          aria-invalid={effectiveState === 'error'}
          aria-describedby={
            error || warning || success || helperText
              ? `${selectProps.id}-message`
              : undefined
          }
          {...selectProps}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldValidationWrapper>
    );
  }
);

FormSelect.displayName = 'FormSelect';

export default FormInput;
