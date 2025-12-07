/**
 * MetricsDashboard - Performance Metrics Summary View
 * 
 * Displays comprehensive performance analytics and trends
 * for all recording sessions with detailed breakdowns.
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Brain,
  Database,
  Download,
  Trash2,
  RefreshCw,
  X
} from 'lucide-react';
import { MetricsService, type MetricsAnalytics, type RecordingMetric } from '@/services/MetricsService';
import type { AgentType } from '@/types/medical.types';
import { IconButton } from './buttons/Button';

interface MetricsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState<MetricsAnalytics | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<RecordingMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
    }
  }, [isOpen]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const metricsService = MetricsService.getInstance();
      const [analyticsData, allMetrics] = await Promise.all([
        metricsService.getAnalytics(),
        metricsService.getAllMetrics()
      ]);
      setAnalytics(analyticsData);
      setRecentMetrics(allMetrics.slice(0, 10)); // Show last 10 recordings
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMetrics = async () => {
    if (confirm('Are you sure you want to clear all performance metrics? This cannot be undone.')) {
      const metricsService = MetricsService.getInstance();
      await metricsService.clearAllMetrics();
      await loadMetrics();
    }
  };

  const handleExportMetrics = async () => {
    try {
      const metricsService = MetricsService.getInstance();
      const exportData = await metricsService.exportMetrics();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xestro-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getAgentIcon = (agentType: AgentType) => {
    const icons: Record<AgentType, string> = {
      'tavi': '❤️',
      'angiogram-pci': '🫀',
      'mteer': '🔧',
      'tteer': '🫀',
      'pfo-closure': '🏥',
      'asd-closure': '🏥',
      'pvl-plug': '🔌',
      'bypass-graft': '🛤️',
      'right-heart-cath': '📊',
      'tavi-workup': '🔍',
      'quick-letter': '📝',
      'consultation': '👨‍⚕️',
      'investigation-summary': '🔍',
      'ai-medical-review': '🛡️',
      'batch-ai-review': '📋',
      'patient-education': '🎓',
      'pre-op-plan': '📋',
      'background': '📋',
      'medication': '💊',
      'bloods': '🩸',
      'imaging': '📷',
      'ohif-viewer': '🩻',
      'aus-medical-review': '🇦🇺',
      'enhancement': '✨',
      'transcription': '🎤',
      'generation': '🤖'
    };
    return icons[agentType] || '🤖';
  };

  const getTrendColor = (percent: number) => {
    if (percent > 0) return 'text-green-600';
    if (percent < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-modal shadow-modal max-w-6xl max-h-[90vh] overflow-hidden w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Performance Analytics</h2>
                <p className="text-gray-600 text-sm">Historical recording metrics and trends</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <IconButton
                onClick={handleExportMetrics}
                icon={Download}
                variant="ghost"
                size="sm"
                aria-label="Export Metrics"
                className="text-gray-600"
              />
              <IconButton
                onClick={loadMetrics}
                icon={RefreshCw}
                variant="ghost"
                size="sm"
                aria-label="Refresh"
                className="text-gray-600"
              />
              <IconButton
                onClick={handleClearMetrics}
                icon={Trash2}
                variant="ghost"
                size="sm"
                aria-label="Clear All Metrics"
                className="text-red-600 hover:bg-red-50"
              />
              <IconButton
                onClick={onClose}
                icon={X}
                variant="ghost"
                size="sm"
                aria-label="Close"
                className="text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : analytics && analytics.totalRecordings > 0 ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Total Recordings</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{analytics.totalRecordings}</div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Avg Transcription</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatTime(analytics.averageTranscriptionTime)}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Avg Processing</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatTime(analytics.averageProcessingTime)}
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Avg Total</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {formatTime(analytics.averageTotalDuration)}
                  </div>
                </div>
              </div>

              {/* Performance Trend */}
              {analytics.recentTrend.last25Avg > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    {analytics.recentTrend.improvementPercent > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : analytics.recentTrend.improvementPercent < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <Activity className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="text-sm font-medium text-gray-800">Performance Trend</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Last 10 Average</div>
                      <div className="font-semibold">{formatTime(analytics.recentTrend.last10Avg)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Last 25 Average</div>
                      <div className="font-semibold">{formatTime(analytics.recentTrend.last25Avg)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Improvement</div>
                      <div className={`font-semibold ${getTrendColor(analytics.recentTrend.improvementPercent)}`}>
                        {analytics.recentTrend.improvementPercent > 0 ? '+' : ''}{analytics.recentTrend.improvementPercent}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Type Breakdown */}
              {Object.keys(analytics.agentTypeBreakdown).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance Breakdown</h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.agentTypeBreakdown).map(([agentType, data]) => (
                      <div key={agentType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{getAgentIcon(agentType as AgentType)}</span>
                          <div>
                            <div className="font-medium text-gray-900 capitalize">
                              {agentType.replace('-', ' ')}
                            </div>
                            <div className="text-sm text-gray-600">{data.count} recordings</div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{formatTime(data.avgTotal)}</div>
                          <div className="text-gray-600">
                            {formatTime(data.avgTranscription)} + {formatTime(data.avgProcessing)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Recordings */}
              {recentMetrics.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Recordings</h3>
                  <div className="space-y-2">
                    {recentMetrics.map((metric, _index) => (
                      <div key={metric.sessionId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm">{getAgentIcon(metric.agentType)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {metric.agentType.replace('-', ' ')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(metric.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{formatTime(metric.totalDuration)}</div>
                          <div className="text-xs text-gray-500">
                            {formatTime(metric.transcriptionTime)} + {formatTime(metric.processingTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Performance */}
              {Object.keys(analytics.modelPerformance).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.modelPerformance).map(([model, data]) => (
                      <div key={model} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-900">{model}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{formatTime(data.avgTime)}</div>
                          <div className="text-xs text-gray-500">{data.count} recordings</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Metrics Available</h3>
              <p className="text-gray-600">Start recording to see performance analytics appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
