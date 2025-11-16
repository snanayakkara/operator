/**
 * Design Tokens - Single Source of Truth
 *
 * Centralized design system tokens for consistent theming across the application.
 * Integrates with existing stateColors.ts for state-based color definitions.
 *
 * Usage:
 * - Import tokens for programmatic access: `import { tokens } from '@/utils/design-tokens'`
 * - Use CSS variables in stylesheets: `var(--color-action-primary)`
 * - Supports light/dark mode through CSS variable overrides
 */

import { STATE_COLORS, ProcessingState } from './stateColors';

/**
 * Color Tokens
 */
export const colors = {
  // Action colors (buttons, links, interactive elements)
  action: {
    primary: '#8b5cf6',      // violet-500
    secondary: '#6366f1',    // indigo-500
    accent: '#22d3ee',       // cyan-400
    danger: '#ef4444',       // red-500
    success: '#10b981',      // emerald-500
    warning: '#f59e0b',      // amber-500
  },

  // State colors (from stateColors.ts)
  state: STATE_COLORS,

  // Semantic colors
  text: {
    primary: '#1f2937',      // gray-800
    secondary: '#6b7280',    // gray-500
    tertiary: '#9ca3af',     // gray-400
    inverse: '#ffffff',
    disabled: '#d1d5db',     // gray-300
  },

  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',    // gray-50
    tertiary: '#f3f4f6',     // gray-100
    inverse: '#1f2937',      // gray-800
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  border: {
    default: '#e5e7eb',      // gray-200
    light: '#f3f4f6',        // gray-100
    dark: '#d1d5db',         // gray-300
    focus: '#8b5cf6',        // violet-500
  },

  // Specialty colors (for specific components)
  specialty: {
    procedure: '#ec4899',    // pink-500
    documentation: '#8b5cf6', // violet-500
    investigation: '#3b82f6', // blue-500
    education: '#10b981',    // emerald-500
  },
} as const;

/**
 * Spacing Tokens (in pixels)
 * Based on 4px grid system
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
} as const;

/**
 * Typography Tokens
 */
export const typography = {
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Border Radius Tokens (in pixels)
 */
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * Shadow Tokens
 */
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

/**
 * Animation Tokens
 */
export const animations = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
  },

  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

/**
 * Z-Index Tokens
 * Centralized z-index management for layering
 */
export const zIndex = {
  base: 0,
  dropdown: 999999,
  modal: 999998,
  tooltip: 999997,
  notification: 999996,
  overlay: 999995,
} as const;

/**
 * Breakpoint Tokens (for future responsive enhancements)
 * Note: Currently optimized for 420px side panel
 */
export const breakpoints = {
  sidePanelMin: 420,
  sidePanelMax: 420,
} as const;

/**
 * Component-Specific Tokens
 */
export const components = {
  // Button sizing
  button: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
    },
    padding: {
      sm: { x: spacing.md, y: spacing.xs },
      md: { x: spacing.lg, y: spacing.sm },
      lg: { x: spacing.xl, y: spacing.md },
    },
  },

  // Input sizing
  input: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
    },
    padding: {
      sm: { x: spacing.sm, y: spacing.xs },
      md: { x: spacing.md, y: spacing.sm },
      lg: { x: spacing.lg, y: spacing.md },
    },
  },

  // Modal sizing
  modal: {
    width: {
      sm: 400,
      md: 600,
      lg: 800,
      xl: 1000,
    },
    maxHeight: '90vh',
    padding: spacing.xl,
  },

  // Progress bar
  progressBar: {
    height: 8,
    borderRadius: borderRadius.full,
  },

  // Badge/Chip
  badge: {
    height: 24,
    padding: { x: spacing.sm, y: spacing.xs },
    fontSize: typography.fontSize.xs,
  },
} as const;

/**
 * Consolidated Token Export
 */
export const tokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animations,
  zIndex,
  breakpoints,
  components,
} as const;

/**
 * CSS Custom Properties Generator
 * Generates CSS variables for use in stylesheets
 */
