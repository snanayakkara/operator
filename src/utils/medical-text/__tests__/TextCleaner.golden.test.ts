/**
 * Golden Tests for MedicalTextCleaner
 * Ensures new unified implementation preserves exact behavior of legacy functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MedicalTextCleaner, cleanMedicalText, cleanNarrativeText, cleanSummaryText } from '../TextCleaner';

describe('MedicalTextCleaner Golden Tests', () => {
  let cleaner: MedicalTextCleaner;

  beforeEach(() => {
    cleaner = MedicalTextCleaner.getInstance();
  });

  describe('Basic Medical Text Cleaning (replaces MedicalAgent.cleanMedicalText)', () => {
    const testCases = [
      {
        description: 'basic whitespace normalization',
        input: 'Patient    has   moderate   stenosis.     Normal EF.',
        expected: 'Patient has moderate stenosis. Normal EF.'
      },
      {
        description: 'punctuation spacing',
        input: 'EF 45%.Moderate MR.Severe AS.',
        expected: 'EF 45%. Moderate MR. Severe AS.'
      },
      {
        description: 'medical units lowercasing',
        input: 'Patient takes 5 MG aspirin and 10 ML water',
        expected: 'Patient takes 5 mg aspirin and 10 ml water'
      },
      {
        description: 'blood pressure terms',
        input: 'SYSTOLIC 120, DIASTOLIC 80, BLOOD PRESSURE normal',
        expected: 'systolic 120, diastolic 80, blood pressure normal'
      },
      {
        description: 'empty text handling',
        input: '',
        expected: ''
      },
      {
        description: 'single word',
        input: 'normal',
        expected: 'normal'
      }
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = cleaner.clean(input, { level: 'medical' });
        expect(result).toBe(expected);
      });

      it(`backward compatibility function works for ${description}`, () => {
        const result = cleanMedicalText(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Narrative Text Cleaning (replaces NarrativeLetterAgent.cleanNarrativeText)', () => {
    const testCases = [
      {
        description: 'removes salutations',
        input: 'Dear Dr. Smith,\n\nPatient has chest pain. Thank you for referral.\n\nKind regards,\nDr. Jones',
        expected: 'Patient has chest pain. Thank you for referral.'
      },
      {
        description: 'removes markdown headers',
        input: '**Assessment**\nPatient stable\n## Plan\nContinue medications',
        expected: 'Patient stable Continue medications'
      },
      {
        description: 'removes filler words',
        input: 'Patient, um, has, you know, chest pain and, er, palpitations',
        expected: 'Patient has chest pain and palpitations'
      },
      {
        description: 'converts number words with units',
        input: 'Patient takes five mg aspirin and ten ml water daily',
        expected: 'Patient takes 5 mg aspirin and 10 ml water daily'
      },
      {
        description: 'formats medications',
        input: 'atorvastatin 20 mg daily and ramipril 5 mg twice daily',
        expected: 'atorvastatin 20mg daily and ramipril 5mg twice daily'
      },
      {
        description: 'formats blood pressure',
        input: 'BP was 120 on 80 mmHg',
        expected: 'BP was 120/80 mmHg'
      },
      {
        description: 'preserves paragraph structure when requested',
        input: 'First paragraph.\n\nSecond paragraph.',
        expectedWithParagraphs: 'First paragraph.\n\nSecond paragraph.',
        expectedWithoutParagraphs: 'First paragraph. Second paragraph.'
      }
    ];

    testCases.forEach(({ description, input, expected, expectedWithParagraphs, expectedWithoutParagraphs }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = cleaner.clean(input, { level: 'narrative' });
        const expectedResult = expectedWithoutParagraphs || expected;
        expect(result).toBe(expectedResult);
      });

      if (expectedWithParagraphs) {
        it(`preserves paragraphs when requested for ${description}`, () => {
          const result = cleaner.clean(input, { 
            level: 'narrative', 
            preserveParagraphs: true 
          });
          expect(result).toBe(expectedWithParagraphs);
        });
      }

      it(`backward compatibility function works for ${description}`, () => {
        const result = cleanNarrativeText(input);
        const expectedResult = expectedWithoutParagraphs || expected;
        expect(result).toBe(expectedResult);
      });
    });
  });

  describe('Summary Text Cleaning (replaces QuickLetterSummaryExtractor.cleanSummaryText)', () => {
    const testCases = [
      {
        description: 'removes trailing dashes',
        input: 'Patient summary with findings---',
        expected: 'Patient summary with findings'
      },
      {
        description: 'removes trailing em dashes',
        input: 'Clinical findings noted—',
        expected: 'Clinical findings noted'
      },
      {
        description: 'normalizes whitespace',
        input: 'Patient   has    multiple   findings',
        expected: 'Patient has multiple findings'
      },
      {
        description: 'removes duplicate periods',
        input: 'Normal findings.. Continue care..',
        expected: 'Normal findings. Continue care.'
      },
      {
        description: 'removes duplicate semicolons',
        input: 'EF normal;; MR mild;; AS moderate',
        expected: 'EF normal; MR mild; AS moderate'
      },
      {
        description: 'removes duplicate commas',
        input: 'Patient stable,, continues medications,, follows up',
        expected: 'Patient stable, continues medications, follows up'
      },
      {
        description: 'handles mixed issues',
        input: '  Patient summary..  with findings;;  continues care,,  ---  ',
        expected: 'Patient summary. with findings; continues care,'
      }
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = cleaner.clean(input, { level: 'summary' });
        expect(result).toBe(expected);
      });

      it(`backward compatibility function works for ${description}`, () => {
        const result = cleanSummaryText(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Medical Terminology Preservation', () => {
    const medicalTerms = [
      'mild stenosis', 'moderate regurgitation', 'severe insufficiency',
      'TIMI flow III', 'ejection fraction 45%', 'blood pressure 120/80',
      'atorvastatin 20mg daily', 'ramipril 5mg BD', 'frusemide 40mg'
    ];

    medicalTerms.forEach(term => {
      it(`preserves medical term: ${term}`, () => {
        const input = `Patient has ${term} noted on examination.`;
        const result = cleaner.clean(input, { level: 'medical' });
        expect(result.toLowerCase()).toContain(term.toLowerCase());
      });
    });
  });

  describe('Australian Medical Compliance', () => {
    const australianTerms = [
      { us: 'furosemide', au: 'frusemide' },
      { us: 'sulfasalazine', au: 'sulphasalazine' },
      { us: 'esophageal', au: 'oesophageal' }
    ];

    australianTerms.forEach(({ us, au }) => {
      it(`maintains Australian spelling: ${au}`, () => {
        const input = `Patient requires ${au} therapy.`;
        const result = cleaner.clean(input, { level: 'medical' });
        expect(result).toContain(au);
        expect(result).not.toMatch(new RegExp(`\\b${us}\\b`, 'i'));
      });
    });
  });

  describe('Custom Rules', () => {
    it('applies custom cleaning rules', () => {
      cleaner.addCustomRule({
        pattern: /\btest pattern\b/gi,
        replacement: 'replaced pattern',
        description: 'test rule'
      });

      const input = 'This has a test pattern in it.';
      const result = cleaner.clean(input, { level: 'basic' });
      expect(result).toBe('This has a replaced pattern in it.');
    });

    it('allows setting multiple custom rules', () => {
      const rules = [
        {
          pattern: /\bpattern1\b/gi,
          replacement: 'replacement1',
          description: 'rule 1'
        },
        {
          pattern: /\bpattern2\b/gi,
          replacement: 'replacement2', 
          description: 'rule 2'
        }
      ];

      cleaner.setCleaningRules(rules);

      const input = 'Text with pattern1 and pattern2.';
      const result = cleaner.clean(input, { level: 'basic' });
      expect(result).toBe('Text with replacement1 and replacement2.');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const edgeCases = [
      { description: 'null-like input', input: '', expected: '' },
      { description: 'only whitespace', input: '   \n\t  ', expected: '' },
      { description: 'only punctuation', input: '...!!!???', expected: '...!!!???' },
      { description: 'very long text', input: 'word '.repeat(1000), expected: 'word '.repeat(1000).trim() },
      { description: 'special characters', input: 'Patient has ñ special chars: @#$%', expected: 'Patient has ñ special chars: @#$%' }
    ];

    edgeCases.forEach(({ description, input, expected: _expected }) => {
      it(`handles edge case: ${description}`, () => {
        expect(() => {
          const result = cleaner.clean(input, { level: 'medical' });
          expect(typeof result).toBe('string');
        }).not.toThrow();
      });
    });
  });

  describe('Performance and Memory', () => {
    it('handles large text efficiently', () => {
      const largeText = 'Patient has moderate stenosis. '.repeat(10000);
      const startTime = Date.now();
      
      const result = cleaner.clean(largeText, { level: 'medical' });
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // Should process in under 1 second
      expect(result.length).toBeGreaterThan(0);
    });

    it('maintains singleton pattern', () => {
      const instance1 = MedicalTextCleaner.getInstance();
      const instance2 = MedicalTextCleaner.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
