/**
 * DevicePopover Component
 *
 * Full device selection popover for mic/output/camera.
 * Replaces inline device selectors in header with a single unified interface.
 */

import React, { useRef, useEffect } from 'react';
import { Mic, Speaker, X } from 'lucide-react';
import { useAudioDevices, type AudioDevice } from '@/hooks/useAudioDevices';
import { DropdownPortal } from './DropdownPortal';

export interface DevicePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export const DevicePopover: React.FC<DevicePopoverProps> = ({
  isOpen,
  onClose,
  triggerRef
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        // Return focus to trigger
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, triggerRef]);

  // Focus management
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      // Focus first focusable element
      const firstButton = popoverRef.current.querySelector<HTMLElement>('button');
      firstButton?.focus();
    }
  }, [isOpen]);

  const handleDeviceSelect = (device: AudioDevice) => {
    if (device.kind === 'audioinput') {
      setSelectedMicrophone(device.deviceId);
    } else {
      setSelectedSpeaker(device.deviceId);
    }

    // Log telemetry (privacy-safe)
    console.log('[DevicePopover] Device changed', {
      kind: device.kind,
      hasLabel: !!device.label,
      timestamp: Date.now()
    });
  };

  if (!isOpen) return null;

  // Calculate position relative to trigger
  const position = triggerRef.current?.getBoundingClientRect();
  const top = position ? position.bottom + 8 : 0;
  const left = position ? position.left : 0;

  // Debug logging for positioning
  console.log('[DevicePopover] Rendering with position:', {
    isOpen,
    triggerExists: !!triggerRef.current,
    position,
    top,
    left
  });

  return (
    <DropdownPortal
      isOpen={isOpen}
      onClickOutside={onClose}
    >
      <div
        ref={popoverRef}
        data-dropdown-menu
        role="dialog"
        aria-label="Audio device settings"
        aria-modal="true"
        className="
          bg-white border border-gray-200 rounded-lg shadow-xl
          w-80 max-h-96 overflow-hidden
        "
        style={{
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          zIndex: 9999
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">
            Audio Devices
          </h2>
          <button
            onClick={onClose}
            className="
              p-1 rounded hover:bg-gray-100 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
            aria-label="Close device settings"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-80">
          {!hasPermission ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Audio access required to select devices
              </p>
              <button
                onClick={requestPermission}
                className="
                  px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md
                  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                  transition-colors
                "
              >
                Enable Access
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading devices...
            </div>
          ) : (
            <>
              {/* Microphone Section */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-gray-600" />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Microphone
                  </h3>
                </div>
                {microphones.length === 0 ? (
                  <p className="text-sm text-gray-500">No microphones found</p>
                ) : (
                  <div className="space-y-1">
                    {microphones.map((device) => (
                      <button
                        key={device.deviceId}
                        onClick={() => handleDeviceSelect(device)}
                        className={`
                          w-full px-3 py-2 text-left text-sm rounded-md
                          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                          ${selectedMicrophoneId === device.deviceId
                            ? 'bg-blue-50 text-blue-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{device.label}</span>
                          {selectedMicrophoneId === device.deviceId && (
                            <div
                              className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"
                              aria-label="Selected"
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Speaker Section */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Speaker className="w-4 h-4 text-gray-600" />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Output
                  </h3>
                </div>
                {speakers.length === 0 ? (
                  <p className="text-sm text-gray-500">No speakers found</p>
                ) : (
                  <div className="space-y-1">
                    {speakers.map((device) => (
                      <button
                        key={device.deviceId}
                        onClick={() => handleDeviceSelect(device)}
                        className={`
                          w-full px-3 py-2 text-left text-sm rounded-md
                          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                          ${selectedSpeakerId === device.deviceId
                            ? 'bg-blue-50 text-blue-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{device.label}</span>
                          {selectedSpeakerId === device.deviceId && (
                            <div
                              className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"
                              aria-label="Selected"
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="
              w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md
              hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500
              transition-colors
            "
          >
            Done
          </button>
        </div>
      </div>
    </DropdownPortal>
  );
};
