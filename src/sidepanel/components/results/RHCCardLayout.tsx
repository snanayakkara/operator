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
import type { RightHeartCathReport } from '@/types/medical.types';

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
        height: '378px', // 10cm at 96 DPI (fixed for export format)
        fontFamily: 'Avenir, "Avenir Next", system-ui, -apple-system, sans-serif',
        backgroundColor: '#FFFFFF',
        padding: '10px', // Reduced from 12px to maximize content space
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0',
        overflow: 'hidden' // Prevent overflow
      }}
    >
      {/* Column 1: Haemodynamic Pressures */}
      <div
        style={{
          border: '2px solid #DC2626',
          borderRadius: '0',
          padding: '8px', // Reduced from 12px
          display: 'flex',
          flexDirection: 'column',
          gap: '6px', // Reduced from 10px
          boxSizing: 'border-box',
          overflow: 'hidden' // Prevent overflow
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: '#6B7280',
            letterSpacing: '0.5px',
            marginBottom: '3px'
          }}
        >
          Haemodynamic Pressures
        </h3>

        {/* Right Atrial (RA) */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '5px' }}>
          <div style={{ fontSize: '9px', fontWeight: '600', color: '#DC2626', marginBottom: '2px' }}>
            Right Atrial (RA)
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
            {displayValue(haemodynamicPressures.ra.mean)} mmHg
          </div>
          <div style={{ fontSize: '8px', color: '#6B7280', marginTop: '1px' }}>mean</div>
          {(haemodynamicPressures.ra.aWave || haemodynamicPressures.ra.vWave) && (
            <div style={{ fontSize: '7px', color: '#6B7280', marginTop: '1px' }}>
              a-wave: {displayValue(haemodynamicPressures.ra.aWave)}, v-wave: {displayValue(haemodynamicPressures.ra.vWave)}
            </div>
          )}
        </div>

        {/* Right Ventricular (RV) */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '5px' }}>
          <div style={{ fontSize: '9px', fontWeight: '600', color: '#DC2626', marginBottom: '2px' }}>
            Right Ventricular (RV)
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
            {displayValue(haemodynamicPressures.rv.systolic)}/{displayValue(haemodynamicPressures.rv.diastolic)} mmHg
          </div>
          {haemodynamicPressures.rv.rvedp && (
            <div style={{ fontSize: '8px', color: '#6B7280', marginTop: '1px' }}>
              RVEDP: {haemodynamicPressures.rv.rvedp} mmHg
            </div>
          )}
        </div>

        {/* Pulmonary Artery (PA) */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '5px' }}>
          <div style={{ fontSize: '9px', fontWeight: '600', color: '#DC2626', marginBottom: '2px' }}>
            Pulmonary Artery (PA)
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
            {displayValue(haemodynamicPressures.pa.systolic)}/{displayValue(haemodynamicPressures.pa.diastolic)}
            {haemodynamicPressures.pa.mean && ` (${haemodynamicPressures.pa.mean})`} mmHg
          </div>
          <div style={{ fontSize: '8px', color: '#6B7280', marginTop: '1px' }}>systolic/diastolic (mean)</div>
        </div>

        {/* PCWP */}
        <div>
          <div style={{ fontSize: '9px', fontWeight: '600', color: '#DC2626', marginBottom: '2px' }}>
            PCWP
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
            {displayValue(haemodynamicPressures.pcwp.mean)} mmHg
          </div>
          <div style={{ fontSize: '8px', color: '#6B7280', marginTop: '1px' }}>mean</div>
          {(haemodynamicPressures.pcwp.aWave || haemodynamicPressures.pcwp.vWave) && (
            <div style={{ fontSize: '7px', color: '#6B7280', marginTop: '1px' }}>
              a-wave: {displayValue(haemodynamicPressures.pcwp.aWave)}, v-wave: {displayValue(haemodynamicPressures.pcwp.vWave)}
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Cardiac Output */}
      <div
        style={{
          border: '2px solid #2563EB',
          borderLeft: '0',
          borderRadius: '0',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: '#6B7280',
            letterSpacing: '0.5px',
            marginBottom: '3px'
          }}
        >
          Cardiac Output
        </h3>

        {/* Thermodilution */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '5px' }}>
          <div style={{ fontSize: '9px', fontWeight: '600', color: '#2563EB', marginBottom: '3px' }}>
            Thermodilution
          </div>
          {cardiacOutput.thermodilution.co && (
            <div style={{ marginBottom: '1px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {cardiacOutput.thermodilution.co}
              </span>
              <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: '3px' }}>L/min</span>
            </div>
          )}
          {cardiacOutput.thermodilution.ci && (
            <div style={{ marginBottom: '1px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {cardiacOutput.thermodilution.ci}
              </span>
              <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: '3px' }}>L/min/m²</span>
            </div>
          )}
        </div>

        {/* Fick Method */}
        {(cardiacOutput.fick.co || cardiacOutput.fick.ci || calculations?.estimatedVO2) && (
          <div>
            <div style={{ fontSize: '9px', fontWeight: '600', color: '#2563EB', marginBottom: '3px' }}>
              Fick Method
            </div>
            {cardiacOutput.fick.co && (
              <div style={{ marginBottom: '1px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                  {cardiacOutput.fick.co}
                </span>
                <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: '3px' }}>L/min</span>
              </div>
            )}
            {cardiacOutput.fick.ci && (
              <div style={{ marginBottom: '1px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                  {cardiacOutput.fick.ci}
                </span>
                <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: '3px' }}>L/min/m²</span>
              </div>
            )}
            {calculations?.estimatedVO2 && (
              <div style={{ fontSize: '7px', color: '#6B7280', marginTop: '2px' }}>
                Assumed VO₂: {calculations.estimatedVO2.toFixed(0)} mL/min (based on BSA/gender)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column 3: Calculated Parameters */}
      <div
        style={{
          border: '2px solid #7C3AED',
          borderLeft: '0',
          borderRadius: '0',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: '#6B7280',
            letterSpacing: '0.5px',
            marginBottom: '3px'
          }}
        >
          Calculated Parameters
        </h3>

        {/* All Calculations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {/* PVR */}
          {calculations?.pulmonaryVascularResistance && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>PVR</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.pulmonaryVascularResistance.toFixed(1)}
              </div>
              <div style={{ fontSize: '6px', color: '#6B7280' }}>WU</div>
            </div>
          )}

          {/* TPG */}
          {calculations?.transpulmonaryGradient && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>TPG</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.transpulmonaryGradient.toFixed(0)}
              </div>
              <div style={{ fontSize: '6px', color: '#6B7280' }}>mmHg</div>
            </div>
          )}

          {/* DPG */}
          {calculations?.diastolicPressureGradient && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>DPG</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.diastolicPressureGradient.toFixed(0)}
              </div>
              <div style={{ fontSize: '6px', color: '#6B7280' }}>mmHg</div>
            </div>
          )}

          {/* PAPi */}
          {calculations?.papi && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>PAPi</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.papi.toFixed(2)}
              </div>
              <div style={{ fontSize: '6px', color: '#6B7280' }}>&nbsp;</div>
            </div>
          )}

          {/* PVRI */}
          {calculations?.pulmonaryVascularResistanceIndex && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>PVRI</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.pulmonaryVascularResistanceIndex.toFixed(1)}
              </div>
              <div style={{ fontSize: '6px', color: '#6B7280' }}>WU·m²</div>
            </div>
          )}

          {/* SVR */}
          {calculations?.systemicVascularResistance && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>SVR</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.systemicVascularResistance.toFixed(1)}
              </div>
              <div style={{ fontSize: '6px', color: '#6B7280' }}>WU</div>
            </div>
          )}

          {/* SVRI */}
          {calculations?.systemicVascularResistanceIndex && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>SVRI</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.systemicVascularResistanceIndex.toFixed(1)}
              </div>
              <div style={{ fontSize: '6px', color: '#6B7280' }}>WU·m²</div>
            </div>
          )}

          {/* SVI */}
          {calculations?.strokeVolumeIndex && (
            <div>
              <div style={{ fontSize: '7px', color: '#7C3AED', fontWeight: '600' }}>SVI</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#000000', lineHeight: '1.2' }}>
                {calculations.strokeVolumeIndex.toFixed(0)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>mL/m²</div>
            </div>
          )}

          {/* RVSWI */}
          {calculations?.rvswi && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>RVSWI</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.rvswi.toFixed(0)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>g·m/m²</div>
            </div>
          )}

          {/* PAC */}
          {calculations?.pulmonaryArterialCompliance && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>PAC</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.pulmonaryArterialCompliance.toFixed(1)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>mL/mmHg</div>
            </div>
          )}

          {/* RC Time */}
          {calculations?.pulmonaryRCTime && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>RC Time</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.pulmonaryRCTime.toFixed(2)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>s</div>
            </div>
          )}

          {/* Ea */}
          {calculations?.effectivePulmonaryEa && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>Ea</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.effectivePulmonaryEa.toFixed(2)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>mmHg/mL</div>
            </div>
          )}

          {/* RAP:PCWP Ratio */}
          {calculations?.rapPawpRatio && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>RAP:PCWP</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.rapPawpRatio.toFixed(2)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>&nbsp;</div>
            </div>
          )}

          {/* O2ER */}
          {calculations?.oxygenExtractionRatio && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>O₂ER</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.oxygenExtractionRatio.toFixed(0)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>%</div>
            </div>
          )}

          {/* CPO */}
          {calculations?.cardiacPowerOutput && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>CPO</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.cardiacPowerOutput.toFixed(2)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>W</div>
            </div>
          )}

          {/* RV CPO */}
          {calculations?.rvCardiacPowerOutput && (
            <div>
              <div style={{ fontSize: '8px', color: '#7C3AED', fontWeight: '600' }}>RV CPO</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                {calculations.rvCardiacPowerOutput.toFixed(2)}
              </div>
              <div style={{ fontSize: '7px', color: '#6B7280' }}>W</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
