/**
 * Dictate Section Modal - Phase 4
 *
 * Modal for recording and parsing incremental dictation to append to any TAVI workup section.
 * Pattern: Record → Transcribe → Parse → Preview → Merge
 *
 * Features:
 * - Audio recording with live visualizer
 * - Transcription
 * - Quick model parsing for cleanup
 * - Preview before merging
 * - Simple append strategy
 */

import React, { useState, useCallback } from 'react';
import { X, Mic, Check } from 'lucide-react';
import Button from '../buttons/Button';
import { useRecorder } from '@/hooks/useRecorder';
import { TranscriptionService } from '@/services/TranscriptionService';
import { TAVIWorkupIncrementalService } from '@/services/TAVIWorkupIncrementalService';
import { LiveAudioVisualizer } from '../LiveAudioVisualizer';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';

interface DictateSectionModalProps {
  sectionKey: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>;
  sectionTitle: string;
  onClose: () => void;
  onMerge: (content: string) => Promise<void>;
}

type ProcessingStage = 'idle' | 'recording' | 'transcribing' | 'parsing' | 'preview' | 'merging';

export const DictateSectionModal: React.FC<DictateSectionModalProps> = ({
  sectionKey,
  sectionTitle,
  onClose,
  onMerge
}) => {
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [parsedContent, setParsedContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { isRecording, startRecording, stopRecording } = useRecorder({
    onRecordingComplete: handleRecordingComplete
  });

  async function handleRecordingComplete(audioBlob: Blob) {
    setStage('transcribing');
    setError(null);

    try {
      // Transcribe audio
      const transcriptionService = TranscriptionService.getInstance();
      const result = await transcriptionService.transcribe(audioBlob);
      setTranscription(result.text);

      // Parse with quick model
      setStage('parsing');
      const incrementalService = TAVIWorkupIncrementalService.getInstance();
      const parsed = await incrementalService.parseDictation(result.text, sectionKey);
      setParsedContent(parsed.parsedContent);

      // Show preview
      setStage('preview');
    } catch (err) {
      console.error('[DictateSectionModal] Processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process dictation');
      setStage('idle');
    }
  }

  const handleStartRecording = useCallback(async () => {
    setError(null);
    setTranscription('');
    setParsedContent('');
    await startRecording();
    setStage('recording');
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  const handleMerge = useCallback(async () => {
    setStage('merging');
    setError(null);

    try {
      await onMerge(parsedContent);
      onClose();
    } catch (err) {
      console.error('[DictateSectionModal] Merge failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to merge content');
      setStage('preview');
    }
  }, [parsedContent, onMerge, onClose]);

  const handleRetry = useCallback(() => {
    setStage('idle');
    setTranscription('');
    setParsedContent('');
    setError(null);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl shadow-2xl max-w-2xl w-full mx-3 mb-3 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line-primary">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">Dictate Additional Content</h2>
            <p className="text-sm text-ink-secondary">{sectionTitle}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X className="w-4 h-4" />} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p className="text-sm text-rose-900">{error}</p>
            </div>
          )}

          {/* Recording Stage */}
          {stage === 'idle' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                <Mic className="w-10 h-10 text-purple-600" />
              </div>
              <p className="text-sm text-ink-secondary">
                Press the button below to start recording additional content for this section.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartRecording}
                icon={<Mic className="w-4 h-4" />}
              >
                Start Recording
              </Button>
            </div>
          )}

          {stage === 'recording' && (
            <div className="space-y-4">
              <LiveAudioVisualizer isRecording={isRecording} />
              <div className="text-center">
                <p className="text-sm text-ink-secondary mb-4">Recording in progress...</p>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleStopRecording}
                >
                  Stop Recording
                </Button>
              </div>
            </div>
          )}

          {/* Processing Stages */}
          {stage === 'transcribing' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-ink-secondary">Transcribing audio...</p>
            </div>
          )}

          {stage === 'parsing' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-ink-secondary">Parsing and formatting content...</p>
            </div>
          )}

          {/* Preview Stage */}
          {stage === 'preview' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary mb-2">Original Transcription</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-ink-primary whitespace-pre-wrap">{transcription}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink-primary mb-2">Parsed Content (Ready to Merge)</h3>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-sm text-ink-primary whitespace-pre-wrap">{parsedContent}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line-primary">
                <Button variant="ghost" size="md" onClick={handleRetry}>
                  Record Again
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleMerge}
                  icon={<Check className="w-4 h-4" />}
                >
                  Merge Content
                </Button>
              </div>
            </div>
          )}

          {/* Merging Stage */}
          {stage === 'merging' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-ink-secondary">Merging content into workup...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
