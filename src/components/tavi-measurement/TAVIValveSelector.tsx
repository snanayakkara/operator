import React, { useState } from 'react';
import { ValveTypeOption } from '@/types/medical.types';

interface TAVIValveSelectorProps {
  selectedValve: ValveTypeOption;
  onValveChange: (valve: ValveTypeOption) => void;
  nativePerimeter: number;
  nativeArea: number;
  onNativePerimeterChange: (value: number) => void;
  onNativeAreaChange: (value: number) => void;
  balloonVolume: number;
  onBalloonVolumeChange: (value: number) => void;
}

export const TAVIValveSelector: React.FC<TAVIValveSelectorProps> = ({
  selectedValve,
  onValveChange,
  nativePerimeter,
  nativeArea,
  onNativePerimeterChange,
  onNativeAreaChange,
  balloonVolume,
  onBalloonVolumeChange
}) => {
  const [isEditingBalloonVolume, setIsEditingBalloonVolume] = useState(false);

  const valveOptions: ValveTypeOption[] = [
    'Edwards Sapien',
    'Medtronic Evolut',
    'Abbott Navitor'
  ];

  const handleBalloonVolumeClick = () => {
    setIsEditingBalloonVolume(true);
  };

  const handleBalloonVolumeBlur = () => {
    setIsEditingBalloonVolume(false);
  };

  const handleBalloonVolumeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingBalloonVolume(false);
    }
  };

  return (
    <div className="tavi-valve-selector">
      <div className="selector-section">
        <div className="selector-row">
          <div className="form-group valve-type-group">
            <label htmlFor="valve-type">Valve Type</label>
            <select
              id="valve-type"
              className="valve-type-dropdown"
              value={selectedValve}
              onChange={(e) => onValveChange(e.target.value as ValveTypeOption)}
            >
              {valveOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group native-measurements">
            <div className="native-field">
              <label htmlFor="native-perimeter">Native Perimeter</label>
              <div className="input-with-unit">
                <input
                  id="native-perimeter"
                  type="number"
                  value={nativePerimeter}
                  onChange={(e) => onNativePerimeterChange(parseInt(e.target.value) || 0)}
                  placeholder="75"
                  min="0"
                  step="1"
                />
                <span className="unit">mm</span>
              </div>
            </div>

            <div className="native-field">
              <label htmlFor="native-area">Native Area</label>
              <div className="input-with-unit">
                <input
                  id="native-area"
                  type="number"
                  value={nativeArea}
                  onChange={(e) => onNativeAreaChange(parseInt(e.target.value) || 0)}
                  placeholder="456"
                  min="0"
                  step="1"
                />
                <span className="unit">mm²</span>
              </div>
            </div>
          </div>

          <div className="form-group balloon-volume-group">
            <label htmlFor="balloon-volume">Additional Balloon Volume</label>
            <div className="balloon-volume-container">
              {isEditingBalloonVolume ? (
                <div className="input-with-unit">
                  <input
                    id="balloon-volume"
                    type="number"
                    value={balloonVolume}
                    onChange={(e) => onBalloonVolumeChange(parseFloat(e.target.value) || 0)}
                    onBlur={handleBalloonVolumeBlur}
                    onKeyDown={handleBalloonVolumeKeyDown}
                    step="0.1"
                    min="0"
                    autoFocus
                  />
                  <span className="unit">ml</span>
                </div>
              ) : (
                <div
                  className="balloon-volume-display"
                  onClick={handleBalloonVolumeClick}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleBalloonVolumeClick();
                    }
                  }}
                >
                  <span className="volume-value">{balloonVolume}</span>
                  <span className="unit">ml</span>
                  <span className="edit-hint">Click to edit</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="selector-info">
          <div className="info-item">
            <strong>Selected Valve:</strong> {selectedValve}
          </div>
          <div className="info-item">
            <strong>Native Annulus:</strong> {nativePerimeter}mm perimeter, {nativeArea}mm² area
          </div>
          <div className="info-item">
            <strong>Additional Volume:</strong> {balloonVolume}ml
          </div>
        </div>
      </div>
    </div>
  );
};

export default TAVIValveSelector;