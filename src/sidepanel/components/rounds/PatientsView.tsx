import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, BedDouble, Users, GripVertical, Download } from 'lucide-react';
import Button from '../buttons/Button';
import { useRounds } from '@/contexts/RoundsContext';
import { createEmptyPatient } from '@/services/RoundsPatientService';
import { PatientDetail } from './PatientDetail';
import { RoundsPatient } from '@/types/rounds.types';
import { isoNow } from '@/utils/rounds';
import { WardRoundCardExporter } from '@/services/WardRoundCardExporter';
import { WardRoundImportService, applyPendingUpdateToPatient, PendingWardRoundUpdate } from '@/services/WardRoundImportService';
import { DEFAULT_WARD_ROUND_ROOT, getWardExportsRoot } from '@/wardround/paths';

interface PatientsViewProps {
  onOpenQuickAdd: () => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({ onOpenQuickAdd }) => {
  const { patients, selectedPatient, setSelectedPatientId, addPatient, markDischarged, intakeParsing, updatePatient, isPatientListCollapsed, togglePatientList, clinicians } = useRounds();
  const wardOptions = ['1 South', '1 West', 'ICU', '3 Central', '1 Central', 'Other'];
  const [showManualForm, setShowManualForm] = useState(false);
  const [groupBy, setGroupBy] = useState<'ward' | 'clinician'>('ward');
  const [manualName, setManualName] = useState('');
  const [manualMrn, setManualMrn] = useState('');
  const [manualBed, setManualBed] = useState('');
  const [manualOneLiner, setManualOneLiner] = useState('');
  const [manualWard, setManualWard] = useState(wardOptions[0]);
  const [draggingPatientId, setDraggingPatientId] = useState<string | null>(null);
  // Helper to get today's LOCAL date key (YYYY-MM-DD) - not UTC
  const getTodayKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [roundIdInput, setRoundIdInput] = useState(() => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const hours = now.getHours();
    const slot = hours < 12 ? 'AM' : hours < 18 ? 'PM' : 'EVE';
    return `${date}_${slot}`;
  });
  const [roundWard, setRoundWard] = useState('1 South');
  const [roundConsultant, setRoundConsultant] = useState('SN');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportErrors, setExportErrors] = useState<string[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<PendingWardRoundUpdate[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const { applyWardDiff } = useRounds();
  const exportFolder = useMemo(
    () => getWardExportsRoot(roundIdInput || '<round id>', { icloudRoot: '', wardRoundRoot: DEFAULT_WARD_ROUND_ROOT }),
    [roundIdInput]
  );

  const activePatients = useMemo(() =>
    [...patients].filter(p => p.status === 'active').sort((a, b) => {
      const aOrder = a.roundOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.roundOrder ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
    }), [patients]);

  const dischargedPatients = useMemo(() =>
    [...patients].filter(p => p.status === 'discharged').sort((a, b) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    ), [patients]);

  const activePatientsByWard = useMemo(() => {
    const buckets = new Map<string, RoundsPatient[]>();
    activePatients.forEach(p => {
      const ward = p.site?.trim() || 'Unassigned';
      const list = buckets.get(ward) || [];
      list.push(p);
      buckets.set(ward, list);
    });

    const knownOrder = [...wardOptions, 'Unassigned'];
    const additional = Array.from(buckets.keys()).filter(k => !knownOrder.includes(k)).sort();
    const wardOrder = [...wardOptions, ...additional, 'Unassigned'].filter((ward, idx, arr) => arr.indexOf(ward) === idx);

    return wardOrder
      .filter(ward => buckets.has(ward))
      .map(ward => ({
        ward,
        patients: (buckets.get(ward) || []).sort((a, b) => {
          const aOrder = a.roundOrder ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.roundOrder ?? Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
        })
      }));
  }, [activePatients, wardOptions]);

  const activePatientsByClinician = useMemo(() => {
    const buckets = new Map<string, RoundsPatient[]>();

    activePatients.forEach(p => {
      if (!p.clinicianIds || p.clinicianIds.length === 0) {
        const list = buckets.get('Unassigned') || [];
        list.push(p);
        buckets.set('Unassigned', list);
      } else {
        p.clinicianIds.forEach(clinicianId => {
          const list = buckets.get(clinicianId) || [];
          list.push(p);
          buckets.set(clinicianId, list);
        });
      }
    });

    const clinicianOrder = [
      ...clinicians.map(c => c.id),
      'Unassigned'
    ];

    return clinicianOrder
      .filter(id => buckets.has(id))
      .map(id => {
        const clinician = clinicians.find(c => c.id === id);
        return {
          clinicianId: id,
          clinicianName: clinician?.name || 'Unassigned',
          clinicianRole: clinician?.role,
          patients: (buckets.get(id) || []).sort((a, b) => {
            const aOrder = a.roundOrder ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b.roundOrder ?? Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
          })
        };
      });
  }, [activePatients, clinicians]);

  const updatedRecently = (patient: RoundsPatient) => patient.wardEntries.some(entry =>
    Date.now() - new Date(entry.timestamp).getTime() < 24 * 60 * 60 * 1000
  );
  const isCompletedToday = (patient: RoundsPatient) => patient.roundCompletedDate === getTodayKey();

  const toggleCompleted = (patient: RoundsPatient) => {
    const todayKey = getTodayKey();
    const nextValue = isCompletedToday(patient) ? undefined : todayKey;
    updatePatient(patient.id, p => ({ ...p, roundCompletedDate: nextValue, lastUpdatedAt: isoNow() }));
  };

  const handleDragStart = (patientId: string) => {
    setDraggingPatientId(patientId);
  };

  const handleDrop = (ward: string, targetId: string) => {
    reorderWithinWard(ward, targetId);
    setDraggingPatientId(null);
  };

  const handleDragEnd = () => {
    setDraggingPatientId(null);
  };

  const reorderWithinWard = (ward: string, targetId: string) => {
    if (!draggingPatientId || draggingPatientId === targetId) return;
    const wardGroup = activePatientsByWard.find(g => g.ward === ward);
    if (!wardGroup) return;
    const ordered = [...wardGroup.patients];
    const fromIndex = ordered.findIndex(p => p.id === draggingPatientId);
    const toIndex = ordered.findIndex(p => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);

    const nextGroups = activePatientsByWard.map(group =>
      group.ward === ward ? { ...group, patients: ordered } : group
    );
    const flattened = nextGroups.flatMap(g => g.patients);
    flattened.forEach((p, idx) => {
      updatePatient(p.id, prev => ({ ...prev, roundOrder: idx }));
    });
  };

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
    const parsing = intakeParsing[patient.id] === 'running';
    const wardLabel = patient.site?.trim() || 'Unassigned';
    const completed = isCompletedToday(patient);
    
    // Collapsed card for completed patients - more faded and minimal
    const cardClasses = completed
      ? `w-full text-left rounded-lg border px-3 py-2 shadow-sm transition opacity-50 bg-gray-100 border-gray-200 hover:opacity-70 hover:border-gray-300`
      : `w-full text-left rounded-lg border p-3 shadow-sm transition border-gray-200 bg-white ${draggingPatientId === patient.id ? 'ring-2 ring-blue-200' : ''} hover:border-blue-400`;

    const handlePatientSelect = () => {
      setSelectedPatientId(patient.id);
      // Close the list overlay after selection
      if (!isPatientListCollapsed) {
        togglePatientList();
      }
    };

    // Collapsed view for completed patients
    if (completed) {
      return (
        <button
          key={patient.id}
          onClick={handlePatientSelect}
          className={cardClasses}
          draggable
          onDragStart={(e) => { e.stopPropagation(); handleDragStart(patient.id); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleDrop(wardLabel, patient.id); }}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <label
                className="flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleCompleted(patient);
                  }}
                  className="w-3.5 h-3.5"
                />
              </label>
              <span className="text-sm font-medium text-gray-600 truncate">{patient.name}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{wardLabel}{patient.bed ? ` • ${patient.bed}` : ''}</span>
            </div>
            <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab flex-shrink-0" />
          </div>
        </button>
      );
    }

    // Full card for non-completed patients
    return (
      <button
        key={patient.id}
        onClick={handlePatientSelect}
        className={cardClasses}
        draggable
        onDragStart={(e) => { e.stopPropagation(); handleDragStart(patient.id); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleDrop(wardLabel, patient.id); }}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <label
              className="flex items-center gap-2 text-xs text-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleCompleted(patient);
                }}
              />
              <span className="uppercase tracking-wide">Done today</span>
            </label>
            <div>
              <div className="text-base font-semibold text-gray-900">{patient.name}</div>
              <div className="text-sm text-gray-600">{wardLabel}{patient.bed ? ` • Bed ${patient.bed}` : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
            {parsing && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                parsing intake…
              </span>
            )}
            {updatedRecently(patient) && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> updated
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

  const handleExportRound = async () => {
    setExportMessage(null);
    setExportErrors([]);
    if (!activePatients.length) {
      setExportMessage('No active patients to export.');
      return;
    }
    setExporting(true);
    try {
      const exporter = new WardRoundCardExporter();
      const result = await exporter.exportRound(activePatients, {
        roundId: roundIdInput,
        ward: roundWard,
        consultant: roundConsultant,
        templateId: 'ward_round_v1',
        layoutVersion: 1
      });
      setExportMessage(result.message);
      setExportErrors(result.errors);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const refreshPending = async () => {
    setLoadingPending(true);
    try {
      const pending = await WardRoundImportService.listPending();
      setPendingUpdates(pending);
    } catch (error) {
      console.warn('Failed to fetch pending ward round updates', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApplyPending = async (pending: PendingWardRoundUpdate) => {
    const patient = patients.find(p => p.id === pending.patientId);
    if (!patient) return;
    const diff = applyPendingUpdateToPatient(pending, patient);
    await applyWardDiff(patient.id, diff, 'Ward round import (reviewed)');
    await WardRoundImportService.resolvePending(pending.id);
    setPendingUpdates(prev => prev.filter(p => p.id !== pending.id));
  };

  const handleRejectPending = async (pending: PendingWardRoundUpdate) => {
    await WardRoundImportService.resolvePending(pending.id);
    setPendingUpdates(prev => prev.filter(p => p.id !== pending.id));
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
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap">Ward list</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="xs" onClick={() => setShowManualForm(prev => !prev)} startIcon={Plus}>
                    Add patient
                  </Button>
                  <Button variant="ghost" size="xs" onClick={togglePatientList}>Close</Button>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-600">Group by:</span>
                <button
                  type="button"
                  onClick={() => setGroupBy('ward')}
                  className={`px-2 py-1 rounded ${groupBy === 'ward' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Ward
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('clinician')}
                  className={`px-2 py-1 rounded ${groupBy === 'clinician' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Clinician
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-3">
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

              <div className="space-y-4">
                {groupBy === 'ward' && activePatientsByWard.map(group => (
                  <div key={group.ward} className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-gray-500 px-1">
                      <span>{group.ward}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="space-y-2">
                      {group.patients.map(renderCard)}
                    </div>
                  </div>
                ))}
                {groupBy === 'clinician' && activePatientsByClinician.map(group => (
                  <div key={group.clinicianId} className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-gray-500 px-1">
                      <span>{group.clinicianName}</span>
                      {group.clinicianRole && <span className="text-gray-400 normal-case">({group.clinicianRole})</span>}
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="space-y-2">
                      {group.patients.map(renderCard)}
                    </div>
                  </div>
                ))}
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

            <div className="border-t border-gray-200 px-3 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Export ward round cards</div>
                  <div className="text-xs text-gray-600">Saves PNGs + round.json into {exportFolder}</div>
                </div>
                <Button size="sm" startIcon={Download} isLoading={exporting} onClick={handleExportRound}>
                  Export
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input
                  className="rounded-md border px-2 py-1 text-sm col-span-2"
                  placeholder="Round ID"
                  value={roundIdInput}
                  onChange={(e) => setRoundIdInput(e.target.value)}
                />
                <input
                  className="rounded-md border px-2 py-1 text-sm"
                  placeholder="Ward"
                  value={roundWard}
                  onChange={(e) => setRoundWard(e.target.value)}
                />
                <input
                  className="rounded-md border px-2 py-1 text-sm"
                  placeholder="Consultant"
                  value={roundConsultant}
                  onChange={(e) => setRoundConsultant(e.target.value)}
                />
              </div>
              {exportMessage && (
                <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-2">
                  {exportMessage}
                  {exportErrors.length > 0 && (
                    <ul className="list-disc pl-4 mt-1 text-rose-600">
                      {exportErrors.map(err => <li key={err}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Pending ward round updates</div>
                  <div className="text-xs text-gray-600">Review imports that need approval</div>
                </div>
                <Button size="xs" variant="outline" onClick={refreshPending} isLoading={loadingPending}>
                  Refresh
                </Button>
              </div>
              {pendingUpdates.length === 0 && (
                <div className="text-xs text-gray-500">No pending updates.</div>
              )}
              {pendingUpdates.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pendingUpdates.map(pu => (
                    <div key={pu.id} className="border border-gray-200 rounded-md p-2">
                      <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                        <span>{pu.patientId}</span>
                        <span className="text-xs text-gray-500">{pu.reason}</span>
                      </div>
                      <div className="text-xs text-gray-700 mt-1">{pu.llmNotes || 'Proposed changes ready for review.'}</div>
                      <div className="text-xs text-gray-800 mt-2 space-y-1">
                        {pu.proposedChanges.issues?.length > 0 && <div>Issues: {pu.proposedChanges.issues.length}</div>}
                        {pu.proposedChanges.investigations?.length > 0 && <div>Investigations: {pu.proposedChanges.investigations.length}</div>}
                        {pu.proposedChanges.tasks?.length > 0 && <div>Tasks: {pu.proposedChanges.tasks.length}</div>}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="xs" onClick={() => handleApplyPending(pu)}>Apply</Button>
                        <Button size="xs" variant="outline" onClick={() => handleRejectPending(pu)}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
