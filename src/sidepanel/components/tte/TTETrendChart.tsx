import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TTETrendRow, TTETrendSettings, TTETrendSeriesKey } from '@/types/TTETrendTypes';
import {
  TTE_SERIES_META,
  LVEF_CONTEXT_BANDS,
  RVSP_CONTEXT_BANDS,
  LVEDD_CONTEXT_BANDS,
  AVMPG_CONTEXT_BANDS,
  TAPSE_THRESHOLD
} from '@/config/tteTrendConfig';
import {
  buildSeries,
  buildMonthTicks,
  applyContextPadding,
  type SeriesPoint,
  type ChartTick
} from './TTETrendChart.helpers';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}

interface TTETrendChartProps {
  rows: TTETrendRow[];
  settings: TTETrendSettings;
  onPointClick?: (rowId: string, field: TTETrendSeriesKey) => void;
}

const MIN_POINTS_FOR_SCALE = 2;

export const TTETrendChart: React.FC<TTETrendChartProps> = ({ rows, settings, onPointClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, text: '' });
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });

  const primarySeries = useMemo(() => buildSeries(rows, 'lvef'), [rows]);
  const secondaryKey = useMemo<TTETrendSeriesKey | null>(() => {
    if (settings.showLVEFOnly) return null;
    const optionalKeys: TTETrendSeriesKey[] = ['rvsp', 'lvedd', 'avMpg', 'lavi'];
    const enabled = optionalKeys.find(key => settings.enabledSeries[key]);
    return enabled ?? null;
  }, [settings]);
  const secondarySeries = useMemo(() => (secondaryKey ? buildSeries(rows, secondaryKey) : []), [rows, secondaryKey]);

  const monthTicks = useMemo(() => {
    const allPoints = [...primarySeries, ...secondarySeries];
    if (allPoints.length === 0) return [];
    return buildMonthTicks(allPoints);
  }, [primarySeries, secondarySeries]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
      setDimensions({
        width: Math.max(320, width - 12),
        height: 360
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 48, right: secondaryKey ? 70 : 40, bottom: 64, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (primarySeries.length === 0 && secondarySeries.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No chartable metrics detected', width / 2, height / 2);
      return;
    }

    const allPrimaryValues = primarySeries.map(point => point.value);
    const primaryContext = settings.contextBands.lvef ? LVEF_CONTEXT_BANDS : [];
    const contextExtents = primaryContext.reduce(
      (acc, band) => {
        if (typeof band.min === 'number') acc.min = Math.min(acc.min, band.min);
        if (typeof band.max === 'number') acc.max = Math.max(acc.max, band.max);
        return acc;
      },
      { min: Math.min(...allPrimaryValues, 20), max: Math.max(...allPrimaryValues, 80) }
    );
    let primaryMin = Math.min(...allPrimaryValues, contextExtents.min);
    let primaryMax = Math.max(...allPrimaryValues, contextExtents.max);
    if (!Number.isFinite(primaryMin) || Number.isNaN(primaryMin)) primaryMin = 20;
    if (!Number.isFinite(primaryMax) || Number.isNaN(primaryMax)) primaryMax = 80;
    ({ min: primaryMin, max: primaryMax } = applyContextPadding(primaryMin, primaryMax));
    primaryMin = Math.min(primaryMin, 0);
    primaryMax = Math.max(primaryMax, 90);

    const secondaryValues = secondarySeries.map(point => point.value);
    let secondaryMin = secondaryValues.length > 0 ? Math.min(...secondaryValues) : 0;
    let secondaryMax = secondaryValues.length > 0 ? Math.max(...secondaryValues) : 0;
    if (secondaryKey && secondaryValues.length >= MIN_POINTS_FOR_SCALE) {
      const contextBands = secondaryKey === 'rvsp'
        ? RVSP_CONTEXT_BANDS
        : secondaryKey === 'lvedd'
          ? LVEDD_CONTEXT_BANDS
          : secondaryKey === 'avMpg'
            ? AVMPG_CONTEXT_BANDS
            : [];
      contextBands.forEach(band => {
        if (typeof band.min === 'number') secondaryMin = Math.min(secondaryMin, band.min);
        if (typeof band.max === 'number') secondaryMax = Math.max(secondaryMax, band.max);
      });
      ({ min: secondaryMin, max: secondaryMax } = applyContextPadding(secondaryMin, secondaryMax));
      if (secondaryKey === 'rvsp') secondaryMin = Math.max(secondaryMin, 0);
    } else if (secondaryKey) {
      secondaryMin = 0;
      secondaryMax = secondaryKey === 'rvsp'
        ? 80
        : secondaryKey === 'lvedd'
          ? 70
          : secondaryKey === 'avMpg'
            ? 60
            : 120;
    }

    const sortedTicks = monthTicks.length > 0 ? monthTicks : buildMonthTicks(primarySeries);

    const startTick = sortedTicks[0]?.date ?? primarySeries[0]?.date ?? secondarySeries[0]?.date ?? new Date();
    const endTick = sortedTicks.at(-1)?.date ?? primarySeries.at(-1)?.date ?? secondarySeries.at(-1)?.date ?? new Date(startTick);

    const getX = (date: Date) => {
      const totalMs = endTick.getTime() - startTick.getTime() || 1;
      const offset = date.getTime() - startTick.getTime();
      return padding.left + (offset / totalMs) * chartWidth;
    };
    const getPrimaryY = (value: number) =>
      padding.top + chartHeight - ((value - primaryMin) / (primaryMax - primaryMin || 1)) * chartHeight;
    const getSecondaryY = (value: number) =>
      padding.top + chartHeight - ((value - secondaryMin) / (secondaryMax - secondaryMin || 1)) * chartHeight;

    // Draw background grid and axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    sortedTicks.forEach((tick, index) => {
      const x =
        sortedTicks.length === 1
          ? padding.left + chartWidth / 2
          : padding.left + (index / (sortedTicks.length - 1)) * chartWidth;
      ctx.fillText(tick.label, x, padding.top + chartHeight + 12);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    });

    ctx.save();

    // Context bands for primary (LVEF)
    if (settings.contextBands.lvef) {
      LVEF_CONTEXT_BANDS.forEach(band => {
        const yTop = band.max != null ? getPrimaryY(band.max) : padding.top;
        const yBottom = band.min != null ? getPrimaryY(band.min) : padding.top + chartHeight;
        ctx.fillStyle = band.color;
        ctx.fillRect(padding.left, Math.min(yTop, yBottom), chartWidth, Math.abs(yBottom - yTop));
        ctx.fillStyle = '#475569';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(band.label, padding.left + 6, Math.min(yTop, yBottom) + 10);
      });
    }

    // Context bands for secondary
    if (secondaryKey && settings.contextBands[secondaryKey]) {
      const bands =
        secondaryKey === 'rvsp'
          ? RVSP_CONTEXT_BANDS
          : secondaryKey === 'lvedd'
            ? LVEDD_CONTEXT_BANDS
            : secondaryKey === 'avMpg'
              ? AVMPG_CONTEXT_BANDS
              : [];
      bands.forEach(band => {
        const yTop = band.max != null ? getSecondaryY(band.max) : padding.top;
        const yBottom = band.min != null ? getSecondaryY(band.min) : padding.top + chartHeight;
        ctx.fillStyle = band.color;
        ctx.fillRect(padding.left, Math.min(yTop, yBottom), chartWidth, Math.abs(yBottom - yTop));
        ctx.fillStyle = '#475569';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(band.label, padding.left + chartWidth - 6, Math.min(yTop, yBottom) + 10);
        ctx.textAlign = 'left';
      });
    }

    ctx.restore();

    // Axis labels
    ctx.fillStyle = '#0f172a';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Month', padding.left + chartWidth / 2, padding.top + chartHeight + 42);
    ctx.save();
    ctx.translate(20, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('LVEF / EF (%)', 0, 0);
    ctx.restore();

    if (secondaryKey) {
      ctx.save();
      ctx.translate(width - 18, padding.top + chartHeight / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(TTE_SERIES_META[secondaryKey].label, 0, 0);
      ctx.restore();
    }

    // Draw TAPSE marker if applicable
    if (settings.contextBands.tapse) {
      const tapseRow = [...rows]
        .filter(row => row.tapse && row.tapse.type === 'numeric')
        .sort((a, b) => (a.dateIso && b.dateIso ? a.dateIso.localeCompare(b.dateIso) : 0))
        .at(-1);
      if (tapseRow && tapseRow.tapse && tapseRow.tapse.type === 'numeric') {
        const value = TAPSE_THRESHOLD.value;
        const y = secondaryKey ? getSecondaryY(value) : getPrimaryY(value);
        ctx.save();
        ctx.setLineDash(TAPSE_THRESHOLD.dash ?? [5, 5]);
        ctx.strokeStyle = TAPSE_THRESHOLD.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = TAPSE_THRESHOLD.color;
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(TAPSE_THRESHOLD.label, padding.left + chartWidth - 6, y - 6);
      }
    }

    // Helper to draw series
    const drawSeries = (points: SeriesPoint[], key: TTETrendSeriesKey, yMapper: (value: number) => number) => {
      if (points.length === 0) return;
      const meta = TTE_SERIES_META[key];
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = getX(point.date);
        const y = yMapper(point.value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      points.forEach(point => {
        const x = getX(point.date);
        const y = yMapper(point.value);
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = meta.color;
        ctx.lineWidth = 2;
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    };

    drawSeries(primarySeries, 'lvef', getPrimaryY);
    if (secondaryKey) {
      drawSeries(secondarySeries, secondaryKey, secondaryKey === 'lvef' ? getPrimaryY : getSecondaryY);
    }

    // Y-axis tick labels
    ctx.fillStyle = '#475569';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    const ySteps = 6;
    for (let i = 0; i <= ySteps; i += 1) {
      const value = primaryMin + (i / ySteps) * (primaryMax - primaryMin);
      const y = getPrimaryY(value);
      ctx.fillText(`${value.toFixed(0)}`, padding.left - 6, y + 3);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    if (secondaryKey) {
      ctx.textAlign = 'left';
      for (let i = 0; i <= ySteps; i += 1) {
        const value = secondaryMin + (i / ySteps) * (secondaryMax - secondaryMin);
        const y = getSecondaryY(value);
        ctx.fillText(`${value.toFixed(0)}`, padding.left + chartWidth + 6, y + 3);
      }
    }

    // Legend
    const legendItems: Array<{ label: string; color: string }> = [
      { label: TTE_SERIES_META.lvef.label, color: TTE_SERIES_META.lvef.color }
    ];
    if (secondaryKey && secondaryKey !== 'lvef') {
      legendItems.push({ label: TTE_SERIES_META[secondaryKey].label, color: TTE_SERIES_META[secondaryKey].color });
    }

    const legendX = padding.left;
    const legendY = padding.top - 32;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    legendItems.forEach((item, idx) => {
      const x = legendX;
      const y = legendY + idx * 16;
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, 28, 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.label, x + 36, y + 4);
    });

    const handlePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      const hovered = [...primarySeries, ...secondarySeries].find(point => {
        const px = getX(point.date);
        const py = point.field === 'lvef' ? getPrimaryY(point.value) : getSecondaryY(point.value);
        const distance = Math.sqrt((px * dpr - x) ** 2 + (py * dpr - y) ** 2);
        return distance < 12;
      });

      if (hovered) {
        const label = hovered.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        const value = hovered.value.toFixed(TTE_SERIES_META[hovered.field].precision);
        const site = hovered.row.site ? ` · ${hovered.row.site}` : '';
        setTooltip({
          visible: true,
          x: getX(hovered.date),
          y: hovered.field === 'lvef' ? getPrimaryY(hovered.value) : getSecondaryY(hovered.value),
          text: `${label}${site}\n${TTE_SERIES_META[hovered.field].label.split(' ')[0]} ${value}`
        });
        canvas.style.cursor = 'pointer';
      } else {
        setTooltip(prev => (prev.visible ? { ...prev, visible: false } : prev));
        canvas.style.cursor = 'default';
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!onPointClick) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const hovered = [...primarySeries, ...secondarySeries].find(point => {
        const px = getX(point.date);
        const py = point.field === 'lvef' ? getPrimaryY(point.value) : getSecondaryY(point.value);
        const distance = Math.sqrt((px * dpr - x) ** 2 + (py * dpr - y) ** 2);
        return distance < 14;
      });
      if (hovered) {
        onPointClick(hovered.row.id, hovered.field);
      }
    };

    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('pointermove', handlePointer);
      canvas.removeEventListener('click', handleClick);
    };
  }, [dimensions, primarySeries, secondarySeries, secondaryKey, monthTicks, onPointClick, rows, settings]);

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas ref={canvasRef} className="w-full rounded-xl border border-slate-200 bg-white shadow-sm" />
      {tooltip.visible && (
        <div
          className="absolute z-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.text.split('\n').map(line => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};
