import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, RefreshCw, Clipboard, Edit3, X, AlertTriangle, Loader2 } from 'lucide-react';
import Button, { IconButton } from './buttons/Button';
import { parseTTETrends } from '@/utils/tte/TTETrendParser';
import { buildTTEInsightsSummary } from '@/utils/tte/TTETrendInsights';
import type {
  TTETrendRow,
  TTETrendSettings,
  TTETrendSeriesKey,
  TTETrendSession,
  TTEFieldValue,
  TTEInsightsSummary
} from '@/types/TTETrendTypes';
import { DEFAULT_TTE_TREND_SETTINGS } from '@/config/tteTrendConfig';
import { TTETrendStorage } from '@/services/TTETrendStorage';
import { ToastService } from '@/services/ToastService';
import { PerformanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { TTETrendChart } from './tte/TTETrendChart';
import { TTETrendControls } from './tte/TTETrendControls';
import { TTEResultsTable, type EditableField } from './tte/TTEResultsTable';
import { TTEInsightsPanel } from './tte/TTEInsightsPanel';

type ProcessingState = 'idle' | 'capturing' | 'ready' | 'error';

interface CaptureResponse {
  success: boolean;
  data?: string;
  error?: string;
}

interface TTETrendImporterProps {
  isOpen: boolean;
  onClose: () => void;
}

const performanceMonitor = PerformanceMonitoringService.getInstance();

const createManualNumericValue = (value: number, unit?: string): TTEFieldValue => ({
  id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: 'numeric',
  value,
  unit,
  display: unit ? (unit === '%' ? `${value}${unit}` : `${value} ${unit}`) : value.toString(),
  sourceText: 'Manual edit',
  rawText: 'Manual edit',
  flags: ['manual']
});

const createManualTextValue = (text: string): TTEFieldValue => ({
  id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: 'text',
  text,
  sourceText: 'Manual edit',
  rawText: text,
  flags: ['manual']
});

function filterRowsByTime(rows: TTETrendRow[], filter: TTETrendSettings['timeFilter']): TTETrendRow[] {
  if (filter === 'all') return rows;
  const months = filter === '6m' ? 6 : filter === '12m' ? 12 : 24;
  const datedRows = rows.filter(row => row.dateIso);
  if (datedRows.length === 0) return rows;
  const latestDate = new Date(datedRows.at(-1)!.dateIso!);
  const windowStart = new Date(latestDate);
  windowStart.setMonth(windowStart.getMonth() - months);
  return rows.filter(row => {
    if (!row.dateIso) return true;
    const date = new Date(row.dateIso);
    return date >= windowStart;
  });
}

export const TTETrendImporter: React.FC<TTETrendImporterProps> = ({ isOpen, onClose }) => {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [rows, setRows] = useState<TTETrendRow[]>([]);
  const [rawSourceText, setRawSourceText] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [capturedAt, setCapturedAt] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<'emr' | 'paste'>('emr');
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [settings, setSettings] = useState<TTETrendSettings>(DEFAULT_TTE_TREND_SETTINGS);
  const [insights, setInsights] = useState<TTEInsightsSummary | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ rowId: string; field: TTETrendSeriesKey } | null>(null);
  const [isLoadingLast, setIsLoadingLast] = useState(false);
  const [lastEvents, setLastEvents] = useState<string[]>([]);

  const storageRef = useRef(TTETrendStorage.getInstance());

  useEffect(() => {
    (async () => {
      const storedSettings = await storageRef.current.loadSettings().catch(() => DEFAULT_TTE_TREND_SETTINGS);
      setSettings(prev => ({
        ...prev,
        ...storedSettings,
        enabledSeries: {
          ...prev.enabledSeries,
          ...storedSettings.enabledSeries
        },
        contextBands: {
          ...prev.contextBands,
          ...storedSettings.contextBands
        }
      }));
    })();
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      setInsights(null);
      return;
    }
    setInsights(buildTTEInsightsSummary(rows));
  }, [rows]);

  useEffect(() => {
    storageRef.current.saveSettings(settings).catch(() => {});
  }, [settings]);

  const filteredRows = useMemo(() => filterRowsByTime(rows, settings.timeFilter), [rows, settings.timeFilter]);

  const handleSeriesToggle = useCallback(
    (series: TTETrendSeriesKey) => {
      if (series === 'lvef') {
        setSettings(prev => ({
          ...prev,
          showLVEFOnly: !prev.showLVEFOnly
        }));
        return;
      }
      setSettings(prev => {
        const nextEnabled = { ...prev.enabledSeries, lvef: true };
        // Toggle selected series, reset others to false
        Object.keys(nextEnabled).forEach(key => {
          if (key !== 'lvef') {
            nextEnabled[key as TTETrendSeriesKey] = false;
          }
        });
        nextEnabled[series] = !prev.enabledSeries[series];
        return { ...prev, enabledSeries: nextEnabled, showLVEFOnly: false };
      });
    },
    []
  );

  const handleTimeFilterChange = useCallback((filter: TTETrendSettings['timeFilter']) => {
    setSettings(prev => ({ ...prev, timeFilter: filter }));
  }, []);

  const handleContextToggle = useCallback((context: keyof TTETrendSettings['contextBands']) => {
    setSettings(prev => ({
      ...prev,
      contextBands: {
        ...prev.contextBands,
        [context]: !prev.contextBands[context]
      }
    }));
  }, []);

  const persistSession = useCallback(
    async (session: TTETrendSession) => {
      try {
        await storageRef.current.saveSession(session);
      } catch (error) {
        console.warn('Failed to persist TTE trend session', error);
      }
    },
    []
  );

  useEffect(() => {
    if (processingState !== 'ready' || rows.length === 0) {
      return;
    }
    const session: TTETrendSession = {
      id: `tte-session-${capturedAt ?? Date.now()}`,
      timestamp: capturedAt ?? Date.now(),
      sourceType,
      rawText: rawSourceText,
      rows,
      notes: rows.flatMap(row => row.notes),
      settings
    };
    persistSession(session);
  }, [rows, settings, rawSourceText, sourceType, processingState, capturedAt, persistSession]);

  const updateStateFromText = useCallback(
    async (text: string, origin: 'emr' | 'paste') => {
      setProcessingState('capturing');
      try {
        const start = performance.now();
        const result = parseTTETrends(text);
        const duration = performance.now() - start;
        performanceMonitor.recordMetrics('agent-processing', duration, { agentType: 'tte-trend-import' });

        if (result.rows.length === 0) {
          setProcessingState('error');
          setWarnings(result.warnings);
          ToastService.getInstance().warning('No TTE entries detected', 'Review the capture or paste text manually.');
          return;
        }

        setRows(result.rows);
        setRawSourceText(text);
        setWarnings(result.warnings);
        setCapturedAt(Date.now());
        setSourceType(origin);
        setLastEvents(result.events.map(event => `${event.label} • ${event.description}`));
        setProcessingState('ready');

        const session: TTETrendSession = {
          id: `tte-session-${Date.now()}`,
          timestamp: Date.now(),
          sourceType: origin,
          rawText: text,
          rows: result.rows,
          notes: result.notes,
          settings
        };
        persistSession(session);
        ToastService.getInstance().success(
          'TTE data captured',
          `Parsed ${result.rows.length} echo${result.rows.length === 1 ? '' : 'es'} from Investigation summary.`
        );
      } catch (error) {
        console.error('Failed to parse TTE trends', error);
        setProcessingState('error');
        ToastService.getInstance().error('Parsing failed', error instanceof Error ? error.message : 'Unknown error');
      }
    },
    [persistSession, settings]
  );

  const handleCaptureFromEMR = useCallback(async () => {
    setProcessingState('capturing');
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'EXECUTE_ACTION',
        action: 'investigation-summary',
        data: { extractOnly: true }
      })) as CaptureResponse;

      if (!response?.success) {
        throw new Error(response?.error || 'Capture failed');
      }

      if (!response.data || response.data.trim().length === 0) {
        setShowPasteFallback(true);
        setProcessingState('error');
        ToastService.getInstance().warning(
          'No Investigation Summary content',
          'Click “Paste text” to provide the investigation entries manually.'
        );
        return;
      }

      await updateStateFromText(response.data, 'emr');
    } catch (error) {
      console.error('EMR capture failed', error);
      setProcessingState('error');
      setShowPasteFallback(true);
      ToastService.getInstance().error('Capture failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [updateStateFromText]);

  const handlePasteSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const text = (formData.get('ttePaste') as string | null) ?? '';
      if (!text.trim()) {
        ToastService.getInstance().warning('Paste text missing', 'Provide Investigation summary text to parse.');
        return;
      }
      await updateStateFromText(text, 'paste');
      setShowPasteFallback(false);
    },
    [updateStateFromText]
  );

  const handleLoadLast = useCallback(async () => {
    setIsLoadingLast(true);
    try {
      const session = await storageRef.current.loadLatestSession();
      if (!session) {
        ToastService.getInstance().info('No stored session', 'Import from EMR to create a session.');
        return;
      }
      if (session.settings) {
        setSettings(prev => ({
          ...prev,
          ...session.settings,
          enabledSeries: {
            ...prev.enabledSeries,
            ...session.settings.enabledSeries
          },
          contextBands: {
            ...prev.contextBands,
            ...session.settings.contextBands
          }
        }));
      }
      setRows(session.rows);
      setRawSourceText(session.rawText);
      setCapturedAt(session.timestamp);
      setSourceType(session.sourceType);
      setWarnings([]);
      setProcessingState('ready');
      ToastService.getInstance().success('Loaded previous capture', 'Restored the most recent TTE trend session.');
    } finally {
      setIsLoadingLast(false);
    }
  }, []);

  const handleMetricUpdate = useCallback(
    (rowId: string, field: EditableField, value: string) => {
      setRows(prevRows =>
        prevRows.map(row => {
          if (row.id !== rowId) return row;
          const trimmed = value.trim();
          const clone: TTETrendRow = { ...row };

          const clearField = (target: TTETrendRow) => {
            switch (field) {
              case 'rvsp':
                target.rvsp = undefined;
                break;
              case 'lvef':
                target.lvef = undefined;
                target.lvefCategory = undefined;
                break;
              case 'lvedd':
                target.lvedd = undefined;
                break;
              case 'avMpg':
                target.avMpg = undefined;
                break;
              case 'tapse':
                target.tapse = undefined;
                break;
              case 'gls':
                target.gls = undefined;
                break;
              case 'lavi':
                target.lavi = undefined;
                break;
              case 'di':
                target.di = undefined;
                break;
              case 'ava':
                target.ava = undefined;
                break;
              case 'svi':
                target.svi = undefined;
                break;
              default:
                break;
            }
          };

          if (!trimmed) {
            clearField(clone);
            return clone;
          }

          const numeric = Number(trimmed.replace(/[^\d.-]/g, ''));
          const isNumeric = Number.isFinite(numeric);
          const unit =
            field === 'lvef'
              ? '%'
              : field === 'rvsp'
                ? 'mmHg'
                : field === 'lvedd'
                  ? 'mm'
                  : field === 'avMpg'
                    ? 'mmHg'
                    : field === 'tapse'
                      ? 'mm'
                      : field === 'gls'
                        ? '%'
                        : field === 'lavi'
                          ? 'mL/m²'
                          : field === 'di'
                            ? undefined
                            : field === 'ava'
                              ? 'cm²'
                              : field === 'svi'
                                ? 'mL/m²'
                                : undefined;
          const updatedValue = isNumeric ? createManualNumericValue(numeric, unit) : createManualTextValue(trimmed);

          if (field === 'rvsp') {
            clone.rvsp = updatedValue;
          } else if (field === 'lvef') {
            if (updatedValue.type === 'numeric') {
              clone.lvef = updatedValue;
              clone.lvefCategory = undefined;
            } else {
              clone.lvef = undefined;
              clone.lvefCategory = updatedValue;
            }
          } else {
            switch (field) {
              case 'lvedd':
                clone.lvedd = updatedValue;
                break;
              case 'avMpg':
                clone.avMpg = updatedValue;
                break;
              case 'tapse':
                clone.tapse = updatedValue;
                break;
              case 'gls':
                clone.gls = updatedValue;
                break;
              case 'lavi':
                clone.lavi = updatedValue;
                break;
              case 'di':
                clone.di = updatedValue;
                break;
              case 'ava':
                clone.ava = updatedValue;
                break;
              case 'svi':
                clone.svi = updatedValue;
                break;
              default:
                break;
            }
          }
          return clone;
        })
      );
    },
    []
  );

  const handleShowLVEFOnly = useCallback((value: boolean) => {
    setSettings(prev => ({ ...prev, showLVEFOnly: value, enabledSeries: { ...prev.enabledSeries, rvsp: false, lvedd: false, avMpg: false } }));
  }, []);

  const handlePointClick = useCallback((rowId: string, field: TTETrendSeriesKey) => {
    setSelectedPoint({ rowId, field });
  }, []);

  const selectedPointDetails = useMemo(() => {
    if (!selectedPoint) return null;
    const row = rows.find(r => r.id === selectedPoint.rowId);
    if (!row) return null;
    let value: TTEFieldValue | undefined;
    if (selectedPoint.field === 'rvsp') {
      value = row.rvsp ?? row.pasp ?? row.trGradient;
    } else if (selectedPoint.field === 'lvef') {
      value = row.lvef ?? row.lvefCategory;
    } else if (selectedPoint.field === 'lvedd') {
      value = row.lvedd;
    } else if (selectedPoint.field === 'avMpg') {
      value = row.avMpg;
    } else if (selectedPoint.field === 'lavi') {
      value = row.lavi;
    }
    return {
      row,
      value
    };
  }, [rows, selectedPoint]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-2">
      <div className="flex h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-3 py-2.5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Echo (TTE) Trends</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Import & visualize TTE metrics
            </p>
          </div>
          <IconButton
            onClick={onClose}
            icon={<X />}
            variant="ghost"
            size="md"
            aria-label="Close TTE Trend Importer"
          />
        </header>

        <main className="flex-1 overflow-y-auto bg-surface-secondary p-2">
          <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  onClick={handleCaptureFromEMR}
                  disabled={processingState === 'capturing'}
                  isLoading={processingState === 'capturing'}
                  variant="primary"
                  size="sm"
                  startIcon={<Upload className="h-3.5 w-3.5" />}
                  className="bg-slate-900 hover:bg-slate-800 shadow-sm"
                >
                  Import
                </Button>
                <Button
                  onClick={handleLoadLast}
                  disabled={isLoadingLast}
                  isLoading={isLoadingLast}
                  variant="outline"
                  size="sm"
                  startIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  className="border-slate-300 text-slate-700 hover:border-slate-400"
                >
                  Load last
                </Button>
              </div>
              {processingState === 'capturing' && (
                <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 animate-ping rounded-full bg-slate-900" />
                  Capturing Investigation summary…
                </div>
              )}
            </div>

            {(capturedAt || showPasteFallback || rawSourceText) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600">
                <span className="font-semibold text-slate-700">
                  Source: Inv. summary ·{' '}
                  {capturedAt ? new Date(capturedAt).toLocaleDateString() : sourceType === 'paste' ? 'manual' : 'unknown'}
                </span>
                <Button variant="ghost" size="sm" className="text-slate-700 underline underline-offset-2 h-auto px-1 py-0" onClick={handleCaptureFromEMR}>
                  Refetch
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-700 underline underline-offset-2 h-auto px-1 py-0" onClick={() => setShowRawEditor(prev => !prev)}>
                  {showRawEditor ? 'Hide raw' : 'Edit raw'}
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-700 underline underline-offset-2 h-auto px-1 py-0" onClick={() => setShowPasteFallback(true)}>
                  Change source → Paste text
                </Button>
              </div>
            )}

            {showPasteFallback && (
              <form className="mt-4 space-y-2" onSubmit={handlePasteSubmit}>
                <label htmlFor="ttePaste" className="text-xs uppercase tracking-wide text-slate-500">
                  Paste Investigation summary text
                </label>
                <textarea
                  id="ttePaste"
                  name="ttePaste"
                  className="min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  defaultValue={rawSourceText}
                  placeholder="TTE (15 Jan 2023): LVEDD 66, EF 45%..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowPasteFallback(false)}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    startIcon={<Clipboard className="h-3.5 w-3.5" />}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    Parse pasted text
                  </Button>
                </div>
              </form>
            )}

            {showRawEditor && !showPasteFallback && (
              <div className="mt-4 space-y-2">
                <label htmlFor="rawSourceEditor" className="text-xs uppercase tracking-wide text-slate-500">
                  Raw Investigation summary
                </label>
                <textarea
                  id="rawSourceEditor"
                  className="min-h-[160px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={rawSourceText}
                  onChange={event => setRawSourceText(event.target.value)}
                />
                <Button
                  onClick={() => updateStateFromText(rawSourceText, sourceType)}
                  variant="outline"
                  size="sm"
                  startIcon={<Edit3 className="h-3.5 w-3.5" />}
                  className="border-slate-300 text-slate-700 hover:border-slate-400"
                >
                  Re-parse raw text
                </Button>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="mt-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Parsing warnings
                </div>
                {warnings.map(warning => (
                  <div key={warning}>• {warning}</div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-2 space-y-2">
            <TTETrendControls
              settings={settings}
              onToggleSeries={handleSeriesToggle}
              onTimeFilterChange={handleTimeFilterChange}
              onShowLVEFOnlyChange={handleShowLVEFOnly}
              onToggleContext={handleContextToggle}
            />

            <TTETrendChart rows={filteredRows} settings={settings} onPointClick={handlePointClick} />

            {selectedPointDetails && selectedPointDetails.value && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Source snippet</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {selectedPointDetails.row.site ? `${selectedPointDetails.row.site} · ` : ''}
                      {selectedPointDetails.row.dateIso
                        ? new Date(selectedPointDetails.row.dateIso).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : selectedPointDetails.row.label}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{selectedPointDetails.value.sourceText}</p>
                  </div>
                  <Button
                    onClick={() => setSelectedPoint(null)}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 hover:text-slate-700 h-auto px-2 py-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {lastEvents.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="text-xs uppercase tracking-wide text-slate-500">Timeline events</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {lastEvents.map(event => (
                    <li key={event}>• {event}</li>
                  ))}
                </ul>
              </div>
            )}

            <TTEResultsTable rows={filteredRows} onMetricUpdate={handleMetricUpdate} />

            <TTEInsightsPanel insights={insights} />
          </section>
        </main>
      </div>
    </div>
  );
};
