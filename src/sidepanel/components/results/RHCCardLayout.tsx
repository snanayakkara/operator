/**
 * RHCCardLayout Component
 *
 * A presentation-ready 13×13cm card layout for Right Heart Catheterisation data.
 * Designed to be rendered at 300 DPI (1535×1535px) for high-quality PNG export.
 *
 * Layout Structure:
 * - Header: Patient info, procedure date
 * - Pressure Grid (2×2): RA, RV, PA, PCWP with color-coded ranges
 * - Cardiac Output: Thermodilution + Fick
 * - Key Findings: Clinical assessment, PVR, diagnosis
 * - Footer: Operator/institution details
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
  rhcData,
  patientInfo,
  operatorInfo
}) => {
  const { haemodynamicPressures, cardiacOutput, rhcData: data, calculations } = rhcData;

  // Helper to check if value is within normal range
  const isNormal = (value: string | null, min: number, max: number): boolean => {
    if (!value) return false;
    const num = parseFloat(value);
    return num >= min && num <= max;
  };

  // Helper to get color coding for pressure values
  const getPressureColor = (value: string | null, min: number, max: number): string => {
    if (!value) return '#9CA3AF'; // gray-400
    return isNormal(value, min, max) ? '#10B981' : '#EF4444'; // green-500 : red-500
  };

  // Calculate derived values
  const calculatePVR = (): string | null => {
    const paMean = haemodynamicPressures.pa.mean;
    const pcwpMean = haemodynamicPressures.pcwp.mean;
    const co = cardiacOutput.thermodilution.co || cardiacOutput.fick.co;

    if (paMean && pcwpMean && co) {
      const pvr = ((parseFloat(paMean) - parseFloat(pcwpMean)) / parseFloat(co)) * 80;
      return pvr.toFixed(1);
    }
    return null;
  };

  const calculateSVR = (): string | null => {
    // Assuming MAP (mean arterial pressure) would come from context, using placeholder
    // SVR = (MAP - RAP) / CO × 80
    return null; // Would need MAP from aortic pressures
  };

  const pvr = calculatePVR();

  return (
    <div
      style={{
        width: '13cm',
        height: '13cm',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#FFFFFF',
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header Section */}
      <div
        style={{
          borderBottom: '3px solid #3B82F6',
          paddingBottom: '12px',
          marginBottom: '16px'
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#1F2937',
            letterSpacing: '-0.5px'
          }}
        >
          Right Heart Catheterisation
        </h1>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '13px',
            color: '#6B7280'
          }}
        >
          <div>
            {patientInfo?.name && <div><strong>Name:</strong> {patientInfo.name}</div>}
            {patientInfo?.mrn && <div><strong>MRN:</strong> {patientInfo.mrn}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            {operatorInfo?.date && <div>{operatorInfo.date}</div>}
            {data.indication && (
              <div style={{ fontSize: '11px', fontStyle: 'italic' }}>
                {data.indication.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Haemodynamic Pressures Grid */}
      <div style={{ marginBottom: '16px' }}>
        <h2
          style={{
            margin: '0 0 10px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}
        >
          Haemodynamic Pressures
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}
        >
          {/* Right Atrial Pressure */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '10px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>
              Right Atrial (RA)
            </div>
            {haemodynamicPressures.ra.mean && (
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: getPressureColor(haemodynamicPressures.ra.mean, 2, 8)
                }}
              >
                {haemodynamicPressures.ra.mean} mmHg
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
              Normal: 2-8 mmHg
            </div>
          </div>

          {/* Right Ventricular Pressure */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '10px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>
              Right Ventricular (RV)
            </div>
            {haemodynamicPressures.rv.systolic && haemodynamicPressures.rv.diastolic && (
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: getPressureColor(haemodynamicPressures.rv.systolic, 15, 30)
                }}
              >
                {haemodynamicPressures.rv.systolic}/{haemodynamicPressures.rv.diastolic}
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
              Normal: 15-30/2-8 mmHg
            </div>
          </div>

          {/* Pulmonary Artery Pressure */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '10px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>
              Pulmonary Artery (PA)
            </div>
            {haemodynamicPressures.pa.systolic && haemodynamicPressures.pa.diastolic && haemodynamicPressures.pa.mean && (
              <div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: getPressureColor(haemodynamicPressures.pa.mean, 9, 18)
                  }}
                >
                  {haemodynamicPressures.pa.systolic}/{haemodynamicPressures.pa.diastolic}
                </div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>
                  (mean: {haemodynamicPressures.pa.mean})
                </div>
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
              Normal: 15-30/4-12 (9-18) mmHg
            </div>
          </div>

          {/* PCWP */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '10px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>
              PCWP
            </div>
            {haemodynamicPressures.pcwp.mean && (
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: getPressureColor(haemodynamicPressures.pcwp.mean, 6, 15)
                }}
              >
                {haemodynamicPressures.pcwp.mean} mmHg
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
              Normal: 6-15 mmHg
            </div>
          </div>
        </div>
      </div>

      {/* Cardiac Output Section */}
      <div style={{ marginBottom: '16px' }}>
        <h2
          style={{
            margin: '0 0 10px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}
        >
          Cardiac Output Assessment
        </h2>
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          {/* Thermodilution */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px' }}>
              Thermodilution
            </div>
            {cardiacOutput.thermodilution.co && (
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1E3A8A' }}>
                {cardiacOutput.thermodilution.co} L/min
              </div>
            )}
            {cardiacOutput.thermodilution.ci && (
              <div style={{ fontSize: '13px', color: '#3B82F6' }}>
                CI: {cardiacOutput.thermodilution.ci} L/min/m²
              </div>
            )}
          </div>

          {/* Fick Method */}
          {(cardiacOutput.fick.co || cardiacOutput.fick.ci) && (
            <div style={{ flex: 1, borderLeft: '1px solid #BFDBFE', paddingLeft: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px' }}>
                Fick Method
              </div>
              {cardiacOutput.fick.co && (
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1E3A8A' }}>
                  {cardiacOutput.fick.co} L/min
                </div>
              )}
              {cardiacOutput.fick.ci && (
                <div style={{ fontSize: '13px', color: '#3B82F6' }}>
                  CI: {cardiacOutput.fick.ci} L/min/m²
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calculated Values */}
      {(calculations || pvr) && (
        <div style={{ marginBottom: '16px' }}>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151'
            }}
          >
            Calculated Haemodynamics
          </h2>
          <div
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              gap: '12px'
            }}
          >
            {/* CI - Cardiac Index */}
            {calculations?.cardiacIndex && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>CI</div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: calculations.cardiacIndex >= 2.5 && calculations.cardiacIndex <= 4.0 ? '#10B981' : '#EF4444'
                  }}
                >
                  {calculations.cardiacIndex.toFixed(1)} L/min/m²
                </div>
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>Normal: 2.5-4.0</div>
              </div>
            )}

            {/* PVR - Pulmonary Vascular Resistance */}
            {(calculations?.pulmonaryVascularResistance || pvr) && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>PVR</div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: (calculations?.pulmonaryVascularResistance || parseFloat(pvr!)) < 3 ? '#10B981' : '#EF4444'
                  }}
                >
                  {calculations?.pulmonaryVascularResistance ? calculations.pulmonaryVascularResistance.toFixed(1) : pvr} WU
                </div>
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>Normal: &lt;3</div>
              </div>
            )}

            {/* SVR - Systemic Vascular Resistance */}
            {calculations?.systemicVascularResistance && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>SVR</div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: calculations.systemicVascularResistance >= 10 && calculations.systemicVascularResistance <= 20 ? '#10B981' : '#EF4444'
                  }}
                >
                  {calculations.systemicVascularResistance.toFixed(1)} WU
                </div>
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>Normal: 10-20</div>
              </div>
            )}

            {/* TPG - Transpulmonary Gradient */}
            {calculations?.transpulmonaryGradient && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>TPG</div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: calculations.transpulmonaryGradient < 12 ? '#10B981' : '#EF4444'
                  }}
                >
                  {calculations.transpulmonaryGradient.toFixed(0)} mmHg
                </div>
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>Normal: &lt;12</div>
              </div>
            )}
          </div>

          {/* Advanced Metrics Row (if available) */}
          {(calculations?.cardiacPowerOutput || calculations?.papi) && (
            <div
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                padding: '10px',
                marginTop: '8px',
                display: 'flex',
                gap: '12px'
              }}
            >
              {/* CPO - Cardiac Power Output */}
              {calculations.cardiacPowerOutput && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>CPO</div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: calculations.cardiacPowerOutput >= 0.6 ? '#10B981' : '#EF4444'
                    }}
                  >
                    {calculations.cardiacPowerOutput.toFixed(2)} W
                  </div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF' }}>Normal: ≥0.6</div>
                </div>
              )}

              {/* PAPi - Pulmonary Artery Pulsatility Index */}
              {calculations.papi && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>PAPi</div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: calculations.papi > 1.0 ? '#10B981' : '#EF4444'
                    }}
                  >
                    {calculations.papi.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF' }}>Normal: &gt;1.0</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Key Findings */}
      {data.recommendations && (
        <div style={{ marginBottom: '12px' }}>
          <h2
            style={{
              margin: '0 0 6px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}
          >
            Clinical Assessment
          </h2>
          <div
            style={{
              fontSize: '11px',
              color: '#4B5563',
              lineHeight: '1.5',
              padding: '8px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '6px'
            }}
          >
            {data.recommendations}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid #E5E7EB',
          fontSize: '10px',
          color: '#9CA3AF',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {operatorInfo?.operator && <div>Operator: {operatorInfo.operator}</div>}
          {operatorInfo?.institution && <div>{operatorInfo.institution}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Generated by Operator</div>
          <div>High-Fidelity Medical AI</div>
        </div>
      </div>
    </div>
  );
};
