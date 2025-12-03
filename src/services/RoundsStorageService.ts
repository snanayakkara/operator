import { RoundsPatient } from '@/types/rounds.types';
import { roundsBackendService } from '@/services/RoundsBackendService';

const STORAGE_KEY = 'operator_rounds_patients_v1';
const SAVE_DEBOUNCE_MS = 250;

/**
 * Lightweight storage wrapper for Rounds data.
 * Persists to chrome.storage.local when available, otherwise falls back to localStorage.
 */
export class RoundsStorageService {
  private static instance: RoundsStorageService | null = null;
  private cache: RoundsPatient[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(patients: RoundsPatient[]) => void>();
  private backendAvailable = false;

  private constructor() {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[STORAGE_KEY]) {
          const next = (changes[STORAGE_KEY].newValue as RoundsPatient[]) || [];
          this.cache = next;
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
    const backendPatients = await this.fetchFromBackend();
    if (backendPatients) {
      this.cache = backendPatients;
      this.schedulePersist();
      return [...backendPatients];
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const patients = (result?.[STORAGE_KEY] as RoundsPatient[]) || [];
        this.cache = patients;
        return [...patients];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load rounds patients from chrome.storage.local, falling back to localStorage', error);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RoundsPatient[];
        this.cache = parsed;
        return [...parsed];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load rounds patients from localStorage', error);
    }

    this.cache = [];
    return [];
  }

  public async savePatients(patients: RoundsPatient[]): Promise<void> {
    this.cache = [...patients];
    await this.persistToBackend();
    this.schedulePersist();
    this.notify();
  }

  public async quickAddPatient(payload: { name: string; scratchpad: string; ward?: string }): Promise<RoundsPatient | null> {
    try {
      const patient = await roundsBackendService.quickAddPatient(payload);
      this.backendAvailable = true;
      this.cache = [...this.cache, patient];
      this.schedulePersist();
      this.notify();
      return patient;
    } catch (error) {
      console.warn('⚠️ Failed to quick-add patient via backend, falling back to local storage', error);
      this.backendAvailable = false;
      return null;
    }
  }

  public async loadPatientsFromBackend(): Promise<RoundsPatient[] | null> {
    const patients = await this.fetchFromBackend();
    if (patients && !this.arePatientsEqual(patients, this.cache)) {
      this.cache = patients;
      this.notify();
      this.schedulePersist();
    }
    return patients;
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

  private arePatientsEqual(a: RoundsPatient[], b: RoundsPatient[]): boolean {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
