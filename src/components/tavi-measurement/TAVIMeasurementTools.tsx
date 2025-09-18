import React from 'react';

interface TAVIMeasurementToolsProps {
  activeTool: 'height' | 'diameter' | null;
  onToolSelect: (tool: 'height' | 'diameter' | null) => void;
}

export const TAVIMeasurementTools: React.FC<TAVIMeasurementToolsProps> = ({
  activeTool,
  onToolSelect
}) => {
  return (
    <div className="tavi-measurement-tools">
      <div className="tools-header">
        <h3>Measurement Tools</h3>
        <p>Select a tool and click-drag on the image to measure</p>
      </div>

      <div className="tools-buttons">
        <button
          className={`tool-btn ${activeTool === 'height' ? 'active' : ''}`}
          onClick={() => onToolSelect(activeTool === 'height' ? null : 'height')}
        >
          <div className="tool-icon">📏</div>
          <div className="tool-label">Height</div>
          <div className="tool-description">Measure valve height</div>
        </button>

        <button
          className={`tool-btn ${activeTool === 'diameter' ? 'active' : ''}`}
          onClick={() => onToolSelect(activeTool === 'diameter' ? null : 'diameter')}
        >
          <div className="tool-icon">⭕</div>
          <div className="tool-label">Diameter</div>
          <div className="tool-description">Measure valve diameter</div>
        </button>

        {activeTool && (
          <button
            className="tool-btn cancel"
            onClick={() => onToolSelect(null)}
          >
            <div className="tool-icon">❌</div>
            <div className="tool-label">Cancel</div>
            <div className="tool-description">Deselect tool</div>
          </button>
        )}
      </div>

      <div className="measurement-instructions">
        {activeTool ? (
          <div className="instructions-active">
            <strong>Active: {activeTool} measurement</strong>
            <p>Click and drag on the image to draw a measurement line.</p>
            <p>The measurement will be calculated automatically with percentage of expected value.</p>
          </div>
        ) : (
          <div className="instructions-inactive">
            <p>Select a measurement tool above to begin measuring.</p>
            <p>Height measurements will show as H-L, H-R with percentage of expected values.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TAVIMeasurementTools;