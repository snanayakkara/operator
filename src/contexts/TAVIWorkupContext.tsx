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

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import type { TAVIWorkupItem, NotionTAVIPatient } from '@/types/taviWorkup.types';
import { createEmptyStructuredSections, calculateCompletion } from '@/types/taviWorkup.types';
import { TAVIWorkupStorageService } from '@/services/TAVIWorkupStorageService';
import { NotionStructuralWorkupService } from '@/services/NotionStructuralWorkupService';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';

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
  updateWorkup: (id: string, updater: (w: TAVIWorkupItem) => TAVIWorkupItem) => Promise<void>;
  deleteWorkup: (id: string) => Promise<void>;

  // === DICTATION (Phase 4 & 5) ===
  generateFullWorkup: (dictation: string) => Promise<TAVIWorkupItem>; // Phase 5
  appendToSection: (workupId: string, section: string, dictation: string) => Promise<void>; // Phase 4

  // === NOTION SYNC (Phase 2) ===
  refreshNotionList: () => Promise<void>;
  syncWorkupStatus: (workupId: string, status: 'pending' | 'in-progress' | 'presented') => Promise<void>;
  linkToNotion: (workupId: string, notionPageId: string) => Promise<void>;

  // === PRESENTATION (Phase 6) ===
  generatePresentation: (workupId: string) => Promise<string>; // Returns file path
}

// === CONTEXT CREATION ===

const TAVIWorkupContext = createContext<TAVIWorkupContextValue | undefined>(undefined);

// === PROVIDER COMPONENT ===

export const TAVIWorkupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const storage = useMemo(() => TAVIWorkupStorageService.getInstance(), []);
  const notionService = useMemo(() => NotionStructuralWorkupService.getInstance(), []);

  // === STATE ===
  const [workups, setWorkups] = useState<TAVIWorkupItem[]>([]);
  const [selectedWorkupId, setSelectedWorkupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // === NOTION STATE (Phase 2) ===
  const [notionAvailable, setNotionAvailable] = useState(false);
  const [notionPatients, setNotionPatients] = useState<NotionTAVIPatient[]>([]);

  // === COMPUTED VALUES ===
  const selectedWorkup = useMemo(
    () => workups.find(w => w.id === selectedWorkupId) || null,
    [workups, selectedWorkupId]
  );

  // === NOTION SYNC (Phase 2) ===

  const refreshNotionList = useCallback(async (): Promise<void> => {
    try {
      const available = await notionService.isAvailable();
      setNotionAvailable(available);

      if (available) {
        const patients = await notionService.fetchPatientList();
        setNotionPatients(patients);
        console.log(`[TAVIWorkupContext] Fetched ${patients.length} Notion patients`);
      }
    } catch (error) {
      console.error('[TAVIWorkupContext] Failed to fetch Notion patient list:', error);
      setNotionAvailable(false);
      setNotionPatients([]);
    }
  }, [notionService]);

  // === LOAD WORKUPS ON MOUNT ===
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const loaded = await storage.loadWorkups();
        if (mounted) {
          setWorkups(loaded);
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
      setWorkups(updatedWorkups);
    });

    return () => {
      unsubscribe();
    };
  }, [storage]);

  // === NOTION POLLING (Phase 2) ===
  useEffect(() => {
    // Initial fetch
    refreshNotionList();

    // Poll every 60 seconds
    const interval = setInterval(() => {
      refreshNotionList();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshNotionList]);

  // === CRUD OPERATIONS ===

  /**
   * Create a new workup (optionally from Notion patient)
   */
  const createWorkup = useCallback(
    async (notionPatient?: NotionTAVIPatient): Promise<TAVIWorkupItem> => {
      const newWorkup: TAVIWorkupItem = {
        id: `workup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        patient: notionPatient?.patient || 'New TAVI Workup',
        notionPageId: notionPatient?.notionPageId,
        notionStatus: notionPatient?.status === 'Pending' ? 'pending' : undefined,
        notionUrl: notionPatient?.notionUrl,
        referralDate: notionPatient?.referralDate,
        referrer: notionPatient?.referrer,
        location: notionPatient?.location,
        procedureDate: notionPatient?.procedureDate,
        readyToPresent: notionPatient?.readyToPresent,
        category: notionPatient?.category,
        structuredSections: createEmptyStructuredSections(),
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        completionPercentage: 0,
        status: 'draft'
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
    async (id: string, updater: (w: TAVIWorkupItem) => TAVIWorkupItem): Promise<void> => {
      await storage.updateWorkup(id, w => ({
        ...updater(w),
        lastUpdatedAt: Date.now()
      }));
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

  const syncWorkupStatus = useCallback(
    async (workupId: string, status: 'pending' | 'in-progress' | 'presented'): Promise<void> => {
      const workup = workups.find(w => w.id === workupId);
      if (!workup?.notionPageId) {
        console.warn('[TAVIWorkupContext] Cannot sync status - workup not linked to Notion');
        return;
      }

      try {
        await notionService.updateWorkupStatus(workup.notionPageId, status);
        await updateWorkup(workupId, w => ({
          ...w,
          notionStatus: status,
          lastSyncedAt: Date.now()
        }));
        console.log(`[TAVIWorkupContext] Synced status to Notion: ${status}`);
      } catch (error) {
        console.error('[TAVIWorkupContext] Failed to sync status to Notion:', error);
        throw error;
      }
    },
    [notionService, updateWorkup, workups]
  );

  const linkToNotion = useCallback(
    async (workupId: string, notionPageId: string): Promise<void> => {
      await updateWorkup(workupId, w => ({
        ...w,
        notionPageId
      }));
    },
    [updateWorkup]
  );

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
    const newWorkup: TAVIWorkupItem = {
      id: `workup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      patient: patientName,
      structuredSections: result.structuredSections || createEmptyStructuredSections(),
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      completionPercentage: calculateCompletion(result.structuredSections || createEmptyStructuredSections()),
      status: 'draft',
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
    syncWorkupStatus,
    linkToNotion,
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
