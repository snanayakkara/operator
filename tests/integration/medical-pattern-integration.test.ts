import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicalPatternService } from '@/utils/medical-text/MedicalPatternService';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';

vi.mock('@/utils/CacheManager', () => ({
  CacheManager: {
    getInstance: vi.fn(() => ({
      get: vi.fn(async () => ({ hit: false })),
      set: vi.fn(async () => {}),
    })),
  },
}));

vi.mock('@/utils/performance/PerformanceMonitor', () => {
  class MockMeasurement {
    setInputLength() { return this; }
    setPatternMatches() { return this; }
    setConfidenceScore() { return this; }
    setMedicalAccuracy() { return this; }
    setAustralianCompliance() { return this; }
    setError() { return this; }
    end() { return this; }
  }

  return {
    PerformanceMonitor: {
      getInstance: vi.fn(() => ({
        startMeasurement: vi.fn(() => new MockMeasurement()),
        startOperation: vi.fn(),
        endOperation: vi.fn(),
        recordError: vi.fn(),
      })),
    },
  };
});

vi.mock('@/utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Medical Text Processing (integration smoke)', () => {
  beforeEach(() => {
    (MedicalPatternService as any).instance = null;
    (ASRCorrectionEngine as any).instance = null;
  });

  it('extracts key interventional terms from PCI text', async () => {
    const service = MedicalPatternService.getInstance();
    const text = `
      Emergency primary PCI performed for acute anterior STEMI.
      Coronary angiography revealed 100% proximal LAD occlusion with TIMI 0 flow.
      Successful deployment of 3.0 x 28mm drug-eluting stent.
      Final result: TIMI 3 flow with <10% residual stenosis.
    `;

    const terms = await service.extractMedicalTerms(text, {
      domains: ['cardiology', 'anatomy', 'general'],
      extractionMode: 'comprehensive',
      preserveContext: false,
      includeUnits: true,
      semanticAnalysis: false,
      includeRelationships: false,
      australianCompliance: false,
    });

    const texts = terms.map(t => t.text.toUpperCase());
    expect(texts.some(t => t.includes('TIMI'))).toBe(true);
    expect(texts.some(t => t.includes('LAD'))).toBe(true);
  });

  it('applies ASR corrections without corrupting TIMI grading', async () => {
    const engine = ASRCorrectionEngine.getInstance();
    const input = 'TIMI flow III and TIMI 0 flow';
    const corrected = await engine.applyCorrections(input, { categories: ['cardiology'] });

    expect(corrected).toContain('TIMI');
    expect(corrected).toMatch(/TIMI\s+(flow\s+)?(0|I|II|III)/);
  });
});

