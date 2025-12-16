export type LesionEntry = {
  id: string;
  branch: string;
  severity: string;
  description: string;
};

export type LesionTree = {
  lm: LesionEntry[];
  lad: LesionEntry[];
  lcx: LesionEntry[];
  rca: LesionEntry[];
  grafts: LesionEntry[];
};

const VESSEL_LABELS: Record<keyof LesionTree, string> = {
  lm: 'LM (left main)',
  lad: 'LAD (left anterior descending)',
  lcx: 'LCx (left circumflex)',
  rca: 'RCA (right coronary artery)',
  grafts: 'Grafts'
};

const BRANCH_KEYWORDS = [
  { regex: /diagonal\s*[\d]*/i, label: 'Diagonal' },
  { regex: /\bD(\d)/i, label: 'D$1' },
  { regex: /ramus/i, label: 'Ramus' },
  { regex: /septal/i, label: 'Septal' },
  { regex: /obtuse\s*marginal\s*\d*/i, label: 'Obtuse marginal' },
  { regex: /\bOM\s*\d*/i, label: 'OM' },
  { regex: /posterior\s*descending|PDA/i, label: 'PDA' },
  { regex: /posterolateral|PLV/i, label: 'PLV' },
  { regex: /graft/i, label: 'Graft' }
];

const defaultTree = (): LesionTree => ({
  lm: [],
  lad: [],
  lcx: [],
  rca: [],
  grafts: []
});

const cleanLine = (text: string): string => text.replace(/^[\s-•]+/, '').trim();

const detectBranch = (text: string, vesselLabel: string): string => {
  for (const matcher of BRANCH_KEYWORDS) {
    const match = text.match(matcher.regex);
    if (match) {
      return matcher.label.includes('$1') && match[1] ? matcher.label.replace('$1', match[1]) : matcher.label;
    }
  }
  return vesselLabel;
};

const detectSeverity = (text: string): string => {
  const percent = text.match(/(\d+)\s*%/);
  if (percent) {
    return `${percent[1]}% stenosis`;
  }
  const adjectives = ['no significant stenosis', 'mild', 'moderate', 'severe', 'occluded', 'chronic total occlusion', 'calcified', 'normal'];
  const found = adjectives.find(adj => text.toLowerCase().includes(adj));
  return found ? found : '';
};

const mapHeadingToVessel = (heading: string): keyof LesionTree | null => {
  const normalized = heading.toUpperCase();
  if (normalized.includes('LM')) return 'lm';
  if (normalized.includes('LEFT MAIN')) return 'lm';
  if (normalized.includes('LAD') || normalized.includes('ANTERIOR')) return 'lad';
  if (normalized.includes('LCX') || normalized.includes('CIRCUMFLEX')) return 'lcx';
  if (normalized.includes('RCA') || normalized.includes('RIGHT CORONARY')) return 'rca';
  if (normalized.includes('GRAFT')) return 'grafts';
  return null;
};

const extractFindingsSection = (report: string): string => {
  const findingsMatch = report.match(/\*\*FINDINGS\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z ]+\*\*|$)/i);
  if (findingsMatch && findingsMatch[1]) {
    return findingsMatch[1].trim();
  }
  return report;
};

const parseSectionIntoLesions = (sectionText: string, vessel: keyof LesionTree): LesionEntry[] => {
  const vesselLabel = VESSEL_LABELS[vessel];
  const segments = sectionText
    .split(/(?:\.\s+|\?\s+|!\s+|\n+)/)
    .map(segment => cleanLine(segment))
    .filter(Boolean);

  if (segments.length === 0 && sectionText.trim()) {
    segments.push(cleanLine(sectionText));
  }

  return segments.map((segment) => ({
    id: Math.random().toString(36).slice(2, 8),
    branch: detectBranch(segment, vesselLabel),
    severity: detectSeverity(segment),
    description: segment
  }));
};

export const parseLesionTreeFromReport = (report: string): LesionTree => {
  const findingsText = extractFindingsSection(report);
  const tree = defaultTree();

  const subsectionRegex = /\*\*\s*([A-Za-z0-9\s()/-]+?)\s*\*\*\s*([\s\S]*?)(?=\n\*\*|$)/g;
  let match: RegExpExecArray | null;

  while ((match = subsectionRegex.exec(findingsText)) !== null) {
    const heading = match[1];
    const content = match[2]?.trim() || '';
    const vesselKey = mapHeadingToVessel(heading);
    if (vesselKey) {
      tree[vesselKey] = parseSectionIntoLesions(content, vesselKey);
    }
  }

  return tree;
};

export const formatLesionTree = (tree: LesionTree): string => {
  const vesselOrder: (keyof LesionTree)[] = ['lm', 'lad', 'lcx', 'rca', 'grafts'];

  return vesselOrder
    .map((vessel) => {
      const lesions = tree[vessel] || [];
      const label = VESSEL_LABELS[vessel];

      if (!lesions.length) {
        return `**${label}**\n- No significant stenosis.`;
      }

      const lines = lesions.map((lesion) => {
        const parts = [lesion.branch, lesion.severity, lesion.description]
          .map(part => part?.trim())
          .filter(Boolean);
        return `- ${parts.join(' — ')}`;
      });

      return `**${label}**\n${lines.join('\n')}`;
    })
    .join('\n\n');
};

export const replaceFindingsSection = (report: string, newFindings: string): string => {
  const findingsRegex = /(\*\*FINDINGS\*\*\s*)([\s\S]*?)(?=(\n\*\*[A-Z ]+\*\*)|$)/i;
  if (findingsRegex.test(report)) {
    return report.replace(findingsRegex, `$1${newFindings}\n\n`);
  }
  // If no explicit findings heading, append it
  return `${report.trim()}\n\n**FINDINGS**\n${newFindings}`;
};

export const createEmptyLesionTree = defaultTree;
