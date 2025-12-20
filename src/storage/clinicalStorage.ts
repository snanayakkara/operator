import type { Clinician, HudPatientState, RoundsPatient } from '@/types/rounds.types';

/**
 * Clinical data must never be stored in sync storage.
 *
 * `chrome.storage.sync` is reserved ONLY for small, non-clinical user preferences
 * (e.g., UI toggles/theme). Rounds/patients/clinical state must use
 * `chrome.storage.local` (device-local) only.
 */

export const CLINICAL_STORAGE_KEYS = {
  ROUNDS_PATIENTS: 'operator_rounds_patients_v1',
  ROUNDS_CLINICIANS: 'operator_rounds_clinicians_v1',
  ROUNDS_HUD_STATE: 'rounds_hud_state'
} as const;

const CLINICAL_KEYS_SET = new Set<string>(Object.values(CLINICAL_STORAGE_KEYS));

export type ClinicalState = {
  roundsPatients?: RoundsPatient[];
  roundsClinicians?: Clinician[];
  roundsHudState?: HudPatientState | null;
};

const isDevBuild = (): boolean => {
  // Prefer explicit NODE_ENV since this repo already uses it elsewhere.
  const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
  return nodeEnv !== 'production';
};

const getChromeStorageLocal = () => {
  if (typeof chrome === 'undefined') return null;
  if (!chrome.storage?.local) return null;
  return chrome.storage.local;
};

const getChromeStorageSync = () => {
  if (typeof chrome === 'undefined') return null;
  if (!chrome.storage?.sync) return null;
  return chrome.storage.sync;
};

const getLocalStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
};

const toStoragePayload = (state: ClinicalState): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  if (state.roundsPatients !== undefined) payload[CLINICAL_STORAGE_KEYS.ROUNDS_PATIENTS] = state.roundsPatients;
  if (state.roundsClinicians !== undefined) payload[CLINICAL_STORAGE_KEYS.ROUNDS_CLINICIANS] = state.roundsClinicians;
  if (state.roundsHudState !== undefined) payload[CLINICAL_STORAGE_KEYS.ROUNDS_HUD_STATE] = state.roundsHudState;

  return payload;
};

export const installClinicalSyncWriteGuard = (): void => {
  const storageSync = getChromeStorageSync();
  if (!storageSync?.set) return;

  const guardFlag = '__operator_clinical_sync_write_guard_installed__';
  const globalAny = globalThis as any;
  if (globalAny[guardFlag]) return;
  globalAny[guardFlag] = true;

  const originalSet = storageSync.set.bind(storageSync);

  storageSync.set = ((items: Record<string, unknown>, callback?: () => void) => {
    const itemKeys = items && typeof items === 'object' ? Object.keys(items) : [];
    const forbidden = itemKeys.filter(key => CLINICAL_KEYS_SET.has(key));

    if (forbidden.length === 0) {
      return originalSet(items as any, callback as any);
    }

    const message =
      `[ClinicalStorage] BLOCKED write of clinical keys to chrome.storage.sync: ${forbidden.join(', ')}`;

    if (isDevBuild()) {
      throw new Error(message);
    }

    console.error(message);

    // Ensure we never write clinical keys to sync in production either.
    const filtered: Record<string, unknown> = { ...(items as any) };
    for (const key of forbidden) delete filtered[key];

    if (Object.keys(filtered).length === 0) {
      if (callback) queueMicrotask(callback);
      return Promise.resolve();
    }

    return originalSet(filtered as any, callback as any);
  }) as any;
};

