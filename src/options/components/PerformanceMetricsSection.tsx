import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Clock, Database, Download, RefreshCw, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { MetricsService, type MetricsAnalytics, type RecordingMetric } from '@/services/MetricsService';
import type { AgentType } from '@/types/medical.types';

const formatDuration = (ms: number): string => {
  if (!ms || ms <= 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const agentLabelMap: Partial<Record<AgentType, string>> = {
  'tavi': 'TAVI',
  'angiogram-pci': 'Angiogram/PCI',
  'mteer': 'M-TEER',
  'tteer': 'T-TEER',
  'pfo-closure': 'PFO Closure',
  'asd-closure': 'ASD Closure',
  'pvl-plug': 'PVL Plug',
  'bypass-graft': 'Bypass Graft',
  'right-heart-cath': 'Right Heart Cath',
  'tavi-workup': 'TAVI Workup',
  'quick-letter': 'Quick Letter',
  'consultation': 'Consultation',
  'investigation-summary': 'Investigation Summary',
  'ai-medical-review': 'AI Medical Review',
  'batch-ai-review': 'Batch AI Review',
  'patient-education': 'Patient Education',
  'background': 'Background',
  'medication': 'Medication',
  'bloods': 'Bloods',
  'imaging': 'Imaging',
  'enhancement': 'Enhancement',
  'transcription': 'Transcription',
  'generation': 'Generation'
};

const STORAGE_KEY = 'xestro-recording-metrics';

export const PerformanceMetricsSection: React.FC = () => {
  const [analytics, setAnalytics] = useState<MetricsAnalytics | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<RecordingMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const metricsService = useMemo(() => MetricsService.getInstance(), []);

  useEffect(() => {
    void loadMetrics();
    // Refresh metrics when the extension storage updates from another context
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && STORAGE_KEY in changes) {
        void loadMetrics();
      }
    };

    chrome?.storage?.onChanged?.addListener(handleStorageChange);
    return () => chrome?.storage?.onChanged?.removeListener(handleStorageChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const [analyticsPayload, metrics] = await Promise.all([
        metricsService.getAnalytics(),
        metricsService.getAllMetrics()
      ]);
      setAnalytics(analyticsPayload);
      setRecentMetrics(metrics.slice(0, 10));
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await metricsService.exportMetrics();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `operator-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all performance metrics? This removes all lifetime analytics.')) {
      return;
    }
    try {
      setIsClearing(true);
      await metricsService.clearAllMetrics();
      await loadMetrics();
    } catch (error) {
      console.error('Failed to clear metrics:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const trendDescription = useMemo(() => {
    if (!analytics) {
      return {
        text: 'No recent data',
        icon: <TrendingUp className="w-4 h-4 text-ink-secondary" />
      };
    }

    const { improvementPercent } = analytics.recentTrend;
    if (improvementPercent > 5) {
      return {
        text: `↓ ${Math.abs(improvementPercent).toFixed(1)}% faster than 25-session avg`,
        icon: <TrendingUp className="w-4 h-4 text-accent-success" />
      };
    }
    if (improvementPercent < -5) {
      return {
        text: `↑ ${Math.abs(improvementPercent).toFixed(1)}% slower than 25-session avg`,
        icon: <TrendingDown className="w-4 h-4 text-accent-warning" />
      };
    }
    return {
      text: 'Stable compared with historical average',
      icon: <TrendingUp className="w-4 h-4 text-ink-secondary" />
    };
  }, [analytics]);

  return (
    <section id="performance-metrics" className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-ink-primary" />
          <div>
            <h2 className="text-ink-primary text-lg font-semibold">Performance Metrics</h2>
            <p className="text-ink-secondary text-sm">Lifetime recording analytics across all Operator sessions</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="mono-button-secondary flex items-center space-x-1"
            title="Export metrics JSON"
            disabled={isLoading}
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={loadMetrics}
            className="mono-button-secondary flex items-center space-x-1"
            title="Refresh metrics"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'motion-safe:animate-spin' : ''}`}/>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleClear}
            className="mono-button-secondary flex items-center space-x-1 text-accent-error"
            title="Clear lifetime metrics"
            disabled={isClearing || isLoading}
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner" />
          <span className="text-ink-secondary text-sm ml-3">Loading metrics…</span>
        </div>
      ) : analytics && analytics.totalRecordings > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-line-primary rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-ink-secondary">
                <Database className="w-4 h-4" />
                <span>Total Recordings</span>
              </div>
              <div className="text-3xl font-semibold text-ink-primary mt-2">
                {analytics.totalRecordings}
              </div>
            </div>
            <div className="bg-white border border-line-primary rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-ink-secondary">
                <Clock className="w-4 h-4" />
                <span>Avg Transcription</span>
              </div>
              <div className="text-2xl font-semibold text-ink-primary mt-2">
                {formatDuration(analytics.averageTranscriptionTime)}
              </div>
            </div>
            <div className="bg-white border border-line-primary rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-ink-secondary">
                <Activity className="w-4 h-4" />
                <span>Avg Processing</span>
              </div>
              <div className="text-2xl font-semibold text-ink-primary mt-2">
                {formatDuration(analytics.averageProcessingTime)}
              </div>
            </div>
            <div className="bg-white border border-line-primary rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-ink-secondary">
                {trendDescription.icon ?? <TrendingUp className="w-4 h-4 text-ink-secondary" />}
                <span>Recent Trend</span>
              </div>
              <div className="text-sm text-ink-secondary mt-2 leading-snug">
                {trendDescription.text}
              </div>
            </div>
          </div>

          {analytics.agentTypeBreakdown && Object.keys(analytics.agentTypeBreakdown).length > 0 && (
            <div>
              <h3 className="text-ink-primary font-medium text-sm mb-3">Agent Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(analytics.agentTypeBreakdown).map(([agentType, data]) => (
                  <div key={agentType} className="bg-white border border-line-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-ink-primary truncate">
                        {agentLabelMap[agentType as AgentType] || agentType}
                      </span>
                      <span className="text-xs text-ink-secondary">{data?.count ?? 0} runs</span>
                    </div>
                    <div className="space-y-1 text-xs text-ink-secondary">
                      <div className="flex justify-between">
                        <span>Transcription</span>
                        <span className="text-ink-primary">{formatDuration(data?.avgTranscription ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing</span>
                        <span className="text-ink-primary">{formatDuration(data?.avgProcessing ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="text-ink-primary">{formatDuration(data?.avgTotal ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.modelPerformance && Object.keys(analytics.modelPerformance).length > 0 && (
            <div>
              <h3 className="text-ink-primary font-medium text-sm mb-3">Model Utilization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(analytics.modelPerformance).map(([model, data]) => (
                  <div key={model} className="bg-white border border-line-secondary rounded-lg p-3">
                    <div className="text-sm font-medium text-ink-primary truncate" title={model}>{model}</div>
                    <div className="text-xs text-ink-secondary mt-1">{data.count} sessions</div>
                    <div className="text-xs text-ink-secondary mt-1">
                      Avg processing: <span className="text-ink-primary">{formatDuration(data.avgTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentMetrics.length > 0 && (
            <div>
              <h3 className="text-ink-primary font-medium text-sm mb-3">Recent Activity</h3>
              <div className="overflow-hidden border border-line-secondary rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-surface-tertiary text-ink-secondary">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Timestamp</th>
                      <th className="text-left font-medium px-3 py-2">Agent</th>
                      <th className="text-left font-medium px-3 py-2">Model</th>
                      <th className="text-left font-medium px-3 py-2">Transcription</th>
                      <th className="text-left font-medium px-3 py-2">Processing</th>
                      <th className="text-left font-medium px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMetrics.map((metric) => (
                      <tr key={metric.sessionId} className="border-t border-line-secondary">
                        <td className="px-3 py-2 whitespace-nowrap text-ink-secondary">
                          {new Date(metric.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-ink-primary">
                          {agentLabelMap[metric.agentType] || metric.agentType}
                        </td>
                        <td className="px-3 py-2 text-ink-secondary" title={metric.modelUsed}>
                          {metric.modelUsed}
                        </td>
                        <td className="px-3 py-2 text-ink-primary">{formatDuration(metric.transcriptionTime)}</td>
                        <td className="px-3 py-2 text-ink-primary">{formatDuration(metric.processingTime)}</td>
                        <td className="px-3 py-2 text-ink-primary">{formatDuration(metric.totalDuration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-line-secondary rounded-lg p-6 text-center text-ink-secondary text-sm">
          <p>No performance metrics recorded yet.</p>
          <p className="mt-1">Complete a recording to start building lifetime analytics.</p>
        </div>
      )}
    </section>
  );
};

export default PerformanceMetricsSection;
