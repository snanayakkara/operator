import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, Combine, Copy, Trash2, X, ImageIcon, Camera, Clipboard } from 'lucide-react';
import {
  modalVariants,
  backdropVariants,
  staggerContainer as _staggerContainer,
  listItemVariants as _listItemVariants,
  buttonVariants as _buttonVariants,
  textVariants,
  withReducedMotion,
  STAGGER_CONFIGS as _STAGGER_CONFIGS,
  ANIMATION_DURATIONS as _ANIMATION_DURATIONS
} from '@/utils/animations';
import { ScreenshotCombiner, AnnotatedScreenshot } from '../../services/ScreenshotCombiner';
import { FileToasts } from '@/utils/toastHelpers';
import { IconButton } from './buttons/Button';
import Button from './buttons/Button';
import { CanvasCameraModal } from './CanvasCameraModal';

interface ScreenshotAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'modal' | 'page';
  onSubmitScreenshots?: (screenshots: (AnnotatedScreenshot | null)[]) => void;
  initialTargetSlot?: number;
}

export const ScreenshotAnnotationModal: React.FC<ScreenshotAnnotationModalProps> = ({
  isOpen,
  onClose,
  variant = 'modal',
  onSubmitScreenshots,
  initialTargetSlot = 0
}) => {
  const [screenshots, setScreenshots] = useState<(AnnotatedScreenshot | null)[]>([null, null, null, null]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [targetSlot, setTargetSlot] = useState<number>(initialTargetSlot);
  const [cameraPanelIndex, setCameraPanelIndex] = useState<number | null>(null);
  const combinerRef = useRef(new ScreenshotCombiner(4));
  const modalRef = useRef<HTMLDivElement>(null);
  const isStandalone = variant === 'page';


  const handleClose = () => {
    setScreenshots([null, null, null, null]);
    setIsProcessing(false);
    combinerRef.current.clear();
    setTargetSlot(initialTargetSlot ?? 0);
    setCameraPanelIndex(null);
    if (!isStandalone) {
      // Best-effort: disable file-drop guard on active tab
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs?.[0]?.id;
          if (tabId) chrome.tabs.sendMessage(tabId, { type: 'SET_FILE_DROP_GUARD', enabled: false });
        });
      } catch (guardError) {
        console.debug('Failed to disable file drop guard on modal close:', guardError instanceof Error ? guardError.message : guardError);
      }
    }
    onClose();
  };

  // When the modal is open, ask the content script on the active tab
  // to guard against browser-level file drop navigation.
  useEffect(() => {
    if (isStandalone || typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const setGuard = async (enabled: boolean) => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs?.[0]?.id;
        if (tabId) {
          await chrome.tabs.sendMessage(tabId, { type: 'SET_FILE_DROP_GUARD', enabled });
        }
      } catch (err) {
        // Ignore if content script not present
        console.warn('SET_FILE_DROP_GUARD send failed (likely non-EMR tab):', err);
      }

      // Always notify background to suppress file:// tabs while modal is open
      try {
        await chrome.runtime.sendMessage({ type: 'SET_FILE_DROP_GUARD', enabled });
      } catch (e) {
        console.warn('SET_FILE_DROP_GUARD to background failed:', e);
      }
    };

    if (isOpen) setGuard(true);
    return () => { setGuard(false); };
  }, [isOpen, isStandalone]);

  const handleFileSelect = useCallback((file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
      FileToasts.invalidFile();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const screenshot: AnnotatedScreenshot = {
          id: `slot-${index}-${Date.now()}`,
          dataUrl,
          timestamp: Date.now(),
          width: img.width,
          height: img.height
        };
        
        setScreenshots(prev => {
          const updated = [...prev];
          updated[index] = screenshot;
          return updated;
        });
        
        FileToasts.imageAdded(index);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    setTargetSlot(initialTargetSlot);
  }, [initialTargetSlot]);

  // Keep targetSlot pointing at the next available empty slot
  useEffect(() => {
    setTargetSlot((prev) => {
      if (prev != null && screenshots[prev] === null) return prev;
      const next = screenshots.findIndex((s) => s === null);
      return next >= 0 ? next : (prev ?? 0);
    });
  }, [screenshots]);

  // Update EMR page overlay with the current target slot
  useEffect(() => {
    try {
      const slotNumber = (targetSlot ?? 0) + 1;
      chrome.runtime.sendMessage({ type: 'SET_DROP_HINT', data: { slot: slotNumber } });
    } catch (hintError) {
      // Failed to send drop hint message - non-critical UI feedback
      console.debug('Failed to send drop hint message for slot', (targetSlot ?? 0) + 1, ':', hintError instanceof Error ? hintError.message : hintError);
    }
  }, [targetSlot]);

  const _handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    console.log('🎯 Drag enter on drop zone', index);
    setDragOverIndex(index);
  }, []);

  const _handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      try { 
        e.dataTransfer.dropEffect = 'copy'; 
      } catch (dropEffectError) {
        // Failed to set dropEffect - browser security restriction, continue operation
        console.debug('Cannot set dropEffect on dataTransfer (browser security):', dropEffectError instanceof Error ? dropEffectError.message : dropEffectError);
      }
    }
    setDragOverIndex(index);
  }, []);

  const _handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('🚫 Drag leave drop zone');
    setDragOverIndex(null);
  }, []);

  const _handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      try { 
        e.dataTransfer.dropEffect = 'copy'; 
      } catch (dropEffectError) {
        // Failed to set dropEffect - browser security restriction, continue operation
        console.debug('Cannot set dropEffect on dataTransfer (browser security):', dropEffectError instanceof Error ? dropEffectError.message : dropEffectError);
      }
    }
    console.log('🎯 Drop event triggered on zone', index, 'with files:', e.dataTransfer?.files?.length ?? 0);
    
    setDragOverIndex(null);
    
    // Enhanced validation for extension context
    if (!e.dataTransfer) {
      console.log('❌ No dataTransfer on drag event');
      FileToasts.noFiles();
      return false;
    }
    
    let files: File[] = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      files = Array.from(e.dataTransfer.files);
    } else if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      // Fallback for cases where files are provided via DataTransferItemList
      const itemFiles: File[] = [];
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) itemFiles.push(f);
        }
      }
      files = itemFiles;
    }
    
    if (!files.length) {
      console.log('❌ No file items present in drag operation');
      FileToasts.noFiles();
      return false;
    }
    
    console.log('📁 Files detected:', files.map(f => `${f.name} (${f.type})`));
    
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      console.log('✅ Processing image file:', imageFile.name, imageFile.type);
      handleFileSelect(imageFile, index);
    } else {
      console.log('❌ No valid image files found');
      FileToasts.invalidFile();
    }
    
    return false;
  }, [handleFileSelect]);

  const _handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0], index);
    }
    e.target.value = ''; // Reset input
  }, [handleFileSelect]);

  const removeScreenshot = useCallback((index: number) => {
    setScreenshots(prev => {
      const updated = [...prev];
      updated[index] = null;
      return updated;
    });
    FileToasts.imageRemoved(index);
  }, []);

  const importDataUrl = useCallback((dataUrl: string, index: number) => {
    try {
      const img = new Image();
      img.onload = () => {
        const screenshot: AnnotatedScreenshot = {
          id: `slot-${index}-${Date.now()}`,
          dataUrl,
          timestamp: Date.now(),
          width: img.width,
          height: img.height
        };
        setScreenshots(prev => {
          const updated = [...prev];
          updated[index] = screenshot;
          return updated;
        });
        FileToasts.imageAdded(index);
      };
      img.src = dataUrl;
    } catch (e) {
      console.error('Failed to import data URL image', e);
      FileToasts.importFailed();
    }
  }, []);

  useEffect(() => {
    if (isStandalone || typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handleMessage = (message: any) => {
      if (message?.type === 'CANVAS_CAMERA_RESULT' && Array.isArray(message.payload?.screenshots)) {
        const shots = message.payload.screenshots as Array<{ index: number; dataUrl: string; width: number; height: number } | null>;
        setScreenshots((prev) => {
          const updated = [...prev];
          shots.forEach((shot) => {
            if (shot && typeof shot.index === 'number') {
              updated[shot.index] = {
                id: `slot-${shot.index}-${Date.now()}`,
                dataUrl: shot.dataUrl,
                timestamp: Date.now(),
                width: shot.width ?? 0,
                height: shot.height ?? 0
              };
            }
          });
          return updated;
        });
        if (typeof message.payload.targetSlot === 'number') {
          setTargetSlot(message.payload.targetSlot);
        }
      }
      if (message?.type === 'CAMERA_OVERLAY_RESULT' && message.payload?.dataUrl) {
        const slot = typeof message.payload.slot === 'number' ? message.payload.slot : 0;
        importDataUrl(message.payload.dataUrl, slot);
        setTargetSlot(slot);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [importDataUrl, isStandalone]);

  useEffect(() => {
    const listener = (message: any) => {
      if (message?.type === 'PAGE_FILE_DROPPED' && message.payload?.dataUrl) {
        // Prefer armed target slot; fallback to next available
        let index = targetSlot;
        if (index == null || screenshots[index] !== null) {
          const next = screenshots.findIndex(s => s === null);
          index = next >= 0 ? next : 0;
        }
        importDataUrl(message.payload.dataUrl as string, index);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [screenshots, targetSlot, importDataUrl]);

  const openCameraModal = useCallback((index: number) => {
    if (isStandalone) {
      setTargetSlot(index);
      setCameraPanelIndex(index);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      if (tabId != null) {
        chrome.tabs.sendMessage(
          tabId,
          { type: 'OPEN_CAMERA_OVERLAY', targetSlot: index },
          (resp) => {
            if (chrome.runtime.lastError || resp?.ok !== true) {
              console.warn('Falling back to extension tab for camera:', chrome.runtime.lastError?.message);
              try {
                const url = chrome.runtime?.getURL
                  ? chrome.runtime.getURL(`src/canvas/index.html?slot=${index}`)
                  : `chrome-extension://${chrome?.runtime?.id ?? ''}/src/canvas/index.html?slot=${index}`;
                chrome.tabs.create?.({ url, active: true });
              } catch (error) {
                console.error('Failed to open camera tab fallback', error);
              }
            }
          }
        );
      }
    });
  }, [isStandalone]);

  const handleCameraConfirm = useCallback((dataUrl: string) => {
    if (cameraPanelIndex != null) {
      importDataUrl(dataUrl, cameraPanelIndex);
    }
    setCameraPanelIndex(null);
  }, [cameraPanelIndex, importDataUrl]);

  const handlePasteFromClipboard = useCallback(async (index: number) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        // Find an image type in the clipboard item
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
              importDataUrl(dataUrl, index);
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      // No image found in clipboard
      FileToasts.invalidFile();
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      // User may have denied permission or clipboard is empty
      FileToasts.importFailed();
    }
  }, [importDataUrl]);

  const DropZone: React.FC<{
    index: number;
    screenshot: AnnotatedScreenshot | null;
    onUseCamera: (panelIndex: number) => void;
    onPaste: (index: number) => void;
    standalone?: boolean;
  }> = ({ index, screenshot, onUseCamera, onPaste, standalone = false }) => {
    const onDropFiles = useCallback((accepted: File[]) => {
      console.log('📥 react-dropzone onDrop accepted:', accepted.map(f => `${f.name} (${f.type || 'unknown'})`));
      if (accepted && accepted.length > 0) {
        handleFileSelect(accepted[0], index);
      } else {
        FileToasts.invalidFile();
      }
    }, [handleFileSelect, index]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
      onDrop: onDropFiles,
      onDragEnter: () => { console.log('🟦 dropzone dragenter', index); setDragOverIndex(index); },
      onDragOver: () => { setDragOverIndex(index); },
      onDragLeave: () => { console.log('⬜ dropzone dragleave', index); setDragOverIndex((prev) => (prev === index ? null : prev)); },
      accept: { 'image/*': [] },
      multiple: false,
      noKeyboard: true,
      useFsAccessApi: false,
    });

    const isActive = isDragActive || dragOverIndex === index;

    const handleCameraClick = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onUseCamera(index);
    };

    const handlePasteClick = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onPaste(index);
    };

    return (
      <div className="space-y-2">
        <div
          {...getRootProps({
          className: `
            relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
            aspect-square
          ${isActive 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : screenshot 
                ? 'border-gray-300 bg-gray-50' 
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-25'
            } ${targetSlot === index ? 'ring-2 ring-blue-500' : ''}
          `,
            onClick: (e: any) => { e.preventDefault(); setTargetSlot(index); open(); },
            // Let react-dropzone manage DnD events; avoid capture-phase stopPropagation
            'data-drop-zone': 'true',
          })}
        >
          <input {...getInputProps({ accept: 'image/*' })} />
          {screenshot ? (
            <div className="relative w-full h-full group">
              <img
                src={screenshot.dataUrl}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <IconButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeScreenshot(index);
                }}
                icon={<X />}
                variant="danger"
                size="sm"
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity !w-6 !h-6 rounded-full"
                aria-label="Remove screenshot"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                isActive ? 'bg-blue-200' : 'bg-gray-200'
              }`}>
                {isActive ? (
                  <Upload className={`w-6 h-6 text-blue-600`} />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 flex items-center justify-center gap-2">
                <span>Slot {index + 1}</span>
                {targetSlot === index && (
                  <span className="text-xs text-blue-600 font-semibold">Next</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            startIcon={<Camera className="w-3.5 h-3.5" />}
            className="!h-8 px-3 text-xs font-semibold text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
            onClick={handleCameraClick}
          >
            Camera
          </Button>
          <Button
            variant="outline"
            size="sm"
            startIcon={<Clipboard className="w-3.5 h-3.5" />}
            className="!h-8 px-3 text-xs font-semibold text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50"
            onClick={handlePasteClick}
          >
            Paste
          </Button>
        </div>
      </div>
    );
  };

  const handleCombineAndCopy = useCallback(async () => {
    const anyScreenshots = screenshots.some((s) => s !== null);
    if (!anyScreenshots) {
      FileToasts.noScreenshots();
      return;
    }
    
    setIsProcessing(true);
    try {
      // Use explicit 2x2 grid (slots 0..3 map to TL, TR, BL, BR)
      combinerRef.current.clear();
      combinerRef.current.setGrid(screenshots);
      
      // Combine and copy to clipboard
      await combinerRef.current.copyToClipboard();
      
      const count = screenshots.filter(Boolean).length;
      FileToasts.imagesCombined(count);
    } catch (error) {
      console.error('Failed to combine and copy screenshots:', error);
      FileToasts.combineFailed(error instanceof Error ? error.message : undefined);
    } finally {
      setIsProcessing(false);
    }
  }, [screenshots]);
  
  const clearAll = useCallback(() => {
    setScreenshots([null, null, null, null]);
    setTargetSlot(0);
    combinerRef.current.clear();
    FileToasts.allCleared();
  }, []);
  
  const screenshotCount = screenshots.filter(s => s !== null).length;
  const isCompleted = screenshotCount > 0 && !isProcessing;
  
  // Prevent default dragover/drop globally in side panel to stop navigation
  useEffect(() => {
    const preventAllDefault = (e: Event) => {
      e.preventDefault();
    };
    const handleDragEnterSelective = (e: Event) => {
      const target = e.target as Element;
      const isDropZone = target?.closest('[data-drop-zone="true"]');
      if (!isDropZone) {
        e.preventDefault();
      }
    };

    window.addEventListener('dragover', preventAllDefault, true);
    window.addEventListener('drop', preventAllDefault, true);
    window.addEventListener('dragenter', handleDragEnterSelective, true);

    return () => {
      window.removeEventListener('dragover', preventAllDefault, true);
      window.removeEventListener('drop', preventAllDefault, true);
      window.removeEventListener('dragenter', handleDragEnterSelective, true);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {isStandalone ? (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-5xl mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-modal shadow-modal w-full flex flex-col min-h-[75vh] border border-slate-100">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Combine className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Screenshot Combiner
                    </h2>
                    <p className="text-sm text-gray-600">
                      Drag and drop up to 4 screenshots to combine them
                    </p>
                  </div>
                </div>
                <IconButton
                  onClick={handleClose}
                  icon={<X />}
                  variant="ghost"
                  size="md"
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                />
              </div>
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {screenshotCount === 0 ? 'No screenshots added yet' : `${screenshotCount}/4 screenshots ready`}
                  </div>
                  {isProcessing && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Combining...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 p-6 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 auto-rows-fr">
                  <DropZone index={0} screenshot={screenshots[0]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} standalone />
                  <DropZone index={1} screenshot={screenshots[1]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} standalone />
                  <DropZone index={2} screenshot={screenshots[2]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} standalone />
                  <DropZone index={3} screenshot={screenshots[3]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} standalone />
                </div>
                <div className="text-center text-sm text-gray-600 space-y-1">
                  <p>Drag screenshots from your desktop or click to browse files.</p>
                  <p>Supports PNG, JPG, and GIF formats. Screenshots will be combined vertically.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50/80 rounded-b-3xl">
                <div className="flex items-center space-x-2">
                  {screenshotCount > 0 && (
                    <Button
                      onClick={clearAll}
                      variant="outline"
                      size="sm"
                      startIcon={<Trash2 />}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    onClick={handleClose}
                    variant="ghost"
                    size="md"
                    className="text-gray-700 hover:text-gray-900"
                  >
                    Close
                  </Button>
                  {onSubmitScreenshots && (
                    <Button
                      onClick={() => onSubmitScreenshots(screenshots)}
                      variant="secondary"
                      size="md"
                      startIcon={<Camera />}
                      disabled={screenshotCount === 0}
                    >
                      Send to Operator
                    </Button>
                  )}
                  <Button
                    onClick={handleCombineAndCopy}
                    disabled={!isCompleted || isProcessing}
                    variant="success"
                    size="md"
                    startIcon={<Copy />}
                    isLoading={isProcessing}
                  >
                    {isProcessing ? 'Combining...' : 'Combine & Copy'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            ref={modalRef}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
            variants={withReducedMotion(backdropVariants)}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
          >
            <motion.div
              className="bg-white rounded-modal shadow-modal max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
              variants={withReducedMotion(modalVariants)}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="flex items-center justify-between p-6 border-b border-gray-200"
                variants={withReducedMotion(textVariants)}
                initial="hidden"
                animate="visible"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Combine className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Screenshot Combiner</h2>
                    <p className="text-sm text-gray-600">Drag and drop up to 4 screenshots to combine them</p>
                  </div>
                </div>
                <IconButton
                  onClick={handleClose}
                  icon={<X />}
                  variant="ghost"
                  size="md"
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                />
              </motion.div>
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {screenshotCount === 0 ? 'No screenshots added yet' : `${screenshotCount}/4 screenshots ready`}
                  </div>
                  {isProcessing && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Combining...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <DropZone index={0} screenshot={screenshots[0]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} />
                  <DropZone index={1} screenshot={screenshots[1]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} />
                  <DropZone index={2} screenshot={screenshots[2]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} />
                  <DropZone index={3} screenshot={screenshots[3]} onUseCamera={openCameraModal} onPaste={handlePasteFromClipboard} />
                </div>
                <div className="text-center text-sm text-gray-600 space-y-2">
                  <p>Drag screenshots from your desktop or click to browse files.</p>
                  <p>Supports PNG, JPG, and GIF formats. Screenshots will be combined vertically.</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="flex items-center space-x-2">
                  {screenshotCount > 0 && (
                    <Button
                      onClick={clearAll}
                      variant="outline"
                      size="sm"
                      startIcon={<Trash2 />}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Button onClick={handleClose} variant="ghost" size="md" className="text-gray-600 hover:text-gray-800">
                    Close
                  </Button>
                  <Button
                    onClick={handleCombineAndCopy}
                    disabled={!isCompleted || isProcessing}
                    variant="success"
                    size="md"
                    startIcon={<Copy />}
                    isLoading={isProcessing}
                  >
                    {isProcessing ? 'Combining...' : 'Combine & Copy'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
      {isStandalone && (
        <CanvasCameraModal
          isOpen={cameraPanelIndex != null}
          targetPanelId={cameraPanelIndex}
          onCancel={() => setCameraPanelIndex(null)}
          onConfirm={handleCameraConfirm}
        />
      )}
    </>
  );
};
