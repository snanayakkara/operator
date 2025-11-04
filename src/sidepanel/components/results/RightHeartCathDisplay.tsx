/**
 * Right Heart Cath Structured Display Component
 *
 * Displays Right Heart Catheterisation data in a structured, interactive format:
 * - Shows haemodynamic pressures, cardiac output, and exercise testing
 * - Displays clinical data with proper medical formatting
 * - Integrated transcription section with accept/skip/edit buttons
 * - Provides formatted output for clinical documentation
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  ActivityIcon,
  FileTextIcon,
  AlertCircleIcon,
  ChevronDownIcon as _ChevronDownIcon,
  ChevronUpIcon as _ChevronUpIcon
} from '../icons/OptimizedIcons';
import { ChevronDown, ChevronUp, TrendingUp, Activity, Users as _Users, Image, Loader2, Edit3, X } from 'lucide-react';
import AnimatedCopyIcon from '../AnimatedCopyIcon';
import { TranscriptionSection } from './TranscriptionSection';
import { CalculatedHaemodynamicsDisplay } from './CalculatedHaemodynamicsDisplay';
import { MissingInfoPanel } from './MissingInfoPanel';
import { RHCFieldEditor } from './RHCFieldEditor';
import { RHCCardPreviewModal } from './RHCCardPreviewModal';
import { FieldValidationPrompt } from './FieldValidationPrompt';
import { generateRHCCardBlob, validateRHCDataForExport } from '@/utils/rhcCardExport';
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
  onCopy,
  onInsertToEMR,
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
    new Set(['indication', 'pressures', 'cardiac_output', 'calculations', 'complications'])
  );
  const [buttonStates, setButtonStates] = useState({ copied: false, inserted: false, exporting: false, exported: false });
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editedRHCReport, setEditedRHCReport] = useState<RightHeartCathReport | null>(null);

  // Validation hook
  const rhcValidation = useRHCValidation();
  const [cardPreview, setCardPreview] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Parse RHC report data or fall back to results string
  // Use edited data if available, otherwise use original rhcReport
  const effectiveRHCData = useMemo(() => {
    if (editedRHCReport) {
      return editedRHCReport;
    }
    if (rhcReport) {
      return rhcReport;
    }

    // Try to parse JSON from results field for backward compatibility
    if (results) {
      try {
        // Look for the specific RHC structured data JSON marker
        const rhcDataMatch = results.match(/<!-- RHC_STRUCTURED_DATA_JSON -->\n(\{[\s\S]*?\})\s*$/);
        if (rhcDataMatch) {
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
            complications: jsonData.complications
          };
          return mockReport;
        }

        // Fallback: try to parse any JSON object (for backward compatibility)
        const jsonMatch = results.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          if (jsonData.rhcData) {
            return jsonData as RightHeartCathReport;
          }
        }
      } catch (error) {
        console.warn('Could not parse RHC report from results:', error);
      }
    }

    return null;
  }, [rhcReport, results, editedRHCReport]);

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

  const handleCopy = useCallback(async () => {
    if (!onCopy) return;

    const content = formatForClipboard(effectiveRHCData, results);
    await onCopy(content);

    setButtonStates(prev => ({ ...prev, copied: true }));
    setTimeout(() => setButtonStates(prev => ({ ...prev, copied: false })), 2000);
  }, [effectiveRHCData, results, onCopy]);

  const handleInsertToEMR = useCallback(async () => {
    if (!onInsertToEMR) return;

    const content = formatForEMR(effectiveRHCData, results);
    await onInsertToEMR(content);

    setButtonStates(prev => ({ ...prev, inserted: true }));
    setTimeout(() => setButtonStates(prev => ({ ...prev, inserted: false })), 2000);
  }, [effectiveRHCData, results, onInsertToEMR]);

  const handleExportCard = useCallback(async () => {
    if (!effectiveRHCData) {
      alert('No RHC data available to export');
      return;
    }

    // DEBUG: Verify we're using edited data if available
    console.log('📤 Export Card - Data Source:', {
      hasEditedReport: !!editedRHCReport,
      usingEditedData: effectiveRHCData === editedRHCReport,
      pressures: {
        ra: effectiveRHCData.haemodynamicPressures.ra,
        rv: effectiveRHCData.haemodynamicPressures.rv,
        pa: effectiveRHCData.haemodynamicPressures.pa,
        pcwp: effectiveRHCData.haemodynamicPressures.pcwp
      },
      cardiacOutput: effectiveRHCData.cardiacOutput
    });

    // Validate data completeness
    const validation = validateRHCDataForExport(effectiveRHCData);
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
        mrn: effectiveRHCData.id || undefined,
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
      const { blob, dataUrl } = await generateRHCCardBlob(effectiveRHCData, { patientInfo, operatorInfo });

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

    setEditedRHCReport(updatedReport);
    setIsEditingFields(false);

    // Persist edited data to session storage
    if (onUpdateRhcReport) {
      onUpdateRhcReport(updatedReport);
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
        className="border border-gray-200 rounded-lg bg-white shadow-sm"
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HeartIcon className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Right Heart Catheterisation Report</h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!onCopy}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <AnimatedCopyIcon className="w-3 h-3 mr-1" />
                {buttonStates.copied ? 'Copied' : 'Copy'}
              </button>

              <button
                type="button"
                onClick={() => setIsEditingFields(true)}
                disabled={!effectiveRHCData}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title="Edit haemodynamic fields before export"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit Fields
              </button>

              <button
                type="button"
                onClick={handleExportCard}
                disabled={buttonStates.exporting || !effectiveRHCData}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title="Export 13×13cm PNG card (300 DPI)"
              >
                {buttonStates.exporting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : buttonStates.exported ? (
                  <>
                    <Image className="w-3 h-3 mr-1" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <Image className="w-3 h-3 mr-1" />
                    13×13 Card
                  </>
                )}
              </button>

              {onInsertToEMR && (
                <button
                  type="button"
                  onClick={handleInsertToEMR}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  <FileTextIcon className="w-3 h-3 mr-1" />
                  {buttonStates.inserted ? 'Inserted' : 'Insert to EMR'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Fields Section */}
        {(Object.keys(customFields).length > 0 || showAddField) && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Custom Fields</h3>
              <button
                onClick={() => setShowAddField(!showAddField)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {showAddField ? 'Cancel' : '+ Add Field'}
              </button>
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
                <button
                  onClick={handleAddCustomField}
                  className="w-full px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Add Field
                </button>
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
                    <button
                      onClick={() => handleRemoveCustomField(name)}
                      className="text-red-500 hover:text-red-700 ml-2"
                      title="Remove field"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Custom Field Button (when no custom fields) */}
        {Object.keys(customFields).length === 0 && !showAddField && (
          <button
            onClick={() => setShowAddField(true)}
            className="w-full mb-4 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 rounded-lg transition-colors"
          >
            + Add Custom Field
          </button>
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
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 max-w-full overflow-hidden"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <IconComponent className={`w-4 h-4 text-${color}-600 flex-shrink-0`} />
                    <span className="font-medium text-gray-900 truncate">{title}</span>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 pb-4"
                    >
                      {renderSectionContent(key, effectiveRHCData)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Field Editor Modal */}
      {isEditingFields && effectiveRHCData && (
        <RHCFieldEditor
          rhcReport={rhcReport || effectiveRHCData}
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

// Helper function to render section content
function renderSectionContent(sectionKey: string, rhcData: RightHeartCathReport | null) {
  if (!rhcData) {
    return <div className="text-gray-500 italic">No structured data available</div>;
  }

  const { rhcData: data, haemodynamicPressures, cardiacOutput, exerciseHaemodynamics, complications } = rhcData;

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

    case 'procedure':
      return (
        <div className="space-y-3 text-sm">
          <div><span className="font-medium">Vascular Access:</span> {data.vascularAccess.replace('_', ' ')}</div>
          <div><span className="font-medium">Catheter Details:</span> {data.catheterDetails}</div>

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

          {/* Laboratory Values */}
          {(data.laboratoryValues.haemoglobin || data.laboratoryValues.lactate) && (
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium">Laboratory Values:</span>
              {data.laboratoryValues.haemoglobin && <div>Haemoglobin: {data.laboratoryValues.haemoglobin} g/L</div>}
              {data.laboratoryValues.lactate && <div>Lactate: {data.laboratoryValues.lactate} mmol/L</div>}
            </div>
          )}
        </div>
      );

    case 'pressures':
      return renderPressuresSection(haemodynamicPressures);

    case 'cardiac_output':
      return renderCardiacOutputSection(cardiacOutput, rhcData.patientData);

    case 'calculations':
      if (!rhcData.calculations || Object.keys(rhcData.calculations).length === 0) {
        return <div className="text-gray-500 italic">No calculated haemodynamics available</div>;
      }
      return <CalculatedHaemodynamicsDisplay calculations={rhcData.calculations} />;

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

    case 'conclusions':
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

    default:
      return <div className="text-gray-500">Content not available</div>;
  }
}

// Helper functions for content formatting
function formatForClipboard(rhcData: RightHeartCathReport | null, fallbackResults?: string): string {
  if (rhcData && rhcData.content) {
    // Extract the clean report content (already post-processed to remove markdown)
    // Remove the JSON data marker if present
    let content = rhcData.content;
    const jsonMarkerIndex = content.indexOf('<!-- RHC_STRUCTURED_DATA_JSON -->');
    if (jsonMarkerIndex !== -1) {
      content = content.substring(0, jsonMarkerIndex).trim();
    }
    return content;
  }

  // Fallback to results if no structured data
  if (fallbackResults) {
    let content = fallbackResults;
    const jsonMarkerIndex = content.indexOf('<!-- RHC_STRUCTURED_DATA_JSON -->');
    if (jsonMarkerIndex !== -1) {
      content = content.substring(0, jsonMarkerIndex).trim();
    }
    return content;
  }

  return 'No report data available';
}

function formatForEMR(rhcData: RightHeartCathReport | null, fallbackResults?: string): string {
  // Same formatting for EMR as clipboard (clean narrative text)
  return formatForClipboard(rhcData, fallbackResults);
}
