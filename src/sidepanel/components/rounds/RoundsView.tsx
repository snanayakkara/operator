import React, { useState } from 'react';
import { ArrowLeft, Link2, Mic, FileText } from 'lucide-react';
import Button from '../buttons/Button';
import { PatientsView } from './PatientsView';
import { GlobalTasksBoard } from './GlobalTasksBoard';
import { QuickAddModal } from './QuickAddModal';
import { ConfirmModal } from '../modals/Modal';
import { useRounds } from '@/contexts/RoundsContext';
import { computeLabTrendString, getSubpointDisplay } from '@/utils/rounds';
import { WardUpdateModal } from './WardUpdateModal';
import { RoundsLLMService } from '@/services/RoundsLLMService';
import { notifySuccess, notifyInfo } from '@/utils/notifications';
import { PatientSelectorHeader } from './PatientSelectorHeader';
import { IconButton } from './IconButton';
import { OverflowMenu } from './OverflowMenu';

interface RoundsViewProps {
  onClose: () => void;
}

export const RoundsView: React.FC<RoundsViewProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'patients' | 'tasks'>('patients');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverText, setHandoverText] = useState('');
  const { quickAddPatient, patients, activeWard, selectedPatient, setSelectedPatientId, markDischarged, undoLastWardUpdate, deletePatient, isPatientListCollapsed } = useRounds();
  const [handoverSelection, setHandoverSelection] = useState<Record<string, boolean>>({});
  const [wardUpdateOpen, setWardUpdateOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterText, setLetterText] = useState('');
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [letterStatus, setLetterStatus] = useState<string | null>(null);
  const [letterRefineInput, setLetterRefineInput] = useState('');
  const [letterRefining, setLetterRefining] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Computed counts for badges
  const activeCount = patients.filter(p => p.status === 'active').length;
  const openTasksCount = patients.reduce((sum, p) =>
    sum + p.tasks.filter(t => t.status === 'open').length, 0);
  const computeTrend = (labSeries?: { value: number; date: string; units?: string; }[]) =>
    computeLabTrendString(labSeries || []);
  const selectedActivePatient = selectedPatient && selectedPatient.status === 'active' ? selectedPatient : null;

  const handleGoToPatient = async () => {
    if (!selectedActivePatient) return;
    try {
      await chrome.runtime.sendMessage({
        type: 'NAVIGATE_TO_PATIENT',
        fileNumber: selectedActivePatient.mrn || selectedActivePatient.name,
        patientName: selectedActivePatient.name
      });
    } catch (error) {
      console.error('Failed to navigate to patient', error);
    }
  };

  const handleGenerateGpLetter = async () => {
    if (!selectedActivePatient) return;
    setLetterLoading(true);
    setLetterError(null);
    setLetterStatus('Ensuring model is ready…');
    try {
      const text = await RoundsLLMService.getInstance().generateGpLetter(selectedActivePatient);
      setLetterText(text);
      setLetterStatus('Complete');
      setLetterOpen(true);
    } catch (error) {
      setLetterError(error instanceof Error ? error.message : 'Failed to generate letter');
    } finally {
      setLetterLoading(false);
      setLetterStatus(null);
    }
  };

  const handleRefineLetter = async () => {
    if (!selectedActivePatient || !letterText.trim() || !letterRefineInput.trim()) return;
    setLetterRefining(true);
    setLetterError(null);
    try {
      const refined = await RoundsLLMService.getInstance().refineGpLetter(
        selectedActivePatient,
        letterText,
        letterRefineInput.trim()
      );
      setLetterText(refined);
      setLetterRefineInput('');
      notifySuccess('Updated', 'Letter refined');
    } catch (error) {
      setLetterError(error instanceof Error ? error.message : 'Failed to refine letter');
    } finally {
      setLetterRefining(false);
    }
  };


  // Helper to generate handover text
  const generateHandoverText = () => {
    const active = patients.filter(p => p.status === 'active' && (handoverSelection[p.id] ?? true));
    const text = active.map(p => {
      const issues = p.issues.filter(i => i.status === 'open')
        .map(i => {
          const latest = i.subpoints[i.subpoints.length - 1];
          const label = getSubpointDisplay(latest);
          return `• ${i.title}${label ? ` – ${label}` : ''}`;
        })
        .join('\n') || '• (no active issues)';
      const investigations = p.investigations.map(inv => {
        if (inv.type === 'lab') {
          return `• ${inv.name}: ${computeTrend(inv.labSeries)}`;
        }
        return `• ${inv.name}: ${inv.summary || 'pending'}`;
      }).join('\n') || '• (no key investigations)';
      const tasks = p.tasks.filter(t => t.status === 'open')
        .map(t => `• ${t.text}`)
        .join('\n') || '• (no open tasks)';
      return [
        `${p.name} – ${p.bed || 'Bed ?'}${p.oneLiner ? ` – ${p.oneLiner}` : ''}`,
        'Issues:',
        issues,
        'Investigations:',
        investigations,
        'Open tasks:',
        tasks
      ].join('\n');
    }).join('\n\n');
    setHandoverText(text || 'No active patients.');
    setHandoverOpen(true);
    if (text) notifyInfo('Handover ready', `${active.length} patients included`);
  };

  return (
    <div className="h-full flex flex-col bg-white max-w-full">
      {/* Compact Main Header - h-10, text-xs */}
      <div className="h-10 px-2 flex items-center justify-between gap-2 border-b border-gray-200 sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <IconButton
            icon={ArrowLeft}
            onClick={onClose}
            tooltip="Back"
          />
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-900 truncate">Cabrini ward list</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-[10px] text-gray-500">
          Pts ({activeCount}) | T ({openTasksCount})
        </div>
      </div>

      {/* Compact Patient Action Bar - h-8, icons only */}
      {selectedActivePatient && (
        <div className="h-8 px-2 flex items-center gap-1 border-b border-gray-200 sticky top-10 z-10 bg-white">
          {/* Patient selector - takes most space */}
          <PatientSelectorHeader className="flex-1 min-w-0" />

          {/* Primary action icons */}
          <IconButton
            icon={Link2}
            onClick={handleGoToPatient}
            tooltip="Go To Patient"
          />
          <IconButton
            icon={Mic}
            onClick={() => setWardUpdateOpen(true)}
            tooltip="Ward Update"
          />
          <IconButton
            icon={FileText}
            onClick={handleGenerateGpLetter}
            disabled={letterLoading}
            loading={letterLoading}
            tooltip="GP Letter"
          />

          {/* Overflow menu for rare actions */}
          <OverflowMenu
            onHandover={generateHandoverText}
            onQuickAdd={() => setQuickAddOpen(true)}
            onDischarge={() => {
              markDischarged(selectedActivePatient.id, 'discharged');
              notifySuccess('Patient discharged', `${selectedActivePatient.name} moved to archive`);
            }}
            onUndo={() => {
              undoLastWardUpdate(selectedActivePatient.id);
              notifySuccess('Undo successful', 'Last ward update reverted');
            }}
            onDelete={() => setShowDeleteConfirm(true)}
            activeCount={activeCount}
            canUndo={true}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        {tab === 'patients' ? (
          <PatientsView onOpenQuickAdd={() => setQuickAddOpen(true)} />
        ) : (
          <GlobalTasksBoard onSelectPatient={() => setTab('patients')} />
        )}
      </div>

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        defaultWard={activeWard}
        onSave={async ({ name, scratchpad, ward }) => {
          await quickAddPatient(name, scratchpad, ward);
        }}
      />

      {handoverOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Handover</h3>
              <Button variant="ghost" size="sm" onClick={() => setHandoverOpen(false)}>Close</Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {patients.filter(p => p.status === 'active').map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={handoverSelection[p.id] ?? true}
                    onChange={(e) => setHandoverSelection(prev => ({ ...prev, [p.id]: e.target.checked }))}
                  />
                  {p.name} {p.bed ? `– Bed ${p.bed}` : ''}
                </label>
              ))}
            </div>
            <textarea className="w-full h-64 rounded-lg border px-3 py-2 text-sm" value={handoverText} readOnly />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(handoverText);
                  notifySuccess('Copied', 'Handover copied to clipboard');
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedActivePatient && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            const patientName = selectedActivePatient.name;
            deletePatient(selectedActivePatient.id);
            setSelectedPatientId(null);
            setShowDeleteConfirm(false);
            notifySuccess('Patient deleted', `${patientName} removed from ward list`);
          }}
          title="Delete Patient?"
          message={`Are you sure you want to permanently delete ${selectedActivePatient.name} from the ward list? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      )}

      {selectedActivePatient && (
        <WardUpdateModal
          open={wardUpdateOpen}
          onClose={() => setWardUpdateOpen(false)}
          patient={selectedActivePatient}
        />
      )}

      {letterOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">GP discharge letter</h3>
              <Button variant="ghost" size="sm" onClick={() => setLetterOpen(false)}>Close</Button>
            </div>
            {letterStatus && <div className="text-xs text-gray-500">Status: {letterStatus}</div>}
            {letterError && <div className="text-sm text-rose-600">{letterError}</div>}
            <textarea className="w-full h-64 rounded-lg border px-3 py-2 text-sm" value={letterText} readOnly />
            <div className="space-y-2">
              <label className="text-xs text-gray-700">Refine letter (adds a revision pass)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., Add follow-up plans, shorten hospital course, adjust tone"
                  value={letterRefineInput}
                  onChange={(e) => setLetterRefineInput(e.target.value)}
                  disabled={letterRefining}
                />
                <Button
                  size="sm"
                  onClick={handleRefineLetter}
                  disabled={!letterRefineInput.trim() || letterRefining}
                  isLoading={letterRefining}
                >
                  Refine
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(letterText);
                  notifySuccess('Copied', 'GP letter copied to clipboard');
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
