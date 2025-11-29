import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  tooltip: string;
  size?: 'xs' | 'sm';
  variant?: 'default' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  tooltip,
  size = 'xs',
  variant = 'default',
  disabled = false,
  loading = false,
  className = ''
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-7 w-7'
  };

  const iconSizes = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4'
  };

  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    danger: 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      aria-label={tooltip}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        inline-flex items-center justify-center
        rounded-md
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        flex-shrink-0
        ${className}
      `}
    >
      {loading ? (
        <div className={`${iconSizes[size]} animate-spin`}>
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
};
