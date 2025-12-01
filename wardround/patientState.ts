import { promises as fs } from 'fs';
import path from 'path';
import { PendingWardRoundUpdate } from './types';
import { RoundsPatient } from '../src/types/rounds.types';
import { generateRoundsId } from '../src/utils/rounds';

interface FileStoreShape {
  patients: RoundsPatient[];
  pending: PendingWardRoundUpdate[];
}

export interface WardRoundStateStore {
  loadPatient(patientId: string): Promise<RoundsPatient | null>;
  savePatient(patient: RoundsPatient): Promise<void>;
  listPendingUpdates(roundId?: string): Promise<PendingWardRoundUpdate[]>;
  savePendingUpdate(update: PendingWardRoundUpdate): Promise<void>;
  deletePendingUpdate(id: string): Promise<void>;
}

const defaultState: FileStoreShape = {
  patients: [],
  pending: []
};

export class FileSystemWardRoundStateStore implements WardRoundStateStore {
  constructor(private storePath: string) {}

  private async loadState(): Promise<FileStoreShape> {
    try {
      const raw = await fs.readFile(this.storePath, 'utf-8');
      return JSON.parse(raw) as FileStoreShape;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ...defaultState };
      }
      throw error;
    }
  }

  private async persist(state: FileStoreShape): Promise<void> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  public async loadPatient(patientId: string): Promise<RoundsPatient | null> {
    const state = await this.loadState();
    return state.patients.find(p => p.id === patientId) || null;
  }

  public async savePatient(patient: RoundsPatient): Promise<void> {
    const state = await this.loadState();
    const existingIndex = state.patients.findIndex(p => p.id === patient.id);
    if (existingIndex >= 0) {
      state.patients[existingIndex] = patient;
    } else {
      state.patients.push(patient);
    }
    await this.persist(state);
  }

  public async listPendingUpdates(roundId?: string): Promise<PendingWardRoundUpdate[]> {
    const state = await this.loadState();
    if (!roundId) return state.pending;
    return state.pending.filter(u => u.roundId === roundId);
  }

  public async savePendingUpdate(update: PendingWardRoundUpdate): Promise<void> {
    const state = await this.loadState();
    const next = { ...update, id: update.id || generateRoundsId('pending') };
    state.pending.push(next);
    await this.persist(state);
  }

  public async deletePendingUpdate(id: string): Promise<void> {
    const state = await this.loadState();
    state.pending = state.pending.filter(p => p.id !== id);
    await this.persist(state);
  }
}
