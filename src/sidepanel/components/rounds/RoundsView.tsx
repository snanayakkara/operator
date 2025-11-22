import React, { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Plus, Link2, Mic, Clipboard, Undo2, CheckSquare, Trash2, Users } from 'lucide-react';
import Button from '../buttons/Button';
import { PatientsView } from './PatientsView';
import { GlobalTasksBoard } from './GlobalTasksBoard';
import { QuickAddModal } from './QuickAddModal';
import { ConfirmModal } from '../modals/Modal';
import { useRounds } from '@/contexts/RoundsContext';
import { computeLabTrendString } from '@/utils/rounds';
import { WardUpdateModal } from './WardUpdateModal';
import { RoundsLLMService } from '@/services/RoundsLLMService';
import { notifySuccess, notifyInfo } from '@/utils/notifications';

interface RoundsViewProps {
  onClose: () => void;
}

export const RoundsView: React.FC<RoundsViewProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'patients' | 'tasks'>('patients');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverText, setHandoverText] = useState('');
  const { quickAddPatient, patients, activeWard, selectedPatient, setSelectedPatientId, markDischarged, undoLastWardUpdate, deletePatient } = useRounds();
  const [handoverSelection, setHandoverSelection] = useState<Record<string, boolean>>({});
  const [wardUpdateOpen, setWardUpdateOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterText, setLetterText] = useState('');
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
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
    try {
      const text = await RoundsLLMService.getInstance().generateGpLetter(selectedActivePatient);
      setLetterText(text);
      setLetterOpen(true);
    } catch (error) {
      setLetterError(error instanceof Error ? error.message : 'Failed to generate letter');
    } finally {
      setLetterLoading(false);
    }
  };

  const tabButton = useMemo(() => (
    <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
      {[
        { id: 'patients', label: `Patients (${activeCount})` },
        { id: 'tasks', label: `Tasks (${openTasksCount})` }
      ].map(item => (
        <button
          key={item.id}
          className={`px-3 py-1 text-xs sm:text-sm rounded-full transition whitespace-nowrap ${
            tab === item.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
          }`}
          onClick={() => setTab(item.id as 'patients' | 'tasks')}
        >
          {item.label}
        </button>
      ))}
    </div>
  ), [tab, activeCount, openTasksCount]);

  return (
    <div className="h-full flex flex-col bg-white max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-gray-200 sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            startIcon={ArrowLeft}
            onClick={onClose}
            className="text-gray-700 flex-shrink-0"
          >
            Back
          </Button>
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Rounds</p>
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">Cabrini ward list</p>
            <p className="text-[11px] text-gray-500 truncate">Ward: {activeWard}</p>
          </div>
        </div>
        <div className="flex-shrink-0">{tabButton}</div>
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100">
        <Button
          variant="outline"
          size="sm"
          startIcon={ClipboardList}
          className="whitespace-nowrap h-9 px-3 bg-white"
          onClick={() => {
            const active = patients.filter(p => p.status === 'active' && (handoverSelection[p.id] ?? true));
            const text = active.map(p => {
              const issues = p.issues.filter(i => i.status === 'open')
                .map(i => `• ${i.title}${i.subpoints.length ? ` – ${i.subpoints[i.subpoints.length - 1].text}` : ''}`)
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
          }}
        >
          Handover ({activeCount})
        </Button>
        <Button
          variant="outline"
          size="sm"
          startIcon={Plus}
          className="whitespace-nowrap h-9 px-3 bg-white"
          onClick={() => setQuickAddOpen(true)}
        >
          Quick Add
        </Button>
      </div>

      {/* Patient Actions Bar */}
      {selectedActivePatient && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border-b border-amber-100 overflow-x-auto sticky top-[57px] z-10">
          <span className="text-xs font-medium text-amber-800 flex items-center gap-1 flex-shrink-0">
            <Users className="w-3 h-3" />
            {selectedActivePatient.name}
          </span>
          <div className="w-px h-4 bg-amber-200 flex-shrink-0" />
          <Button size="xs" variant="outline" startIcon={Link2} className="bg-white flex-shrink-0" onClick={handleGoToPatient}>Go To</Button>
          <Button size="xs" variant="outline" startIcon={Mic} className="bg-white flex-shrink-0" onClick={() => setWardUpdateOpen(true)}>Ward update</Button>
          <Button size="xs" variant="outline" startIcon={Clipboard} className="bg-white flex-shrink-0" onClick={handleGenerateGpLetter} disabled={letterLoading} isLoading={letterLoading}>GP letter</Button>
          <Button
            size="xs"
            variant={selectedActivePatient.status === 'active' ? 'secondary' : 'outline'}
            startIcon={selectedActivePatient.status === 'active' ? CheckSquare : Undo2}
            onClick={() => {
              const newStatus = selectedActivePatient.status === 'active' ? 'discharged' : 'active';
              markDischarged(selectedActivePatient.id, newStatus);
              notifySuccess(
                newStatus === 'discharged' ? 'Patient discharged' : 'Patient reopened',
                `${selectedActivePatient.name} ${newStatus === 'discharged' ? 'moved to archive' : 'returned to active list'}`
              );
            }}
          >
            {selectedActivePatient.status === 'active' ? 'Discharge' : 'Reopen'}
          </Button>
          <Button size="xs" variant="outline" startIcon={Undo2} className="bg-white flex-shrink-0" onClick={() => {
            undoLastWardUpdate(selectedActivePatient.id);
            notifySuccess('Undo successful', 'Last ward update reverted');
          }}>Undo</Button>
          <Button size="xs" variant="outline" startIcon={Trash2} className="bg-white text-rose-600 border-rose-200 flex-shrink-0" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
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
            {letterError && <div className="text-sm text-rose-600">{letterError}</div>}
            <textarea className="w-full h-64 rounded-lg border px-3 py-2 text-sm" value={letterText} readOnly />
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
