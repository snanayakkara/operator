/**
 * UIPreferencesSection - User interface preferences and appearance settings
 *
 * Allows users to customize:
 * - Card theme (subtle, bright, future themes)
 * - Live preview of each theme
 * - Future UI preferences
 */

import React, { useState, useEffect } from 'react';
import { Palette, Check, AlertCircle } from 'lucide-react';
import { logger } from '@/utils/Logger';

const STORAGE_KEY_CARD_THEME = 'ui_preferences_card_theme';

type CardTheme = 'subtle' | 'bright';

interface ThemeOption {
  id: CardTheme;
  name: string;
  description: string;
  icon: React.ReactNode;
  previewClasses: string;
  borderClasses: string;
  iconColor: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'subtle',
    name: 'Subtle',
    description: 'Pastel backgrounds with soft colors',
    icon: <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-teal-400" />,
    previewClasses: 'border-2 border-emerald-200 bg-emerald-50',
    borderClasses: 'border-emerald-300 hover:border-emerald-400',
    iconColor: 'text-emerald-600'
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'High contrast with prominent borders',
    icon: <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-400 to-blue-400" />,
    previewClasses: 'border-bright border-purple-300 bg-gradient-bright-purple shadow-bright-card',
    borderClasses: 'border-purple-300 hover:border-purple-400',
    iconColor: 'text-purple-600'
  }
];

export const UIPreferencesSection: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('subtle');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preference from Chrome storage
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEY_CARD_THEME);
        const theme = result[STORAGE_KEY_CARD_THEME] as CardTheme;
        setSelectedTheme(theme || 'subtle');
      } catch (error) {
        logger.error('Failed to load UI theme preference', {
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, []);

  // Save preference to Chrome storage
  const handleThemeSelect = async (theme: CardTheme) => {
    if (theme === selectedTheme) return;

    setIsSaving(true);

    try {
      await chrome.storage.local.set({
        [STORAGE_KEY_CARD_THEME]: theme
      });

      setSelectedTheme(theme);

      logger.info('UI theme preference updated', {
        setting: 'card_theme',
        value: theme
      });
    } catch (error) {
      logger.error('Failed to save UI theme preference', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
        <div className="flex items-center space-x-2 mb-3">
          <Palette className="w-5 h-5 text-ink-primary" />
          <span className="font-medium text-ink-primary">UI Preferences</span>
        </div>
        <div className="text-sm text-ink-tertiary">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
      <div className="flex items-center space-x-2 mb-4">
        <Palette className="w-5 h-5 text-purple-600" />
        <div className="flex-1">
          <span className="font-medium text-ink-primary">Card Theme</span>
          <p className="text-xs text-ink-secondary mt-0.5">
            Choose the visual style for AI Review finding cards
          </p>
        </div>
        {isSaving && (
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Theme Selection Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {THEME_OPTIONS.map((theme) => {
          const isSelected = selectedTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleThemeSelect(theme.id)}
              disabled={isSaving}
              className={`
                relative text-left rounded-lg border-2 p-4 transition-all duration-200
                ${isSelected
                  ? `${theme.borderClasses} bg-gradient-to-br from-purple-50/50 to-blue-50/50 shadow-md`
                  : 'border-line-primary hover:border-line-secondary bg-surface-primary hover:shadow-sm'
                }
                ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Theme Icon & Name */}
              <div className="flex items-center space-x-3 mb-3">
                <div className={`flex-shrink-0 ${isSelected ? theme.iconColor : 'text-ink-tertiary'}`}>
                  {theme.icon}
                </div>
                <div>
                  <div className={`font-semibold text-sm ${isSelected ? 'text-ink-primary' : 'text-ink-secondary'}`}>
                    {theme.name}
                  </div>
                  <div className="text-xs text-ink-tertiary">
                    {theme.description}
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className={`rounded-lg p-3 transition-all ${theme.previewClasses}`}>
                <div className="flex items-start space-x-2">
                  <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${theme.id === 'bright' ? 'text-purple-600' : 'text-emerald-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold mb-1 ${theme.id === 'bright' ? 'text-gray-900' : 'text-gray-800'}`}>
                      Example Finding
                    </div>
                    <div className={`text-[10px] leading-relaxed ${theme.id === 'bright' ? 'text-gray-700' : 'text-gray-600'}`}>
                      This is how your AI Review finding cards will appear with this theme.
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-900">
          <strong>Changes apply immediately</strong> • Reload the side panel to see the new theme in AI Medical Review results
        </div>
      </div>
    </div>
  );
};

// Export storage key for use in AIReviewCards
// eslint-disable-next-line react-refresh/only-export-components
export { STORAGE_KEY_CARD_THEME };
