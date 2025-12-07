import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clinician,
  HudPatientState,
  RoundsPatient,
  WardUpdateDiff
} from '@/types/rounds.types';
import {
  WardConversationMode,
  WardConversationSession,
  WardConversationTurnResult
} from '@/types/wardConversation.types';
import { buildHudPatientState, isoNow } from '@/utils/rounds';
import { RoundsStorageService } from '@/services/RoundsStorageService';
import {
  applyWardUpdateDiff,
  createEmptyPatient,
  mergeIntakeParserResult
} from '@/services/RoundsPatientService';
import { RoundsLLMService } from '@/services/RoundsLLMService';
import { WardConversationService } from '@/services/WardConversationService';

type IntakeStatus = 'idle' | 'running' | 'error';

interface RoundsContextValue {
  patients: RoundsPatient[];
  loading: boolean;
  selectedPatientId: string | null;
  selectedPatient: RoundsPatient | null;
  hudState: HudPatientState | null;
  intakeParsing: Record<string, IntakeStatus>;
  activeWard: string;
  isPatientListCollapsed: boolean;
  clinicians: Clinician[];
  setSelectedPatientId: (id: string | null) => void;
  addPatient: (patient: RoundsPatient) => Promise<void>;
  quickAddPatient: (name: string, scratchpad: string, ward?: string) => Promise<RoundsPatient | null>;
  updatePatient: (id: string, updater: (patient: RoundsPatient) => RoundsPatient) => Promise<void>;
  applyWardDiff: (id: string, diff: WardUpdateDiff, transcript: string) => Promise<void>;
  undoLastWardUpdate: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  markDischarged: (id: string, status: 'active' | 'discharged') => Promise<void>;
  addIntakeNote: (id: string, text: string) => Promise<void>;
  setActiveWard: (ward: string) => void;
  deletePatient: (id: string) => Promise<void>;
  togglePatientList: () => void;
  navigateToPatient: (direction: 'prev' | 'next') => void;
  addClinician: (clinician: Clinician) => Promise<void>;
  updateClinician: (id: string, updates: Partial<Clinician>) => Promise<void>;
  removeClinician: (id: string) => Promise<void>;
  assignClinicianToPatient: (patientId: string, clinicianId: string) => Promise<void>;
  unassignClinicianFromPatient: (patientId: string, clinicianId: string) => Promise<void>;
  startWardConversation: (patientId: string, mode?: WardConversationMode, userInput?: string | null) => Promise<{ session: WardConversationSession; turn: WardConversationTurnResult; }>;
  continueWardConversation: (sessionId: string, userInput: string) => Promise<WardConversationTurnResult>;
  applyWardConversation: (sessionId: string, transcript?: string) => Promise<void>;
  discardWardConversation: (sessionId: string) => void;
  runWardDictation: (patientId: string, text: string, sessionId?: string) => Promise<{ session: WardConversationSession; turn: WardConversationTurnResult; }>;
  getWardConversationSession: (sessionId: string) => WardConversationSession | undefined;
}

const RoundsContext = createContext<RoundsContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useRounds = (): RoundsContextValue => {
  const ctx = useContext(RoundsContext);
  if (!ctx) {
    throw new Error('useRounds must be used within RoundsProvider');
  }
  return ctx;
};

