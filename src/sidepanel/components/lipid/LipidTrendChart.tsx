import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { LipidResult, LipidChartSettings, LipidOverlayConfig, TherapyPhase, LipidAnalyte } from '@/types/LipidTypes';

interface LipidTrendChartProps {
  readings: LipidResult[];
  settings: LipidChartSettings;
  overlay: LipidOverlayConfig;
  therapyPhases: TherapyPhase[];
  onPointClick?: (reading: LipidResult) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  reading?: LipidResult;
}

const ANALYTE_COLORS: Record<LipidAnalyte, string> = {
  tchol: '#111827',    // Total cholesterol - charcoal/ink primary
  ldl: '#dc2626',      // LDL-C - clinical emphasis red
  tg: '#ea580c',       // Triglycerides - orange accent
  hdl: '#0284c7',      // HDL - teal/blue accent
  apob: '#7c3aed',     // ApoB - violet accent
  nonHDL: '#2563eb'    // Non-HDL - blue accent
};

function getAnalyteValue(reading: LipidResult, analyte: LipidAnalyte): number | undefined {
  switch (analyte) {
    case 'ldl':
      return reading.ldl ?? undefined;
    case 'tchol':
      return reading.tchol ?? undefined;
    case 'hdl':
      return reading.hdl ?? undefined;
    case 'tg':
      return reading.tg ?? undefined;
    case 'apob':
      return reading.apob ?? undefined;
    case 'nonHDL':
      return reading.nonHDL ?? undefined;
    default:
      return undefined;
  }
}

function parseDate(date: string): Date {
  return new Date(date);
}

function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonth(date: Date): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function formatTooltip(reading?: LipidResult): string {
  if (!reading) return '';
  const date = new Date(reading.date);
  const dateText = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const values: string[] = [];
  if (reading.ldl != null) values.push(`LDL ${reading.ldl.toFixed(1)}`);
  if (reading.tchol != null) values.push(`TChol ${reading.tchol.toFixed(1)}`);
  if (reading.hdl != null) values.push(`HDL ${reading.hdl.toFixed(1)}`);
  if (reading.nonHDL != null) values.push(`Non-HDL ${reading.nonHDL.toFixed(1)}`);
  return `${dateText}\n${values.join(' · ')}`;
}

