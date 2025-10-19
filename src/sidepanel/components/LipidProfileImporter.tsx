import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Upload, RefreshCw, Clipboard, Edit3, Edit, Info } from 'lucide-react';
import { parseLipidProfile, buildLipidMetadata } from '@/utils/LipidParser';
import { buildLipidInsightsContext, buildLipidInsightsSummary } from '@/utils/LipidInsights';
import { LIPID_OVERLAY_FRAMEWORKS, DEFAULT_LIPID_FRAMEWORK_ID } from '@/config/lipidOverlays';
import type {
  LipidChartSettings,
  LipidInsightsSummary,
  LipidOverlayConfig,
  LipidResult,
  LipidSeriesMetadata,
  LipidProfileSession,
  LipidAnalyte
} from '@/types/LipidTypes';
import { LipidProfileStorage, DEFAULT_LIPID_SETTINGS } from '@/services/LipidProfileStorage';
import { LipidTrendChart } from './lipid/LipidTrendChart';
import { LipidControlsPanel } from './lipid/LipidControlsPanel';
import { LipidResultsTable } from './lipid/LipidResultsTable';
import { LipidInsightsPanel } from './lipid/LipidInsightsPanel';
import { ToastService } from '@/services/ToastService';
import { PerformanceMonitoringService } from '@/services/PerformanceMonitoringService';

type ProcessingState = 'idle' | 'capturing' | 'ready' | 'error';

interface CaptureResponse {
  success: boolean;
  data?: string;
  error?: string;
}

interface LipidProfileImporterProps {
  isOpen: boolean;
  onClose: () => void;
}

const performanceMonitor = PerformanceMonitoringService.getInstance();

function applyTimeFilter(readings: LipidResult[], filter: LipidChartSettings['timeFilter']): LipidResult[] {
  if (filter === 'all' || readings.length === 0) return readings;

  const months = filter === '3m' ? 3 : filter === '6m' ? 6 : 12;

  const latestDate = new Date(readings.at(-1)!.date);
  const windowStart = new Date(latestDate);
  windowStart.setMonth(windowStart.getMonth() - months);

  return readings.filter(r => new Date(r.date) >= windowStart);
}

function resolveOverlay(settings: LipidChartSettings): LipidOverlayConfig {
  const base = LIPID_OVERLAY_FRAMEWORKS[settings.framework] ?? LIPID_OVERLAY_FRAMEWORKS[DEFAULT_LIPID_FRAMEWORK_ID];
  const customTarget = settings.customPrimaryTarget;
  if (!base.allowCustomPrimaryTarget || customTarget == null) {
    return {
      ...base,
      bands: base.bands.map(band => ({ ...band }))
    };
  }
  return {
    ...base,
    bands: base.bands.map(band =>
      band.id === 'primary-custom'
        ? { ...band, threshold: customTarget }
        : { ...band }
    )
  };
}

