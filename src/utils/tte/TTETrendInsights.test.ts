import { describe, it, expect } from 'vitest';
import { parseTTETrends } from './TTETrendParser';
import { buildTTEInsightsSummary } from './TTETrendInsights';

const SET_A = `
TTE (15 Jan 2023): LVEDD 66, EF 45%, GLS-12, LAVI 25, normal valves
TTE (3 Mar 2025): normal LV size and function, LVEDD 52, LVEF 60, LAVI 27
TTE (2nd Sep 2025): LVEDD 51, EF 55, satisfactory valves, LAVI 19
`;

const SET_B = `
TTE (January 2025): LVEDD 48, mod-sev AR (PHT 326), mild-mod MR, PASP 35+RA
TTE (10 Sep 2025): LVEDD 51, mod-sev AR (flow rev upper desc), mild-mod MR, PASP 26+RA
`;

const SET_C = `
Echo (29 Nov 2021, The Alfred): MPG 26 mmHg, DI 0.45, AVA 1.2, mild AR, SVI 51, normal systolic function
Echo (14th June 2022, Bayside Heart): MPG 23 mmHg, DI 0.32, mild AR, IVC 12 mm
Echo (7th Feb 2025, Bayside Heart): MPG 17 mmHg, DI 0.46, mild AR, normal LV function
`;

describe('buildTTEInsightsSummary', () => {
  it('summarises EF trajectory and threshold crossings', () => {
    const rows = parseTTETrends(SET_A).rows;
    const summary = buildTTEInsightsSummary(rows);
    expect(summary.headline).toContain('Latest EF 55%');
    expect(summary.metrics.find(metric => metric.field === 'lvef')?.deltaFromBaseline).toContain('%');
    expect(summary.thresholds).toContain('LVEF crossed 50% (HFpEF boundary)');
  });

  it('flags PASP + RA ambiguity in data quality', () => {
    const rows = parseTTETrends(SET_B).rows;
    const summary = buildTTEInsightsSummary(rows);
    expect(summary.dataQuality.ambiguousFindings.some(item => item.includes('PASP 35+RA'))).toBe(true);
  });

  it('notes inter-lab variability in data quality', () => {
    const rows = parseTTETrends(SET_C).rows;
    const summary = buildTTEInsightsSummary(rows);
    expect(summary.dataQuality.interLabChanges).toContain('Site variability noted');
  });
});

