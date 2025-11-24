import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Clipboard, Link2, Mic, Plus, Star, Undo2 } from 'lucide-react';
import Button from '../buttons/Button';
import { useRounds } from '@/contexts/RoundsContext';
import { RoundsPatient } from '@/types/rounds.types';
import { computeLabTrendString, generateRoundsId, isoNow } from '@/utils/rounds';
import { WardUpdateModal } from './WardUpdateModal';

interface PatientDetailProps {
  patient: RoundsPatient;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient }) => {
  const { updatePatient, markDischarged, undoLastWardUpdate, deletePatient } = useRounds();
  const [mrn, setMrn] = useState(patient.mrn);
  const [bed, setBed] = useState(patient.bed);
  const [oneLiner, setOneLiner] = useState(patient.oneLiner);
  const [name, setName] = useState(patient.name);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueNote, setNewIssueNote] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newLabName, setNewLabName] = useState('');
  const [newLabValue, setNewLabValue] = useState('');
  const [newLabUnits, setNewLabUnits] = useState('');
  const [newImagingName, setNewImagingName] = useState('');
  const [newImagingSummary, setNewImagingSummary] = useState('');
  const [wardUpdateOpen, setWardUpdateOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterText, setLetterText] = useState('');
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [newIntakeNote, setNewIntakeNote] = useState('');
  const wardOptions = ['1 South', '1 West', 'ICU', '3 Central', '1 Central', 'Other'];
  const [expanded, setExpanded] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showIntake, setShowIntake] = useState(false);

  useEffect(() => {
    setName(patient.name);
    setMrn(patient.mrn);
    setBed(patient.bed);
    setOneLiner(patient.oneLiner);
  }, [patient.id, patient.name, patient.mrn, patient.bed, patient.oneLiner]);

  const saveDemographics = () => {
    updatePatient(patient.id, (p) => ({
      ...p,
      name: name.trim() || p.name,
      mrn: mrn.trim(),
      bed: bed.trim(),
      oneLiner,
      lastUpdatedAt: isoNow()
    }));
  };

  const addIssue = () => {
    if (!newIssueTitle.trim()) return;
    const timestamp = isoNow();
    updatePatient(patient.id, (p) => ({
      ...p,
      issues: [
        ...p.issues,
        {
          id: generateRoundsId('issue'),
          title: newIssueTitle.trim(),
          status: 'open',
          subpoints: newIssueNote.trim()
            ? [{ id: generateRoundsId('sub'), timestamp, text: newIssueNote.trim() }]
            : [],
          lastUpdatedAt: timestamp
        }
      ],
      lastUpdatedAt: timestamp
    }));
    setNewIssueTitle('');
    setNewIssueNote('');
  };

  const addSubpoint = (issueId: string, text: string) => {
    if (!text.trim()) return;
    const timestamp = isoNow();
    updatePatient(patient.id, (p) => ({
      ...p,
      issues: p.issues.map(issue => issue.id === issueId
        ? { ...issue, subpoints: [...issue.subpoints, { id: generateRoundsId('sub'), timestamp, text: text.trim() }], lastUpdatedAt: timestamp }
        : issue
      ),
      lastUpdatedAt: timestamp
    }));
  };

  const toggleIssueStatus = (issueId: string) => {
    const timestamp = isoNow();
    updatePatient(patient.id, (p) => ({
      ...p,
      issues: p.issues.map(issue => issue.id === issueId
        ? { ...issue, status: issue.status === 'open' ? 'resolved' : 'open', lastUpdatedAt: timestamp }
        : issue
      ),
      lastUpdatedAt: timestamp
    }));
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const timestamp = isoNow();
    updatePatient(patient.id, (p) => ({
      ...p,
      tasks: [...p.tasks, {
        id: generateRoundsId('task'),
        text: newTaskText.trim(),
        status: 'open',
        createdAt: timestamp
      }],
      lastUpdatedAt: timestamp
    }));
    setNewTaskText('');
  };

  const toggleTask = (taskId: string) => {
    const timestamp = isoNow();
    updatePatient(patient.id, (p) => ({
      ...p,
      tasks: p.tasks.map(task => task.id === taskId
        ? { ...task, status: task.status === 'open' ? 'done' : 'open', completedAt: task.status === 'open' ? timestamp : undefined }
        : task
      ),
      lastUpdatedAt: timestamp
    }));
  };

  const addLab = () => {
    if (!newLabName.trim() || !newLabValue.trim()) return;
    const timestamp = isoNow();
    const numericValue = Number(newLabValue);
    updatePatient(patient.id, (p) => {
      const existing = p.investigations.find(inv => inv.type === 'lab' && inv.name.toLowerCase() === newLabName.trim().toLowerCase());
      if (existing) {
        const updated = {
          ...existing,
          labSeries: [...(existing.labSeries || []), { date: timestamp, value: numericValue, units: newLabUnits || undefined }],
          lastUpdatedAt: timestamp
        };
        return {
          ...p,
          investigations: p.investigations.map(inv => inv.id === existing.id ? updated : inv),
          lastUpdatedAt: timestamp
        };
      }

      return {
        ...p,
        investigations: [
          ...p.investigations,
          {
            id: generateRoundsId('inv'),
            type: 'lab',
            name: newLabName.trim(),
            lastUpdatedAt: timestamp,
            labSeries: [{ date: timestamp, value: numericValue, units: newLabUnits || undefined }]
          }
        ],
        lastUpdatedAt: timestamp
      };
    });

    setNewLabName('');
    setNewLabValue('');
    setNewLabUnits('');
  };

  const addImaging = () => {
    if (!newImagingName.trim() || !newImagingSummary.trim()) return;
    const timestamp = isoNow();
    updatePatient(patient.id, (p) => ({
      ...p,
      investigations: [
        ...p.investigations,
        {
          id: generateRoundsId('inv'),
          type: 'imaging',
          name: newImagingName.trim(),
          summary: newImagingSummary.trim(),
          lastUpdatedAt: timestamp
        }
      ],
      lastUpdatedAt: timestamp
    }));
    setNewImagingName('');
    setNewImagingSummary('');
  };

  const sortedIssues = useMemo(() => {
    const open = patient.issues.filter(i => i.status === 'open');
    const resolved = patient.issues.filter(i => i.status === 'resolved');
    return [...open, ...resolved];
  }, [patient.issues]);

  const openTasks = patient.tasks.filter(t => t.status === 'open');
  const doneTasks = patient.tasks.filter(t => t.status === 'done');

  const handleGoToPatient = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'NAVIGATE_TO_PATIENT',
        fileNumber: patient.mrn || patient.name,
        patientName: patient.name
      });
    } catch (error) {
      console.error('Failed to trigger Go To Patient', error);
    }
  };

  const generateGpLetter = () => {
    setLetterLoading(true);
    setLetterError(null);
    const run = async () => {
      try {
        const { RoundsLLMService } = await import('@/services/RoundsLLMService');
        const text = await RoundsLLMService.getInstance().generateGpLetter(patient);
        setLetterText(text);
        setLetterOpen(true);
      } catch (error) {
        setLetterError(error instanceof Error ? error.message : 'Failed to generate letter');
      } finally {
        setLetterLoading(false);
      }
    };
    run();
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="rounded-xl border-2 border-gray-500 p-4 bg-white shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500">Patient</div>
            <input
              className="text-lg sm:text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent focus:border-gray-300 focus:outline-none w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveDemographics}
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="xs" className="px-2" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Hide details' : 'Show details'}
            </Button>
          </div>
        </div>

        {!expanded && (
          <div className="text-sm text-gray-600">Details collapsed. Click Show to expand.</div>
        )}

        {expanded && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-1">
                <label className="text-xs font-medium text-gray-600">Ward</label>
                <select
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                  value={patient.site || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updatePatient(patient.id, (p) => ({ ...p, site: val, lastUpdatedAt: isoNow() }));
                  }}
                >
                  <option value="">Select ward</option>
                  {wardOptions.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">MRN / UR</label>
                <input className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={mrn} onChange={(e) => setMrn(e.target.value)} onBlur={saveDemographics} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Bed</label>
                <input className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={bed} onChange={(e) => setBed(e.target.value)} onBlur={saveDemographics} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">One-liner</label>
              <textarea className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[60px]" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} onBlur={saveDemographics} />
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border-2 border-amber-500 p-4 bg-white shadow-sm">
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Issues</h4>
            <Button size="xs" startIcon={Plus} onClick={() => setShowIssueForm(v => !v)}>{showIssueForm ? 'Close' : 'Add'}</Button>
          </div>
          {showIssueForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="rounded-md border px-2 py-2 text-sm w-full"
                placeholder="Issue title"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
              />
              <input
                className="rounded-md border px-2 py-2 text-sm w-full"
                placeholder="Initial note"
                value={newIssueNote}
                onChange={(e) => setNewIssueNote(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="xs" onClick={addIssue} disabled={!newIssueTitle.trim()}>Save</Button>
                <Button size="xs" variant="ghost" onClick={() => { setShowIssueForm(false); setNewIssueTitle(''); setNewIssueNote(''); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {sortedIssues.map(issue => (
            <div key={issue.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleIssueStatus(issue.id)}
                    className={`text-xs px-2 py-1 rounded-full ${issue.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    {issue.status === 'open' ? 'Open' : 'Resolved'}
                  </button>
                  <div className="font-medium text-gray-900">{issue.title}</div>
                </div>
                {issue.pinToHud && <Star className="w-4 h-4 text-amber-500" />}
              </div>
              <div className="mt-2 space-y-1">
                {issue.subpoints.map(sub => (
                  <div key={sub.id} className="text-sm text-gray-700">
                    <span className="text-gray-400 text-xs mr-2">{new Date(sub.timestamp).toLocaleString()}</span>
                    {sub.text}
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <input
                  className="w-full rounded-md border px-2 py-1 text-sm"
                  placeholder="Add subpoint"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubpoint(issue.id, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>
          ))}
          {sortedIssues.length === 0 && <p className="text-sm text-gray-500">No issues documented yet.</p>}
        </div>
      </div>

      <div className="rounded-xl border-2 border-blue-500 p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Investigations</h4>
        </div>
        <div className="space-y-3">
          {patient.investigations.map(inv => (
            <div key={inv.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{inv.name}</div>
                <div className="text-xs text-gray-500">{new Date(inv.lastUpdatedAt).toLocaleDateString()}</div>
              </div>
              {inv.type === 'lab' ? (
                <div className="text-sm text-gray-700">Trend: {computeLabTrendString(inv.labSeries || []) || '—'}</div>
              ) : (
                <div className="text-sm text-gray-700">{inv.summary || 'No summary yet'}</div>
              )}
            </div>
          ))}
          <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-xs uppercase text-gray-500">Add lab</div>
            <div className="grid grid-cols-3 gap-2">
              <input className="rounded-md border px-2 py-1 text-sm" placeholder="Name" value={newLabName} onChange={(e) => setNewLabName(e.target.value)} />
              <input className="rounded-md border px-2 py-1 text-sm" placeholder="Value" value={newLabValue} onChange={(e) => setNewLabValue(e.target.value)} />
              <input className="rounded-md border px-2 py-1 text-sm" placeholder="Units" value={newLabUnits} onChange={(e) => setNewLabUnits(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="xs" startIcon={Plus} onClick={addLab} disabled={!newLabName.trim() || !newLabValue.trim()}>Add lab</Button>
            </div>
            <div className="text-xs uppercase text-gray-500 pt-2">Add imaging / procedure</div>
            <div className="flex flex-col gap-2">
              <input className="rounded-md border px-2 py-1 text-sm w-full" placeholder="Name (e.g., Echo)" value={newImagingName} onChange={(e) => setNewImagingName(e.target.value)} />
              <input className="rounded-md border px-2 py-1 text-sm w-full" placeholder="Summary" value={newImagingSummary} onChange={(e) => setNewImagingSummary(e.target.value)} />
            </div>
            <div className="flex justify-end mt-2">
              <Button size="xs" startIcon={Plus} onClick={addImaging} disabled={!newImagingName.trim() || !newImagingSummary.trim()}>Add summary</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-green-600 p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Tasks</h4>
          <Button size="xs" startIcon={Plus} onClick={() => setShowTaskForm(v => !v)}>{showTaskForm ? 'Close' : 'Add'}</Button>
        </div>
        {showTaskForm && (
          <div className="flex items-center gap-2 mb-3">
            <input className="rounded-md border px-2 py-2 text-sm flex-1" placeholder="Add task" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} />
            <Button size="xs" startIcon={Plus} onClick={addTask} disabled={!newTaskText.trim()}>Save</Button>
            <Button size="xs" variant="ghost" onClick={() => { setShowTaskForm(false); setNewTaskText(''); }}>Cancel</Button>
          </div>
        )}
        <div className="space-y-2">
          {[...openTasks, ...doneTasks].map(task => (
            <div key={task.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleTask(task.id)} />
                <span className={`${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{task.text}</span>
              </div>
              {task.status === 'done' && <span className="text-xs text-gray-400">Done</span>}
            </div>
          ))}
          {patient.tasks.length === 0 && <p className="text-sm text-gray-500">No tasks yet.</p>}
        </div>
      </div>

      <div className="rounded-xl border-2 border-purple-500 p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Intake notes</h4>
            <p className="text-xs text-gray-500">Stored as typed; not modified.</p>
          </div>
          <Button size="xs" variant="ghost" onClick={() => setShowIntake(v => !v)}>{showIntake ? 'Hide' : 'Show'}</Button>
        </div>
        {showIntake && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <input
                className="flex-1 rounded-md border px-2 py-1 text-sm"
                placeholder="Add intake note"
                value={newIntakeNote}
                onChange={(e) => setNewIntakeNote(e.target.value)}
              />
              <Button
                size="xs"
                onClick={() => {
                  if (!newIntakeNote.trim()) return;
                  const timestamp = isoNow();
                  updatePatient(patient.id, (p) => ({
                    ...p,
                    intakeNotes: [...p.intakeNotes, { id: generateRoundsId('intake'), timestamp, text: newIntakeNote.trim() }],
                    lastUpdatedAt: timestamp
                  }));
                  setNewIntakeNote('');
                }}
              >
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {patient.intakeNotes.map(note => (
                <div key={note.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">{new Date(note.timestamp).toLocaleString()}</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</div>
                </div>
              ))}
              {patient.intakeNotes.length === 0 && <p className="text-sm text-gray-500">No intake notes yet.</p>}
            </div>
          </>
        )}
      </div>

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
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}

      <WardUpdateModal
        open={wardUpdateOpen}
        onClose={() => setWardUpdateOpen(false)}
        patient={patient}
      />
    </div>
  );
};
