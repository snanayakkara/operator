/**
 * RHCCardLayout Component
 *
 * A presentation-ready 18×10cm landscape card for Right Heart Catheterisation data.
 * Designed for embedding in Xestro EMR "Findings" section.
 * Rendered at 300 DPI (2126×1181px) for high-quality PNG export.
 *
 * Layout Structure:
 * - 3-Column Grid: Haemodynamic Pressures | Cardiac Output | Calculated Parameters
 * - Minimal design with colored borders (no backgrounds)
 * - Square corners to match clinical EMR aesthetic
 * - No header/footer (patient info already in EMR template)
 */

import React from 'react';
import type { CalculatedHaemodynamics, RightHeartCathReport } from '@/types/medical.types';

interface RHCCardLayoutProps {
  rhcData: RightHeartCathReport;
  patientInfo?: {
    name?: string;
    mrn?: string;
    dob?: string;
  };
  operatorInfo?: {
    operator?: string;
    institution?: string;
    date?: string;
  };
}

export const RHCCardLayout: React.FC<RHCCardLayoutProps> = ({
  rhcData
}) => {
  const { haemodynamicPressures, cardiacOutput, calculations } = rhcData;

  // Helper to display value or placeholder
  const displayValue = (value: string | null | undefined): string => {
    return value || '—';
  };

  return (
    <div
      style={{
        width: '680px', // 18cm at 96 DPI (exact pixel dimensions)
        height: '378px', // 10cm at 96 DPI
        fontFamily: 'Avenir, "Avenir Next", system-ui, -apple-system, sans-serif',
        backgroundColor: '#FFFFFF',
        padding: '16px',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0',
        overflow: 'hidden' // Prevent content from bleeding outside
      }}
    >
      {/* Column 1: Haemodynamic Pressures */}
      <div
        style={{
          border: '2px solid #DC2626',
          borderRadius: '0',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: '#6B7280',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}
        >
          Haemodynamic Pressures
        </h3>

        {/* Right Atrial (RA) */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#DC2626', marginBottom: '4px' }}>
            Right Atrial (RA)
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#000000' }}>
            {haemodynamicPressures.ra.mean
              ? `${displayValue(haemodynamicPressures.ra.mean)} mmHg`
              : `${displayValue(haemodynamicPressures.ra.aWave)}/${displayValue(haemodynamicPressures.ra.vWave)} mmHg`}
          </div>
          {haemodynamicPressures.ra.mean && (
            <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '2px' }}>mean</div>
          )}
          {!haemodynamicPressures.ra.mean && (haemodynamicPressures.ra.aWave || haemodynamicPressures.ra.vWave) && (
            <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '2px' }}>a-wave / v-wave</div>
          )}
        </div>

        {/* Right Ventricular (RV) */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#DC2626', marginBottom: '4px' }}>
            Right Ventricular (RV)
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#000000' }}>
            {displayValue(haemodynamicPressures.rv.systolic)}/{displayValue(haemodynamicPressures.rv.diastolic)} mmHg
          </div>
          {haemodynamicPressures.rv.rvedp && (
            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
              RVEDP: {haemodynamicPressures.rv.rvedp} mmHg
            </div>
          )}
        </div>

        {/* Pulmonary Artery (PA) */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#DC2626', marginBottom: '4px' }}>
            Pulmonary Artery (PA)
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#000000' }}>
            {displayValue(haemodynamicPressures.pa.systolic)}/{displayValue(haemodynamicPressures.pa.diastolic)} mmHg
          </div>
          {haemodynamicPressures.pa.mean && (
            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
              mean: {haemodynamicPressures.pa.mean} mmHg
            </div>
          )}
        </div>

        {/* PCWP */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#DC2626', marginBottom: '4px' }}>
            PCWP
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#000000' }}>
            {haemodynamicPressures.pcwp.mean
              ? `${displayValue(haemodynamicPressures.pcwp.mean)} mmHg`
              : `${displayValue(haemodynamicPressures.pcwp.aWave)}/${displayValue(haemodynamicPressures.pcwp.vWave)} mmHg`}
          </div>
          {haemodynamicPressures.pcwp.mean && (
            <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '2px' }}>mean</div>
          )}
          {!haemodynamicPressures.pcwp.mean && (haemodynamicPressures.pcwp.aWave || haemodynamicPressures.pcwp.vWave) && (
            <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '2px' }}>a-wave / v-wave</div>
          )}
        </div>
      </div>

      {/* Column 2: Cardiac Output */}
      <div
        style={{
          border: '2px solid #2563EB',
          borderLeft: '0',
          borderRadius: '0',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: '#6B7280',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}
        >
          Cardiac Output
        </h3>

        {/* Thermodilution */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#2563EB', marginBottom: '6px' }}>
            Thermodilution
          </div>
          {cardiacOutput.thermodilution.co && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#000000' }}>
                {cardiacOutput.thermodilution.co}
              </span>
              <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>L/min</span>
            </div>
          )}
          {cardiacOutput.thermodilution.ci && (
            <div>
              <span style={{ fontSize: '12px', color: '#000000' }}>CI: </span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#000000' }}>
                {cardiacOutput.thermodilution.ci}
              </span>
              <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: '4px' }}>L/min/m²</span>
            </div>
          )}
        </div>

        {/* Fick Method */}
        {(cardiacOutput.fick.co || cardiacOutput.fick.ci) && (
          <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#2563EB', marginBottom: '6px' }}>
              Fick Method
            </div>
            {cardiacOutput.fick.co && (
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#000000' }}>
                  {cardiacOutput.fick.co}
                </span>
                <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>L/min</span>
              </div>
            )}
            {cardiacOutput.fick.ci && (
              <div>
                <span style={{ fontSize: '12px', color: '#000000' }}>CI: </span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#000000' }}>
                  {cardiacOutput.fick.ci}
                </span>
                <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: '4px' }}>L/min/m²</span>
              </div>
            )}
          </div>
        )}

        {/* Mixed Venous O2 Saturation */}
        {cardiacOutput.mixedVenousO2 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#2563EB', marginBottom: '4px' }}>
              Mixed Venous O₂
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {cardiacOutput.mixedVenousO2}
              </span>
              <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>%</span>
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Calculated Parameters */}
      <div
        style={{
          border: '2px solid #7C3AED',
          borderLeft: '0',
          borderRadius: '0',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: '#6B7280',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}
        >
          Calculated Parameters
        </h3>

        {/* Primary Calculations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* PVR */}
          {calculations?.pulmonaryVascularResistance && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>PVR</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.pulmonaryVascularResistance.toFixed(1)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>WU</div>
            </div>
          )}

          {/* CI */}
          {calculations?.cardiacIndex && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>CI</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.cardiacIndex.toFixed(1)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>L/min/m²</div>
            </div>
          )}

          {/* TPG */}
          {calculations?.transpulmonaryGradient && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>TPG</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.transpulmonaryGradient.toFixed(0)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>mmHg</div>
            </div>
          )}

          {/* DPG */}
          {calculations?.diastolicPressureGradient && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>DPG</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.diastolicPressureGradient.toFixed(0)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>mmHg</div>
            </div>
          )}

          {/* SVR */}
          {calculations?.systemicVascularResistance && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>SVR</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.systemicVascularResistance.toFixed(1)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>WU</div>
            </div>
          )}

          {/* RVSWI */}
          {calculations?.rvswi && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>RVSWI</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.rvswi.toFixed(1)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>g·m/m²</div>
            </div>
          )}

          {/* PAPi */}
          {calculations?.papi && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>PAPi</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.papi.toFixed(2)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>&nbsp;</div>
            </div>
          )}

          {/* CPO */}
          {calculations?.cardiacPowerOutput && (
            <div>
              <div style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>CPO</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000' }}>
                {calculations.cardiacPowerOutput.toFixed(2)}
              </div>
              <div style={{ fontSize: '8px', color: '#6B7280' }}>W</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
