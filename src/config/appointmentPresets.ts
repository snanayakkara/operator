export interface AppointmentPreset {
  id: string;
  displayName: string;
  itemCode: string;
  notes: string;
}

export const APPOINTMENT_PRESETS: AppointmentPreset[] = [
  {
    id: 'preset-116-fup-3mth',
    displayName: '116 + FUP 3mth',
    itemCode: '116',
    notes: 'Face to face follow up in 3 months please'
  },
  {
    id: 'preset-91824-fup-3mth',
    displayName: '91824 + FUP 3mth',
    itemCode: '91824',
    notes: 'TH follow up in 3 months please'
  }
];

export const getPresetById = (id: string): AppointmentPreset | undefined => {
  return APPOINTMENT_PRESETS.find(preset => preset.id === id);
};