export const RoundsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storage = useMemo(() => RoundsStorageService.getInstance(), []);
  const llm = useMemo(() => RoundsLLMService.getInstance(), []);
  const wardConversation = useMemo(() => WardConversationService.getInstance(), []);

  const [patients, setPatients] = useState<RoundsPatient[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [intakeParsing, setIntakeParsing] = useState<Record<string, IntakeStatus>>({});
  const [lastWardSnapshots, setLastWardSnapshots] = useState<Record<string, RoundsPatient | null>>({});
  const [activeWard, setActiveWard] = useState<string>('1 South');
  const [isPatientListCollapsed, setIsPatientListCollapsed] = useState(false);
  const quickAddInProgressRef = useRef(false);

  // Load patients and clinicians on mount
  useEffect(() => {
    let mounted = true;
    Promise.all([
      storage.loadPatients(),
      storage.loadClinicians()
    ]).then(([loadedPatients, loadedClinicians]) => {
      if (mounted) {
        setPatients(loadedPatients);
        setClinicians(loadedClinicians);
        setLoading(false);
        if (!selectedPatientId && loadedPatients.length > 0) {
          setSelectedPatientId(loadedPatients[0].id);
        }
      }
    });

    const unsubscribe = storage.subscribe(next => {
      setPatients(next);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [storage, selectedPatientId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      // Skip polling if Quick Add is in progress
      if (quickAddInProgressRef.current) {
        console.log('[RoundsContext] Skipping backend poll - Quick Add in progress');
        return;
      }

      const remote = await storage.loadPatientsFromBackend();
      if (!selectedPatientId && remote && remote.length > 0) {
        setSelectedPatientId(remote[0].id);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedPatientId, storage]);

  const persistPatients = useCallback((producer: (current: RoundsPatient[]) => RoundsPatient[]) => {
    setPatients(prev => {
      const next = producer(prev);
      storage.savePatients(next);
      return next;
    });
  }, [storage]);

  const persistClinicians = useCallback((producer: (current: Clinician[]) => Clinician[]) => {
    setClinicians(prev => {
      const next = producer(prev);
      storage.saveClinicians(next);
      return next;
    });
  }, [storage]);

  const addPatient = useCallback(async (patient: RoundsPatient) => {
    persistPatients(prev => [...prev, patient]);
    if (!selectedPatientId) {
      setSelectedPatientId(patient.id);
    }
  }, [persistPatients, selectedPatientId]);

  const addIntakeNote = useCallback(async (id: string, text: string) => {
    const timestamp = isoNow();
    persistPatients(prev => prev.map(p => p.id === id ? {
      ...p,
      intakeNotes: [...p.intakeNotes, { id: `intake-${timestamp}`, timestamp, text }],
      lastUpdatedAt: timestamp
    } : p));
  }, [persistPatients]);

  const triggerIntakeParse = useCallback(async (patientId: string, scratchpad: string, patientSnapshot: RoundsPatient) => {
    setIntakeParsing(prev => ({ ...prev, [patientId]: 'running' }));
    try {
      const parsed = await llm.parseIntake(scratchpad, patientSnapshot);
      persistPatients(prev => prev.map(p => p.id === patientId ? mergeIntakeParserResult(p, parsed) : p));
      setIntakeParsing(prev => ({ ...prev, [patientId]: 'idle' }));
    } catch (error) {
      console.error('Intake parser failed', error);
      setIntakeParsing(prev => ({ ...prev, [patientId]: 'error' }));
    }
  }, [llm, persistPatients]);

  const quickAddPatient = useCallback(async (name: string, scratchpad: string, ward?: string): Promise<RoundsPatient | null> => {
    quickAddInProgressRef.current = true; // Block polling
    try {
      const payloadWard = ward || activeWard;
      const backendPatient = await storage.quickAddPatient({ name, scratchpad, ward: payloadWard });
      // Backend success already updates storage + notifies subscribers; avoid double-add
      if (backendPatient) {
        setSelectedPatientId(backendPatient.id);
        if (scratchpad.trim()) {
          triggerIntakeParse(backendPatient.id, scratchpad, backendPatient);
        }
        return backendPatient;
      }

      const patient = createEmptyPatient(name, { intakeNoteText: scratchpad, site: payloadWard });
      await addPatient(patient);
      setSelectedPatientId(patient.id);

      if (scratchpad.trim()) {
        triggerIntakeParse(patient.id, scratchpad, patient);
      }

      return patient;
    } finally {
      // Always resume polling after Quick Add completes/fails
      quickAddInProgressRef.current = false;
    }
  }, [activeWard, addPatient, storage, triggerIntakeParse]);

  const updatePatient = useCallback(async (id: string, updater: (patient: RoundsPatient) => RoundsPatient) => {
    persistPatients(prev => prev.map(p => p.id === id ? updater(p) : p));
  }, [persistPatients]);

  const applyWardDiff = useCallback(async (id: string, diff: WardUpdateDiff, transcript: string) => {
    persistPatients(prev => {
      const target = prev.find(p => p.id === id);
      if (target) {
        const snapshot = JSON.parse(JSON.stringify(target)) as RoundsPatient;
        setLastWardSnapshots(current => ({ ...current, [id]: snapshot }));
      }
      return prev.map(p => (p.id === id ? applyWardUpdateDiff(p, diff, transcript).patient : p));
    });
  }, [persistPatients]);

  const undoLastWardUpdate = useCallback(async (id: string) => {
    const snapshot = lastWardSnapshots[id];
    if (!snapshot) return;
    persistPatients(prev => prev.map(p => p.id === id ? snapshot : p));
    setLastWardSnapshots(current => ({ ...current, [id]: null }));
  }, [lastWardSnapshots, persistPatients]);

  const startWardConversation = useCallback(async (
    patientId: string,
    mode: WardConversationMode = 'ward_round',
    userInput?: string | null
  ) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      throw new Error(`Patient ${patientId} not found for ward conversation`);
    }
    return wardConversation.startSession(patient, mode, userInput ?? null);
  }, [patients, wardConversation]);

  const continueWardConversation = useCallback(async (
    sessionId: string,
    userInput: string
  ) => {
    const session = wardConversation.getSession(sessionId);
    if (!session) {
      throw new Error(`Ward conversation session ${sessionId} not found`);
    }
    const patient = patients.find(p => p.id === session.patientId);
    if (!patient) {
      throw new Error(`Patient ${session.patientId} not found for ward conversation`);
    }
    return wardConversation.continueSession(sessionId, patient, userInput);
  }, [patients, wardConversation]);

  const runWardDictation = useCallback(async (
    patientId: string,
    text: string,
    sessionId?: string
  ) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      throw new Error(`Patient ${patientId} not found for ward dictation`);
    }
    return wardConversation.runDictation(patient, text, sessionId);
  }, [patients, wardConversation]);

  const applyWardConversation = useCallback(async (sessionId: string, transcript?: string) => {
    const session = wardConversation.getSession(sessionId);
    if (!session) {
      throw new Error(`Ward conversation session ${sessionId} not found`);
    }
    const conversationTranscript = transcript || session.humanSummary.join(' | ') || session.lastAssistantMessage || 'Ward conversation update';
    await applyWardDiff(session.patientId, session.pendingDiff, conversationTranscript);
    wardConversation.discardSession(sessionId);
  }, [applyWardDiff, wardConversation]);

  const discardWardConversation = useCallback((sessionId: string) => {
    wardConversation.discardSession(sessionId);
  }, [wardConversation]);

  const getWardConversationSession = useCallback((sessionId: string) => wardConversation.getSession(sessionId), [wardConversation]);

  const refresh = useCallback(async () => {
    const fresh = await storage.loadPatients();
    setPatients(fresh);
  }, [storage]);

  const markDischarged = useCallback(async (id: string, status: 'active' | 'discharged') => {
    const timestamp = isoNow();
    console.log(`[RoundsContext] markDischarged: ${id} -> ${status}`);
    persistPatients(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status, lastUpdatedAt: timestamp } : p);
      console.log(`[RoundsContext] After markDischarged - Total: ${updated.length}, Active: ${updated.filter(p => p.status === 'active').length}, Discharged: ${updated.filter(p => p.status === 'discharged').length}`);
      return updated;
    });
    if (status === 'discharged' && selectedPatientId === id) {
      setSelectedPatientId(null);
      setIsPatientListCollapsed(false);
    }
  }, [persistPatients, selectedPatientId]);

  const deletePatient = useCallback(async (id: string) => {
    console.log(`[RoundsContext] deletePatient: ${id}`);
    persistPatients(prev => {
      const filtered = prev.filter(p => p.id !== id);
      console.log(`[RoundsContext] After deletePatient - Remaining: ${filtered.length}`);
      return filtered;
    });
    if (selectedPatientId === id) {
      setSelectedPatientId(null);
      setIsPatientListCollapsed(false);
    }
  }, [persistPatients, selectedPatientId]);

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  const hudState: HudPatientState | null = useMemo(() => buildHudPatientState(selectedPatient), [selectedPatient]);

  // Toggle patient list collapse state
  const togglePatientList = useCallback(() => {
    setIsPatientListCollapsed(prev => !prev);
  }, []);

  // Navigate to previous or next active patient
  const navigateToPatient = useCallback((direction: 'prev' | 'next') => {
    const activePatients = patients
      .filter(p => p.status === 'active')
      .sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));
    if (activePatients.length === 0) return;

    const currentIndex = selectedPatientId
      ? activePatients.findIndex(p => p.id === selectedPatientId)
      : -1;

    let nextIndex: number;
    if (currentIndex === -1) {
      // No selection or invalid selection - go to first
      nextIndex = 0;
    } else if (direction === 'next') {
      // Wrap around: last -> first
      nextIndex = (currentIndex + 1) % activePatients.length;
    } else {
      // Wrap around: first -> last
      nextIndex = currentIndex === 0 ? activePatients.length - 1 : currentIndex - 1;
    }

    setSelectedPatientId(activePatients[nextIndex].id);
  }, [patients, selectedPatientId]);

  // Clinician management functions
  const addClinician = useCallback(async (clinician: Clinician) => {
    persistClinicians(prev => [...prev, clinician]);
  }, [persistClinicians]);

  const updateClinician = useCallback(async (id: string, updates: Partial<Clinician>) => {
    const timestamp = isoNow();
    persistClinicians(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, lastUpdatedAt: timestamp } : c
    ));
  }, [persistClinicians]);

  const removeClinician = useCallback(async (id: string) => {
    // Remove clinician from the list
    persistClinicians(prev => prev.filter(c => c.id !== id));

    // Remove this clinician ID from all patients
    persistPatients(prev => prev.map(p => ({
      ...p,
      clinicianIds: p.clinicianIds?.filter(cid => cid !== id),
      lastUpdatedAt: isoNow()
    })));
  }, [persistClinicians, persistPatients]);

  const assignClinicianToPatient = useCallback(async (patientId: string, clinicianId: string) => {
    const timestamp = isoNow();
    persistPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const currentIds = p.clinicianIds || [];
        // Only add if not already present
        if (currentIds.includes(clinicianId)) {
          return p;
        }
        return {
          ...p,
          clinicianIds: [...currentIds, clinicianId],
          lastUpdatedAt: timestamp
        };
      }
      return p;
    }));
  }, [persistPatients]);

  const unassignClinicianFromPatient = useCallback(async (patientId: string, clinicianId: string) => {
    const timestamp = isoNow();
    persistPatients(prev => prev.map(p =>
      p.id === patientId
        ? {
            ...p,
            clinicianIds: (p.clinicianIds || []).filter(cid => cid !== clinicianId),
            lastUpdatedAt: timestamp
          }
        : p
    ));
  }, [persistPatients]);

  // Persist HUD projection for external consumers (e.g., smart glasses bridge)
  useEffect(() => {
    const persistHud = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          await chrome.storage.local.set({ rounds_hud_state: hudState });
        } else {
          localStorage.setItem('rounds_hud_state', JSON.stringify(hudState));
        }
      } catch (error) {
        console.warn('⚠️ Failed to persist HUD state', error);
      }
    };
    persistHud();
  }, [hudState]);

  const value: RoundsContextValue = {
    patients,
    loading,
    selectedPatientId,
    selectedPatient,
    hudState,
    intakeParsing,
    activeWard,
    isPatientListCollapsed,
    clinicians,
    setSelectedPatientId,
    addPatient,
    quickAddPatient,
    updatePatient,
    applyWardDiff,
    undoLastWardUpdate,
    startWardConversation,
    continueWardConversation,
    applyWardConversation,
    discardWardConversation,
    runWardDictation,
    getWardConversationSession,
    refresh,
    markDischarged,
    addIntakeNote,
    setActiveWard,
    deletePatient,
    togglePatientList,
    navigateToPatient,
    addClinician,
    updateClinician,
    removeClinician,
    assignClinicianToPatient,
    unassignClinicianFromPatient
  };

  return (
    <RoundsContext.Provider value={value}>
      {children}
    </RoundsContext.Provider>
  );
};
