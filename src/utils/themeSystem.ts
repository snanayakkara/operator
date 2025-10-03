/**
 * Theme System
 *
 * Provides comprehensive theming support with light/dark modes and automatic
 * OS preference detection. Built on top of the existing stateColors system
 * to ensure visual consistency across all themes.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  // Background colors
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
  };

  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    link: string;
  };

  // Border colors
  border: {
    primary: string;
    secondary: string;
    focus: string;
  };

  // Surface colors (cards, panels)
  surface: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
  };

  // Accent colors (unchanged across themes for brand consistency)
  accent: {
    emerald: string;
    blue: string;
    purple: string;
    rose: string;
    amber: string;
  };

  // State-specific colors (derived from stateColors.ts)
  state: {
    recording: string;
    transcribing: string;
    aiAnalysis: string;
    generation: string;
    completed: string;
    needsReview: string;
    error: string;
  };
}

/**
 * Light theme color palette (current default)
 */
export const LIGHT_THEME: ThemeColors = {
  bg: {
    primary: 'rgb(255, 255, 255)',
    secondary: 'rgb(249, 250, 251)', // gray-50
    tertiary: 'rgb(243, 244, 246)', // gray-100
    elevated: 'rgb(255, 255, 255)',
    overlay: 'rgba(0, 0, 0, 0.5)'
  },

  text: {
    primary: 'rgb(17, 24, 39)', // gray-900
    secondary: 'rgb(75, 85, 99)', // gray-600
    tertiary: 'rgb(156, 163, 175)', // gray-400
    inverse: 'rgb(255, 255, 255)',
    link: 'rgb(37, 99, 235)' // blue-600
  },

  border: {
    primary: 'rgb(229, 231, 235)', // gray-200
    secondary: 'rgb(243, 244, 246)', // gray-100
    focus: 'rgb(59, 130, 246)' // blue-500
  },

  surface: {
    primary: 'rgb(255, 255, 255)',
    secondary: 'rgb(249, 250, 251)', // gray-50
    tertiary: 'rgb(243, 244, 246)', // gray-100
    elevated: 'rgb(255, 255, 255)'
  },

  accent: {
    emerald: 'rgb(16, 185, 129)', // emerald-500
    blue: 'rgb(59, 130, 246)', // blue-500
    purple: 'rgb(168, 85, 247)', // purple-500
    rose: 'rgb(244, 63, 94)', // rose-500
    amber: 'rgb(245, 158, 11)' // amber-500
  },

  state: {
    recording: 'rgb(239, 68, 68)', // red-500
    transcribing: 'rgb(59, 130, 246)', // blue-500
    aiAnalysis: 'rgb(168, 85, 247)', // purple-500
    generation: 'rgb(16, 185, 129)', // emerald-500
    completed: 'rgb(20, 184, 166)', // teal-500
    needsReview: 'rgb(245, 158, 11)', // amber-500
    error: 'rgb(244, 63, 94)' // rose-500
  }
};

/**
 * Dark theme color palette (clinical dark mode)
 */
export const DARK_THEME: ThemeColors = {
  bg: {
    primary: 'rgb(17, 24, 39)', // gray-900
    secondary: 'rgb(31, 41, 55)', // gray-800
    tertiary: 'rgb(55, 65, 81)', // gray-700
    elevated: 'rgb(31, 41, 55)', // gray-800
    overlay: 'rgba(0, 0, 0, 0.75)'
  },

  text: {
    primary: 'rgb(243, 244, 246)', // gray-100
    secondary: 'rgb(209, 213, 219)', // gray-300
    tertiary: 'rgb(156, 163, 175)', // gray-400
    inverse: 'rgb(17, 24, 39)', // gray-900
    link: 'rgb(96, 165, 250)' // blue-400
  },

  border: {
    primary: 'rgb(75, 85, 99)', // gray-600
    secondary: 'rgb(55, 65, 81)', // gray-700
    focus: 'rgb(96, 165, 250)' // blue-400
  },

  surface: {
    primary: 'rgb(31, 41, 55)', // gray-800
    secondary: 'rgb(55, 65, 81)', // gray-700
    tertiary: 'rgb(75, 85, 99)', // gray-600
    elevated: 'rgb(55, 65, 81)' // gray-700
  },

  accent: {
    emerald: 'rgb(52, 211, 153)', // emerald-400
    blue: 'rgb(96, 165, 250)', // blue-400
    purple: 'rgb(192, 132, 252)', // purple-400
    rose: 'rgb(251, 113, 133)', // rose-400
    amber: 'rgb(251, 191, 36)' // amber-400
  },

  state: {
    recording: 'rgb(248, 113, 113)', // red-400
    transcribing: 'rgb(96, 165, 250)', // blue-400
    aiAnalysis: 'rgb(192, 132, 252)', // purple-400
    generation: 'rgb(52, 211, 153)', // emerald-400
    completed: 'rgb(45, 212, 191)', // teal-400
    needsReview: 'rgb(251, 191, 36)', // amber-400
    error: 'rgb(251, 113, 133)' // rose-400
  }
};

