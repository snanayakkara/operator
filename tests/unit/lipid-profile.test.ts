import { describe, it, expect } from 'vitest';
import { parseLipidProfile, buildLipidMetadata } from '@/utils/LipidParser';
import { buildLipidInsightsContext, buildLipidInsightsSummary } from '@/utils/LipidInsights';
import { DEFAULT_LIPID_FRAMEWORK_ID, LIPID_OVERLAY_FRAMEWORKS } from '@/config/lipidOverlays';
import type { LipidChartSettings } from '@/types/LipidTypes';

const SAMPLE_TEXT = `
Bloods (22 Jul 2024): HbA1c 5.4%, Ferr 87, TChol 4.8, LDL 2.9, Cr 74, eGFR 74
Bloods (20 Mar 2025): TChol 7.5, LDL 5.2
Bloods (10 May 2025): TChol 4.9, LDL 3.4 (off statin)
Bloods (6 Aug 2025): TChol 6.4, LDL 4.1 (off statin)
`;

describe('Lipid parser', () => {
  it('parses LDL and TChol with therapy notes', () => {
    const result = parseLipidProfile(SAMPLE_TEXT);
    expect(result.readings).toHaveLength(4);
    const first = result.readings[0];
    expect(first.date).toBe('2024-07-22');
    expect(first.ldl).toBeCloseTo(2.9);
    expect(first.tchol).toBeCloseTo(4.8);
    const last = result.readings.at(-1)!;
    expect(last.therapyNote).toMatch(/off statin/i);
    expect(last.isPreTherapy).toBe(true);
    expect(result.metadata.baselineLDL).toBeDefined();
  });

  it('derives non-HDL when HDL present', () => {
    const text = `
Bloods (01 Jan 2025): LDL 2.1, Total Chol 4.0, HDL 1.2
`;
    const result = parseLipidProfile(text);
    expect(result.readings[0].nonHDL).toBeCloseTo(2.8);
  });

  it('handles malformed lines gracefully', () => {
    const text = `
Bloods (not a date): LDL 3.0, TChol 5.0
Bloods (02 Feb 2025): LDL foo
`;
    const result = parseLipidProfile(text);
    expect(result.readings).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Lipid insights', () => {
  const baseSettings: LipidChartSettings = {
    framework: DEFAULT_LIPID_FRAMEWORK_ID as 'au-practice',
    selectedBandId: 'secondary-prevention',
    selectedAnalytes: ['ldl', 'tchol'],
    timeFilter: '12m',
    ldlOnlyView: false,
    showTherapyBands: true
  };

  it('produces deltas and time-in-target summary', () => {
    const parsed = parseLipidProfile(SAMPLE_TEXT);
    const metadata = buildLipidMetadata(parsed.readings);
    const overlay = LIPID_OVERLAY_FRAMEWORKS[baseSettings.framework];
    const context = buildLipidInsightsContext(
      parsed.readings,
      metadata,
      overlay,
      baseSettings.selectedBandId,
      baseSettings.timeFilter,
      SAMPLE_TEXT
    );
    const summary = buildLipidInsightsSummary(context, overlay);
    expect(summary.latestSummary).toMatch(/Latest LDL/);
    expect(summary.timeInTarget).toMatch(/Time-in-target/);
    expect(summary.whyItMatters).toMatch(/relative ASCVD risk reduction/i);
  });

  it('classifies slope and therapy response', () => {
    const parsed = parseLipidProfile(SAMPLE_TEXT);
    const metadata = buildLipidMetadata(parsed.readings);
    const overlay = LIPID_OVERLAY_FRAMEWORKS[baseSettings.framework];
    const context = buildLipidInsightsContext(
      parsed.readings,
      metadata,
      overlay,
      baseSettings.selectedBandId,
      baseSettings.timeFilter,
      SAMPLE_TEXT
    );
    expect(context.slopeClassification).toBeTypeOf('string');
  });
});
