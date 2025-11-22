/**
 * Paste Notes Panel Component
 *
 * Minimal modal for pasting typed clinical notes with accessibility support.
 * Keyboard shortcuts: Cmd/Ctrl+Enter to generate, Escape to cancel.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button, { IconButton } from './buttons/Button';

interface PasteNotesPanelProps {
  isVisible: boolean;
  isGenerating: boolean;
  onClose: () => void;
  onGenerate: (notes: string, includePatientFriendly: boolean) => Promise<void>;
  extractionError?: string;
  onRetryExtraction?: () => Promise<void>;
}

export const PasteNotesPanel: React.FC<PasteNotesPanelProps> = ({
  isVisible,
  isGenerating,
  onClose,
  onGenerate,
  extractionError,
  onRetryExtraction
}) => {
  const [notes, setNotes] = useState('');
  const [includePatientFriendly, setIncludePatientFriendly] = useState(false);
  const [error, setError] = useState<string | undefined>(extractionError);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isVisible]);

  // Update error when extractionError prop changes
  useEffect(() => {
    setError(extractionError);
  }, [extractionError]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + Enter to generate
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (notes.trim() && !isGenerating) {
          handleGenerate();
        }
      }

      // Escape to cancel
      if (e.key === 'Escape' && !isGenerating) {
        e.preventDefault();
        onClose();
      }
    },
    [notes, isGenerating, onClose]
  );

  const handleGenerate = useCallback(async () => {
    if (!notes.trim()) {
      setError('Please enter some clinical notes to generate a letter');
      return;
    }

    setError(undefined);

    try {
      await onGenerate(notes, includePatientFriendly);
      // Clear notes on success
      setNotes('');
      setIncludePatientFriendly(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate letter');
    }
  }, [notes, includePatientFriendly, onGenerate]);

  const handleCancel = useCallback(() => {
    if (!isGenerating) {
      setNotes('');
      setIncludePatientFriendly(false);
      setError(undefined);
      onClose();
    }
  }, [isGenerating, onClose]);

  const handleRetry = useCallback(async () => {
    if (onRetryExtraction) {
      setError(undefined);
      try {
        await onRetryExtraction();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to extract EMR data');
      }
    }
  }, [onRetryExtraction]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border-2 border-gray-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="paste-notes-title"
          aria-describedby="paste-notes-description"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 id="paste-notes-title" className="text-lg font-semibold text-gray-900">
                    Paste Clinical Notes
                  </h3>
                  <p id="paste-notes-description" className="text-xs text-gray-600">
                    Type or paste your clinic notes to generate a letter
                  </p>
                </div>
              </div>
              <IconButton
                onClick={handleCancel}
                disabled={isGenerating}
                icon={X}
                variant="ghost"
                size="sm"
                aria-label="Close paste notes panel"
                className="text-gray-500 hover:text-gray-700"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Error display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-800">{error}</div>
                  {onRetryExtraction && (
                    <Button
                      onClick={handleRetry}
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline p-0 h-auto"
                    >
                      Retry EMR extraction
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>Quick tips:</strong>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Use shorthand: "FU HTN", "↑ perindopril to 5 mg od", "stop amlo"</li>
                  <li>• Include key info: purpose, diagnosis, plan, medication changes</li>
                  <li>• Press <kbd className="px-1 py-0.5 bg-blue-100 rounded text-blue-900">⌘/Ctrl+Enter</kbd> to generate</li>
                </ul>
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label htmlFor="paste-notes-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Notes
              </label>
              <textarea
                ref={textareaRef}
                id="paste-notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isGenerating}
                placeholder="e.g., FU HTN. BP 145/90. ↑ perindopril to 5 mg od. Stop amlodipine due to ankle oedema. Review in 4 weeks with home BP diary."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                style={{ minHeight: '120px' }}
                aria-describedby="notes-hint"
              />
              <div id="notes-hint" className="mt-1 text-xs text-gray-500">
                {notes.length} characters • {notes.split('\n').length} lines
              </div>
            </div>

            {/* Patient-friendly toggle */}
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="include-patient-friendly"
                checked={includePatientFriendly}
                onChange={(e) => setIncludePatientFriendly(e.target.checked)}
                disabled={isGenerating}
                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
              />
              <label htmlFor="include-patient-friendly" className="text-sm text-gray-700">
                <div className="font-medium">Include patient-friendly version</div>
                <div className="text-xs text-gray-500">
                  Generate an additional letter in plain language for the patient
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {isGenerating ? (
                  <span className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Generating letter (max 30s)...</span>
                  </span>
                ) : (
                  <span>Keyboard shortcuts: ⌘/Ctrl+Enter to generate, Esc to close</span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleCancel}
                  disabled={isGenerating}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleGenerate}
                  disabled={!notes.trim() || isGenerating}
                  variant="success"
                  size="md"
                  isLoading={isGenerating}
                  startIcon={isGenerating ? Loader : undefined}
                >
                  {isGenerating ? 'Generating...' : 'Generate Letter'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
