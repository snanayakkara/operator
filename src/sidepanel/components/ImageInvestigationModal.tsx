/**
 * ImageInvestigationModal Component
 *
 * Modal for uploading investigation report images with metadata input.
 * Features:
 * - Drag-and-drop image upload
 * - Investigation type dropdown (TTE, TOE, CTCA, etc.) with custom option
 * - Date picker (DD/MM/YYYY Australian format)
 * - Image preview
 * - Processing state with progress
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Calendar,
  FileImage,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { Button, IconButton } from './buttons';
import { INVESTIGATION_TYPES, InvestigationType } from '@/services/InvestigationImageExtractor';

interface ImageInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (imageDataUrl: string, investigationType: string, date: string) => Promise<void>;
  isProcessing?: boolean;
}

export const ImageInvestigationModal: React.FC<ImageInvestigationModalProps> = ({
  isOpen,
  onClose,
  onProcess,
  isProcessing = false
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [investigationType, setInvestigationType] = useState<InvestigationType>('TTE');
  const [customType, setCustomType] = useState('');
  const [investigationDate, setInvestigationDate] = useState(() => {
    // Default to today's date in DD/MM/YYYY format
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please use JPEG, PNG, or WebP images.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Maximum size is 10MB.');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageDataUrl(result);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!imageDataUrl) {
      setError('Please upload an image first.');
      return;
    }

    const finalType = investigationType === 'Custom' ? customType : investigationType;
    if (!finalType.trim()) {
      setError('Please specify the investigation type.');
      return;
    }

    if (!investigationDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      setError('Please enter a valid date in DD/MM/YYYY format.');
      return;
    }

    try {
      await onProcess(imageDataUrl, finalType, investigationDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    }
  }, [imageDataUrl, investigationType, customType, investigationDate, onProcess]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9/]/g, '');

    // Auto-format with slashes
    if (value.length === 2 && !value.includes('/')) {
      value = value + '/';
    } else if (value.length === 5 && value.split('/').length === 2) {
      value = value + '/';
    }

    // Limit to DD/MM/YYYY format length
    if (value.length <= 10) {
      setInvestigationDate(value);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileImage className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-gray-900 font-semibold text-sm">Scan Investigation Report</h2>
                <p className="text-gray-500 text-xs">Upload a photo or screenshot</p>
              </div>
            </div>
            <IconButton
              onClick={onClose}
              variant="ghost"
              size="sm"
              icon={X}
              aria-label="Close"
              disabled={isProcessing}
            />
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Drop zone / Image preview */}
            {!imageDataUrl ? (
              <div
                className={`
                  border-2 border-dashed rounded-xl p-8
                  flex flex-col items-center justify-center
                  transition-colors cursor-pointer
                  ${isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {isDragging ? 'Drop image here' : 'Drag and drop image'}
                </p>
                <p className="text-xs text-gray-500">
                  or click to browse (JPEG, PNG, WebP)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={imageDataUrl}
                  alt="Investigation report preview"
                  className="w-full h-48 object-contain"
                />
                <IconButton
                  onClick={handleRemoveImage}
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  aria-label="Remove image"
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-sm"
                  disabled={isProcessing}
                />
              </div>
            )}

            {/* Investigation Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Investigation Type
              </label>
              <select
                value={investigationType}
                onChange={(e) => setInvestigationType(e.target.value as InvestigationType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                disabled={isProcessing}
              >
                {INVESTIGATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* Custom type input */}
              {investigationType === 'Custom' && (
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Enter investigation type..."
                  className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Investigation Date</span>
                </span>
              </label>
              <input
                type="text"
                value={investigationDate}
                onChange={handleDateChange}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isProcessing}
              />
              <p className="mt-1 text-xs text-gray-500">Australian date format</p>
            </div>

            {/* Error display */}
            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              AI will extract findings from the image
            </p>
            <div className="flex items-center space-x-2">
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcess}
                variant="primary"
                size="sm"
                disabled={!imageDataUrl || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process Image'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageInvestigationModal;
