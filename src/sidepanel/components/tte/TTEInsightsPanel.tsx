import React, { useCallback } from 'react';
import type { TTEInsightsSummary } from '@/types/TTETrendTypes';
import { Clipboard, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ToastService } from '@/services/ToastService';
import Button from '../buttons/Button';

interface TTEInsightsPanelProps {
  insights: TTEInsightsSummary | null;
}

export const TTEInsightsPanel: React.FC<TTEInsightsPanelProps> = ({ insights }) => {
  const handleCopy = useCallback(() => {
    if (!insights) return;
    const text = `${insights.headline}\n${insights.narrative}`;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        ToastService.getInstance().success('Copied', 'Insights copied to clipboard.');
      })
      .catch(() => {
        ToastService.getInstance().error('Copy failed', 'Unable to access clipboard.');
      });
  }, [insights]);

  if (!insights) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        Clinical insights will appear once TTE data is parsed.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{insights.headline}</h3>
          <p className="mt-1 text-sm text-slate-700">{insights.narrative}</p>
        </div>
        <Button
          onClick={handleCopy}
          variant="secondary"
          size="sm"
          startIcon={<Clipboard />}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          Copy summary
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metric trajectory</h4>
          <div className="space-y-2 text-sm text-slate-700">
            {insights.metrics.map(metric => (
              <div key={metric.field} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</div>
                <div className="mt-1 text-sm text-slate-700">
                  {metric.current ? (
                    <>
                      Latest:{' '}
                      <span className="font-semibold">
                        {(metric.current.type === 'numeric'
                          ? metric.current.display ?? `${metric.current.value}${metric.current.unit ? ` ${metric.current.unit}` : ''}`
                          : metric.current.text) || 'n/a'}
                      </span>
                    </>
                  ) : (
                    'No recent value'
                  )}
                  {metric.deltaFromPrevious && <span className="ml-2 text-xs text-slate-500">vs prior {metric.deltaFromPrevious}</span>}
                  {metric.deltaFromBaseline && <span className="ml-2 text-xs text-slate-500">({metric.deltaFromBaseline})</span>}
                  {metric.trajectory && metric.trajectory !== 'insufficient-data' && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {metric.trajectory}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {insights.thresholds.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thresholds crossed</h4>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {insights.thresholds.map(threshold => (
                  <li key={threshold} className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    {threshold}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.rightHeartContext.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Right heart</h4>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {insights.rightHeartContext.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.valveContext.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valve trajectory</h4>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {insights.valveContext.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {(insights.dataQuality.missingMetrics.length > 0 || insights.dataQuality.ambiguousFindings.length > 0) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data quality</h4>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {insights.dataQuality.missingMetrics.map(item => (
                  <li key={item}>Missing: {item}</li>
                ))}
                {insights.dataQuality.ambiguousFindings.map(item => (
                  <li key={item}>Ambiguity: {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

