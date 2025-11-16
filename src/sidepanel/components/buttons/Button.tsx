/**
 * Button Component
 *
 * Unified button component with consistent variants, sizes, and states
 * Consolidates all button patterns (btn-primary, btn-secondary, pill-button, etc.)
 */

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2, Check } from 'lucide-react';
import { tokens } from '@/utils/design-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant
   */
  variant?: ButtonVariant;

  /**
   * Button size
   */
  size?: ButtonSize;

  /**
   * Loading state (shows spinner)
   */
  isLoading?: boolean;

  /**
   * Success state (shows checkmark briefly)
   */
  isSuccess?: boolean;

  /**
   * Icon to display before text
   */
  startIcon?: React.ReactNode;

  /**
   * Icon to display after text
   */
  endIcon?: React.ReactNode;

  /**
   * Full width button
   */
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isSuccess = false,
      startIcon,
      endIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...buttonProps
    },
    ref
  ) => {
    // Size classes
    const sizeClasses = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-base gap-2',
      lg: 'h-12 px-6 text-lg gap-2.5',
    };

    // Variant classes
    const variantClasses = {
      primary: `
        bg-gradient-to-r from-violet-500 to-purple-600
        hover:from-violet-600 hover:to-purple-700
        active:from-violet-700 active:to-purple-800
        text-white
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-gradient-to-r from-blue-500 to-indigo-600
        hover:from-blue-600 hover:to-indigo-700
        active:from-blue-700 active:to-indigo-800
        text-white
        shadow-sm hover:shadow-md
      `,
      outline: `
        bg-transparent
        border-2 border-gray-300
        hover:border-gray-400 hover:bg-gray-50
        active:bg-gray-100
        text-gray-700
      `,
      ghost: `
        bg-transparent
        hover:bg-gray-100
        active:bg-gray-200
        text-gray-700
      `,
      danger: `
        bg-gradient-to-r from-rose-500 to-pink-600
        hover:from-rose-600 hover:to-pink-700
        active:from-rose-700 active:to-pink-800
        text-white
        shadow-sm hover:shadow-md
      `,
      success: `
        bg-gradient-to-r from-emerald-500 to-teal-600
        hover:from-emerald-600 hover:to-teal-700
        active:from-emerald-700 active:to-teal-800
        text-white
        shadow-sm hover:shadow-md
      `,
    };

    // Disabled styles
    const disabledClasses = disabled || isLoading
      ? 'opacity-60 cursor-not-allowed pointer-events-none'
      : '';

    // Base classes
    const baseClasses = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
      ${fullWidth ? 'w-full' : ''}
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${disabledClasses}
      ${className}
    `.trim();

    // Icon size based on button size
    const iconSize = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={baseClasses}
        {...buttonProps}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <Loader2 className={`${iconSize} animate-spin`} />
        )}

        {/* Success Checkmark */}
        {!isLoading && isSuccess && (
          <Check className={`${iconSize}`} />
        )}

        {/* Start Icon */}
        {!isLoading && !isSuccess && startIcon && (
          <span className={iconSize}>{startIcon}</span>
        )}

        {/* Button Text */}
        {children && <span>{children}</span>}

        {/* End Icon */}
        {!isLoading && !isSuccess && endIcon && (
          <span className={iconSize}>{endIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * IconButton Component
 * Button with only an icon (no text)
 */
interface IconButtonProps extends Omit<ButtonProps, 'startIcon' | 'endIcon'> {
  /**
   * Icon to display
   */
  icon: React.ReactNode;

  /**
   * Accessible label
   */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      ...buttonProps
    },
    ref
  ) => {
    // Size classes (square buttons)
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    // Variant classes
    const variantClasses = {
      primary: `
        bg-gradient-to-r from-violet-500 to-purple-600
        hover:from-violet-600 hover:to-purple-700
        text-white
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-gradient-to-r from-blue-500 to-indigo-600
        hover:from-blue-600 hover:to-indigo-700
        text-white
        shadow-sm hover:shadow-md
      `,
      outline: `
        bg-transparent
        border border-gray-300
        hover:border-gray-400 hover:bg-gray-50
        text-gray-700
      `,
      ghost: `
        bg-transparent
        hover:bg-gray-100
        active:bg-gray-200
        text-gray-700
      `,
      danger: `
        bg-gradient-to-r from-rose-500 to-pink-600
        hover:from-rose-600 hover:to-pink-700
        text-white
        shadow-sm hover:shadow-md
      `,
      success: `
        bg-gradient-to-r from-emerald-500 to-teal-600
        hover:from-emerald-600 hover:to-teal-700
        text-white
        shadow-sm hover:shadow-md
      `,
    };

    const disabledClasses = disabled || isLoading
      ? 'opacity-60 cursor-not-allowed pointer-events-none'
      : '';

    const baseClasses = `
      inline-flex items-center justify-center
      rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${disabledClasses}
      ${className}
    `.trim();

    const iconSize = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={baseClasses}
        {...buttonProps}
      >
        {isLoading ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <span className={iconSize}>{icon}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * ButtonGroup Component
 * Group multiple buttons with proper spacing
 */
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className = '',
  orientation = 'horizontal',
  spacing = 'md',
}) => {
  const spacingClasses = {
    sm: orientation === 'horizontal' ? 'gap-1' : 'gap-1',
    md: orientation === 'horizontal' ? 'gap-2' : 'gap-2',
    lg: orientation === 'horizontal' ? 'gap-3' : 'gap-3',
  };

  const orientationClass = orientation === 'horizontal' ? 'flex-row' : 'flex-col';

  return (
    <div className={`flex ${orientationClass} ${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
};

export default Button;