export function generateCSSVariables(): string {
  return `
    :root {
      /* Action Colors */
      --color-action-primary: ${colors.action.primary};
      --color-action-secondary: ${colors.action.secondary};
      --color-action-accent: ${colors.action.accent};
      --color-action-danger: ${colors.action.danger};
      --color-action-success: ${colors.action.success};
      --color-action-warning: ${colors.action.warning};

      /* Text Colors */
      --color-text-primary: ${colors.text.primary};
      --color-text-secondary: ${colors.text.secondary};
      --color-text-tertiary: ${colors.text.tertiary};
      --color-text-inverse: ${colors.text.inverse};
      --color-text-disabled: ${colors.text.disabled};

      /* Background Colors */
      --color-bg-primary: ${colors.background.primary};
      --color-bg-secondary: ${colors.background.secondary};
      --color-bg-tertiary: ${colors.background.tertiary};
      --color-bg-inverse: ${colors.background.inverse};
      --color-bg-overlay: ${colors.background.overlay};

      /* Border Colors */
      --color-border-default: ${colors.border.default};
      --color-border-light: ${colors.border.light};
      --color-border-dark: ${colors.border.dark};
      --color-border-focus: ${colors.border.focus};

      /* Spacing */
      --spacing-xs: ${spacing.xs}px;
      --spacing-sm: ${spacing.sm}px;
      --spacing-md: ${spacing.md}px;
      --spacing-lg: ${spacing.lg}px;
      --spacing-xl: ${spacing.xl}px;
      --spacing-2xl: ${spacing['2xl']}px;
      --spacing-3xl: ${spacing['3xl']}px;
      --spacing-4xl: ${spacing['4xl']}px;
      --spacing-5xl: ${spacing['5xl']}px;

      /* Typography */
      --font-family-base: ${typography.fontFamily.base};
      --font-family-mono: ${typography.fontFamily.mono};

      /* Shadows */
      --shadow-xs: ${shadows.xs};
      --shadow-sm: ${shadows.sm};
      --shadow-base: ${shadows.base};
      --shadow-md: ${shadows.md};
      --shadow-lg: ${shadows.lg};
      --shadow-xl: ${shadows.xl};
      --shadow-inner: ${shadows.inner};

      /* Border Radius */
      --radius-sm: ${borderRadius.sm}px;
      --radius-base: ${borderRadius.base}px;
      --radius-md: ${borderRadius.md}px;
      --radius-lg: ${borderRadius.lg}px;
      --radius-xl: ${borderRadius.xl}px;
      --radius-full: ${borderRadius.full}px;

      /* Animations */
      --duration-fast: ${animations.duration.fast}ms;
      --duration-normal: ${animations.duration.normal}ms;
      --duration-slow: ${animations.duration.slow}ms;

      /* Z-Index */
      --z-dropdown: ${zIndex.dropdown};
      --z-modal: ${zIndex.modal};
      --z-tooltip: ${zIndex.tooltip};
      --z-notification: ${zIndex.notification};
      --z-overlay: ${zIndex.overlay};
    }

    /* Dark Mode Overrides */
    .dark {
      --color-text-primary: #f9fafb;
      --color-text-secondary: #d1d5db;
      --color-text-tertiary: #9ca3af;
      --color-text-inverse: #1f2937;

      --color-bg-primary: #1f2937;
      --color-bg-secondary: #111827;
      --color-bg-tertiary: #374151;
      --color-bg-inverse: #ffffff;

      --color-border-default: #374151;
      --color-border-light: #4b5563;
      --color-border-dark: #6b7280;
    }
  `;
}

/**
 * Type exports for TypeScript autocomplete
 */
export type ColorTokens = typeof colors;
export type SpacingTokens = typeof spacing;
export type TypographyTokens = typeof typography;
export type ShadowTokens = typeof shadows;
export type AnimationTokens = typeof animations;
export type ZIndexTokens = typeof zIndex;
export type ComponentTokens = typeof components;

/**
 * Helper Functions
 */

/**
 * Get state color with fallback
 */
export function getStateColor(state: ProcessingState, key: 'text' | 'indicator' | 'border'): string {
  const stateColor = colors.state[state];
  if (!stateColor) return colors.text.secondary;

  switch (key) {
    case 'text':
      return `var(--color-${stateColor.text})`;
    case 'indicator':
      return `var(--color-${stateColor.indicator})`;
    case 'border':
      return `var(--color-${stateColor.border})`;
    default:
      return colors.text.secondary;
  }
}

/**
 * Convert spacing token to CSS value
 */
export function getSpacing(size: keyof typeof spacing): string {
  return `${spacing[size]}px`;
}

/**
 * Convert shadow token to CSS value
 */
export function getShadow(size: keyof typeof shadows): string {
  return shadows[size];
}

export default tokens;
