import { Clinician, RoundsPatient } from '@/types/rounds.types';
import { roundsBackendService } from '@/services/RoundsBackendService';

const STORAGE_KEY = 'operator_rounds_patients_v1';
const CLINICIANS_STORAGE_KEY = 'operator_rounds_clinicians_v1';
const SAVE_DEBOUNCE_MS = 250;

/**
 * Lightweight storage wrapper for Rounds data.
 * Persists to chrome.storage.local when available, otherwise falls back to localStorage.
 */
export class RoundsStorageService {
  private static instance: RoundsStorageService | null = null;
  private cache: RoundsPatient[] = [];
  private cliniciansCache: Clinician[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private cliniciansSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(patients: RoundsPatient[]) => void>();
  private backendAvailable = false;
  private lastLocalSaveTime: number = 0;
  private optimisticPatientIds = new Set<string>();
  private optimisticTimestamps = new Map<string, number>();
  private readonly OPTIMISTIC_TTL_MS = 30000; // 30 seconds

  private constructor() {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[STORAGE_KEY]) {
          const storageValue = (changes[STORAGE_KEY].newValue as RoundsPatient[]) || [];

          // Preserve optimistic patients when storage changes
          const optimisticPatients = this.cache.filter(p => this.isOptimistic(p.id));
          if (optimisticPatients.length > 0) {
            console.log(`[RoundsStorage] Storage change detected, preserving ${optimisticPatients.length} optimistic patient(s)`);
            // Merge: keep optimistic patients from cache, add non-optimistic from storage
            const _storageIds = new Set(storageValue.map(p => p.id));
            const merged = [
              ...optimisticPatients,
              ...storageValue.filter(p => !optimisticPatients.some(op => op.id === p.id))
            ];
            this.cache = merged;
          } else {
            // No optimistic patients, safe to replace cache
            this.cache = storageValue;
          }

          this.notify();
        }
      });
    }
  }

  public static getInstance(): RoundsStorageService {
    if (!RoundsStorageService.instance) {
      RoundsStorageService.instance = new RoundsStorageService();
    }
    return RoundsStorageService.instance;
  }

  public subscribe(listener: (patients: RoundsPatient[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getCachedPatients(): RoundsPatient[] {
    return [...this.cache];
  }

  public async loadPatients(): Promise<RoundsPatient[]> {
    // Load whatever we already have locally as the baseline
    const localPatients = await this.loadPatientsFromLocal();

    // PRESERVE optimistic patients before overwriting cache
    const optimisticPatients = this.cache.filter(p => this.isOptimistic(p.id));
    if (optimisticPatients.length > 0) {
      console.log(`[RoundsStorage] loadPatients - preserving ${optimisticPatients.length} optimistic patient(s)`);
      // Merge: keep optimistic patients, add non-optimistic from local storage
      this.cache = [
        ...optimisticPatients,
        ...localPatients.filter(p => !optimisticPatients.some(op => op.id === p.id))
      ];
    } else {
      this.cache = [...localPatients];
    }

    this.lastLocalSaveTime = this.getNewestTimestamp(this.cache);

    // If local is empty and no optimistic patients, try to recover from Chrome sync storage
    if (this.cache.length === 0) {
      const syncPatients = await this.loadPatientsFromSync();
      if (syncPatients.length > 0) {
        this.cache = [...syncPatients];
        this.lastLocalSaveTime = this.getNewestTimestamp(syncPatients);
        // Persist back to local so it sticks even if sync is unavailable
        this.schedulePersist();
      }
    }

    // Try to merge in backend data, but never wipe out a populated local cache with an empty backend
    const backendPatients = await this.fetchFromBackend();
    if (!backendPatients || (backendPatients.length === 0 && localPatients.length > 0)) {
      return [...this.cache];
    }

    const merged = this.mergePatients(this.cache, backendPatients);
    this.cache = merged;
    this.lastLocalSaveTime = this.getNewestTimestamp(merged);

    // Persist the merged view locally so a reboot does not drop data if the backend is empty
    if (!this.arePatientsEqual(merged, localPatients)) {
      this.schedulePersist();
    }

    return [...merged];
  }

  public async savePatients(patients: RoundsPatient[]): Promise<void> {
    this.cache = [...patients];
    this.lastLocalSaveTime = Date.now();
    await this.persistToBackend();
    this.schedulePersist();
    this.notify();
  }

  /**
   * Track patient as optimistically added (local-only, not yet confirmed by backend)
   */
  private addOptimistic(patientId: string): void {
    this.optimisticPatientIds.add(patientId);
    this.optimisticTimestamps.set(patientId, Date.now());
  }

  /**
   * Check if patient is still in optimistic window (30 seconds)
   */
  private isOptimistic(patientId: string): boolean {
    if (!this.optimisticPatientIds.has(patientId)) return false;
    const timestamp = this.optimisticTimestamps.get(patientId);
    if (!timestamp) return false;

    // Expire after TTL
    if (Date.now() - timestamp > this.OPTIMISTIC_TTL_MS) {
      this.optimisticPatientIds.delete(patientId);
      this.optimisticTimestamps.delete(patientId);
      return false;
    }
    return true;
  }

  /**
   * Clear optimistic flag when backend confirms patient exists
   */
  private confirmOptimistic(patientId: string): void {
    this.optimisticPatientIds.delete(patientId);
    this.optimisticTimestamps.delete(patientId);
  }

  /**
   * Create a local-only patient when backend is unavailable
   */
  private createLocalPatient(payload: { name: string; scratchpad: string; ward?: string }): RoundsPatient {
    const timestamp = new Date().toISOString();
    return {
      id: `patient-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: payload.name,
      mrn: '',
      bed: '',
      oneLiner: '',
      status: 'active',
      site: payload.ward || '1 South',
      intakeNotes: payload.scratchpad ? [{
        id: `intake-${timestamp}`,
        timestamp,
        text: payload.scratchpad
      }] : [],
      issues: [],
      investigations: [],
      tasks: [],
      wardEntries: [],
      clinicianIds: [],
      createdAt: timestamp,
      lastUpdatedAt: timestamp
    };
  }

  public async quickAddPatient(payload: { name: string; scratchpad: string; ward?: string }): Promise<RoundsPatient | null> {
    try {
      const patient = await roundsBackendService.quickAddPatient(payload);
      this.backendAvailable = true;
      this.cache = [...this.cache, patient];
      // No optimistic flag needed - backend confirmed immediately
      this.schedulePersist();
      this.notify();
      return patient;
    } catch (error) {
      console.warn('⚠️ Failed to quick-add patient via backend, falling back to local storage', error);
      this.backendAvailable = false;

      // Create patient locally with optimistic tracking
      const localPatient = this.createLocalPatient(payload);
      this.cache = [...this.cache, localPatient];
      this.addOptimistic(localPatient.id); // Mark as optimistic
      this.lastLocalSaveTime = Date.now();
      this.schedulePersist();
      this.notify();
      return localPatient;
    }
  }

  public async loadPatientsFromBackend(): Promise<RoundsPatient[] | null> {
    const patients = await this.fetchFromBackend();
    if (patients) {
      // Merge backend data with local cache, preferring whichever has the newer lastUpdatedAt
      const merged = this.mergePatients(this.cache, patients);
      if (!this.arePatientsEqual(merged, this.cache)) {
        this.cache = merged;
        this.lastLocalSaveTime = this.getNewestTimestamp(merged);
        this.notify();
        this.schedulePersist();
      }
    }
    return patients;
  }

  /**
   * Merge local and remote patient arrays, preferring the version with the newer lastUpdatedAt
   * for each patient. This prevents backend polling from reverting recent local changes.
   *
   * CRITICAL FIX: Only merge if remote data is actually newer than our last local save.
   * If we saved locally 5 seconds ago, and remote data is from 10 seconds ago, the remote
   * is stale and should be ignored completely. This prevents backend polling from restoring
   * old data when backend is unavailable or has stale cache.
   */
  private mergePatients(local: RoundsPatient[], remote: RoundsPatient[]): RoundsPatient[] {
    // Find the newest timestamp in remote data
    const newestRemoteTime = remote.reduce((max, p) => {
      const time = new Date(p.lastUpdatedAt).getTime();
      return time > max ? time : max;
    }, 0);

    // If we saved locally MORE recently than ANY remote patient, remote data is stale
    // In this case, completely ignore remote and keep local
    if (this.lastLocalSaveTime > 0 && this.lastLocalSaveTime > newestRemoteTime) {
      console.log(`[RoundsStorage] Ignoring stale remote data (local save ${this.lastLocalSaveTime} > remote ${newestRemoteTime})`);
      return local;
    }

    // Otherwise, perform normal merge
    const localMap = new Map(local.map(p => [p.id, p]));
    const remoteMap = new Map(remote.map(p => [p.id, p]));
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

    const merged: RoundsPatient[] = [];
    for (const id of allIds) {
      const localPatient = localMap.get(id);
      const remotePatient = remoteMap.get(id);

      if (localPatient && remotePatient) {
        // Both exist - prefer the one with newer lastUpdatedAt
        const localTime = new Date(localPatient.lastUpdatedAt).getTime();
        const remoteTime = new Date(remotePatient.lastUpdatedAt).getTime();
        const winner = localTime >= remoteTime ? localPatient : remotePatient;
        merged.push(winner);

        // If backend confirmed, clear optimistic flag
        if (remotePatient && this.isOptimistic(id)) {
          this.confirmOptimistic(id);
        }
      } else if (localPatient) {
        // Only exists locally - ALWAYS preserve if optimistic
        if (this.isOptimistic(localPatient.id)) {
          console.log(`[RoundsStorage] Preserving optimistic patient: ${localPatient.name}`);
          merged.push(localPatient);
        } else {
          // Non-optimistic local-only patient (deleted from remote?)
          merged.push(localPatient);
        }
      } else if (remotePatient) {
        // Only exists remotely (new patient from another device)
        merged.push(remotePatient);
      }
    }

    return merged;
  }

  private notify(): void {
    const snapshot = [...this.cache];
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('RoundsStorageService listener error', error);
      }
    });
  }

  private schedulePersist(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.persist().catch(error => {
        console.error('❌ Failed to persist rounds patients', error);
      });
    }, SAVE_DEBOUNCE_MS);
  }

  private async fetchFromBackend(): Promise<RoundsPatient[] | null> {
    try {
      const patients = await roundsBackendService.fetchPatients();
      this.backendAvailable = true;
      return patients;
    } catch (error) {
      this.backendAvailable = false;
      return null;
    }
  }

  private async persistToBackend(): Promise<void> {
    if (!this.backendAvailable) {
      // still try once in case availability changed
      try {
        await roundsBackendService.savePatients(this.cache);
        this.backendAvailable = true;
      } catch (error) {
        this.backendAvailable = false;
      }
      return;
    }
    try {
      await roundsBackendService.savePatients(this.cache);
    } catch (error) {
      this.backendAvailable = false;
    }
  }

  private async persist(): Promise<void> {
    const payload = { [STORAGE_KEY]: this.cache };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set(payload);
        // Best-effort sync backup (persists across most extension reloads)
        if (chrome.storage?.sync) {
          chrome.storage.sync.set(payload).catch(err => {
            console.warn('⚠️ Failed to persist rounds patients to chrome.storage.sync', err);
          });
        }
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to persist rounds patients to chrome.storage.local, attempting localStorage', error);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('❌ Failed to persist rounds patients to localStorage', error);
      throw error;
    }
  }

  private async loadPatientsFromLocal(): Promise<RoundsPatient[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const patients = (result?.[STORAGE_KEY] as RoundsPatient[]) || [];
        return [...patients];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load rounds patients from chrome.storage.local, falling back to localStorage', error);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RoundsPatient[];
        return [...parsed];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load rounds patients from localStorage', error);
    }

    return [];
  }

  private async loadPatientsFromSync(): Promise<RoundsPatient[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const result = await chrome.storage.sync.get(STORAGE_KEY);
        const patients = (result?.[STORAGE_KEY] as RoundsPatient[]) || [];
        return [...patients];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load rounds patients from chrome.storage.sync', error);
    }
    return [];
  }

  private getNewestTimestamp(patients: RoundsPatient[]): number {
    return patients.reduce((latest, patient) => {
      const time = new Date(patient.lastUpdatedAt || patient.createdAt || 0).getTime();
      return Number.isFinite(time) && time > latest ? time : latest;
    }, 0);
  }

  private arePatientsEqual(a: RoundsPatient[], b: RoundsPatient[]): boolean {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // Clinician management methods
  public async loadClinicians(): Promise<Clinician[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(CLINICIANS_STORAGE_KEY);
        const clinicians = (result?.[CLINICIANS_STORAGE_KEY] as Clinician[]) || [];
        this.cliniciansCache = clinicians;
        return [...clinicians];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load clinicians from chrome.storage.local, falling back to localStorage', error);
    }

    try {
      const raw = localStorage.getItem(CLINICIANS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Clinician[];
        this.cliniciansCache = parsed;
        return [...parsed];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load clinicians from localStorage', error);
    }

    this.cliniciansCache = [];
    return [];
  }

  public async saveClinicians(clinicians: Clinician[]): Promise<void> {
    this.cliniciansCache = [...clinicians];
    this.scheduleCliniciansPersist();
  }

  private scheduleCliniciansPersist(): void {
    if (this.cliniciansSaveTimer) {
      clearTimeout(this.cliniciansSaveTimer);
    }

    this.cliniciansSaveTimer = setTimeout(() => {
      this.cliniciansSaveTimer = null;
      this.persistClinicians().catch(error => {
        console.error('❌ Failed to persist clinicians', error);
      });
    }, SAVE_DEBOUNCE_MS);
  }

  private async persistClinicians(): Promise<void> {
    const payload = { [CLINICIANS_STORAGE_KEY]: this.cliniciansCache };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set(payload);
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to persist clinicians to chrome.storage.local, attempting localStorage', error);
    }

    try {
      localStorage.setItem(CLINICIANS_STORAGE_KEY, JSON.stringify(this.cliniciansCache));
    } catch (error) {
      console.error('❌ Failed to persist clinicians to localStorage', error);
      throw error;
    }
  }
}
