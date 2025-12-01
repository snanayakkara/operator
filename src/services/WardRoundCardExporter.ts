import { RoundsPatient } from '@/types/rounds.types';
import { isoNow } from '@/utils/rounds';
import { DEFAULT_WARD_ROUND_ROOT, getWardExportsRoot } from '@/wardround/paths';
import { WARD_ROUND_LAYOUTS, WardRoundLayoutDefinition } from '@/wardround/ward_round_layouts';

export interface WardRoundExportMeta {
  roundId: string;
  ward: string;
  consultant: string;
  templateId?: string;
  layoutVersion?: number;
  exportedAt?: string;
}

export interface WardRoundExportResult {
  success: boolean;
  message: string;
  filesSaved: string[];
  errors: string[];
}

const pickNameParts = (fullName: string) => {
  const tokens = fullName.trim().split(/\s+/);
  if (tokens.length === 1) {
    return { first: tokens[0], last: tokens[0] };
  }
  const last = tokens.slice(-1).join(' ');
  const first = tokens.slice(0, -1).join(' ');
  return { first, last };
};

const buildFilename = (patient: RoundsPatient, meta: WardRoundExportMeta) => {
  const patientId = patient.mrn?.trim() || patient.id;
  const { first, last } = pickNameParts(patient.name || 'Unknown');
  const safe = (str: string) => str.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');
  return `${safe(patientId)}_${safe(last).toUpperCase()}_${safe(first).toUpperCase()}_${safe(meta.roundId)}_${meta.templateId || 'ward_round_v1'}.png`;
};

const downloadBlob = async (blob: Blob, filename: string) => {
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

const drawCard = (patient: RoundsPatient, meta: WardRoundExportMeta, layout: WardRoundLayoutDefinition): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = layout.image_width;
  canvas.height = layout.image_height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 32px "Helvetica Neue", Helvetica, Arial, sans-serif';
  const patientId = patient.mrn?.trim() || patient.id;
  const header = `${patientId} – ${patient.name || 'Unknown'} – ${meta.roundId} – ${meta.ward}`;
  ctx.fillText(header, layout.regions.patient_id.x + 10, layout.regions.patient_id.y + 50);
  ctx.font = '20px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText(`Consultant: ${meta.consultant || '—'}`, layout.regions.patient_id.x + 10, layout.regions.patient_id.y + 90);

  // Region boxes with labels
  const labelMap: Record<string, string> = {
    obs: 'Observations',
    bloods: 'Bloods / Pathology',
    imaging: 'Imaging',
    meds: 'Medications',
    plan: 'Plan'
  };

  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 2;
  ctx.font = '18px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#4b5563';

  Object.entries(layout.regions).forEach(([key, rect]) => {
    if (key === 'patient_id') return;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    const label = labelMap[key] || key;
    ctx.fillText(label, rect.x + 12, rect.y + 28);
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

export class WardRoundCardExporter {
  private layout: WardRoundLayoutDefinition;

  constructor() {
    this.layout = WARD_ROUND_LAYOUTS['ward_round_v1'];
  }

  public async exportRound(patients: RoundsPatient[], meta: WardRoundExportMeta): Promise<WardRoundExportResult> {
    const roundId = meta.roundId.trim();
    if (!roundId) {
      return { success: false, message: 'Round ID required', filesSaved: [], errors: ['Round ID missing'] };
    }
    const exportedAt = meta.exportedAt || isoNow();
    const basePath = getWardExportsRoot(roundId, { icloudRoot: '', wardRoundRoot: DEFAULT_WARD_ROUND_ROOT });
    const templateId = meta.templateId || 'ward_round_v1';

    const roundJson = {
      round_id: roundId,
      created_at: exportedAt,
      exported_at: exportedAt,
      ward: meta.ward,
      consultant: meta.consultant,
      patient_count: patients.length,
      template_id: templateId,
      layout_version: meta.layoutVersion || this.layout.layout_version
    };

    const filesSaved: string[] = [];
    const errors: string[] = [];

    // Save round.json
    try {
      const blob = new Blob([JSON.stringify(roundJson, null, 2)], { type: 'application/json' });
      await downloadBlob(blob, `${basePath}/round.json`);
      filesSaved.push(`${basePath}/round.json`);
    } catch (err) {
      errors.push(`round.json: ${(err as Error).message}`);
    }

    for (const patient of patients) {
      try {
        const png = await drawCard(patient, { ...meta, roundId, templateId }, this.layout);
        const filename = buildFilename(patient, { ...meta, roundId, templateId });
        await downloadBlob(png, `${basePath}/${filename}`);
        filesSaved.push(`${basePath}/${filename}`);
      } catch (err) {
        errors.push(`${patient.name || patient.id}: ${(err as Error).message}`);
      }
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? `Exported ${filesSaved.length} files to ${basePath}` : 'Export completed with errors',
      filesSaved,
      errors
    };
  }
}
