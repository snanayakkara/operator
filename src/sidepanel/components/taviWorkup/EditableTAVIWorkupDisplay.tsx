/**
 * Editable TAVI Workup Display - Phase 3/8
 *
 * Reuses TAVIWorkupDisplay component pattern with inline editing capability.
 * Each section can be clicked to expand into a textarea for editing.
 *
 * Features:
 * - Display all 10 TAVI narrative sections with completion indicators
 * - CT measurements moved to separate CTMeasurementsCard (no duplication)
 * - "Auto-filled from EMR" badges for sections with extracted data
 * - Click section → textarea overlay for inline editing
 * - Save/Cancel buttons for each section
 * - Real-time completion percentage updates
 */

import React, { useState, useCallback } from 'react';
import { Edit2, Check, X, Database, Mic } from 'lucide-react';
import Button from '../buttons/Button';
import { DictateSectionModal } from './DictateSectionModal';
import { ProcedurePlanningCard } from './ProcedurePlanningCard';
import { DetailsCard } from './DetailsCard';
import { TAVIWorkupIncrementalService } from '@/services/TAVIWorkupIncrementalService';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import { calculateCompletion } from '@/types/taviWorkup.types';
import type { Clinician } from '@/types/rounds.types';
import {
  STRUCTURED_SECTION_CONFIGS,
  isStructuredSectionKey,
  parseStructuredSectionContent,
  serializeStructuredSectionContent
} from '@/utils/taviStructuredSectionFields';

interface EditableTAVIWorkupDisplayProps {
  workup: TAVIWorkupItem;
  onUpdate: (updater: (w: TAVIWorkupItem) => TAVIWorkupItem) => Promise<void>;
  className?: string;
  clinicians?: Clinician[]; // For Details section referring practitioner dropdown
  selectedValveName?: string; // For Procedure Planning device field (auto-populated from valve selection)
}

interface SectionConfig {
  key: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>;
  title: string;
  emrField?: 'emrBackground' | 'emrInvestigations' | 'emrMedications' | 'emrPatientDemographics' | 'emrLaboratory' | 'emrEchocardiography'; // Maps to EMR extracted data
}

// NOTE: enhanced_ct REMOVED - CT data now lives in TAVIWorkupItem.ctMeasurements (CTMeasurementsCard)
// Each measurement exists in EXACTLY ONE location (no duplication)
// SECTION ORDERING: Demographics → Details → Symptoms → Past History → Social History → Medications → Lab Values → ECG → Coronary Angiogram → Echocardiogram → Recommendation → Procedure Planning
const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'patient', title: 'Patient Demographics', emrField: 'emrPatientDemographics' },
  // Details section rendered separately (referral fields + metadata)
  { key: 'clinical', title: 'Symptoms' }, // RENAMED from "Clinical Assessment"
  { key: 'background', title: 'Past History', emrField: 'emrBackground' }, // RENAMED from "Background History"
  { key: 'social_history', title: 'Social History' },
  { key: 'medications', title: 'Medications', emrField: 'emrMedications' },
  { key: 'laboratory', title: 'Lab Values', emrField: 'emrLaboratory' }, // RENAMED from "Laboratory Values"
  { key: 'ecg', title: 'ECG' }, // RENAMED from "ECG Assessment"
  { key: 'investigations', title: 'Coronary Angiogram' }, // RENAMED from "Other Investigations"
  { key: 'echocardiography', title: 'Echocardiogram', emrField: 'emrEchocardiography' }, // RENAMED from "Echocardiography"
  // CT Measurements rendered separately via CTMeasurementsCard (positioned here)
  { key: 'alerts', title: 'Recommendation' }, // RENAMED from "Alerts & Considerations"
  { key: 'procedure_planning', title: 'Procedure Planning' }
  // Uses ProcedurePlanningCard component (not textarea)
];