export const LipidProfileImporter: React.FC<LipidProfileImporterProps> = ({
  isOpen,
  onClose
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [rawSourceText, setRawSourceText] = useState('');
  const [readings, setReadings] = useState<LipidResult[]>([]);
  const [metadata, setMetadata] = useState<LipidSeriesMetadata>({ therapyPhases: [] });
  const [settings, setSettings] = useState<LipidChartSettings>(DEFAULT_LIPID_SETTINGS);
  const [insights, setInsights] = useState<LipidInsightsSummary | null>(null);
  const [capturedAt, setCapturedAt] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<'emr' | 'paste'>('emr');
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const storageRef = useRef(LipidProfileStorage.getInstance());

  useEffect(() => {
    (async () => {
      const storedSettings = await storageRef.current.loadSettings();
      setSettings(prev => ({ ...prev, ...storedSettings }));
    })();
  }, []);

  useEffect(() => {
    storageRef.current.saveSettings(settings).catch(() => {});
  }, [settings]);

  useEffect(() => {
    if (readings.length === 0) {
      setInsights(null);
      setWarnings([]);
      return;
    }

    const overlay = resolveOverlay(settings);
    const selectedBandId = overlay.bands.some(b => b.id === settings.selectedBandId)
      ? settings.selectedBandId
      : overlay.bands[0].id;

    const filtered = applyTimeFilter(readings, settings.timeFilter);
    const context = buildLipidInsightsContext(filtered, metadata, overlay, selectedBandId, settings.timeFilter, rawSourceText);
    const summary = buildLipidInsightsSummary(context, overlay);
    setInsights(summary);
  }, [readings, metadata, settings, rawSourceText]);

  const availableAnalytes = useMemo(() => {
    const analytes: Set<LipidAnalyte> = new Set();
    readings.forEach(reading => {
      (['ldl', 'tchol', 'hdl', 'tg', 'apob', 'nonHDL'] as LipidAnalyte[]).forEach(analyte => {
        if (reading[analyte] != null) {
          analytes.add(analyte);
        }
      });
    });
    const baseline: LipidAnalyte[] = ['ldl', 'tchol', 'hdl', 'nonHDL', 'tg', 'apob'];
    return baseline.filter(analyte => analytes.has(analyte));
  }, [readings]);

  const fallbackAnalytes: LipidAnalyte[] = ['ldl', 'tchol', 'hdl', 'nonHDL'];
  const analyteOptions = availableAnalytes.length > 0 ? availableAnalytes : fallbackAnalytes;

  const overlayConfig = useMemo(() => resolveOverlay(settings), [settings]);

  const filteredReadings = useMemo(
    () => applyTimeFilter(readings, settings.timeFilter),
    [readings, settings.timeFilter]
  );

  const handleCaptureFromEMR = useCallback(async () => {
    setProcessingState('capturing');
    performanceMonitor.recordMetrics('agent-processing', 0, { agentType: 'lipid-profile-import' });

    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'EXECUTE_ACTION',
        action: 'investigation-summary',
        data: { extractOnly: true }
      }) as CaptureResponse);

      if (!response?.success) {
        throw new Error(response?.error || 'Capture failed');
      }

      if (!response.data || response.data.trim().length === 0) {
        setProcessingState('error');
        setShowPasteFallback(true);
        ToastService.getInstance().warning(
          'No Investigation Summary content',
          'Click “Paste text” to provide the lipid results manually.'
        );
        return;
      }

      const start = performance.now();
      const parsed = parseLipidProfile(response.data);
      const duration = performance.now() - start;
      performanceMonitor.recordMetrics('agent-processing', duration, { agentType: 'lipid-profile-import' });

      if (parsed.readings.length === 0) {
        setProcessingState('error');
        setWarnings(parsed.warnings);
        ToastService.getInstance().warning('No lipid results found', 'Review the capture or paste text manually.');
        return;
      }

      setRawSourceText(response.data);
      setReadings(parsed.readings);
      setMetadata(parsed.metadata);
      setWarnings(parsed.warnings);
      setCapturedAt(Date.now());
      setProcessingState('ready');
      setSourceType('emr');
      setShowPasteFallback(false);
      setShowRawEditor(false);

      const session: LipidProfileSession = {
        id: `lipid-${Date.now()}`,
        capturedAt: Date.now(),
        source: 'emr',
        sourceRawText: response.data,
        readings: parsed.readings,
        settings,
        metadata: parsed.metadata
      };
      storageRef.current.saveSession(session).catch(() => {});

      ToastService.getInstance().success('Captured Investigation Summary', `Parsed ${parsed.readings.length} lipid results.`);
    } catch (error) {
      console.error('Lipid capture failed:', error);
      setProcessingState('error');
      setWarnings([error instanceof Error ? error.message : 'Unknown capture error']);
      ToastService.getInstance().error('EMR capture failed', 'Use “Paste text” to continue manually.');
      setShowPasteFallback(true);
    }
  }, [settings]);

  const parseFromText = useCallback((text: string, source: 'emr' | 'paste') => {
    const parsed = parseLipidProfile(text);
    if (parsed.readings.length === 0) {
      setWarnings(parsed.warnings.length > 0 ? parsed.warnings : ['No lipid results recognised.']);
      ToastService.getInstance().warning('Unable to parse lipid results', 'Check the formatting or include Bloods (DATE) lines.');
      setReadings([]);
      setMetadata({ therapyPhases: [] });
      setProcessingState('error');
      return;
    }

    setRawSourceText(text);
    setReadings(parsed.readings);
    setMetadata(parsed.metadata);
    setWarnings(parsed.warnings);
    setCapturedAt(Date.now());
    setProcessingState('ready');
    setSourceType(source);
    setShowRawEditor(false);

    const session: LipidProfileSession = {
      id: `lipid-${Date.now()}`,
      capturedAt: Date.now(),
      source,
      sourceRawText: text,
      readings: parsed.readings,
      settings,
      metadata: parsed.metadata
    };
    storageRef.current.saveSession(session).catch(() => {});

    ToastService.getInstance().success('Lipid results parsed', `Found ${parsed.readings.length} records.`);
  }, [settings]);

  const handlePasteSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get('lipidPaste') ?? '').trim();
    if (!text) {
      ToastService.getInstance().warning('No text provided', 'Paste the Investigation Summary content first.');
      return;
    }
    parseFromText(text, 'paste');
  }, [parseFromText]);

  const handleReadingsChange = (next: LipidResult[]) => {
    const nextSorted = [...next].sort((a, b) => (a.date < b.date ? -1 : 1));
    setReadings(nextSorted);
    setMetadata(buildLipidMetadata(nextSorted));
    setProcessingState('ready');
  };

  const handleLoadLast = async () => {
    const session = await storageRef.current.loadLatestSession();
    if (!session) {
      ToastService.getInstance().info('No saved capture', 'Import from EMR or paste text to begin.');
      return;
    }
    setReadings(session.readings);
    setMetadata(session.metadata);
    setRawSourceText(session.sourceRawText);
    setSettings(session.settings);
    setCapturedAt(session.capturedAt);
    setSourceType(session.source);
    setProcessingState('ready');
    ToastService.getInstance().success('Loaded last capture', `Restored ${session.readings.length} lipid readings.`);
  };

  const handlePointClick = (reading: LipidResult) => {
    ToastService.getInstance().info(
      `Reading ${new Date(reading.date).toLocaleDateString()}`,
      reading.source
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        <header className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Lipid Profile Importer</h2>
            <p className="text-sm text-gray-600">
              Capture Investigation Summary lipid results, review trends, and surface guideline-aligned insights.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close importer"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-secondary">
          <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                  onClick={handleCaptureFromEMR}
                  disabled={processingState === 'capturing'}
                >
                  <Upload className="w-4 h-4" />
                  Import from EMR
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-gray-300"
                  onClick={handleLoadLast}
                >
                  <RefreshCw className="w-4 h-4" />
                  Load last capture
                </button>
              </div>
              {processingState === 'capturing' && (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  Capturing Investigation Summary…
                </div>
              )}
            </div>

            {(capturedAt || showPasteFallback) && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 flex flex-wrap items-center gap-3">
                <span className="font-medium text-gray-700">
                  Source: Investigation summary · {capturedAt ? `captured ${new Date(capturedAt).toLocaleString()}` : 'manual'}
                </span>
                <button className="text-blue-600 hover:text-blue-800" onClick={handleCaptureFromEMR}>Refetch</button>
                <button className="text-blue-600 hover:text-blue-800" onClick={() => setShowRawEditor(v => !v)}>
                  {showRawEditor ? 'Hide raw' : 'Edit raw'}
                </button>
                <button className="text-blue-600 hover:text-blue-800" onClick={() => setShowPasteFallback(true)}>
                  Change source → Paste text
                </button>
              </div>
            )}

            {showPasteFallback && (
              <form className="mt-4 space-y-2" onSubmit={handlePasteSubmit}>
                <label htmlFor="lipidPaste" className="text-xs uppercase tracking-wide text-gray-500">
                  Paste Investigation Summary text
                </label>
                <textarea
                  id="lipidPaste"
                  name="lipidPaste"
                  className="w-full min-h-[120px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bloods (20 Mar 2025): TChol 7.5, LDL 5.2..."
                  defaultValue={rawSourceText}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteFallback(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Parse pasted text
                  </button>
                </div>
              </form>
            )}

            {showRawEditor && !showPasteFallback && (
              <div className="mt-4 space-y-2">
                <label htmlFor="rawSourceEditor" className="text-xs uppercase tracking-wide text-gray-500">
                  Raw Investigation Summary
                </label>
                <textarea
                  id="rawSourceEditor"
                  className="w-full min-h-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={rawSourceText}
                  onChange={(event) => setRawSourceText(event.target.value)}
                />
                <button
                  onClick={() => parseFromText(rawSourceText, sourceType)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:border-gray-300"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Re-parse raw text
                </button>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs space-y-1">
                {warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {processingState === 'ready' && readings.length > 0 && (
            <>
              <section className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <LipidTrendChart
                    readings={filteredReadings}
                    settings={settings}
                    overlay={overlayConfig}
                    therapyPhases={metadata.therapyPhases}
                    onPointClick={handlePointClick}
                  />
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Click any point to view the original source snippet.
                  </div>
                </div>
                <div className="space-y-4">
                  <LipidControlsPanel
                    settings={settings}
                    onChange={setSettings}
                    availableAnalytes={analyteOptions}
                  />
                  <LipidInsightsPanel summary={insights} />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Parsed results</h3>
                  <span className="text-xs text-gray-500">{readings.length} readings</span>
                </div>
                <LipidResultsTable
                  readings={readings}
                  analyteOrder={analyteOptions}
                  onChange={handleReadingsChange}
                />
              </section>
            </>
          )}

          {processingState !== 'ready' && readings.length === 0 && !showPasteFallback && (
            <section className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
              Import from the EMR or paste text to begin visualising lipid trends.
            </section>
          )}
        </main>

        <footer className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
