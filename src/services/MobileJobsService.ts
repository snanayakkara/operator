import type { MobileJobDetail, MobileJobSummary } from '@/types/mobileJobs.types';

const DEFAULT_API_BASE = 'http://127.0.0.1:5858';

export class MobileJobsService {
  private static instance: MobileJobsService | null = null;
  private apiBase: string;

  private constructor(apiBase = DEFAULT_API_BASE) {
    this.apiBase = apiBase;
  }

  public static getInstance(): MobileJobsService {
    if (!MobileJobsService.instance) {
      MobileJobsService.instance = new MobileJobsService();
    }
    return MobileJobsService.instance;
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
      throw new Error(`Mobile jobs API error (${response.status}): ${text || response.statusText}`);
    }

    return (await response.json()) as T;
  }

  public async listJobs(): Promise<MobileJobSummary[]> {
    const data = await this.request<{ jobs: MobileJobSummary[] }>('/jobs');
    return data.jobs;
  }

  public async getJob(jobId: string): Promise<MobileJobDetail> {
    return await this.request<MobileJobDetail>(`/jobs/${jobId}`);
  }

  public async deleteJob(jobId: string): Promise<void> {
    await this.request(`/jobs/${jobId}`, { method: 'DELETE' });
  }

  public async markAttached(
    jobId: string,
    sessionId: string,
    patientName?: string,
    agentType?: string
  ): Promise<void> {
    await this.request(`/jobs/${jobId}/attach`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, patient_name: patientName, agent_type: agentType })
    });
  }
}

export const mobileJobsService = MobileJobsService.getInstance();
