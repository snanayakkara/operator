/**
 * Right Heart Cath Structured Display Component
 *
 * Displays Right Heart Catheterisation data in a structured, interactive format:
 * - Shows haemodynamic pressures, cardiac output, and exercise testing
 * - Displays clinical data with proper medical formatting
 * - Integrated transcription section with accept/skip/edit buttons
 * - Provides formatted output for clinical documentation
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  ActivityIcon,
  FileTextIcon,
  AlertCircleIcon,
  ChevronDownIcon as _ChevronDownIcon,
  ChevronUpIcon as _ChevronUpIcon
} from '../icons/OptimizedIcons';
import { ChevronDown, ChevronUp, TrendingUp, Activity, Users as _Users, User as UserIcon, Image, Edit3, X } from 'lucide-react';
import Button, { IconButton } from '../buttons/Button';
import { TranscriptionSection } from './TranscriptionSection';
import { CalculatedHaemodynamicsDisplay } from './CalculatedHaemodynamicsDisplay';
import { MissingInfoPanel } from './MissingInfoPanel';
import { RHCFieldEditor } from './RHCFieldEditor';
import { RHCCardPreviewModal } from './RHCCardPreviewModal';
import { FieldValidationPrompt } from './FieldValidationPrompt';
import { ReportDisplay } from './ReportDisplay';
import { generateRHCCardBlob, validateRHCDataForExport } from '@/utils/rhcCardExport';
import * as RHCCalc from '@/services/RHCCalculationService';
import { useRHCValidation } from '@/hooks/useRHCValidation';
import { getValidationConfig } from '@/config/validationFieldConfig';
import type {
  RightHeartCathReport,
  RightHeartCathData as _RightHeartCathData,
  HaemodynamicPressures,
  CardiacOutput,
  ExerciseHaemodynamics as _ExerciseHaemodynamics,
  RHCComplication as _RHCComplication,
  AgentType
} from '@/types/medical.types';
import type { TranscriptionApprovalState, TranscriptionApprovalStatus } from '@/types/optimization';

interface RightHeartCathDisplayProps {
  rhcReport?: RightHeartCathReport;
  results?: string; // Raw fallback for existing sessions
  onCopy?: (text: string) => void;
  onInsertToEMR?: (text: string) => void;
  onUpdateRhcReport?: (rhcReport: RightHeartCathReport) => void; // Callback to persist edited data
  className?: string;
  // Transcription section props
  originalTranscription?: string;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
  onTranscriptionEdit?: (text: string) => void;
  transcriptionSaveStatus?: {
    status: 'idle' | 'saving' | 'saved' | 'error';
    message: string;
    timestamp?: Date;
  };
  onAgentReprocess?: (agentType: AgentType) => void;
  currentAgent?: AgentType | null;
  isProcessing?: boolean;
  audioBlob?: Blob | null;
  defaultTranscriptionExpanded?: boolean;
  collapseTranscriptionWhen?: boolean;
  approvalState?: TranscriptionApprovalState;
  onTranscriptionApprove?: (status: TranscriptionApprovalStatus) => void;
  // Missing info handling
  onReprocessWithAnswers?: (answers: Record<string, string>) => void;
  onDismissMissingInfo?: () => void;
  // Patient info
  selectedPatientName?: string;
  // Validation handling
  onReprocessWithValidation?: (userFields: Record<string, any>) => void;
}

interface SectionConfig {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  priority: 'high' | 'medium' | 'low';
}

// Use centralized validation configuration
const { fieldConfig: RHC_VALIDATION_FIELD_CONFIG, copy: RHC_VALIDATION_COPY } = getValidationConfig('rhc');

const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'patient_details', title: 'Patient Details', icon: UserIcon, color: 'teal', priority: 'high' },
  { key: 'indication', title: 'Indication & Presentation', icon: FileTextIcon, color: 'blue', priority: 'high' },
  { key: 'procedure', title: 'Procedure Details', icon: ActivityIcon, color: 'green', priority: 'high' },
  { key: 'pressures', title: 'Haemodynamic Pressures', icon: HeartIcon, color: 'red', priority: 'high' },
  { key: 'cardiac_output', title: 'Cardiac Output Assessment', icon: TrendingUp, color: 'purple', priority: 'high' },
  { key: 'calculations', title: 'Calculated Haemodynamics', icon: TrendingUp, color: 'emerald', priority: 'high' },
  { key: 'exercise', title: 'Exercise Testing', icon: Activity, color: 'orange', priority: 'medium' },
  { key: 'complications', title: 'Complications', icon: AlertCircleIcon, color: 'red', priority: 'high' },
  { key: 'conclusions', title: 'Conclusions & Follow-up', icon: FileTextIcon, color: 'indigo', priority: 'high' }
];

export const RightHeartCathDisplay: React.FC<RightHeartCathDisplayProps> = ({
  rhcReport,
  results,
  onCopy: _onCopy,
  onInsertToEMR: _onInsertToEMR,
  onUpdateRhcReport,
  className = '',
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  transcriptionSaveStatus,
  onAgentReprocess,
  currentAgent,
  isProcessing = false,
  audioBlob,
  defaultTranscriptionExpanded = false,
  collapseTranscriptionWhen,
  approvalState,
  onTranscriptionApprove,
  onReprocessWithAnswers,
  onDismissMissingInfo,
  selectedPatientName,
  onReprocessWithValidation
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['patient_details', 'procedure', 'indication', 'pressures', 'cardiac_output', 'calculations', 'complications'])
  );
  const [buttonStates, setButtonStates] = useState({ exporting: false, exported: false });
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editedRHCReport, setEditedRHCReport] = useState<RightHeartCathReport | null>(null);
  const [isInlineEditing] = useState(false);
  const [inlineReportDraft, setInlineReportDraft] = useState<RightHeartCathReport | null>(null);

  // Validation hook
  const rhcValidation = useRHCValidation();
  const [cardPreview, setCardPreview] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Sync with fresh rhcReport prop (e.g., after validation reprocessing)
  useEffect(() => {
    if (rhcReport && editedRHCReport) {
      // Only clear if rhcReport is fresher (timestamp comparison)
      const propTimestamp = rhcReport.timestamp || 0;
      const editedTimestamp = editedRHCReport.timestamp || 0;

      if (propTimestamp > editedTimestamp) {
        console.log('🔄 RHC Display: Fresh rhcReport prop detected, clearing stale editedRHCReport');
        setEditedRHCReport(null);
      }
    }
  }, [rhcReport]); // Dependency: rhcReport prop only

  // Parse RHC report data or fall back to results string
  // Use edited data if available, otherwise use original rhcReport
  const effectiveRHCData = useMemo(() => {
    // DEBUG: Log props to diagnose missing structured display
    console.log('🔍 RHC Display Debug:', {
      hasRhcReport: !!rhcReport,
      hasResults: !!results,
      hasEditedRHCReport: !!editedRHCReport,
      rhcReportStatus: rhcReport?.status,
      rhcReportKeys: rhcReport ? Object.keys(rhcReport) : null
    });

    if (results) {
      console.log('📋 Results string preview (first 300 chars):', results.substring(0, 300));
      console.log('📋 Results string end (last 500 chars):', results.substring(Math.max(0, results.length - 500)));

      // Check if JSON marker exists
      const hasJsonMarker = results.includes('<!-- RHC_STRUCTURED_DATA_JSON -->');
      console.log('🎯 Has JSON marker:', hasJsonMarker);
    }

    // FIXED PRIORITY: Fresh prop → fresher edited state → parsed fallback
    if (rhcReport) {
      // If we have edited data, only use it if it's genuinely fresher
      if (editedRHCReport) {
        const propTimestamp = rhcReport.timestamp || 0;
        const editedTimestamp = editedRHCReport.timestamp || 0;

        if (editedTimestamp > propTimestamp) {
          console.log('✅ Using editedRHCReport (fresher than prop)');
          return editedRHCReport;
        }
      }

      console.log('✅ Using rhcReport prop');
      return rhcReport;
    }

    // Fallback to editedRHCReport if no prop exists
    if (editedRHCReport) {
      console.log('✅ Using editedRHCReport (no prop available)');
      return editedRHCReport;
    }

    // Try to parse JSON from results field for backward compatibility
    if (results) {
      try {
        // Look for the specific RHC structured data JSON marker
        const rhcDataMatch = results.match(/<!-- RHC_STRUCTURED_DATA_JSON -->\n(\{[\s\S]*?\})\s*$/);
        if (rhcDataMatch) {
          console.log('✅ Found RHC JSON marker, parsing...');
          const jsonData = JSON.parse(rhcDataMatch[1]);
          // Create a mock RightHeartCathReport structure for display
          const mockReport: RightHeartCathReport = {
            id: 'rhc-display',
            agentName: 'Right Heart Cath Agent',
            content: results,
            sections: [],
            metadata: { confidence: 0.95, processingTime: 0, modelUsed: 'RHC Parser' },
            timestamp: Date.now(),
            warnings: [],
            errors: [],
            rhcData: jsonData.rhcData,
            haemodynamicPressures: jsonData.haemodynamicPressures,
            cardiacOutput: jsonData.cardiacOutput,
            exerciseHaemodynamics: jsonData.exerciseHaemodynamics,
            complications: jsonData.complications,
            patientData: jsonData.patientData,  // Include patientData from parsed JSON
            calculations: jsonData.calculations  // Include calculations from parsed JSON
          };
          console.log('✅ Successfully parsed RHC data from JSON marker');
          console.log('🔍 Parsed patientData:', jsonData.patientData);
          console.log('🔍 Parsed calculations:', jsonData.calculations);
          return mockReport;
        }

        // Fallback: try to parse any JSON object (for backward compatibility)
        console.log('⚠️ No JSON marker found, trying generic JSON fallback...');
        const jsonMatch = results.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          if (jsonData.rhcData) {
            console.log('✅ Found rhcData in generic JSON fallback');
            console.log('🔍 Generic fallback patientData:', jsonData.patientData);
            console.log('🔍 Generic fallback calculations:', jsonData.calculations);
            return jsonData as RightHeartCathReport;
          } else {
            console.log('❌ Generic JSON found but no rhcData property');
          }
        } else {
          console.log('❌ No JSON object found in results string');
        }
      } catch (error) {
        console.warn('❌ Could not parse RHC report from results:', error);
      }
    }

    console.log('❌ effectiveRHCData is NULL - no structured display will show');
    return null;
  }, [rhcReport, results, editedRHCReport]);

  // Extract prose report (PREAMBLE, FINDINGS, CONCLUSION sections)
  const proseReport = useMemo(() => {
    if (effectiveRHCData?.content) {
      // Remove JSON marker if present
      let content = effectiveRHCData.content;
      const jsonMarkerIndex = content.indexOf('<!-- RHC_STRUCTURED_DATA_JSON -->');
      if (jsonMarkerIndex !== -1) {
        content = content.substring(0, jsonMarkerIndex).trim();
      }
      return content;
    }

    // Fallback to results prop
    if (results) {
      let content = results;
      const jsonMarkerIndex = content.indexOf('<!-- RHC_STRUCTURED_DATA_JSON -->');
      if (jsonMarkerIndex !== -1) {
        content = content.substring(0, jsonMarkerIndex).trim();
      }
      return content;
    }

    return null;
  }, [effectiveRHCData, results]);

  const isMissingNumericValue = (value: string | number | null | undefined): boolean => {
    if (value === null || value === undefined || value === '') {
      return true;
    }
    const numeric = Number(value);
    return !Number.isNaN(numeric) && numeric === 0;
  };

  // Helper function: Count missing optional fields for badge notification
  const countMissingOptionalFields = useCallback((rhcData: RightHeartCathReport | null): number => {
    if (!rhcData?.rhcData) return 0;

    let count = 0;
    const data = rhcData.rhcData;
    const patientData = rhcData.patientData;

    const optionalFields = [
      { path: 'fluoroscopyTime', value: data.fluoroscopyTime },
      { path: 'fluoroscopyDose', value: data.fluoroscopyDose },
      { path: 'doseAreaProduct', value: data.doseAreaProduct },
      { path: 'contrastVolume', value: data.contrastVolume },
      { path: 'heartRate', value: patientData?.heartRate }
    ];

    for (const field of optionalFields) {
      if (isMissingNumericValue(field.value)) {
        count++;
      }
    }

    return count;
  }, []);

  // Helper function: Get names of missing optional fields for tooltip
  const getMissingOptionalFieldNames = useCallback((rhcData: RightHeartCathReport | null): string[] => {
    if (!rhcData?.rhcData) return [];

    const missing: string[] = [];
    const data = rhcData.rhcData;
    const patientData = rhcData.patientData;

    if (isMissingNumericValue(data.fluoroscopyTime)) missing.push('Fluoroscopy time');
    if (isMissingNumericValue(data.fluoroscopyDose)) missing.push('Fluoroscopy dose');
    if (isMissingNumericValue(data.doseAreaProduct)) missing.push('Dose area product (DAP)');
    if (isMissingNumericValue(data.contrastVolume)) missing.push('Contrast volume');
    if (isMissingNumericValue(patientData?.heartRate)) missing.push('Heart rate');

    return missing;
  }, []);

  // Calculate missing optional field count for badge (memoized for performance)
  const missingOptionalCount = useMemo(
    () => countMissingOptionalFields(effectiveRHCData),
    [effectiveRHCData, countMissingOptionalFields]
  );

  // Get missing field names for detailed tooltip
  const missingFieldNames = useMemo(
    () => getMissingOptionalFieldNames(effectiveRHCData),
    [effectiveRHCData, getMissingOptionalFieldNames]
  );

  // Detect validation state and show modal
  React.useEffect(() => {
    if (rhcReport?.status === 'awaiting_validation' && rhcReport.validationResult) {
      console.log('🔍 RHC Display: Validation required, showing modal');
      rhcValidation.handleValidationRequired(rhcReport.validationResult);
    }
  }, [rhcReport?.status, rhcReport?.validationResult]);

  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  // Inline edit: nested field updater
  const updateInlineField = useCallback((path: string, value: string, numeric: boolean = false) => {
    setInlineReportDraft(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as RightHeartCathReport;
      const keys = path.split('.');
      let cur: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = cur[keys[i]] ?? {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = numeric ? (value === '' ? undefined : parseFloat(value)) : (value || null);
      return next;
    });
  }, []);

  // Validation style helper for inline numeric cells
  const getValidationClass = useCallback((path: string, rawValue: string | number | null | undefined) => {
    const val = rawValue === '' || rawValue === null || rawValue === undefined ? undefined : Number(rawValue);
    if (val === undefined || Number.isNaN(val)) return '';

    const RANGES: Record<string, { min?: number; max?: number }> = {
      'haemodynamicPressures.ra.mean': { min: 2, max: 8 },
      'haemodynamicPressures.rv.systolic': { min: 15, max: 30 },
      'haemodynamicPressures.rv.diastolic': { min: 2, max: 8 },
      'haemodynamicPressures.rv.rvedp': { min: 0, max: 8 },
      'haemodynamicPressures.pa.systolic': { min: 15, max: 30 },
      'haemodynamicPressures.pa.diastolic': { min: 4, max: 12 },
      'haemodynamicPressures.pa.mean': { min: 9, max: 18 },
      'haemodynamicPressures.pcwp.mean': { min: 6, max: 15 },
      'patientData.sao2': { min: 95, max: 100 },
      'cardiacOutput.mixedVenousO2': { min: 60, max: 80 },
      'cardiacOutput.wedgeSaturation': { min: 60, max: 100 },
      'cardiacOutput.thermodilution.co': { min: 4, max: 8 },
      'cardiacOutput.thermodilution.ci': { min: 2.5, max: 4.0 },
      'cardiacOutput.fick.co': { min: 4, max: 8 },
      'cardiacOutput.fick.ci': { min: 2.5, max: 4.0 }
    };

    // Find a direct match or a prefix match for waves (aWave/vWave don't have strict ranges)
    const range = RANGES[path];
    if (!range) return '';
    const { min, max } = range;
    const within = (min === undefined || val >= min) && (max === undefined || val <= max);
    const nearBoundary = () => {
      if (min !== undefined && val < min) return true;
      if (max !== undefined && val > max) return true;
      if (min !== undefined && val < min + (max !== undefined ? (max - min) * 0.1 : 0)) return true;
      if (max !== undefined && val > max - (max !== undefined && min !== undefined ? (max - min) * 0.1 : 0)) return true;
      return false;
    };

    if (within) {
      return 'border-emerald-300 bg-emerald-50';
    }
    return nearBoundary() ? 'border-amber-300 bg-amber-50' : 'border-rose-300 bg-rose-50';
  }, []);

  // Auto-calc key fields while inline editing (TD CI, Fick CO/CI) and keep calculations live
  React.useEffect(() => {
    if (!isInlineEditing || !inlineReportDraft) return;

    const d = inlineReportDraft;
    const getNum = (v?: string | null) => (v != null && v !== '' ? parseFloat(v) : undefined);

    // Derive BSA from height/weight if available
    const height = d.patientData?.height;
    const weight = d.patientData?.weight;
    const bsa = d.patientData?.bsa ?? (height && weight ? RHCCalc.calculateBSA(height, weight) : undefined);

    // Prepare numbers
    const tdCO = getNum(d.cardiacOutput.thermodilution.co);
    const sao2 = d.patientData?.sao2;
    const svo2 = d.patientData?.svo2 ?? (d.cardiacOutput.mixedVenousO2 ? parseFloat(d.cardiacOutput.mixedVenousO2) : undefined);
    const hb = d.patientData?.haemoglobin;
    const gender = d.patientData?.gender;

    // Estimate VO2 when BSA present
    const estimatedVO2 = bsa ? RHCCalc.estimateVO2(bsa, gender) : undefined;

    // Compute CI (thermodilution)
    const tdCI = tdCO && bsa ? RHCCalc.calculateCardiacIndex(tdCO, bsa) : undefined;

    // Compute Fick CO/CI when inputs available
    const fickCO = (estimatedVO2 && hb && sao2 !== undefined && svo2 !== undefined)
      ? RHCCalc.calculateFickCO(estimatedVO2, hb, sao2, svo2)
      : undefined;
    const fickCI = fickCO && bsa ? RHCCalc.calculateCardiacIndex(fickCO, bsa) : undefined;

    // Apply updates only when values change to avoid loops
    setInlineReportDraft(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as RightHeartCathReport;
      let changed = false;

      if (bsa && bsa !== next.patientData?.bsa) {
        next.patientData = { ...(next.patientData || {}), bsa };
        changed = true;
      }

      if (tdCI !== undefined) {
        const ciStr = tdCI.toFixed(2);
        if (next.cardiacOutput.thermodilution.ci !== ciStr) {
          next.cardiacOutput.thermodilution.ci = ciStr;
          changed = true;
        }
      }

      if (fickCO !== undefined) {
        const coStr = fickCO.toFixed(2);
        if (next.cardiacOutput.fick.co !== coStr) {
          next.cardiacOutput.fick.co = coStr;
          changed = true;
        }
      }
      if (fickCI !== undefined) {
        const ciStr = fickCI.toFixed(2);
        if (next.cardiacOutput.fick.ci !== ciStr) {
          next.cardiacOutput.fick.ci = ciStr;
          changed = true;
        }
      }

      // Keep the Calculated Haemodynamics section in sync (minimal set)
      const rap = getNum(next.haemodynamicPressures.ra.mean);
      const paSys = getNum(next.haemodynamicPressures.pa.systolic);
      const paDia = getNum(next.haemodynamicPressures.pa.diastolic);
      const paMean = getNum(next.haemodynamicPressures.pa.mean);
      const pcwp = getNum(next.haemodynamicPressures.pcwp.mean);
      const calc: any = next.calculations ? { ...next.calculations } : {};
      calc.transpulmonaryGradient = RHCCalc.calculateTPG(paMean, pcwp);
      calc.diastolicPressureGradient = RHCCalc.calculateDPG(paDia, pcwp);
      calc.pulmonaryVascularResistance = RHCCalc.calculatePVR(paMean, pcwp, tdCO);
      if (calc.pulmonaryVascularResistance && bsa) calc.pulmonaryVascularResistanceIndex = RHCCalc.calculatePVRI(calc.pulmonaryVascularResistance, bsa);
      if (tdCI !== undefined) calc.cardiacIndex = tdCI;
      if (tdCO && next.patientData?.heartRate) calc.strokeVolume = RHCCalc.calculateStrokeVolume(tdCO, next.patientData.heartRate);
      calc.papi = RHCCalc.calculatePAPi(paSys, paDia, rap);
      if (estimatedVO2 !== undefined) calc.estimatedVO2 = estimatedVO2;
      next.calculations = calc;
      // We always rebuilt calculations – mark changed to propagate
      changed = true;

      return changed ? next : prev;
    });
  }, [isInlineEditing, inlineReportDraft]);

  const handleExportCard = useCallback(async () => {
    if (!effectiveRHCData) {
      alert('No RHC data available to export');
      return;
    }

    // Ensure calculations are populated before export
    const { haemodynamicPressures, cardiacOutput } = effectiveRHCData;
    const parse = (v?: string | null) => (v ? parseFloat(v) : undefined);

    const rap = parse(haemodynamicPressures.ra.mean);
    const paSys = parse(haemodynamicPressures.pa.systolic);
    const paDia = parse(haemodynamicPressures.pa.diastolic);
    const paMean = parse(haemodynamicPressures.pa.mean);
    const pcwp = parse(haemodynamicPressures.pcwp.mean);
    const tdCO = parse(cardiacOutput.thermodilution.co);
    const bsa = effectiveRHCData.patientData?.bsa;
    const hr = effectiveRHCData.patientData?.heartRate;
    const gender = effectiveRHCData.patientData?.gender as 'male' | 'female' | 'other' | undefined;
    const sao2 = effectiveRHCData.patientData?.sao2;
    const svo2 = parse(cardiacOutput.mixedVenousO2);

    // Calculate MAP if systemic BP available
    const sysBP = effectiveRHCData.patientData?.systolicBP;
    const diaBP = effectiveRHCData.patientData?.diastolicBP;
    const map = sysBP && diaBP ? RHCCalc.calculateMAP(sysBP, diaBP) : undefined;

    // Compute calculations if missing or incomplete
    const hasAnyNumeric = (c?: any) => !!c && Object.values(c).some(v => typeof v === 'number');
    let calculations: any = effectiveRHCData.calculations || {};

    if (!hasAnyNumeric(calculations)) {
      // TIER 1: Basic calculations
      const tpg = RHCCalc.calculateTPG(paMean, pcwp);
      const dpg = RHCCalc.calculateDPG(paDia, pcwp);
      const pvr = RHCCalc.calculatePVR(paMean, pcwp, tdCO);
      const pvri = pvr && bsa ? RHCCalc.calculatePVRI(pvr, bsa) : undefined;
      const ci = tdCO && bsa ? RHCCalc.calculateCardiacIndex(tdCO, bsa) : undefined;
      const sv = tdCO && hr ? RHCCalc.calculateStrokeVolume(tdCO, hr) : undefined;
      const svi = ci && hr ? RHCCalc.calculateSVI(ci, hr) : undefined;
      const svr = map && tdCO ? RHCCalc.calculateSVR(map, rap || 0, tdCO) : undefined;
      const svri = svr && bsa ? RHCCalc.calculateSVRI(svr, bsa) : undefined;

      // TIER 2: Advanced calculations
      const papi = RHCCalc.calculatePAPi(paSys, paDia, rap);
      const rvswi = paMean && svi ? RHCCalc.calculateRVSWI(paMean, rap || 0, svi) : undefined;
      const cpo = map && tdCO ? RHCCalc.calculateCPO(map, tdCO) : undefined;
      const rvCPO = paMean && tdCO ? RHCCalc.calculateRVCPO(paMean, tdCO) : undefined;
      const estimatedVO2 = bsa ? RHCCalc.estimateVO2(bsa, gender) : undefined;

      // Fick CO/CI calculation (requires VO2, Hb, SaO2, SvO2)
      const hb = effectiveRHCData.patientData?.haemoglobin;
      const fickCO = (estimatedVO2 && hb && sao2 !== undefined && svo2 !== undefined)
        ? RHCCalc.calculateFickCO(estimatedVO2, hb, sao2, svo2)
        : undefined;
      const fickCI = fickCO && bsa ? RHCCalc.calculateCardiacIndex(fickCO, bsa) : undefined;

      // TIER 3: Specialized calculations
      const pac = sv && paSys && paDia ? RHCCalc.calculatePAC(sv, paSys, paDia) : undefined;
      const rcTime = pvr && pac ? RHCCalc.calculatePulmonaryRCTime(pvr, pac) : undefined;
      const ea = paMean && pcwp && sv ? RHCCalc.calculateEffectivePulmonaryEa(paMean, pcwp, sv) : undefined;
      const rapPawpRatio = rap && pcwp ? RHCCalc.calculateRAPPCWPRatio(rap, pcwp) : undefined;
      const o2er = sao2 && svo2 ? RHCCalc.calculateOxygenExtractionRatio(sao2, svo2) : undefined;

      calculations = {
        // Basic
        transpulmonaryGradient: tpg,
        diastolicPressureGradient: dpg,
        pulmonaryVascularResistance: pvr,
        pulmonaryVascularResistanceIndex: pvri,
        cardiacIndex: ci,
        strokeVolume: sv,
        strokeVolumeIndex: svi,
        systemicVascularResistance: svr,
        systemicVascularResistanceIndex: svri,
        // Advanced
        papi,
        rvswi,
        cardiacPowerOutput: cpo,
        rvCardiacPowerOutput: rvCPO,
        estimatedVO2,
        fickCO,
        fickCI,
        // Specialized
        pulmonaryArterialCompliance: pac,
        pulmonaryRCTime: rcTime,
        effectivePulmonaryEa: ea,
        rapPawpRatio,
        oxygenExtractionRatio: o2er
      };
    }

    // Extract Fick CO/CI from calculations for cardiacOutput
    const calculatedFickCO = calculations.fickCO;
    const calculatedFickCI = calculations.fickCI;

    // Create export data with ensured calculations and Fick CO/CI in cardiacOutput
    const exportData: RightHeartCathReport = {
      ...effectiveRHCData,
      calculations,
      cardiacOutput: {
        ...effectiveRHCData.cardiacOutput,
        fick: {
          ...effectiveRHCData.cardiacOutput.fick,
          co: calculatedFickCO !== undefined ? calculatedFickCO.toFixed(2) : effectiveRHCData.cardiacOutput.fick.co,
          ci: calculatedFickCI !== undefined ? calculatedFickCI.toFixed(2) : effectiveRHCData.cardiacOutput.fick.ci
        }
      }
    };

    // DEBUG: Verify calculations before export
    console.log('📤 Export Card - Data Source:', {
      hasEditedReport: !!editedRHCReport,
      usingEditedData: effectiveRHCData === editedRHCReport,
      pressures: {
        ra: haemodynamicPressures.ra,
        rv: haemodynamicPressures.rv,
        pa: haemodynamicPressures.pa,
        pcwp: haemodynamicPressures.pcwp
      },
      cardiacOutput: cardiacOutput,
      calculations: calculations,
      hasCalculations: !!calculations,
      calculationKeys: calculations ? Object.keys(calculations) : []
    });

    // Validate data completeness
    const validation = validateRHCDataForExport(exportData);
    if (!validation.valid) {
      const missingFieldsList = validation.missingFields.join('\n• ');
      alert(`Cannot export card: Missing essential data\n\nMissing fields:\n• ${missingFieldsList}\n\nPlease ensure all haemodynamic measurements are recorded.`);
      return;
    }

    // Set exporting state
    setButtonStates(prev => ({ ...prev, exporting: true }));

    try {
      // Extract patient info from context or report metadata
      const patientInfo = {
        name: selectedPatientName || undefined,
        mrn: exportData.id || undefined,
        dob: undefined
      };

      const operatorInfo = {
        operator: undefined, // TODO: Add operator info to context
        institution: undefined,
        date: new Date().toLocaleDateString('en-AU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      };

      // Generate blob and data URL for preview
      const { blob, dataUrl } = await generateRHCCardBlob(exportData, { patientInfo, operatorInfo });

      // Show preview modal
      setCardPreview({ dataUrl, blob });

      // Reset exporting state
      setButtonStates(prev => ({ ...prev, exporting: false }));
    } catch (error) {
      console.error('Failed to generate card preview:', error);
      alert('Failed to generate card preview. Please try again.');
      setButtonStates(prev => ({ ...prev, exporting: false }));
    }
  }, [effectiveRHCData, selectedPatientName, editedRHCReport]);

  // Handle field editor save
  const handleFieldEditorSave = useCallback((updatedReport: RightHeartCathReport) => {
    console.log('📥 Display: Received updated report from field editor:', {
      thermodilution: updatedReport.cardiacOutput.thermodilution,
      fick: updatedReport.cardiacOutput.fick,
      calculations: updatedReport.calculations
    });

    // Add fresh timestamp to mark this as new manual edit
    const timestampedReport = {
      ...updatedReport,
      timestamp: Date.now()
    };

    setEditedRHCReport(timestampedReport);
    setIsEditingFields(false);

    // Persist edited data to session storage
    if (onUpdateRhcReport) {
      onUpdateRhcReport(timestampedReport);
    }
  }, [onUpdateRhcReport]);

  // Handle field editor cancel
  const handleFieldEditorCancel = useCallback(() => {
    setIsEditingFields(false);
  }, []);

  // Handle custom field addition
  const handleAddCustomField = useCallback(() => {
    if (!newFieldName.trim() || !newFieldValue.trim()) {
      alert('Both field name and value are required');
      return;
    }

    setCustomFields(prev => ({
      ...prev,
      [newFieldName.trim()]: newFieldValue.trim()
    }));

    // Reset form
    setNewFieldName('');
    setNewFieldValue('');
    setShowAddField(false);
  }, [newFieldName, newFieldValue]);

  const handleRemoveCustomField = useCallback((fieldName: string) => {
    setCustomFields(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  // Helper functions for section rendering
  const _renderPressuresSection = (pressures: HaemodynamicPressures) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Right Atrial Pressures */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Right Atrial Pressures</h4>
        <div className="space-y-1 text-sm">
          {pressures.ra.aWave && <div>A-wave: <span className="font-mono">{pressures.ra.aWave} mmHg</span></div>}
          {pressures.ra.vWave && <div>V-wave: <span className="font-mono">{pressures.ra.vWave} mmHg</span></div>}
          {pressures.ra.mean && <div>Mean: <span className="font-mono">{pressures.ra.mean} mmHg</span></div>}
        </div>
      </div>

      {/* Right Ventricular Pressures */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Right Ventricular Pressures</h4>
        <div className="space-y-1 text-sm">
          {pressures.rv.systolic && <div>Systolic: <span className="font-mono">{pressures.rv.systolic} mmHg</span></div>}
          {pressures.rv.diastolic && <div>Diastolic: <span className="font-mono">{pressures.rv.diastolic} mmHg</span></div>}
          {pressures.rv.rvedp && <div>RVEDP: <span className="font-mono">{pressures.rv.rvedp} mmHg</span></div>}
        </div>
      </div>

      {/* Pulmonary Artery Pressures */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Pulmonary Artery Pressures</h4>
        <div className="space-y-1 text-sm">
          {pressures.pa.systolic && <div>Systolic: <span className="font-mono">{pressures.pa.systolic} mmHg</span></div>}
          {pressures.pa.diastolic && <div>Diastolic: <span className="font-mono">{pressures.pa.diastolic} mmHg</span></div>}
          {pressures.pa.mean && <div>Mean: <span className="font-mono">{pressures.pa.mean} mmHg</span></div>}
        </div>
      </div>

      {/* PCWP */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Pulmonary Capillary Wedge Pressure</h4>
        <div className="space-y-1 text-sm">
          {pressures.pcwp.aWave && <div>A-wave: <span className="font-mono">{pressures.pcwp.aWave} mmHg</span></div>}
          {pressures.pcwp.vWave && <div>V-wave: <span className="font-mono">{pressures.pcwp.vWave} mmHg</span></div>}
          {pressures.pcwp.mean && <div>Mean: <span className="font-mono">{pressures.pcwp.mean} mmHg</span></div>}
        </div>
      </div>
    </div>
  );

  const _renderCardiacOutputSection = (cardiacOutput: CardiacOutput) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Thermodilution Method</h4>
        <div className="space-y-1 text-sm">
          {cardiacOutput.thermodilution.co && (
            <div>Cardiac Output: <span className="font-mono">{cardiacOutput.thermodilution.co} L/min</span></div>
          )}
          {cardiacOutput.thermodilution.ci && (
            <div>Cardiac Index: <span className="font-mono">{cardiacOutput.thermodilution.ci} L/min/m²</span></div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Fick Method</h4>
        <div className="space-y-1 text-sm">
          {cardiacOutput.fick.co && (
            <div>Cardiac Output: <span className="font-mono">{cardiacOutput.fick.co} L/min</span></div>
          )}
          {cardiacOutput.fick.ci && (
            <div>Cardiac Index: <span className="font-mono">{cardiacOutput.fick.ci} L/min/m²</span></div>
          )}
          {cardiacOutput.mixedVenousO2 && (
            <div>Mixed Venous O₂: <span className="font-mono">{cardiacOutput.mixedVenousO2}%</span></div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Transcription Section */}
      {originalTranscription && (
        <TranscriptionSection
          originalTranscription={originalTranscription}
          onTranscriptionCopy={onTranscriptionCopy}
          onTranscriptionInsert={onTranscriptionInsert}
          onTranscriptionEdit={onTranscriptionEdit}
          transcriptionSaveStatus={transcriptionSaveStatus}
          onAgentReprocess={onAgentReprocess}
          currentAgent={currentAgent}
          isProcessing={isProcessing}
          audioBlob={audioBlob}
          defaultExpanded={defaultTranscriptionExpanded}
          collapseWhen={collapseTranscriptionWhen}
          approvalState={approvalState}
          onTranscriptionApprove={onTranscriptionApprove}
        />
      )}

      {/* Prose Report Section (PREAMBLE, CONCLUSION) */}
      {proseReport && (
        <ReportDisplay
          results={proseReport}
          agentType="right-heart-cath"
          className="mb-4"
        />
      )}

      {/* Report Image Button - Inline after prose sections */}
      {effectiveRHCData && (
        <div className="mb-6">
          <Button
            type="button"
            onClick={handleExportCard}
            disabled={buttonStates.exporting || !effectiveRHCData}
            variant="outline"
            size="md"
            fullWidth
            isLoading={buttonStates.exporting}
            isSuccess={buttonStates.exported}
            startIcon={<Image />}
            className="border-2 border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-400"
            title="Export 18×10cm PNG card (300 DPI) - serves as the FINDINGS section"
          >
            {buttonStates.exporting
              ? 'Generating Report Image...'
              : buttonStates.exported
              ? 'Report Image Downloaded!'
              : 'Generate Report Image (Findings)'}
          </Button>
        </div>
      )}

      {/* Missing Calculation Fields Panel */}
      {effectiveRHCData?.missingCalculationFields && effectiveRHCData.missingCalculationFields.length > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <MissingInfoPanel
              missingInfo={{
                missing_structured: effectiveRHCData.missingCalculationFields,
                completeness_score: `${Math.round((1 - effectiveRHCData.missingCalculationFields.length / 10) * 100)}%`
              }}
              onSubmit={(answers) => onReprocessWithAnswers && onReprocessWithAnswers(answers)}
              onDismiss={onDismissMissingInfo}
              agentType="right-heart-cath"
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Right Heart Cath Report Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-gray-200 rounded-lg bg-white shadow-sm relative"
      >

        {/* Custom Fields Section */}
        {(Object.keys(customFields).length > 0 || showAddField) && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Custom Fields</h3>
              <Button
                onClick={() => setShowAddField(!showAddField)}
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {showAddField ? 'Cancel' : '+ Add Field'}
              </Button>
            </div>

            {/* Add Field Form */}
            {showAddField && (
              <div className="bg-white rounded-lg p-3 mb-3 border border-emerald-200">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Field name (e.g., 'Fluoroscopy time')"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomField();
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="Value (e.g., '8.2 minutes')"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomField();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleAddCustomField}
                  variant="success"
                  size="sm"
                  fullWidth
                  className="text-xs"
                >
                  Add Field
                </Button>
              </div>
            )}

            {/* Display Custom Fields */}
            {Object.keys(customFields).length > 0 && (
              <div className="space-y-2">
                {Object.entries(customFields).map(([name, value]) => (
                  <div
                    key={name}
                    className="bg-white rounded px-3 py-2 flex items-center justify-between border border-emerald-200"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">{name}:</span>
                      <span className="text-sm text-gray-900 ml-2">{value}</span>
                    </div>
                    <IconButton
                      onClick={() => handleRemoveCustomField(name)}
                      icon={<X />}
                      variant="ghost"
                      size="sm"
                      aria-label="Remove field"
                      className="text-red-500 hover:text-red-700 ml-2"
                      title="Remove field"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Sections */}
        <div className="divide-y divide-gray-200">
          {SECTION_CONFIGS.map(({ key, title, icon: IconComponent, color }) => {
            const isExpanded = expandedSections.has(key);

            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="w-full px-4 py-3 flex flex-row items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-row items-center gap-2 min-w-0">
                    <IconComponent className={`w-4 h-4 text-${color}-600 flex-shrink-0`} />
                    <span className="font-medium text-gray-900 truncate text-left">{title}</span>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 py-3 pb-4"
                    >
                      {renderSectionContent(
                        key,
                        (isInlineEditing && inlineReportDraft) ? inlineReportDraft : effectiveRHCData,
                        isInlineEditing ? { editable: true, onChange: (path, value, numeric=false) => updateInlineField(path, value, numeric), getClass: getValidationClass } : undefined
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </motion.div>

      {/* Edit All Fields Button - Normal flow, not fixed */}
      <div className="mt-6 mb-4 px-4">
        <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-3">
          <div className="relative">
            <Button
              type="button"
              onClick={() => setIsEditingFields(true)}
              disabled={!effectiveRHCData}
              variant="outline"
              size="md"
              fullWidth
              startIcon={<Edit3 />}
              className="border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400"
              title={missingOptionalCount > 0
                ? `Edit all fields - ${missingOptionalCount} optional field${missingOptionalCount > 1 ? 's' : ''} available: ${missingFieldNames.join(', ')}`
                : "Edit all fields including patient data, haemodynamics, access, catheter details, and add custom fields"
              }
            >
              Edit All Fields
            </Button>

            {/* Badge for missing optional fields */}
            {missingOptionalCount > 0 && (
              <span
                className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full border-2 border-white shadow-sm"
                aria-label={`${missingOptionalCount} optional fields available`}
              >
                {missingOptionalCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Field Editor Modal */}
      {isEditingFields && effectiveRHCData && (
        <RHCFieldEditor
          key={`field-editor-${effectiveRHCData.id || Date.now()}`}
          rhcReport={effectiveRHCData}
          onSave={handleFieldEditorSave}
          onCancel={handleFieldEditorCancel}
        />
      )}

      {/* Card Preview Modal */}
      {cardPreview && (
        <RHCCardPreviewModal
          imageDataUrl={cardPreview.dataUrl}
          imageBlob={cardPreview.blob}
          patientName={selectedPatientName}
          onClose={() => setCardPreview(null)}
        />
      )}

      {/* Validation Modal */}
      {rhcValidation.showValidationModal && rhcValidation.validationResult && (
        <FieldValidationPrompt
          agentLabel="RHC Data"
          validation={rhcValidation.validationResult}
          fieldConfig={RHC_VALIDATION_FIELD_CONFIG}
          copy={RHC_VALIDATION_COPY}
          onCancel={() => {
            console.log('🚫 RHC Display: Validation cancelled');
            rhcValidation.handleValidationCancel();
          }}
          onSkip={() => {
            console.log('⏭️ RHC Display: Validation skipped');
            rhcValidation.handleValidationSkip();
            // TODO: Force generation with incomplete data
          }}
          onContinue={(userFields) => {
            console.log('✅ RHC Display: Validation complete, user fields:', userFields);

            // Clear stale edited state before reprocessing
            // This ensures fresh validated data flows cleanly
            setEditedRHCReport(null);

            rhcValidation.handleValidationContinue(userFields);
            // Re-process with user-provided fields
            if (onReprocessWithValidation) {
              onReprocessWithValidation(userFields as Record<string, any>);
            }
          }}
        />
      )}
    </div>
  );
};

// Helper functions for section rendering
const renderPressuresSection = (pressures: HaemodynamicPressures) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Right Atrial Pressures */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2">Right Atrial Pressures</h4>
      <div className="space-y-1 text-sm">
        {pressures.ra.aWave && <div>A-wave: <span className="font-mono">{pressures.ra.aWave} mmHg</span></div>}
        {pressures.ra.vWave && <div>V-wave: <span className="font-mono">{pressures.ra.vWave} mmHg</span></div>}
        {pressures.ra.mean && <div>Mean: <span className="font-mono">{pressures.ra.mean} mmHg</span></div>}
      </div>
    </div>

    {/* Right Ventricular Pressures */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2">Right Ventricular Pressures</h4>
      <div className="space-y-1 text-sm">
        {pressures.rv.systolic && <div>Systolic: <span className="font-mono">{pressures.rv.systolic} mmHg</span></div>}
        {pressures.rv.diastolic && <div>Diastolic: <span className="font-mono">{pressures.rv.diastolic} mmHg</span></div>}
        {pressures.rv.rvedp && <div>RVEDP: <span className="font-mono">{pressures.rv.rvedp} mmHg</span></div>}
      </div>
    </div>

    {/* Pulmonary Artery Pressures */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2">Pulmonary Artery Pressures</h4>
      <div className="space-y-1 text-sm">
        {pressures.pa.systolic && <div>Systolic: <span className="font-mono">{pressures.pa.systolic} mmHg</span></div>}
        {pressures.pa.diastolic && <div>Diastolic: <span className="font-mono">{pressures.pa.diastolic} mmHg</span></div>}
        {pressures.pa.mean && <div>Mean: <span className="font-mono">{pressures.pa.mean} mmHg</span></div>}
      </div>
    </div>

    {/* Pulmonary Capillary Wedge Pressure */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2">PCWP</h4>
      <div className="space-y-1 text-sm">
        {pressures.pcwp.aWave && <div>A-wave: <span className="font-mono">{pressures.pcwp.aWave} mmHg</span></div>}
        {pressures.pcwp.vWave && <div>V-wave: <span className="font-mono">{pressures.pcwp.vWave} mmHg</span></div>}
        {pressures.pcwp.mean && <div>Mean: <span className="font-mono">{pressures.pcwp.mean} mmHg</span></div>}
      </div>
    </div>
  </div>
);

const renderCardiacOutputSection = (cardiacOutput: CardiacOutput, patientData?: { sao2?: number; svo2?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2">Thermodilution</h4>
      <div className="space-y-1 text-sm">
        {cardiacOutput.thermodilution.co && (
          <div>Cardiac Output: <span className="font-mono">{cardiacOutput.thermodilution.co} L/min</span></div>
        )}
        {cardiacOutput.thermodilution.ci && (
          <div>Cardiac Index: <span className="font-mono">{cardiacOutput.thermodilution.ci} L/min/m²</span></div>
        )}
      </div>
    </div>
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2">Fick Method</h4>
      <div className="space-y-1 text-sm">
        {cardiacOutput.fick.co && (
          <div>Cardiac Output: <span className="font-mono">{cardiacOutput.fick.co} L/min</span></div>
        )}
        {cardiacOutput.fick.ci && (
          <div>Cardiac Index: <span className="font-mono">{cardiacOutput.fick.ci} L/min/m²</span></div>
        )}
      </div>
    </div>
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-2">Other Measurements</h4>
      <div className="space-y-1 text-sm">
        {patientData?.sao2 && (
          <div>Arterial O₂ Saturation: <span className="font-mono">{patientData.sao2}%</span></div>
        )}
        {(cardiacOutput.mixedVenousO2 || patientData?.svo2) && (
          <div>Mixed Venous O₂: <span className="font-mono">{cardiacOutput.mixedVenousO2 || patientData?.svo2}%</span></div>
        )}
        {cardiacOutput.wedgeSaturation && (
          <div>Wedge Saturation: <span className="font-mono">{cardiacOutput.wedgeSaturation}%</span></div>
        )}
      </div>
    </div>
  </div>
);

// Helper function to format vascular access for display
function formatVascularAccess(access: string): string {
  if (!access) return 'Not specified';
  const formatted = access
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  // Add "Vein" suffix for internal jugular/femoral
  if (formatted.includes('Internal Jugular') || formatted.includes('Femoral')) {
    return formatted + ' Vein';
  }
  return formatted;
}

// Helper function to render section content
function renderSectionContent(
  sectionKey: string,
  rhcData: RightHeartCathReport | null,
  opts?: { editable?: boolean; onChange?: (path: string, value: string, numeric?: boolean) => void; getClass?: (path: string, value: string | number | null | undefined) => string }
) {
  if (!rhcData) {
    return <div className="text-gray-500 italic">No structured data available</div>;
  }

  // Defensive fallbacks for all destructured properties
  const {
    rhcData: data,
    haemodynamicPressures,
    cardiacOutput,
    exerciseHaemodynamics,
    complications = [],
    patientData = {}
  } = rhcData;

  switch (sectionKey) {
    case 'indication':
      return (
        <div className="space-y-3 text-sm">
          <div><span className="font-medium">Indication:</span> {data.indication.replace('_', ' ')}</div>
          {data.clinicalPresentation && (
            <div><span className="font-medium">Clinical Presentation:</span> {data.clinicalPresentation}</div>
          )}
          {data.recentInvestigations && (
            <div><span className="font-medium">Recent Investigations:</span> {data.recentInvestigations}</div>
          )}
        </div>
      );

    case 'patient_details': {
      // Check if we have any patient data to display
      const hasPatientData = patientData && (
        patientData.height || patientData.weight || patientData.bsa ||
        patientData.bmi || patientData.heartRate || patientData.age ||
        patientData.gender || patientData.systolicBP || patientData.rhythm ||
        patientData.haemoglobin || patientData.sao2 || patientData.svo2
      );
      const hasLabValues = data?.laboratoryValues && (
        data.laboratoryValues.haemoglobin || data.laboratoryValues.lactate
      );

      if (!hasPatientData && !hasLabValues) {
        return (
          <div className="text-gray-500 italic text-sm">
            No patient demographics recorded. Use Edit All Fields to add patient data.
          </div>
        );
      }

      return (
        <div className="space-y-3 text-sm">
          {/* Vitals (if available) */}
          {patientData && (patientData.heartRate || patientData.systolicBP || patientData.rhythm) && (
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
              <span className="font-medium text-blue-900">Vitals:</span>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {patientData.rhythm && <div>Rhythm: {patientData.rhythm}</div>}
                {patientData.heartRate && <div>Heart Rate: {patientData.heartRate} bpm</div>}
                {patientData.systolicBP && patientData.diastolicBP && (
                  <div>BP: {patientData.systolicBP}/{patientData.diastolicBP} mmHg</div>
                )}
              </div>
            </div>
          )}

          {/* Patient Demographics & Anthropometrics */}
          {patientData && (patientData.height || patientData.weight || patientData.bsa || patientData.bmi || patientData.age || patientData.gender) && (
            <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
              <span className="font-medium text-green-900">Demographics & Anthropometrics:</span>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {patientData.age && <div>Age: {patientData.age} years</div>}
                {patientData.gender && <div>Gender: {String(patientData.gender).charAt(0).toUpperCase() + String(patientData.gender).slice(1)}</div>}
                {patientData.height && <div>Height: {patientData.height} cm</div>}
                {patientData.weight && <div>Weight: {patientData.weight} kg</div>}
                {patientData.bmi && <div>BMI: {typeof patientData.bmi === 'number' ? patientData.bmi.toFixed(1) : patientData.bmi} kg/m²</div>}
                {patientData.bsa && <div>BSA: {typeof patientData.bsa === 'number' ? patientData.bsa.toFixed(2) : patientData.bsa} m²</div>}
              </div>
            </div>
          )}

          {/* Oxygen Saturations (if available) */}
          {patientData && (patientData.sao2 || patientData.svo2 || patientData.haemoglobin) && (
            <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-400">
              <span className="font-medium text-purple-900">Laboratory Values:</span>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {patientData.haemoglobin && <div>Haemoglobin: {patientData.haemoglobin} g/L</div>}
                {patientData.sao2 && <div>SaO₂: {patientData.sao2}%</div>}
                {patientData.svo2 && <div>SvO₂: {patientData.svo2}%</div>}
              </div>
            </div>
          )}

          {/* Laboratory Values from rhcData (fallback) */}
          {data?.laboratoryValues && (data.laboratoryValues.haemoglobin || data.laboratoryValues.lactate) && (
            <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-400">
              <span className="font-medium">Additional Laboratory Values:</span>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {data.laboratoryValues.haemoglobin && !patientData?.haemoglobin && <div>Haemoglobin: {data.laboratoryValues.haemoglobin} g/L</div>}
                {data.laboratoryValues.lactate && <div>Lactate: {data.laboratoryValues.lactate} mmol/L</div>}
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'procedure':
      return (
        <div className="space-y-3 text-sm">
          <div><span className="font-medium">Vascular Access:</span> {formatVascularAccess(data.vascularAccess)}</div>
          <div><span className="font-medium">Catheter Details:</span> {data.catheterDetails || 'Not specified'}</div>

          {/* Radiation Safety & Contrast */}
          {(data.fluoroscopyTime || data.fluoroscopyDose || data.doseAreaProduct || data.contrastVolume) && (
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
              <span className="font-medium text-blue-900">Radiation Safety & Contrast:</span>
              <div className="mt-1 space-y-1">
                {data.fluoroscopyTime && <div>Fluoroscopy Time: {data.fluoroscopyTime} min</div>}
                {data.fluoroscopyDose && <div>Fluoroscopy Dose: {data.fluoroscopyDose} mGy</div>}
                {data.doseAreaProduct && <div>DAP: {data.doseAreaProduct} Gy·cm²</div>}
                {data.contrastVolume && <div>Contrast Volume: {data.contrastVolume} mL</div>}
              </div>
            </div>
          )}
        </div>
      );

    case 'pressures':
      if (opts?.editable) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RA */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Right Atrial Pressures</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.ra.aWave', haemodynamicPressures.ra.aWave) || 'border-gray-300'}`} placeholder="A"
                  value={haemodynamicPressures.ra.aWave ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.ra.aWave', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.ra.vWave', haemodynamicPressures.ra.vWave) || 'border-gray-300'}`} placeholder="V"
                  value={haemodynamicPressures.ra.vWave ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.ra.vWave', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.ra.mean', haemodynamicPressures.ra.mean) || 'border-gray-300'}`} placeholder="Mean"
                  value={haemodynamicPressures.ra.mean ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.ra.mean', e.target.value)} />
              </div>
            </div>

            {/* RV */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Right Ventricular Pressures</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.rv.systolic', haemodynamicPressures.rv.systolic) || 'border-gray-300'}`} placeholder="Sys"
                  value={haemodynamicPressures.rv.systolic ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.rv.systolic', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.rv.diastolic', haemodynamicPressures.rv.diastolic) || 'border-gray-300'}`} placeholder="Dia"
                  value={haemodynamicPressures.rv.diastolic ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.rv.diastolic', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.rv.rvedp', haemodynamicPressures.rv.rvedp) || 'border-gray-300'}`} placeholder="RVEDP"
                  value={haemodynamicPressures.rv.rvedp ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.rv.rvedp', e.target.value)} />
              </div>
            </div>

            {/* PA */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Pulmonary Artery Pressures</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.pa.systolic', haemodynamicPressures.pa.systolic) || 'border-gray-300'}`} placeholder="Sys"
                  value={haemodynamicPressures.pa.systolic ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.pa.systolic', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.pa.diastolic', haemodynamicPressures.pa.diastolic) || 'border-gray-300'}`} placeholder="Dia"
                  value={haemodynamicPressures.pa.diastolic ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.pa.diastolic', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.pa.mean', haemodynamicPressures.pa.mean) || 'border-gray-300'}`} placeholder="Mean"
                  value={haemodynamicPressures.pa.mean ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.pa.mean', e.target.value)} />
              </div>
            </div>

            {/* PCWP */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">PCWP</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.pcwp.aWave', haemodynamicPressures.pcwp.aWave) || 'border-gray-300'}`} placeholder="A"
                  value={haemodynamicPressures.pcwp.aWave ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.pcwp.aWave', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.pcwp.vWave', haemodynamicPressures.pcwp.vWave) || 'border-gray-300'}`} placeholder="V"
                  value={haemodynamicPressures.pcwp.vWave ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.pcwp.vWave', e.target.value)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('haemodynamicPressures.pcwp.mean', haemodynamicPressures.pcwp.mean) || 'border-gray-300'}`} placeholder="Mean"
                  value={haemodynamicPressures.pcwp.mean ?? ''}
                  onChange={(e)=>opts.onChange?.('haemodynamicPressures.pcwp.mean', e.target.value)} />
              </div>
            </div>
          </div>
        );
      }
      return renderPressuresSection(haemodynamicPressures);

    case 'cardiac_output':
      if (opts?.editable) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Thermodilution</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-gray-600 text-xs">CO</span>
                  <input className={`flex-1 px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('cardiacOutput.thermodilution.co', cardiacOutput.thermodilution.co) || 'border-gray-300'}`} placeholder="L/min"
                    value={cardiacOutput.thermodilution.co ?? ''}
                    onChange={(e)=>opts.onChange?.('cardiacOutput.thermodilution.co', e.target.value, true)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-gray-600 text-xs">CI</span>
                  <input className={`flex-1 px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('cardiacOutput.thermodilution.ci', cardiacOutput.thermodilution.ci) || 'border-gray-300'}`} placeholder="L/min/m²"
                    value={cardiacOutput.thermodilution.ci ?? ''}
                    onChange={(e)=>opts.onChange?.('cardiacOutput.thermodilution.ci', e.target.value, true)} />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Fick Method</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-gray-600 text-xs">CO</span>
                  <input className={`flex-1 px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('cardiacOutput.fick.co', cardiacOutput.fick.co) || 'border-gray-300'}`} placeholder="L/min"
                    value={cardiacOutput.fick.co ?? ''}
                    onChange={(e)=>opts.onChange?.('cardiacOutput.fick.co', e.target.value, true)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-gray-600 text-xs">CI</span>
                  <input className={`flex-1 px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('cardiacOutput.fick.ci', cardiacOutput.fick.ci) || 'border-gray-300'}`} placeholder="L/min/m²"
                    value={cardiacOutput.fick.ci ?? ''}
                    onChange={(e)=>opts.onChange?.('cardiacOutput.fick.ci', e.target.value, true)} />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <h4 className="font-medium text-gray-900 mb-2">Oxygen Saturations</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('patientData.sao2', rhcData.patientData?.sao2) || 'border-gray-300'}`} placeholder="SaO₂ %"
                  value={String(rhcData.patientData?.sao2 ?? '')}
                  onChange={(e)=>opts.onChange?.('patientData.sao2', e.target.value, true)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('cardiacOutput.mixedVenousO2', cardiacOutput.mixedVenousO2) || 'border-gray-300'}`} placeholder="Mixed Venous %"
                  value={cardiacOutput.mixedVenousO2 ?? ''}
                  onChange={(e)=>opts.onChange?.('cardiacOutput.mixedVenousO2', e.target.value, true)} />
                <input className={`px-2 py-1 text-xs font-mono text-right border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${opts?.getClass?.('cardiacOutput.wedgeSaturation', cardiacOutput.wedgeSaturation) || 'border-gray-300'}`} placeholder="Wedge %"
                  value={cardiacOutput.wedgeSaturation ?? ''}
                  onChange={(e)=>opts.onChange?.('cardiacOutput.wedgeSaturation', e.target.value, true)} />
              </div>
            </div>
          </div>
        );
      }
      return renderCardiacOutputSection(cardiacOutput, rhcData.patientData);

    case 'calculations': {
      // Use provided calculations when they have any numeric values; otherwise compute a lightweight fallback
      const hasAnyNumeric = (c?: any) => !!c && Object.values(c).some(v => typeof v === 'number');

      let calcToShow: any = rhcData.calculations;

      // Build fallback using currently visible inputs
      const parse = (v?: string | null) => (v ? parseFloat(v) : undefined);
      const rap = parse(haemodynamicPressures.ra.mean);
      const paSys = parse(haemodynamicPressures.pa.systolic);
      const paDia = parse(haemodynamicPressures.pa.diastolic);
      const paMean = parse(haemodynamicPressures.pa.mean);
      const pcwp = parse(haemodynamicPressures.pcwp.mean);
      const tdCO = parse(cardiacOutput.thermodilution.co);
      const bsa = rhcData.patientData?.bsa;
      const hr = rhcData.patientData?.heartRate;

      const fallback: any = {};
      fallback.transpulmonaryGradient = RHCCalc.calculateTPG(paMean, pcwp);
      fallback.diastolicPressureGradient = RHCCalc.calculateDPG(paDia, pcwp);
      fallback.pulmonaryVascularResistance = RHCCalc.calculatePVR(paMean, pcwp, tdCO);
      if (fallback.pulmonaryVascularResistance && bsa) {
        fallback.pulmonaryVascularResistanceIndex = RHCCalc.calculatePVRI(fallback.pulmonaryVascularResistance, bsa);
      }
      if (tdCO && bsa) fallback.cardiacIndex = RHCCalc.calculateCardiacIndex(tdCO, bsa);
      if (tdCO && hr) fallback.strokeVolume = RHCCalc.calculateStrokeVolume(tdCO, hr);
      fallback.papi = RHCCalc.calculatePAPi(paSys, paDia, rap);

      // Decide what to show
      if (!hasAnyNumeric(calcToShow) && hasAnyNumeric(fallback)) {
        calcToShow = fallback;
      } else if (hasAnyNumeric(calcToShow) && hasAnyNumeric(fallback)) {
        // Fill gaps without overwriting existing values
        for (const [k, v] of Object.entries(fallback)) {
          if (v !== undefined && (calcToShow?.[k] === undefined || calcToShow?.[k] === null)) {
            calcToShow[k] = v;
          }
        }
      }

      if (!hasAnyNumeric(calcToShow)) {
        return <div className="text-gray-500 italic">No calculated haemodynamics available</div>;
      }
      return <CalculatedHaemodynamicsDisplay calculations={calcToShow} />;
    }

    case 'exercise':
      if (!exerciseHaemodynamics) {
        return <div className="text-gray-500 italic">Exercise testing not performed</div>;
      }
      return (
        <div className="space-y-3 text-sm">
          <div><span className="font-medium">Protocol:</span> {exerciseHaemodynamics.protocol}</div>
          <div><span className="font-medium">Duration:</span> {exerciseHaemodynamics.duration}</div>
          <div><span className="font-medium">Response:</span> {exerciseHaemodynamics.response}</div>
        </div>
      );

    case 'complications':
      if (complications.length === 0) {
        return <div className="text-green-600 text-sm">No complications reported</div>;
      }
      return (
        <div className="space-y-3">
          {complications.map((complication, index) => (
            <div key={index} className="bg-red-50 border-l-4 border-red-400 p-3">
              <div className="text-sm">
                <span className="font-medium text-red-800">
                  {complication.type.replace('_', ' ')} ({complication.severity})
                </span>
                <div className="mt-1 text-red-700">{complication.description}</div>
                {complication.management && (
                  <div className="mt-2 text-red-600"><span className="font-medium">Management:</span> {complication.management}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      );

    case 'conclusions': {
      const hasConclusions = data?.immediateOutcomes || data?.recommendations || data?.followUp;

      if (!hasConclusions) {
        return (
          <div className="text-gray-500 italic text-sm">
            No conclusions or follow-up documented. Use Edit All Fields to add recommendations.
          </div>
        );
      }

      return (
        <div className="space-y-3 text-sm">
          {data.immediateOutcomes && (
            <div><span className="font-medium">Immediate Outcomes:</span> {data.immediateOutcomes}</div>
          )}
          {data.recommendations && (
            <div><span className="font-medium">Recommendations:</span> {data.recommendations}</div>
          )}
          {data.followUp && (
            <div><span className="font-medium">Follow-up:</span> {data.followUp}</div>
          )}
        </div>
      );
    }

    default:
      return <div className="text-gray-500">Content not available</div>;
  }
}
