import { describe, it, expect } from 'vitest';
import { parseTTETrends } from './TTETrendParser';

const SET_A = `
TTE (15 Jan 2023): LVEDD 66, EF 45%, GLS-12, LAVI 25, normal valves
TTE (3 Mar 2025): normal LV size and function, LVEDD 52, LVEF 60, LAVI 27
TTE (2nd Sep 2025): LVEDD 51, EF 55, satisfactory valves, LAVI 19
`;

const SET_B = `
Stress Echo (13 Mar 2024): 8 minutes, 9.7 METs, normal LV size, LAVI 99, moderate-severe AR with flow reversal in ascending aorta, mild-moderate MR.
TTE (May 2024): moderate AR, mild-moderate MR, mildly dilated ascending aorta
TTE (January 2025): LVEDD 48, mod-sev AR (PHT 326), mild-mod MR, PASP 35+RA
TTE (10 Sep 2025): LVEDD 51, mod-sev AR (flow rev upper desc), mild-mod MR, PASP 26+RA
`;

const SET_C = `
Echo (29 Nov 2021, The Alfred): MPG 26 mmHg, DI 0.45, AVA 1.2, mild AR, SVI 51, normal systolic function
Echo (14th June 2022, Bayside Heart): MPG 23 mmHg, DI 0.32, mild AR, IVC 12 mm
Echo (4th April 2023, Bayside Heart): MPG 26 mmHg, DI 0.30, moderate AR, normal LV systolic function
Echo (14th Nov 2023, Bayside Heart): MPG 32 mmHg, DI 0.33, moderate AR, normal LV function
Echo (7th Feb 2025, Bayside Heart): MPG 17 mmHg, DI 0.46, mild AR, normal LV function
`;

describe('parseTTETrends', () => {
  it('parses numeric and qualitative EF with structural metrics', () => {
    const result = parseTTETrends(SET_A);
    expect(result.rows).toHaveLength(3);

    const [first, second, third] = result.rows;
    expect(first.lvef && first.lvef.type === 'numeric' ? first.lvef.value : null).toBe(45);
    expect(first.gls && first.gls.type === 'numeric' ? first.gls.value : null).toBe(-12);
    expect(second.lvef && second.lvef.type === 'numeric' ? second.lvef.value : null).toBe(60);
    expect(third.lavi && third.lavi.type === 'numeric' ? third.lavi.value : null).toBe(19);
  });

  it('captures stress echo events and PASP + RA ambiguity', () => {
    const result = parseTTETrends(SET_B);
    expect(result.rows).toHaveLength(4);
    const stress = result.rows.find(row => row.modality === 'stress-echo');
    expect(stress?.stressEchoDetails).toContain('9.7 METs');

    const paspRow = result.rows.find(row => row.pasp && row.pasp.type === 'text' && row.pasp.text.includes('35+RA'));
    expect(paspRow).toBeDefined();
    expect(paspRow?.trGradient && paspRow.trGradient.type === 'numeric' ? paspRow.trGradient.value : null).toBe(35);
    expect(paspRow?.trGradient?.flags).toContain('requires-rap');
    expect(result.warnings.some(warning => warning.includes('35+RA'))).toBe(true);
  });

  it('normalises dates, sites, and AS metrics', () => {
    const result = parseTTETrends(SET_C);
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0].site).toBe('The Alfred');
    expect(result.rows[1].site).toBe('Bayside Heart');

    const firstMpg = result.rows[0].avMpg && result.rows[0].avMpg.type === 'numeric' ? result.rows[0].avMpg.value : null;
    const finalAv = result.rows.at(-1)?.avMpg;
    const lastMpg = finalAv && finalAv.type === 'numeric' ? finalAv.value : null;
    expect(firstMpg).toBe(26);
    expect(lastMpg).toBe(17);

    const diValues = result.rows
      .map(row => (row.di && row.di.type === 'numeric' ? row.di.value : null))
      .filter((value): value is number => value !== null);
    expect(diValues).toContain(0.3);
  });
});
