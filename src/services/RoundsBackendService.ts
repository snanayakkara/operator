import { RoundsPatient } from '@/types/rounds.types';

const DEFAULT_API_BASE = 'http://127.0.0.1:5858';

interface QuickAddPayload {
  name: string;
  scratchpad: string;
  ward?: string;
}

export class RoundsBackendService {
  private static instance: RoundsBackendService | null = null;
  private apiBase: string;

  private constructor(apiBase = DEFAULT_API_BASE) {
    this.apiBase = apiBase;
  }

  public static getInstance(): RoundsBackendService {
    if (!RoundsBackendService.instance) {
      RoundsBackendService.instance = new RoundsBackendService();
    }
    return RoundsBackendService.instance;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.apiBase}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Rounds backend error (${response.status}): ${text || response.statusText}`);
    }

    return (await response.json()) as T;
  }

  public async fetchPatients(): Promise<RoundsPatient[]> {
    const data = await this.request<{ patients: RoundsPatient[] }>('/rounds/patients');
    return data.patients || [];
  }

  public async savePatients(patients: RoundsPatient[]): Promise<void> {
    await this.request('/rounds/patients', {
      method: 'POST',
      body: JSON.stringify({ patients })
    });
  }

  public async quickAddPatient(payload: QuickAddPayload): Promise<RoundsPatient> {
    const data = await this.request<{ patient: RoundsPatient }>('/rounds/patients/quick_add', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.patient;
  }
}

export const roundsBackendService = RoundsBackendService.getInstance();
