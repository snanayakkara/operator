export interface WardRoundLayoutRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WardRoundLayoutDefinition {
  template_id: string;
  layout_version: number;
  image_width: number;
  image_height: number;
  regions: Record<string, WardRoundLayoutRegion>;
}

export const WARD_ROUND_LAYOUTS: Record<string, WardRoundLayoutDefinition> = {
  ward_round_v1: {
    template_id: 'ward_round_v1',
    layout_version: 1,
    image_width: 1668,
    image_height: 2388,
    regions: {
      patient_id: { x: 80, y: 60, width: 1500, height: 150 },
      obs: { x: 80, y: 260, width: 1500, height: 260 },
      bloods: { x: 80, y: 560, width: 1500, height: 260 },
      imaging: { x: 80, y: 860, width: 1500, height: 260 },
      meds: { x: 80, y: 1160, width: 1500, height: 260 },
      plan: { x: 80, y: 1460, width: 1500, height: 360 }
    }
  }
};
