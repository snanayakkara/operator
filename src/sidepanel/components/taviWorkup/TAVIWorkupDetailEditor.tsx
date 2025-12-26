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

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Calendar, MapPin, User, Stethoscope, RefreshCw, Eye, FileDown } from 'lucide-react';
import Button from '../buttons/Button';
import { PatientMismatchConfirmationModal } from '../PatientMismatchConfirmationModal';
import { useTAVIWorkup } from '@/contexts/TAVIWorkupContext';
import { useRounds } from '@/contexts/RoundsContext';
import { EditableTAVIWorkupDisplay } from './EditableTAVIWorkupDisplay';
import { CTMeasurementsCard } from './CTMeasurementsCard';
import { ValveRecommendationCard } from './ValveRecommendationCard';
import { ValveSelectorCard } from './ValveSelectorCard';
import { DicomViewerCard } from './DicomViewerCard';
import { PresentationPreviewModal } from './PresentationPreviewModal';
import { calculateCompletion } from '@/types/taviWorkup.types';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';
import type { DicomSnapshot } from '@/types/dicom.types';
import { ValveSizingServiceV2, type ValveSelection } from '@/services/ValveSizingServiceV2';
import { taviWorkupPDFService } from '@/services/TAVIWorkupPDFService';
import { patientNameValidator } from '@/utils/PatientNameValidator';
import type { PatientNameComparison } from '@/utils/PatientNameValidator';

interface EmrPatientData {
  name?: string;
  dob?: string;
  dateOfBirth?: string;
  age?: string | number;
  ageYears?: number;
  id?: string;
  phone?: string;
  medicare?: string;
  address?: string;
  email?: string;
  insurance?: string;
}

interface InvestigationParseResult {
  echocardiography: string;
  laboratory: string;
  otherInvestigations: string;
}

const isGenericWorkupName = (name: string): boolean => {
  const normalized = name.trim().toLowerCase();
  return normalized === 'new tavi workup' || normalized === 'tavi workup';
};

const formatPatientDemographics = (patientData?: EmrPatientData | null): string => {
  if (!patientData) return '';

  const lines: string[] = [];

  if (patientData.name) {
    lines.push(patientData.name.trim());
  }

  const dob = patientData.dateOfBirth || patientData.dob;
  const age = patientData.age ?? patientData.ageYears;
  if (dob || age) {
    const detailParts: string[] = [];
    if (dob) detailParts.push(`DOB: ${dob}`);
    if (age !== undefined && age !== null && String(age).trim().length > 0) {
      detailParts.push(`Age: ${age}`);
    }
    if (detailParts.length > 0) {
      lines.push(detailParts.join(' | '));
    }
  }

  if (patientData.id) {
    lines.push(`ID: ${patientData.id}`);
  }

  if (patientData.phone) {
    lines.push(`Phone: ${patientData.phone}`);
  }

  if (patientData.email) {
    lines.push(`Email: ${patientData.email}`);
  }

  if (patientData.medicare) {
    const medicareText = patientData.medicare.trim();
    const hasLabel = medicareText.toLowerCase().includes('medicare');
    lines.push(hasLabel ? medicareText : `Medicare: ${medicareText}`);
  }

  if (patientData.insurance) {
    lines.push(`Insurance: ${patientData.insurance}`);
  }

  if (patientData.address) {
    lines.push(`Address: ${patientData.address}`);
  }

  return lines.join('\n').trim();
};

