/**
 * Dictate CT Modal - Phase 8.5
 *
 * Modal for dictating CT measurements using audio recording.
 * Uses TAVIWorkupDictationParserService to parse transcription into structured fields.
 *
 * Flow:
 * 1. User clicks "Record" → starts audio recording
 * 2. User stops recording → sends to transcription service
 * 3. Transcription → TAVIWorkupDictationParserService.parseDictation('ct')
 * 4. Shows extracted measurements for review
 * 5. User confirms → merges into CTMeasurementsCard
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Check, X, AlertCircle } from 'lucide-react';
import Button from '../buttons/Button';
import { TAVIWorkupDictationParserService } from '@/services/TAVIWorkupDictationParserService';
import { LMStudioService } from '@/services/LMStudioService';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';

interface DictateCTModalProps {
  onClose: () => void;
  onMerge: (measurements: Partial<TAVIWorkupCTMeasurements>, narrative?: string) => void;
}

type ModalState = 'idle' | 'recording' | 'transcribing' | 'parsing' | 'review' | 'error';

export const DictateCTModal: React.FC<DictateCTModalProps> = ({
  onClose,
  onMerge
}) => {
  const [state, setState] = useState<ModalState>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [extractedMeasurements, setExtractedMeasurements] = useState<Partial<TAVIWorkupCTMeasurements>>({});
  const [narrativeSummary, setNarrativeSummary] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Process audio
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      setState('recording');
    } catch (err) {
      console.error('[DictateCTModal] Failed to start recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setState('error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setState('transcribing');

    try {
      // Transcribe with transcription service via LMStudioService
      const lmStudioService = LMStudioService.getInstance();
      const transcriptionText = await lmStudioService.transcribeAudio(audioBlob);

      if (!transcriptionText) {
        throw new Error('Transcription returned empty result');
      }

      setTranscription(transcriptionText);

      // Parse with dictation parser
      setState('parsing');
      const parserService = TAVIWorkupDictationParserService.getInstance();
      const parseResult = await parserService.parseDictation(transcriptionText, 'ct');

      setExtractedMeasurements(parseResult.extractedFields);
      setConfidence(parseResult.confidence);

      // Generate narrative from transcription if CT section
      if (parseResult.detectedSection === 'ct') {
        setNarrativeSummary(transcriptionText);
      }

      setState('review');
    } catch (err) {
      console.error('[DictateCTModal] Processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
      setState('error');
    }
  }, []);

  const handleConfirm = useCallback(() => {
    onMerge(extractedMeasurements, narrativeSummary);
  }, [extractedMeasurements, narrativeSummary, onMerge]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMeasurementPreview = (measurements: Partial<TAVIWorkupCTMeasurements>): JSX.Element[] => {
    const items: JSX.Element[] = [];

    if (measurements.annulusAreaMm2 !== undefined) {
      items.push(<div key="area" className="measurement-preview">Annulus Area: <strong>{measurements.annulusAreaMm2} mm²</strong></div>);
    }
    if (measurements.annulusPerimeterMm !== undefined) {
      items.push(<div key="perim" className="measurement-preview">Annulus Perimeter: <strong>{measurements.annulusPerimeterMm} mm</strong></div>);
    }
    if (measurements.annulusMeanDiameterMm !== undefined) {
      items.push(<div key="mean" className="measurement-preview">Mean Diameter: <strong>{measurements.annulusMeanDiameterMm} mm</strong></div>);
    }
    if (measurements.coronaryHeights?.leftMainMm !== undefined) {
      items.push(<div key="lm" className="measurement-preview">LM Height: <strong>{measurements.coronaryHeights.leftMainMm} mm</strong></div>);
    }
    if (measurements.coronaryHeights?.rightCoronaryMm !== undefined) {
      items.push(<div key="rca" className="measurement-preview">RCA Height: <strong>{measurements.coronaryHeights.rightCoronaryMm} mm</strong></div>);
    }
    if (measurements.accessVessels?.rightCFAmm !== undefined) {
      items.push(<div key="rcfa" className="measurement-preview">R CFA: <strong>{measurements.accessVessels.rightCFAmm} mm</strong></div>);
    }
    if (measurements.accessVessels?.leftCFAmm !== undefined) {
      items.push(<div key="lcfa" className="measurement-preview">L CFA: <strong>{measurements.accessVessels.leftCFAmm} mm</strong></div>);
    }
    if (measurements.lvotAreaMm2 !== undefined) {
      items.push(<div key="lvot" className="measurement-preview">LVOT Area: <strong>{measurements.lvotAreaMm2} mm²</strong></div>);
    }

    return items;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-purple-50">
          <h3 className="text-sm font-semibold text-ink-primary">Dictate CT Measurements</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-4 h-4 text-ink-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Idle State */}
          {state === 'idle' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                <Mic className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-ink-secondary mb-4">
                Click record and dictate your CT findings.
                <br />
                <span className="text-xs text-ink-tertiary">
                  Example: "Annulus area 505 square millimeters, perimeter 81.2, left main height 14 millimeters..."
                </span>
              </p>
              <Button
                variant="primary"
                onClick={startRecording}
                icon={<Mic className="w-4 h-4" />}
              >
                Start Recording
              </Button>
            </div>
          )}

          {/* Recording State */}
          {state === 'recording' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                <div className="w-4 h-4 bg-red-500 rounded-full" />
              </div>
              <p className="text-sm text-ink-secondary mb-2">Recording...</p>
              <p className="text-2xl font-mono text-ink-primary mb-4">{formatDuration(recordingDuration)}</p>
              <Button
                variant="outline"
                onClick={stopRecording}
                icon={<Square className="w-4 h-4" />}
              >
                Stop Recording
              </Button>
            </div>
          )}

          {/* Transcribing State */}
          {state === 'transcribing' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
              <p className="text-sm text-ink-secondary">Transcribing audio...</p>
            </div>
          )}

          {/* Parsing State */}
          {state === 'parsing' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-500 animate-spin" />
              <p className="text-sm text-ink-secondary">Parsing CT measurements...</p>
            </div>
          )}

          {/* Review State */}
          {state === 'review' && (
            <div className="space-y-4">
              {/* Transcription */}
              <div>
                <label className="text-xs font-medium text-ink-secondary block mb-1">Transcription</label>
                <div className="bg-gray-50 rounded p-2 text-sm text-ink-primary max-h-24 overflow-y-auto">
                  {transcription}
                </div>
              </div>

              {/* Extracted Measurements */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-ink-secondary">Extracted Measurements</label>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                    confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round(confidence * 100)}% confidence
                  </span>
                </div>
                <div className="bg-purple-50 rounded p-3 space-y-1">
                  {formatMeasurementPreview(extractedMeasurements).length > 0 ? (
                    formatMeasurementPreview(extractedMeasurements)
                  ) : (
                    <p className="text-sm text-ink-tertiary italic">No measurements extracted</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setState('idle');
                    setTranscription('');
                    setExtractedMeasurements({});
                  }}
                >
                  Try Again
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  icon={<Check className="w-3 h-3" />}
                  disabled={Object.keys(extractedMeasurements).length === 0}
                >
                  Apply Measurements
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => setState('idle')}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
