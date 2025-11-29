export type ProcedureChecklistKey = 'post-cardiac-surgery';

export interface ProcedureChecklistItem {
  text: string;
  day: number; // Day offset from procedure date (0 = day of)
}

export interface ProcedureChecklist {
  key: ProcedureChecklistKey;
  label: string;
  items: ProcedureChecklistItem[];
}

export const PROCEDURE_CHECKLISTS: ProcedureChecklist[] = [
  {
    key: 'post-cardiac-surgery',
    label: 'Post cardiac surgery',
    items: [
      { text: 'Remove IDC (Day 2)', day: 2 },
      { text: 'Remove ICC (Day 2)', day: 2 },
      { text: 'Remove CVC (Day 3)', day: 3 },
      { text: 'Remove pacing wires (Day 4)', day: 4 },
      { text: 'Repeat bloods and CXR (Day 5)', day: 5 }
    ]
  }
];