const parseInvestigationSummary = (summary: string): InvestigationParseResult => {
  if (!summary || !summary.trim()) {
    return { echocardiography: '', laboratory: '', otherInvestigations: '' };
  }

  const normalized = summary
    .replace(/\r\n/g, '\n')
    .replace(/[\u2022\u00b7]/g, '\n')
    .replace(/\t/g, ' ');

  const rawLines = normalized.split('\n').flatMap(line => line.split(';'));
  const lines = rawLines.map(line => line.trim()).filter(Boolean);

  const echoHeading = /^(echo(?:cardiogram|cardiography)?|tte|tee)\b[:\-]?\s*/i;
  const labHeading = /^(labs?|bloods?|biochem(?:istry)?|haematology|hematology|fbc|cbc|full blood count|uec|u&?e|lfts?|renal|electrolytes)\b[:\-]?\s*/i;

  const echoKeywords = [
    /\becho\b/i,
    /\bechocardiogram/i,
    /\bechocardiography/i,
    /\btte\b/i,
    /\btee\b/i,
    /\bef\b/i,
    /ejection fraction/i,
    /mean gradient/i,
    /peak gradient/i,
    /\bava\b/i,
    /aortic valve/i,
    /dimensionless index/i,
    /\bdi\b/i,
    /rvsp/i,
    /\blv\b/i,
    /\brv\b/i,
    /lvot/i,
    /\bmr\b/i,
    /\bar\b/i,
    /\btr\b/i
  ];

  const labKeywords = [
    /creatinine/i,
    /egfr/i,
    /urea/i,
    /\bhb\b/i,
    /ha?emoglobin/i,
    /platelet/i,
    /\bplt\b/i,
    /wcc/i,
    /inr/i,
    /albumin/i,
    /bilirubin/i,
    /\balt\b/i,
    /\bast\b/i,
    /\bna\b/i,
    /\bk\b/i,
    /sodium/i,
    /potassium/i,
    /troponin/i,
    /bnp/i,
    /nt-?pro?bnp/i,
    /lipids?/i,
    /cholesterol/i
  ];

  let activeSection: 'echo' | 'lab' | null = null;
  const echoLines: string[] = [];
  const labLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.replace(/\s+/g, ' ').trim();
    if (!trimmedLine) continue;

    if (echoHeading.test(trimmedLine)) {
      activeSection = 'echo';
      const remainder = trimmedLine.replace(echoHeading, '').replace(/^[:\-]\s*/, '').trim();
      if (remainder) echoLines.push(remainder);
      continue;
    }

    if (labHeading.test(trimmedLine)) {
      activeSection = 'lab';
      const remainder = trimmedLine.replace(labHeading, '').replace(/^[:\-]\s*/, '').trim();
      if (remainder) labLines.push(remainder);
      continue;
    }

    if (activeSection === 'echo') {
      echoLines.push(trimmedLine);
      continue;
    }

    if (activeSection === 'lab') {
      labLines.push(trimmedLine);
      continue;
    }

    if (echoKeywords.some(keyword => keyword.test(trimmedLine))) {
      echoLines.push(trimmedLine);
      continue;
    }

    if (labKeywords.some(keyword => keyword.test(trimmedLine))) {
      labLines.push(trimmedLine);
      continue;
    }

    otherLines.push(trimmedLine);
  }

  return {
    echocardiography: echoLines.join('\n').trim(),
    laboratory: labLines.join('\n').trim(),
    otherInvestigations: otherLines.join('\n').trim()
  };
};

const formatSelectedValveName = (selection?: ValveSelection): string | undefined => {
  if (!selection) return undefined;
  const service = ValveSizingServiceV2.getInstance();
  const manufacturer = service.getManufacturer(selection.brand).displayName;
  const adjustment = selection.volumeAdjustment;
  const adjustmentLabel = typeof adjustment === 'number' && adjustment !== 0
    ? ` (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)}mL)`
    : '';

  return `${manufacturer} ${selection.size}mm${adjustmentLabel}`;
};

interface TAVIWorkupDetailEditorProps {
  workupId: string;
  onBack: () => void;
}

