/**
 * ImagingGrid - CT/DICOM Snapshots Page
 * 
 * Grid of imaging snapshots for the Imaging page.
 * Placeholder implementation - will connect to actual imaging data.
 */

import React from 'react';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import { PlanCommandCard } from './PlanCommandCard';

interface ImagingGridProps {
  workup: TAVIWorkupItem;
  planPinned: boolean;
}

// Placeholder imaging slots
const IMAGING_SLOTS = [
  { id: 'annulus', label: 'Annulus', placeholder: '🎯' },
  { id: 'lvot', label: 'LVOT', placeholder: '⭕' },
  { id: 'sinus', label: 'Sinus of Valsalva', placeholder: '🔵' },
  { id: 'asc-aorta', label: 'Ascending Aorta', placeholder: '🔴' },
  { id: 'arch', label: 'Aortic Arch', placeholder: '🌈' },
  { id: 'iliac-l', label: 'Left Iliac', placeholder: '🦴' },
  { id: 'iliac-r', label: 'Right Iliac', placeholder: '🦴' },
  { id: 'femoral', label: 'Femoral Access', placeholder: '🎯' },
  { id: 'custom', label: 'Add Image +', placeholder: '➕' },
];

export const ImagingGrid: React.FC<ImagingGridProps> = ({
  workup,
  planPinned
}) => {
  return (
    <div className={`imaging-layout ${planPinned ? 'plan-pinned' : 'plan-hidden'}`}>
      {/* Imaging Grid */}
      <div className="imaging-grid-container">
        <div className="imaging-grid-header">
          <h3>CT Imaging</h3>
          <span className="imaging-hint">Click to expand • Drag to reorder</span>
        </div>
        
        <div className="imaging-grid">
          {IMAGING_SLOTS.map(slot => (
            <div
              key={slot.id}
              className={`imaging-slot ${slot.id === 'custom' ? 'slot-add' : ''}`}
              role="button"
              tabIndex={0}
            >
              <div className="slot-placeholder">
                <span className="slot-icon">{slot.placeholder}</span>
              </div>
              <div className="slot-label">{slot.label}</div>
            </div>
          ))}
        </div>

        {/* CT Measurements Table */}
        {workup.ctMeasurements && (
          <div className="ct-measurements-table">
            <h4>CT Measurements</h4>
            <table>
              <tbody>
                {workup.ctMeasurements.annulusAreaMm2 && (
                  <tr>
                    <td className="measure-label">Annulus Area</td>
                    <td className="measure-value">{workup.ctMeasurements.annulusAreaMm2} mm²</td>
                  </tr>
                )}
                {workup.ctMeasurements.annulusPerimeterMm && (
                  <tr>
                    <td className="measure-label">Annulus Perimeter</td>
                    <td className="measure-value">{workup.ctMeasurements.annulusPerimeterMm} mm</td>
                  </tr>
                )}
                {workup.ctMeasurements.annulusMinDiameterMm && (
                  <tr>
                    <td className="measure-label">Annulus Dmin</td>
                    <td className="measure-value">{workup.ctMeasurements.annulusMinDiameterMm} mm</td>
                  </tr>
                )}
                {workup.ctMeasurements.annulusMaxDiameterMm && (
                  <tr>
                    <td className="measure-label">Annulus Dmax</td>
                    <td className="measure-value">{workup.ctMeasurements.annulusMaxDiameterMm} mm</td>
                  </tr>
                )}
                {workup.ctMeasurements.lvotAreaMm2 && (
                  <tr>
                    <td className="measure-label">LVOT Area</td>
                    <td className="measure-value">{workup.ctMeasurements.lvotAreaMm2} mm²</td>
                  </tr>
                )}
                {workup.ctMeasurements.lvotPerimeterMm && (
                  <tr>
                    <td className="measure-label">LVOT Perimeter</td>
                    <td className="measure-value">{workup.ctMeasurements.lvotPerimeterMm} mm</td>
                  </tr>
                )}
                {workup.ctMeasurements.stjDiameterMm && (
                  <tr>
                    <td className="measure-label">STJ Diameter</td>
                    <td className="measure-value">{workup.ctMeasurements.stjDiameterMm} mm</td>
                  </tr>
                )}
                {workup.ctMeasurements.stjHeightMm && (
                  <tr>
                    <td className="measure-label">STJ Height</td>
                    <td className="measure-value">{workup.ctMeasurements.stjHeightMm} mm</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan Rail (if pinned) */}
      {planPinned && (
        <div className="imaging-plan-rail">
          <PlanCommandCard
            workup={workup}
            isFocused={false}
            isExpanded={true}
            onClick={() => {}}
            onToggleExpand={() => {}}
          />
        </div>
      )}
    </div>
  );
};
