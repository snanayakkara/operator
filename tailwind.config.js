/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/sidepanel/**/*.{js,ts,jsx,tsx}",
    "./src/popup/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode via class strategy
  theme: {
    extend: {
      colors: {
        // Theme-aware colors (use CSS variables from themeSystem.ts)
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'bg-elevated': 'var(--color-bg-elevated)',
        'bg-overlay': 'var(--color-bg-overlay)',

        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'text-inverse': 'var(--color-text-inverse)',
        'text-link': 'var(--color-text-link)',

        'border-primary': 'var(--color-border-primary)',
        'border-secondary': 'var(--color-border-secondary)',
        'border-focus': 'var(--color-border-focus)',

        'surface-primary': 'var(--color-surface-primary)',
        'surface-secondary': 'var(--color-surface-secondary)',
        'surface-tertiary': 'var(--color-surface-tertiary)',
        'surface-elevated': 'var(--color-surface-elevated)',

        'accent-emerald': 'var(--color-accent-emerald)',
        'accent-blue': 'var(--color-accent-blue)',
        'accent-purple': 'var(--color-accent-purple)',
        'accent-rose': 'var(--color-accent-rose)',
        'accent-amber': 'var(--color-accent-amber)',

        'state-recording': 'var(--color-state-recording)',
        'state-transcribing': 'var(--color-state-transcribing)',
        'state-ai-analysis': 'var(--color-state-ai-analysis)',
        'state-generation': 'var(--color-state-generation)',
        'state-completed': 'var(--color-state-completed)',
        'state-needs-review': 'var(--color-state-needs-review)',
        'state-error': 'var(--color-state-error)',


        // Fluent Design System - Neutral Palette
        fluent: {
          neutral: {
            0: '#ffffff',
            4: '#fafafa',
            8: '#f5f5f5',
            12: '#f0f0f0',
            16: '#e0e0e0',
            20: '#d1d1d1',
            24: '#c7c7c7',
            32: '#b3b3b3',
            40: '#a3a3a3',
            60: '#757575',
            80: '#525252',
            120: '#292929',
            160: '#1a1a1a',
          },
        },
        // Semantic tokens (maps to Fluent neutrals)
        ink: {
          primary: '#1a1a1a',      // fluent-neutral-160
          secondary: '#525252',    // fluent-neutral-80
          tertiary: '#757575',     // fluent-neutral-60
          disabled: '#a3a3a3',     // fluent-neutral-40
        },
        surface: {
          primary: '#ffffff',      // fluent-neutral-0
          secondary: '#fafafa',    // fluent-neutral-4
          tertiary: '#f5f5f5',     // fluent-neutral-8
          subtle: '#f0f0f0',       // fluent-neutral-12
        },
        line: {
          primary: '#e0e0e0',      // fluent-neutral-16 (1px strokes)
          secondary: '#f0f0f0',    // fluent-neutral-12 (subtle dividers)
          subtle: '#f5f5f5',       // fluent-neutral-8
        },
        // Meaningful accent colors (used sparingly) - enriched with more vibrant tones
        accent: {
          emerald: '#10b981',      // Success/health states
          teal: '#14b8a6',         // Analogous to emerald for gradients
          violet: '#a855f7',       // Processing/active states (enriched from #8b5cf6)
          amber: '#f59e0b',        // Warnings/caution
          red: '#f43f5e',          // Errors/critical states (enriched rose from #ef4444)
          // Primary accent (Sera UI-inspired violet)
          primary: '#8B5CF6',
          'primary-hover': '#7C3AED',
          'primary-active': '#6D28D9',
        },
        // Legacy medical colors (deprecated - for gradual migration)
        medical: {
          primary: '#2563eb',
          secondary: '#1e40af',
          accent: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          text: '#1f2937',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        medical: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'recording': 'recording 1.5s ease-in-out infinite alternate',
        'click-feedback': 'clickFeedback 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        recording: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(1.05)', opacity: '1' },
        },
        clickFeedback: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 var(--click-shadow-color, rgba(168, 85, 247, 0))' },
          '50%': { transform: 'scale(0.98)', boxShadow: '0 0 0 4px var(--click-shadow-color, rgba(168, 85, 247, 0.3))' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 var(--click-shadow-color, rgba(168, 85, 247, 0))' },
        },
      },
      borderRadius: {
        'fluent-sm': '6px',    // Default for cards, buttons, inputs (softened from 4px)
        'fluent-md': '8px',    // Overlays, dialogs, flyouts
        'fluent-lg': '12px',   // Major containers, session cards
        'bright': '16px',      // Bright card design (macOS Big Sur style)
        'bright-sm': '12px',   // Smaller bright cards
        // Standardized radii (Sera UI-inspired)
        'button': '8px',       // All buttons and inputs
        'card': '12px',        // All cards and panels
        'modal': '16px',       // Modals and overlays
      },
      borderWidth: {
        'fluent': '1px',       // Stroke-based layer separation
        'bright': '2px',       // Bright card prominent borders
        'bright-thick': '3px', // Extra prominent borders
      },
      boxShadow: {
        'fluent-card': '0 0 2px rgba(0, 0, 0, 0.12)',          // Subtle card elevation (use sparingly)
        'fluent-flyout': '0 8px 16px rgba(0, 0, 0, 0.14)',     // Dialogs, menus, tooltips only
        'bright-card': '0 1px 3px rgba(0, 0, 0, 0.08)',        // Minimal shadow for bright cards
        'bright-elevated': '0 4px 12px rgba(0, 0, 0, 0.1)',    // Elevated bright cards
        // Standardized shadows (Sera UI-inspired)
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'modal': '0 20px 40px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        // Bright card gradient backgrounds (subtle, light)
        'gradient-bright': 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
        'gradient-bright-blue': 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        'gradient-bright-purple': 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
        'gradient-bright-emerald': 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        'gradient-bright-amber': 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        'gradient-bright-rose': 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
      },
    },
  },
  plugins: [],
}