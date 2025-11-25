/**
 * Skeleton Component
 *
 * Animated placeholder component for loading states
 * Reduces visual "jumping" when content loads
 */

import React from 'react';

interface SkeletonProps {
  /**
   * Width of the skeleton (CSS value or preset)
   */
  width?: string | number;

  /**
   * Height of the skeleton (CSS value or preset)
   */
  height?: string | number;

  /**
   * Border radius preset
   */
  rounded?: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'full';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Disable animation (for reduced motion preference)
   */
  noAnimation?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = '1rem',
  rounded = 'base',
  className = '',
  noAnimation = false,
}) => {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded',
    base: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  const widthStyle = width
    ? typeof width === 'number'
      ? `${width}px`
      : width
    : '100%';

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200
        ${roundedClass}
        ${noAnimation ? '' : 'animate-skeleton-pulse'}
        ${className}
      `}
      style={{
        width: widthStyle,
        height: heightStyle,
        backgroundSize: '200% 100%',
      }}
      role="status"
      aria-label="Loading..."
    />
  );
};

/**
 * SkeletonText Component
 * Pre-configured skeleton for text placeholders with multiple lines
 */
interface SkeletonTextProps {
  /**
   * Number of lines to display
   */
  lines?: number;

  /**
   * Gap between lines (in pixels)
   */
  gap?: number;

  /**
   * Width of the last line (percentage of full width)
   */
  lastLineWidth?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  gap = 8,
  lastLineWidth = 70,
  className = '',
}) => {
  return (
    <div className={`space-y-${gap / 4} ${className}`} role="status" aria-label="Loading text...">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={16}
          width={index === lines - 1 ? `${lastLineWidth}%` : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
};

/**
 * SkeletonCard Component
 * Pre-configured skeleton for card-based layouts
 */
interface SkeletonCardProps {
  /**
   * Include header section
   */
  showHeader?: boolean;

  /**
   * Include footer section
   */
  showFooter?: boolean;

  /**
   * Number of content lines
   */
  contentLines?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showHeader = true,
  showFooter = false,
  contentLines = 4,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 space-y-4 ${className}`}
      role="status"
      aria-label="Loading card..."
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-3">
          <Skeleton width={48} height={48} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton height={20} width="60%" rounded="sm" />
            <Skeleton height={16} width="40%" rounded="sm" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        {Array.from({ length: contentLines }).map((_, index) => (
          <Skeleton
            key={index}
            height={16}
            width={index === contentLines - 1 ? '70%' : '100%'}
            rounded="sm"
          />
        ))}
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="flex gap-2 pt-2">
          <Skeleton width={80} height={32} rounded="md" />
          <Skeleton width={80} height={32} rounded="md" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonTable Component
 * Pre-configured skeleton for table layouts
 */
interface SkeletonTableProps {
  /**
   * Number of rows
   */
  rows?: number;

  /**
   * Number of columns
   */
  columns?: number;

  /**
   * Show table header
   */
  showHeader?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading table...">
      {/* Header */}
      {showHeader && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} height={20} width="80%" rounded="sm" />
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-4 py-2"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} height={16} rounded="sm" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * SkeletonButton Component
 * Pre-configured skeleton for button placeholders
 */
interface SkeletonButtonProps {
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Button width
   */
  width?: string | number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  size = 'md',
  width = 100,
  className = '',
}) => {
  const heights = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  return (
    <Skeleton
      width={width}
      height={heights[size]}
      rounded="md"
      className={className}
      aria-label="Loading button..."
    />
  );
};

export default Skeleton;
