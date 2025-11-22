/**
 * BP Dropzone Component
 *
 * Image upload dropzone for BP diary sheets.
 * Reuses patterns from ScreenshotAnnotationModal with single-image mode.
 */

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon, X } from 'lucide-react';
import { FileToasts } from '@/utils/toastHelpers';
import { IconButton } from './buttons/Button';

interface BPDropzoneProps {
  onImageSelect: (imageDataUrl: string) => void;
  currentImage?: string | null;
  onClearImage?: () => void;
  disabled?: boolean;
}

export const BPDropzone: React.FC<BPDropzoneProps> = ({
  onImageSelect,
  currentImage,
  onClearImage,
  disabled = false
}) => {

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      FileToasts.invalidFile();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        onImageSelect(dataUrl);
        FileToasts.imageAdded(0);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const onDropFiles = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      handleFileSelect(acceptedFiles[0]);
    } else {
      FileToasts.invalidFile();
    }
  }, [handleFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    accept: { 'image/*': [] },
    multiple: false,
    disabled,
    noKeyboard: true,
    useFsAccessApi: false,
  });

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClearImage) {
      onClearImage();
      FileToasts.imageRemoved(0);
    }
  }, [onClearImage]);

  if (currentImage) {
    return (
      <div className="relative">
        <div className="relative rounded-lg border-2 border-gray-300 bg-gray-50 overflow-hidden">
          <img
            src={currentImage}
            alt="BP Diary Sheet"
            className="w-full h-auto max-h-96 object-contain"
          />
          {onClearImage && !disabled && (
            <IconButton
              onClick={handleClear}
              icon={<X />}
              variant="danger"
              size="md"
              className="absolute top-2 right-2 rounded-full shadow-lg"
              title="Remove image"
              aria-label="Remove image"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps({
        className: `
          relative rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragActive
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-25'
          }
          min-h-64 flex items-center justify-center p-8
        `
      })}
    >
      <input {...getInputProps({ accept: 'image/*' })} />

      <div className="flex flex-col items-center justify-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isDragActive ? 'bg-blue-200' : 'bg-gray-200'
        }`}>
          {isDragActive ? (
            <Upload className="w-8 h-8 text-blue-600" />
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-500" />
          )}
        </div>

        <div className="text-base font-medium text-gray-700 mb-2">
          {isDragActive ? 'Drop BP diary image here' : 'Drop BP diary image or click to browse'}
        </div>

        <div className="text-sm text-gray-500 space-y-1">
          <p>Supports PNG, JPG, or PDF screenshots</p>
          <p className="text-xs">Photos of handwritten BP diaries work best</p>
        </div>
      </div>
    </div>
  );
};