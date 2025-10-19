import type { LipidOverlayConfig } from '@/types/LipidTypes';

export const LIPID_OVERLAY_FRAMEWORKS: Record<string, LipidOverlayConfig> = {
  'au-practice': {
    id: 'au-practice',
    name: 'AU Practice',
    description: 'Australian clinical practice (secondary prevention default, optional primary target).',
    allowCustomPrimaryTarget: true,
    bands: [
      {
        id: 'secondary-prevention',
        label: 'Secondary prevention (LDL <1.8 mmol/L)',
        threshold: 1.8,
        description: 'Australian practice common target for established ASCVD.'
      },
      {
        id: 'primary-custom',
        label: 'Primary prevention (clinician-set target)',
        threshold: 2.0,
        description: 'Default <2.0 mmol/L for high-risk primary prevention (editable).'
      }
    ]
  },
  'esc-eas': {
    id: 'esc-eas',
    name: 'ESC/EAS 2019',
    description: 'European Society of Cardiology / Atherosclerosis Society targets.',
    bands: [
      {
        id: 'very-high',
        label: 'Very-high risk (LDL <1.4 mmol/L + ≥50% reduction)',
        threshold: 1.4,
        percentReduction: 50,
        description: 'Use for clinical ASCVD, diabetes with organ damage, severe CKD.'
      },
      {
        id: 'high-risk',
        label: 'High risk (LDL <1.8 mmol/L)',
        threshold: 1.8,
        percentReduction: 50,
        description: 'Marked risk factors or familial hypercholesterolaemia.'
      },
      {
        id: 'moderate-risk',
        label: 'Moderate risk (LDL <2.6 mmol/L)',
        threshold: 2.6,
        description: 'Primary prevention moderate risk cohorts.'
      }
    ]
  }
} satisfies Record<string, LipidOverlayConfig>;

export const DEFAULT_LIPID_FRAMEWORK_ID = 'au-practice';
export const DEFAULT_LIPID_BAND_ID = 'secondary-prevention';