export const getClinicalState = async (): Promise<ClinicalState> => {
  const keys: string[] = Object.values(CLINICAL_STORAGE_KEYS);

  // Prefer chrome.storage.local (extension context).
  const storageLocal = getChromeStorageLocal();
  if (storageLocal?.get) {
    try {
      const result = await storageLocal.get(keys);
      return {
        roundsPatients: (result?.[CLINICAL_STORAGE_KEYS.ROUNDS_PATIENTS] as RoundsPatient[]) || [],
        roundsClinicians: (result?.[CLINICAL_STORAGE_KEYS.ROUNDS_CLINICIANS] as Clinician[]) || [],
        roundsHudState: (result?.[CLINICAL_STORAGE_KEYS.ROUNDS_HUD_STATE] as HudPatientState | null) ?? null
      };
    } catch (error) {
      console.warn('⚠️ [ClinicalStorage] Failed to read from chrome.storage.local, falling back to localStorage', error);
    }
  }

  // Fallback: localStorage only when chrome.storage is unavailable (e.g., non-extension dev contexts).
  const ls = getLocalStorage();
  if (!ls) return { roundsPatients: [], roundsClinicians: [], roundsHudState: null };

  const readJson = <T>(key: string, fallback: T): T => {
    try {
      const raw = ls.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    roundsPatients: readJson<RoundsPatient[]>(CLINICAL_STORAGE_KEYS.ROUNDS_PATIENTS, []),
    roundsClinicians: readJson<Clinician[]>(CLINICAL_STORAGE_KEYS.ROUNDS_CLINICIANS, []),
    roundsHudState: readJson<HudPatientState | null>(CLINICAL_STORAGE_KEYS.ROUNDS_HUD_STATE, null)
  };
};

export const setClinicalState = async (state: ClinicalState): Promise<void> => {
  const payload = toStoragePayload(state);

  const storageLocal = getChromeStorageLocal();
  if (storageLocal?.set) {
    try {
      await storageLocal.set(payload as any);
      return;
    } catch (error) {
      console.warn('⚠️ [ClinicalStorage] Failed to write to chrome.storage.local, falling back to localStorage', error);
    }
  }

  const ls = getLocalStorage();
  if (!ls) return;
  for (const [key, value] of Object.entries(payload)) {
    ls.setItem(key, JSON.stringify(value));
  }
};

export const mergeClinicalState = async (partial: ClinicalState): Promise<ClinicalState> => {
  const current = await getClinicalState();
  const merged: ClinicalState = {
    roundsPatients: partial.roundsPatients ?? current.roundsPatients,
    roundsClinicians: partial.roundsClinicians ?? current.roundsClinicians,
    roundsHudState: partial.roundsHudState !== undefined ? partial.roundsHudState : current.roundsHudState
  };
  await setClinicalState(merged);
  return merged;
};

export const clearClinicalState = async (): Promise<void> => {
  const keys: string[] = Object.values(CLINICAL_STORAGE_KEYS);

  const storageLocal = getChromeStorageLocal();
  if (storageLocal?.remove) {
    try {
      await storageLocal.remove(keys);
    } catch (error) {
      console.warn('⚠️ [ClinicalStorage] Failed to remove from chrome.storage.local, falling back to localStorage', error);
    }
  }

  const ls = getLocalStorage();
  if (ls) {
    for (const key of keys) ls.removeItem(key);
  }
};

/**
 * One-time best-effort migration:
 * - Read known clinical keys from `chrome.storage.sync`
 * - Copy to `chrome.storage.local` (only when local is missing the key)
 * - Delete the migrated keys from `chrome.storage.sync`
 *
 * Safe to run multiple times.
 */
export const migrateClinicalStateFromSyncToLocal = async (): Promise<void> => {
  const storageSync = getChromeStorageSync();
  const storageLocal = getChromeStorageLocal();
  if (!storageSync?.get || !storageSync?.remove || !storageLocal?.get || !storageLocal?.set) return;

  const keys: string[] = Object.values(CLINICAL_STORAGE_KEYS);

  try {
    const [syncResult, localResult] = await Promise.all([
      storageSync.get(keys),
      storageLocal.get(keys)
    ]);

    const payloadToLocal: Record<string, unknown> = {};
    const keysToRemoveFromSync: string[] = [];

    for (const key of keys) {
      const syncValue = (syncResult as any)?.[key];
      const localValue = (localResult as any)?.[key];

      if (syncValue !== undefined) {
        keysToRemoveFromSync.push(key);
      }

      // Only migrate into local when local is missing; never overwrite local.
      if (localValue === undefined && syncValue !== undefined) {
        payloadToLocal[key] = syncValue;
      }
    }

    if (Object.keys(payloadToLocal).length > 0) {
      await storageLocal.set(payloadToLocal as any);
      console.log(`[ClinicalStorage] Migrated clinical keys from sync → local: ${Object.keys(payloadToLocal).join(', ')}`);
    }

    if (keysToRemoveFromSync.length > 0) {
      await storageSync.remove(keysToRemoveFromSync);
      console.log(`[ClinicalStorage] Removed legacy clinical keys from sync: ${keysToRemoveFromSync.join(', ')}`);
    }
  } catch (error) {
    console.warn('⚠️ [ClinicalStorage] Failed sync → local migration (best-effort)', error);
  }
};
