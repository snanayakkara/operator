import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Star, ChevronDown, Phone, X, Copy, Check } from 'lucide-react';
import Button from '../buttons/Button';
import { useRounds } from '@/contexts/RoundsContext';
import { IssueSubpoint, RoundsPatient, Clinician, MessageTimeWindow } from '@/types/rounds.types';
import { computeDayCount, computeLabTrendString, generateRoundsId, isoNow, collectRecentPatientEvents, computeMessageWindowIso } from '@/utils/rounds';
import { WardUpdateModal } from './WardUpdateModal';
import { PROCEDURE_CHECKLISTS, ProcedureChecklistKey } from '@/config/procedureChecklists';
import { RoundsLLMService } from '@/services/RoundsLLMService';
import { NokExportService } from '@/services/NokExportService';

type ProcedureDraft = {
  name: string;
  date: string;
  notes: string;
  showDayCounter: boolean;
  checklistKey?: ProcedureChecklistKey | '';
};

const defaultProcedureDraft = (): ProcedureDraft => ({
  name: '',
  date: '',
  notes: '',
  showDayCounter: true,
  checklistKey: ''
});

interface PatientDetailProps {
  patient: RoundsPatient;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient }) => {
  const { patients, updatePatient, clinicians, addClinician, assignClinicianToPatient, unassignClinicianFromPatient } = useRounds();
  const [mrn, setMrn] = useState(patient.mrn);
  const [bed, setBed] = useState(patient.bed);
  const [oneLiner, setOneLiner] = useState(patient.oneLiner);
  const [name, setName] = useState(patient.name);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueNote, setNewIssueNote] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newLabName, setNewLabName] = useState('');
  const [newLabValue, setNewLabValue] = useState('');
  const [newLabDate, setNewLabDate] = useState('');
  const [newImagingName, setNewImagingName] = useState('');
  const [newImagingSummary, setNewImagingSummary] = useState('');
  const [newImagingDate, setNewImagingDate] = useState('');
  const [wardUpdateOpen, setWardUpdateOpen] = useState(false);
  const [newIntakeNote, setNewIntakeNote] = useState('');
  const wardOptions = ['1 South', '1 West', 'ICU', '3 Central', '1 Central', 'Other'];
  const [wardSelection, setWardSelection] = useState(
    patient.site && wardOptions.includes(patient.site) ? patient.site : patient.site ? 'Other' : ''
  );
  const [customWard, setCustomWard] = useState(
    patient.site && !wardOptions.includes(patient.site) ? patient.site : ''
  );
  const [nokName, setNokName] = useState(patient.nextOfKin?.name || '');
  const [nokRelation, setNokRelation] = useState(patient.nextOfKin?.relation || '');
  const [nokPhone, setNokPhone] = useState(patient.nextOfKin?.phone || '');
  const [expanded, setExpanded] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [activeSubpointIssueId, setActiveSubpointIssueId] = useState<string | null>(null);
  const [subpointDrafts, setSubpointDrafts] = useState<Record<string, string>>({});
  const [subpointEntryType, setSubpointEntryType] = useState<Record<string, 'note' | 'procedure'>>({});
  const [procedureDrafts, setProcedureDrafts] = useState<Record<string, ProcedureDraft>>({});
  const [editingProcedureToggles, setEditingProcedureToggles] = useState<Record<string, boolean>>({});
  const [dayCounterTick, setDayCounterTick] = useState(Date.now());
  const [openIssueMenuId, setOpenIssueMenuId] = useState<string | null>(null);
  const [showInvestigationForm, setShowInvestigationForm] = useState(false);
  const [isInvestigationEditMode, setIsInvestigationEditMode] = useState(false);
  const [investigationEdits, setInvestigationEdits] = useState<Record<string, { name: string; summary?: string; date: string }>>({});
  const [openInvestigationMenuId, setOpenInvestigationMenuId] = useState<string | null>(null);

  // Clinicians state
  const [newClinicianName, setNewClinicianName] = useState('');
  const [selectedClinicianId, setSelectedClinicianId] = useState('');

  // Message update state
  const [isGeneratingUpdate, setIsGeneratingUpdate] = useState(false);
  const [messageUpdateText, setMessageUpdateText] = useState('');
  const [messageCopied, setMessageCopied] = useState(false);
  const [messageTimeWindow, setMessageTimeWindow] = useState<MessageTimeWindow>('24h');

  const toggleExpanded = () => setExpanded(prev => !prev);
  const ensureExpanded = () => setExpanded(true);

  useEffect(() => {
    setName(patient.name);
    setMrn(patient.mrn);
    setBed(patient.bed);
    setOneLiner(patient.oneLiner);
    setWardSelection(
      patient.site && wardOptions.includes(patient.site) ? patient.site : patient.site ? 'Other' : ''
    );
    setCustomWard(patient.site && !wardOptions.includes(patient.site) ? patient.site : '');
    setNokName(patient.nextOfKin?.name || '');
    setNokRelation(patient.nextOfKin?.relation || '');
    setNokPhone(patient.nextOfKin?.phone || '');
    setIsInvestigationEditMode(false);
    setShowInvestigationForm(false);
    setInvestigationEdits({});
    setOpenInvestigationMenuId(null);
  }, [patient.id, patient.name, patient.mrn, patient.bed, patient.oneLiner, patient.site]);

  useEffect(() => {
    const interval = setInterval(() => setDayCounterTick(Date.now()), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isEditMode) {
      setOpenIssueMenuId(null);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (isInvestigationEditMode) {
      setOpenInvestigationMenuId(null);
    }
  }, [isInvestigationEditMode]);

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

  const saveNextOfKin = async () => {
    const trimmedName = nokName.trim();
    const trimmedRelation = nokRelation.trim();
    const trimmedPhone = nokPhone.trim();
    const hasNokData = trimmedName || trimmedRelation || trimmedPhone;

    const updatedPatient: RoundsPatient = {
      ...patient,
      nextOfKin: hasNokData ? {
        name: trimmedName,
        relation: trimmedRelation,
        phone: trimmedPhone
      } : undefined,
      lastUpdatedAt: isoNow()
    };

    await updatePatient(patient.id, () => updatedPatient);

    try {
      await NokExportService.exportList(
        patients.map(p => p.id === patient.id ? updatedPatient : p)
      );
    } catch (error) {
      console.warn('⚠️ Failed to export NOK call list', error);
    }
  };

  const startInvestigationEdit = () => {
    const initial: Record<string, { name: string; summary?: string; date: string }> = {};
    patient.investigations.forEach(inv => {
      initial[inv.id] = {
        name: inv.name,
        summary: inv.summary || '',
        date: (inv.lastUpdatedAt || '').slice(0, 10)
      };
    });
    setInvestigationEdits(initial);
    setIsInvestigationEditMode(true);
  };

  const cancelInvestigationEdit = () => {
    setIsInvestigationEditMode(false);
    setInvestigationEdits({});
  };

  const saveInvestigationEdits = () => {
    updatePatient(patient.id, (p) => ({
      ...p,
      investigations: p.investigations.map(inv => {
        const edits = investigationEdits[inv.id];
        if (!edits) return inv;
        const parsedDate = edits.date ? new Date(edits.date) : null;
        const isValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.valueOf());
        return {
          ...inv,
          name: edits.name.trim() || inv.name,
          summary: (edits.summary || '').trim() ? (edits.summary || '').trim() : undefined,
          lastUpdatedAt: isValidDate ? parsedDate.toISOString() : inv.lastUpdatedAt
        };
      }),
      lastUpdatedAt: isoNow()
    }));
    setIsInvestigationEditMode(false);
  };

  const deleteInvestigation = (investigationId: string) => {
    if (!window.confirm('Delete this investigation?')) return;
    const timestamp = isoNow();
    setOpenInvestigationMenuId(null);
    updatePatient(patient.id, (p) => ({
      ...p,
      investigations: p.investigations.filter(inv => inv.id !== investigationId),
      lastUpdatedAt: timestamp
    }));
  };

  const handleWardSelection = (val: string) => {
    setWardSelection(val);
    if (val !== 'Other') {
      setCustomWard('');
      updatePatient(patient.id, (p) => ({ ...p, site: val, lastUpdatedAt: isoNow() }));
    } else {
      // Seed custom input with any existing non-standard ward value
      const seed = patient.site && !wardOptions.includes(patient.site) ? patient.site : '';
      setCustomWard(seed);
    }
  };

  const handleCustomWardBlur = () => {
    const trimmed = customWard.trim();
    if (!trimmed) return;
    updatePatient(patient.id, (p) => ({ ...p, site: trimmed, lastUpdatedAt: isoNow() }));
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
            ? [{ id: generateRoundsId('sub'), timestamp, type: 'note', text: newIssueNote.trim() }]
            : [],
          lastUpdatedAt: timestamp
        }
      ],
      lastUpdatedAt: timestamp
    }));
    setNewIssueTitle('');
    setNewIssueNote('');
  };

  const addSubpoint = (issueId: string, subpoint: IssueSubpoint) => {
    const timestamp = isoNow();
    const normalized: IssueSubpoint = subpoint.type === 'procedure'
      ? {
          ...subpoint,
          id: subpoint.id || generateRoundsId('sub'),
          timestamp: subpoint.timestamp || timestamp,
          type: 'procedure',
          procedure: {
            ...subpoint.procedure,
            showDayCounter: subpoint.procedure?.showDayCounter ?? false
          }
        }
      : {
          ...subpoint,
          id: subpoint.id || generateRoundsId('sub'),
          timestamp: subpoint.timestamp || timestamp,
          type: 'note',
          text: subpoint.text || ''
        };

    updatePatient(patient.id, (p) => ({
      ...p,
      issues: p.issues.map(issue => issue.id === issueId
        ? { ...issue, subpoints: [...issue.subpoints, normalized], lastUpdatedAt: timestamp }
        : issue
      ),
      lastUpdatedAt: timestamp
    }));
  };

  const startSubpointEntry = (issueId: string) => {
    setActiveSubpointIssueId(prev => (prev === issueId ? null : issueId));
    setSubpointDrafts(prev => ({ ...prev, [issueId]: prev[issueId] || '' }));
    setSubpointEntryType(prev => ({ ...prev, [issueId]: prev[issueId] || 'note' }));
    setProcedureDrafts(prev => ({ ...prev, [issueId]: prev[issueId] || { ...defaultProcedureDraft(), checklistKey: undefined } }));
  };

  const submitSubpoint = (issueId: string) => {
    const type = subpointEntryType[issueId] || 'note';
    if (type === 'procedure') {
      const proc = procedureDrafts[issueId] || defaultProcedureDraft();
      if (!proc.name.trim() || !proc.date) return;
      addSubpoint(issueId, {
        id: generateRoundsId('sub'),
        timestamp: isoNow(),
        type: 'procedure',
        procedure: {
          name: proc.name.trim(),
          date: proc.date,
          notes: proc.notes.trim() || undefined,
          showDayCounter: proc.showDayCounter,
          checklistKey: proc.checklistKey || undefined
        }
      });
      setProcedureDrafts(prev => ({ ...prev, [issueId]: { ...defaultProcedureDraft(), checklistKey: undefined } }));
    } else {
      const text = subpointDrafts[issueId]?.trim() || '';
      if (!text) return;
      addSubpoint(issueId, { id: generateRoundsId('sub'), timestamp: isoNow(), type: 'note', text });
      setSubpointDrafts(prev => ({ ...prev, [issueId]: '' }));
    }
    setActiveSubpointIssueId(null);
  };

  const cancelSubpointEntry = () => {
    setActiveSubpointIssueId(null);
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

  const deleteIssue = (issueId: string) => {
    if (!window.confirm('Delete this issue?')) return;
    const timestamp = isoNow();
    setOpenIssueMenuId(null);
    updatePatient(patient.id, (p) => {
      const removedProcedureIds = new Set<string>();
      const issueToDelete = p.issues.find(i => i.id === issueId);
      issueToDelete?.subpoints.forEach(sub => {
        if (sub.type === 'procedure') {
          removedProcedureIds.add(sub.id);
        }
      });

      return {
        ...p,
        issues: p.issues.filter(i => i.id !== issueId),
        tasks: p.tasks.filter(task => !task.procedureId || !removedProcedureIds.has(task.procedureId)),
        lastUpdatedAt: timestamp
      };
    });
  };

  const enterEditMode = () => {
    // Initialize editing values with current issue titles and subpoint texts
    const values: Record<string, string> = {};
    patient.issues.forEach(issue => {
      values[`issue-${issue.id}`] = issue.title;
      issue.subpoints.forEach(sub => {
        if (sub.type === 'procedure') {
          values[`subpoint-name-${sub.id}`] = sub.procedure?.name || '';
          values[`subpoint-date-${sub.id}`] = sub.procedure?.date || '';
          values[`subpoint-notes-${sub.id}`] = sub.procedure?.notes || '';
          setEditingProcedureToggles(prev => ({ ...prev, [sub.id]: sub.procedure?.showDayCounter ?? false }));
        } else {
          values[`subpoint-${sub.id}`] = sub.text;
        }
      });
    });
    setEditingValues(values);
    setIsEditMode(true);
  };

  const saveEdits = () => {
    const timestamp = isoNow();
    const removedProcedureIds = new Set<string>();

    updatePatient(patient.id, (p) => ({
      ...p,
      issues: p.issues.map(issue => ({
        ...issue,
        title: editingValues[`issue-${issue.id}`]?.trim() || issue.title,
        subpoints: issue.subpoints.reduce<IssueSubpoint[]>((acc, sub) => {
          if (sub.type === 'procedure') {
            const nextName = editingValues[`subpoint-name-${sub.id}`] !== undefined
              ? editingValues[`subpoint-name-${sub.id}`]?.trim() || ''
              : sub.procedure?.name || '';
            const nextDate = editingValues[`subpoint-date-${sub.id}`] ?? sub.procedure?.date ?? '';
            const nextNotes = editingValues[`subpoint-notes-${sub.id}`] !== undefined
              ? editingValues[`subpoint-notes-${sub.id}`]?.trim() || ''
              : sub.procedure?.notes || '';
            const nextShowDayCounter = editingProcedureToggles[sub.id] ?? sub.procedure?.showDayCounter ?? false;
            const nextChecklistKey = sub.procedure?.checklistKey;

            // If the procedure name is cleared, treat as deletion
            if (!nextName) {
              removedProcedureIds.add(sub.id);
              return acc;
            }

            acc.push({
              ...sub,
              type: 'procedure',
              procedure: {
                ...sub.procedure,
                name: nextName,
                date: nextDate,
                notes: nextNotes,
                showDayCounter: nextShowDayCounter,
                checklistKey: nextChecklistKey
              }
            });
            return acc;
          }

          const editedNote = editingValues[`subpoint-${sub.id}`];
          const nextText = editedNote !== undefined ? editedNote.trim() : sub.text;
          // If note text is cleared, drop the subpoint
          if (!nextText) {
            return acc;
          }

          acc.push({
            ...sub,
            type: 'note',
            text: nextText
          });
          return acc;
        }, []),
        lastUpdatedAt: timestamp
      })),
      tasks: p.tasks.filter(task => !task.procedureId || !removedProcedureIds.has(task.procedureId)),
      lastUpdatedAt: timestamp
    }));
    setIsEditMode(false);
    setEditingValues({});
    setEditingProcedureToggles({});
  };

  const cancelEdits = () => {
    setIsEditMode(false);
    setEditingValues({});
    setEditingProcedureToggles({});
  };

  const updateEditValue = (key: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [key]: value }));
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
    if (!newLabName.trim() || !newLabValue.trim() || !newLabDate) return;
    const numericValue = Number(newLabValue);
    const parsedDate = new Date(newLabDate);
    if (Number.isNaN(numericValue) || Number.isNaN(parsedDate.valueOf())) return;
    const timestamp = parsedDate.toISOString();
    updatePatient(patient.id, (p) => {
      const existing = p.investigations.find(inv => inv.type === 'lab' && inv.name.toLowerCase() === newLabName.trim().toLowerCase());
      if (existing) {
        const updated = {
          ...existing,
          labSeries: [...(existing.labSeries || []), { date: timestamp, value: numericValue }],
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
            labSeries: [{ date: timestamp, value: numericValue }]
          }
        ],
        lastUpdatedAt: timestamp
      };
    });

    setNewLabName('');
    setNewLabValue('');
    setNewLabDate('');
  };

  const addImaging = () => {
    if (!newImagingName.trim() || !newImagingSummary.trim() || !newImagingDate) return;
    const parsedDate = new Date(newImagingDate);
    if (Number.isNaN(parsedDate.valueOf())) return;
    const timestamp = parsedDate.toISOString();
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

  // Clinician handlers
  const handleAssignClinician = async () => {
    if (!selectedClinicianId) return;
    await assignClinicianToPatient(patient.id, selectedClinicianId);
    setSelectedClinicianId('');
  };

  const handleQuickAddClinician = async () => {
    if (!newClinicianName.trim()) return;
    const timestamp = isoNow();
    const newClinician: Clinician = {
      id: generateRoundsId('clin'),
      name: newClinicianName.trim(),
      createdAt: timestamp,
      lastUpdatedAt: timestamp
    };
    await addClinician(newClinician);
    await assignClinicianToPatient(patient.id, newClinician.id);
    setNewClinicianName('');
  };

  const handleRemoveClinician = async (clinicianId: string) => {
    await unassignClinicianFromPatient(patient.id, clinicianId);
  };

  // Message update handlers
  const handleGenerateMessageUpdate = async () => {
    setIsGeneratingUpdate(true);
    setMessageUpdateText('');
    try {
      const sinceIso = computeMessageWindowIso(messageTimeWindow, patient);
      const events = collectRecentPatientEvents(patient, sinceIso);
      const llmService = RoundsLLMService.getInstance();
      const message = await llmService.generatePatientUpdateMessage(patient, events);
      setMessageUpdateText(message);
    } catch (error) {
      console.error('Failed to generate message update:', error);
      setMessageUpdateText('Error generating update. Please try again.');
    } finally {
      setIsGeneratingUpdate(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!messageUpdateText) return;
    try {
      await navigator.clipboard.writeText(messageUpdateText);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const sortedIssues = useMemo(() => {
    const open = patient.issues.filter(i => i.status === 'open');
    const resolved = patient.issues.filter(i => i.status === 'resolved');
    return [...open, ...resolved];
  }, [patient.issues]);

  const locationDisplay = useMemo(() => {
    const parts: string[] = [];
    if (patient.site?.trim()) parts.push(patient.site.trim());
    if (bed.trim()) parts.push(`Bed ${bed.trim()}`);
    return parts.join(' • ');
  }, [patient.site, bed]);

  const openTasks = patient.tasks.filter(t => t.status === 'open');
  const doneTasks = patient.tasks.filter(t => t.status === 'done');

  // Auto-schedule checklist tasks based on procedure day counts
  useEffect(() => {
    const tasksToAdd: any[] = [];
    sortedIssues.forEach(issue => {
      issue.subpoints.forEach(sub => {
        if (sub.type !== 'procedure' || !sub.procedure?.date) return;
        if (!sub.procedure.checklistKey) return;
        const checklist = PROCEDURE_CHECKLISTS.find(c => c.key === sub.procedure?.checklistKey);
        if (!checklist) return;
        const dayCount = computeDayCount(sub.procedure.date);
        if (dayCount === null) return;
        checklist.items.forEach(item => {
          if (dayCount >= item.day) {
            const exists = patient.tasks.some(t =>
              t.procedureId === sub.id &&
              t.scheduledDayOffset === item.day &&
              t.text === item.text
            );
            if (!exists) {
              tasksToAdd.push({
                id: generateRoundsId('task'),
                text: item.text,
                status: 'open',
                createdAt: isoNow(),
                origin: 'procedure-checklist',
                procedureId: sub.id,
                scheduledDayOffset: item.day
              });
            }
          }
        });
      });
    });

    if (tasksToAdd.length) {
      updatePatient(patient.id, (p) => ({
        ...p,
        tasks: [...p.tasks, ...tasksToAdd],
        lastUpdatedAt: isoNow()
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, patient.tasks, sortedIssues, updatePatient, dayCounterTick]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="relative rounded-xl p-4 bg-white shadow-sm">
        <div className="space-y-3">
          <div
            className="min-w-0 space-y-1"
            onClick={toggleExpanded}
          >
            <div className="text-[11px] text-gray-500 select-none">Patient</div>
            <input
              className="text-lg sm:text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent focus:border-gray-300 focus:outline-none w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveDemographics}
              onClick={(e) => {
                e.stopPropagation();
                ensureExpanded();
              }}
              onFocus={ensureExpanded}
            />
            {locationDisplay && (
              <div className="text-sm text-gray-600 truncate">{locationDisplay}</div>
            )}
          </div>

          {expanded && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-gray-600">Ward</label>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                    value={wardSelection}
                    onChange={(e) => handleWardSelection(e.target.value)}
                  >
                    <option value="">Select ward</option>
                    {wardOptions.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {wardSelection === 'Other' && (
                    <input
                      className="mt-2 w-full rounded-md border px-2 py-2 text-sm"
                      placeholder="Enter ward name"
                      value={customWard}
                      onChange={(e) => setCustomWard(e.target.value)}
                      onBlur={handleCustomWardBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCustomWardBlur();
                        }
                      }}
                    />
                  )}
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
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Next of Kin</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Name</label>
                    <input
                      className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                      placeholder="NOK name"
                      value={nokName}
                      onChange={(e) => setNokName(e.target.value)}
                      onBlur={saveNextOfKin}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Relation</label>
                    <input
                      className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                      placeholder="e.g. Spouse, Son"
                      value={nokRelation}
                      onChange={(e) => setNokRelation(e.target.value)}
                      onBlur={saveNextOfKin}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Phone</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        className="flex-1 rounded-md border px-2 py-2 text-sm"
                        placeholder="Phone number"
                        type="tel"
                        value={nokPhone}
                        onChange={(e) => setNokPhone(e.target.value)}
                        onBlur={saveNextOfKin}
                      />
                      {nokPhone.trim() && (
                        <a
                          href={`tel:${nokPhone.trim()}`}
                          className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                          title="Call NOK"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Clinicians</h4>
                <div className="flex flex-wrap gap-2">
                  {patient.clinicianIds?.map(clinicianId => {
                    const clinician = clinicians.find(c => c.id === clinicianId);
                    if (!clinician) return null;
                    return (
                      <div key={clinician.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                        <span>{clinician.name}</span>
                        {clinician.role && <span className="text-blue-600">({clinician.role})</span>}
                        <button
                          type="button"
                          onClick={() => handleRemoveClinician(clinician.id)}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          title={`Remove ${clinician.name}`}
                          aria-label={`Remove ${clinician.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(!patient.clinicianIds || patient.clinicianIds.length === 0) && (
                    <span className="text-sm text-gray-500">No clinicians assigned</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="flex-1 rounded-md border px-2 py-1 text-sm"
                    value={selectedClinicianId}
                    onChange={(e) => setSelectedClinicianId(e.target.value)}
                    aria-label="Select clinician to assign"
                  >
                    <option value="">Select existing clinician</option>
                    {clinicians
                      .filter(c => !patient.clinicianIds?.includes(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.role ? ` (${c.role})` : ''}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="xs"
                    onClick={handleAssignClinician}
                    disabled={!selectedClinicianId}
                  >
                    Assign
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-gray-200">
                  <input
                    className="flex-1 rounded-md border px-2 py-1 text-sm"
                    placeholder="Quick add new clinician"
                    value={newClinicianName}
                    onChange={(e) => setNewClinicianName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddClinician();
                      }
                    }}
                  />
                  <Button
                    size="xs"
                    startIcon={Plus}
                    onClick={handleQuickAddClinician}
                    disabled={!newClinicianName.trim()}
                  >
                    Add & Assign
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
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
                        <div key={note.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="text-xs text-gray-500 mb-1">{new Date(note.timestamp).toLocaleString()}</div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</div>
                        </div>
                      ))}
                      {patient.intakeNotes.length === 0 && <p className="text-sm text-gray-500">No intake notes yet.</p>}
                    </div>
                  </>
                )}
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Message Update</h4>
                <p className="text-xs text-gray-500">Generate a brief update based on recent changes</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="rounded-md border px-2 py-1 text-sm"
                    value={messageTimeWindow}
                    onChange={(e) => setMessageTimeWindow(e.target.value as MessageTimeWindow)}
                    aria-label="Select time window for update"
                  >
                    <option value="6h">Last 6 hours</option>
                    <option value="12h">Last 12 hours</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="48h">Last 48 hours</option>
                    <option value="today6am">Since 6am today</option>
                    <option value="lastRound">Since last round</option>
                  </select>
                  <Button
                    size="xs"
                    onClick={handleGenerateMessageUpdate}
                    disabled={isGeneratingUpdate}
                  >
                    {isGeneratingUpdate ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
                {messageUpdateText && (
                  <div className="space-y-2">
                    <div className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="text-sm text-gray-800">{messageUpdateText}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        {messageUpdateText.length}/280 characters
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="xs"
                        startIcon={messageCopied ? Check : Copy}
                        onClick={handleCopyMessage}
                        variant={messageCopied ? 'ghost' : 'secondary'}
                      >
                        {messageCopied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-400 p-3 sm:p-4 bg-white shadow-sm">
        <div className="mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Issues</h4>
            <div className="flex items-center gap-1">
              {isEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={saveEdits}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdits}
                    className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowIssueForm(v => !v)}
                    className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    {showIssueForm ? 'Close' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={enterEditMode}
                    className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
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
        <div className="divide-y divide-gray-100">
          {sortedIssues.map((issue) => (
            <div key={issue.id} className="py-3">
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-gray-100">
                {isEditMode ? (
                  <input
                    className="flex-1 rounded-md border px-2 py-1.5 text-sm font-semibold"
                    value={editingValues[`issue-${issue.id}`] || ''}
                    onChange={(e) => updateEditValue(`issue-${issue.id}`, e.target.value)}
                    placeholder="Issue title"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenIssueMenuId(prev => (prev === issue.id ? null : issue.id))}
                    className="flex-1 flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50 transition-colors -ml-2"
                  >
                    <span className={`font-semibold text-[15px] text-left ${issue.status === 'resolved' ? 'text-gray-400' : 'text-gray-900'}`}>
                      {issue.title}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openIssueMenuId === issue.id ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {!isEditMode && issue.pinToHud && <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />}
              </div>
              {!isEditMode && openIssueMenuId === issue.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleIssueStatus(issue.id)}
                    className={`px-3 py-1 rounded-full border ${issue.status === 'open' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                  >
                    {issue.status === 'open' ? 'Mark resolved' : 'Mark open'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startSubpointEntry(issue.id)}
                    className="px-3 py-1 rounded-full border bg-gray-100 border-gray-200 text-gray-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add note/procedure
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteIssue(issue.id)}
                    className="px-3 py-1 rounded-full border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
              <div className="mt-2 ml-1 space-y-1.5">
                {issue.subpoints.map(sub => {
                  const isProcedure = sub.type === 'procedure' && sub.procedure;
                  if (isProcedure) {
                    const dayCount = computeDayCount(sub.procedure?.date || '');
                    const badgeText = dayCount !== null
                      ? (dayCount < 0 ? 'Upcoming' : `Day ${dayCount}`)
                      : 'No date';
                    return (
                      <div key={sub.id} className="text-sm text-gray-800 flex flex-col gap-1 border border-gray-100 rounded-md p-2 bg-gray-50">
                        {isEditMode ? (
                          <>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                className="flex-1 rounded-md border px-2 py-1 text-sm"
                                value={editingValues[`subpoint-name-${sub.id}`] || ''}
                                onChange={(e) => updateEditValue(`subpoint-name-${sub.id}`, e.target.value)}
                                placeholder="Procedure name"
                              />
                              <input
                                type="date"
                                className="rounded-md border px-2 py-1 text-sm"
                                value={editingValues[`subpoint-date-${sub.id}`] || ''}
                                onChange={(e) => updateEditValue(`subpoint-date-${sub.id}`, e.target.value)}
                              />
                            </div>
                            <input
                              className="rounded-md border px-2 py-1 text-sm"
                              value={editingValues[`subpoint-notes-${sub.id}`] || ''}
                              onChange={(e) => updateEditValue(`subpoint-notes-${sub.id}`, e.target.value)}
                              placeholder="Notes (optional)"
                            />
                            <label className="flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={editingProcedureToggles[sub.id] ?? false}
                                onChange={(e) => setEditingProcedureToggles(prev => ({ ...prev, [sub.id]: e.target.checked }))}
                              />
                              Show day counter
                            </label>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">{sub.procedure?.name}</span>
                              {sub.procedure?.showDayCounter && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {badgeText}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              {sub.procedure?.date ? new Date(sub.procedure.date).toLocaleDateString() : 'Date not set'}
                            </div>
                            {sub.procedure?.notes && (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">{sub.procedure.notes}</div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={sub.id} className="text-[13px] text-gray-600 flex items-start pl-1">
                      <span className="mr-2 flex-shrink-0 text-gray-400">•</span>
                      {isEditMode ? (
                        <input
                          className="flex-1 rounded-md border px-2 py-1 text-sm"
                          value={editingValues[`subpoint-${sub.id}`] || ''}
                          onChange={(e) => updateEditValue(`subpoint-${sub.id}`, e.target.value)}
                          placeholder="Subpoint text"
                        />
                      ) : (
                        <span>{sub.text}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {!isEditMode && activeSubpointIssueId === issue.id && (
                <div className="mt-2 space-y-2 rounded-md border border-gray-200 p-2 bg-gray-50">
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <span className="font-medium">Add as</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border text-[11px] ${ (subpointEntryType[issue.id] || 'note') === 'note' ? 'bg-white border-gray-300 text-gray-900' : 'bg-transparent border-transparent text-gray-600 hover:bg-white/70'}`}
                        onClick={() => setSubpointEntryType(prev => ({ ...prev, [issue.id]: 'note' }))}
                      >
                        Note
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border text-[11px] ${ (subpointEntryType[issue.id] || 'note') === 'procedure' ? 'bg-white border-gray-300 text-gray-900' : 'bg-transparent border-transparent text-gray-600 hover:bg-white/70'}`}
                        onClick={() => setSubpointEntryType(prev => ({ ...prev, [issue.id]: 'procedure' }))}
                      >
                        Procedure
                      </button>
                    </div>
                  </div>

                  {(subpointEntryType[issue.id] || 'note') === 'note' ? (
                    <input
                      className="w-full rounded-md border px-2 py-1 text-sm"
                      placeholder="Add subpoint"
                      value={subpointDrafts[issue.id] || ''}
                      onChange={(e) => setSubpointDrafts(prev => ({ ...prev, [issue.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          submitSubpoint(issue.id);
                        }
                        if (e.key === 'Escape') {
                          cancelSubpointEntry();
                        }
                      }}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          className="rounded-md border px-2 py-1 text-sm"
                          placeholder="Procedure name"
                          value={procedureDrafts[issue.id]?.name || ''}
                          onChange={(e) => setProcedureDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultProcedureDraft()), name: e.target.value } }))}
                        />
                        <input
                          type="date"
                          className="rounded-md border px-2 py-1 text-sm"
                          value={procedureDrafts[issue.id]?.date || ''}
                          onChange={(e) => setProcedureDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultProcedureDraft()), date: e.target.value } }))}
                        />
                        <input
                          className="sm:col-span-2 rounded-md border px-2 py-1 text-sm"
                          placeholder="Notes (optional)"
                          value={procedureDrafts[issue.id]?.notes || ''}
                          onChange={(e) => setProcedureDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultProcedureDraft()), notes: e.target.value } }))}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={procedureDrafts[issue.id]?.showDayCounter ?? true}
                            onChange={(e) => setProcedureDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultProcedureDraft()), showDayCounter: e.target.checked } }))}
                          />
                          Show day counter
                        </label>
                        <div className="flex items-center gap-1 text-xs">
                          <span>Checklist</span>
                          <select
                            className="rounded-md border px-1.5 py-1 text-xs"
                            value={procedureDrafts[issue.id]?.checklistKey || ''}
                            onChange={(e) => setProcedureDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultProcedureDraft()), checklistKey: (e.target.value as ProcedureChecklistKey) || '' } }))}
                          >
                            <option value="">None</option>
                            {PROCEDURE_CHECKLISTS.map(list => (
                              <option key={list.key} value={list.key}>{list.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      onClick={() => submitSubpoint(issue.id)}
                      disabled={
                        (subpointEntryType[issue.id] || 'note') === 'note'
                          ? !(subpointDrafts[issue.id] || '').trim()
                          : !((procedureDrafts[issue.id]?.name || '').trim() && (procedureDrafts[issue.id]?.date || ''))
                      }
                    >
                      Add
                    </Button>
                    <Button size="xs" variant="ghost" onClick={cancelSubpointEntry}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {sortedIssues.length === 0 && <p className="text-sm text-gray-500">No issues documented yet.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-blue-400 p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Investigations</h4>
          <div className="flex items-center gap-1">
            {!isInvestigationEditMode && (
              <button
                type="button"
                onClick={() => setShowInvestigationForm(v => !v)}
                className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                {showInvestigationForm ? 'Close' : 'Add'}
              </button>
            )}
            {isInvestigationEditMode ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={saveInvestigationEdits}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelInvestigationEdit}
                  className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startInvestigationEdit}
                className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {patient.investigations.map(inv => (
            <div key={inv.id} className="border border-gray-200 rounded-lg p-3">
              {isInvestigationEditMode ? (
                <div className="space-y-2">
                  <input
                    className="w-full rounded-md border px-2 py-1 text-sm font-medium text-gray-900"
                    value={investigationEdits[inv.id]?.name ?? inv.name}
                    onChange={(e) => setInvestigationEdits(prev => ({
                      ...prev,
                      [inv.id]: { ...(prev[inv.id] || { date: (inv.lastUpdatedAt || '').slice(0, 10) }), name: e.target.value }
                    }))}
                  />
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="whitespace-nowrap">Last updated</span>
                    <input
                      type="date"
                      className="rounded-md border px-2 py-1 text-sm"
                      value={investigationEdits[inv.id]?.date ?? (inv.lastUpdatedAt || '').slice(0, 10)}
                      onChange={(e) => setInvestigationEdits(prev => ({
                        ...prev,
                        [inv.id]: { ...(prev[inv.id] || { name: inv.name }), date: e.target.value }
                      }))}
                    />
                  </div>
                  <textarea
                    className="w-full rounded-md border px-2 py-2 text-sm"
                    placeholder="Notes / summary (optional)"
                    value={investigationEdits[inv.id]?.summary ?? (inv.summary || '')}
                    onChange={(e) => setInvestigationEdits(prev => ({
                      ...prev,
                      [inv.id]: { ...(prev[inv.id] || { name: inv.name, date: (inv.lastUpdatedAt || '').slice(0, 10) }), summary: e.target.value }
                    }))}
                    rows={inv.type === 'lab' ? 2 : 3}
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenInvestigationMenuId(prev => prev === inv.id ? null : inv.id)}
                    className="w-full flex items-center justify-between rounded-md px-2 py-1 -mx-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-left text-gray-900">{inv.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{new Date(inv.lastUpdatedAt).toLocaleDateString()}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openInvestigationMenuId === inv.id ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {inv.type === 'lab' ? (
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700">Trend: {computeLabTrendString(inv.labSeries || []) || '—'}</div>
                      {inv.summary && <div className="text-sm text-gray-700">{inv.summary}</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700">{inv.summary || 'No summary yet'}</div>
                  )}
                  {openInvestigationMenuId === inv.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => deleteInvestigation(inv.id)}
                        className="px-3 py-1 rounded-full border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {showInvestigationForm && (
            <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-2">
              <div className="text-xs uppercase text-gray-500">Add lab</div>
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded-md border px-2 py-1 text-sm" placeholder="Name" value={newLabName} onChange={(e) => setNewLabName(e.target.value)} />
                <input className="rounded-md border px-2 py-1 text-sm" placeholder="Value" value={newLabValue} onChange={(e) => setNewLabValue(e.target.value)} />
                <input type="date" className="rounded-md border px-2 py-1 text-sm" value={newLabDate} onChange={(e) => setNewLabDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={addLab}
                  disabled={!newLabName.trim() || !newLabValue.trim() || !newLabDate}
                  className="text-[10px] px-2 py-1 rounded text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Add lab
                </button>
              </div>
              <div className="text-xs uppercase text-gray-500 pt-2">Add imaging / procedure</div>
              <div className="flex flex-col gap-2">
                <input className="rounded-md border px-2 py-1 text-sm w-full" placeholder="Name (e.g., Echo)" value={newImagingName} onChange={(e) => setNewImagingName(e.target.value)} />
                <input className="rounded-md border px-2 py-1 text-sm w-full" placeholder="Summary" value={newImagingSummary} onChange={(e) => setNewImagingSummary(e.target.value)} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 whitespace-nowrap">Date</span>
                  <input
                    type="date"
                    className="rounded-md border px-2 py-1 text-sm w-full"
                    value={newImagingDate}
                    onChange={(e) => setNewImagingDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={addImaging}
                  disabled={!newImagingName.trim() || !newImagingSummary.trim() || !newImagingDate}
                  className="text-[10px] px-2 py-1 rounded text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Add summary
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-green-500 p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Tasks</h4>
          <button
            type="button"
            onClick={() => setShowTaskForm(v => !v)}
            className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            {showTaskForm ? 'Close' : 'Add'}
          </button>
        </div>
        {showTaskForm && (
          <div className="flex items-center gap-2 mb-3">
            <input className="rounded-md border px-2 py-2 text-sm flex-1" placeholder="Add task" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} />
            <Button size="xs" startIcon={Plus} onClick={addTask} disabled={!newTaskText.trim()}>Save</Button>
            <Button size="xs" variant="ghost" onClick={() => { setShowTaskForm(false); setNewTaskText(''); }}>Cancel</Button>
          </div>
        )}
        <div className="space-y-2">
          {openTasks.map(task => (
            <div key={task.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={false} onChange={() => toggleTask(task.id)} />
                <span className="text-gray-800">{task.text}</span>
              </div>
            </div>
          ))}
          {doneTasks.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowCompletedTasks(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 py-1"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showCompletedTasks ? 'rotate-0' : '-rotate-90'}`} />
                {doneTasks.length} completed {doneTasks.length === 1 ? 'task' : 'tasks'}
              </button>
              {showCompletedTasks && doneTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={true} onChange={() => toggleTask(task.id)} />
                    <span className="line-through text-gray-500">{task.text}</span>
                  </div>
                  <span className="text-xs text-gray-400">Done</span>
                </div>
              ))}
            </>
          )}
          {patient.tasks.length === 0 && <p className="text-sm text-gray-500">No tasks yet.</p>}
        </div>
      </div>

      <WardUpdateModal
        open={wardUpdateOpen}
        onClose={() => setWardUpdateOpen(false)}
        patient={patient}
      />
    </div>
  );
};
