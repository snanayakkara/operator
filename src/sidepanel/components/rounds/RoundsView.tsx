import React, { useMemo, useState } from 'react';
import { ArrowLeft, Link2, Mic, FileText, Users, CheckSquare, BarChart3, ClipboardList, Sparkles } from 'lucide-react';
import Button from '../buttons/Button';
import { PatientsView } from './PatientsView';
import { GlobalTasksBoard } from './GlobalTasksBoard';
import { AnalyticsTab } from './AnalyticsTab';
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
  const [tab, setTab] = useState<'patients' | 'tasks' | 'analytics'>('patients');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const { quickAddPatient, patients, activeWard, selectedPatient, setSelectedPatientId, markDischarged, undoLastWardUpdate, deletePatient } = useRounds();
  const [handoverSelection, setHandoverSelection] = useState<Record<string, boolean>>({});
  const [handoverSummaryText, setHandoverSummaryText] = useState('');
  const [handoverSummaryLoading, setHandoverSummaryLoading] = useState(false);
  const [handoverSummaryError, setHandoverSummaryError] = useState<string | null>(null);
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

  const activePatientsForHandover = useMemo(
    () => patients.filter(p => p.status === 'active'),
    [patients]
  );

  const selectedPatientsForHandover = useMemo(
    () => activePatientsForHandover.filter(p => handoverSelection[p.id] ?? true),
    [activePatientsForHandover, handoverSelection]
  );

  const basicHandoverText = useMemo(() => {
    const text = selectedPatientsForHandover.map(p => {
      const issues = p.issues
        .filter(i => i.status === 'open')
        .map(i => {
          const latest = i.subpoints[i.subpoints.length - 1];
          const label = getSubpointDisplay(latest);
          return `• ${i.title}${label ? ` – ${label}` : ''}`;
        })
        .join('\n') || '• (no active issues)';

      const investigations = p.investigations
        .map(inv => {
          if (inv.type === 'lab') {
            return `• ${inv.name}: ${computeTrend(inv.labSeries)}`;
          }
          return `• ${inv.name}: ${inv.summary || 'pending'}`;
        })
        .join('\n') || '• (no key investigations)';

      const tasks = p.tasks
        .filter(t => t.status === 'open')
        .map(t => `• ${t.text}`)
        .join('\n') || '• (no open tasks)';

      return [
        `${p.name}${p.bed ? ` – Bed ${p.bed}` : ''}${p.oneLiner ? ` – ${p.oneLiner}` : ''}`,
        'Issues:',
        issues,
        'Investigations:',
        investigations,
        'Open tasks:',
        tasks
      ].join('\n');
    }).join('\n\n');

    return text || 'No active patients.';
  }, [computeTrend, selectedPatientsForHandover]);

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

  const openHandover = () => {
    setHandoverSelection(prev => {
      const next = { ...prev };
      activePatientsForHandover.forEach(p => {
        if (next[p.id] === undefined) next[p.id] = true;
      });
      return next;
    });
    setHandoverSummaryText('');
    setHandoverSummaryError(null);
    setHandoverOpen(true);
    notifyInfo('Handover', `${selectedPatientsForHandover.length} patients selected`);
  };

  const generateHandoverSummary = async () => {
    if (selectedPatientsForHandover.length === 0) return;
    setHandoverSummaryLoading(true);
    setHandoverSummaryError(null);
    try {
      const summary = await RoundsLLMService.getInstance().generateHandoverSummary(selectedPatientsForHandover);
      setHandoverSummaryText(summary);
      notifySuccess('Handover summary ready', 'Generated via reasoning model');
    } catch (error) {
      setHandoverSummaryError(error instanceof Error ? error.message : String(error));
    } finally {
      setHandoverSummaryLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white max-w-full">
      {/* Main Header */}
      <div className="px-4 py-3 border-b border-gray-200 sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <IconButton
              icon={ArrowLeft}
              onClick={onClose}
              tooltip="Back"
            />
            <h2 className="text-sm font-semibold text-gray-900 truncate">Ward List</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton
              icon={ClipboardList}
              onClick={openHandover}
              tooltip="Handover"
            />
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setTab('patients')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  tab === 'patients' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{activeCount}</span>
              </button>
              <button
                onClick={() => setTab('tasks')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  tab === 'tasks' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{openTasksCount}</span>
              </button>
              <button
                onClick={() => setTab('analytics')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  tab === 'analytics' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Action Bar */}
      {selectedActivePatient && tab !== 'analytics' && (
        <div className="h-10 px-4 flex items-center gap-1.5 border-b border-gray-200 sticky top-[52px] z-10 bg-white">
          {/* Patient selector - takes most space */}
          <PatientSelectorHeader className="flex-1 min-w-0" />

          {/* Primary action icons */}
          <IconButton
            icon={Link2}
            onClick={handleGoToPatient}
            tooltip="Go To Patient"
            variant="subtle"
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
            canUndo={true}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        {tab === 'patients' ? (
          <PatientsView onOpenQuickAdd={() => setQuickAddOpen(true)} />
        ) : tab === 'tasks' ? (
          <GlobalTasksBoard onSelectPatient={() => setTab('patients')} />
        ) : (
          <AnalyticsTab />
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
          <div className="bg-white border border-gray-200 rounded-modal shadow-modal w-full max-w-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Handover</h3>
              <Button variant="ghost" size="sm" onClick={() => setHandoverOpen(false)}>Close</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">
                  Include patients ({selectedPatientsForHandover.length}/{activePatientsForHandover.length})
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {activePatientsForHandover.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={handoverSelection[p.id] ?? true}
                        onChange={(e) => {
                          setHandoverSelection(prev => ({ ...prev, [p.id]: e.target.checked }));
                          setHandoverSummaryText('');
                          setHandoverSummaryError(null);
                        }}
                      />
                      <span className="truncate">{p.name}</span>
                      <span className="text-gray-400 text-xs">{p.bed ? `– Bed ${p.bed}` : ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">Draft (auto)</div>
                <textarea className="w-full h-64 rounded-lg border px-3 py-2 text-sm" value={basicHandoverText} readOnly />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-gray-700">Handover summary (AI)</div>
                <Button
                  size="sm"
                  onClick={generateHandoverSummary}
                  disabled={handoverSummaryLoading || selectedPatientsForHandover.length === 0}
                  isLoading={handoverSummaryLoading}
                  startIcon={Sparkles}
                >
                  Generate
                </Button>
              </div>
              {handoverSummaryError && (
                <div className="text-sm text-rose-600">{handoverSummaryError}</div>
              )}
              <textarea
                className="w-full h-44 rounded-lg border px-3 py-2 text-sm"
                value={handoverSummaryText}
                onChange={(e) => setHandoverSummaryText(e.target.value)}
                placeholder="Click Generate to create a concise handover message..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(basicHandoverText);
                  notifySuccess('Copied', 'Draft handover copied to clipboard');
                }}
              >
                Copy Draft
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const textToCopy = handoverSummaryText.trim() || basicHandoverText;
                  await navigator.clipboard.writeText(textToCopy);
                  notifySuccess('Copied', handoverSummaryText.trim() ? 'AI summary copied to clipboard' : 'Draft copied to clipboard');
                }}
                disabled={!basicHandoverText.trim()}
              >
                Copy Summary
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
          <div className="bg-white border border-gray-200 rounded-modal shadow-modal w-full max-w-2xl p-4 space-y-3">
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
