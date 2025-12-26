/**
 * Combobox Component
 *
 * Autocomplete dropdown that allows both selection from predefined options
 * and custom text input. Used for Procedure Planning fields.
 *
 * Features:
 * - Dropdown with predefined options
 * - Ability to type custom values
 * - Autocomplete/filtering as user types
 * - Consistent styling with FormInput
 */

import React, { useState, useRef, useEffect, forwardRef, InputHTMLAttributes } from 'react';
import { FieldValidationWrapper } from './ValidationMessage';
import type { InputVariant, InputSize, InputState } from './FormInput';

interface ComboboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
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
   * Additional class names for the container
   */
  containerClassName?: string;

  /**
   * Additional class names for the label
   */
  labelClassName?: string;

  /**
   * Predefined options to show in dropdown
   */
  options: string[];

  /**
   * Controlled value
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (value: string) => void;
}

const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
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
      options = [],
      value = '',
      onChange,
      placeholder,
      ...inputProps
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on input value
    useEffect(() => {
      const searchTerm = value.toLowerCase().trim();
      if (!searchTerm) {
        setFilteredOptions(options);
      } else {
        const filtered = options.filter(option =>
          option.toLowerCase().includes(searchTerm)
        );
        setFilteredOptions(filtered);
      }
    }, [value, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    // Input classes
    const inputClasses = `
      w-full
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${stateClasses[effectiveState]}
      ${disabledClasses}
      border rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-violet-500/20
      placeholder-gray-400
      ${className}
    `.trim();

    // Dropdown classes
    const dropdownClasses = `
      absolute z-50 w-full mt-1
      bg-white border border-gray-300 rounded-lg shadow-lg
      max-h-60 overflow-y-auto
      ${!isOpen || filteredOptions.length === 0 ? 'hidden' : ''}
    `.trim();

    // Option classes
    const optionClasses = (isSelected: boolean) => `
      px-4 py-2 cursor-pointer
      transition-colors duration-150
      ${isSelected ? 'bg-violet-100 text-violet-900' : 'hover:bg-gray-100 text-gray-900'}
    `.trim();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setIsOpen(true);
    };

    const handleOptionClick = (option: string) => {
      onChange(option);
      setIsOpen(false);
    };

    const handleInputFocus = () => {
      setIsOpen(true);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

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

        <div className="relative" ref={containerRef}>
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            className={inputClasses}
            aria-invalid={effectiveState === 'error'}
            aria-describedby={
              error || warning || success || helperText
                ? `${inputProps.id}-message`
                : undefined
            }
            aria-autocomplete="list"
            aria-expanded={isOpen}
            role="combobox"
            {...inputProps}
          />

          {/* Dropdown icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Dropdown list */}
          <div className={dropdownClasses} role="listbox">
            {filteredOptions.map((option) => (
              <div
                key={option}
                className={optionClasses(option === value)}
                onClick={() => handleOptionClick(option)}
                role="option"
                aria-selected={option === value}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      </FieldValidationWrapper>
    );
  }
);

Combobox.displayName = 'Combobox';

export default Combobox;
