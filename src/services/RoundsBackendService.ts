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

  private async requestWithTimeout<T>(path: string, init?: RequestInit, timeoutMs = 3000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.request<T>(path, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
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
    const data = await this.requestWithTimeout<{ patients: RoundsPatient[] }>('/rounds/patients');
    return data.patients || [];
  }

  public async savePatients(patients: RoundsPatient[]): Promise<void> {
    await this.requestWithTimeout('/rounds/patients', {
      method: 'POST',
      body: JSON.stringify({ patients })
    });
  }

  public async quickAddPatient(payload: QuickAddPayload): Promise<RoundsPatient> {
    try {
      // First attempt with 3s timeout
      const data = await this.requestWithTimeout<{ patient: RoundsPatient }>(
        '/rounds/patients/quick_add',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        },
        3000
      );
      return data.patient;
    } catch (error) {
      // Single retry with extended timeout on AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[RoundsBackend] Quick Add timed out, retrying with 6s timeout...');
        try {
          const data = await this.requestWithTimeout<{ patient: RoundsPatient }>(
            '/rounds/patients/quick_add',
            {
              method: 'POST',
              body: JSON.stringify(payload)
            },
            6000 // Extended timeout for retry
          );
          return data.patient;
        } catch (retryError) {
          console.warn('[RoundsBackend] Quick Add retry failed, falling back to local-only');
          throw retryError; // Propagate to storage layer for local fallback
        }
      }
      throw error;
    }
  }
}

export const roundsBackendService = RoundsBackendService.getInstance();
