/**
 * Common MBS (Medicare Benefits Schedule) codes for cardiology practice
 * Sorted by 'common' field - lower numbers = more frequently used
 * 
 * Categories:
 * - consult: Consultation and attendance items
 * - procedure: Procedural items (cath lab, interventional)
 * - inpatient: Inpatient-specific items
 * - other: Miscellaneous
 */

import { MBSCode } from '@/types/rounds.types';

// Re-export for convenience
export type { MBSCode } from '@/types/rounds.types';

export const MBS_CODES: MBSCode[] = [
  // ============================================================================
  // Consultations (most common)
  // ============================================================================
  { code: '110', description: 'Initial consultation - referred patient (rooms)', fee: 157.55, category: 'consult', common: 1 },
  { code: '116', description: 'Subsequent consultation (rooms)', fee: 78.80, category: 'consult', common: 2 },
  { code: '119', description: 'Minor subsequent consultation (rooms)', fee: 39.40, category: 'consult', common: 3 },
  { code: '132', description: 'Consultant physician attendance - inpatient', fee: 108.35, category: 'inpatient', common: 4 },
  { code: '133', description: 'Consultant physician attendance - inpatient (subsequent)', fee: 54.20, category: 'inpatient', common: 5 },

  // ============================================================================
  // Cardiology Procedures - Diagnostic
  // ============================================================================
  { code: '38200', description: 'Coronary angiography', fee: 535.55, category: 'procedure', common: 10 },
  { code: '38203', description: 'Coronary angiography with LV angiography', fee: 669.45, category: 'procedure', common: 11 },
  { code: '38206', description: 'Right heart catheterisation', fee: 401.65, category: 'procedure', common: 12 },
  { code: '38209', description: 'Combined left and right heart catheterisation', fee: 803.30, category: 'procedure', common: 13 },
  { code: '38212', description: 'Coronary angiography - graft study', fee: 669.45, category: 'procedure', common: 14 },

  // ============================================================================
  // Cardiology Procedures - Interventional (PCI)
  // ============================================================================
  { code: '38306', description: 'PCI - single vessel', fee: 1139.80, category: 'procedure', common: 20 },
  { code: '38309', description: 'PCI - additional vessel', fee: 455.90, category: 'procedure', common: 21 },
  { code: '38312', description: 'PCI with stent - single vessel', fee: 1481.70, category: 'procedure', common: 22 },
  { code: '38315', description: 'PCI with stent - additional vessel', fee: 592.70, category: 'procedure', common: 23 },

  // ============================================================================
  // Structural Heart
  // ============================================================================
  { code: '38350', description: 'TAVI (Transcatheter aortic valve implantation)', fee: 2500.00, category: 'procedure', common: 30 },
  { code: '38353', description: 'mTEER (Transcatheter mitral valve repair)', fee: 2500.00, category: 'procedure', common: 31 },
  { code: '38356', description: 'ASD/PFO closure', fee: 1200.00, category: 'procedure', common: 32 },
  { code: '38359', description: 'Left atrial appendage closure', fee: 1500.00, category: 'procedure', common: 33 },

  // ============================================================================
  // Pacemakers / Devices
  // ============================================================================
  { code: '38400', description: 'Permanent pacemaker insertion - single chamber', fee: 1200.00, category: 'procedure', common: 40 },
  { code: '38403', description: 'Permanent pacemaker insertion - dual chamber', fee: 1400.00, category: 'procedure', common: 41 },
  { code: '38406', description: 'ICD insertion', fee: 1800.00, category: 'procedure', common: 42 },
  { code: '38409', description: 'CRT-D insertion', fee: 2200.00, category: 'procedure', common: 43 },
  { code: '38412', description: 'Generator change', fee: 600.00, category: 'procedure', common: 44 },
  { code: '38415', description: 'Lead revision', fee: 800.00, category: 'procedure', common: 45 },

  // ============================================================================
  // Non-invasive Cardiology
  // ============================================================================
  { code: '11712', description: 'Transthoracic echocardiography (TTE)', fee: 246.80, category: 'procedure', common: 50 },
  { code: '11714', description: 'Transoesophageal echocardiography (TOE)', fee: 370.20, category: 'procedure', common: 51 },
  { code: '11721', description: 'Stress echocardiography', fee: 370.20, category: 'procedure', common: 52 },
  { code: '11700', description: 'ECG interpretation', fee: 22.50, category: 'other', common: 53 },
  { code: '11709', description: 'Holter monitoring - interpretation', fee: 72.90, category: 'other', common: 54 },

  // ============================================================================
  // Cardioversion / EP
  // ============================================================================
  { code: '38500', description: 'DC cardioversion', fee: 265.30, category: 'procedure', common: 60 },
  { code: '38503', description: 'EP study', fee: 1200.00, category: 'procedure', common: 61 },
  { code: '38506', description: 'Catheter ablation - simple', fee: 1600.00, category: 'procedure', common: 62 },
  { code: '38509', description: 'Catheter ablation - complex (AF)', fee: 2400.00, category: 'procedure', common: 63 },

  // ============================================================================
  // Telehealth
  // ============================================================================
  { code: '91822', description: 'Telehealth initial consultation', fee: 157.55, category: 'consult', common: 70 },
  { code: '91823', description: 'Telehealth subsequent consultation', fee: 78.80, category: 'consult', common: 71 },

  // ============================================================================
  // Inpatient Initiation
  // ============================================================================
  { code: '14224', description: 'Hospital initiation - complex (cardiac)', fee: 300.00, category: 'inpatient', common: 80 },
];

/**
 * Get MBS codes sorted by common usage (most common first)
 */
export const getMBSCodesSorted = (): MBSCode[] => {
  return [...MBS_CODES].sort((a, b) => (a.common ?? 999) - (b.common ?? 999));
};

/**
 * Search MBS codes by code or description
 */
export const searchMBSCodes = (query: string): MBSCode[] => {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return getMBSCodesSorted().slice(0, 10);
  
  return MBS_CODES.filter(mbs => 
    mbs.code.toLowerCase().includes(lowerQuery) ||
    mbs.description.toLowerCase().includes(lowerQuery)
  ).sort((a, b) => (a.common ?? 999) - (b.common ?? 999));
};

/**
 * Get MBS code by code string
 */
export const getMBSCodeByCode = (code: string): MBSCode | undefined => {
  return MBS_CODES.find(mbs => mbs.code === code);
};

/**
 * Get MBS codes by category
 */
export const getMBSCodesByCategory = (category: MBSCode['category']): MBSCode[] => {
  return MBS_CODES.filter(mbs => mbs.category === category)
    .sort((a, b) => (a.common ?? 999) - (b.common ?? 999));
};
