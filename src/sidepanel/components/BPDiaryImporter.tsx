/**
 * BP Diary Importer - Main Component
 *
 * Orchestrates the complete BP diary import workflow:
 * 1. Image upload (dropzone)
 * 2. Extraction via Gemma-3n-e4b
 * 3. Validation and review (editable grid)
 * 4. Visualization (interactive chart)
 * 5. Export (JSON/CSV) and clipboard copy
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, FileJson, FileText, Clipboard, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { BPDropzone } from './BPDropzone';
import { BPReviewGrid } from './BPReviewGrid';
import { BPChart, BPChartHandle } from './BPChart';
import { BPDiaryExtractor } from '@/services/BPDiaryExtractor';
import { BPDataValidator } from '@/utils/BPDataValidator';
import { BPDiaryStorage } from '@/services/BPDiaryStorage';
import type { BPReading, BPDiarySession, BPDiarySettings } from '@/types/BPTypes';
import { DEFAULT_BP_SETTINGS } from '@/types/BPTypes';
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

  const chartRef = useRef<BPChartHandle>(null);
  const extractorRef = useRef(BPDiaryExtractor.getInstance());
  const validatorRef = useRef(BPDataValidator.getInstance());
  const storageRef = useRef(BPDiaryStorage.getInstance());

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loaded = await storageRef.current.loadSettings();
    setSettings(loaded);
  };

  /**
   * Handle image selection and start extraction
   */
  const handleImageSelect = useCallback(async (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setProcessingState('extracting');
    setErrorMessage('');

    try {
      const result = await extractorRef.current.extractFromImage(dataUrl);

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
      setProcessingState('ready');

      ToastService.getInstance().success(
        'Extraction complete',
        `Found ${validated.length} BP reading${validated.length !== 1 ? 's' : ''}`
      );

    } catch (error) {
      setProcessingState('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      ToastService.getInstance().error('Processing failed', message);
    }
  }, []);

  /**
   * Handle readings edit from grid
   */
  const handleReadingsChange = useCallback((updatedReadings: BPReading[]) => {
    // Re-validate after edit
    const revalidated = validatorRef.current.validateAndSort(updatedReadings);
    setReadings(revalidated);
  }, []);

  /**
   * Clear and start over
   */
  const handleClear = useCallback(() => {
    setImageDataUrl(null);
    setReadings([]);
    setProcessingState('idle');
    setErrorMessage('');
  }, []);

  /**
   * Accept all and save
   */
  const handleAcceptAll = useCallback(async () => {
    if (readings.length === 0) return;

    try {
      const session: BPDiarySession = {
        id: `bp-session-${Date.now()}`,
        timestamp: Date.now(),
        imageDataUrl: imageDataUrl || '',
        readings,
        settings
      };

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
  }, [readings, imageDataUrl, settings]);

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
    setProcessingState('ready');
    setShowLoadConfirm(false);

    ToastService.getInstance().success('Loaded', 'Previous BP diary loaded');
  }, []);

  /**
   * Export as JSON
   */
  const handleExportJSON = useCallback(() => {
    const stats = validatorRef.current.getStatistics(readings, settings.sbpControlTarget);
    const exportData = {
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
        timeOfDay: r.timeOfDay,
        sbp: r.sbp,
        dbp: r.dbp,
        hr: r.hr
      }))
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bp-diary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ToastService.getInstance().success('Exported', 'BP diary exported as JSON');
  }, [readings, settings]);

  /**
   * Export as CSV
   */
  const handleExportCSV = useCallback(() => {
    const rows: string[] = [];

    // Header
    rows.push('Date,Time,SBP (mmHg),DBP (mmHg),HR (bpm)');

    // Data rows
    readings.forEach(r => {
      rows.push(`${r.date},${r.timeOfDay},${r.sbp},${r.dbp},${r.hr}`);
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

  const stats = readings.length > 0 ? validatorRef.current.getStatistics(readings, settings.sbpControlTarget) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">BP Diary Importer</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a photo of your blood pressure diary for analysis
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
                    // Add 12 sample readings for comprehensive testing
                    const sampleReadings: BPReading[] = [
                      { id: '1', date: '2025-09-09', timeOfDay: 'morning', sbp: 144, dbp: 85, hr: 58, warnings: [] },
                      { id: '2', date: '2025-09-10', timeOfDay: 'morning', sbp: 137, dbp: 85, hr: 60, warnings: [] },
                      { id: '3', date: '2025-09-11', timeOfDay: 'morning', sbp: 146, dbp: 81, hr: 64, warnings: [] },
                      { id: '4', date: '2025-09-12', timeOfDay: 'morning', sbp: 123, dbp: 87, hr: 80, warnings: [] },
                      { id: '5', date: '2025-09-15', timeOfDay: 'morning', sbp: 140, dbp: 87, hr: 62, warnings: [] },
                      { id: '6', date: '2025-09-16', timeOfDay: 'morning', sbp: 136, dbp: 88, hr: 61, warnings: [] },
                      { id: '7', date: '2025-09-17', timeOfDay: 'morning', sbp: 140, dbp: 85, hr: 59, warnings: [] },
                      { id: '8', date: '2025-09-24', timeOfDay: 'morning', sbp: 144, dbp: 87, hr: 61, warnings: [] },
                      { id: '9', date: '2025-09-25', timeOfDay: 'morning', sbp: 140, dbp: 84, hr: 65, warnings: [] },
                      { id: '10', date: '2025-09-26', timeOfDay: 'morning', sbp: 140, dbp: 81, hr: 59, warnings: [] },
                      { id: '11', date: '2025-09-28', timeOfDay: 'morning', sbp: 143, dbp: 87, hr: 60, warnings: [] },
                      { id: '12', date: '2025-09-29', timeOfDay: 'morning', sbp: 145, dbp: 88, hr: 55, warnings: [] },
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
              {/* Statistics Summary */}
              {stats && (
                <div className="grid grid-cols-5 gap-1.5">
                  <div className="bg-gray-50 rounded-lg p-1.5 flex flex-col justify-between h-16">
                    <div className="text-[9px] text-gray-600 leading-tight h-7 flex items-start">Average SBP</div>
                    <div className="text-lg font-bold text-gray-900 leading-none h-8 flex items-center">{stats.avgSBP}</div>
                    <div className="text-[8px] text-gray-500 leading-tight h-4 flex items-end">mmHg</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-1.5 flex flex-col justify-between h-16">
                    <div className="text-[9px] text-gray-600 leading-tight h-7 flex items-start">Average DBP</div>
                    <div className="text-lg font-bold text-gray-900 leading-none h-8 flex items-center">{stats.avgDBP}</div>
                    <div className="text-[8px] text-gray-500 leading-tight h-4 flex items-end">mmHg</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-1.5 flex flex-col justify-between h-16">
                    <div className="text-[9px] text-gray-600 leading-tight h-7 flex items-start">Average HR</div>
                    <div className="text-lg font-bold text-gray-900 leading-none h-8 flex items-center">{stats.avgHR}</div>
                    <div className="text-[8px] text-gray-500 leading-tight h-4 flex items-end">bpm</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-1.5 flex flex-col justify-between h-16">
                    <div className="text-[9px] text-gray-600 leading-tight h-7 flex items-start whitespace-nowrap">Above Target</div>
                    <div className="text-lg font-bold text-gray-900 leading-none h-8 flex items-center">{stats.percentAboveTarget}%</div>
                    <div className="text-[8px] text-gray-500 leading-tight h-4 flex items-end">&gt;135/85</div>
                  </div>
                  <div className={`rounded-lg p-1.5 flex flex-col justify-between h-16 ${
                    stats.percentSBPBelowTarget >= settings.sbpControlGoal
                      ? 'bg-green-50 border border-green-200'
                      : stats.percentSBPBelowTarget >= (settings.sbpControlGoal - 10)
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="text-[9px] text-gray-600 leading-tight h-7 flex items-start whitespace-nowrap">SBP Control</div>
                    <div className={`text-lg font-bold leading-none h-8 flex items-center ${
                      stats.percentSBPBelowTarget >= settings.sbpControlGoal
                        ? 'text-green-700'
                        : stats.percentSBPBelowTarget >= (settings.sbpControlGoal - 10)
                        ? 'text-yellow-700'
                        : 'text-gray-900'
                    }`}>
                      {stats.percentSBPBelowTarget}%
                    </div>
                    <div className="text-[8px] text-gray-500 leading-[1.1] h-4 flex items-end">&lt;{settings.sbpControlTarget} (goal&nbsp;{settings.sbpControlGoal}%)</div>
                  </div>
                </div>
              )}

              {/* Review Grid */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Review Readings</h3>
                <BPReviewGrid
                  readings={readings}
                  onReadingsChange={handleReadingsChange}
                  editable={true}
                />
              </div>

              {/* Chart */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Trend Chart</h3>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showReferenceLines}
                      onChange={handleToggleReferenceLines}
                      className="rounded border-gray-300"
                    />
                    Show guidelines (130/80)
                  </label>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <BPChart
                    ref={chartRef}
                    readings={readings}
                    showReferenceLines={settings.showReferenceLines}
                    referenceSBP={settings.referenceSBP}
                    referenceDBP={settings.referenceDBP}
                  />
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
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center gap-2">
            {processingState === 'ready' && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {processingState === 'ready' && readings.length > 0 && (
              <>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileJson className="w-4 h-4" />
                  <span className="text-sm">Export JSON</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Export CSV</span>
                </button>

                <button
                  onClick={handleCopyChart}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Clipboard className="w-4 h-4" />
                  <span className="text-sm">Copy Chart</span>
                </button>

                <button
                  onClick={handleAcceptAll}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Accept & Save</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};