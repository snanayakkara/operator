/**
 * Unit tests for Stage Taxonomy (B7)
 * Tests the controlled vocabulary for DSPy pipeline stages
 */
import { describe, it, expect } from 'vitest';
import {
  STAGES,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  STAGE_ICONS,
  STAGE_PROGRESS_RANGES,
  parseServerStage,
  stageToPipelineStage,
  pipelineStageToStageName,
  createProgressEvent,
  isValidStageName,
} from '@/types/progress.types';

describe('Stage Taxonomy (B7)', () => {
  describe('STAGES constant', () => {
    it('has exactly 8 stages in correct order', () => {
      expect(STAGES).toEqual([
        'collecting',
        'transcribing',
        'extracting',
        'reasoning',
        'formatting',
        'validating',
        'inserting',
        'complete',
      ]);
    });

    it('all stages have labels', () => {
      for (const stage of STAGES) {
        expect(STAGE_LABELS[stage]).toBeDefined();
        expect(typeof STAGE_LABELS[stage]).toBe('string');
        expect(STAGE_LABELS[stage].length).toBeGreaterThan(0);
      }
    });

    it('all stages have descriptions', () => {
      for (const stage of STAGES) {
        expect(STAGE_DESCRIPTIONS[stage]).toBeDefined();
        expect(typeof STAGE_DESCRIPTIONS[stage]).toBe('string');
      }
    });

    it('all stages have icons', () => {
      for (const stage of STAGES) {
        expect(STAGE_ICONS[stage]).toBeDefined();
        expect(typeof STAGE_ICONS[stage]).toBe('string');
      }
    });

    it('all stages have progress ranges as [min, max] tuples', () => {
      for (const stage of STAGES) {
        const range = STAGE_PROGRESS_RANGES[stage];
        expect(range).toBeDefined();
        expect(Array.isArray(range)).toBe(true);
        expect(range).toHaveLength(2);
        const [min, max] = range;
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(100);
        expect(min).toBeLessThanOrEqual(max);
      }
    });

    it('progress ranges are in ascending order', () => {
      const ranges = STAGES.map(s => STAGE_PROGRESS_RANGES[s]);
      for (let i = 1; i < ranges.length; i++) {
        // Each stage should start at or after the previous stage
        expect(ranges[i][0]).toBeGreaterThanOrEqual(ranges[i - 1][0]);
      }
    });
  });

  describe('isValidStageName', () => {
    it('returns true for valid stage names', () => {
      for (const stage of STAGES) {
        expect(isValidStageName(stage)).toBe(true);
      }
    });

    it('returns false for invalid stage names', () => {
      expect(isValidStageName('unknown')).toBe(false);
      expect(isValidStageName('')).toBe(false);
      expect(isValidStageName('foobar')).toBe(false);
    });
  });

  describe('parseServerStage', () => {
    it('returns valid stage names unchanged', () => {
      for (const stage of STAGES) {
        expect(parseServerStage(stage)).toBe(stage);
      }
    });

    it('maps legacy phase names to stages', () => {
      expect(parseServerStage('audio-processing')).toBe('collecting');
      expect(parseServerStage('transcribing')).toBe('transcribing');
      expect(parseServerStage('ai-analysis')).toBe('reasoning');
      expect(parseServerStage('generation')).toBe('reasoning'); // Note: generation maps to reasoning in aliases
    });

    it('handles case-insensitive matching', () => {
      expect(parseServerStage('COLLECTING')).toBe('collecting');
      expect(parseServerStage('Reasoning')).toBe('reasoning');
      expect(parseServerStage('COMPLETE')).toBe('complete');
    });

    it('returns reasoning as fallback for unknown stages', () => {
      expect(parseServerStage('unknown')).toBe('reasoning');
      expect(parseServerStage('foobar')).toBe('reasoning');
    });

    it('maps common aliases correctly', () => {
      expect(parseServerStage('done')).toBe('complete');
      expect(parseServerStage('finished')).toBe('complete');
      expect(parseServerStage('init')).toBe('collecting');
      expect(parseServerStage('asr')).toBe('transcribing');
      expect(parseServerStage('whisper')).toBe('transcribing');
      expect(parseServerStage('thinking')).toBe('reasoning');
    });
  });

  describe('stageToPipelineStage', () => {
    it('maps collecting to audio-processing', () => {
      expect(stageToPipelineStage('collecting')).toBe('audio-processing');
    });

    it('maps transcribing to transcribing', () => {
      expect(stageToPipelineStage('transcribing')).toBe('transcribing');
    });

    it('maps extracting to ai-analysis', () => {
      expect(stageToPipelineStage('extracting')).toBe('ai-analysis');
    });

    it('maps reasoning to ai-analysis', () => {
      expect(stageToPipelineStage('reasoning')).toBe('ai-analysis');
    });

    it('maps formatting to generation', () => {
      expect(stageToPipelineStage('formatting')).toBe('generation');
    });

    it('maps validating to generation', () => {
      expect(stageToPipelineStage('validating')).toBe('generation');
    });

    it('maps inserting to generation', () => {
      expect(stageToPipelineStage('inserting')).toBe('generation');
    });

    it('maps complete to generation', () => {
      expect(stageToPipelineStage('complete')).toBe('generation');
    });
  });

  describe('pipelineStageToStageName', () => {
    it('maps audio-processing to collecting', () => {
      expect(pipelineStageToStageName('audio-processing')).toBe('collecting');
    });

    it('maps transcribing to transcribing', () => {
      expect(pipelineStageToStageName('transcribing')).toBe('transcribing');
    });

    it('maps ai-analysis to reasoning', () => {
      expect(pipelineStageToStageName('ai-analysis')).toBe('reasoning');
    });

    it('maps generation to formatting', () => {
      expect(pipelineStageToStageName('generation')).toBe('formatting');
    });
  });

  describe('createProgressEvent', () => {
    it('creates event with all fields', () => {
      const event = createProgressEvent('reasoning', 50, 'Analysing key facts');
      expect(event.stage).toBe('reasoning');
      expect(event.percent).toBe(50);
      expect(event.detail).toBe('Analysing key facts');
      expect(event.timestamp).toBeDefined();
    });

    it('creates event with optional fields as undefined', () => {
      const event = createProgressEvent('complete');
      expect(event.stage).toBe('complete');
      expect(event.percent).toBeUndefined();
      expect(event.detail).toBeUndefined();
    });

    it('clamps percent to 0-100', () => {
      const event1 = createProgressEvent('collecting', -10);
      expect(event1.percent).toBe(0);

      const event2 = createProgressEvent('complete', 150);
      expect(event2.percent).toBe(100);
    });

    it('includes timestamp', () => {
      const before = Date.now();
      const event = createProgressEvent('reasoning', 50);
      const after = Date.now();
      
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
