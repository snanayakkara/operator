/**
 * Calculated Haemodynamics Display Component
 *
 * Displays comprehensive calculated haemodynamic values organized by tier:
 * - Tier 1: Essential calculations (PVR, SVR, CI, TPG)
 * - Tier 2: High-value metrics (CPO, RVSWI, PAPi, Fick CO)
 * - Tier 3: Advanced calculations (DO₂, O₂ER, PAC, elastance)
 *
 * Color-coded by normal ranges following Australian/ESC 2022 guidelines
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Heart, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import type { CalculatedHaemodynamics } from '@/types/medical.types';

interface CalculatedHaemodynamicsDisplayProps {
  calculations?: CalculatedHaemodynamics;
  className?: string;
}

interface MetricCardProps {
  label: string;
  value?: number;
  unit: string;
  normalRange?: { min?: number; max?: number };
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  decimalPlaces?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  normalRange,
  description,
  priority = 'medium',
  decimalPlaces = 1
}) => {
  if (value === undefined) return null;

  // Determine if value is within normal range
  let status: 'normal' | 'abnormal' | 'borderline' = 'normal';
  if (normalRange) {
    if (normalRange.min !== undefined && value < normalRange.min) {
      status = 'abnormal';
    } else if (normalRange.max !== undefined && value > normalRange.max) {
      status = 'abnormal';
    } else if (
      (normalRange.min !== undefined && value < normalRange.min * 1.1) ||
      (normalRange.max !== undefined && value > normalRange.max * 0.9)
    ) {
      status = 'borderline';
    }
  }

  const statusColors = {
    normal: 'bg-emerald-50 border-emerald-200',
    borderline: 'bg-amber-50 border-amber-200',
    abnormal: 'bg-rose-50 border-rose-200'
  };

  const valueColors = {
    normal: 'text-emerald-700',
    borderline: 'text-amber-700',
    abnormal: 'text-rose-700'
  };

  const borderWidth = priority === 'high' ? 'border-l-4' : 'border-l-2';

  return (
    <div className={`${statusColors[status]} ${borderWidth} border rounded-lg p-3`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
          <div className={`text-xl font-bold ${valueColors[status]}`}>
            {value.toFixed(decimalPlaces)}
            <span className="text-sm font-normal ml-1">{unit}</span>
          </div>
          {normalRange && (
            <div className="text-xs text-gray-500 mt-1">
              Normal: {normalRange.min !== undefined ? `${normalRange.min}` : ''}{normalRange.min !== undefined && normalRange.max !== undefined ? '-' : ''}{normalRange.max !== undefined ? `${normalRange.max}` : normalRange.min !== undefined ? '+' : ''} {unit}
            </div>
          )}
          {description && (
            <div className="text-xs text-gray-600 mt-1 italic">{description}</div>
          )}
        </div>
        {status !== 'normal' && (
          <div className="ml-2">
            {status === 'abnormal' ? (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const CalculatedHaemodynamicsDisplay: React.FC<CalculatedHaemodynamicsDisplayProps> = ({
  calculations,
  className = ''
}) => {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(['tier1', 'tier2']));

  if (!calculations) {
    return null;
  }

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tier)) {
        newSet.delete(tier);
      } else {
        newSet.add(tier);
      }
      return newSet;
    });
  };

  // Check if tier has any values
  const hasTier1Values = !!(
    calculations.bsa || calculations.bmi || calculations.cardiacIndex ||
    calculations.transpulmonaryGradient || calculations.pulmonaryVascularResistance ||
    calculations.systemicVascularResistance
  );

  const hasTier2Values = !!(
    calculations.fickCO || calculations.cardiacPowerOutput || calculations.rvswi ||
    calculations.lvswi || calculations.papi || calculations.rapPawpRatio
  );

  const hasTier3Values = !!(
    calculations.oxygenDelivery || calculations.oxygenExtractionRatio ||
    calculations.pulmonaryArterialCompliance || calculations.pulmonaryRCTime ||
    calculations.effectivePulmonaryEa || calculations.lvEes || calculations.raEes
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Clinical Assessment Banner */}
      {(calculations.clinicalAssessment || calculations.riskStratification || calculations.phClassification?.hasPH) && (
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Heart className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Clinical Assessment</h4>

              {calculations.clinicalAssessment && (
                <p className="text-sm text-blue-800 mb-2">{calculations.clinicalAssessment}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {calculations.riskStratification && (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      calculations.riskStratification === 'High'
                        ? 'bg-rose-100 text-rose-800'
                        : calculations.riskStratification === 'Intermediate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {calculations.riskStratification} Risk
                  </span>
                )}

                {calculations.phClassification?.hasPH && (
                  <>
                    {calculations.phClassification.type && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {calculations.phClassification.type}
                      </span>
                    )}
                    {calculations.phClassification.severity && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {calculations.phClassification.severity} PH
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIER 1: Essential Calculations */}
      {hasTier1Values && (
        <div className="border border-gray-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => toggleTier('tier1')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-semibold text-gray-900">Essential Haemodynamics</h3>
              <span className="text-xs text-gray-500">(Tier 1)</span>
            </div>
            {expandedTiers.has('tier1') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedTiers.has('tier1') && (
            <div className="px-4 pb-4 space-y-3">
              {/* Patient Anthropometrics */}
              {(calculations.bsa || calculations.bmi) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Patient Anthropometrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricCard label="BSA" value={calculations.bsa} unit="m²" normalRange={{ min: 1.5, max: 2.5 }} />
                    <MetricCard label="BMI" value={calculations.bmi} unit="kg/m²" normalRange={{ min: 18.5, max: 25 }} />
                  </div>
                </div>
              )}

              {/* Core Haemodynamics */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Core Haemodynamics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard
                    label="Cardiac Index"
                    value={calculations.cardiacIndex}
                    unit="L/min/m²"
                    normalRange={{ min: 2.5, max: 4.0 }}
                    priority="high"
                  />
                  <MetricCard
                    label="Stroke Volume"
                    value={calculations.strokeVolume}
                    unit="mL"
                    normalRange={{ min: 60, max: 100 }}
                  />
                  <MetricCard label="MAP" value={calculations.map} unit="mmHg" normalRange={{ min: 70, max: 100 }} />
                  <MetricCard label="Estimated VO₂" value={calculations.estimatedVO2} unit="mL/min" />
                </div>
              </div>

              {/* Pulmonary Haemodynamics */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Pulmonary Haemodynamics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard
                    label="PVR"
                    value={calculations.pulmonaryVascularResistance}
                    unit="Wood units"
                    normalRange={{ max: 3 }}
                    priority="high"
                    description="Pulmonary Vascular Resistance"
                  />
                  <MetricCard
                    label="PVRI"
                    value={calculations.pulmonaryVascularResistanceIndex}
                    unit="Wood·m²"
                    normalRange={{ max: 5 }}
                  />
                  <MetricCard
                    label="TPG"
                    value={calculations.transpulmonaryGradient}
                    unit="mmHg"
                    normalRange={{ max: 12 }}
                    description="Transpulmonary Gradient"
                  />
                  <MetricCard
                    label="DPG"
                    value={calculations.diastolicPressureGradient}
                    unit="mmHg"
                    normalRange={{ max: 7 }}
                    description="Diastolic Pressure Gradient"
                  />
                </div>
              </div>

              {/* Systemic Haemodynamics */}
              {(calculations.systemicVascularResistance || calculations.systemicVascularResistanceIndex) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Systemic Haemodynamics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricCard
                      label="SVR"
                      value={calculations.systemicVascularResistance}
                      unit="Wood units"
                      normalRange={{ min: 10, max: 20 }}
                      description="Systemic Vascular Resistance"
                    />
                    <MetricCard
                      label="SVRI"
                      value={calculations.systemicVascularResistanceIndex}
                      unit="Wood·m²"
                      normalRange={{ min: 17, max: 35 }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TIER 2: High-Value Calculations */}
      {hasTier2Values && (
        <div className="border border-gray-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => toggleTier('tier2')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-semibold text-gray-900">Advanced Metrics (AHA 2021)</h3>
              <span className="text-xs text-gray-500">(Tier 2)</span>
            </div>
            {expandedTiers.has('tier2') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedTiers.has('tier2') && (
            <div className="px-4 pb-4 space-y-3">
              {/* Fick Method */}
              {(calculations.fickCO || calculations.fickCI) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Fick Method (Validation)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricCard
                      label="Fick CO"
                      value={calculations.fickCO}
                      unit="L/min"
                      normalRange={{ min: 4, max: 8 }}
                      description="Cross-validation with thermodilution"
                    />
                    <MetricCard label="Fick CI" value={calculations.fickCI} unit="L/min/m²" normalRange={{ min: 2.5, max: 4.0 }} />
                  </div>
                </div>
              )}

              {/* Cardiac Power & Work */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Cardiac Power & Ventricular Work</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard
                    label="CPO"
                    value={calculations.cardiacPowerOutput}
                    unit="Watts"
                    normalRange={{ min: 0.5, max: 0.7 }}
                    description="Cardiac Power Output"
                  />
                  <MetricCard label="CPI" value={calculations.cardiacPowerIndex} unit="W/m²" normalRange={{ min: 0.3, max: 0.5 }} />
                  <MetricCard
                    label="RVSWI"
                    value={calculations.rvswi}
                    unit="mmHg·mL/m²"
                    normalRange={{ min: 400, max: 600 }}
                    description="RV Stroke Work Index"
                  />
                  <MetricCard
                    label="LVSWI"
                    value={calculations.lvswi}
                    unit="mmHg·mL/m²"
                    normalRange={{ min: 50, max: 70 }}
                    description="LV Stroke Work Index"
                  />
                  <MetricCard label="RV CPO" value={calculations.rvCardiacPowerOutput} unit="Watts" />
                  <MetricCard label="SVI" value={calculations.strokeVolumeIndex} unit="mL/m²" normalRange={{ min: 35, max: 65 }} />
                </div>
              </div>

              {/* RV Function Indices */}
              {(calculations.papi || calculations.rapPawpRatio) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">RV Function Indices</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricCard
                      label="PAPi"
                      value={calculations.papi}
                      unit=""
                      normalRange={{ min: 1.85 }}
                      description="Pulmonary Artery Pulsatility Index"
                      decimalPlaces={2}
                    />
                    <MetricCard
                      label="RAP:PCWP Ratio"
                      value={calculations.rapPawpRatio}
                      unit=""
                      normalRange={{ max: 0.67 }}
                      decimalPlaces={2}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TIER 3: Advanced Calculations */}
      {hasTier3Values && (
        <div className="border border-gray-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => toggleTier('tier3')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
          >
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Specialized Calculations</h3>
              <span className="text-xs text-gray-500">(Tier 3)</span>
            </div>
            {expandedTiers.has('tier3') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedTiers.has('tier3') && (
            <div className="px-4 pb-4 space-y-3">
              {/* Oxygen Transport */}
              {(calculations.oxygenDelivery || calculations.oxygenExtractionRatio) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Oxygen Transport</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricCard label="DO₂" value={calculations.oxygenDelivery} unit="mL/min" description="Oxygen Delivery" decimalPlaces={0} />
                    <MetricCard
                      label="O₂ER"
                      value={calculations.oxygenExtractionRatio}
                      unit="%"
                      normalRange={{ min: 20, max: 30 }}
                      description="Oxygen Extraction Ratio"
                    />
                  </div>
                </div>
              )}

              {/* Pulmonary Vascular Mechanics */}
              {(calculations.pulmonaryArterialCompliance || calculations.pulmonaryRCTime || calculations.effectivePulmonaryEa) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Pulmonary Vascular Mechanics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricCard
                      label="PAC"
                      value={calculations.pulmonaryArterialCompliance}
                      unit="mL/mmHg"
                      normalRange={{ min: 2 }}
                      description="Pulmonary Arterial Compliance"
                    />
                    <MetricCard
                      label="RC Time"
                      value={calculations.pulmonaryRCTime}
                      unit="seconds"
                      normalRange={{ min: 0.5, max: 0.7 }}
                      description="Pulmonary Resistance-Compliance Time"
                    />
                    <MetricCard
                      label="Ea"
                      value={calculations.effectivePulmonaryEa}
                      unit="mmHg/mL"
                      description="Effective Pulmonary Elastance"
                    />
                  </div>
                </div>
              )}

              {/* Ventricular Elastance */}
              {(calculations.lvEes || calculations.raEes) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Ventricular Elastance (PV Loop Data)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricCard
                      label="LV Ees"
                      value={calculations.lvEes}
                      unit="mmHg/mL"
                      description="LV End-Systolic Elastance"
                      decimalPlaces={2}
                    />
                    <MetricCard
                      label="RA Ees"
                      value={calculations.raEes}
                      unit="mmHg/mL"
                      description="RA End-Systolic Elastance"
                      decimalPlaces={2}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No calculations available message */}
      {!hasTier1Values && !hasTier2Values && !hasTier3Values && (
        <div className="border border-gray-200 rounded-lg bg-gray-50 p-6 text-center">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">
            Calculated values will appear here once all necessary haemodynamic measurements are recorded.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Required: Pressures (RA, RV, PA, PCWP), Cardiac Output, Patient Data (Height, Weight, HR, BP)
          </p>
        </div>
      )}
    </div>
  );
};
