/**
 * BP Diary Importer - Main Component
 *
 * Orchestrates the complete BP diary import workflow:
 * 1. Image upload (dropzone)
 * 2. Extraction via Qwen3-VL 8B Instruct (vision/OCR)
 * 3. Validation and review (editable grid)
 * 4. Visualization (interactive chart)
 * 5. Export (JSON/CSV) and clipboard copy
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, FileJson, FileText, Clipboard, RefreshCw, Trash2, CheckCircle, Settings, Info } from 'lucide-react';
import { BPDropzone } from './BPDropzone';
import { BPReviewGrid } from './BPReviewGrid';
import { BPChart, BPChartHandle } from './BPChart';
import { BPDiaryExtractor } from '@/services/BPDiaryExtractor';
import { BPDataValidator } from '@/utils/BPDataValidator';
import { BPDiaryStorage } from '@/services/BPDiaryStorage';
import { LMStudioService } from '@/services/LMStudioService';
import {
  DEFAULT_BP_SETTINGS,
  type BPReading,
  type BPDiarySession,
  type BPDiarySettings,
  type BPInsights,
  type BPClinicalContext,
  type BPDiaryModelsUsed
} from '@/types/BPTypes';
import { ToastService } from '@/services/ToastService';

interface BPDiaryImporterProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProcessingState = 'idle' | 'extracting' | 'validating' | 'ready' | 'error';

export const BPDiaryImporter: React.FC<BPDiaryImporterProps> = ({
  isOpen,
  onClose
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [settings, setSettings] = useState<BPDiarySettings>(DEFAULT_BP_SETTINGS);
  const [showLoadConfirm, setShowLoadConfirm] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => BPDiaryExtractor.getInstance().getDefaultOCRModel());
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [insights, setInsights] = useState<BPInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [clinicalContext, setClinicalContext] = useState<BPClinicalContext | null>(null);
  const [modelsUsed, setModelsUsed] = useState<BPDiaryModelsUsed>(() => {
    const extractor = BPDiaryExtractor.getInstance();
    return {
      extraction: extractor.getDefaultOCRModel(),
      reasoning: extractor.getDefaultClinicalModel()
    };
  });

  const chartRef = useRef<BPChartHandle>(null);
  const extractorRef = useRef(BPDiaryExtractor.getInstance());
  const validatorRef = useRef(BPDataValidator.getInstance());
  const storageRef = useRef(BPDiaryStorage.getInstance());
  const lmStudioRef = useRef(LMStudioService.getInstance());
  const insightsRequestIdRef = useRef(0);

  // Load settings and available models on mount
  useEffect(() => {
    loadSettings();
    loadAvailableModels();
  }, []);

  const loadSettings = async () => {
    const loaded = await storageRef.current.loadSettings();
    setSettings(loaded);
  };

  const loadAvailableModels = async () => {
    const defaultOCRModel = extractorRef.current.getDefaultOCRModel();
    const allModels = await lmStudioRef.current.getAvailableModels();

    // Filter to only vision-capable models
    // Known vision models: LLaVA, Gemma (with vision), Qwen-VL, MiniCPM-V, Pixtral
    const visionModels = allModels.filter(m => {
      const lowerModel = m.toLowerCase();
      return (
        lowerModel.includes('llava') ||
        lowerModel.includes('gemma') ||  // Gemma models often support vision
        lowerModel.includes('vision') ||
        (lowerModel.includes('qwen') && lowerModel.includes('vl')) ||  // Qwen2-VL, Qwen3-VL, etc.
        lowerModel.includes('minicpm') ||
        lowerModel.includes('pixtral') ||
        lowerModel.includes('phi-3-vision') ||
        lowerModel.includes('molmo') ||
        lowerModel.includes('deepseek') ||
        lowerModel.includes('ocr')
      );
    });

    const uniqueVisionModels = Array.from(new Set([defaultOCRModel, ...visionModels]));
    setAvailableModels(uniqueVisionModels);

    // Priority order for auto-selection
    // Qwen3-VL is preferred for diary extraction, then other proven vision models
    const preferredModels = [
      defaultOCRModel,
      'qwen/qwen3-vl-8b',      // Best vision support, proven compatibility
      'google/gemma-3n-e4b',   // Efficient 4B vision model
      'medgemma-4b-it-mlx',    // Medical-specific vision model
      'llava-v1.6',
      'llava-v1.5'
    ];

    // Try to find preferred model
    let nextSelectedModel = defaultOCRModel;
    for (const preferred of preferredModels) {
      const found = uniqueVisionModels.find(m => m.includes(preferred));
      if (found) {
        nextSelectedModel = found;
        break;
      }
    }

    // If no preferred model found, use first available vision model
    if (!uniqueVisionModels.includes(nextSelectedModel) && uniqueVisionModels.length > 0) {
      nextSelectedModel = uniqueVisionModels[0];
    }

    setSelectedModel(nextSelectedModel);
  };

  /**
   * Fetch medications/background context from the EMR (if available)
   */
  const fetchClinicalContext = useCallback(async (): Promise<BPClinicalContext> => {
    const context: BPClinicalContext = {};

    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return context;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_ACTION',
        action: 'extract-patient-data',
        data: {}
      });

      if (!response?.success || !response?.data) {
        return context;
      }

      const data = response.data as Record<string, unknown>;
      const medicationSources = [
        data.medications,
        data.medications_emr,
        data.currentMedications,
        data.meds_snapshot
      ].filter(Boolean);

      const normaliseMedicationEntry = (entry: unknown): string => {
        if (!entry) return '';
        if (typeof entry === 'string') {
          return entry.trim();
        }
        if (Array.isArray(entry)) {
          return entry
            .map(normaliseMedicationEntry)
            .filter(Boolean)
            .join('\n');
        }
        if (typeof entry === 'object') {
          const med = entry as Record<string, unknown>;
          const parts = ['name', 'dose', 'frequency', 'route', 'indication']
            .map(key => (typeof med[key] === 'string' ? (med[key] as string).trim() : ''))
            .filter(Boolean);
          return parts.join(' ').trim();
        }
        return String(entry);
      };

      for (const source of medicationSources) {
        const candidate = normaliseMedicationEntry(source);
        if (candidate.trim().length > 0) {
          context.medicationsText = candidate.trim();
          break;
        }
      }

      const backgroundCandidates: unknown[] = [
        data.background,
        data.problemList,
        data.problems,
        data.history,
        data.medicalHistory
      ].filter(Boolean);

      const normaliseBackground = (entry: unknown): string => {
        if (!entry) return '';
        if (typeof entry === 'string') {
          return entry.trim();
        }
        if (Array.isArray(entry)) {
          return entry
            .map(normaliseBackground)
            .filter(Boolean)
            .join('\n');
        }
        if (typeof entry === 'object') {
          try {
            return JSON.stringify(entry);
          } catch {
            return '';
          }
        }
        return String(entry);
      };

      for (const source of backgroundCandidates) {
        const candidate = normaliseBackground(source);
        if (candidate.trim().length > 0) {
          context.backgroundText = candidate.trim();
          break;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch clinical context for BP diary insights', error);
    }

    return context;
  }, []);

  /**
   * Run stage-two clinical reasoning using MedGemma
   */
  const runClinicalInsights = useCallback(async (bpReadings: BPReading[], contextOverride?: BPClinicalContext) => {
    if (bpReadings.length === 0) {
      setInsights(null);
      setInsightsError(null);
      setInsightsLoading(false);
      return;
    }

    const runId = ++insightsRequestIdRef.current;
    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const context = contextOverride ?? await fetchClinicalContext();
      if (insightsRequestIdRef.current !== runId) {
        return;
      }

      setClinicalContext(context);

      const extractor = extractorRef.current;
      const reasoningModel = extractor.getDefaultClinicalModel();

      const result = await extractor.generateClinicalInsights(bpReadings, {
        medicationsText: context.medicationsText,
        backgroundText: context.backgroundText
      });

      if (insightsRequestIdRef.current !== runId) {
        return;
      }

      setInsights(result);
      setModelsUsed(prev => ({
        extraction: prev.extraction,
        reasoning: reasoningModel
      }));
    } catch (error) {
      if (insightsRequestIdRef.current !== runId) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to generate clinical insights';
      setInsights(null);
      setInsightsError(message);
      ToastService.getInstance().warning('Clinical insights unavailable', message);
    } finally {
      if (insightsRequestIdRef.current === runId) {
        setInsightsLoading(false);
      }
    }
  }, [fetchClinicalContext]);

  /**
   * Handle image selection and start extraction
   */
  const handleImageSelect = useCallback(async (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setProcessingState('extracting');
    setErrorMessage('');
    setInsights(null);
    setInsightsError(null);
    setClinicalContext(null);

    try {
      const extractor = extractorRef.current;
      const defaultClinicalModel = extractor.getDefaultClinicalModel();
      const extractionModelUsed = selectedModel || extractor.getDefaultOCRModel();

      const result = await extractor.extractFromImage(dataUrl, undefined, selectedModel);

      if (!result.success || result.readings.length === 0) {
        setProcessingState('error');
        setErrorMessage(result.error || 'No readings could be extracted from the image');
        ToastService.getInstance().error(
          'Extraction failed',
          'Could not extract BP readings from the image'
        );
        return;
      }

      // Validate and sort readings
      setProcessingState('validating');
      const validated = validatorRef.current.validateAndSort(result.readings);

      setReadings(validated);
      setModelsUsed({
        extraction: extractionModelUsed,
        reasoning: defaultClinicalModel
      });
      setProcessingState('ready');

      ToastService.getInstance().success(
        'Extraction complete',
        `Found ${validated.length} BP reading${validated.length !== 1 ? 's' : ''}`
      );
      void runClinicalInsights(validated);

    } catch (error) {
      setProcessingState('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      ToastService.getInstance().error('Processing failed', message);
    }
  }, [runClinicalInsights, selectedModel]);

  /**
   * Handle readings edit from grid
   */
  const handleReadingsChange = useCallback((updatedReadings: BPReading[]) => {
    // Re-validate after edit
    const revalidated = validatorRef.current.validateAndSort(updatedReadings);
    setReadings(revalidated);
  }, []);

  /**
   * Retry MedGemma insights generation with the current readings
   */
  const handleRetryInsights = useCallback(() => {
    if (readings.length === 0) return;
    void runClinicalInsights(readings);
  }, [runClinicalInsights, readings]);

  /**
   * Clear and start over
   */
  const handleClear = useCallback(() => {
    const extractor = extractorRef.current;
    setImageDataUrl(null);
    setReadings([]);
    setInsights(null);
    setInsightsError(null);
    setInsightsLoading(false);
    setClinicalContext(null);
    setModelsUsed({
      extraction: extractor.getDefaultOCRModel(),
      reasoning: extractor.getDefaultClinicalModel()
    });
    setSelectedModel(extractor.getDefaultOCRModel());
    setProcessingState('idle');
    setErrorMessage('');
  }, []);

  /**
   * Accept all and save
   */
  const handleAcceptAll = useCallback(async () => {
    if (readings.length === 0) return;

    try {
      const extractor = extractorRef.current;
      const session: BPDiarySession = {
        id: `bp-session-${Date.now()}`,
        timestamp: Date.now(),
        imageDataUrl: imageDataUrl || '',
        readings,
        settings,
        insights: insights ?? null,
        modelsUsed: {
          extraction: modelsUsed.extraction || extractor.getDefaultOCRModel(),
          reasoning: modelsUsed.reasoning || extractor.getDefaultClinicalModel()
        }
      };

      if (clinicalContext && (clinicalContext.medicationsText || clinicalContext.backgroundText)) {
        session.clinicalContext = clinicalContext;
      }

      await storageRef.current.saveSession(session);
      await storageRef.current.saveSettings(settings);

      ToastService.getInstance().success(
        'Saved',
        'BP diary session saved successfully'
      );

    } catch (error) {
      ToastService.getInstance().error(
        'Save failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }, [clinicalContext, imageDataUrl, insights, modelsUsed, readings, settings]);

  /**
   * Load last session
   */
  const handleLoadLast = useCallback(async () => {
    const session = await storageRef.current.loadLatestSession();

    if (!session) {
      ToastService.getInstance().info('No saved session', 'No previous BP diary found');
      return;
    }

    setImageDataUrl(session.imageDataUrl);
    setReadings(session.readings);
    setSettings(session.settings);
    setInsights(session.insights ?? null);
    setClinicalContext(session.clinicalContext ?? null);
    setInsightsLoading(false);
    setInsightsError(null);
    setModelsUsed({
      extraction: session.modelsUsed?.extraction || extractorRef.current.getDefaultOCRModel(),
      reasoning: session.modelsUsed?.reasoning || extractorRef.current.getDefaultClinicalModel()
    });
    if (session.modelsUsed?.extraction) {
      setSelectedModel(session.modelsUsed.extraction);
    }
    setProcessingState('ready');
    setShowLoadConfirm(false);

    ToastService.getInstance().success('Loaded', 'Previous BP diary loaded');
  }, []);

  /**
   * Export as JSON
   */
  const handleExportJSON = useCallback(() => {
    const stats = validatorRef.current.getStatistics(readings, settings.sbpControlTarget);
    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      readingsCount: readings.length,
      statistics: stats,
      settings: {
        sbpControlTarget: settings.sbpControlTarget,
        sbpControlGoal: settings.sbpControlGoal,
        referenceSBP: settings.referenceSBP,
        referenceDBP: settings.referenceDBP
      },
      readings: readings.map(r => ({
        date: r.date,
        time: r.time,
        sbp: r.sbp,
        dbp: r.dbp,
        hr: r.hr
      })),
      insights,
      modelsUsed
    };

    if (clinicalContext && (clinicalContext.medicationsText || clinicalContext.backgroundText)) {
      exportData.clinicalContext = clinicalContext;
    }

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bp-diary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ToastService.getInstance().success('Exported', 'BP diary exported as JSON');
  }, [clinicalContext, insights, modelsUsed, readings, settings]);

  /**
   * Export as CSV
   */
  const handleExportCSV = useCallback(() => {
    const rows: string[] = [];

    // Header
    rows.push('Date,Time,SBP (mmHg),DBP (mmHg),HR (bpm)');

    // Data rows
    readings.forEach(r => {
      rows.push(`${r.date},${r.time},${r.sbp},${r.dbp},${r.hr}`);
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bp-diary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    ToastService.getInstance().success('Exported', 'BP diary exported as CSV');
  }, [readings]);

  /**
   * Copy chart to clipboard
   */
  const handleCopyChart = useCallback(async () => {
    if (chartRef.current) {
      await chartRef.current.copyToClipboard();
    }
  }, []);

  /**
   * Toggle reference lines
   */
  const handleToggleReferenceLines = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      showReferenceLines: !prev.showReferenceLines
    }));
  }, []);

  if (!isOpen) return null;

  const defaultOCRModel = extractorRef.current.getDefaultOCRModel();
  const defaultClinicalModel = extractorRef.current.getDefaultClinicalModel();
  const displayedReasoningModel = modelsUsed.reasoning || defaultClinicalModel;

  const stats = readings.length > 0 ? validatorRef.current.getStatistics(readings, settings.sbpControlTarget) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">BP Diary Importer</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a photo of your BP diary for automatic extraction, then review, edit, add, or delete readings
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Image Upload Section */}
          {processingState === 'idle' && (
            <div className="space-y-4">
              {/* Model Selector */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-700" />
                    <h3 className="text-sm font-semibold text-blue-900">Vision Model</h3>
                  </div>
                  {!showModelPicker && (
                    <button
                      onClick={() => setShowModelPicker(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Change
                    </button>
                  )}
                </div>

                {showModelPicker ? (
                  <div className="space-y-2">
                    {availableModels.length > 0 ? (
                      <>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-600">
                          ✓ Showing only vision-capable models (LLaVA, Gemma, Qwen2-VL, etc.)
                        </p>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-xs text-yellow-800 font-semibold mb-1">⚠️ No vision models detected</p>
                        <p className="text-xs text-gray-600">
                          Load a vision model in LM Studio (e.g., LLaVA, Gemma-3n, Qwen2-VL)
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => setShowModelPicker(false)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    Using: <span className="font-mono font-semibold text-blue-700">{selectedModel}</span>
                  </div>
                )}
              </div>

              <BPDropzone
                onImageSelect={handleImageSelect}
                currentImage={imageDataUrl}
                onClearImage={handleClear}
              />

              {/* Load Last Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowLoadConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Load Last Session
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {(processingState === 'extracting' || processingState === 'validating') && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-700 font-medium">
                {processingState === 'extracting' ? 'Extracting readings from image...' : 'Validating data...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This typically takes 10-30 seconds
              </p>
            </div>
          )}

          {/* Error State */}
          {processingState === 'error' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-yellow-800 font-semibold mb-2 text-center">⚠️ Vision/OCR Not Yet Supported</div>
              <p className="text-sm text-gray-700 mb-4 text-center">{errorMessage}</p>

              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-sm">
                <div className="font-semibold text-gray-800 mb-2">Workaround Options:</div>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>Use the sample data button below to test the chart and editing features</li>
                  <li>Manually enter your BP readings by editing the sample data</li>
                  <li>To enable OCR: install Tesseract.js (<code className="bg-gray-100 px-1 rounded text-xs">npm install tesseract.js</code>)</li>
                </ol>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Clear & Start Over
                </button>
                <button
                  onClick={() => {
                    // Add 12 sample readings for comprehensive testing with timestamps
                    const sampleReadings: BPReading[] = [
                      { id: '1', date: '2025-09-09', time: '07:15', timeOfDay: 'morning', sbp: 144, dbp: 85, hr: 58, warnings: [] },
                      { id: '2', date: '2025-09-10', time: '06:44', timeOfDay: 'morning', sbp: 137, dbp: 85, hr: 60, warnings: [] },
                      { id: '3', date: '2025-09-11', time: '08:24', timeOfDay: 'morning', sbp: 146, dbp: 81, hr: 64, warnings: [] },
                      { id: '4', date: '2025-09-12', time: '07:02', timeOfDay: 'morning', sbp: 123, dbp: 87, hr: 80, warnings: [] },
                      { id: '5', date: '2025-09-15', time: '06:55', timeOfDay: 'morning', sbp: 140, dbp: 87, hr: 62, warnings: [] },
                      { id: '6', date: '2025-09-16', time: '19:21', timeOfDay: 'evening', sbp: 136, dbp: 88, hr: 61, warnings: [] },
                      { id: '7', date: '2025-09-17', time: '07:33', timeOfDay: 'morning', sbp: 140, dbp: 85, hr: 59, warnings: [] },
                      { id: '8', date: '2025-09-24', time: '18:45', timeOfDay: 'evening', sbp: 144, dbp: 87, hr: 61, warnings: [] },
                      { id: '9', date: '2025-09-25', time: '06:12', timeOfDay: 'morning', sbp: 140, dbp: 84, hr: 65, warnings: [] },
                      { id: '10', date: '2025-09-26', time: '20:18', timeOfDay: 'evening', sbp: 140, dbp: 81, hr: 59, warnings: [] },
                      { id: '11', date: '2025-09-28', time: '07:41', timeOfDay: 'morning', sbp: 143, dbp: 87, hr: 60, warnings: [] },
                      { id: '12', date: '2025-09-29', time: '19:05', timeOfDay: 'evening', sbp: 145, dbp: 88, hr: 55, warnings: [] },
                    ];
                    setReadings(sampleReadings);
                    setProcessingState('ready');
                    ToastService.getInstance().info('Sample data loaded', '12 readings - test UI layout');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Load Sample Data (12 readings)
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {processingState === 'ready' && readings.length > 0 && (
            <div className="space-y-6">
              {/* Clinical Insights */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-700" />
                  <h3 className="text-lg font-semibold text-blue-900">Clinical Insights</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-800">
                  <span>
                    Models:&nbsp;
                    <span className="font-mono">
                      {modelsUsed.extraction || defaultOCRModel} → {displayedReasoningModel}
                    </span>
                  </span>
                  {insightsLoading && <span className="text-blue-600">MedGemma-27B running…</span>}
                  {!insightsLoading && insights && (
                    <span className="text-blue-600">MedGemma insights ready</span>
                  )}
                </div>

                {clinicalContext && (clinicalContext.medicationsText || clinicalContext.backgroundText) && (
                  <div className="bg-white/70 border border-blue-100 rounded-lg p-3 space-y-2">
                    {clinicalContext.medicationsText && (
                      <div>
                        <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">Medications</div>
                        <div className="text-xs text-gray-700 whitespace-pre-line">
                          {clinicalContext.medicationsText}
                        </div>
                      </div>
                    )}
                    {clinicalContext.backgroundText && (
                      <div>
                        <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">Background</div>
                        <div className="text-xs text-gray-700 whitespace-pre-line">
                          {clinicalContext.backgroundText}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {insightsLoading && (
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3 border border-blue-100">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <div className="text-sm text-gray-700">
                      Generating clinician and patient insights…
                    </div>
                  </div>
                )}

                {!insightsLoading && insightsError && (
                  <div className="bg-white border border-yellow-200 rounded-lg p-4 space-y-3">
                    <div className="text-sm text-yellow-800">
                      {insightsError}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRetryInsights}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Retry insights
                      </button>
                      <span className="text-xs text-gray-500">
                        Readings remain available for review.
                      </span>
                    </div>
                  </div>
                )}

                {!insightsLoading && !insightsError && insights && (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Control Summary</div>
                        <div className="text-sm text-gray-900">{insights.controlSummary}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Diurnal Pattern</div>
                        <div className="text-sm text-gray-900">{insights.diurnalPattern}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Variability</div>
                        <div className="text-sm text-gray-900">{insights.variabilityConcern}</div>
                      </div>
                      {insights.medicationRationale && (
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Medication Rationale</div>
                          <div className="text-sm text-gray-900">{insights.medicationRationale}</div>
                        </div>
                      )}
                    </div>

                    {(insights.peakTimes || insights.lowestTimes || insights.abpmSuggestion) && (
                      <div className="grid gap-3 md:grid-cols-3">
                        {insights.peakTimes && (
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-semibold text-gray-600 mb-1">Peak Times</div>
                            <div className="text-sm text-gray-900">{insights.peakTimes}</div>
                          </div>
                        )}
                        {insights.lowestTimes && (
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-semibold text-gray-600 mb-1">Best Control</div>
                            <div className="text-sm text-gray-900">{insights.lowestTimes}</div>
                          </div>
                        )}
                        {insights.abpmSuggestion && (
                          <div className="bg-white rounded-lg p-3 md:col-span-1">
                            <div className="text-xs font-semibold text-gray-600 mb-1">Next Clinical Step</div>
                            <div className="text-sm text-gray-900">{insights.abpmSuggestion}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Key Recommendations</div>
                      <ul className="space-y-1.5">
                        {insights.keyRecommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-900">
                            <span className="text-blue-600 font-semibold mt-0.5">{idx + 1}.</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {insights.patientParagraph && (
                      <div className="bg-white border border-blue-100 rounded-lg p-4">
                        <div className="text-xs font-semibold text-blue-900 mb-1">Patient-Facing Summary</div>
                        <div className="text-sm text-gray-900 whitespace-pre-line">
                          {insights.patientParagraph}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!insightsLoading && !insightsError && !insights && (
                  <div className="bg-white rounded-lg p-4 border border-dashed border-blue-200 text-sm text-gray-600">
                    Clinical insights will appear here once MedGemma finishes processing.
                  </div>
                )}
              </div>

              {/* Statistics Summary */}
              {stats && (
                <div className="space-y-1.5">
                  {/* Row 1: Averages */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-between h-16">
                      <div className="text-[10px] text-gray-600 leading-tight">Average SBP</div>
                      <div className="text-xl font-bold text-gray-900 leading-none">{stats.avgSBP}</div>
                      <div className="text-[9px] text-gray-500 leading-tight">mmHg</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-between h-16">
                      <div className="text-[10px] text-gray-600 leading-tight">Average DBP</div>
                      <div className="text-xl font-bold text-gray-900 leading-none">{stats.avgDBP}</div>
                      <div className="text-[9px] text-gray-500 leading-tight">mmHg</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-between h-16">
                      <div className="text-[10px] text-gray-600 leading-tight">Average HR</div>
                      <div className="text-xl font-bold text-gray-900 leading-none">{stats.avgHR}</div>
                      <div className="text-[9px] text-gray-500 leading-tight">bpm</div>
                    </div>
                  </div>

                  {/* Row 2: Control Metrics */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-between h-16">
                      <div className="text-[10px] text-gray-600 leading-tight">Above Target</div>
                      <div className="text-xl font-bold text-gray-900 leading-none">{stats.percentAboveTarget}%</div>
                      <div className="text-[9px] text-gray-500 leading-tight">&gt;135/85 mmHg</div>
                    </div>
                    <div className={`rounded-lg p-2 flex flex-col justify-between h-16 ${
                      stats.percentSBPBelowTarget >= settings.sbpControlGoal
                        ? 'bg-green-50 border border-green-200'
                        : stats.percentSBPBelowTarget >= (settings.sbpControlGoal - 10)
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="text-[10px] text-gray-600 leading-tight">SBP Control</div>
                      <div className={`text-xl font-bold leading-none ${
                        stats.percentSBPBelowTarget >= settings.sbpControlGoal
                          ? 'text-green-700'
                          : stats.percentSBPBelowTarget >= (settings.sbpControlGoal - 10)
                          ? 'text-yellow-700'
                          : 'text-gray-900'
                      }`}>
                        {stats.percentSBPBelowTarget}%
                      </div>
                      <div className="text-[9px] text-gray-500 leading-tight">&lt;{settings.sbpControlTarget} mmHg (goal {settings.sbpControlGoal}%)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Review & Edit Readings</h3>
                  {readings.length < 15 && (
                    <p className="text-xs text-gray-500">
                      Tip: Use "Add New Reading" button below to manually add any missed readings
                    </p>
                  )}
                </div>
                <BPReviewGrid
                  readings={readings}
                  onReadingsChange={handleReadingsChange}
                  editable={true}
                />
              </div>

              {/* Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Trend Chart</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <BPChart
                    ref={chartRef}
                    readings={readings}
                    showReferenceLines={settings.showReferenceLines}
                    referenceSBP={settings.referenceSBP}
                    referenceDBP={settings.referenceDBP}
                  />
                </div>
                {/* Guidelines toggle - minimal, below chart */}
                <div className="flex justify-center mt-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showReferenceLines}
                      onChange={handleToggleReferenceLines}
                      className="rounded border-gray-300 w-3 h-3"
                    />
                    Show guidelines (130/80)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Load Confirmation Modal */}
          {showLoadConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-30 z-60 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Load Last Session?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will replace your current work with the last saved BP diary session.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLoadConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLoadLast}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {processingState === 'ready' && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-xs">Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {processingState === 'ready' && readings.length > 0 && (
              <>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span className="text-xs">Export JSON</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs">Export CSV</span>
                </button>

                <button
                  onClick={handleCopyChart}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="text-xs">Copy Chart</span>
                </button>

                <button
                  onClick={handleAcceptAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Accept & Save</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
