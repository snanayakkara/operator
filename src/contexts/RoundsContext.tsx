import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  HudPatientState,
  RoundsPatient,
  WardUpdateDiff
} from '@/types/rounds.types';
import { buildHudPatientState, isoNow } from '@/utils/rounds';
import { RoundsStorageService } from '@/services/RoundsStorageService';
import {
  applyWardUpdateDiff,
  createEmptyPatient,
  mergeIntakeParserResult
} from '@/services/RoundsPatientService';
import { RoundsLLMService } from '@/services/RoundsLLMService';

type IntakeStatus = 'idle' | 'running' | 'error';

interface RoundsContextValue {
  patients: RoundsPatient[];
  loading: boolean;
  selectedPatientId: string | null;
  selectedPatient: RoundsPatient | null;
  hudState: HudPatientState | null;
  intakeParsing: Record<string, IntakeStatus>;
  activeWard: string;
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

  const [patients, setPatients] = useState<RoundsPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [intakeParsing, setIntakeParsing] = useState<Record<string, IntakeStatus>>({});
  const [lastWardSnapshots, setLastWardSnapshots] = useState<Record<string, RoundsPatient | null>>({});
  const [activeWard, setActiveWard] = useState<string>('1 South');

  // Load patients on mount
  useEffect(() => {
    let mounted = true;
    storage.loadPatients().then((loaded) => {
      if (mounted) {
        setPatients(loaded);
        setLoading(false);
        if (!selectedPatientId && loaded.length > 0) {
          setSelectedPatientId(loaded[0].id);
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
  }, [storage]);

  const persistPatients = useCallback((producer: (current: RoundsPatient[]) => RoundsPatient[]) => {
    setPatients(prev => {
      const next = producer(prev);
      storage.savePatients(next);
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
    const patient = createEmptyPatient(name, { intakeNoteText: scratchpad, site: ward || activeWard });
    await addPatient(patient);
    setSelectedPatientId(patient.id);

    if (scratchpad.trim()) {
      triggerIntakeParse(patient.id, scratchpad, patient);
    }

    return patient;
  }, [addPatient, triggerIntakeParse]);

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

  const refresh = useCallback(async () => {
    const fresh = await storage.loadPatients();
    setPatients(fresh);
  }, [storage]);

  const markDischarged = useCallback(async (id: string, status: 'active' | 'discharged') => {
    const timestamp = isoNow();
    persistPatients(prev => prev.map(p => p.id === id ? { ...p, status, lastUpdatedAt: timestamp } : p));
    if (status === 'discharged' && selectedPatientId === id) {
      setSelectedPatientId(null);
    }
  }, [persistPatients, selectedPatientId]);

  const deletePatient = useCallback(async (id: string) => {
    persistPatients(prev => prev.filter(p => p.id !== id));
    if (selectedPatientId === id) {
      setSelectedPatientId(null);
    }
  }, [persistPatients, selectedPatientId]);

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  const hudState: HudPatientState | null = useMemo(() => buildHudPatientState(selectedPatient), [selectedPatient]);

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
    setSelectedPatientId,
    addPatient,
    quickAddPatient,
    updatePatient,
    applyWardDiff,
    undoLastWardUpdate,
    refresh,
    markDischarged,
    addIntakeNote,
    setActiveWard,
    deletePatient
  };

  return (
    <RoundsContext.Provider value={value}>
      {children}
    </RoundsContext.Provider>
  );
};
