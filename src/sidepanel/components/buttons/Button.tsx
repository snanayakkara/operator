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
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
type IconRenderable =
  | React.ReactNode
  | React.ComponentType<{ className?: string }>
  | React.ElementType<{ className?: string }>;

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
  startIcon?: IconRenderable;

  /**
   * Legacy icon prop (alias for startIcon)
   */
  icon?: IconRenderable;

  /**
   * Icon to display after text
   */
  endIcon?: IconRenderable;

  /**
   * Full width button
   */
  fullWidth?: boolean;
}

const renderIcon = (icon: IconRenderable | undefined, sizeClass: string) => {
  if (!icon) {
    return null;
  }

  if (React.isValidElement(icon)) {
    const existing = (icon.props as { className?: string }).className || '';
    return React.cloneElement(icon, {
      className: [sizeClass, existing].filter(Boolean).join(' ')
    });
  }

  if (typeof icon === 'function') {
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={sizeClass} />;
  }

  if (typeof icon === 'object' && icon !== null) {
    const ElementType = icon as React.ElementType<{ className?: string }>;
    try {
      return React.createElement(ElementType, { className: sizeClass });
    } catch {
      // Fall through to render as-is if createElement fails
    }
  }

  return <span className={sizeClass}>{icon}</span>;
};

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
      icon,
      ...buttonProps
    },
    ref
  ) => {
    // Size classes
    const sizeClasses = {
      xs: 'h-7 px-2 text-xs gap-1',
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-base gap-2',
      lg: 'h-12 px-6 text-lg gap-2.5',
    } as const;

    // Variant classes - flat colors for clinical clarity
    const variantClasses = {
      primary: `
        bg-gray-900
        hover:bg-gray-800
        active:bg-gray-950
        text-white
        shadow-sm hover:shadow
      `,
      secondary: `
        bg-gray-100
        hover:bg-gray-200
        active:bg-gray-300
        text-gray-900
        border border-gray-200
      `,
      outline: `
        bg-transparent
        border border-gray-300
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
        bg-rose-500
        hover:bg-rose-600
        active:bg-rose-700
        text-white
        shadow-sm hover:shadow
      `,
      success: `
        bg-emerald-500
        hover:bg-emerald-600
        active:bg-emerald-700
        text-white
        shadow-sm hover:shadow
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
      transition-all duration-150
      focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1
      ${fullWidth ? 'w-full' : ''}
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${disabledClasses}
      ${className}
    `.trim();

    // Icon size based on button size
    const iconSize = {
      xs: 'w-3 h-3',
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
        {!isLoading && !isSuccess && renderIcon(startIcon ?? icon, iconSize)}

        {/* Button Text */}
        {children && <span>{children}</span>}

        {/* End Icon */}
        {!isLoading && !isSuccess && renderIcon(endIcon, iconSize)}
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
  icon: IconRenderable;

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
      children,
      ...buttonProps
    },
    ref
  ) => {
    // Size classes (square buttons)
    const sizeClasses = {
      xs: 'w-7 h-7',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    // Variant classes - flat colors for clinical clarity
    const variantClasses = {
      primary: `
        bg-gray-900
        hover:bg-gray-800
        text-white
        shadow-sm hover:shadow
      `,
      secondary: `
        bg-gray-100
        hover:bg-gray-200
        text-gray-900
        border border-gray-200
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
        bg-rose-500
        hover:bg-rose-600
        text-white
        shadow-sm hover:shadow
      `,
      success: `
        bg-emerald-500
        hover:bg-emerald-600
        text-white
        shadow-sm hover:shadow
      `,
    };

    const disabledClasses = disabled || isLoading
      ? 'opacity-60 cursor-not-allowed pointer-events-none'
      : '';

    const baseClasses = `
      inline-flex items-center justify-center
      rounded-lg
      transition-all duration-150
      focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${disabledClasses}
      ${className}
    `.trim();

    const iconSize = {
      xs: 'w-3.5 h-3.5',
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
          renderIcon(icon, iconSize)
        )}
        {children}
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
