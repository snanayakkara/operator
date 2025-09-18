import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TAVIMeasurementData,
  TAVIMeasurement,
  ValveTypeOption,
  MeasurementCoordinates
} from '@/types/medical.types';
import { TAVIMeasurementTools } from './TAVIMeasurementTools';

interface TAVIMeasurementViewProps {
  measurement: TAVIMeasurementData;
  valveType: ValveTypeOption;
  onBackToGrid: () => void;
  onMeasurementUpdate: (updatedMeasurement: TAVIMeasurementData) => void;
}

export const TAVIMeasurementView: React.FC<TAVIMeasurementViewProps> = ({
  measurement,
  valveType,
  onBackToGrid,
  onMeasurementUpdate
}) => {
  const [localMeasurement, setLocalMeasurement] = useState(measurement);
  const [activeTool, setActiveTool] = useState<'height' | 'diameter' | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const imageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Expected values for different valve types and measurements
  const getExpectedValue = useCallback((measurementType: string, label: string): number => {
    // These are example values - in real implementation, these would come from medical databases
    const expectedValues: Record<ValveTypeOption, Record<string, number>> = {
      'Edwards Sapien': {
        'H-L': 18.1,
        'H-R': 18.0,
        'diameter': 26.0
      },
      'Medtronic Evolut': {
        'H-L': 19.2,
        'H-R': 19.1,
        'diameter': 27.0
      },
      'Abbott Navitor': {
        'H-L': 17.8,
        'H-R': 17.9,
        'diameter': 25.5
      }
    };

    return expectedValues[valveType]?.[label] || 0;
  }, [valveType]);

  // Calculate percentage of expected value
  const calculatePercentage = useCallback((measured: number, expected: number): number => {
    if (expected === 0) return 0;
    return Math.round((measured / expected) * 100);
  }, []);

  // Handle mouse events for drawing measurements
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    setCurrentDrawing({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y
    });
  }, [activeTool]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentDrawing || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setCurrentDrawing(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, [isDrawing, currentDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentDrawing || !activeTool) return;

    // Calculate the measurement length in pixels, then convert to mm (this is a simplified calculation)
    const distance = Math.sqrt(
      Math.pow(currentDrawing.currentX - currentDrawing.startX, 2) +
      Math.pow(currentDrawing.currentY - currentDrawing.startY, 2)
    );

    // Convert to mm (this would need proper calibration in real implementation)
    const measurementValue = Math.round((distance * 0.5) * 10) / 10; // Simplified conversion

    const label = activeTool === 'height' ?
      `H-${localMeasurement.measurements.filter(m => m.type === 'height').length === 0 ? 'L' : 'R'}` :
      `D-${localMeasurement.measurements.filter(m => m.type === 'diameter').length + 1}`;

    const expectedValue = getExpectedValue(activeTool, label);
    const percentage = calculatePercentage(measurementValue, expectedValue);

    const newMeasurement: TAVIMeasurement = {
      id: `measurement-${Date.now()}`,
      type: activeTool,
      label,
      value: measurementValue,
      expectedValue,
      percentage,
      coordinates: {
        startX: currentDrawing.startX,
        startY: currentDrawing.startY,
        endX: currentDrawing.currentX,
        endY: currentDrawing.currentY
      }
    };

    const updatedMeasurement = {
      ...localMeasurement,
      measurements: [...localMeasurement.measurements, newMeasurement],
      completed: localMeasurement.measurements.length + 1 >= 2 // Mark as completed after 2 measurements
    };

    setLocalMeasurement(updatedMeasurement);
    onMeasurementUpdate(updatedMeasurement);

    // Reset drawing state
    setIsDrawing(false);
    setCurrentDrawing(null);
    setActiveTool(null);
  }, [isDrawing, currentDrawing, activeTool, localMeasurement, getExpectedValue, calculatePercentage, onMeasurementUpdate]);

  // Update canvas when measurements change
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = imageRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing measurements
    localMeasurement.measurements.forEach(measurement => {
      if (!measurement.coordinates) return;

      const startX = (measurement.coordinates.startX / 100) * canvas.width;
      const startY = (measurement.coordinates.startY / 100) * canvas.height;
      const endX = (measurement.coordinates.endX / 100) * canvas.width;
      const endY = (measurement.coordinates.endY / 100) * canvas.height;

      // Draw measurement line
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw measurement points
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.arc(startX, startY, 4, 0, 2 * Math.PI);
      ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px Arial';
      ctx.fillText(
        `${measurement.label}: ${measurement.value}mm (${measurement.percentage}%)`,
        Math.min(startX, endX),
        Math.min(startY, endY) - 10
      );
    });

    // Draw current drawing if active
    if (currentDrawing) {
      const startX = (currentDrawing.startX / 100) * canvas.width;
      const startY = (currentDrawing.startY / 100) * canvas.height;
      const endX = (currentDrawing.currentX / 100) * canvas.width;
      const endY = (currentDrawing.currentY / 100) * canvas.height;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [localMeasurement.measurements, currentDrawing]);

  const renderMeasurementsList = () => {
    if (localMeasurement.measurements.length === 0) {
      return (
        <div className="measurements-empty">
          <p>No measurements taken yet. Select a tool above to start measuring.</p>
        </div>
      );
    }

    return (
      <div className="measurements-list">
        <h3>Height Labels</h3>
        {localMeasurement.measurements
          .filter(m => m.type === 'height')
          .map(measurement => (
            <div key={measurement.id} className="measurement-item">
              <div className="measurement-label-text">
                {measurement.label}: {measurement.value}mm
                {measurement.percentage && (
                  <span className="measurement-percentage"> ({measurement.percentage}%)</span>
                )}
              </div>
              <div className="measurement-expected">
                Expected: {measurement.expectedValue}mm
              </div>
            </div>
          ))}

        {localMeasurement.measurements.filter(m => m.type === 'diameter').length > 0 && (
          <>
            <h3>Diameter Measurements</h3>
            {localMeasurement.measurements
              .filter(m => m.type === 'diameter')
              .map(measurement => (
                <div key={measurement.id} className="measurement-item">
                  <div className="measurement-label-text">
                    {measurement.label}: {measurement.value}mm
                    {measurement.percentage && (
                      <span className="measurement-percentage"> ({measurement.percentage}%)</span>
                    )}
                  </div>
                  <div className="measurement-expected">
                    Expected: {measurement.expectedValue}mm
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="tavi-measurement-view">
      {/* Header with narrow back button and prominent title */}
      <div className="measurement-view-header">
        <button
          className="back-to-grid-btn"
          onClick={onBackToGrid}
        >
          ← Back to Grid
        </button>
        <div className="measurement-view-title">
          <h1>{localMeasurement.view}</h1>
          <p className="measurement-subtitle">{localMeasurement.title}</p>
        </div>
      </div>

      <div className="measurement-view-content">
        <div className="measurement-image-section">
          <div className="measurement-tools-container">
            <TAVIMeasurementTools
              activeTool={activeTool}
              onToolSelect={setActiveTool}
            />
          </div>

          <div
            ref={imageRef}
            className="measurement-image-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDrawing(false);
              setCurrentDrawing(null);
            }}
          >
            {/* Medical image placeholder */}
            <div className="medical-image-placeholder">
              <div className="image-content">
                <div className="image-placeholder-icon">🏥</div>
                <p>Medical Image: {localMeasurement.view}</p>
                <p className="image-instructions">
                  {activeTool ?
                    `Click and drag to draw ${activeTool} measurement` :
                    'Select a measurement tool above'
                  }
                </p>
              </div>
            </div>

            {/* Measurement overlay canvas */}
            <canvas
              ref={canvasRef}
              className="measurement-canvas"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                width: '100%',
                height: '100%'
              }}
            />
          </div>
        </div>

        <div className="measurement-sidebar">
          {renderMeasurementsList()}

          <div className="measurement-actions">
            <button
              className="btn-primary measurement-complete"
              onClick={() => {
                const completedMeasurement = { ...localMeasurement, completed: true };
                setLocalMeasurement(completedMeasurement);
                onMeasurementUpdate(completedMeasurement);
              }}
              disabled={localMeasurement.measurements.length === 0}
            >
              Mark as Complete
            </button>

            <button
              className="btn-secondary clear-measurements"
              onClick={() => {
                const clearedMeasurement = { ...localMeasurement, measurements: [], completed: false };
                setLocalMeasurement(clearedMeasurement);
                onMeasurementUpdate(clearedMeasurement);
              }}
              disabled={localMeasurement.measurements.length === 0}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TAVIMeasurementView;