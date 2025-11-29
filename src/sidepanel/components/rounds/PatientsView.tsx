import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, AlertCircle, Activity, BedDouble, Users } from 'lucide-react';
import Button from '../buttons/Button';
import { useRounds } from '@/contexts/RoundsContext';
import { createEmptyPatient } from '@/services/RoundsPatientService';
import { PatientDetail } from './PatientDetail';
import { RoundsPatient } from '@/types/rounds.types';

interface PatientsViewProps {
  onOpenQuickAdd: () => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({ onOpenQuickAdd }) => {
  const { patients, selectedPatient, setSelectedPatientId, addPatient, markDischarged, intakeParsing, updatePatient, isPatientListCollapsed, togglePatientList } = useRounds();
  const wardOptions = ['1 South', '1 West', 'ICU', '3 Central', '1 Central', 'Other'];
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualMrn, setManualMrn] = useState('');
  const [manualBed, setManualBed] = useState('');
  const [manualOneLiner, setManualOneLiner] = useState('');
  const [manualWard, setManualWard] = useState(wardOptions[0]);

  const activePatients = useMemo(() =>
    [...patients].filter(p => p.status === 'active').sort((a, b) => {
      if (a.roundOrder !== undefined && b.roundOrder !== undefined) {
        return a.roundOrder - b.roundOrder;
      }
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
    }), [patients]);

  const dischargedPatients = useMemo(() =>
    [...patients].filter(p => p.status === 'discharged').sort((a, b) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    ), [patients]);

  const openTasksIndicator = (patient: RoundsPatient) => patient.tasks.filter(t => t.status === 'open').length;
  const updatedRecently = (patient: RoundsPatient) => patient.wardEntries.some(entry =>
    Date.now() - new Date(entry.timestamp).getTime() < 24 * 60 * 60 * 1000
  );

  const handleManualAdd = async () => {
    if (!manualName.trim()) return;
    const newPatient = createEmptyPatient(manualName.trim(), {
      mrn: manualMrn.trim(),
      bed: manualBed.trim(),
      oneLiner: manualOneLiner.trim(),
      site: manualWard
    });
    await addPatient(newPatient);
    setShowManualForm(false);
    setManualName('');
    setManualMrn('');
    setManualBed('');
    setManualOneLiner('');
    setManualWard(wardOptions[0]);
  };

  const renderCard = (patient: RoundsPatient) => {
    const needsDetails = !patient.mrn || !patient.bed;
    const parsing = intakeParsing[patient.id] === 'running';
    const index = activePatients.findIndex(p => p.id === patient.id);
    const move = (direction: number) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= activePatients.length) return;
      const swapWith = activePatients[targetIndex];
      updatePatient(patient.id, p => ({ ...p, roundOrder: targetIndex }));
      updatePatient(swapWith.id, p => ({ ...p, roundOrder: index }));
    };

    const handlePatientSelect = () => {
      setSelectedPatientId(patient.id);
      // Close the list overlay after selection
      if (!isPatientListCollapsed) {
        togglePatientList();
      }
    };

    return (
      <button
        key={patient.id}
        onClick={handlePatientSelect}
        className={`w-full text-left rounded-lg border ${selectedPatient?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} p-3 shadow-sm hover:border-blue-400 transition`}
      >
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-gray-900">{patient.name}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-gray-400">
              <button className="px-1" onClick={(e) => { e.stopPropagation(); move(-1); }}>↑</button>
              <button className="px-1" onClick={(e) => { e.stopPropagation(); move(1); }}>↓</button>
            </div>
            {parsing && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                parsing intake…
              </span>
            )}
            {openTasksIndicator(patient) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                <Activity className="w-3 h-3" /> {openTasksIndicator(patient)} open
              </span>
            )}
            {updatedRecently(patient) && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> updated
              </span>
            )}
            {needsDetails && (
              <span className="inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded-full">
                <AlertCircle className="w-3 h-3" /> needs details
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <BedDouble className="w-4 h-4" />
          <span>{patient.site ? patient.site : 'Ward: not set'}{patient.bed ? ` • Bed ${patient.bed}` : ''}</span>
          <span className="text-gray-300">•</span>
          <span>MRN: {patient.mrn || 'pending'}</span>
        </div>
        {patient.oneLiner && (
          <p className="mt-2 text-sm text-gray-700 line-clamp-2">{patient.oneLiner}</p>
        )}
      </button>
    );
  };

  return (
    <div className="relative h-full">
      {/* Patient Detail always occupies the workspace */}
      <div className="h-full">
        {selectedPatient && selectedPatient.status === 'active' ? (
          <PatientDetail patient={selectedPatient} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Select an active patient to view details.
          </div>
        )}
      </div>

      {/* Ward list overlay panel */}
      {!isPatientListCollapsed && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={togglePatientList} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap">Ward list</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="xs" onClick={() => setShowManualForm(prev => !prev)} startIcon={Plus}>
                  Add patient
                </Button>
                <Button variant="ghost" size="xs" onClick={togglePatientList}>Close</Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
              {showManualForm && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2">
                    <input className="rounded-md border px-2 py-1 text-sm" placeholder="Name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                    <input className="rounded-md border px-2 py-1 text-sm" placeholder="MRN/UR" value={manualMrn} onChange={(e) => setManualMrn(e.target.value)} />
                    <input className="rounded-md border px-2 py-1 text-sm" placeholder="Bed" value={manualBed} onChange={(e) => setManualBed(e.target.value)} />
                    <input className="rounded-md border px-2 py-1 text-sm col-span-2" placeholder="One-liner" value={manualOneLiner} onChange={(e) => setManualOneLiner(e.target.value)} />
                    <select className="rounded-md border px-2 py-1 text-sm col-span-2" value={manualWard} onChange={(e) => setManualWard(e.target.value)}>
                      {wardOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="xs" variant="outline" onClick={() => setShowManualForm(false)}>Cancel</Button>
                    <Button size="xs" onClick={handleManualAdd} disabled={!manualName.trim()}>Save</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {activePatients.map(renderCard)}
                {activePatients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-indigo-500" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">No patients yet</h4>
                    <p className="text-xs text-gray-500 mb-4 max-w-[200px]">
                      Add your first patient to start tracking rounds and tasks.
                    </p>
                    <Button size="sm" startIcon={Plus} onClick={onOpenQuickAdd}>
                      Quick Add Patient
                    </Button>
                  </div>
                )}
              </div>

              {dischargedPatients.length > 0 && (
                <details className="pt-1">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">Discharged / archived ({dischargedPatients.length})</summary>
                  <div className="mt-2 space-y-2">
                    {dischargedPatients.map(patient => (
                      <div key={patient.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-800">{patient.name}</div>
                          <Button size="xs" variant="ghost" onClick={() => markDischarged(patient.id, 'active')}>Reopen</Button>
                        </div>
                        <p className="text-sm text-gray-600">{patient.oneLiner || 'No summary'}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