export const LipidTrendChart: React.FC<LipidTrendChartProps> = ({
  readings,
  settings,
  overlay,
  therapyPhases,
  onPointClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 340 });

  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      setDimensions({
        width: Math.max(420, width - 12),
        height: 340
      });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const datasets = useMemo<LipidAnalyte[]>(() => {
    return settings.ldlOnlyView ? (['ldl'] as LipidAnalyte[]) : settings.selectedAnalytes;
  }, [settings.ldlOnlyView, settings.selectedAnalytes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || readings.length === 0) return;

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

    const padding = { top: 40, right: 70, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const withLDL = readings.filter(r => datasets.some(analyte => getAnalyteValue(r, analyte) != null));
    if (withLDL.length === 0) return;

    const values = withLDL.flatMap(r =>
      datasets
        .map(analyte => getAnalyteValue(r, analyte) ?? null)
        .filter((val): val is number => val != null)
    );
    const minValue = 0;
    const maxValue = Math.max(...values, overlay.bands.reduce((acc, band) => Math.max(acc, band.threshold), 0) + 0.5);

    const sortedDates = readings.map(r => parseDate(r.date));
    sortedDates.sort((a, b) => a.getTime() - b.getTime());
    const startMonth = getMonthStart(sortedDates[0]);
    const endMonth = getMonthStart(sortedDates[sortedDates.length - 1]);

    const monthTicks: Date[] = [];
    let cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      monthTicks.push(new Date(cursor));
      cursor = addMonth(cursor);
    }
    if (monthTicks.length === 1) {
      monthTicks.push(addMonth(monthTicks[0]));
    }

    const totalMonths = monthTicks.length - 1 || 1;

    const getX = (date: Date) => {
      const monthIndex = monthTicks.findIndex(tick => tick.getUTCFullYear() === date.getUTCFullYear() && tick.getUTCMonth() === date.getUTCMonth());
      if (monthIndex >= 0) {
        const intraMonth =
          (date.getUTCDate() - 1) / new Date(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getUTCDate();
        return padding.left + ((monthIndex + intraMonth) / totalMonths) * chartWidth;
      }

      const monthsFromStart =
        (date.getUTCFullYear() - monthTicks[0].getUTCFullYear()) * 12 +
        (date.getUTCMonth() - monthTicks[0].getUTCMonth());
      return padding.left + (monthsFromStart / totalMonths) * chartWidth;
    };

    const getY = (value: number) => {
      return padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    };

    const drawAxes = () => {
      ctx.strokeStyle = '#cbd5f5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      monthTicks.forEach((tick, index) => {
        const x = padding.left + (index / totalMonths) * chartWidth;
        ctx.fillText(tick.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), x, padding.top + chartHeight + 10);
        ctx.beginPath();
        ctx.strokeStyle = '#e5e7eb';
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      });

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const ySteps = 6;
      for (let i = 0; i <= ySteps; i += 1) {
        const value = minValue + (i / ySteps) * (maxValue - minValue);
        const y = getY(value);
        ctx.fillText(value.toFixed(1), padding.left - 6, y);
        ctx.beginPath();
        ctx.strokeStyle = '#eef2ff';
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }
    };

    const drawOverlayBands = () => {
      ctx.save();
      overlay.bands.forEach(band => {
        const y = getY(band.threshold);
        const heightSegment = padding.top + chartHeight - y;
        if (heightSegment > 0) {
          ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
          ctx.fillRect(padding.left, y, chartWidth, heightSegment);
        }
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        ctx.fillStyle = '#1d4ed8';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(`${band.label}`, padding.left + chartWidth, y - 4);
      });
      ctx.restore();
    };

    const drawTherapyBands = () => {
      if (!settings.showTherapyBands || therapyPhases.length === 0) return;
      ctx.save();
      therapyPhases.forEach(phase => {
        const start = parseDate(phase.startDate);
        const end = phase.endDate ? parseDate(phase.endDate) : endMonth;
        const xStart = getX(start);
        const xEnd = getX(end);
        const bandWidth = Math.max(6, xEnd - xStart);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.14)';
        ctx.fillRect(xStart, padding.top, bandWidth, chartHeight);
        ctx.strokeStyle = 'rgba(22, 163, 74, 0.4)';
        ctx.strokeRect(xStart, padding.top, bandWidth, chartHeight);
        ctx.fillStyle = 'rgba(22, 163, 74, 0.85)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(phase.label, xStart + 6, padding.top + 12);
      });
      ctx.restore();
    };

    const plotSeries = () => {
      datasets.forEach(analyte => {
        ctx.beginPath();
        ctx.lineWidth = analyte === 'ldl' ? 2.4 : 1.8;
        ctx.strokeStyle = ANALYTE_COLORS[analyte];
        ctx.fillStyle = ANALYTE_COLORS[analyte];
        let started = false;

        readings.forEach(reading => {
          const value = getAnalyteValue(reading, analyte);
          if (value == null) return;
          const x = getX(parseDate(reading.date));
          const y = getY(value);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();

        readings.forEach(reading => {
          const value = getAnalyteValue(reading, analyte);
          if (value == null) return;
          const x = getX(parseDate(reading.date));
          const y = getY(value);
          ctx.beginPath();
          ctx.arc(x, y, analyte === 'ldl' ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    };

    drawOverlayBands();
    drawTherapyBands();
    drawAxes();
    plotSeries();
  }, [readings, dimensions, overlay, therapyPhases, datasets, settings.showTherapyBands]);

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const { width, height } = dimensions;
    const padding = { top: 40, right: 70, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const sortedDates = readings.map(r => parseDate(r.date));
    sortedDates.sort((a, b) => a.getTime() - b.getTime());
    const startMonth = getMonthStart(sortedDates[0]);
    const endMonth = getMonthStart(sortedDates[sortedDates.length - 1]);
    const monthTicks: Date[] = [];
    let cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      monthTicks.push(new Date(cursor));
      cursor = addMonth(cursor);
    }
    if (monthTicks.length === 1) {
      monthTicks.push(addMonth(monthTicks[0]));
    }
    const totalMonths = monthTicks.length - 1 || 1;

    const hitRadius = 8;
    let closest: { reading: LipidResult; distance: number } | null = null;

    const ldlValues = readings.filter(r => r.ldl != null).map(r => r.ldl!) as number[];
    if (ldlValues.length === 0) return;
    const minValue = Math.max(0, Math.min(...ldlValues) - 0.5);
    const maxValue = Math.max(...ldlValues, overlay.bands.reduce((acc, band) => Math.max(acc, band.threshold), 0) + 0.5);

    readings.forEach(reading => {
      if (reading.ldl == null) return;
      const date = parseDate(reading.date);
      const monthsFromStart =
        (date.getUTCFullYear() - monthTicks[0].getUTCFullYear()) * 12 +
        (date.getUTCMonth() - monthTicks[0].getUTCMonth()) +
        (date.getUTCDate() - 1) / 30;
      const px = padding.left + (monthsFromStart / totalMonths) * chartWidth;
      const py = padding.top + chartHeight - ((reading.ldl - minValue) / (maxValue - minValue)) * chartHeight;
      const distance = Math.hypot(px - x, py - y);
      if (distance < hitRadius && (!closest || distance < closest.distance)) {
        closest = { reading, distance };
      }
    });

    if (closest !== null) {
      const { reading } = closest;
      setTooltip({
        visible: true,
        x,
        y,
        reading
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleClick: React.MouseEventHandler<HTMLCanvasElement> = () => {
    if (tooltip && tooltip.visible && tooltip.reading && onPointClick) {
      onPointClick(tooltip.reading);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="w-full h-[340px] cursor-crosshair select-none border border-gray-200 rounded-xl bg-white shadow-sm"
      />
      {tooltip && tooltip.visible && tooltip.reading && (
        <div
          className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs text-gray-700 whitespace-pre-line"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {formatTooltip(tooltip.reading)}
          {tooltip.reading.therapyNote ? `\n(${tooltip.reading.therapyNote})` : ''}
          {tooltip.reading.source ? `\n${tooltip.reading.source}` : ''}
        </div>
      )}
    </div>
  );
};
