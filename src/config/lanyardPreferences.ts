export const LANYARD_CARD_TEXTURE_KEY = 'ui_preferences_lanyard_card_texture';

export const MAX_LANYARD_TEXTURE_SIZE_BYTES = 1024 * 1024 * 2; // 2MB limit to keep storage lean

export interface LanyardTexturePreference {
  dataUrl: string;
  fileName?: string;
  updatedAt: number;
}

export function createLanyardTexturePreference(dataUrl: string, fileName?: string): LanyardTexturePreference {
  return {
    dataUrl,
    fileName,
    updatedAt: Date.now()
  };
}

export function parseLanyardTexturePreference(value: unknown): LanyardTexturePreference | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const pref = value as Partial<LanyardTexturePreference>;

  if (typeof pref.dataUrl !== 'string' || pref.dataUrl.trim().length === 0) {
    return null;
  }

  return {
    dataUrl: pref.dataUrl,
    fileName: typeof pref.fileName === 'string' ? pref.fileName : undefined,
    updatedAt: typeof pref.updatedAt === 'number' ? pref.updatedAt : Date.now()
  };
}
