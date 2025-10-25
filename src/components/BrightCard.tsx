/**
 * BrightCard Component
 *
 * Inspired by macOS Big Sur card design with:
 * - Bright white backgrounds with subtle gradients
 * - Prominent white/colored borders (2-3px)
 * - Larger corner radius (12-16px)
 * - Minimal shadows (border-focused elevation)
 * - High contrast icons and text
 *
 * Usage:
 * <BrightCard variant="default" size="md">
 *   <BrightCard.Icon><Users /></BrightCard.Icon>
 *   <BrightCard.Title>Application Groups</BrightCard.Title>
 *   <BrightCard.Description>Create rules...</BrightCard.Description>
 * </BrightCard>
 */

import React from 'react';

type BrightCardVariant =
  | 'default'     // Neutral gray gradient
  | 'blue'        // Blue accent
  | 'purple'      // Purple accent
  | 'emerald'     // Success/health
  | 'amber'       // Warning
  | 'rose';       // Error/critical

type BrightCardSize = 'sm' | 'md' | 'lg';

interface BrightCardProps {
  children: React.ReactNode;
  variant?: BrightCardVariant;
  size?: BrightCardSize;
  className?: string;
  onClick?: () => void;
  elevated?: boolean; // Use elevated shadow variant
}

interface BrightCardSubComponents {
  Icon: React.FC<{ children: React.ReactNode; className?: string }>;
  Title: React.FC<{ children: React.ReactNode; className?: string }>;
  Description: React.FC<{ children: React.ReactNode; className?: string }>;
  Badge: React.FC<{ children: React.ReactNode; variant?: BrightCardVariant; className?: string }>;
}

const getVariantClasses = (variant: BrightCardVariant) => {
  const variants = {
    default: {
      bg: 'bg-gradient-bright',
      border: 'border-white',
      text: 'text-gray-900',
      icon: 'text-gray-700',
    },
    blue: {
      bg: 'bg-gradient-bright-blue',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
    },
    purple: {
      bg: 'bg-gradient-bright-purple',
      border: 'border-purple-200',
      text: 'text-purple-900',
      icon: 'text-purple-600',
    },
    emerald: {
      bg: 'bg-gradient-bright-emerald',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      icon: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-gradient-bright-amber',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: 'text-amber-600',
    },
    rose: {
      bg: 'bg-gradient-bright-rose',
      border: 'border-rose-200',
      text: 'text-rose-900',
      icon: 'text-rose-600',
    },
  };

  return variants[variant];
};

const getSizeClasses = (size: BrightCardSize) => {
  const sizes = {
    sm: {
      padding: 'p-4',
      radius: 'rounded-bright-sm',
      gap: 'space-y-2',
    },
    md: {
      padding: 'p-6',
      radius: 'rounded-bright',
      gap: 'space-y-3',
    },
    lg: {
      padding: 'p-8',
      radius: 'rounded-bright',
      gap: 'space-y-4',
    },
  };

  return sizes[size];
};

const BrightCard: React.FC<BrightCardProps> & BrightCardSubComponents = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  elevated = false,
}) => {
  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);
  const shadow = elevated ? 'shadow-bright-elevated' : 'shadow-bright-card';
  const interactive = onClick ? 'cursor-pointer hover:shadow-bright-elevated transition-all duration-200' : '';

  return (
    <div
      onClick={onClick}
      className={`
        ${variantClasses.bg}
        ${variantClasses.border}
        ${sizeClasses.padding}
        ${sizeClasses.radius}
        ${sizeClasses.gap}
        ${shadow}
        ${interactive}
        border-bright
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Sub-components for common card sections
const Icon: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const Title: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <h3 className={`text-gray-900 font-semibold text-base ${className}`}>
    {children}
  </h3>
);

const Description: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <p className={`text-gray-600 text-sm leading-relaxed ${className}`}>
    {children}
  </p>
);

const Badge: React.FC<{
  children: React.ReactNode;
  variant?: BrightCardVariant;
  className?: string;
}> = ({
  children,
  variant = 'default',
  className = ''
}) => {
  const variantClasses = getVariantClasses(variant);

  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
      ${variantClasses.bg} ${variantClasses.border} ${variantClasses.text}
      border-bright
      ${className}
    `}>
      {children}
    </span>
  );
};

// Attach sub-components
BrightCard.Icon = Icon;
BrightCard.Title = Title;
BrightCard.Description = Description;
BrightCard.Badge = Badge;

export { BrightCard };
export type { BrightCardVariant, BrightCardSize };
