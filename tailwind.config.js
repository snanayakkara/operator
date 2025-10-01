/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/sidepanel/**/*.{js,ts,jsx,tsx}",
    "./src/popup/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        // Meaningful accent colors (used sparingly)
        accent: {
          emerald: '#10b981',      // Success/health states
          violet: '#8b5cf6',       // Processing/active states
          amber: '#f59e0b',        // Warnings/caution
          red: '#ef4444',          // Errors/critical states
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
      },
      borderRadius: {
        'fluent-sm': '4px',    // Default for cards, buttons, inputs
        'fluent-md': '8px',    // Overlays, dialogs, flyouts
      },
      borderWidth: {
        'fluent': '1px',       // Stroke-based layer separation
      },
      boxShadow: {
        'fluent-card': '0 0 2px rgba(0, 0, 0, 0.12)',          // Subtle card elevation (use sparingly)
        'fluent-flyout': '0 8px 16px rgba(0, 0, 0, 0.14)',     // Dialogs, menus, tooltips only
      },
    },
  },
  plugins: [],
}