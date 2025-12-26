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

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

type ManualMapping = {
  value: number;
  fieldKey: string;
};

const CT_MANUAL_FIELDS = [
  { value: 'annulusAreaMm2', label: 'Annulus area (mm2)' },
  { value: 'annulusPerimeterMm', label: 'Annulus perimeter (mm)' },
  { value: 'annulusMinDiameterMm', label: 'Annulus min diameter (mm)' },
  { value: 'annulusMaxDiameterMm', label: 'Annulus max diameter (mm)' },
  { value: 'annulusMeanDiameterMm', label: 'Annulus mean diameter (mm)' },
  { value: 'coronaryHeights.leftMainMm', label: 'Left main height (mm)' },
  { value: 'coronaryHeights.rightCoronaryMm', label: 'Right coronary height (mm)' },
  { value: 'lvotAreaMm2', label: 'LVOT area (mm2)' },
  { value: 'lvotPerimeterMm', label: 'LVOT perimeter (mm)' },
  { value: 'stjDiameterMm', label: 'STJ diameter (mm)' },
  { value: 'stjHeightMm', label: 'STJ height (mm)' },
  { value: 'accessVessels.rightCIAmm', label: 'Right CIA (mm)' },
  { value: 'accessVessels.leftCIAmm', label: 'Left CIA (mm)' },
  { value: 'accessVessels.rightEIAmm', label: 'Right EIA (mm)' },
  { value: 'accessVessels.leftEIAmm', label: 'Left EIA (mm)' },
  { value: 'accessVessels.rightCFAmm', label: 'Right CFA (mm)' },
  { value: 'accessVessels.leftCFAmm', label: 'Left CFA (mm)' },
  { value: 'calciumScore', label: 'Aortic valve calcium score (AU)' },
  { value: 'lvotCalciumScore', label: 'LVOT calcium score (AU)' }
];

const extractNumericValues = (text: string): number[] => {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches
    .map(value => parseFloat(value))
    .filter(value => Number.isFinite(value));
};

const setMeasurementValue = (
  measurements: Partial<TAVIWorkupCTMeasurements>,
  fieldKey: string,
  value: number
): void => {
  const path = fieldKey.split('.');
  let cursor: any = measurements;

  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[path[path.length - 1]] = value;
};

const buildMeasurementsFromMappings = (
  mappings: ManualMapping[]
): Partial<TAVIWorkupCTMeasurements> => {
  const measurements: Partial<TAVIWorkupCTMeasurements> = {};
  mappings.forEach(mapping => {
    if (!mapping.fieldKey || !Number.isFinite(mapping.value)) {
      return;
    }
    setMeasurementValue(measurements, mapping.fieldKey, mapping.value);
  });
  return measurements;
};

const mergeMeasurements = (
  base: Partial<TAVIWorkupCTMeasurements>,
  override: Partial<TAVIWorkupCTMeasurements>
): Partial<TAVIWorkupCTMeasurements> => {
  const merged: Partial<TAVIWorkupCTMeasurements> = { ...base, ...override };

  if (base.coronaryHeights || override.coronaryHeights) {
    merged.coronaryHeights = {
      ...base.coronaryHeights,
      ...override.coronaryHeights
    };
  }

  if (base.accessVessels || override.accessVessels) {
    merged.accessVessels = {
      ...base.accessVessels,
      ...override.accessVessels
    };
  }

  if (base.sinusOfValsalva || override.sinusOfValsalva) {
    merged.sinusOfValsalva = {
      ...base.sinusOfValsalva,
      ...override.sinusOfValsalva
    };
  }

  if (base.aorticDimensions || override.aorticDimensions) {
    merged.aorticDimensions = {
      ...base.aorticDimensions,
      ...override.aorticDimensions
    };
  }

  return merged;
};

