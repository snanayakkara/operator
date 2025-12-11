/**
 * QuickSettingsDrawer Component
 *
 * Slide-in settings panel from the right side.
 * Contains quick toggles and link to full settings page.
 *
 * Features:
 * - Dark mode toggle
 * - Audio device selection (microphone, speaker)
 * - System status indicator
 * - "Open Full Settings" button
 * - Smooth slide animation
 */

import React, { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Settings, ExternalLink, Mic, Speaker, AlertTriangle } from 'lucide-react';
import { colors, animation, radius, shadows, zIndex } from '@/utils/designTokens';
import { useAudioDevices } from '@/hooks/useAudioDevices';

export interface QuickSettingsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Current dark mode state */
  isDarkMode: boolean;
  /** Callback to toggle dark mode */
  onToggleDarkMode: () => void;
  /** Callback to open full settings */
  onOpenFullSettings: () => void;
  /** Additional className */
  className?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const drawerVariants = {
  hidden: {
    x: '100%',
    transition: {
      duration: animation.duration.normal / 1000,
      ease: animation.easing.in
    }
  },
  visible: {
    x: 0,
    transition: {
      duration: animation.duration.normal / 1000,
      ease: animation.easing.out
    }
  }
};

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = memo(({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  onOpenFullSettings,
  className = ''
}) => {
  const {
    microphones,
    speakers,
    selectedMicrophoneId,
    selectedSpeakerId,
    setSelectedMicrophone,
    setSelectedSpeaker,
    isLoading,
    hasPermission,
    requestPermission
  } = useAudioDevices();

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle clicking the open settings button
  const handleOpenSettings = useCallback(() => {
    onOpenFullSettings();
    onClose();
  }, [onOpenFullSettings, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: animation.duration.fast / 1000 }}
            className="fixed inset-0 bg-black/20"
            style={{ zIndex: zIndex.modal - 1 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`
              fixed top-0 right-0 bottom-0
              w-[280px] max-w-[80vw]
              bg-white
              flex flex-col
              ${className}
            `}
            style={{
              zIndex: zIndex.modal,
              boxShadow: shadows.modal
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Quick Settings"
          >
            {/* Header */}
            <div className="
              flex items-center justify-between
              px-4 py-3
              border-b border-neutral-200
            ">
              <h2 className="text-sm font-semibold text-neutral-900">
                Quick Settings
              </h2>
              <button
                onClick={onClose}
                className="
                  p-1.5 rounded-md
                  text-neutral-500 hover:text-neutral-700
                  hover:bg-neutral-100
                  transition-colors
                "
                style={{ transitionDuration: `${animation.duration.fast}ms` }}
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Dark Mode Toggle */}
              <div className="mb-6">
                <h3 className="
                  text-[11px] font-semibold uppercase tracking-wider
                  text-neutral-500 mb-3
                ">
                  Appearance
                </h3>

                <button
                  onClick={onToggleDarkMode}
                  className="
                    w-full flex items-center justify-between
                    p-3 rounded-lg border
                    transition-colors
                    hover:bg-neutral-50
                  "
                  style={{
                    borderRadius: radius.md,
                    borderColor: colors.neutral[200],
                    transitionDuration: `${animation.duration.fast}ms`
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon size={18} className="text-violet-600" />
                    ) : (
                      <Sun size={18} className="text-amber-500" />
                    )}
                    <div className="text-left">
                      <div className="text-[13px] font-medium text-neutral-900">
                        Dark Mode
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {isDarkMode ? 'On' : 'Off'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle indicator */}
                  <div className={`
                    relative w-10 h-6 rounded-full
                    transition-colors
                    ${isDarkMode ? 'bg-violet-600' : 'bg-neutral-200'}
                  `}
                    style={{ transitionDuration: `${animation.duration.fast}ms` }}
                  >
                    <motion.div
                      className="
                        absolute top-1 left-1
                        w-4 h-4 rounded-full
                        bg-white shadow-sm
                      "
                      animate={{ x: isDarkMode ? 16 : 0 }}
                      transition={{ duration: animation.duration.fast / 1000 }}
                    />
                  </div>
                </button>
              </div>

              {/* Audio Devices Section */}
              <div className="mb-6">
                <h3 className="
                  text-[11px] font-semibold uppercase tracking-wider
                  text-neutral-500 mb-3
                ">
                  Audio Devices
                </h3>

                {!hasPermission ? (
                  <div
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50"
                    style={{ borderRadius: radius.md }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[12px] text-amber-800 mb-2">
                          Audio access required to select devices
                        </p>
                        <button
                          type="button"
                          onClick={requestPermission}
                          className="
                            px-3 py-1.5 rounded-md
                            bg-amber-600 text-white
                            text-[12px] font-medium
                            hover:bg-amber-700
                            transition-colors
                          "
                          style={{ transitionDuration: `${animation.duration.fast}ms` }}
                        >
                          Enable Access
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="p-3 text-center text-[12px] text-neutral-500">
                    Loading devices...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Microphone Selection */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Mic size={14} className="text-neutral-500" />
                        <span className="text-[12px] font-medium text-neutral-700">
                          Microphone
                        </span>
                      </div>
                      <select
                        value={selectedMicrophoneId || ''}
                        onChange={(e) => setSelectedMicrophone(e.target.value)}
                        title="Select microphone"
                        aria-label="Select microphone"
                        className="
                          w-full px-3 py-2
                          text-[13px] text-neutral-900
                          bg-white border border-neutral-200
                          rounded-md
                          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                          transition-colors
                        "
                        style={{
                          borderRadius: radius.md,
                          transitionDuration: `${animation.duration.fast}ms`
                        }}
                      >
                        {microphones.length === 0 ? (
                          <option value="">No microphones found</option>
                        ) : (
                          microphones.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || 'Unknown Microphone'}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Speaker Selection */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Speaker size={14} className="text-neutral-500" />
                        <span className="text-[12px] font-medium text-neutral-700">
                          Speaker
                        </span>
                      </div>
                      <select
                        value={selectedSpeakerId || ''}
                        onChange={(e) => setSelectedSpeaker(e.target.value)}
                        title="Select speaker"
                        aria-label="Select speaker"
                        className="
                          w-full px-3 py-2
                          text-[13px] text-neutral-900
                          bg-white border border-neutral-200
                          rounded-md
                          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                          transition-colors
                        "
                        style={{
                          borderRadius: radius.md,
                          transitionDuration: `${animation.duration.fast}ms`
                        }}
                      >
                        {speakers.length === 0 ? (
                          <option value="">No speakers found</option>
                        ) : (
                          speakers.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || 'Unknown Speaker'}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Section */}
              <div className="mb-6">
                <h3 className="
                  text-[11px] font-semibold uppercase tracking-wider
                  text-neutral-500 mb-3
                ">
                  Status
                </h3>

                <div className="space-y-2">
                  <div className="
                    p-3 rounded-lg
                    bg-emerald-50 border border-emerald-200
                  "
                    style={{ borderRadius: radius.md }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[12px] font-medium text-emerald-700">
                        All systems operational
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Open Full Settings */}
            <div className="
              px-4 py-3
              border-t border-neutral-200
              bg-neutral-50
            ">
              <button
                onClick={handleOpenSettings}
                className="
                  w-full flex items-center justify-center gap-2
                  px-4 py-2.5 rounded-lg
                  bg-neutral-900 text-white
                  text-[13px] font-medium
                  hover:bg-neutral-800
                  transition-colors
                "
                style={{
                  borderRadius: radius.md,
                  transitionDuration: `${animation.duration.fast}ms`
                }}
              >
                <Settings size={16} />
                Open Full Settings
                <ExternalLink size={12} className="ml-1 opacity-60" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

QuickSettingsDrawer.displayName = 'QuickSettingsDrawer';

export default QuickSettingsDrawer;