export const EditableTAVIWorkupDisplay: React.FC<EditableTAVIWorkupDisplayProps> = ({
  workup,
  onUpdate,
  className = '',
  clinicians = [],
  selectedValveName
}) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [structuredEditValues, setStructuredEditValues] = useState<Record<string, string>>({});
  const [structuredEditExtra, setStructuredEditExtra] = useState<string>('');
  const [dictatingSection, setDictatingSection] = useState<keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'> | null>(null);

  const handleStartEdit = useCallback((sectionKey: string) => {
    const section = workup.structuredSections[sectionKey as keyof TAVIWorkupStructuredSections];
    if (section && 'content' in section) {
      if (isStructuredSectionKey(sectionKey)) {
        const parsed = parseStructuredSectionContent(sectionKey, section.content || '');
        setStructuredEditValues(parsed.values);
        setStructuredEditExtra(parsed.extra);
        setEditingSection(sectionKey);
        return;
      }
      setEditValue(section.content || '');
      setEditingSection(sectionKey);
    }
  }, [workup.structuredSections]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingSection) return;

    const nextContent = isStructuredSectionKey(editingSection)
      ? serializeStructuredSectionContent(editingSection, structuredEditValues, structuredEditExtra)
      : editValue.trim();

    await onUpdate(w => {
      const updatedSections = {
        ...w.structuredSections,
        [editingSection]: {
          ...w.structuredSections[editingSection as keyof TAVIWorkupStructuredSections],
          content: nextContent
        }
      };

      return {
        ...w,
        structuredSections: updatedSections,
        completionPercentage: calculateCompletion(updatedSections)
      };
    });

    setEditingSection(null);
    setEditValue('');
    setStructuredEditValues({});
    setStructuredEditExtra('');
  }, [
    editingSection,
    editValue,
    structuredEditExtra,
    structuredEditValues,
    onUpdate
  ]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setEditValue('');
    setStructuredEditValues({});
    setStructuredEditExtra('');
  }, []);

  const isComplete = useCallback((sectionKey: string) => {
    const section = workup.structuredSections[sectionKey as keyof TAVIWorkupStructuredSections];
    if (!section || !('content' in section)) return false;
    return section.content && section.content !== 'Not provided' && section.content.trim().length > 0;
  }, [workup.structuredSections]);

  const getEmrSource = useCallback((emrField?: SectionConfig['emrField']): boolean => {
    if (!emrField) return false;
    return !!(workup[emrField] && workup[emrField]!.trim().length > 0);
  }, [workup]);

  const updateStructuredField = useCallback((key: string, value: string) => {
    setStructuredEditValues(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleDictate = useCallback((sectionKey: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>) => {
    setDictatingSection(sectionKey);
  }, []);

  const handleDictationMerge = useCallback(async (parsedContent: string) => {
    if (!dictatingSection) return;

    const incrementalService = TAVIWorkupIncrementalService.getInstance();
    const section = workup.structuredSections[dictatingSection];

    if (section && 'content' in section) {
      const mergedContent = incrementalService.mergeContent(section.content, parsedContent);

      await onUpdate(w => {
        const updatedSections = {
          ...w.structuredSections,
          [dictatingSection]: {
            ...section,
            content: mergedContent
          }
        };

        return {
          ...w,
          structuredSections: updatedSections,
          completionPercentage: calculateCompletion(updatedSections)
        };
      });
    }

    setDictatingSection(null);
  }, [dictatingSection, workup.structuredSections, onUpdate]);

  const renderSection = (config: SectionConfig) => {
    if (config.key === 'procedure_planning') {
      return (
        <ProcedurePlanningCard
          key={config.key}
          planning={workup.procedurePlanning}
          onUpdate={(planning) => onUpdate(w => ({ ...w, procedurePlanning: planning }))}
          selectedValveName={selectedValveName}
        />
      );
    }

    const section = workup.structuredSections[config.key];
    const isEditing = editingSection === config.key;
    const hasContent = isComplete(config.key);
    const hasEmrData = getEmrSource(config.emrField);
    const structuredSectionKey = isStructuredSectionKey(config.key) ? config.key : null;
    const structuredConfig = structuredSectionKey ? STRUCTURED_SECTION_CONFIGS[structuredSectionKey] : null;
    const structuredDisplay = structuredSectionKey
      ? parseStructuredSectionContent(
        structuredSectionKey,
        section && 'content' in section ? section.content : ''
      )
      : null;
    const hasStructuredValues = structuredDisplay
      ? Object.values(structuredDisplay.values).some(value => value.trim().length > 0)
      : false;
    const hasStructuredExtra = structuredDisplay ? structuredDisplay.extra.trim().length > 0 : false;

    return (
      <div key={config.key} className="bg-white rounded-lg border border-line-primary overflow-hidden">
        {/* Section Header */}
        <div
          className={`p-3 flex items-center justify-between ${
            hasContent ? 'bg-emerald-50 border-l-4 border-l-emerald-500' :
            'bg-gray-50 border-l-4 border-l-gray-300'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-ink-primary">{config.title}</h3>
              {hasEmrData && (
                <span className="cursor-help" title="Auto-filled from EMR">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                </span>
              )}
            </div>
            {config.key === 'patient' && workup.patient ? (
              <p className="text-sm font-medium text-purple-700 mt-1">{workup.patient}</p>
            ) : null}
            <p className="text-xs text-ink-tertiary mt-0.5">
              {hasContent ? 'Complete' : 'Not provided'}
            </p>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-0.5 flex-shrink-0 bg-white/50 rounded-md border border-line-secondary">
              <button
                type="button"
                onClick={() => handleDictate(config.key)}
                className="p-1.5 hover:bg-gray-100 rounded-l-md transition-colors"
                title="Dictate"
              >
                <Mic className="w-3.5 h-3.5 text-ink-secondary" />
              </button>
              <div className="w-px h-4 bg-line-secondary" />
              <button
                type="button"
                onClick={() => handleStartEdit(config.key)}
                className="p-1.5 hover:bg-gray-100 rounded-r-md transition-colors"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5 text-ink-secondary" />
              </button>
            </div>
          )}
        </div>

        {/* Section Content */}
        <div className="p-3 border-t border-line-primary">
          {isEditing ? (
            structuredSectionKey && structuredConfig ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-3 text-xs">
                  {structuredConfig.fields.map((field, index) => {
                    const listId = field.options ? `${config.key}-${field.key}-options` : undefined;
                    return (
                      <React.Fragment key={field.key}>
                        <label className="font-medium text-ink-secondary">{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={structuredEditValues[field.key] || ''}
                            onChange={(e) => updateStructuredField(field.key, e.target.value)}
                            className="w-full min-h-[80px] px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                            placeholder={field.placeholder}
                            autoFocus={index === 0}
                          />
                        ) : (
                          <>
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              inputMode={field.inputMode}
                              step={field.step}
                              value={structuredEditValues[field.key] || ''}
                              onChange={(e) => updateStructuredField(field.key, e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                              placeholder={field.placeholder}
                              list={listId}
                              autoFocus={index === 0}
                            />
                            {listId && (
                              <datalist id={listId}>
                                {field.options?.map(option => (
                                  <option key={option} value={option} />
                                ))}
                              </datalist>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                {structuredConfig.extraLabel && structuredEditExtra.trim().length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-ink-secondary">
                      {structuredConfig.extraLabel}
                    </label>
                    <textarea
                      value={structuredEditExtra}
                      onChange={(e) => setStructuredEditExtra(e.target.value)}
                      className="w-full min-h-[80px] px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                    />
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    icon={<X className="w-3 h-3" />}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    icon={<Check className="w-3 h-3" />}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder={`Enter ${config.title.toLowerCase()}...`}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    icon={<X className="w-3 h-3" />}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    icon={<Check className="w-3 h-3" />}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )
          ) : (
            structuredSectionKey && structuredConfig && structuredDisplay ? (
              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-xs">
                  {structuredConfig.fields.map(field => {
                    const value = structuredDisplay.values[field.key] || '';
                    return (
                      <React.Fragment key={field.key}>
                        <div className="font-medium text-ink-secondary">{field.label}</div>
                        <div className={`whitespace-pre-wrap ${value ? 'text-ink-primary' : 'text-ink-tertiary'}`}>
                          {value || '-'}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
                {hasStructuredExtra && structuredConfig.extraLabel && (
                  <div className="text-xs">
                    <div className="font-medium text-ink-secondary">{structuredConfig.extraLabel}</div>
                    <div className="whitespace-pre-wrap text-ink-primary mt-1">
                      {structuredDisplay.extra}
                    </div>
                  </div>
                )}
                {!hasStructuredValues && !hasStructuredExtra && (
                  <div className="text-sm text-ink-tertiary italic">
                    Click "Edit" to add content...
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {hasContent ? (
                  <div className="text-sm text-ink-primary whitespace-pre-wrap">
                    {section && 'content' in section ? section.content : ''}
                  </div>
                ) : (
                  <div className="text-sm text-ink-tertiary italic">
                    Click "Edit" to add content...
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  const patientSection = SECTION_CONFIGS.find(config => config.key === 'patient');
  const remainingSections = SECTION_CONFIGS.filter(config => config.key !== 'patient');

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {patientSection ? renderSection(patientSection) : null}
        <DetailsCard
          workup={workup}
          clinicians={clinicians}
          onUpdate={onUpdate}
        />
        {remainingSections.map(renderSection)}
      </div>

      {/* Dictation Modal */}
      {dictatingSection && (
        <DictateSectionModal
          sectionKey={dictatingSection}
          sectionTitle={SECTION_CONFIGS.find(c => c.key === dictatingSection)?.title || dictatingSection}
          onClose={() => setDictatingSection(null)}
          onMerge={handleDictationMerge}
        />
      )}
    </>
  );
};