const countMeasurements = (measurements: Partial<TAVIWorkupCTMeasurements>): number => {
  let count = 0;
  const push = (value?: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      count += 1;
    }
  };

  push(measurements.annulusAreaMm2);
  push(measurements.annulusPerimeterMm);
  push(measurements.annulusMinDiameterMm);
  push(measurements.annulusMaxDiameterMm);
  push(measurements.annulusMeanDiameterMm);
  push(measurements.lvotAreaMm2);
  push(measurements.lvotPerimeterMm);
  push(measurements.stjDiameterMm);
  push(measurements.stjHeightMm);
  push(measurements.calciumScore);
  push(measurements.lvotCalciumScore);

  if (measurements.coronaryHeights) {
    push(measurements.coronaryHeights.leftMainMm);
    push(measurements.coronaryHeights.rightCoronaryMm);
  }

  if (measurements.accessVessels) {
    push(measurements.accessVessels.rightCIAmm);
    push(measurements.accessVessels.leftCIAmm);
    push(measurements.accessVessels.rightEIAmm);
    push(measurements.accessVessels.leftEIAmm);
    push(measurements.accessVessels.rightCFAmm);
    push(measurements.accessVessels.leftCFAmm);
  }

  if (measurements.sinusOfValsalva) {
    push(measurements.sinusOfValsalva.leftMm);
    push(measurements.sinusOfValsalva.rightMm);
    push(measurements.sinusOfValsalva.nonCoronaryMm);
  }

  return count;
};

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
  const [manualMappings, setManualMappings] = useState<ManualMapping[]>([]);
  const [showManualMapping, setShowManualMapping] = useState<boolean>(false);

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

  useEffect(() => {
    if (!transcription) {
      setManualMappings([]);
      return;
    }

    const values = extractNumericValues(transcription);
    setManualMappings(values.map(value => ({ value, fieldKey: '' })));
  }, [transcription]);

  const manualMeasurements = useMemo(
    () => buildMeasurementsFromMappings(manualMappings),
    [manualMappings]
  );

  const combinedMeasurements = useMemo(
    () => mergeMeasurements(extractedMeasurements, manualMeasurements),
    [extractedMeasurements, manualMeasurements]
  );

  const combinedCount = useMemo(
    () => countMeasurements(combinedMeasurements),
    [combinedMeasurements]
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setShowManualMapping(false);
      setManualMappings([]);

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
      setShowManualMapping(countMeasurements(parseResult.extractedFields) === 0);

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
    onMerge(combinedMeasurements, narrativeSummary);
  }, [combinedMeasurements, narrativeSummary, onMerge]);

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
    if (measurements.annulusMinDiameterMm !== undefined) {
      items.push(<div key="min" className="measurement-preview">Min Diameter: <strong>{measurements.annulusMinDiameterMm} mm</strong></div>);
    }
    if (measurements.annulusMaxDiameterMm !== undefined) {
      items.push(<div key="max" className="measurement-preview">Max Diameter: <strong>{measurements.annulusMaxDiameterMm} mm</strong></div>);
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
    if (measurements.accessVessels?.rightCIAmm !== undefined) {
      items.push(<div key="rcia" className="measurement-preview">R CIA: <strong>{measurements.accessVessels.rightCIAmm} mm</strong></div>);
    }
    if (measurements.accessVessels?.leftCIAmm !== undefined) {
      items.push(<div key="lcia" className="measurement-preview">L CIA: <strong>{measurements.accessVessels.leftCIAmm} mm</strong></div>);
    }
    if (measurements.accessVessels?.rightEIAmm !== undefined) {
      items.push(<div key="reia" className="measurement-preview">R EIA: <strong>{measurements.accessVessels.rightEIAmm} mm</strong></div>);
    }
    if (measurements.accessVessels?.leftEIAmm !== undefined) {
      items.push(<div key="leia" className="measurement-preview">L EIA: <strong>{measurements.accessVessels.leftEIAmm} mm</strong></div>);
    }
    if (measurements.lvotAreaMm2 !== undefined) {
      items.push(<div key="lvot" className="measurement-preview">LVOT Area: <strong>{measurements.lvotAreaMm2} mm²</strong></div>);
    }
    if (measurements.lvotPerimeterMm !== undefined) {
      items.push(<div key="lvot-perim" className="measurement-preview">LVOT Perimeter: <strong>{measurements.lvotPerimeterMm} mm</strong></div>);
    }
    if (measurements.stjDiameterMm !== undefined) {
      items.push(<div key="stj-diam" className="measurement-preview">STJ Diameter: <strong>{measurements.stjDiameterMm} mm</strong></div>);
    }
    if (measurements.stjHeightMm !== undefined) {
      items.push(<div key="stj-height" className="measurement-preview">STJ Height: <strong>{measurements.stjHeightMm} mm</strong></div>);
    }
    if (measurements.calciumScore !== undefined) {
      items.push(<div key="calcium" className="measurement-preview">AV Calcium: <strong>{measurements.calciumScore} AU</strong></div>);
    }
    if (measurements.lvotCalciumScore !== undefined) {
      items.push(<div key="lvot-calcium" className="measurement-preview">LVOT Calcium: <strong>{measurements.lvotCalciumScore} AU</strong></div>);
    }

    return items;
  };

  const handleManualMappingChange = (index: number, fieldKey: string) => {
    setManualMappings(prev =>
      prev.map((mapping, idx) =>
        idx === index ? { ...mapping, fieldKey } : mapping
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md mx-3 mb-3 overflow-hidden flex flex-col max-h-[70vh]">
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
        <div className="p-4 overflow-y-auto">
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
                  {formatMeasurementPreview(combinedMeasurements).length > 0 ? (
                    formatMeasurementPreview(combinedMeasurements)
                  ) : (
                    <p className="text-sm text-ink-tertiary italic">No measurements extracted</p>
                  )}
                </div>
              </div>

              {/* Manual Mapping */}
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-secondary">Manual Mapping</label>
                  {combinedCount > 0 && (
                    <button
                      type="button"
                      className="text-xs text-purple-600 hover:text-purple-700"
                      onClick={() => setShowManualMapping(prev => !prev)}
                    >
                      {showManualMapping ? 'Hide' : 'Map Numbers'}
                    </button>
                  )}
                </div>
                {(showManualMapping || combinedCount === 0) && (
                  <div className="mt-2 space-y-2">
                    {manualMappings.length > 0 ? (
                      manualMappings.map((mapping, index) => (
                        <div key={`${mapping.value}-${index}`} className="flex items-center gap-2">
                          <span className="w-16 text-xs font-mono text-ink-primary">{mapping.value}</span>
                          <select
                            value={mapping.fieldKey}
                            onChange={(event) => handleManualMappingChange(index, event.target.value)}
                            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                          >
                            <option value="">Unassigned</option>
                            {CT_MANUAL_FIELDS.map(field => (
                              <option key={field.value} value={field.value}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-ink-tertiary">No numeric values detected in the transcription.</p>
                    )}
                    <p className="text-[11px] text-ink-tertiary">
                      Mapped values are merged with extracted measurements.
                    </p>
                  </div>
                )}
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
                    setManualMappings([]);
                    setShowManualMapping(false);
                  }}
                >
                  Try Again
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  icon={<Check className="w-3 h-3" />}
                  disabled={combinedCount === 0}
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
