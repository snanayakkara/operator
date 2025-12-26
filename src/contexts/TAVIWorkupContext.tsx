/**
 * TAVI Workup Context
 *
 * React Context for managing TAVI workup state across the application.
 * Pattern mirrors RoundsContext with producer functions for immutable updates.
 *
 * Responsibilities:
 * - Load/save workups via TAVIWorkupStorageService
 * - Manage selected workup state
 * - Subscribe to storage changes for real-time updates
 * - Provide CRUD operations via context hooks
 *
 * Future phases will add:
 * - Notion sync (Phase 2)
 * - EMR auto-extraction (Phase 3)
 * - Incremental dictation (Phase 4)
 * - Full workup generation (Phase 5)
 * - Presentation mode (Phase 6)
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode, useRef } from 'react';
import type { TAVIWorkupItem, NotionTAVIPatient, NotionWorkupFields, NotionSyncConflict } from '@/types/taviWorkup.types';
import { createEmptyStructuredSections, calculateCompletion } from '@/types/taviWorkup.types';
import { TAVIWorkupStorageService } from '@/services/TAVIWorkupStorageService';
import { NotionStructuralWorkupService } from '@/services/NotionStructuralWorkupService';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';
import { NOTION_CONFIG_KEY } from '@/config/notionConfig';

// === CONTEXT INTERFACE ===

interface TAVIWorkupContextValue {
  // === STATE ===
  workups: TAVIWorkupItem[];
  loading: boolean;
  selectedWorkupId: string | null;
  selectedWorkup: TAVIWorkupItem | null;

  // === NOTION (Phase 2) ===
  notionAvailable: boolean;
  notionPatients: NotionTAVIPatient[];

  // === CRUD OPERATIONS ===
  setSelectedWorkupId: (id: string | null) => void;
  createWorkup: (notionPatient?: NotionTAVIPatient) => Promise<TAVIWorkupItem>;
  updateWorkup: (id: string, updater: (w: TAVIWorkupItem) => TAVIWorkupItem, options?: UpdateWorkupOptions) => Promise<void>;
  deleteWorkup: (id: string) => Promise<void>;

  // === DICTATION (Phase 4 & 5) ===
  generateFullWorkup: (dictation: string) => Promise<TAVIWorkupItem>; // Phase 5
  appendToSection: (workupId: string, section: string, dictation: string) => Promise<void>; // Phase 4

  // === NOTION SYNC (Phase 2) ===
  refreshNotionList: () => Promise<void>;
  retryNotionSync: (workupId: string) => Promise<void>;
  resolveNotionConflict: (workupId: string, resolution: 'local' | 'notion') => Promise<void>;

  // === PRESENTATION (Phase 6) ===
  generatePresentation: (workupId: string) => Promise<string>; // Returns file path
}

type UpdateWorkupOptions = {
  source?: 'local' | 'notion';
  clearSyncError?: boolean;
  clearSyncConflict?: boolean;
};

// === CONTEXT CREATION ===

const TAVIWorkupContext = createContext<TAVIWorkupContextValue | undefined>(undefined);

const NOTION_FIELD_KEYS: Array<keyof NotionWorkupFields> = [
  'patient',
  'status',
  'category',
  'referrer',
  'location',
  'procedureDate',
  'referralDate',
  'notes',
  'datePresented'
];

const LEGACY_STATUS_MAP: Record<string, string> = {
  draft: 'Undergoing Workup',
  ready: 'Workup Complete Awaiting Presentation',
  presented: 'Presentation Complete Awaiting Booking',
  pending: 'Undergoing Workup',
  'in-progress': 'Undergoing Workup'
};

const normalizeNotionValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (value === undefined || value === null) return undefined;
  return String(value);
};

const getNotionFieldSnapshot = (source: Partial<TAVIWorkupItem>): Partial<NotionWorkupFields> => {
  const snapshot: Partial<NotionWorkupFields> = {};
  NOTION_FIELD_KEYS.forEach((key) => {
    snapshot[key] = normalizeNotionValue(source[key]);
  });
  return snapshot;
};

const diffNotionFields = (
  local: Partial<NotionWorkupFields>,
  notion: Partial<NotionWorkupFields>
): { local: Partial<NotionWorkupFields>; notion: Partial<NotionWorkupFields> } => {
  const localDiff: Partial<NotionWorkupFields> = {};
  const notionDiff: Partial<NotionWorkupFields> = {};
  NOTION_FIELD_KEYS.forEach((key) => {
    const localValue = normalizeNotionValue(local[key]);
    const notionValue = normalizeNotionValue(notion[key]);
    if (localValue !== notionValue) {
      localDiff[key] = localValue as NotionWorkupFields[typeof key];
      notionDiff[key] = notionValue as NotionWorkupFields[typeof key];
    }
  });
  return { local: localDiff, notion: notionDiff };
};

const normalizeWorkup = (workup: TAVIWorkupItem): TAVIWorkupItem => {
  const trimmedStatus = workup.status?.trim();
  const normalizedStatus = trimmedStatus ? (LEGACY_STATUS_MAP[trimmedStatus] || trimmedStatus) : 'Undergoing Workup';

  return {
    ...workup,
    status: normalizedStatus,
    notionFieldsUpdatedAt: workup.notionFieldsUpdatedAt ?? workup.lastUpdatedAt
  };
};

// === PROVIDER COMPONENT ===

export const TAVIWorkupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const storage = useMemo(() => TAVIWorkupStorageService.getInstance(), []);
  const notionService = useMemo(() => NotionStructuralWorkupService.getInstance(), []);

  // === STATE ===
  const [workups, setWorkups] = useState<TAVIWorkupItem[]>([]);
  const [selectedWorkupId, setSelectedWorkupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const workupsRef = useRef<TAVIWorkupItem[]>([]);
  const syncingWorkupsRef = useRef(new Set<string>());

  // === NOTION STATE (Phase 2) ===
  const [notionAvailable, setNotionAvailable] = useState(false);
  const [notionPatients, setNotionPatients] = useState<NotionTAVIPatient[]>([]);

  // === COMPUTED VALUES ===
  const selectedWorkup = useMemo(
    () => workups.find(w => w.id === selectedWorkupId) || null,
    [workups, selectedWorkupId]
  );

  useEffect(() => {
    workupsRef.current = workups;
  }, [workups]);

  // === NOTION SYNC (Phase 2) ===
  useEffect(() => {
    notionService.isAvailable().then(setNotionAvailable);
  }, [notionService]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const handler: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== 'local') return;
      if (!changes[NOTION_CONFIG_KEY]) return;
      notionService.isAvailable().then(setNotionAvailable);
      notionService.reloadConfig().catch(error => {
        console.warn('[TAVIWorkupContext] Failed to reload Notion config', error);
      });
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, [notionService]);

  // === LOAD WORKUPS ON MOUNT ===
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const loaded = await storage.loadWorkups();
        if (mounted) {
          const normalized = loaded.map(normalizeWorkup);
          const changed = loaded.some((workup, index) => (
            workup.status !== normalized[index].status ||
            workup.notionFieldsUpdatedAt !== normalized[index].notionFieldsUpdatedAt
          ));
          setWorkups(normalized);
          if (changed) {
            await storage.saveWorkups(normalized);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[TAVIWorkupContext] Failed to load workups:', error);
        if (mounted) {
          setWorkups([]);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [storage]);

  // === SUBSCRIBE TO STORAGE CHANGES ===
  useEffect(() => {
    const unsubscribe = storage.subscribe(updatedWorkups => {
      setWorkups(updatedWorkups.map(normalizeWorkup));
    });

    return () => {
      unsubscribe();
    };
  }, [storage]);

  // === CRUD OPERATIONS ===

  /**
   * Create a new workup (optionally from Notion patient)
   */
  const createWorkup = useCallback(
    async (notionPatient?: NotionTAVIPatient): Promise<TAVIWorkupItem> => {
      const now = Date.now();
      const isImported = Boolean(notionPatient?.notionPageId);
      const initialStatus = notionPatient?.status?.trim() || 'Undergoing Workup';
      const newWorkup: TAVIWorkupItem = {
        id: `workup-${now}-${Math.random().toString(36).substr(2, 9)}`,
        patient: notionPatient?.patient || 'New TAVI Workup',
        notionPageId: isImported ? notionPatient?.notionPageId : undefined,
        notionUrl: isImported ? notionPatient?.notionUrl : undefined,
        referralDate: notionPatient?.referralDate,
        referrer: notionPatient?.referrer,
        location: notionPatient?.location,
        procedureDate: notionPatient?.procedureDate,
        category: notionPatient?.category,
        notes: notionPatient?.notes,
        datePresented: notionPatient?.datePresented,
        structuredSections: createEmptyStructuredSections(),
        createdAt: now,
        lastUpdatedAt: now,
        completionPercentage: 0,
        status: initialStatus,
        lastSyncedAt: isImported ? now : undefined,
        notionLastEditedAt: isImported ? notionPatient?.lastEditedTime : undefined,
        notionFieldsUpdatedAt: isImported ? undefined : now
      };

      await storage.addWorkup(newWorkup);
      setSelectedWorkupId(newWorkup.id);

      return newWorkup;
    },
    [storage]
  );

  /**
   * Update a workup using an updater function
   */
  const updateWorkup = useCallback(
    async (
      id: string,
      updater: (w: TAVIWorkupItem) => TAVIWorkupItem,
      options: UpdateWorkupOptions = {}
    ): Promise<void> => {
      const source = options.source ?? 'local';
      await storage.updateWorkup(id, w => {
        const now = Date.now();
        const next = updater(w);
        const prevSnapshot = getNotionFieldSnapshot(w);
        const nextSnapshot = getNotionFieldSnapshot(next);
        const notionFieldsChanged = source !== 'notion' && NOTION_FIELD_KEYS.some((key) => (
          normalizeNotionValue(prevSnapshot[key]) !== normalizeNotionValue(nextSnapshot[key])
        ));

        const updated: TAVIWorkupItem = {
          ...next,
          lastUpdatedAt: now,
          notionFieldsUpdatedAt: notionFieldsChanged ? now : w.notionFieldsUpdatedAt
        };

        if (options.clearSyncError) {
          updated.notionSyncError = undefined;
        }
        if (options.clearSyncConflict) {
          updated.notionSyncConflict = undefined;
        }

        return updated;
      });
    },
    [storage]
  );

  /**
   * Delete a workup by ID
   */
  const deleteWorkup = useCallback(
    async (id: string): Promise<void> => {
      await storage.deleteWorkup(id);
      if (selectedWorkupId === id) {
        setSelectedWorkupId(null);
      }
    },
    [storage, selectedWorkupId]
  );

  // === NOTION SYNC (Phase 2) ===
  const getWorkupNotionFields = useCallback((workup: TAVIWorkupItem): NotionWorkupFields => ({
    patient: workup.patient || 'New TAVI Workup',
    status: workup.status?.trim() || 'Undergoing Workup',
    category: workup.category,
    referrer: workup.referrer,
    location: workup.location,
    procedureDate: workup.procedureDate,
    referralDate: workup.referralDate,
    notes: workup.notes,
    datePresented: workup.datePresented
  }), []);

  const getPatientNotionFields = useCallback((patient: NotionTAVIPatient): NotionWorkupFields => ({
    patient: patient.patient || 'New TAVI Workup',
    status: patient.status?.trim() || 'Undergoing Workup',
    category: patient.category,
    referrer: patient.referrer,
    location: patient.location,
    procedureDate: patient.procedureDate,
    referralDate: patient.referralDate,
    notes: patient.notes,
    datePresented: patient.datePresented
  }), []);

  const syncWorkupToNotion = useCallback(async (
    workup: TAVIWorkupItem,
    options: { force?: boolean; clearConflict?: boolean } = {}
  ): Promise<void> => {
    if (!notionAvailable) return;
    if (workup.notionSyncConflict) return;
    if (workup.notionSyncError && !options.force) return;

    const payload = getWorkupNotionFields(workup);
    const now = Date.now();

    try {
      if (!workup.notionPageId) {
        const created = await notionService.createWorkupPage(payload);
        const notionEditedAt = created.last_edited_time
          ? new Date(created.last_edited_time).getTime()
          : now;
        await updateWorkup(workup.id, w => ({
          ...w,
          notionPageId: created.id,
          notionUrl: created.url ?? w.notionUrl,
          lastSyncedAt: now,
          notionLastEditedAt: notionEditedAt
        }), { source: 'notion', clearSyncError: true, clearSyncConflict: options.clearConflict });
        console.log(`[TAVIWorkupContext] Created Notion workup: ${created.id}`);
      } else {
        const updated = await notionService.updateWorkupPage(workup.notionPageId, payload);
        const notionEditedAt = updated.last_edited_time
          ? new Date(updated.last_edited_time).getTime()
          : now;
        await updateWorkup(workup.id, w => ({
          ...w,
          lastSyncedAt: now,
          notionLastEditedAt: notionEditedAt,
          notionUrl: updated.url ?? w.notionUrl
        }), { source: 'notion', clearSyncError: true, clearSyncConflict: options.clearConflict });
        console.log(`[TAVIWorkupContext] Updated Notion workup: ${workup.notionPageId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateWorkup(workup.id, w => ({
        ...w,
        notionSyncError: message
      }), { source: 'notion' });
      console.error('[TAVIWorkupContext] Failed to sync workup to Notion:', error);
    }
  }, [getWorkupNotionFields, notionAvailable, notionService, updateWorkup]);

  const applyNotionUpdates = useCallback(async (patients: NotionTAVIPatient[]): Promise<void> => {
    const workupsByNotionId = new Map<string, TAVIWorkupItem>();
    workupsRef.current.forEach((workup) => {
      if (workup.notionPageId) {
        workupsByNotionId.set(workup.notionPageId, workup);
      }
    });

    for (const patient of patients) {
      const workup = workupsByNotionId.get(patient.notionPageId);
      if (!workup || workup.notionSyncConflict) continue;

      const notionFields = getPatientNotionFields(patient);
      const localSnapshot = getNotionFieldSnapshot(workup);
      const { local: localDiff, notion: notionDiff } = diffNotionFields(localSnapshot, notionFields);
      const hasDiff = Object.keys(localDiff).length > 0;

      const notionEditedAt = patient.lastEditedTime;
      const localEditedAt = workup.notionFieldsUpdatedAt || 0;
      const lastSyncedAt = workup.lastSyncedAt || 0;
      const localChanged = localEditedAt > lastSyncedAt;
      const notionChanged = notionEditedAt > (workup.notionLastEditedAt || 0);

      if (!hasDiff) {
        if (notionChanged) {
          await updateWorkup(workup.id, w => ({
            ...w,
            notionLastEditedAt: notionEditedAt,
            notionUrl: patient.notionUrl,
            lastSyncedAt: Date.now()
          }), { source: 'notion', clearSyncError: true });
        }
        continue;
      }

      if (localChanged && notionChanged) {
        const conflict: NotionSyncConflict = {
          detectedAt: Date.now(),
          localEditedAt: workup.notionFieldsUpdatedAt,
          notionEditedAt,
          preferredSource: notionEditedAt >= localEditedAt ? 'notion' : 'local',
          local: localDiff,
          notion: notionDiff
        };
        await updateWorkup(workup.id, w => ({
          ...w,
          notionSyncConflict: conflict
        }), { source: 'notion' });
        continue;
      }

      if (notionChanged && !localChanged) {
        await updateWorkup(workup.id, w => ({
          ...w,
          ...notionFields,
          notionUrl: patient.notionUrl,
          lastSyncedAt: Date.now(),
          notionLastEditedAt: notionEditedAt
        }), { source: 'notion', clearSyncError: true, clearSyncConflict: true });
      }
    }
  }, [getPatientNotionFields, updateWorkup]);

  const refreshNotionList = useCallback(async (): Promise<void> => {
    try {
      const available = await notionService.isAvailable();
      setNotionAvailable(available);

      if (!available) {
        setNotionPatients([]);
        return;
      }

      const patients = await notionService.fetchPatientList({ includePresented: true });
      setNotionPatients(patients);
      await applyNotionUpdates(patients);
      console.log(`[TAVIWorkupContext] Fetched ${patients.length} Notion patients`);
    } catch (error) {
      console.error('[TAVIWorkupContext] Failed to fetch Notion patient list:', error);
    }
  }, [applyNotionUpdates, notionService]);

  const retryNotionSync = useCallback(async (workupId: string): Promise<void> => {
    const workup = workupsRef.current.find(w => w.id === workupId);
    if (!workup) return;

    await updateWorkup(workupId, w => ({
      ...w,
      notionSyncError: undefined
    }), { source: 'notion', clearSyncError: true });

    await syncWorkupToNotion({ ...workup, notionSyncError: undefined }, { force: true });
  }, [syncWorkupToNotion, updateWorkup]);

  const resolveNotionConflict = useCallback(
    async (workupId: string, resolution: 'local' | 'notion'): Promise<void> => {
      const workup = workupsRef.current.find(w => w.id === workupId);
      if (!workup?.notionSyncConflict) return;

      const conflict = workup.notionSyncConflict;
      if (resolution === 'notion') {
        await updateWorkup(workupId, w => ({
          ...w,
          ...conflict.notion,
          notionSyncError: undefined,
          notionSyncConflict: undefined,
          lastSyncedAt: Date.now(),
          notionLastEditedAt: conflict.notionEditedAt ?? w.notionLastEditedAt
        }), { source: 'notion', clearSyncError: true, clearSyncConflict: true });
        return;
      }

      await updateWorkup(workupId, w => ({
        ...w,
        notionSyncError: undefined,
        notionSyncConflict: undefined
      }), { source: 'notion', clearSyncError: true, clearSyncConflict: true });

      await syncWorkupToNotion({ ...workup, notionSyncConflict: undefined }, { force: true, clearConflict: true });
    },
    [syncWorkupToNotion, updateWorkup]
  );

  // === NOTION POLLING (Phase 2) ===
  useEffect(() => {
    refreshNotionList();

    const interval = setInterval(() => {
      refreshNotionList();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshNotionList]);

  // === LOCAL -> NOTION AUTO SYNC ===
  useEffect(() => {
    if (loading || !notionAvailable) return;

    workups.forEach((workup) => {
      if (workup.notionSyncConflict || workup.notionSyncError) return;

      const localEditedAt = workup.notionFieldsUpdatedAt || 0;
      const lastSyncedAt = workup.lastSyncedAt || 0;
      const needsSync = localEditedAt > lastSyncedAt;
      if (!needsSync) return;

      if (syncingWorkupsRef.current.has(workup.id)) return;
      syncingWorkupsRef.current.add(workup.id);

      syncWorkupToNotion(workup)
        .finally(() => {
          syncingWorkupsRef.current.delete(workup.id);
        });
    });
  }, [loading, notionAvailable, syncWorkupToNotion, workups]);

  // === DICTATION (Phase 4 & 5 stubs) ===

  const generateFullWorkup = useCallback(async (dictation: string): Promise<TAVIWorkupItem> => {
    // Dynamically import TAVIWorkupAgent
    const { TAVIWorkupAgent } = await import('@/agents/specialized/TAVIWorkupAgent');

    const agent = new TAVIWorkupAgent();

    // Process dictation through existing TAVI Workup agent
    // This preserves the validation workflow (regex → quick model → user validation → LLM)
    const result = await agent.process(dictation);

    // Extract patient name from result if available
    const patientName = result.patientData?.name || 'New TAVI Workup';

    // Create new workup with generated content
    const now = Date.now();
    const newWorkup: TAVIWorkupItem = {
      id: `workup-${now}-${Math.random().toString(36).substr(2, 9)}`,
      patient: patientName,
      structuredSections: result.structuredSections || createEmptyStructuredSections(),
      createdAt: now,
      lastUpdatedAt: now,
      completionPercentage: calculateCompletion(result.structuredSections || createEmptyStructuredSections()),
      status: 'Undergoing Workup',
      notionFieldsUpdatedAt: now,
      validationResult: result.validationResult,
      extractedData: result.extractedData
    };

    // Save to storage
    await storage.addWorkup(newWorkup);
    setSelectedWorkupId(newWorkup.id);

    console.log(`[TAVIWorkupContext] Generated full workup: ${newWorkup.id}`);
    return newWorkup;
  }, [storage]);

  const appendToSection = useCallback(
    async (workupId: string, sectionKey: string, parsedContent: string): Promise<void> => {
      const { TAVIWorkupIncrementalService } = await import('@/services/TAVIWorkupIncrementalService');
      const incrementalService = TAVIWorkupIncrementalService.getInstance();

      await updateWorkup(workupId, w => {
        const section = w.structuredSections[sectionKey as keyof TAVIWorkupStructuredSections];
        if (!section || !('content' in section)) {
          throw new Error(`Invalid section key: ${sectionKey}`);
        }

        const mergedContent = incrementalService.mergeContent(section.content, parsedContent);

        const updatedSections = {
          ...w.structuredSections,
          [sectionKey]: {
            ...section,
            content: mergedContent
          }
        };

        return {
          ...w,
          structuredSections: updatedSections,
          completionPercentage: calculateCompletion(updatedSections)
        };
      });

      console.log(`[TAVIWorkupContext] Appended content to section ${sectionKey} in workup ${workupId}`);
    },
    [updateWorkup]
  );

  // === PRESENTATION (Phase 6 stub) ===

  const generatePresentation = useCallback(async (workupId: string): Promise<string> => {
    const workup = workups.find(w => w.id === workupId);
    if (!workup) {
      throw new Error(`Workup not found: ${workupId}`);
    }

    const { TAVIWorkupPresentationService } = await import('@/services/TAVIWorkupPresentationService');
    const presentationService = TAVIWorkupPresentationService.getInstance();

    await presentationService.presentWorkup(workup);

    console.log(`[TAVIWorkupContext] Generated presentation for workup ${workupId}`);
    return `TAVI_Workup_${workup.patient.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
  }, [workups]);

  // === CONTEXT VALUE ===

  const value: TAVIWorkupContextValue = {
    workups,
    loading,
    selectedWorkupId,
    selectedWorkup,
    notionAvailable,
    notionPatients,
    setSelectedWorkupId,
    createWorkup,
    updateWorkup,
    deleteWorkup,
    generateFullWorkup,
    appendToSection,
    refreshNotionList,
    retryNotionSync,
    resolveNotionConflict,
    generatePresentation
  };

  return <TAVIWorkupContext.Provider value={value}>{children}</TAVIWorkupContext.Provider>;
};

// === HOOK ===

/**
 * Use TAVI Workup context
 * Throws error if used outside TAVIWorkupProvider
 */
export const useTAVIWorkup = (): TAVIWorkupContextValue => {
  const context = useContext(TAVIWorkupContext);
  if (!context) {
    throw new Error('useTAVIWorkup must be used within a TAVIWorkupProvider');
  }
  return context;
};
