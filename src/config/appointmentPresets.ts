export interface AppointmentPreset {
  id: string;
  displayName: string;
  itemCode: string;
  notes: string;
}

// Matrix configuration for building custom appointments
export type AppointmentComplexity = 'simple' | 'complex';
export type AppointmentModality = 'f2f' | 'telehealth';
export type AppointmentType = 'new' | 'review';
export type FollowUpPeriod = '3mth' | '12mth' | 'none';

export interface AppointmentMatrix {
  complexity: AppointmentComplexity;
  modality: AppointmentModality;
  type: AppointmentType;
  followUp: FollowUpPeriod;
}

// Item code mapping based on appointment characteristics
export const getItemCodeFromMatrix = (matrix: AppointmentMatrix): string => {
  const { complexity, modality, type } = matrix;
  
  // Face to face appointments
  if (modality === 'f2f') {
    if (complexity === 'simple') {
      return type === 'new' ? '110' : '116'; // Simple F2F: New=110, Review=116
    } else {
      return type === 'new' ? '132' : '133'; // Complex F2F: New=132, Review=133
    }
  }
  
  // Telehealth appointments
  if (modality === 'telehealth') {
    if (complexity === 'simple') {
      return type === 'new' ? '91824' : '91825'; // Simple TH: New=91824, Review=91825
    } else {
      return type === 'new' ? '92422' : '92423'; // Complex TH: New=92422, Review=92423
    }
  }
  
  return '116'; // Default fallback
};

export const getNotesFromMatrix = (matrix: AppointmentMatrix): string => {
  const { modality, followUp } = matrix;
  
  if (followUp === 'none') {
    return 'no follow up required';
  }
  
  const modalityText = modality === 'f2f' ? 'F2F' : 'TH';
  const periodText = followUp === '3mth' ? '3 months' : '12 months';
  
  return `${modalityText} follow up in ${periodText} please`;
};

export const generatePresetFromMatrix = (matrix: AppointmentMatrix): AppointmentPreset => {
  const itemCode = getItemCodeFromMatrix(matrix);
  const notes = getNotesFromMatrix(matrix);
  
  // Generate display name
  const complexityText = matrix.complexity === 'complex' ? 'complex ' : '';
  const typeText = matrix.type;
  const modalityText = matrix.modality === 'f2f' ? 'F2F' : 'TH';
  const followUpText = matrix.followUp === 'none' ? 'no FUP' : 
                       matrix.followUp === '3mth' ? 'FUP 3mth' : 'FUP 12mth';
  
  const displayName = `${complexityText}${typeText} ${modalityText} + ${followUpText}`;
  
  return {
    id: `matrix-${itemCode}-${followUpText.replace(/\s+/g, '-')}`,
    displayName,
    itemCode,
    notes
  };
};

// Common quick presets for frequent use cases
export const APPOINTMENT_PRESETS: AppointmentPreset[] = [
  {
    id: 'preset-116-fup-3mth',
    displayName: 'Simple F2F Review + 3mth',
    itemCode: '116',
    notes: 'F2F follow up in 3 months please'
  },
  {
    id: 'preset-91825-fup-3mth',
    displayName: 'Simple TH Review + 3mth',
    itemCode: '91825',
    notes: 'TH follow up in 3 months please'
  },
  {
    id: 'preset-23-fup-3mth',
    displayName: 'Simple F2F New + 3mth',
    itemCode: '110',
    notes: 'F2F follow up in 3 months please'
  },
  {
    id: 'preset-91824-fup-3mth',
    displayName: 'Simple TH New + 3mth',
    itemCode: '91824',
    notes: 'TH follow up in 3 months please'
  },
  {
    id: 'preset-92423-fup-3mth',
    displayName: 'Complex TH Review + 3mth',
    itemCode: '92423',
    notes: 'TH follow up in 3 months please'
  },
  {
    id: 'preset-132-fup-3mth',
    displayName: 'Complex F2F New + 3mth',
    itemCode: '132',
    notes: 'F2F follow up in 3 months please'
  }
];

export const getPresetById = (id: string): AppointmentPreset | undefined => {
  return APPOINTMENT_PRESETS.find(preset => preset.id === id);
};