export const TAVIWorkupDetailEditor: React.FC<TAVIWorkupDetailEditorProps> = ({ workupId, onBack }) => {
  const { workups, updateWorkup, generatePresentation, retryNotionSync, resolveNotionConflict } = useTAVIWorkup();
  const { clinicians } = useRounds();
  const workup = workups.find(w => w.id === workupId);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [patientMismatch, setPatientMismatch] = useState<PatientNameComparison | null>(null);
  const pendingExtractionRef = useRef<(() => Promise<void>) | null>(null);

  // === EMR AUTO-EXTRACTION (Phase 3) ===
  const runEMRExtraction = useCallback(async (tabId: number, patientData: EmrPatientData | null) => {
    setExtracting(true);
    setExtractError(null);

    try {
      const emrResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_EMR_DATA',
        fields: ['background', 'investigations', 'medications']
      });

      if (!emrResponse?.success) {
        throw new Error(emrResponse?.error || 'Failed to extract EMR data');
      }

      const emrData = emrResponse.data || {};
      const emrBackground = (emrData.background || '').trim();
      const emrInvestigations = (emrData.investigations || '').trim();
      const emrMedications = (emrData.medications || '').trim();

      const parsedInvestigations = parseInvestigationSummary(emrInvestigations);
      const patientDemographics = formatPatientDemographics(patientData);

      await updateWorkup(workupId, w => {
        const updatedSections = {
          ...w.structuredSections,
          patient: {
            ...w.structuredSections.patient,
            content: patientDemographics || w.structuredSections.patient.content
          },
          background: {
            ...w.structuredSections.background,
            content: emrBackground || w.structuredSections.background.content
          },
          medications: {
            ...w.structuredSections.medications,
            content: emrMedications || w.structuredSections.medications.content
          },
          laboratory: {
            ...w.structuredSections.laboratory,
            content: parsedInvestigations.laboratory || w.structuredSections.laboratory.content
          },
          echocardiography: {
            ...w.structuredSections.echocardiography,
            content: parsedInvestigations.echocardiography || w.structuredSections.echocardiography.content
          },
          investigations: {
            ...w.structuredSections.investigations,
            content: parsedInvestigations.otherInvestigations || w.structuredSections.investigations.content
          }
        };

        return {
          ...w,
          emrBackground,
          emrInvestigations,
          emrMedications,
          emrPatientDemographics: patientDemographics,
          emrLaboratory: parsedInvestigations.laboratory,
          emrEchocardiography: parsedInvestigations.echocardiography,
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

  const extractEMRData = useCallback(async () => {
    setExtractError(null);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;

      if (!tabId) {
        throw new Error('No active tab found');
      }

      const patientResponse = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_PATIENT_DATA' });
      const patientData = patientResponse?.success ? (patientResponse.data as EmrPatientData) : null;
      const emrPatientName = patientData?.name?.trim() || '';
      const sidebarPatientName = workup?.patient?.trim() || '';

      const shouldValidateNames =
        !!emrPatientName &&
        !!sidebarPatientName &&
        !isGenericWorkupName(sidebarPatientName) &&
        !patientNameValidator.shouldSkipValidation(sidebarPatientName, emrPatientName);

      if (shouldValidateNames) {
        const comparison = patientNameValidator.validatePatientNames(sidebarPatientName, emrPatientName);
        if (!comparison.isMatch) {
          pendingExtractionRef.current = () => runEMRExtraction(tabId, patientData);
          setPatientMismatch(comparison);
          return;
        }
      }

      await runEMRExtraction(tabId, patientData);
    } catch (error) {
      console.error('[TAVIWorkupDetailEditor] EMR extraction failed:', error);
      setExtractError(error instanceof Error ? error.message : 'Failed to extract EMR data');
    }
  }, [runEMRExtraction, workup?.patient]);

  const handleMismatchConfirm = useCallback(async () => {
    const pending = pendingExtractionRef.current;
    pendingExtractionRef.current = null;
    setPatientMismatch(null);
    if (pending) {
      await pending();
    }
  }, []);

  const handleMismatchCancel = useCallback(() => {
    pendingExtractionRef.current = null;
    setPatientMismatch(null);
  }, []);

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

  const selectedValveName = formatSelectedValveName(workup.selectedValve);
  const annulusArea = workup.ctMeasurements?.annulusArea ?? workup.ctMeasurements?.annulusAreaMm2;
  const annulusPerimeter = workup.ctMeasurements?.annulusPerimeter ?? workup.ctMeasurements?.annulusPerimeterMm;

  const conflictFieldLabels: Record<string, string> = {
    patient: 'Patient',
    status: 'Status',
    category: 'Category',
    referrer: 'Referrer',
    location: 'Location',
    procedureDate: 'Procedure Date',
    referralDate: 'Referral Date',
    notes: 'Notes',
    datePresented: 'Date Presented'
  };

  const formatConflictValue = (value: unknown) => {
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
  };

  const formatConflictTime = (timestamp?: number) => (
    timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'
  );

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
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {workup.status || 'Undergoing Workup'}
            </span>
          </div>
        </div>

        {workup.notionSyncConflict && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-amber-900">Notion sync conflict</div>
                <div className="text-xs text-amber-800 mt-1">
                  Local edited {formatConflictTime(workup.notionSyncConflict.localEditedAt)} · Notion edited {formatConflictTime(workup.notionSyncConflict.notionEditedAt)}
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  Suggested: {workup.notionSyncConflict.preferredSource === 'local' ? 'Keep local changes' : 'Use Notion changes'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr_1fr] gap-2 text-xs">
              <div className="text-amber-700 font-medium">Field</div>
              <div className="text-amber-700 font-medium">Local</div>
              <div className="text-amber-700 font-medium">Notion</div>
              {Object.keys(workup.notionSyncConflict.local).map((key) => {
                const fieldKey = key as keyof typeof conflictFieldLabels;
                return (
                  <React.Fragment key={key}>
                    <div className="text-amber-900">{conflictFieldLabels[fieldKey] || key}</div>
                    <div className="text-amber-900">{formatConflictValue(workup.notionSyncConflict?.local[fieldKey])}</div>
                    <div className="text-amber-900">{formatConflictValue(workup.notionSyncConflict?.notion[fieldKey])}</div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resolveNotionConflict(workup.id, 'local')}
              >
                Keep Local
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => resolveNotionConflict(workup.id, 'notion')}
              >
                Use Notion
              </Button>
            </div>
          </div>
        )}

        {workup.notionSyncError && !workup.notionSyncConflict && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-rose-900">Notion sync failed</div>
            <div className="text-xs text-rose-800 mt-1">{workup.notionSyncError}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryNotionSync(workup.id)}
              className="mt-3"
            >
              Retry Sync
            </Button>
          </div>
        )}

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
          area={annulusArea}
          perimeter={annulusPerimeter}
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
          clinicians={clinicians}
          selectedValveName={selectedValveName}
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

      <PatientMismatchConfirmationModal
        isOpen={!!patientMismatch}
        comparison={patientMismatch}
        textToInsert={null}
        actionContext="extract"
        onConfirm={handleMismatchConfirm}
        onCancel={handleMismatchCancel}
        onRefreshEMR={extractEMRData}
      />

    </div>
  );
};
