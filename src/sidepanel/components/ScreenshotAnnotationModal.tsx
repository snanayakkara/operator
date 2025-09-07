import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Combine, Copy, Trash2, X, ImageIcon } from 'lucide-react';
import { ScreenshotCombiner, AnnotatedScreenshot } from '../../services/ScreenshotCombiner';
import { ToastService } from '../../services/ToastService';

interface ScreenshotAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenshotAnnotationModal: React.FC<ScreenshotAnnotationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [screenshots, setScreenshots] = useState<(AnnotatedScreenshot | null)[]>([null, null, null, null]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [targetSlot, setTargetSlot] = useState<number>(0);
  const combinerRef = useRef(new ScreenshotCombiner(4));
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setScreenshots([null, null, null, null]);
    setIsProcessing(false);
    combinerRef.current.clear();
    setTargetSlot(0);
    // Best-effort: disable file-drop guard on active tab
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs?.[0]?.id;
        if (tabId) chrome.tabs.sendMessage(tabId, { type: 'SET_FILE_DROP_GUARD', enabled: false });
      });
    } catch {}
    onClose();
  };

  // When the modal is open, ask the content script on the active tab
  // to guard against browser-level file drop navigation.
  useEffect(() => {
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
  }, [isOpen]);

  const handleFileSelect = useCallback((file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
      ToastService.getInstance().error('Invalid File', 'Please select an image file (PNG, JPG, GIF)');
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
        
        ToastService.getInstance().success('Image Added', `Screenshot ${index + 1} loaded successfully`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

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
    } catch {}
  }, [targetSlot]);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    console.log('🎯 Drag enter on drop zone', index);
    setDragOverIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      try { e.dataTransfer.dropEffect = 'copy'; } catch {}
    }
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('🚫 Drag leave drop zone');
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      try { e.dataTransfer.dropEffect = 'copy'; } catch {}
    }
    console.log('🎯 Drop event triggered on zone', index, 'with files:', e.dataTransfer?.files?.length ?? 0);
    
    setDragOverIndex(null);
    
    // Enhanced validation for extension context
    if (!e.dataTransfer) {
      console.log('❌ No dataTransfer on drag event');
      ToastService.getInstance().error('No Files', 'No files were detected in the drag operation');
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
      ToastService.getInstance().error('No Files', 'No files were detected in the drag operation');
      return false;
    }
    
    console.log('📁 Files detected:', files.map(f => `${f.name} (${f.type})`));
    
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      console.log('✅ Processing image file:', imageFile.name, imageFile.type);
      handleFileSelect(imageFile, index);
    } else {
      console.log('❌ No valid image files found');
      ToastService.getInstance().error('Invalid File', 'Please drop an image file (PNG, JPG, GIF)');
    }
    
    return false;
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
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
    ToastService.getInstance().success('Screenshot Removed', `Slot ${index + 1} cleared`);
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
        ToastService.getInstance().success('Image Added', `Screenshot ${index + 1} loaded successfully`);
      };
      img.src = dataUrl;
    } catch (e) {
      console.error('Failed to import data URL image', e);
      ToastService.getInstance().error('Import Failed', 'Could not load dropped image');
    }
  }, []);

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

  const DropZone: React.FC<{ index: number; screenshot: AnnotatedScreenshot | null }> = ({ index, screenshot }) => {
    const onDropFiles = useCallback((accepted: File[]) => {
      console.log('📥 react-dropzone onDrop accepted:', accepted.map(f => `${f.name} (${f.type || 'unknown'})`));
      if (accepted && accepted.length > 0) {
        handleFileSelect(accepted[0], index);
      } else {
        ToastService.getInstance().error('Invalid File', 'Please drop an image file (PNG, JPG, GIF)');
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

    return (
      <div
        {...getRootProps({
          className: `
          relative aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200
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
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeScreenshot(index);
              }}
              className="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
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
            <div className="text-sm font-medium text-gray-600 mb-1 flex items-center justify-center gap-2">
              <span>Slot {index + 1}</span>
              {targetSlot === index && (
                <span className="text-xs text-blue-600 font-semibold">Next</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {isActive ? 'Drop image here' : 'Drag image or click'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleCombineAndCopy = useCallback(async () => {
    const anyScreenshots = screenshots.some((s) => s !== null);
    if (!anyScreenshots) {
      ToastService.getInstance().error('No Screenshots', 'Please add at least one screenshot to combine');
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
      ToastService.getInstance().success('Screenshots Combined!', `${count} screenshots combined and copied to clipboard`);
    } catch (error) {
      console.error('Failed to combine and copy screenshots:', error);
      ToastService.getInstance().error(
        'Combine Failed', 
        error instanceof Error ? error.message : 'Failed to combine screenshots'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [screenshots]);
  
  const clearAll = useCallback(() => {
    setScreenshots([null, null, null, null]);
    setTargetSlot(0);
    combinerRef.current.clear();
    ToastService.getInstance().success('Cleared', 'All screenshots removed');
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


  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
      onClick={(e) => {
        // Close modal when clicking on backdrop, not modal content
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
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
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {screenshotCount === 0 ? (
                'No screenshots added yet'
              ) : (
                `${screenshotCount}/4 screenshots ready`
              )}
            </div>
            {isProcessing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Combining...</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - 2x2 Grid */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <DropZone index={0} screenshot={screenshots[0]} />
            <DropZone index={1} screenshot={screenshots[1]} />
            <DropZone index={2} screenshot={screenshots[2]} />
            <DropZone index={3} screenshot={screenshots[3]} />
          </div>
          
          {/* Instructions */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>Drag screenshots from your desktop or click to browse files.</p>
            <p>Supports PNG, JPG, and GIF formats. Screenshots will be combined vertically.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center space-x-2">
            {screenshotCount > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Clear All</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>

            {/* Combine Button */}
            <button
              onClick={handleCombineAndCopy}
              disabled={!isCompleted || isProcessing}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Combining...' : 'Combine & Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
