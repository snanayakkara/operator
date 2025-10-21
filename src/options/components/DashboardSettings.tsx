import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Server, Mic, Sparkles, Users, Brain, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { LMStudioService } from '@/services/LMStudioService';
import type { ModelStatus } from '@/types/medical.types';
import { AgentFactory } from '@/services/AgentFactory';
import { logger } from '@/utils/Logger';
import { PerformanceMetricsSection } from './PerformanceMetricsSection';

export const DashboardSettings: React.FC = () => {
  const lmStudioService = useMemo(() => LMStudioService.getInstance(), []);
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    isConnected: false,
    classifierModel: '',
    processorModel: '',
    lastPing: 0,
    latency: 0,
    whisperServer: { running: false, model: 'whisper-large-v3-turbo', port: 8001, lastChecked: 0 },
  } as any);
  const [phase4Stats, setPhase4Stats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      // Get model status
      try {
        const status = await lmStudioService.checkConnection();
        setModelStatus(status);
      } catch (error) {
        logger.warn('Failed to get model status', { error: error instanceof Error ? error.message : String(error) });
        // Set default status if connection fails
        setModelStatus({
          isConnected: false,
          classifierModel: '',
          processorModel: '',
          lastPing: 0,
          latency: 0,
          whisperServer: { running: false, model: 'whisper-large-v3-turbo', port: 8001, lastChecked: 0 },
        } as any);
      }

      // Get Phase 4 stats
      try {
        const stats = AgentFactory.getPhase4PerformanceStats();
        setPhase4Stats(stats);
      } catch (error) {
        logger.warn('Failed to get Phase 4 stats', { error: error instanceof Error ? error.message : String(error) });
        setPhase4Stats(null);
      }
    } catch (error) {
      logger.error('Dashboard refresh failed', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const formatLatency = (latency: number) => {
    if (!latency) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-6 h-6 text-ink-primary" />
          <div>
            <div className="text-xl font-semibold text-ink-primary">Settings Dashboard</div>
            <div className="text-sm text-ink-secondary">All services and intelligence at a glance</div>
          </div>
        </div>
        <button onClick={refresh} className="mono-button-secondary flex items-center space-x-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'motion-safe:animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid of quick-view cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Intelligent Features */}
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-ink-primary">Intelligent Features</span>
            </div>
            <span className="text-xs text-ink-secondary">{phase4Stats ? 'Active' : 'Loading'}</span>
          </div>
          {phase4Stats ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Agent Cache</span>
                <span className="text-ink-primary font-mono">{Math.round((phase4Stats.agentLoader?.cacheHitRate || 0) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Avg Load</span>
                <span className="text-ink-primary font-mono">{Math.round(phase4Stats.agentLoader?.averageLoadTime || 0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Cross-Agent</span>
                <span className="text-ink-primary">{phase4Stats.crossAgentIntelligence?.globalInsights || 'Learning'}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-ink-tertiary">Gathering performance metrics…</div>
          )}
        </div>

        {/* Cross-Agent Intelligence */}
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Brain className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-ink-primary">Cross-Agent Intelligence</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Patient Profiles</span>
              <span className="text-ink-primary font-mono">{phase4Stats?.crossAgentIntelligence?.activeProfiles ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Global Insights</span>
              <span className="text-ink-primary">{phase4Stats?.crossAgentIntelligence?.globalInsights ?? 'Learning'}</span>
            </div>
          </div>
        </div>

        {/* LMStudio Status */}
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Server className="w-5 h-5 text-ink-primary" />
            <span className="font-medium text-ink-primary">LMStudio</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Status</span>
              <span className={modelStatus.isConnected ? 'text-accent-success' : 'text-accent-error'}>
                {modelStatus.isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Latency</span>
              <span className="text-ink-primary font-mono">{formatLatency(modelStatus.latency)}</span>
            </div>
          </div>
        </div>

        {/* Whisper Server */}
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Mic className="w-5 h-5 text-ink-primary" />
            <span className="font-medium text-ink-primary">Whisper Server</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Status</span>
              <span className={modelStatus.whisperServer?.running ? 'text-accent-success' : 'text-accent-error'}>
                {modelStatus.whisperServer?.running ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Model</span>
              <span className="text-ink-primary">{modelStatus.whisperServer?.model || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row with quick actions and health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-5 h-5 text-ink-tertiary" />
            <span className="font-medium text-ink-primary">Quick Actions</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="mono-button-secondary">Clear Cache</button>
            <button className="mono-button-secondary">Export Settings</button>
            <button className="mono-button-secondary">Reset Defaults</button>
            <button className="mono-button-secondary" onClick={() => window.close()}>Close</button>
          </div>
        </div>

        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            {modelStatus.isConnected || modelStatus.whisperServer?.running ? (
              <CheckCircle className="w-5 h-5 text-accent-success" />
            ) : (
              <AlertCircle className="w-5 h-5 text-accent-error" />
            )}
            <span className="font-medium text-ink-primary">Overall System</span>
          </div>
          <div className="text-sm text-ink-secondary">
            {modelStatus.isConnected && modelStatus.whisperServer?.running
              ? 'All services healthy'
              : modelStatus.isConnected || modelStatus.whisperServer?.running
              ? 'Partial connectivity detected'
              : 'All services offline'}
          </div>
        </div>
      </div>

      <PerformanceMetricsSection />
    </div>
  );
};
