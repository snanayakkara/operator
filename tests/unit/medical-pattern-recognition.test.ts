import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MedicalPatternService } from '@/utils/medical-text/MedicalPatternService';
import { ContextualMedicalAnalyzer } from '@/utils/medical-text/ContextualMedicalAnalyzer';
import { MedicalTerminologyDisambiguator } from '@/utils/medical-text/MedicalTerminologyDisambiguator';
import { MedicalKnowledgeGraph } from '@/utils/medical-text/MedicalKnowledgeGraph';
import { MedicalConfidenceScorer } from '@/utils/medical-text/MedicalConfidenceScorer';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';

vi.mock('@/utils/CacheManager', () => ({
  CacheManager: {
    getInstance: vi.fn(() => ({
      // Some callers expect `{ hit, data }` (e.g., MedicalConfidenceScorer); others expect a raw value.
      get: vi.fn(async () => ({ hit: false, data: null })),
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
        startOperation: vi.fn(() => 'op'),
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

describe('Medical Pattern Recognition (smoke)', () => {
  beforeEach(() => {
    (MedicalPatternService as any).instance = null;
    (ContextualMedicalAnalyzer as any).instance = null;
    (MedicalTerminologyDisambiguator as any).instance = null;
    (MedicalKnowledgeGraph as any).instance = null;
    (MedicalConfidenceScorer as any).instance = null;
    (ASRCorrectionEngine as any).instance = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('extracts key interventional terms (TIMI/LAD) from PCI text', async () => {
    const service = MedicalPatternService.getInstance();
    const text = `
      Emergency primary PCI performed for acute anterior STEMI.
      Coronary angiography revealed 100% proximal LAD occlusion with TIMI 0 flow.
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

    const upper = terms.map(t => t.text.toUpperCase());
    expect(upper.some(t => t.includes('TIMI'))).toBe(true);
    expect(upper.some(t => t.includes('LAD'))).toBe(true);
  });

  it('produces a clinical reasoning analysis object', async () => {
    const analyzer = ContextualMedicalAnalyzer.getInstance();
    const text = 'Patient presents with chest pain and ECG suggests STEMI. Plan: urgent coronary angiography.';
    const result = await analyzer.analyzeClinicalReasoning(text, { detailLevel: 'basic' });

    expect(result).toBeDefined();
    expect(Array.isArray(result.patterns)).toBe(true);
    expect(typeof result.overallConfidence).toBe('number');
  });

  it('disambiguates common cardiology acronyms', async () => {
    const disambiguator = MedicalTerminologyDisambiguator.getInstance();
    const result = await disambiguator.disambiguateTerm(
      'MI',
      'Patient presents with chest pain and elevated troponin consistent with MI.'
    );

    expect(result.originalTerm).toBe('MI');
    expect(result.disambiguatedTerm.toLowerCase()).toContain('myocardial');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.domain).toBe('cardiology');
  });

  it('calculates a similarity score for related concepts', async () => {
    const graph = MedicalKnowledgeGraph.getInstance();
    const similarity = await graph.calculateConceptSimilarity('myocardial infarction', 'heart attack');

    expect(similarity).toBeDefined();
    expect(typeof similarity.similarity).toBe('number');
    expect(similarity.similarity).toBeGreaterThanOrEqual(0);
    expect(similarity.similarity).toBeLessThanOrEqual(1);
  });

  it('validates medical accuracy without throwing', async () => {
    const scorer = MedicalConfidenceScorer.getInstance();
    const result = await scorer.validateMedicalAccuracy('EF 55%. BP 120/70 mmHg. TIMI 3 flow achieved.', {
      enableFactualAccuracyCheck: true,
    } as any);

    expect(result).toBeDefined();
    expect(typeof result.isValid).toBe('boolean');
    expect(result.confidence).toBeDefined();
  });

  it('applies ASR corrections while preserving TIMI grading', async () => {
    const engine = ASRCorrectionEngine.getInstance();
    const input = 'TIMI flow III and TIMI 0 flow';
    const corrected = await engine.applyCorrections(input, { categories: ['cardiology'] });

    expect(corrected).toContain('TIMI');
    expect(corrected).toMatch(/TIMI\s+(flow\s+)?(0|I|II|III)/);
  });
});
