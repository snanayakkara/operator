import React from 'react';
import type { LipidChartSettings, LipidAnalyte, LipidTimeFilter } from '@/types/LipidTypes';
import { DEFAULT_LIPID_FRAMEWORK_ID, LIPID_OVERLAY_FRAMEWORKS } from '@/config/lipidOverlays';

interface LipidControlsPanelProps {
  settings: LipidChartSettings;
  onChange: (settings: LipidChartSettings) => void;
  availableAnalytes: LipidAnalyte[];
}

const TIME_FILTER_LABELS: Record<LipidTimeFilter, string> = {
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  all: 'All data'
};

export const LipidControlsPanel: React.FC<LipidControlsPanelProps> = ({
  settings,
  onChange,
  availableAnalytes
}) => {
  const overlay = LIPID_OVERLAY_FRAMEWORKS[settings.framework] ?? LIPID_OVERLAY_FRAMEWORKS[DEFAULT_LIPID_FRAMEWORK_ID];

  const handleFrameworkChange = (frameworkId: string) => {
    const framework = LIPID_OVERLAY_FRAMEWORKS[frameworkId] ?? overlay;
    onChange({
      ...settings,
      framework: framework.id as typeof settings.framework,
      selectedBandId: framework.bands[0]?.id ?? settings.selectedBandId
    });
  };

  const handleBandChange = (bandId: string) => {
    onChange({
      ...settings,
      selectedBandId: bandId
    });
  };

  const handleTimeFilterChange = (filter: LipidTimeFilter) => {
    onChange({ ...settings, timeFilter: filter });
  };

  const toggleAnalyte = (analyte: LipidAnalyte) => {
    const next = settings.selectedAnalytes.includes(analyte)
      ? settings.selectedAnalytes.filter(item => item !== analyte)
      : [...settings.selectedAnalytes, analyte];
    onChange({ ...settings, selectedAnalytes: next });
  };

  return (
    <div className="grid gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Guideline overlay</h4>
        <div className="flex flex-col gap-2">
          <select
            value={settings.framework}
            onChange={(event) => handleFrameworkChange(event.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.values(LIPID_OVERLAY_FRAMEWORKS).map(framework => (
              <option key={framework.id} value={framework.id}>
                {framework.name}
              </option>
            ))}
          </select>
          <select
            value={settings.selectedBandId}
            onChange={(event) => handleBandChange(event.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {overlay.bands.map(band => (
              <option key={band.id} value={band.id}>
                {band.label}
              </option>
            ))}
          </select>
          {overlay.allowCustomPrimaryTarget && settings.selectedBandId === 'primary-custom' && (
            <div className="flex items-center gap-2">
              <label htmlFor="customTarget" className="text-xs text-gray-600">Target &lt;</label>
              <input
                id="customTarget"
                type="number"
                step={0.1}
                min={1}
                value={settings.customPrimaryTarget ?? overlay.bands.find(b => b.id === 'primary-custom')?.threshold ?? 2.0}
                onChange={(event) => {
                  const value = parseFloat(event.target.value || '0');
                  onChange({ ...settings, customPrimaryTarget: Number.isFinite(value) ? value : undefined });
                }}
                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-xs text-gray-500">mmol/L</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Time filter</h4>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIME_FILTER_LABELS) as LipidTimeFilter[]).map(filter => (
            <button
              key={filter}
              onClick={() => handleTimeFilterChange(filter)}
              className={`px-3 py-1.5 rounded-lg border text-xs ${settings.timeFilter === filter ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              type="button"
            >
              {TIME_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Series</h4>
        <div className="flex flex-wrap gap-2">
          {availableAnalytes.map(analyte => {
            const active = settings.selectedAnalytes.includes(analyte);
            return (
              <button
                key={analyte}
                type="button"
                onClick={() => toggleAnalyte(analyte)}
                className={`px-3 py-1.5 rounded-lg border text-xs ${active ? 'border-gray-900 text-gray-900 bg-gray-100' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {analyte.toUpperCase()}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={settings.ldlOnlyView}
            onChange={(event) => onChange({ ...settings, ldlOnlyView: event.target.checked })}
            className="rounded border-gray-300"
          />
          LDL-only focus
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={settings.showTherapyBands}
            onChange={(event) => onChange({ ...settings, showTherapyBands: event.target.checked })}
            className="rounded border-gray-300"
          />
          Show therapy phase bands
        </label>
      </div>
    </div>
  );
};
