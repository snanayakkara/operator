import React from 'react';
import type { TTETrendSeriesKey, TTETrendSettings } from '@/types/TTETrendTypes';
import { TIME_FILTER_OPTIONS, TTE_SERIES_META } from '@/config/tteTrendConfig';
import Button from '../buttons/Button';

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              className="!justify-between border-slate-300 bg-white text-slate-800 shadow-sm !h-auto py-1.5"
              disabled
            >
              <span>{TTE_SERIES_META.lvef.label}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">Default</span>
            </Button>
            <div className="flex flex-col gap-2">
              {optionalSeries.map(seriesKey => {
                const selected = settings.enabledSeries[seriesKey];
                return (
                  <Button
                    key={seriesKey}
                    type="button"
                    variant={selected ? 'primary' : 'outline'}
                    size="sm"
                    fullWidth
                    className={`!h-auto py-1.5 ${
                      selected
                        ? 'border-slate-900 bg-slate-900 hover:bg-slate-800'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                    onClick={() => onToggleSeries(seriesKey)}
                  >
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full mr-2"
                      style={{ backgroundColor: TTE_SERIES_META[seriesKey].color }}
                    />
                    {TTE_SERIES_META[seriesKey].label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Time window</span>
          <div className="flex flex-col gap-2">
            {TIME_FILTER_OPTIONS.map(option => (
              <Button
                key={option.value}
                type="button"
                onClick={() => onTimeFilterChange(option.value)}
                variant={settings.timeFilter === option.value ? 'primary' : 'outline'}
                size="sm"
                fullWidth
                className={`!justify-start !h-auto py-1.5 ${
                  settings.timeFilter === option.value
                    ? 'border-slate-900 bg-slate-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {option.label}
              </Button>
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
                <Button
                  key={key}
                  type="button"
                  variant={value ? 'primary' : 'outline'}
                  size="sm"
                  className={`!h-auto py-1 ${
                    value
                      ? 'border-slate-900 bg-slate-900/90'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                  onClick={() => onToggleContext(key)}
                >
                  {key.toUpperCase()}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
