import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, RefreshCcw, X } from 'lucide-react';
import Button, { IconButton } from './buttons/Button';
import {
  backdropVariants,
  modalVariants,
  textVariants,
  withReducedMotion,
} from '@/utils/animations';

interface CanvasCameraModalProps {
  isOpen: boolean;
  targetPanelId: number | null;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

const DEVICE_STORAGE_KEY = 'canvasCameraDeviceId';
const OUTPUT_SIZE = 1024;

const getStoredCameraDeviceId = async (): Promise<string | null> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get(DEVICE_STORAGE_KEY);
      return result?.[DEVICE_STORAGE_KEY] ?? null;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(DEVICE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Unable to read stored camera device id', error);
  }

  return null;
};

const setStoredCameraDeviceId = async (deviceId: string) => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [DEVICE_STORAGE_KEY]: deviceId });
      return;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
  } catch (error) {
    console.warn('Unable to persist camera device id', error);
  }
};

export const CanvasCameraModal: React.FC<CanvasCameraModalProps> = ({
  isOpen,
  targetPanelId,
  onCancel,
  onConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isEnumerating, setIsEnumerating] = useState(false);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [deviceRefreshToken, setDeviceRefreshToken] = useState(0);
  const extensionId = typeof chrome !== 'undefined' ? chrome.runtime?.id : undefined;
  const cameraSettingsUrl = extensionId
    ? `chrome://settings/content/siteDetails?site=chrome-extension://${extensionId}`
    : 'chrome://settings/content/camera';
  const describePermissionError = () => {
    if (extensionId) {
      return `Camera access was blocked. Open chrome://settings/content/camera, locate “chrome-extension://${extensionId}”, and allow camera access before trying again.`;
    }
    return 'Camera access was blocked. Open chrome://settings/content/camera and allow Operator to use the camera before trying again.';
  };
  const isPermissionError = (error: unknown) =>
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.debug('Failed to stop track', err);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeModal = useCallback(() => {
    setCapturedImage(null);
    stopStream();
    onCancel();
  }, [onCancel, stopStream]);

  // Reset state whenever the modal closes
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setDevices([]);
      setSelectedDeviceId(null);
      setCapturedImage(null);
      setErrorMessage(null);
      setDeviceRefreshToken(0);
    }
  }, [isOpen, stopStream]);

  useEffect(() => {
    if (!isOpen || !navigator.mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      setDeviceRefreshToken((prev) => prev + 1);
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, isOpen]);

  // Enumerate devices when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    const prepareDevices = async () => {
      setIsEnumerating(true);
      setErrorMessage(null);
      setCapturedImage(null);

      const hasMediaApi =
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.enumerateDevices &&
        !!navigator.mediaDevices?.getUserMedia;

      if (!hasMediaApi) {
        setErrorMessage('Camera access is not available. Check browser permissions or try again.');
        setIsEnumerating(false);
        return;
      }

      try {
        let permissionStream: MediaStream | null = null;

        try {
          permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permissionError) {
          console.warn('Camera permission request failed (labels may be limited):', permissionError);
          if (!isCancelled && isPermissionError(permissionError)) {
            setErrorMessage(describePermissionError());
            setIsEnumerating(false);
            return;
          }
        } finally {
          if (permissionStream) {
            permissionStream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch {
                // ignore
              }
            });
          }
        }

        const [allDevices, storedId] = await Promise.all([
          navigator.mediaDevices.enumerateDevices(),
          getStoredCameraDeviceId(),
        ]);

        const videoDevices = allDevices.filter((device) => device.kind === 'videoinput');
        console.table(
          videoDevices.map((device) => ({
            label: device.label || '(unlabeled)',
            deviceId: device.deviceId,
            groupId: device.groupId,
          })),
        );

        if (!videoDevices.length) {
          throw new Error('No camera devices detected.');
        }

        let preferredDeviceId = videoDevices[0].deviceId;
        const iphoneDevice = videoDevices.find((device) =>
          device.label?.toLowerCase().includes('iphone'),
        );
        if (iphoneDevice) {
          preferredDeviceId = iphoneDevice.deviceId;
        }

        if (storedId) {
          const storedMatch = videoDevices.find((device) => device.deviceId === storedId);
          if (storedMatch) {
            preferredDeviceId = storedMatch.deviceId;
          }
        }

        if (!isCancelled) {
          setDevices(videoDevices);
          setSelectedDeviceId(preferredDeviceId);
        }
      } catch (err) {
        console.error('Unable to enumerate camera devices', err);
        if (!isCancelled) {
          setErrorMessage(
            isPermissionError(err)
              ? describePermissionError()
              : 'Camera access is not available. Check browser permissions or try again.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsEnumerating(false);
        }
      }
    };

    prepareDevices();

    return () => {
      isCancelled = true;
    };
  }, [deviceRefreshToken, isOpen]);

  // Start or switch the camera stream
  useEffect(() => {
    if (!isOpen || !selectedDeviceId || capturedImage) return;

    const hasMediaApi =
      typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

    if (!hasMediaApi) {
      setErrorMessage('Camera access is not available. Check browser permissions or try again.');
      return;
    }

    let isCancelled = false;

    const startStream = async () => {
      setIsStreamLoading(true);
      setErrorMessage(null);

      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        await setStoredCameraDeviceId(selectedDeviceId);
      } catch (err) {
        console.error('Unable to start camera stream', err);
        if (!isCancelled) {
          setErrorMessage(
            isPermissionError(err)
              ? describePermissionError()
              : 'Unable to access the selected camera. Check permissions or try another device.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsStreamLoading(false);
        }
      }
    };

    startStream();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [capturedImage, isOpen, selectedDeviceId, stopStream]);

  const handleDeviceChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setCapturedImage(null);
    setSelectedDeviceId(event.target.value);
  }, []);
  const handleRefreshDevices = useCallback(() => {
    setDeviceRefreshToken((prev) => prev + 1);
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setErrorMessage('Camera preview is not ready yet. Please try again.');
      return;
    }

    try {
      const squareSize = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - squareSize) / 2;
      const sy = (video.videoHeight - squareSize) / 2;

      const squareCanvas = document.createElement('canvas');
      squareCanvas.width = squareSize;
      squareCanvas.height = squareSize;
      const squareContext = squareCanvas.getContext('2d');
      if (!squareContext) {
        throw new Error('Unable to access canvas context');
      }
      squareContext.drawImage(
        video,
        sx,
        sy,
        squareSize,
        squareSize,
        0,
        0,
        squareSize,
        squareSize,
      );

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = OUTPUT_SIZE;
      outputCanvas.height = OUTPUT_SIZE;
      const outputContext = outputCanvas.getContext('2d');
      if (!outputContext) {
        throw new Error('Unable to access output canvas context');
      }
      outputContext.drawImage(squareCanvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const dataUrl = outputCanvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
      stopStream();
    } catch (err) {
      console.error('Failed to capture camera frame', err);
      setErrorMessage('Unable to capture this frame. Please try again.');
    }
  }, [stopStream]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setErrorMessage(null);
  }, []);

  const handleUsePhoto = useCallback(() => {
    if (!capturedImage) return;
    onConfirm(capturedImage);
    closeModal();
  }, [capturedImage, closeModal, onConfirm]);

  const panelLabel =
    typeof targetPanelId === 'number' ? `Panel ${targetPanelId + 1}` : 'Canvas panel';

  const disableCapture =
    !!errorMessage || !selectedDeviceId || isEnumerating || isStreamLoading || !!capturedImage;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          variants={withReducedMotion(backdropVariants)}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <motion.div
            className="bg-white rounded-modal shadow-modal max-w-2xl w-full mx-4"
            variants={withReducedMotion(modalVariants)}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Camera capture modal"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {panelLabel}
                </p>
                <motion.h2
                  className="text-xl font-semibold text-gray-900"
                  variants={withReducedMotion(textVariants)}
                  initial="hidden"
                  animate="visible"
                >
                  Use Camera
                </motion.h2>
                <p className="text-sm text-gray-600">
                  Capture a square photo directly into this Canvas slot.
                </p>
              </div>
              <IconButton
                aria-label="Close camera modal"
                icon={<X />}
                variant="ghost"
                onClick={closeModal}
              />
            </div>

            <div className="px-6 py-5 space-y-4">
              {errorMessage ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="outline" onClick={closeModal}>
                      Close
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setErrorMessage(null);
                        setCapturedImage(null);
                        setSelectedDeviceId(null);
                        setDeviceRefreshToken((prev) => prev + 1);
                      }}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
                          chrome.tabs.create({ url: cameraSettingsUrl });
                        } else {
                          window.open(cameraSettingsUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      Open Settings
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                    <div className="space-y-2">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700" htmlFor="canvas-camera-select">
                            Camera source
                          </label>
                        <select
                          id="canvas-camera-select"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          value={selectedDeviceId ?? ''}
                          onChange={handleDeviceChange}
                          disabled={isEnumerating || !devices.length}
                        >
                          {!devices.length && <option value="">No cameras detected</option>}
                          {devices.map((device) => (
                            <option key={device.deviceId || device.label} value={device.deviceId}>
                              {device.label || 'Camera'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 text-xs"
                        onClick={handleRefreshDevices}
                      >
                        Refresh
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Wake/unlock your iPhone and keep it nearby with Wi-Fi &amp; Bluetooth on, then tap Refresh if “iPhone Camera” isn’t listed.
                    </p>
                  </div>

                  <div className="relative w-full bg-black rounded-xl overflow-hidden aspect-video">
                    {!capturedImage ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={capturedImage}
                        alt="Captured preview"
                        className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
                      />
                    )}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[70%] max-w-[360px] aspect-square border-2 border-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.55)]" />
                    </div>
                    {(isStreamLoading || isEnumerating) && !capturedImage && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center space-y-3 text-white">
                        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm">Starting camera…</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    Only the framed square area is captured at full resolution (1024×1024).
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>

              {capturedImage ? (
                <>
                  <Button variant="outline" startIcon={<RefreshCcw />} onClick={handleRetake}>
                    Retake
                  </Button>
                  <Button
                    variant="success"
                    startIcon={<Check />}
                    onClick={handleUsePhoto}
                    disabled={!capturedImage}
                  >
                    Use Photo
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  startIcon={<Camera />}
                  onClick={handleCapture}
                  disabled={disableCapture}
                >
                  Capture
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
/* global HTMLVideoElement, MediaDeviceInfo, HTMLSelectElement */
