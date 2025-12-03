/**
 * RHC Field Editor Component
 *
 * Provides an editable form interface for manually adjusting or adding
 * haemodynamic measurements before card export. Useful for:
 * - Correcting transcription errors
 * - Adding measurements that weren't in the dictation
 * - Adjusting values based on review/verification
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Edit3, RefreshCw } from 'lucide-react';
import Button, { IconButton } from '../buttons/Button';
import * as RHCCalc from '@/services/RHCCalculationService';
import type {
  RightHeartCathReport,
  HaemodynamicPressures,
  CardiacOutput,
  RightHeartCathData,
  CalculatedHaemodynamics,
  RHCPatientData
} from '@/types/medical.types';

interface RHCFieldEditorProps {
  rhcReport: RightHeartCathReport;
  onSave: (updatedReport: RightHeartCathReport) => void;
  onCancel: () => void;
  // Called on every relevant edit so the parent view can live-update its calculations section
  onLiveUpdate?: (updatedReport: RightHeartCathReport) => void;
}

export const RHCFieldEditor: React.FC<RHCFieldEditorProps> = ({
  rhcReport,
  onSave,
  onCancel,
  onLiveUpdate
}) => {
  // Local state for editable fields - initialize with deep copies to avoid reference issues
  const [pressures, setPressures] = useState<HaemodynamicPressures>(() => 
    JSON.parse(JSON.stringify(rhcReport.haemodynamicPressures))
  );
  const [cardiacOutput, setCardiacOutput] = useState<CardiacOutput>(() => 
    JSON.parse(JSON.stringify(rhcReport.cardiacOutput))
  );
  const [rhcData, setRhcData] = useState<RightHeartCathData>(() => 
    JSON.parse(JSON.stringify(rhcReport.rhcData))
  );
  const [patientData, setPatientData] = useState<RHCPatientData>(() => 
    JSON.parse(JSON.stringify(rhcReport.patientData || {}))
  );

  // Debug: Log initial data on mount
  useEffect(() => {
    console.log('🔧 RHCFieldEditor mounted with data:', {
      patientData: rhcReport.patientData,
      hasPressures: !!rhcReport.haemodynamicPressures,
      hasCardiacOutput: !!rhcReport.cardiacOutput,
      hasRhcData: !!rhcReport.rhcData
    });
  }, []);

  // Custom fields state
  const [showAddCustomField, setShowAddCustomField] = useState(false);
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldValue, setNewCustomFieldValue] = useState('');

  // Ref for modal container to control scroll position
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Reset state when rhcReport changes (use JSON stringification for deep comparison)
  useEffect(() => {
    console.log('🔄 RHCFieldEditor: rhcReport prop changed, resetting state');
    setPressures(JSON.parse(JSON.stringify(rhcReport.haemodynamicPressures)));
    setCardiacOutput(JSON.parse(JSON.stringify(rhcReport.cardiacOutput)));
    setRhcData(JSON.parse(JSON.stringify(rhcReport.rhcData)));
    setPatientData(JSON.parse(JSON.stringify(rhcReport.patientData || {})));
  }, [rhcReport]);

  // Scroll modal to top when it opens
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, []);

  // Auto-recalculate derived haemodynamics when inputs change
  const calculatedHaemodynamics = useMemo<CalculatedHaemodynamics>(() => {
    // Convert string values to numbers
    const parseValue = (val: string | null | undefined): number | undefined => {
      if (!val) return undefined;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    };

    // Extract numeric values
    const rapMean = parseValue(pressures.ra.mean);
    const _rvSys = parseValue(pressures.rv.systolic);
    const _rvDia = parseValue(pressures.rv.diastolic);
    const paSys = parseValue(pressures.pa.systolic);
    const paDia = parseValue(pressures.pa.diastolic);
    const paMean = parseValue(pressures.pa.mean);
    const pcwpMean = parseValue(pressures.pcwp.mean);
    const thermodilutionCO = parseValue(cardiacOutput.thermodilution.co);
    const _thermodilutionCI = parseValue(cardiacOutput.thermodilution.ci);

    const calculations: CalculatedHaemodynamics = {};

    // Transpulmonary gradient (TPG)
    calculations.transpulmonaryGradient = RHCCalc.calculateTPG(paMean, pcwpMean);

    // Diastolic pressure gradient (DPG)
    calculations.diastolicPressureGradient = RHCCalc.calculateDPG(paDia, pcwpMean);

    // Pulmonary vascular resistance (PVR)
    calculations.pulmonaryVascularResistance = RHCCalc.calculatePVR(paMean, pcwpMean, thermodilutionCO);
    if (calculations.pulmonaryVascularResistance && patientData.bsa) {
      calculations.pulmonaryVascularResistanceIndex = RHCCalc.calculatePVRI(
        calculations.pulmonaryVascularResistance,
        patientData.bsa
      );
    }

    // Systemic vascular resistance (SVR)
    if (patientData.meanArterialPressure && thermodilutionCO) {
      calculations.systemicVascularResistance = RHCCalc.calculateSVR(
        patientData.meanArterialPressure,
        rapMean || 0,
        thermodilutionCO
      );
      if (calculations.systemicVascularResistance && patientData.bsa) {
        calculations.systemicVascularResistanceIndex = RHCCalc.calculateSVRI(
          calculations.systemicVascularResistance,
          patientData.bsa
        );
      }
    }

    // Cardiac index
    if (thermodilutionCO && patientData.bsa) {
      calculations.cardiacIndex = RHCCalc.calculateCardiacIndex(thermodilutionCO, patientData.bsa);
    }

    // Stroke volume
    if (thermodilutionCO && patientData.heartRate) {
      calculations.strokeVolume = RHCCalc.calculateStrokeVolume(thermodilutionCO, patientData.heartRate);
    }

    // Stroke volume index
    if (calculations.cardiacIndex && patientData.heartRate) {
      calculations.strokeVolumeIndex = RHCCalc.calculateSVI(calculations.cardiacIndex, patientData.heartRate);
    }

    // Estimate VO2 with gender-specific formula
    if (patientData.bsa) {
      calculations.estimatedVO2 = RHCCalc.estimateVO2(patientData.bsa, patientData.gender);
    }

    // Fick cardiac output
    if (calculations.estimatedVO2 && patientData.haemoglobin && patientData.sao2 && patientData.svo2) {
      calculations.fickCO = RHCCalc.calculateFickCO(
        calculations.estimatedVO2,
        patientData.haemoglobin,
        patientData.sao2,
        patientData.svo2
      );
      if (calculations.fickCO && patientData.bsa) {
        calculations.fickCI = RHCCalc.calculateCardiacIndex(calculations.fickCO, patientData.bsa);
      }
    }

    // RVSWI (Right Ventricular Stroke Work Index)
    if (paMean && calculations.strokeVolumeIndex) {
      calculations.rvswi = RHCCalc.calculateRVSWI(paMean, rapMean || 0, calculations.strokeVolumeIndex);
    }

    // PAPi (Pulmonary Artery Pulsatility Index)
    calculations.papi = RHCCalc.calculatePAPi(paSys, paDia, rapMean);

    // Cardiac power output
    if (patientData.meanArterialPressure && thermodilutionCO) {
      calculations.cardiacPowerOutput = RHCCalc.calculateCPO(patientData.meanArterialPressure, thermodilutionCO);
    }

    // Cardiac power index
    if (patientData.meanArterialPressure && calculations.cardiacIndex) {
      calculations.cardiacPowerIndex = RHCCalc.calculateCPI(patientData.meanArterialPressure, calculations.cardiacIndex);
    }

    // RV cardiac power output
    if (paMean && thermodilutionCO) {
      calculations.rvCardiacPowerOutput = RHCCalc.calculateRVCPO(paMean, thermodilutionCO);
    }

    // RAP:PCWP ratio
    calculations.rapPawpRatio = RHCCalc.calculateRAPPCWPRatio(rapMean, pcwpMean);

    return calculations;
  }, [pressures, cardiacOutput, patientData]);

  // Live-update parent with current calculated values whenever inputs change
  useEffect(() => {
    if (!onLiveUpdate) return;
    const updatedReport: RightHeartCathReport = {
      ...rhcReport,
      haemodynamicPressures: pressures,
      cardiacOutput,
      rhcData,
      patientData,
      calculations: calculatedHaemodynamics
    };
    onLiveUpdate(updatedReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressures, cardiacOutput, rhcData, patientData, calculatedHaemodynamics]);

  // Auto-calculate thermodilution CI from CO + BSA
  useEffect(() => {
    const coValue = cardiacOutput.thermodilution.co;
    const bsaValue = patientData.bsa; // Already a number from useMemo calculation

    console.log('🔢 Field Editor: Auto-calc CI triggered', { coValue, bsaValue });

    if (coValue && bsaValue) {
      const co = parseFloat(coValue);

      if (!isNaN(co) && bsaValue > 0) {
        const calculatedCI = RHCCalc.calculateCardiacIndex(co, bsaValue);
        console.log('🔢 Field Editor: Calculated CI:', calculatedCI, 'from CO:', co, 'BSA:', bsaValue);
        if (calculatedCI !== undefined) {
          const ciString = calculatedCI.toFixed(2);
          // Only update if different to avoid infinite loops
          if (cardiacOutput.thermodilution.ci !== ciString) {
            console.log('🔢 Field Editor: Updating CI from', cardiacOutput.thermodilution.ci, 'to', ciString);
            setCardiacOutput(prev => ({
              ...prev,
              thermodilution: {
                ...prev.thermodilution,
                ci: ciString
              }
            }));
          } else {
            console.log('🔢 Field Editor: CI already correct:', ciString);
          }
        }
      }
    } else {
      console.log('🔢 Field Editor: Missing CO or BSA for CI calculation');
    }
  }, [cardiacOutput.thermodilution.co, patientData.bsa]);

  // Auto-calculate Fick CO/CI from saturations + haemoglobin + BSA
  useEffect(() => {
    const fickCO = calculatedHaemodynamics.fickCO;
    const fickCI = calculatedHaemodynamics.fickCI;

    // Sync calculated Fick values to input fields
    if (fickCO !== undefined) {
      const coString = fickCO.toFixed(2);
      if (cardiacOutput.fick.co !== coString) {
        setCardiacOutput(prev => ({
          ...prev,
          fick: {
            ...prev.fick,
            co: coString
          }
        }));
      }
    }

    if (fickCI !== undefined) {
      const ciString = fickCI.toFixed(2);
      if (cardiacOutput.fick.ci !== ciString) {
        setCardiacOutput(prev => ({
          ...prev,
          fick: {
            ...prev.fick,
            ci: ciString
          }
        }));
      }
    }
  }, [calculatedHaemodynamics.fickCO, calculatedHaemodynamics.fickCI]);

  const handlePressureChange = (
    chamber: keyof HaemodynamicPressures,
    field: string,
    value: string
  ) => {
    setPressures(prev => ({
      ...prev,
      [chamber]: {
        ...prev[chamber],
        [field]: value || null
      }
    }));
  };

  const handleCardiacOutputChange = (
    method: 'thermodilution' | 'fick',
    field: 'co' | 'ci',
    value: string
  ) => {
    setCardiacOutput(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: value || null
      }
    }));
  };

  const handleSaturationChange = (field: 'mixedVenousO2' | 'wedgeSaturation', value: string) => {
    setCardiacOutput(prev => ({
      ...prev,
      [field]: value || null
    }));
  };

  const handleRhcDataChange = (
    field: keyof RightHeartCathData,
    value: string
  ) => {
    setRhcData(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const handlePatientDataChange = (
    field: keyof RHCPatientData,
    value: string
  ) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const handleAddCustomField = () => {
    if (!newCustomFieldName.trim() || !newCustomFieldValue.trim()) {
      return;
    }

    // Custom fields would be added to rhcData or a custom fields object
    // For now, we'll add it to rhcData as a custom property
    setRhcData(prev => ({
      ...prev,
      [`custom_${newCustomFieldName.toLowerCase().replace(/\s+/g, '_')}`]: newCustomFieldValue
    }));

    // Reset form
    setNewCustomFieldName('');
    setNewCustomFieldValue('');
    setShowAddCustomField(false);
  };

  const handleSave = () => {
    const updatedReport: RightHeartCathReport = {
      ...rhcReport,
      haemodynamicPressures: pressures,
      cardiacOutput,
      rhcData,
      patientData,
      calculations: calculatedHaemodynamics // Include recalculated values
    };

    console.log('💾 Field Editor: Saving report with cardiacOutput:', {
      thermodilution: cardiacOutput.thermodilution,
      fick: cardiacOutput.fick,
      calculations: calculatedHaemodynamics
    });

    onSave(updatedReport);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={onCancel}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <Edit3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Edit Haemodynamic Data</h2>
            </div>
            <IconButton
              onClick={onCancel}
              icon={<X />}
              variant="ghost"
              size="md"
              aria-label="Close"
              className="rounded-full"
            />
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Patient Data */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span>
                Patient Data
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Height */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={patientData.height || ''}
                    onChange={(e) => handlePatientDataChange('height', e.target.value)}
                    placeholder="cm"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Weight */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={patientData.weight || ''}
                    onChange={(e) => handlePatientDataChange('weight', e.target.value)}
                    placeholder="kg"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Age */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={patientData.age || ''}
                    onChange={(e) => handlePatientDataChange('age', e.target.value)}
                    placeholder="years"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Gender */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={patientData.gender || ''}
                    onChange={(e) => handlePatientDataChange('gender', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Haemoglobin */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Haemoglobin (g/L)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={patientData.haemoglobin || ''}
                    onChange={(e) => handlePatientDataChange('haemoglobin', e.target.value)}
                    placeholder="g/L"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-1 text-xs text-gray-500">Normal: 130-180 (M), 120-160 (F)</div>
                </div>

                {/* Lactate */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lactate (mmol/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={patientData.lactate || ''}
                    onChange={(e) => handlePatientDataChange('lactate', e.target.value)}
                    placeholder="mmol/L"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-1 text-xs text-gray-500">Normal: 0.5-2.0 mmol/L</div>
                </div>

              </div>
            </section>

            {/* Clinical & Procedure Information */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                Clinical & Procedure Information
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Indication */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indication
                  </label>
                  <select
                    value={rhcData.indication}
                    onChange={(e) => handleRhcDataChange('indication', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="heart_failure">Heart Failure</option>
                    <option value="pulmonary_hypertension">Pulmonary Hypertension</option>
                    <option value="transplant_evaluation">Transplant Evaluation</option>
                    <option value="cardiogenic_shock">Cardiogenic Shock</option>
                    <option value="valvular_disease">Valvular Disease</option>
                    <option value="other">Other</option>
                  </select>

                  {/* Custom indication text input (shown when "Other" is selected) */}
                  {rhcData.indication === 'other' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Specify Other Indication
                      </label>
                      <input
                        type="text"
                        value={rhcData.indicationOther || ''}
                        onChange={(e) => handleRhcDataChange('indicationOther', e.target.value)}
                        placeholder="e.g., Chronic thromboembolic disease"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Clinical Presentation */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinical Presentation
                  </label>
                  <textarea
                    value={rhcData.clinicalPresentation || ''}
                    onChange={(e) => handleRhcDataChange('clinicalPresentation', e.target.value)}
                    placeholder="e.g., Progressive dyspnoea NYHA class III..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Recent Investigations */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recent Investigations
                  </label>
                  <textarea
                    value={rhcData.recentInvestigations || ''}
                    onChange={(e) => handleRhcDataChange('recentInvestigations', e.target.value)}
                    placeholder="e.g., Echocardiography demonstrated..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vascular Access */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vascular Access
                    </label>
                    <select
                      value={rhcData.vascularAccess}
                      onChange={(e) => handleRhcDataChange('vascularAccess', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="right_antecubital">Right Antecubital</option>
                      <option value="left_antecubital">Left Antecubital</option>
                      <option value="right_internal_jugular">Right Internal Jugular</option>
                      <option value="right_femoral">Right Femoral</option>
                    </select>
                  </div>

                  {/* Catheter Details */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catheter Details
                    </label>
                    <input
                      type="text"
                      value={rhcData.catheterDetails || ''}
                      onChange={(e) => handleRhcDataChange('catheterDetails', e.target.value)}
                      placeholder="e.g., 7 French Swan-Ganz catheter"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                  </label>
                  <textarea
                    value={rhcData.recommendations || ''}
                    onChange={(e) => handleRhcDataChange('recommendations', e.target.value)}
                    placeholder="e.g., Management recommendations..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Follow-up */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Plan
                  </label>
                  <textarea
                    value={rhcData.followUp || ''}
                    onChange={(e) => handleRhcDataChange('followUp', e.target.value)}
                    placeholder="e.g., Repeat RHC in 3 months..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Haemodynamic Pressures */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Haemodynamic Pressures
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Right Atrial */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Right Atrial (RA)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">A-wave:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.ra.aWave || ''}
                        onChange={(e) => handlePressureChange('ra', 'aWave', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">V-wave:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.ra.vWave || ''}
                        onChange={(e) => handlePressureChange('ra', 'vWave', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">Mean:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.ra.mean || ''}
                        onChange={(e) => handlePressureChange('ra', 'mean', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Normal: 2-8 mmHg</div>
                </div>

                {/* Right Ventricular */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Right Ventricular (RV)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">Systolic:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.rv.systolic || ''}
                        onChange={(e) => handlePressureChange('rv', 'systolic', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">Diastolic:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.rv.diastolic || ''}
                        onChange={(e) => handlePressureChange('rv', 'diastolic', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">RVEDP:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.rv.rvedp || ''}
                        onChange={(e) => handlePressureChange('rv', 'rvedp', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Normal: 15-30/2-8 mmHg</div>
                </div>

                {/* Pulmonary Artery */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pulmonary Artery (PA)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">Systolic:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.pa.systolic || ''}
                        onChange={(e) => handlePressureChange('pa', 'systolic', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">Diastolic:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.pa.diastolic || ''}
                        onChange={(e) => handlePressureChange('pa', 'diastolic', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">Mean:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.pa.mean || ''}
                        onChange={(e) => handlePressureChange('pa', 'mean', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Normal: 15-30/4-12 (9-18) mmHg</div>
                </div>

                {/* PCWP */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pulmonary Capillary Wedge Pressure (PCWP)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">A-wave:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.pcwp.aWave || ''}
                        onChange={(e) => handlePressureChange('pcwp', 'aWave', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">V-wave:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.pcwp.vWave || ''}
                        onChange={(e) => handlePressureChange('pcwp', 'vWave', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-16">Mean:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={pressures.pcwp.mean || ''}
                        onChange={(e) => handlePressureChange('pcwp', 'mean', e.target.value)}
                        placeholder="mmHg"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mmHg</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Normal: 6-15 mmHg</div>
                </div>
              </div>
            </section>

            {/* Cardiac Output */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Cardiac Output Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thermodilution */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Thermodilution Method
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-blue-700 w-12">CO:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={cardiacOutput.thermodilution.co || ''}
                        onChange={(e) => handleCardiacOutputChange('thermodilution', 'co', e.target.value)}
                        placeholder="L/min"
                        className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-blue-600">L/min</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-blue-700 w-12">CI:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cardiacOutput.thermodilution.ci || ''}
                        onChange={(e) => handleCardiacOutputChange('thermodilution', 'ci', e.target.value)}
                        placeholder="L/min/m²"
                        className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-blue-600">L/min/m²</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-700">Normal: 4-8 L/min, CI 2.5-4.0</div>
                </div>

                {/* Fick Method */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <label className="block text-sm font-medium text-green-900 mb-2">
                    Fick Method
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-green-700 w-12">CO:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={cardiacOutput.fick.co || ''}
                        onChange={(e) => handleCardiacOutputChange('fick', 'co', e.target.value)}
                        placeholder="L/min"
                        className="flex-1 px-3 py-1.5 text-sm border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="text-xs text-green-600">L/min</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-green-700 w-12">CI:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cardiacOutput.fick.ci || ''}
                        onChange={(e) => handleCardiacOutputChange('fick', 'ci', e.target.value)}
                        placeholder="L/min/m²"
                        className="flex-1 px-3 py-1.5 text-sm border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="text-xs text-green-600">L/min/m²</span>
                    </div>
                  </div>
                </div>

                {/* Saturations */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oxygen Saturations
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">Arterial (SaO₂):</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={patientData.sao2 || ''}
                        onChange={(e) => handlePatientDataChange('sao2', e.target.value)}
                        placeholder="%"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">Mixed Venous:</span>
                      <input
                        type="number"
                        step="1"
                        value={cardiacOutput.mixedVenousO2 || ''}
                        onChange={(e) => handleSaturationChange('mixedVenousO2', e.target.value)}
                        placeholder="%"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">Wedge Sat:</span>
                      <input
                        type="number"
                        step="1"
                        value={cardiacOutput.wedgeSaturation || ''}
                        onChange={(e) => handleSaturationChange('wedgeSaturation', e.target.value)}
                        placeholder="%"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Normal SaO₂: 95–100%; Mixed Venous: 65–75%</div>
                </div>
              </div>
            </section>

            {/* Procedure Details */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Procedure Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Radiation & Contrast
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">Fluoro Time:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={rhcData.fluoroscopyTime || ''}
                        onChange={(e) => handleRhcDataChange('fluoroscopyTime', e.target.value)}
                        placeholder="minutes"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">Fluoro Dose:</span>
                      <input
                        type="number"
                        step="1"
                        value={rhcData.fluoroscopyDose || ''}
                        onChange={(e) => handleRhcDataChange('fluoroscopyDose', e.target.value)}
                        placeholder="mGy"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mGy</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">DAP:</span>
                      <input
                        type="number"
                        step="1"
                        value={rhcData.doseAreaProduct || ''}
                        onChange={(e) => handleRhcDataChange('doseAreaProduct', e.target.value)}
                        placeholder="Gy·cm²"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">Gy·cm²</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">Contrast:</span>
                      <input
                        type="number"
                        step="1"
                        value={rhcData.contrastVolume || ''}
                        onChange={(e) => handleRhcDataChange('contrastVolume', e.target.value)}
                        placeholder="mL"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400">mL</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Calculated Haemodynamics (Live Preview) */}
            <section className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                <RefreshCw className="w-5 h-5 mr-2 text-purple-600" />
                Calculated Haemodynamics (Live)
              </h3>
              <p className="text-xs text-purple-700 mb-4">
                Auto-calculated from your inputs. Updates in real-time as you edit fields.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {calculatedHaemodynamics.estimatedVO2 && (
                  <div className="bg-emerald-50 rounded-md p-3 shadow-sm border border-emerald-200">
                    <div className="text-xs font-medium text-emerald-800">VO₂ (estimated)</div>
                    <div className="text-lg font-bold text-emerald-900">
                      {calculatedHaemodynamics.estimatedVO2.toFixed(0)}
                    </div>
                    <div className="text-xs text-emerald-700">
                      mL/min {patientData.gender ? `(${patientData.gender})` : ''}
                    </div>
                  </div>
                )}
                {calculatedHaemodynamics.fickCO && (
                  <div className="bg-emerald-50 rounded-md p-3 shadow-sm border border-emerald-200">
                    <div className="text-xs font-medium text-emerald-800">Fick CO</div>
                    <div className="text-lg font-bold text-emerald-900">
                      {calculatedHaemodynamics.fickCO.toFixed(1)}
                    </div>
                    <div className="text-xs text-emerald-700">L/min (4-8)</div>
                  </div>
                )}
                {calculatedHaemodynamics.fickCI && (
                  <div className="bg-emerald-50 rounded-md p-3 shadow-sm border border-emerald-200">
                    <div className="text-xs font-medium text-emerald-800">Fick CI</div>
                    <div className="text-lg font-bold text-emerald-900">
                      {calculatedHaemodynamics.fickCI.toFixed(1)}
                    </div>
                    <div className="text-xs text-emerald-700">L/min/m² (2.5-4.0)</div>
                  </div>
                )}
                {calculatedHaemodynamics.pulmonaryVascularResistance && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">PVR</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.pulmonaryVascularResistance.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">WU (Normal: &lt;3)</div>
                  </div>
                )}
                {calculatedHaemodynamics.systemicVascularResistance && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">SVR</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.systemicVascularResistance.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">WU (Normal: 10-20)</div>
                  </div>
                )}
                {calculatedHaemodynamics.transpulmonaryGradient && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">TPG</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.transpulmonaryGradient.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">mmHg (Normal: &lt;12)</div>
                  </div>
                )}
                {calculatedHaemodynamics.diastolicPressureGradient && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">DPG</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.diastolicPressureGradient.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">mmHg (Normal: &lt;7)</div>
                  </div>
                )}
                {calculatedHaemodynamics.cardiacIndex && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">CI</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.cardiacIndex.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">L/min/m² (2.5-4.0)</div>
                  </div>
                )}
                {calculatedHaemodynamics.rvswi && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">RVSWI</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.rvswi.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">g·m/m² (5-10)</div>
                  </div>
                )}
                {calculatedHaemodynamics.papi && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">PAPi</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.papi.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">(Normal: &gt;1.0)</div>
                  </div>
                )}
                {calculatedHaemodynamics.cardiacPowerOutput && (
                  <div className="bg-white rounded-md p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-600">CPO</div>
                    <div className="text-lg font-bold text-purple-900">
                      {calculatedHaemodynamics.cardiacPowerOutput.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">W (Normal: ≥0.6)</div>
                  </div>
                )}
              </div>
              {Object.keys(calculatedHaemodynamics).length === 0 && (
                <div className="text-sm text-gray-600 italic text-center py-4">
                  Fill in pressure and cardiac output values above to see calculated haemodynamics
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            {/* Add Custom Field Form */}
            {showAddCustomField && (
              <div className="mb-4 p-4 bg-white border border-emerald-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Add Custom Field</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={newCustomFieldName}
                    onChange={(e) => setNewCustomFieldName(e.target.value)}
                    placeholder="Field name (e.g., 'Fluoroscopy time')"
                    className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomField();
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={newCustomFieldValue}
                    onChange={(e) => setNewCustomFieldValue(e.target.value)}
                    placeholder="Value (e.g., '8.2 minutes')"
                    className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomField();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    onClick={() => {
                      setShowAddCustomField(false);
                      setNewCustomFieldName('');
                      setNewCustomFieldValue('');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCustomField}
                    disabled={!newCustomFieldName.trim() || !newCustomFieldValue.trim()}
                    variant="success"
                    size="sm"
                    className="text-xs"
                  >
                    Add Field
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-600">
                  Changes will be applied to the card export. Original data is preserved.
                </p>
                {!showAddCustomField && (
                  <Button
                    onClick={() => setShowAddCustomField(true)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  >
                    + Add Custom Field
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={onCancel}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  variant="secondary"
                  size="md"
                  startIcon={<Check />}
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
