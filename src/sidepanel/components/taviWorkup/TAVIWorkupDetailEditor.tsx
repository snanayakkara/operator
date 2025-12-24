/**
 * TAVI Workup Detail Editor - Phase 3
 *
 * Full-width detail panel showing workup metadata and sections.
 * Pattern mirrors RoundsView detail panel with editable fields.
 *
 * Phase 1: Basic metadata display ✅
 * Phase 2: Add Notion sync indicators ✅
 * Phase 3: Add EMR auto-extraction + section editing ✅
 * Phase 4: Add incremental dictation
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Calendar, MapPin, User, Stethoscope, CheckCircle2, RefreshCw, Database, Eye, FileDown } from 'lucide-react';
import Button from '../buttons/Button';
import { useTAVIWorkup } from '@/contexts/TAVIWorkupContext';
import { EditableTAVIWorkupDisplay } from './EditableTAVIWorkupDisplay';
import { CTMeasurementsCard } from './CTMeasurementsCard';
import { ValveRecommendationCard } from './ValveRecommendationCard';
import { ValveSelectorCard } from './ValveSelectorCard';
import { DicomViewerCard } from './DicomViewerCard';
import { PresentationPreviewModal } from './PresentationPreviewModal';
import { calculateCompletion } from '@/types/taviWorkup.types';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';
import type { DicomSnapshot } from '@/types/dicom.types';
import type { ValveSelection } from '@/services/ValveSizingServiceV2';
import { taviWorkupPDFService } from '@/services/TAVIWorkupPDFService';

interface TAVIWorkupDetailEditorProps {
  workupId: string;
  onBack: () => void;
}

export const TAVIWorkupDetailEditor: React.FC<TAVIWorkupDetailEditorProps> = ({ workupId, onBack }) => {
  const { workups, updateWorkup, generatePresentation } = useTAVIWorkup();
  const workup = workups.find(w => w.id === workupId);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // === EMR AUTO-EXTRACTION (Phase 3) ===
  const extractEMRData = useCallback(async () => {
    setExtracting(true);
    setExtractError(null);

    try {
      // Get active tab ID
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;

      if (!tabId) {
        throw new Error('No active tab found');
      }

      // Extract Background, Investigations, and Medications from EMR
      const [backgroundResult, investigationsResult, medicationsResult] = await Promise.allSettled([
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CUSTOM_NOTE_CONTENT', fieldName: 'Background' }),
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CUSTOM_NOTE_CONTENT', fieldName: 'Investigation Summary' }),
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CUSTOM_NOTE_CONTENT', fieldName: 'Medications (Problem List for Phil)' })
      ]);

      const extractContent = (result: PromiseSettledResult<any>): string => {
        if (result.status === 'fulfilled' && result.value?.content) {
          return result.value.content.trim();
        }
        return '';
      };

      const emrBackground = extractContent(backgroundResult);
      const emrInvestigations = extractContent(investigationsResult);
      const emrMedications = extractContent(medicationsResult);

      // Update workup with extracted EMR data and pre-populate sections
      await updateWorkup(workupId, w => {
        const updatedSections = {
          ...w.structuredSections,
          background: {
            ...w.structuredSections.background,
            content: emrBackground || w.structuredSections.background.content
          },
          investigations: {
            ...w.structuredSections.investigations,
            content: emrInvestigations || w.structuredSections.investigations.content
          },
          medications: {
            ...w.structuredSections.medications,
            content: emrMedications || w.structuredSections.medications.content
          }
        };

        return {
          ...w,
          emrBackground,
          emrInvestigations,
          emrMedications,
          emrLastExtracted: Date.now(),
          structuredSections: updatedSections,
          completionPercentage: calculateCompletion(updatedSections)
        };
      });

      console.log(`[TAVIWorkupDetailEditor] EMR extraction complete for workup ${workupId}`);
    } catch (error) {
      console.error('[TAVIWorkupDetailEditor] EMR extraction failed:', error);
      setExtractError(error instanceof Error ? error.message : 'Failed to extract EMR data');
    } finally {
      setExtracting(false);
    }
  }, [workupId, updateWorkup]);

  // Auto-extract EMR data on workup open (if not already extracted)
  useEffect(() => {
    if (workup && !workup.emrLastExtracted) {
      extractEMRData();
    }
  }, [workup?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // === PRESENTATION (Phase 6) ===
  const handlePresent = useCallback(async () => {
    setPresenting(true);

    try {
      await generatePresentation(workupId);
    } catch (error) {
      console.error('[TAVIWorkupDetailEditor] Presentation failed:', error);
    } finally {
      setPresenting(false);
    }
  }, [workupId, generatePresentation]);

  // === CT MEASUREMENTS UPDATE ===
  const handleCTMeasurementsUpdate = useCallback(async (measurements: TAVIWorkupCTMeasurements) => {
    await updateWorkup(workupId, w => ({
      ...w,
      ctMeasurements: measurements
    }));
  }, [workupId, updateWorkup]);

  // === DICOM SNAPSHOTS UPDATE (Phase 8.2) ===
  const handleSnapshotCapture = useCallback(async (snapshot: DicomSnapshot) => {
    await updateWorkup(workupId, w => ({
      ...w,
      snapshots: [...(w.snapshots || []), snapshot]
    }));
  }, [workupId, updateWorkup]);

  const handleSnapshotsChange = useCallback(async (snapshots: DicomSnapshot[]) => {
    await updateWorkup(workupId, w => ({
      ...w,
      snapshots
    }));
  }, [workupId, updateWorkup]);

  // === VALVE SELECTION (Phase 9) ===
  const handleValveSelect = useCallback(async (selection: ValveSelection | undefined) => {
    await updateWorkup(workupId, w => ({
      ...w,
      selectedValve: selection
    }));
  }, [workupId, updateWorkup]);

  // === PDF EXPORT (Phase 8.4) ===
  const handleExportPDF = useCallback(async () => {
    if (!workup) return;

    setExportingPDF(true);
    try {
      await taviWorkupPDFService.downloadPDF(workup);
      console.log(`[TAVIWorkupDetailEditor] PDF exported for workup ${workupId}`);
    } catch (error) {
      console.error('[TAVIWorkupDetailEditor] PDF export failed:', error);
    } finally {
      setExportingPDF(false);
    }
  }, [workup, workupId]);

  if (!workup) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-sm text-ink-secondary">Workup not found</p>
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line-primary bg-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress Ring */}
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - workup.completionPercentage / 100)}`}
                  className="text-purple-600 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-ink-primary">{workup.completionPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Patient Name */}
        <div className="bg-white rounded-lg border border-line-primary p-4">
          <h2 className="text-lg font-semibold text-ink-primary">{workup.patient}</h2>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              workup.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              workup.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {workup.status}
            </span>
            {workup.readyToPresent && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                <CheckCircle2 className="w-3 h-3" />
                Ready to Present
              </span>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="bg-white rounded-lg border border-line-primary p-4 space-y-3">
          <h3 className="text-sm font-semibold text-ink-primary">Details</h3>

          {workup.referralDate && (
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-ink-tertiary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-tertiary">Referral Date</div>
                <div className="text-sm text-ink-primary">{workup.referralDate}</div>
              </div>
            </div>
          )}

          {workup.procedureDate && (
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-ink-tertiary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-tertiary">Procedure Date</div>
                <div className="text-sm text-ink-primary">{workup.procedureDate}</div>
              </div>
            </div>
          )}

          {workup.referrer && (
            <div className="flex items-start gap-3">
              <Stethoscope className="w-4 h-4 text-ink-tertiary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-tertiary">Referrer</div>
                <div className="text-sm text-ink-primary">{workup.referrer}</div>
              </div>
            </div>
          )}

          {workup.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-ink-tertiary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-tertiary">Location</div>
                <div className="text-sm text-ink-primary">{workup.location}</div>
              </div>
            </div>
          )}

          {workup.category && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-ink-tertiary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-tertiary">Category</div>
                <div className="text-sm text-ink-primary">{workup.category}</div>
              </div>
            </div>
          )}
        </div>

        {/* EMR Extraction Banner */}
        {workup.emrLastExtracted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">EMR Data Extracted</p>
                  <p className="text-xs text-blue-700">
                    {new Date(workup.emrLastExtracted).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={extractEMRData}
                disabled={extracting}
                icon={<RefreshCw className={`w-3 h-3 ${extracting ? 'animate-spin' : ''}`} />}
              >
                {extracting ? 'Extracting...' : 'Refresh'}
              </Button>
            </div>
          </div>
        )}

        {/* Extraction Error Banner */}
        {extractError && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
            <p className="text-sm text-rose-900">{extractError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={extractEMRData}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Extracting State */}
        {extracting && !workup.emrLastExtracted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-900">Extracting data from EMR...</p>
            </div>
          </div>
        )}

        {/* CT Measurements Card */}
        <CTMeasurementsCard
          measurements={workup.ctMeasurements}
          onUpdate={handleCTMeasurementsUpdate}
        />

        {/* Valve Recommendation Card */}
        <ValveRecommendationCard measurements={workup.ctMeasurements} />

        {/* Valve Selector Card (Phase 9) */}
        <ValveSelectorCard
          area={workup.ctMeasurements?.annulusArea}
          perimeter={workup.ctMeasurements?.annulusPerimeter}
          selectedValve={workup.selectedValve}
          onSelectValve={handleValveSelect}
        />

        {/* DICOM Viewer Card (Phase 8.2 Stub) */}
        <DicomViewerCard
          snapshots={workup.snapshots}
          onSnapshotCapture={handleSnapshotCapture}
          onSnapshotsChange={handleSnapshotsChange}
        />

        {/* Editable Sections */}
        <EditableTAVIWorkupDisplay
          workup={workup}
          onUpdate={(updater) => updateWorkup(workupId, updater)}
        />
      </div>

      {/* Sticky Action Bar */}
      <div className="border-t border-line-primary bg-white px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPDF}
            icon={<FileDown className="w-3 h-3" />}
          >
            {exportingPDF ? 'Exporting...' : 'PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            icon={<Eye className="w-3 h-3" />}
          >
            Preview
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePresent}
            disabled={presenting}
          >
            {presenting ? 'Generating...' : 'Present'}
          </Button>
        </div>
      </div>

      {/* Presentation Preview Modal */}
      {previewOpen && (
        <PresentationPreviewModal
          workup={workup}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};
