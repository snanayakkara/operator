/**
 * Design Tokens for Operator UI
 *
 * Centralized design system tokens for consistent styling across components.
 * These tokens align with the UI overhaul design goals:
 * - 70% calm productivity (Notion/Linear) + 30% clinical instrument panel
 * - Light theme first
 * - Violet as primary accent
 * - Quick, snappy animations (120-220ms)
 */

// ============================================
// COLORS
// ============================================

export const colors = {
  // Primary accent
  primary: {
    DEFAULT: '#8B5CF6',
    hover: '#7C3AED',
    active: '#6D28D9',
    light: '#EDE9FE',
    subtle: '#F5F3FF'
  },

  // Neutral palette
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  },

  // Semantic colors
  success: {
    DEFAULT: '#10B981',
    light: '#D1FAE5',
    dark: '#059669'
  },
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706'
  },
  error: {
    DEFAULT: '#F43F5E',
    light: '#FFE4E6',
    dark: '#E11D48'
  },
  info: {
    DEFAULT: '#3B82F6',
    light: '#DBEAFE',
    dark: '#2563EB'
  },

  // Action color themes
  themes: {
    blue: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      icon: '#3B82F6'
    },
    purple: {
      bg: '#F5F3FF',
      border: '#DDD6FE',
      text: '#7C3AED',
      icon: '#8B5CF6'
    },
    emerald: {
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#059669',
      icon: '#10B981'
    },
    amber: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#D97706',
      icon: '#F59E0B'
    },
    red: {
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#DC2626',
      icon: '#EF4444'
    },
    cyan: {
      bg: '#ECFEFF',
      border: '#A5F3FC',
      text: '#0891B2',
      icon: '#06B6D4'
    },
    violet: {
      bg: '#F5F3FF',
      border: '#DDD6FE',
      text: '#7C3AED',
      icon: '#8B5CF6'
    }
  }
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px'
} as const;

// Numeric values for calculations
export const spacingValues = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
  none: '0px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px'
} as const;

// Semantic radius
export const radiusSemantic = {
  input: radius.sm,
  button: radius.md,
  card: radius.lg,
  modal: radius.xl,
  pill: radius.full
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.1)',
  lg: '0 20px 40px rgba(0, 0, 0, 0.15)',
  // Semantic shadows
  card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
  cardHover: '0 4px 12px rgba(0, 0, 0, 0.1)',
  dropdown: '0 4px 16px rgba(0, 0, 0, 0.12)',
  modal: '0 20px 40px rgba(0, 0, 0, 0.15)',
  // Focus ring
  focusRing: '0 0 0 2px rgba(139, 92, 246, 0.4)'
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
  },
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px'
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625'
  }
} as const;

// ============================================
// ANIMATION
// ============================================

export const animation = {
  // Durations (ms)
  duration: {
    instant: 0,
    fast: 120,
    normal: 180,
    slow: 220,
    slower: 300
  },

  // Easing curves (as arrays for Framer Motion compatibility)
  easing: {
    // Standard easing for most transitions
    default: [0.4, 0, 0.2, 1] as const,
    // Ease out for entrances
    out: [0.0, 0.0, 0.2, 1] as const,
    // Ease in for exits
    in: [0.4, 0, 1, 1] as const,
    // Ease in-out for continuous motion
    inOut: [0.4, 0, 0.2, 1] as const,
    // Spring-like for playful interactions
    spring: [0.34, 1.56, 0.64, 1] as const
  },

  // CSS easing strings (for CSS transitions)
  easingCSS: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  },

  // Framer Motion spring configs
  spring: {
    gentle: { damping: 25, stiffness: 300, mass: 1 },
    responsive: { damping: 30, stiffness: 400, mass: 0.8 },
    bouncy: { damping: 18, stiffness: 300, mass: 1.2 },
    crisp: { damping: 40, stiffness: 500, mass: 0.6 }
  }
} as const;

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  drawer: 300,
  modal: 400,
  toast: 500,
  tooltip: 600
} as const;

// ============================================
// LAYOUT
// ============================================

export const layout = {
  // Side panel constraints
  sidePanel: {
    width: 360,
    minWidth: 320,
    maxWidth: 400
  },

  // Header heights
  header: {
    mini: 40,
    command: 48,
    favourites: 56
  },

  // Component sizes
  iconButton: {
    sm: 28,
    md: 32,
    lg: 40
  },

  // Drawer
  drawer: {
    maxHeight: 'calc(100vh - 200px)'
  }
} as const;

// ============================================
// CSS VARIABLE HELPERS
// ============================================

/**
 * Generate CSS custom properties from tokens
 */
export function generateCSSVariables(): string {
  return `
    :root {
      /* Primary */
      --color-primary: ${colors.primary.DEFAULT};
      --color-primary-hover: ${colors.primary.hover};
      --color-primary-active: ${colors.primary.active};
      --color-primary-light: ${colors.primary.light};
      --color-primary-subtle: ${colors.primary.subtle};

      /* Neutral */
      --color-bg-primary: ${colors.neutral[0]};
      --color-bg-secondary: ${colors.neutral[50]};
      --color-bg-tertiary: ${colors.neutral[100]};
      --color-border-primary: ${colors.neutral[200]};
      --color-border-secondary: ${colors.neutral[100]};
      --color-text-primary: ${colors.neutral[900]};
      --color-text-secondary: ${colors.neutral[600]};
      --color-text-tertiary: ${colors.neutral[500]};

      /* Semantic */
      --color-success: ${colors.success.DEFAULT};
      --color-warning: ${colors.warning.DEFAULT};
      --color-error: ${colors.error.DEFAULT};
      --color-info: ${colors.info.DEFAULT};

      /* Spacing */
      --space-xs: ${spacing.xs};
      --space-sm: ${spacing.sm};
      --space-md: ${spacing.md};
      --space-lg: ${spacing.lg};
      --space-xl: ${spacing.xl};

      /* Radius */
      --radius-sm: ${radius.sm};
      --radius-md: ${radius.md};
      --radius-lg: ${radius.lg};
      --radius-xl: ${radius.xl};

      /* Shadows */
      --shadow-sm: ${shadows.sm};
      --shadow-md: ${shadows.md};
      --shadow-lg: ${shadows.lg};
      --shadow-card: ${shadows.card};
      --shadow-dropdown: ${shadows.dropdown};

      /* Animation */
      --duration-fast: ${animation.duration.fast}ms;
      --duration-normal: ${animation.duration.normal}ms;
      --duration-slow: ${animation.duration.slow}ms;
      --ease-default: ${animation.easing.default};
      --ease-out: ${animation.easing.out};
      --ease-spring: ${animation.easing.spring};
    }
  `;
}

/**
 * Get color theme styles for an action
 */
export function getThemeStyles(theme: keyof typeof colors.themes) {
  const t = colors.themes[theme];
  return {
    backgroundColor: t.bg,
    borderColor: t.border,
    color: t.text,
    '--icon-color': t.icon
  };
}

/**
 * CSS transition helper
 */
export function transition(
  properties: string[] = ['all'],
  duration: keyof typeof animation.duration = 'normal',
  easing: keyof typeof animation.easing = 'default'
): string {
  const d = animation.duration[duration];
  const e = animation.easing[easing];
  return properties.map(p => `${p} ${d}ms ${e}`).join(', ');
}