/**
 * Theme manager class
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private currentMode: ThemeMode = 'system';
  private resolvedTheme: ResolvedTheme = 'light';
  private listeners: Set<(theme: ResolvedTheme) => void> = new Set();
  private mediaQuery: MediaQueryList | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private initialize() {
    // Load saved preference
    const saved = localStorage.getItem('operator-theme-mode');
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
      this.currentMode = saved;
    }

    // Set up system preference listener
    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.handleSystemThemeChange);
    }

    // Apply initial theme
    this.applyTheme();
  }

  private handleSystemThemeChange = () => {
    if (this.currentMode === 'system') {
      this.applyTheme();
    }
  };

  private getSystemTheme(): ResolvedTheme {
    if (this.mediaQuery?.matches) {
      return 'dark';
    }
    return 'light';
  }

  private resolveTheme(): ResolvedTheme {
    if (this.currentMode === 'system') {
      return this.getSystemTheme();
    }
    return this.currentMode;
  }

  private applyTheme() {
    const newTheme = this.resolveTheme();
    this.resolvedTheme = newTheme;

    // Apply to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply CSS variables
    const colors = newTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
    this.applyCSSVariables(colors);

    // Notify listeners
    this.listeners.forEach(listener => listener(newTheme));
  }

  private applyCSSVariables(colors: ThemeColors) {
    const root = document.documentElement;

    // Background colors
    root.style.setProperty('--color-bg-primary', colors.bg.primary);
    root.style.setProperty('--color-bg-secondary', colors.bg.secondary);
    root.style.setProperty('--color-bg-tertiary', colors.bg.tertiary);
    root.style.setProperty('--color-bg-elevated', colors.bg.elevated);
    root.style.setProperty('--color-bg-overlay', colors.bg.overlay);

    // Text colors
    root.style.setProperty('--color-text-primary', colors.text.primary);
    root.style.setProperty('--color-text-secondary', colors.text.secondary);
    root.style.setProperty('--color-text-tertiary', colors.text.tertiary);
    root.style.setProperty('--color-text-inverse', colors.text.inverse);
    root.style.setProperty('--color-text-link', colors.text.link);

    // Border colors
    root.style.setProperty('--color-border-primary', colors.border.primary);
    root.style.setProperty('--color-border-secondary', colors.border.secondary);
    root.style.setProperty('--color-border-focus', colors.border.focus);

    // Surface colors
    root.style.setProperty('--color-surface-primary', colors.surface.primary);
    root.style.setProperty('--color-surface-secondary', colors.surface.secondary);
    root.style.setProperty('--color-surface-tertiary', colors.surface.tertiary);
    root.style.setProperty('--color-surface-elevated', colors.surface.elevated);

    // Accent colors
    root.style.setProperty('--color-accent-emerald', colors.accent.emerald);
    root.style.setProperty('--color-accent-blue', colors.accent.blue);
    root.style.setProperty('--color-accent-purple', colors.accent.purple);
    root.style.setProperty('--color-accent-rose', colors.accent.rose);
    root.style.setProperty('--color-accent-amber', colors.accent.amber);

    // State colors
    root.style.setProperty('--color-state-recording', colors.state.recording);
    root.style.setProperty('--color-state-transcribing', colors.state.transcribing);
    root.style.setProperty('--color-state-ai-analysis', colors.state.aiAnalysis);
    root.style.setProperty('--color-state-generation', colors.state.generation);
    root.style.setProperty('--color-state-completed', colors.state.completed);
    root.style.setProperty('--color-state-needs-review', colors.state.needsReview);
    root.style.setProperty('--color-state-error', colors.state.error);
  }

  /**
   * Set theme mode (light, dark, or system)
   */
  setMode(mode: ThemeMode) {
    this.currentMode = mode;
    localStorage.setItem('operator-theme-mode', mode);
    this.applyTheme();
  }

  /**
   * Get current theme mode setting
   */
  getMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Get resolved theme (actual light or dark)
   */
  getResolvedTheme(): ResolvedTheme {
    return this.resolvedTheme;
  }

  /**
   * Get current theme colors
   */
  getColors(): ThemeColors {
    return this.resolvedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: ResolvedTheme) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Toggle between light and dark (ignores system preference)
   */
  toggle() {
    const current = this.resolvedTheme;
    this.setMode(current === 'light' ? 'dark' : 'light');
  }
}

/**
 * React hook for using theme in components
 */
export function useTheme() {
  const [theme, setTheme] = React.useState<ResolvedTheme>(
    ThemeManager.getInstance().getResolvedTheme()
  );

  React.useEffect(() => {
    const manager = ThemeManager.getInstance();
    const unsubscribe = manager.subscribe(setTheme);
    return unsubscribe;
  }, []);

  const setMode = React.useCallback((mode: ThemeMode) => {
    ThemeManager.getInstance().setMode(mode);
  }, []);

  const toggle = React.useCallback(() => {
    ThemeManager.getInstance().toggle();
  }, []);

  return {
    theme,
    mode: ThemeManager.getInstance().getMode(),
    setMode,
    toggle,
    colors: ThemeManager.getInstance().getColors()
  };
}

// Initialize theme system on module load
if (typeof window !== 'undefined') {
  ThemeManager.getInstance();
}

// Missing React import
import React from 'react';
