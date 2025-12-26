/**
 * Coronary Anatomy Hierarchy Constants
 * Defines the anatomical relationship between vessels and their branches
 * Used for lesion tree visualization and branch-to-vessel mapping
 */

export type VesselKey = 'lm' | 'lad' | 'lcx' | 'rca' | 'grafts';

export interface BranchDefinition {
  id: string;
  label: string;
  abbrevs: string[];  // All recognized abbreviations
  segments: string[]; // proximal, mid, distal
}

export interface VesselDefinition {
  key: VesselKey;
  label: string;
  abbrev: string;
  color: string;
  textColor: string;
  branches: BranchDefinition[];
}

/**
 * Complete coronary anatomy hierarchy
 * Defines vessels and their branches for proper lesion categorization
 */
export const CORONARY_ANATOMY: VesselDefinition[] = [
  {
    key: 'lm',
    label: 'Left Main',
    abbrev: 'LM',
    color: 'bg-amber-400',
    textColor: 'text-amber-700',
    branches: [
      {
        id: 'lm-trunk',
        label: 'Left Main Trunk',
        abbrevs: ['LM', 'LMCA', 'Left Main', 'left main'],
        segments: ['ostial', 'mid', 'distal']
      }
    ]
  },
  {
    key: 'lad',
    label: 'Left Anterior Descending',
    abbrev: 'LAD',
    color: 'bg-rose-400',
    textColor: 'text-rose-700',
    branches: [
      {
        id: 'lad-trunk',
        label: 'LAD',
        abbrevs: ['LAD', 'Left Anterior Descending', 'left anterior descending'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'd1',
        label: 'Diagonal 1',
        abbrevs: ['D1', 'Diag1', 'Diagonal 1', 'first diagonal', 'Diagonal'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'd2',
        label: 'Diagonal 2',
        abbrevs: ['D2', 'Diag2', 'Diagonal 2', 'second diagonal'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 's1',
        label: 'Septal 1',
        abbrevs: ['S1', 'Sept1', 'Septal 1', 'first septal', 'Septal'],
        segments: []
      },
      {
        id: 's2',
        label: 'Septal 2',
        abbrevs: ['S2', 'Sept2', 'Septal 2', 'second septal'],
        segments: []
      }
    ]
  },
  {
    key: 'lcx',
    label: 'Left Circumflex',
    abbrev: 'LCx',
    color: 'bg-sky-400',
    textColor: 'text-sky-700',
    branches: [
      {
        id: 'lcx-trunk',
        label: 'LCx',
        abbrevs: ['LCx', 'Cx', 'Circumflex', 'left circumflex', 'circ'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'om1',
        label: 'Obtuse Marginal 1',
        abbrevs: ['OM1', 'OM 1', 'OM-1', 'Obtuse Marginal 1', 'first obtuse marginal', 'OM'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'om2',
        label: 'Obtuse Marginal 2',
        abbrevs: ['OM2', 'OM 2', 'OM-2', 'Obtuse Marginal 2', 'second obtuse marginal'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'om3',
        label: 'Obtuse Marginal 3',
        abbrevs: ['OM3', 'OM 3', 'OM-3', 'Obtuse Marginal 3', 'third obtuse marginal'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'ramus',
        label: 'Ramus Intermedius',
        abbrevs: ['Ramus', 'RI', 'Ramus Intermedius', 'intermediate'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'lpl',
        label: 'Left Posterolateral',
        abbrevs: ['LPL', 'LPDA', 'Left Posterolateral'],
        segments: ['proximal', 'distal']
      }
    ]
  },
  {
    key: 'rca',
    label: 'Right Coronary Artery',
    abbrev: 'RCA',
    color: 'bg-emerald-400',
    textColor: 'text-emerald-700',
    branches: [
      {
        id: 'rca-trunk',
        label: 'RCA',
        abbrevs: ['RCA', 'Right Coronary', 'right coronary artery'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'am',
        label: 'Acute Marginal',
        abbrevs: ['AM', 'Acute Marginal', 'acute marginal'],
        segments: []
      },
      {
        id: 'pda',
        label: 'Posterior Descending',
        abbrevs: ['PDA', 'RPDA', 'Posterior Descending', 'posterior descending artery'],
        segments: ['proximal', 'distal']
      },
      {
        id: 'plv',
        label: 'Posterolateral',
        abbrevs: ['PLV', 'RPL', 'Posterolateral', 'posterolateral'],
        segments: []
      }
    ]
  },
  {
    key: 'grafts',
    label: 'Grafts',
    abbrev: 'Grafts',
    color: 'bg-indigo-400',
    textColor: 'text-indigo-700',
    branches: [
      {
        id: 'lima',
        label: 'LIMA',
        abbrevs: ['LIMA', 'Left Internal Mammary', 'LIMA to LAD'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'rima',
        label: 'RIMA',
        abbrevs: ['RIMA', 'Right Internal Mammary'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'svg',
        label: 'SVG',
        abbrevs: ['SVG', 'Saphenous Vein Graft', 'vein graft'],
        segments: ['proximal', 'mid', 'distal']
      },
      {
        id: 'radial',
        label: 'Radial Graft',
        abbrevs: ['Radial', 'radial graft', 'radial artery graft'],
        segments: ['proximal', 'mid', 'distal']
      }
    ]
  }
];

/**
 * Branch to parent vessel mapping for quick lookup
 * Maps branch abbreviations to their parent vessel key
 */
const BRANCH_TO_VESSEL_MAP: Map<string, VesselKey> = new Map();

// Build the map on module load
CORONARY_ANATOMY.forEach(vessel => {
  vessel.branches.forEach(branch => {
    branch.abbrevs.forEach(abbrev => {
      BRANCH_TO_VESSEL_MAP.set(abbrev.toLowerCase(), vessel.key);
    });
  });
});

/**
 * Get the parent vessel for a branch name
 * @param branchName - The branch name or abbreviation (e.g., "OM1", "D2", "proximal LAD")
 * @returns The vessel key (lm, lad, lcx, rca, grafts) or null if not found
 */
export function getParentVessel(branchName: string): VesselKey | null {
  const normalizedBranch = branchName.toLowerCase().trim();

  // Direct lookup
  if (BRANCH_TO_VESSEL_MAP.has(normalizedBranch)) {
    return BRANCH_TO_VESSEL_MAP.get(normalizedBranch)!;
  }

  // Check if any known abbreviation is contained in the branch name
  for (const vessel of CORONARY_ANATOMY) {
    for (const branch of vessel.branches) {
      for (const abbrev of branch.abbrevs) {
        const normalizedAbbrev = abbrev.toLowerCase();
        // Check both directions: branch contains abbrev, or abbrev contains branch
        if (normalizedBranch.includes(normalizedAbbrev) ||
            normalizedAbbrev.includes(normalizedBranch)) {
          return vessel.key;
        }
      }
    }
  }

  return null;
}

/**
 * Get vessel definition by key
 */
export function getVesselDefinition(vesselKey: VesselKey): VesselDefinition | null {
  return CORONARY_ANATOMY.find(v => v.key === vesselKey) ?? null;
}

/**
 * Get all branches for a vessel
 */
export function getVesselBranches(vesselKey: VesselKey): BranchDefinition[] {
  const vessel = CORONARY_ANATOMY.find(v => v.key === vesselKey);
  return vessel?.branches ?? [];
}

/**
 * Check if a lesion branch is misplaced under the wrong vessel
 * @param branch - The lesion branch name
 * @param currentVessel - The vessel the lesion is currently under
 * @returns Object with isMisplaced flag and correct vessel if misplaced
 */
export function checkLesionPlacement(
  branch: string,
  currentVessel: VesselKey
): { isMisplaced: boolean; correctVessel: VesselKey | null } {
  const expectedVessel = getParentVessel(branch);

  if (expectedVessel === null) {
    // Unknown branch - could be valid, not necessarily misplaced
    return { isMisplaced: false, correctVessel: null };
  }

  if (expectedVessel !== currentVessel) {
    return { isMisplaced: true, correctVessel: expectedVessel };
  }

  return { isMisplaced: false, correctVessel: null };
}

/**
 * Get all vessel keys
 */
export function getAllVesselKeys(): VesselKey[] {
  return CORONARY_ANATOMY.map(v => v.key);
}

/**
 * Validate that a vessel key is valid
 */
export function isValidVesselKey(key: string): key is VesselKey {
  return ['lm', 'lad', 'lcx', 'rca', 'grafts'].includes(key);
}
