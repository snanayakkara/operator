import { RoundsPatient } from '@/types/rounds.types';
import { isoNow } from '@/utils/rounds';

export interface NokCallListEntry {
  id: string;
  label: string;
  phone: string;
  relation?: string;
}

export interface NokCallListPayload {
  updated_at: string;
  entries: NokCallListEntry[];
}

const DEFAULT_EXPORT_PATH = '~/Library/Mobile Documents/com~apple~CloudDocs/Shortcuts/Operator/nok_calls.json';

const buildLabel = (patient: RoundsPatient): string => {
  const ward = patient.site?.trim();
  const bed = patient.bed?.trim();

  const tokens = (patient.name || '').trim().split(/\s+/).filter(Boolean);
  const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : tokens[0] || '';
  const firstInitial = tokens.length > 1 ? tokens[0]?.[0] : tokens[0]?.[0];
  const namePart = [firstInitial, lastName].filter(Boolean).join(' ').trim();

  const locationParts = [ward, bed ? `Bed ${bed}` : null].filter(Boolean);
  const parts = [...locationParts, namePart];
  return parts.filter(Boolean).join(' • ');
};

const buildPayload = (patients: RoundsPatient[]): NokCallListPayload => {
  const entries: NokCallListEntry[] = patients
    .filter(p => p.nextOfKin?.phone?.trim())
    .map(p => {
      const phone = p.nextOfKin!.phone.trim();
      const relation = p.nextOfKin!.relation?.trim();
      return {
        id: p.id,
        label: buildLabel(p),
        phone,
        ...(relation ? { relation } : {})
      } as NokCallListEntry;
    });

  return {
    updated_at: isoNow(),
    entries
  };
};

const downloadJson = async (payload: NokCallListPayload, filename: string): Promise<void> => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
      await chrome.downloads.download({
        url,
        filename,
        saveAs: false
      });
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const NokExportService = {
  exportList: async (patients: RoundsPatient[], targetPath = DEFAULT_EXPORT_PATH): Promise<void> => {
    const payload = buildPayload(patients);
    await downloadJson(payload, targetPath);
  }
};

export const NokExportUtils = {
  buildPayload
};
