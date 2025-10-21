/**
 * BP Chart Component
 *
 * Interactive line chart for BP diary readings with:
 * - Hover tooltips showing SBP/DBP/HR at any point
 * - Optional reference lines (135/85 guidelines)
 * - Copy to clipboard functionality
 * - Monochrome design with accessible colors
 */

/* eslint-disable no-undef */
import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { BPReading } from '@/types/BPTypes';
import { ToastService } from '@/services/ToastService';

interface BPChartProps {
  readings: BPReading[];
  showReferenceLines?: boolean;
  referenceSBP?: number;
  referenceDBP?: number;
  width?: number;
  height?: number;
}

export interface BPChartHandle {
  copyToClipboard: () => Promise<void>;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  reading: BPReading;
  index: number;
}

export const BPChart = forwardRef<BPChartHandle, BPChartProps>(({
  readings,
  showReferenceLines = true,
  referenceSBP = 130,
  referenceDBP = 80,
  width: propWidth,
  height: propHeight
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth || 600, height: propHeight || 350 });

  // Expose clipboard copy method to parent
  useImperativeHandle(ref, () => ({
    copyToClipboard: async () => {
      await copyChartToClipboard();
    }
  }));

  // Detect container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setDimensions({
          width: propWidth || Math.max(400, containerWidth - 20),
          height: propHeight || 350
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [propWidth, propHeight]);

  // Draw chart whenever data or settings change
  useEffect(() => {
    drawChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, showReferenceLines, referenceSBP, referenceDBP, dimensions]);

  /**
   * Main chart drawing function
   */
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || readings.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;

    // Set canvas size for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const padding = { top: 30, right: 60, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate data ranges
    const sbps = readings.map(r => r.sbp);
    const dbps = readings.map(r => r.dbp);
    const allValues = [...sbps, ...dbps];

    if (showReferenceLines) {
      allValues.push(referenceSBP, referenceDBP);
    }

    const minValue = Math.floor(Math.min(...allValues) / 10) * 10 - 10;
    const maxValue = Math.ceil(Math.max(...allValues) / 10) * 10 + 10;

    // Helper functions
    const getX = (index: number) => padding.left + (index / (readings.length - 1)) * chartWidth;
    const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

    // Draw reference lines if enabled
    if (showReferenceLines) {
      drawReferenceLine(ctx, getY(referenceSBP), `SBP ${referenceSBP}`, '#94a3b8', padding, chartWidth);
      drawReferenceLine(ctx, getY(referenceDBP), `DBP ${referenceDBP}`, '#94a3b8', padding, chartWidth);
    }

    // Draw axes
    drawAxes(ctx, padding, chartWidth, chartHeight, minValue, maxValue, readings, height);

    // Draw SBP line (darker for emphasis)
    drawLine(ctx, readings, sbps, getX, getY, '#1e293b', 'SBP');

    // Draw DBP line (lighter)
    drawLine(ctx, readings, dbps, getX, getY, '#475569', 'DBP');

    // Draw data points
    readings.forEach((reading, index) => {
      const x = getX(index);
      drawPoint(ctx, x, getY(reading.sbp), '#1e293b');
      drawPoint(ctx, x, getY(reading.dbp), '#475569');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, showReferenceLines, referenceSBP, referenceDBP, dimensions]);

  /**
   * Redraw chart with highlighted point
   */
  const redrawWithHighlight = useCallback((highlightIndex: number | null) => {
    drawChart();

    if (highlightIndex === null || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const padding = { top: 30, right: 60, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const sbps = readings.map(r => r.sbp);
    const dbps = readings.map(r => r.dbp);
    const allValues = [...sbps, ...dbps];
    if (showReferenceLines) {
      allValues.push(referenceSBP, referenceDBP);
    }
    const minValue = Math.floor(Math.min(...allValues) / 10) * 10 - 10;
    const maxValue = Math.ceil(Math.max(...allValues) / 10) * 10 + 10;

    const getX = (index: number) => padding.left + (index / (readings.length - 1)) * chartWidth;
    const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

    const reading = readings[highlightIndex];
    const x = getX(highlightIndex);

    // Draw highlight circles
    ctx.beginPath();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
    ctx.arc(x, getY(reading.sbp), 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(71, 85, 105, 0.2)';
    ctx.arc(x, getY(reading.dbp), 8, 0, Math.PI * 2);
    ctx.fill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, showReferenceLines, referenceSBP, referenceDBP, dimensions]);

  /**
   * Draw a line series
   */
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    readings: BPReading[],
    values: number[],
    getX: (i: number) => number,
    getY: (v: number) => number,
    color: string,
    _label: string
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    readings.forEach((_, index) => {
      const x = getX(index);
      const y = getY(values[index]);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  /**
   * Draw a data point
   */
  const drawPoint = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  /**
   * Draw reference line
   */
  const drawReferenceLine = (
    ctx: CanvasRenderingContext2D,
    y: number,
    label: string,
    color: string,
    padding: any,
    chartWidth: number
  ) => {
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label - positioned inside chart area on the left
    ctx.fillStyle = color;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, padding.left + 5, y - 5);
    ctx.restore();
  };

  /**
   * Draw axes with labels
   */
  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    padding: any,
    chartWidth: number,
    chartHeight: number,
    minValue: number,
    maxValue: number,
    readings: BPReading[],
    canvasHeight: number
  ) => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = minValue + (maxValue - minValue) * (i / ySteps);
      const y = padding.top + chartHeight - (i / ySteps) * chartHeight;
      ctx.fillText(Math.round(value).toString(), padding.left - 10, y + 4);
    }

    // X-axis labels (date + time) - show every nth label to avoid overlap
    ctx.textAlign = 'center';
    ctx.font = '9px sans-serif';
    const labelInterval = Math.max(1, Math.ceil(readings.length / 6)); // Show max 6 labels to avoid crowding
    readings.forEach((reading, index) => {
      if (index % labelInterval === 0 || index === readings.length - 1) {
        const x = padding.left + (index / (readings.length - 1)) * chartWidth;
        const date = new Date(reading.date);
        const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;

        // Show date on first line, time on second line
        ctx.fillText(dateLabel, x, padding.top + chartHeight + 15);
        ctx.font = '8px monospace';
        ctx.fillText(reading.time, x, padding.top + chartHeight + 27);
        ctx.font = '9px sans-serif';
      }
    });

    // Axis titles
    ctx.save();
    ctx.translate(12, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('Blood Pressure (mmHg)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Date & Time', padding.left + chartWidth / 2, canvasHeight - 10);
  };

  /**
   * Handle mouse move for tooltip
   */
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (readings.length === 0) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;

    const { width } = dimensions;
    const padding = { top: 30, right: 60, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;

    // Check if mouse is within chart area
    if (x < padding.left || x > padding.left + chartWidth) {
      setTooltip(null);
      return;
    }

    // Find nearest reading
    const relativeX = x - padding.left;
    const index = Math.round((relativeX / chartWidth) * (readings.length - 1));
    const clampedIndex = Math.max(0, Math.min(index, readings.length - 1));

    const reading = readings[clampedIndex];

    // Highlight the actual data point
    redrawWithHighlight(clampedIndex);

    // Calculate exact position of the data point
    const dataPointX = padding.left + (clampedIndex / (readings.length - 1)) * chartWidth;

    // Calculate tooltip position relative to container, with boundary checks
    const tooltipWidth = 140;
    const tooltipHeight = 80;
    let tooltipX = dataPointX + 10;
    let tooltipY = event.clientY - containerRect.top - tooltipHeight;

    // Keep tooltip within container bounds
    if (tooltipX + tooltipWidth > containerRect.width) {
      tooltipX = dataPointX - tooltipWidth - 10;
    }
    if (tooltipY < 0) {
      tooltipY = event.clientY - containerRect.top + 10;
    }

    setTooltip({
      visible: true,
      x: tooltipX,
      y: tooltipY,
      reading,
      index: clampedIndex
    });
  }, [readings, dimensions, redrawWithHighlight]);

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    redrawWithHighlight(null);
  }, [redrawWithHighlight]);

  /**
   * Copy chart to clipboard as PNG
   */
  const copyChartToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      ToastService.getInstance().error('Copy failed', 'Chart not available');
      return;
    }

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create image'));
          },
          'image/png',
          1.0
        );
      });

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      ToastService.getInstance().success(
        'Chart copied',
        'Paste into your document with Cmd+V (Mac) or Ctrl+V (Windows)'
      );

    } catch (error) {
      console.error('Failed to copy chart:', error);
      ToastService.getInstance().error(
        'Copy failed',
        'Your browser may not support clipboard images'
      );
    }
  };

  if (readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-sm">No readings to display</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          className="absolute z-50 bg-white border-2 border-gray-800 rounded shadow-lg p-2 pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            minWidth: '140px'
          }}
        >
          <div className="text-[10px] font-semibold text-gray-900 mb-1">
            {new Date(tooltip.reading.date).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short'
            })} <span className="font-mono">{tooltip.reading.time}</span>
          </div>
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-600">SBP:</span>
              <span className="font-semibold text-gray-900">{tooltip.reading.sbp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DBP:</span>
              <span className="font-semibold text-gray-900">{tooltip.reading.dbp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HR:</span>
              <span className="font-semibold text-gray-900">{tooltip.reading.hr}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

BPChart.displayName = 'BPChart';
