/**
 * Unit tests for unified action search/ranking
 */

import { describe, it, expect } from 'vitest';
import { searchActions } from '../../src/config/unifiedActionsConfig';

describe('searchActions', () => {
  it('should match by alias (e.g. RHC)', () => {
    const [first] = searchActions('rhc');
    expect(first?.id).toBe('right-heart-cath');
  });

  it('should match by label tokens (e.g. Ward List)', () => {
    const [first] = searchActions('ward');
    expect(first?.id).toBe('ward-list');
  });

  it('should match by alias substring (e.g. Angio)', () => {
    const [first] = searchActions('angio');
    expect(first?.id).toBe('angiogram-pci');
  });

  it('should match multi-token queries (e.g. Pt Ed)', () => {
    const [first] = searchActions('pt ed');
    expect(first?.id).toBe('patient-education');
  });
});

