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
import { TAVIWorkupIncrementalService } from '@/services/TAVIWorkupIncrementalService';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import { calculateCompletion } from '@/types/taviWorkup.types';

interface EditableTAVIWorkupDisplayProps {
  workup: TAVIWorkupItem;
  onUpdate: (updater: (w: TAVIWorkupItem) => TAVIWorkupItem) => Promise<void>;
  className?: string;
}

interface SectionConfig {
  key: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>;
  title: string;
  emrField?: 'emrBackground' | 'emrInvestigations' | 'emrMedications'; // Maps to EMR extracted data
}

// NOTE: enhanced_ct REMOVED - CT data now lives in TAVIWorkupItem.ctMeasurements (CTMeasurementsCard)
// Each measurement exists in EXACTLY ONE location (no duplication)
const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'patient', title: 'Patient Demographics' },
  { key: 'background', title: 'Background History', emrField: 'emrBackground' },
  { key: 'medications', title: 'Medications', emrField: 'emrMedications' },
  { key: 'clinical', title: 'Clinical Assessment' },
  { key: 'investigations', title: 'Investigation Summary', emrField: 'emrInvestigations' },
  { key: 'laboratory', title: 'Laboratory Values' },
  { key: 'ecg', title: 'ECG Assessment' },
  { key: 'echocardiography', title: 'Echocardiography' },
  { key: 'social_history', title: 'Social History' },
  { key: 'procedure_planning', title: 'Procedure Planning' },
  { key: 'alerts', title: 'Alerts & Considerations' }
];

export const EditableTAVIWorkupDisplay: React.FC<EditableTAVIWorkupDisplayProps> = ({
  workup,
  onUpdate,
  className = ''
}) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [dictatingSection, setDictatingSection] = useState<keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'> | null>(null);

  const handleStartEdit = useCallback((sectionKey: string) => {
    const section = workup.structuredSections[sectionKey as keyof TAVIWorkupStructuredSections];
    if (section && 'content' in section) {
      setEditValue(section.content || '');
      setEditingSection(sectionKey);
    }
  }, [workup.structuredSections]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingSection) return;

    await onUpdate(w => {
      const updatedSections = {
        ...w.structuredSections,
        [editingSection]: {
          ...w.structuredSections[editingSection as keyof TAVIWorkupStructuredSections],
          content: editValue.trim()
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
  }, [editingSection, editValue, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setEditValue('');
  }, []);

  const isComplete = useCallback((sectionKey: string) => {
    const section = workup.structuredSections[sectionKey as keyof TAVIWorkupStructuredSections];
    if (!section || !('content' in section)) return false;
    return section.content && section.content !== 'Not provided' && section.content.trim().length > 0;
  }, [workup.structuredSections]);

  const getEmrSource = useCallback((emrField?: 'emrBackground' | 'emrInvestigations' | 'emrMedications'): boolean => {
    if (!emrField) return false;
    return !!(workup[emrField] && workup[emrField]!.trim().length > 0);
  }, [workup]);

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

  return (
    <>
      <div className={`space-y-3 ${className}`}>
      {SECTION_CONFIGS.map(config => {
        const section = workup.structuredSections[config.key];
        const isEditing = editingSection === config.key;
        const hasContent = isComplete(config.key);
        const hasEmrData = getEmrSource(config.emrField);

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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink-primary">{config.title}</h3>
                  {hasEmrData && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      <Database className="w-3 h-3" />
                      Auto-filled from EMR
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {hasContent ? 'Complete' : 'Not provided'}
                </p>
              </div>
              {!isEditing && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDictate(config.key)}
                    icon={<Mic className="w-3 h-3" />}
                  >
                    Dictate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(config.key)}
                    icon={<Edit2 className="w-3 h-3" />}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Section Content */}
            <div className="p-3 border-t border-line-primary">
              {isEditing ? (
                // Edit Mode
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
              ) : (
                // View Mode
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
              )}
            </div>
          </div>
        );
      })}
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
