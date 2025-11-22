import React, { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react';
import Button from '../buttons/Button';
import { PatientsView } from './PatientsView';
import { GlobalTasksBoard } from './GlobalTasksBoard';
import { QuickAddModal } from './QuickAddModal';
import { useRounds } from '@/contexts/RoundsContext';
import { computeLabTrendString } from '@/utils/rounds';

interface RoundsViewProps {
  onClose: () => void;
}

export const RoundsView: React.FC<RoundsViewProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'patients' | 'tasks'>('patients');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverText, setHandoverText] = useState('');
  const { quickAddPatient, patients } = useRounds();
  const [handoverSelection, setHandoverSelection] = useState<Record<string, boolean>>({});
  const computeTrend = (labSeries?: { value: number; date: string; units?: string; }[]) =>
    computeLabTrendString(labSeries || []);

  const tabButton = useMemo(() => (
    <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
      {[
        { id: 'patients', label: 'Patients' },
        { id: 'tasks', label: 'Tasks' }
      ].map(item => (
        <button
          key={item.id}
          className={`px-3 py-1 text-sm rounded-full transition ${
            tab === item.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
          }`}
          onClick={() => setTab(item.id as 'patients' | 'tasks')}
        >
          {item.label}
        </button>
      ))}
    </div>
  ), [tab]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            startIcon={ArrowLeft}
            onClick={onClose}
            className="text-gray-700"
          >
            Back
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Rounds</p>
            <p className="text-base font-semibold text-gray-900">Cabrini ward list</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tabButton}
          <Button
            variant="ghost"
            size="sm"
            startIcon={ClipboardList}
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
            }}
          >
            Handover
          </Button>
          <Button
            variant="outline"
            size="sm"
            startIcon={Plus}
            onClick={() => setQuickAddOpen(true)}
          >
            Quick Add
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'patients' ? (
          <PatientsView onOpenQuickAdd={() => setQuickAddOpen(true)} />
        ) : (
          <GlobalTasksBoard onSelectPatient={() => setTab('patients')} />
        )}
      </div>

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSave={async ({ name, scratchpad }) => {
          await quickAddPatient(name, scratchpad);
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
