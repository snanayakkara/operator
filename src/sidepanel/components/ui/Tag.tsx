/**
 * Tag Component
 *
 * Rectangular tag-style labels with consistent border-radius.
 * Used for status indicators, categories, and metadata.
 */

import React, { memo } from 'react';

export type TagVariant = 'outline' | 'filled' | 'subtle';
export type TagColor = 'gray' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'cyan';

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  color?: TagColor;
  size?: 'xs' | 'sm';
  className?: string;
}

const colorStyles: Record<TagColor, Record<TagVariant, string>> = {
  gray: {
    outline: 'border-gray-300 text-gray-600',
    filled: 'bg-gray-900 text-white border-gray-900',
    subtle: 'bg-gray-100 text-gray-700 border-gray-100'
  },
  emerald: {
    outline: 'border-emerald-400 text-emerald-600',
    filled: 'bg-emerald-500 text-white border-emerald-500',
    subtle: 'bg-emerald-50 text-emerald-700 border-emerald-50'
  },
  amber: {
    outline: 'border-amber-400 text-amber-600',
    filled: 'bg-amber-500 text-white border-amber-500',
    subtle: 'bg-amber-50 text-amber-700 border-amber-50'
  },
  rose: {
    outline: 'border-rose-400 text-rose-600',
    filled: 'bg-rose-500 text-white border-rose-500',
    subtle: 'bg-rose-50 text-rose-700 border-rose-50'
  },
  blue: {
    outline: 'border-blue-400 text-blue-600',
    filled: 'bg-blue-500 text-white border-blue-500',
    subtle: 'bg-blue-50 text-blue-700 border-blue-50'
  },
  purple: {
    outline: 'border-purple-400 text-purple-600',
    filled: 'bg-purple-500 text-white border-purple-500',
    subtle: 'bg-purple-50 text-purple-700 border-purple-50'
  },
  cyan: {
    outline: 'border-cyan-400 text-cyan-600',
    filled: 'bg-cyan-500 text-white border-cyan-500',
    subtle: 'bg-cyan-50 text-cyan-700 border-cyan-50'
  }
};

export const Tag: React.FC<TagProps> = memo(({
  children,
  variant = 'outline',
  color = 'gray',
  size = 'xs',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5'
  };

  return (
    <span
      className={`
        inline-flex items-center
        font-medium uppercase tracking-wider
        rounded border
        ${sizeClasses[size]}
        ${colorStyles[color][variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
});

Tag.displayName = 'Tag';

export default Tag;
