import React from 'react';
import type { TTETrendSeriesKey, TTETrendSettings } from '@/types/TTETrendTypes';
import { TIME_FILTER_OPTIONS, TTE_SERIES_META } from '@/config/tteTrendConfig';

interface TTETrendControlsProps {
  settings: TTETrendSettings;
  onToggleSeries: (key: TTETrendSeriesKey) => void;
  onTimeFilterChange: (value: TTETrendSettings['timeFilter']) => void;
  onShowLVEFOnlyChange: (value: boolean) => void;
  onToggleContext: (context: keyof TTETrendSettings['contextBands']) => void;
}

export const TTETrendControls: React.FC<TTETrendControlsProps> = ({
  settings,
  onToggleSeries,
  onTimeFilterChange,
  onShowLVEFOnlyChange,
  onToggleContext
}) => {
  const optionalSeries: Array<TTETrendSeriesKey> = ['rvsp', 'lvedd', 'avMpg', 'lavi'];
  const contextToggleOrder: Array<keyof TTETrendSettings['contextBands']> = ['lvef', 'rvsp', 'lvedd', 'avMpg', 'tapse'];

  return (
    <div className="rounded-xl border border-slate-200 bg-surface-secondary px-3 py-3 text-sm text-slate-700">
      <div className="flex flex-col gap-3">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Series</span>
          <div className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm"
              disabled
            >
              <span>{TTE_SERIES_META.lvef.label}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">Default</span>
            </button>
            <div className="flex flex-col gap-2">
              {optionalSeries.map(seriesKey => {
                const selected = settings.enabledSeries[seriesKey];
                return (
                  <button
                    key={seriesKey}
                    type="button"
                    className={`inline-flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                    onClick={() => onToggleSeries(seriesKey)}
                  >
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: TTE_SERIES_META[seriesKey].color }}
                    />
                    {TTE_SERIES_META[seriesKey].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Time window</span>
          <div className="flex flex-col gap-2">
            {TIME_FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onTimeFilterChange(option.value)}
                className={`rounded-lg border px-3 py-1.5 text-left text-xs font-medium ${
                  settings.timeFilter === option.value
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-slate-300"
            checked={settings.showLVEFOnly}
            onChange={event => onShowLVEFOnlyChange(event.target.checked)}
          />
          Show LVEF only
        </label>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Context overlays</span>
          <div className="grid grid-cols-2 gap-2">
            {contextToggleOrder.map(key => {
              const value = settings.contextBands[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={`rounded-lg border px-3 py-1 text-xs transition ${
                    value
                      ? 'border-slate-900 bg-slate-900/90 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                  onClick={() => onToggleContext(key)}
                >
                  {key.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
