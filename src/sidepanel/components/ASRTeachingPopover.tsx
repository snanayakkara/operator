/**
 * ASR Teaching Popover (E16)
 *
 * Inline correction UI for teaching the ASR system.
 * When user selects text in a transcript, they can "teach" a correction
 * which is persisted and applied to future transcriptions.
 *
 * Flow:
 * 1. User selects text in transcript
 * 2. Popover appears with "Teach correction" option
 * 3. User enters the correct text
 * 4. Correction is saved via POST /v1/asr/corrections
 * 5. Correction is applied immediately to current transcript
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GraduationCap, X, Check, Loader2 } from 'lucide-react';
import { logger } from '@/utils/Logger';

interface ASRTeachingPopoverProps {
  /** The transcript text to monitor for selections */
  transcriptRef: React.RefObject<HTMLElement>;
  /** Callback when a correction is confirmed - applies immediately to transcript */
  onCorrectionApplied: (from: string, to: string) => void;
  /** Optional: called to persist the correction to server */
  onCorrectionPersist?: (correction: ASRCorrection) => Promise<boolean>;
  /** Whether the popover is disabled */
  disabled?: boolean;
}

export interface ASRCorrection {
  id: string;
  rawText: string;
  correctedText: string;
  agentType?: string;
  timestamp: number;
}

interface PopoverPosition {
  top: number;
  left: number;
}

/**
 * ASRTeachingPopover - Floating UI for teaching ASR corrections
 */
export const ASRTeachingPopover: React.FC<ASRTeachingPopoverProps> = ({
  transcriptRef,
  onCorrectionApplied,
  onCorrectionPersist,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle text selection in the transcript
  const handleSelectionChange = useCallback(() => {
    if (disabled) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // Don't hide immediately - allow clicking the popover
      return;
    }

    const selectedStr = selection.toString().trim();
    if (!selectedStr || selectedStr.length < 2) {
      return;
    }

    // Check if selection is within our transcript element
    const range = selection.getRangeAt(0);
    if (!transcriptRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }

    // Get position for popover
    const rect = range.getBoundingClientRect();
    const containerRect = transcriptRef.current.getBoundingClientRect();

    setSelectedText(selectedStr);
    setCorrectedText(selectedStr); // Pre-fill with selected text
    setPosition({
      top: rect.bottom - containerRect.top + 8,
      left: rect.left - containerRect.left + (rect.width / 2)
    });
    setIsVisible(true);
    setShowSuccess(false);
  }, [disabled, transcriptRef]);

  // Listen for selection changes
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Small delay to allow selection events to complete
        setTimeout(() => {
          if (!window.getSelection()?.toString().trim()) {
            setIsVisible(false);
          }
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus input when popover appears
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isVisible]);

  const handleSubmit = async () => {
    if (!selectedText || !correctedText.trim() || selectedText === correctedText.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const correction: ASRCorrection = {
        id: `asr-${Date.now()}`,
        rawText: selectedText,
        correctedText: correctedText.trim(),
        timestamp: Date.now()
      };

      // Persist to server if callback provided
      if (onCorrectionPersist) {
        const success = await onCorrectionPersist(correction);
        if (!success) {
          logger.warn('Failed to persist ASR correction to server', {
            component: 'ASRTeachingPopover',
            from: selectedText,
            to: correctedText
          });
          // Continue anyway - apply locally even if server fails
        }
      }

      // Apply correction immediately
      onCorrectionApplied(selectedText, correctedText.trim());

      logger.info('ASR correction applied', {
        component: 'ASRTeachingPopover',
        from: selectedText,
        to: correctedText.trim()
      });

      // Show success state briefly
      setShowSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
        setShowSuccess(false);
        setSelectedText('');
        setCorrectedText('');
      }, 1000);

    } catch (error) {
      logger.error('Failed to apply ASR correction', error as Error, {
        component: 'ASRTeachingPopover'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsVisible(false);
    setSelectedText('');
    setCorrectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isVisible || disabled) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[280px]"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)'
      }}
    >
      {/* Arrow pointer */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white dark:border-b-gray-800"
      />

      {showSuccess ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Correction saved!</span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">Teach correction</span>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Original text (read-only) */}
          <div className="mb-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Replace
            </label>
            <div className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 font-mono">
              {selectedText}
            </div>
          </div>

          {/* Corrected text input */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              With
            </label>
            <input
              ref={inputRef}
              type="text"
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter correct text..."
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !correctedText.trim() || selectedText === correctedText.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <GraduationCap className="w-3.5 h-3.5" />
                  Teach
                </>
              )}
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            This correction will be applied to future transcriptions.
          </p>
        </>
      )}
    </div>
  );
};

export default ASRTeachingPopover;
