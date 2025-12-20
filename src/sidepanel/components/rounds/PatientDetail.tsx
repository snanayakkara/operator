import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Star, Phone, X, Copy, Check, MoreVertical, GripVertical, ChevronDown } from 'lucide-react';
import Button from '../buttons/Button';
import { useRounds } from '@/contexts/RoundsContext';
import { IssueSubpoint, RoundsPatient, Clinician, MessageTimeWindow } from '@/types/rounds.types';
import { computeDayCount, computeLabTrendString, generateRoundsId, isoNow, collectRecentPatientEvents, computeMessageWindowIso } from '@/utils/rounds';
import { WardUpdateModal } from './WardUpdateModal';
import { PROCEDURE_CHECKLISTS, ProcedureChecklistKey } from '@/config/procedureChecklists';
import { RoundsLLMService } from '@/services/RoundsLLMService';
import { NokExportService } from '@/services/NokExportService';
import { BillingSection } from './BillingSection';
import { DischargeChecklist } from './DischargeChecklist';

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

type AntibioticDraft = {
  name: string;
  startDate: string;
  stopDate: string;
  notes: string;
};

const defaultAntibioticDraft = (): AntibioticDraft => ({
  name: '',
  startDate: '',
  stopDate: '',
  notes: ''
});

// Helper to calculate stop date from start date + days
const calculateStopDate = (startDate: string, days: number): string => {
  if (!startDate) return '';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  // Days is total course length, so stop date is start + (days - 1)
  const stop = new Date(start);
  stop.setDate(stop.getDate() + days - 1);
  return stop.toISOString().split('T')[0];
};

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
  const [subpointEntryType, setSubpointEntryType] = useState<Record<string, 'note' | 'procedure' | 'antibiotic'>>({});
  const [procedureDrafts, setProcedureDrafts] = useState<Record<string, ProcedureDraft>>({});
  const [antibioticDrafts, setAntibioticDrafts] = useState<Record<string, AntibioticDraft>>({});
  const [editingProcedureToggles, setEditingProcedureToggles] = useState<Record<string, boolean>>({});
  const [dayCounterTick, setDayCounterTick] = useState(Date.now());
  const [openIssueMenuId, setOpenIssueMenuId] = useState<string | null>(null);
  const [draggingIssueId, setDraggingIssueId] = useState<string | null>(null);
  const [dragOverIssueId, setDragOverIssueId] = useState<string | null>(null);
  const [expandedResolvedIssueIds, setExpandedResolvedIssueIds] = useState<Set<string>>(new Set());
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
    setExpandedResolvedIssueIds(new Set());
  }, [patient.id]);

  useEffect(() => {
    if (!openIssueMenuId) return;
    const handler = (event: MouseEvent) => {
      const root = document.querySelector(`[data-issue-menu-root="${openIssueMenuId}"]`);
      if (root && root.contains(event.target as Node)) return;
      setOpenIssueMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openIssueMenuId]);

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
    let normalized: IssueSubpoint;
    
    if (subpoint.type === 'procedure') {
      normalized = {
        ...subpoint,
        id: subpoint.id || generateRoundsId('sub'),
        timestamp: subpoint.timestamp || timestamp,
        type: 'procedure',
        procedure: {
          ...subpoint.procedure,
          showDayCounter: subpoint.procedure?.showDayCounter ?? false
        }
      };
    } else if (subpoint.type === 'antibiotic') {
      normalized = {
        ...subpoint,
        id: subpoint.id || generateRoundsId('sub'),
        timestamp: subpoint.timestamp || timestamp,
        type: 'antibiotic',
        antibiotic: {
          ...subpoint.antibiotic
        }
      };
    } else {
      normalized = {
        ...subpoint,
        id: subpoint.id || generateRoundsId('sub'),
        timestamp: subpoint.timestamp || timestamp,
        type: 'note',
        text: subpoint.text || ''
      };
    }

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
    setAntibioticDrafts(prev => ({ ...prev, [issueId]: prev[issueId] || defaultAntibioticDraft() }));
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
    } else if (type === 'antibiotic') {
      const abx = antibioticDrafts[issueId] || defaultAntibioticDraft();
      if (!abx.name.trim() || !abx.startDate) return;
      addSubpoint(issueId, {
        id: generateRoundsId('sub'),
        timestamp: isoNow(),
        type: 'antibiotic',
        antibiotic: {
          name: abx.name.trim(),
          startDate: abx.startDate,
          stopDate: abx.stopDate || undefined,
          notes: abx.notes.trim() || undefined
        }
      });
      setAntibioticDrafts(prev => ({ ...prev, [issueId]: defaultAntibioticDraft() }));
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
        } else if (sub.type === 'antibiotic') {
          values[`subpoint-abx-name-${sub.id}`] = sub.antibiotic?.name || '';
          values[`subpoint-abx-date-${sub.id}`] = sub.antibiotic?.startDate || '';
          values[`subpoint-abx-stop-${sub.id}`] = sub.antibiotic?.stopDate || '';
          values[`subpoint-abx-notes-${sub.id}`] = sub.antibiotic?.notes || '';
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

          if (sub.type === 'antibiotic') {
            const nextName = editingValues[`subpoint-abx-name-${sub.id}`] !== undefined
              ? editingValues[`subpoint-abx-name-${sub.id}`]?.trim() || ''
              : sub.antibiotic?.name || '';
            const nextDate = editingValues[`subpoint-abx-date-${sub.id}`] ?? sub.antibiotic?.startDate ?? '';
            const nextStopDate = editingValues[`subpoint-abx-stop-${sub.id}`] ?? sub.antibiotic?.stopDate ?? '';
            const nextNotes = editingValues[`subpoint-abx-notes-${sub.id}`] !== undefined
              ? editingValues[`subpoint-abx-notes-${sub.id}`]?.trim() || ''
              : sub.antibiotic?.notes || '';

            // If the antibiotic name is cleared, treat as deletion
            if (!nextName) {
              return acc;
            }

            acc.push({
              ...sub,
              type: 'antibiotic',
              antibiotic: {
                ...sub.antibiotic,
                name: nextName,
                startDate: nextDate,
                stopDate: nextStopDate || undefined,
                notes: nextNotes
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

  const reorderIssuesWithinStatus = (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const dragged = patient.issues.find(i => i.id === dragId);
    const target = patient.issues.find(i => i.id === targetId);
    if (!dragged || !target) return;
    if (dragged.status !== target.status) return; // only reorder within open/resolved bucket

    const timestamp = isoNow();
    updatePatient(patient.id, (p) => {
      const open = p.issues.filter(i => i.status === 'open');
      const resolved = p.issues.filter(i => i.status === 'resolved');
      const group = dragged.status === 'open' ? open : resolved;
      const fromIndex = group.findIndex(i => i.id === dragId);
      const toIndex = group.findIndex(i => i.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return p;
      const nextGroup = [...group];
      const [moved] = nextGroup.splice(fromIndex, 1);
      nextGroup.splice(toIndex, 0, moved);

      return {
        ...p,
        issues: dragged.status === 'open' ? [...nextGroup, ...resolved] : [...open, ...nextGroup],
        lastUpdatedAt: timestamp
      };
    });
  };

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

      <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="px-3 sm:px-4 py-3 bg-amber-50/60 border-b border-amber-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Issues</h4>
              <span className="text-[11px] text-amber-900/70">{sortedIssues.length}</span>
            </div>
            <div className="flex items-center gap-1">
              {isEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={saveEdits}
                    className="text-[10px] px-2 py-1 rounded bg-white/70 text-amber-900 hover:bg-white transition-colors border border-amber-200"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdits}
                    className="text-[10px] px-2 py-1 rounded text-amber-900/80 hover:bg-white/70 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowIssueForm(v => !v)}
                    className="text-[10px] px-2 py-1 rounded text-amber-900/80 hover:bg-white/70 transition-colors flex items-center gap-1 border border-transparent hover:border-amber-200"
                  >
                    <Plus className="w-3 h-3" />
                    {showIssueForm ? 'Close' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={enterEditMode}
                    className="text-[10px] px-2 py-1 rounded text-amber-900/80 hover:bg-white/70 transition-colors border border-transparent hover:border-amber-200"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>

          {showIssueForm && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="rounded-md border px-2 py-2 text-sm w-full bg-white"
                placeholder="Issue title"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
              />
              <input
                className="rounded-md border px-2 py-2 text-sm w-full bg-white"
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

        <div className="p-3 sm:p-4 space-y-3">
          {sortedIssues.map((issue, idx) => {
            const isDragging = draggingIssueId === issue.id;
            const isDragOver = dragOverIssueId === issue.id && draggingIssueId && draggingIssueId !== issue.id;
            const isResolved = issue.status === 'resolved';
            const canDrag = !isEditMode;
            const resolvedExpanded = expandedResolvedIssueIds.has(issue.id);
            const shouldShowSubpoints = isEditMode || !isResolved || resolvedExpanded;

            return (
              <div
                key={issue.id}
                className={`relative rounded-lg border bg-white p-3 shadow-sm transition ${
                  isResolved ? 'border-gray-200 opacity-75' : 'border-gray-200'
                } ${isDragOver ? 'ring-2 ring-amber-200' : ''} ${isDragging ? 'opacity-50' : ''}`}
                onDragOver={(e) => {
                  if (!canDrag || !draggingIssueId) return;
                  e.preventDefault();
                  setDragOverIssueId(issue.id);
                }}
                onDragLeave={() => {
                  if (dragOverIssueId === issue.id) setDragOverIssueId(null);
                }}
                onDrop={(e) => {
                  if (!canDrag || !draggingIssueId) return;
                  e.preventDefault();
                  reorderIssuesWithinStatus(draggingIssueId, issue.id);
                  setDraggingIssueId(null);
                  setDragOverIssueId(null);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                          isResolved ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-800'
                        }`}
                        title={`Issue ${idx + 1}`}
                      >
                        {idx + 1}
                      </span>
                      {!isEditMode && (
                        <span
                          draggable={canDrag}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggingIssueId(issue.id);
                            try {
                              e.dataTransfer.setData('text/plain', issue.id);
                            } catch {
                              // ignore
                            }
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggingIssueId(null);
                            setDragOverIssueId(null);
                          }}
                          className="text-gray-300 hover:text-gray-500 cursor-grab"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      {isEditMode ? (
                        <input
                          className="w-full rounded-md border px-2 py-1.5 text-sm font-semibold"
                          value={editingValues[`issue-${issue.id}`] || ''}
                          onChange={(e) => updateEditValue(`issue-${issue.id}`, e.target.value)}
                          placeholder="Issue title"
                        />
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`text-sm font-semibold break-words ${isResolved ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {issue.title}
                          </div>
                          {issue.pinToHud && <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                        </div>
                      )}
                      {!isEditMode && isResolved && (
                        <div className="mt-0.5 flex items-center gap-2">
                          <div className="text-[11px] text-gray-400">Resolved</div>
                          {issue.subpoints.length > 0 && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedResolvedIssueIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(issue.id)) next.delete(issue.id);
                                  else next.add(issue.id);
                                  return next;
                                });
                              }}
                            >
                              {resolvedExpanded ? 'Hide notes' : `Show notes (${issue.subpoints.length})`}
                              <ChevronDown className={`w-3 h-3 transition-transform ${resolvedExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isEditMode && (
                    <div className="relative" data-issue-menu-root={issue.id}>
                      <button
                        type="button"
                        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenIssueMenuId(prev => (prev === issue.id ? null : issue.id));
                        }}
                        title="Issue actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openIssueMenuId === issue.id && (
                        <div className={`absolute right-0 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden ${
                          idx >= sortedIssues.length - 1 ? 'bottom-full mb-1' : 'mt-1'
                        }`}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => {
                              setOpenIssueMenuId(null);
                              startSubpointEntry(issue.id);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-600" />
                            Add detail
                          </button>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => {
                              setOpenIssueMenuId(null);
                              toggleIssueStatus(issue.id);
                            }}
                          >
                            <span className={`w-2 h-2 rounded-full ${issue.status === 'open' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            {issue.status === 'open' ? 'Mark resolved' : 'Mark open'}
                          </button>
                          <div className="border-t border-gray-100" />
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-xs text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                            onClick={() => {
                              setOpenIssueMenuId(null);
                              deleteIssue(issue.id);
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {shouldShowSubpoints && (issue.subpoints.length > 0) && (
                  <div className="mt-2 space-y-2">
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
                              {sub.procedure?.date ? new Date(sub.procedure.date).toLocaleDateString('en-AU') : 'Date not set'}
                            </div>
                            {sub.procedure?.notes && (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">{sub.procedure.notes}</div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }

                  const isAntibiotic = sub.type === 'antibiotic' && sub.antibiotic;
                  if (isAntibiotic) {
                    const dayCount = computeDayCount(sub.antibiotic?.startDate || '');
                    // For antibiotics, Day 1 is the first day (add 1 to make 0 -> 1)
                    const currentDay = dayCount !== null ? dayCount + 1 : null;
                    
                    // Check if today is the stop date (final day)
                    const stopDayCount = sub.antibiotic?.stopDate ? computeDayCount(sub.antibiotic.stopDate) : null;
                    const isFinalDay = stopDayCount === 0;
                    const isPastStopDate = stopDayCount !== null && stopDayCount > 0;
                    
                    let badgeText: string;
                    let badgeClass = 'bg-emerald-100 text-emerald-700';
                    
                    if (currentDay === null) {
                      badgeText = 'No date';
                    } else if (dayCount !== null && dayCount < 0) {
                      badgeText = 'Upcoming';
                    } else if (isFinalDay) {
                      badgeText = `Day ${currentDay} — FINAL DAY`;
                      badgeClass = 'bg-amber-100 text-amber-800 font-semibold';
                    } else if (isPastStopDate) {
                      badgeText = `Day ${currentDay} — Course ended`;
                      badgeClass = 'bg-gray-100 text-gray-600';
                    } else {
                      badgeText = `Day ${currentDay}`;
                    }
                    
                    return (
                      <div key={sub.id} className={`text-sm text-gray-800 flex flex-col gap-1 border rounded-md p-2 ${isFinalDay ? 'border-amber-200 bg-amber-50' : isPastStopDate ? 'border-gray-200 bg-gray-50' : 'border-emerald-100 bg-emerald-50'}`}>
                        {isEditMode ? (
                          <>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                className="flex-1 rounded-md border px-2 py-1 text-sm"
                                value={editingValues[`subpoint-abx-name-${sub.id}`] || ''}
                                onChange={(e) => updateEditValue(`subpoint-abx-name-${sub.id}`, e.target.value)}
                                placeholder="Antibiotic name"
                              />
                              <input
                                type="date"
                                className="rounded-md border px-2 py-1 text-sm"
                                value={editingValues[`subpoint-abx-date-${sub.id}`] || ''}
                                onChange={(e) => updateEditValue(`subpoint-abx-date-${sub.id}`, e.target.value)}
                                title="Start date"
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                              <label className="text-xs text-gray-600 flex items-center gap-1">
                                Stop date:
                                <input
                                  type="date"
                                  className="rounded-md border px-2 py-1 text-sm"
                                  value={editingValues[`subpoint-abx-stop-${sub.id}`] || ''}
                                  onChange={(e) => updateEditValue(`subpoint-abx-stop-${sub.id}`, e.target.value)}
                                />
                              </label>
                              {editingValues[`subpoint-abx-stop-${sub.id}`] && (
                                <button
                                  type="button"
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                  onClick={() => updateEditValue(`subpoint-abx-stop-${sub.id}`, '')}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <input
                              className="rounded-md border px-2 py-1 text-sm"
                              value={editingValues[`subpoint-abx-notes-${sub.id}`] || ''}
                              onChange={(e) => updateEditValue(`subpoint-abx-notes-${sub.id}`, e.target.value)}
                              placeholder="Notes (optional)"
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">💊 {sub.antibiotic?.name}</span>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full ${badgeClass}`}>
                                {badgeText}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              Started {sub.antibiotic?.startDate ? new Date(sub.antibiotic.startDate).toLocaleDateString('en-AU') : 'Date not set'}
                              {sub.antibiotic?.stopDate && (
                                <span> · Ends {new Date(sub.antibiotic.stopDate).toLocaleDateString('en-AU')}</span>
                              )}
                            </div>
                            {sub.antibiotic?.notes && (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">{sub.antibiotic.notes}</div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={sub.id} className="text-[13px] text-gray-600 flex items-start">
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
                )}

                {!isEditMode && issue.subpoints.length === 0 && activeSubpointIssueId !== issue.id && (
                  <div className="mt-2 text-xs text-gray-400">No notes yet.</div>
                )}

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
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border text-[11px] ${ (subpointEntryType[issue.id] || 'note') === 'antibiotic' ? 'bg-white border-gray-300 text-gray-900' : 'bg-transparent border-transparent text-gray-600 hover:bg-white/70'}`}
                        onClick={() => setSubpointEntryType(prev => ({ ...prev, [issue.id]: 'antibiotic' }))}
                      >
                        Antibiotic
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
                  ) : (subpointEntryType[issue.id] || 'note') === 'antibiotic' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          className="rounded-md border px-2 py-1 text-sm"
                          placeholder="Antibiotic name"
                          value={antibioticDrafts[issue.id]?.name || ''}
                          onChange={(e) => setAntibioticDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultAntibioticDraft()), name: e.target.value } }))}
                        />
                        <input
                          type="date"
                          className="rounded-md border px-2 py-1 text-sm"
                          value={antibioticDrafts[issue.id]?.startDate || ''}
                          onChange={(e) => setAntibioticDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultAntibioticDraft()), startDate: e.target.value } }))}
                        />
                        <input
                          className="sm:col-span-2 rounded-md border px-2 py-1 text-sm"
                          placeholder="Notes (optional)"
                          value={antibioticDrafts[issue.id]?.notes || ''}
                          onChange={(e) => setAntibioticDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultAntibioticDraft()), notes: e.target.value } }))}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-700">
                        <span>Course:</span>
                        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                          {[3, 5, 7].map((days, idx) => {
                            const isSelected = antibioticDrafts[issue.id]?.stopDate === calculateStopDate(antibioticDrafts[issue.id]?.startDate || '', days);
                            return (
                              <button
                                key={days}
                                type="button"
                                className={`px-3 py-1 text-[11px] transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-100 text-emerald-800 font-medium'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                } ${idx > 0 ? 'border-l border-gray-300' : ''} disabled:opacity-50`}
                                onClick={() => {
                                  const startDate = antibioticDrafts[issue.id]?.startDate || '';
                                  if (startDate) {
                                    setAntibioticDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultAntibioticDraft()), stopDate: calculateStopDate(startDate, days) } }));
                                  }
                                }}
                                disabled={!antibioticDrafts[issue.id]?.startDate}
                              >
                                {days}d
                              </button>
                            );
                          })}
                        </div>
                        {antibioticDrafts[issue.id]?.stopDate && (
                          <>
                            <span className="text-emerald-600">
                              → {new Date(antibioticDrafts[issue.id].stopDate).toLocaleDateString('en-AU')}
                            </span>
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => setAntibioticDrafts(prev => ({ ...prev, [issue.id]: { ...(prev[issue.id] || defaultAntibioticDraft()), stopDate: '' } }))}
                              title="Clear stop date"
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Day 1 starts on the date entered (first dose date)
                      </div>
                    </div>
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
                          : (subpointEntryType[issue.id] || 'note') === 'antibiotic'
                            ? !((antibioticDrafts[issue.id]?.name || '').trim() && (antibioticDrafts[issue.id]?.startDate || ''))
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
            );
          })}
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
                      <span>{new Date(inv.lastUpdatedAt).toLocaleDateString('en-AU')}</span>
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

      {/* Billing Section */}
      <BillingSection patient={patient} />

      {/* Admission & Discharge Checklist */}
      <DischargeChecklist patient={patient} />

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
