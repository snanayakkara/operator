/**
 * Theme Toggle Component
 *
 * Compact toggle for switching between light/dark/system themes.
 * Includes visual indicator and tooltip for current theme.
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/utils/themeSystem';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  compact = false
}) => {
  const { theme, mode, setMode } = useTheme();

  const modes: ThemeMode[] = ['light', 'dark', 'system'];

  const getIcon = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
        return Monitor;
    }
  };

  const getLabel = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  const getTooltip = () => {
    if (mode === 'system') {
      return `System (currently ${theme})`;
    }
    return getLabel(mode);
  };

  const cycleTheme = () => {
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  const Icon = getIcon(mode);

  if (compact) {
    // Compact icon-only button
    return (
      <button
        onClick={cycleTheme}
        className={`
          p-2 rounded-lg transition-all duration-200
          bg-surface-secondary hover:bg-surface-tertiary
          border border-border-primary
          text-text-secondary hover:text-text-primary
          ${className}
        `}
        title={getTooltip()}
        aria-label={`Current theme: ${getTooltip()}. Click to change.`}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  // Full button with options
  return (
    <div className={`inline-flex rounded-lg bg-surface-secondary border border-border-primary p-1 ${className}`}>
      {modes.map((themeMode) => {
        const ModeIcon = getIcon(themeMode);
        const isActive = mode === themeMode;

        return (
          <button
            key={themeMode}
            onClick={() => setMode(themeMode)}
            className={`
              px-3 py-1.5 rounded-md transition-all duration-200 flex items-center space-x-2
              ${isActive
                ? 'bg-bg-primary shadow-sm text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
              }
            `}
            title={getLabel(themeMode)}
            aria-label={`Switch to ${getLabel(themeMode)} theme`}
            aria-pressed={isActive}
          >
            <ModeIcon className="w-4 h-4" />
            {showLabel && (
              <span className="text-xs font-medium">{getLabel(themeMode)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
