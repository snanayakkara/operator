/**
 * Golden Tests for ASR Investigation Corrections
 * Ensures consolidated implementation preserves exact behavior of preNormalizeInvestigationText()
 *
 * These tests validate that the consolidation of scattered ASR patterns into
 * ASRCorrectionEngine maintains 100% behavioral accuracy for investigation text processing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ASRCorrectionEngine } from '../ASRCorrectionEngine';

describe('ASR Investigation Corrections Golden Tests', () => {
  let asrEngine: ASRCorrectionEngine;

  beforeEach(() => {
    asrEngine = ASRCorrectionEngine.getInstance();
  });

  describe('Investigation-Specific ASR Pattern Corrections', () => {
    const asrPatternTestCases = [
      {
        description: 'LAD stenosis correction',
        input: 'Patient has LED stenosis',
        expected: 'Patient has LAD stenosis'
      },
      {
        description: 'ostial circumflex correction', 
        input: 'osteocircumflex artery',
        expected: 'ostial circumflex artery'
      },
      {
        description: 'Ferritin correction',
        input: 'Peritin levels are elevated',
        expected: 'Ferritin levels are elevated'
      },
      {
        description: 'RVSP correction',
        input: 'RBSP measured at 45 mmHg',
        expected: 'RVSP measured at 45 mmHg'
      },
      {
        description: 'eGFR greater than pattern',
        input: 'EGFR greater than 90',
        expected: 'eGFR >90'
      },
      {
        description: 'general greater than pattern',
        input: 'greater than 60',
        expected: '>60'
      },
      {
        description: 'proximal abbreviation',
        input: 'proximal LAD',
        expected: 'prox LAD'
      },
      {
        description: 'millimeters to mm formatting',
        input: '39 millimeters stenosis',
        expected: '(39mm) stenosis'
      },
      {
        description: 'mm formatting (not mmHg)',
        input: 'vessel 2.5mm',
        expected: 'vessel (2.5mm)'
      },
      {
        description: 'calcium score formatting',
        input: 'Calcium score, 795. 50 to 75th centile',
        expected: 'Ca Score 795/50 to 75th centile'
      },
      {
        description: 'Bruce stage formatting',
        input: 'bruce stage 4',
        expected: 'Bruce Stage 4'
      },
      {
        description: 'exercised for correction',
        input: 'exercise for 8.3 minutes',
        expected: 'exercised for 8.3 minutes'
      }
    ];

    asrPatternTestCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Hemodynamic Abbreviations for RHC', () => {
    const rhcTestCases = [
      {
        description: 'PA mean abbreviation',
        input: 'PA mean 25 mmHg',
        expected: 'PAm 25 mmHg'
      },
      {
        description: 'pulmonary capillary wedge pressure',
        input: 'pulmonary capillary wedge pressure 12 mmHg',
        expected: 'PCWP 12 mmHg'
      },
      {
        description: 'cardiac output abbreviation',
        input: 'cardiac output 4.5 L/min',
        expected: 'CO 4.5 L/min'
      },
      {
        description: 'cardiac index abbreviation',
        input: 'cardiac index 2.8',
        expected: 'CI 2.8'
      },
      {
        description: 'right ventricular stroke work index',
        input: 'right ventricular stroke work index 45',
        expected: 'RVSWI 45'
      },
      {
        description: 'pulmonary artery systolic pressure',
        input: 'pulmonary artery systolic pressure 65 mmHg',
        expected: 'PASP 65 mmHg'
      },
      {
        description: 'right atrial pressure',
        input: 'right atrial pressure 8 mmHg',
        expected: 'RAP 8 mmHg'
      },
      {
        description: 'stroke volume index',
        input: 'stroke volume index 35',
        expected: 'SVI 35'
      }
    ];

    rhcTestCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Investigation Type Conversions', () => {
    const typeConversionTestCases = [
      {
        description: 'stress echo cardiogram (specific first)',
        input: 'stress echo cardiogram',
        expected: 'Stress TTE'
      },
      {
        description: 'trans thoracic echo',
        input: 'trans thoracic echo',
        expected: 'TTE'
      },
      {
        description: 'trans oesophageal echo (British spelling)',
        input: 'trans oesophageal echo',
        expected: 'TOE'
      },
      {
        description: 'trans esophageal echo (US spelling)',
        input: 'trans esophageal echo',
        expected: 'TOE'
      },
      {
        description: 'CT coronary angiogram',
        input: 'CT coronary angiogram',
        expected: 'CTCA'
      },
      {
        description: 'Ambulatory Blood Pressure Monitor (specific)',
        input: 'Ambulatory Blood Pressure Monitor',
        expected: 'ABPM'
      },
      {
        description: 'Blood Pressure Monitor (general)',
        input: 'Blood Pressure Monitor',
        expected: 'ABPM'
      },
      {
        description: 'right heart catheter',
        input: 'right heart catheter',
        expected: 'RHC'
      }
    ];

    typeConversionTestCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Date Format Normalization', () => {
    const dateNormalizationTestCases = [
      {
        description: 'TTE with date format conversion',
        input: 'TTE, 15th March 2024',
        expected: 'TTE (15 Mar 2024): '
      },
      {
        description: 'TOE with existing date format fix',
        input: 'TOE (15 Mar 2024),',
        expected: 'TOE (15 Mar 2024): '
      },
      {
        description: 'Stress TTE undated format',
        input: 'Stress TTE normal function',
        expected: 'Stress TTE: normal function'
      },
      {
        description: 'CTCA with date',
        input: 'CTCA 25th January 2024 normal coronaries',
        expected: 'CTCA (25 Jan 2024): normal coronaries'
      },
      {
        description: 'RHC undated colon format',
        input: 'RHC: normal pressures',
        expected: 'RHC: normal pressures'
      },
      {
        description: 'ABPM with date normalization',
        input: 'ABPM, 10th December 2023',
        expected: 'ABPM (10 Dec 2023): '
      },
      {
        description: 'Bloods undated format',
        input: 'Bloods normal parameters',
        expected: 'Bloods: normal parameters'
      }
    ];

    dateNormalizationTestCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Lab Value and Pattern Formatting', () => {
    const labFormattingTestCases = [
      {
        description: 'lab value comma removal',
        input: 'TChol, 4.2',
        expected: 'TChol 4.2'
      },
      {
        description: 'HbA1c percentage formatting',
        input: 'HbA1c 6.5',
        expected: 'HbA1c 6.5%'
      },
      {
        description: 'HbA1c with existing percentage',
        input: 'HbA1c 7.2%',
        expected: 'HbA1c 7.2%'
      },
      {
        description: 'multiple lab values',
        input: 'HDL, 1.8 LDL, 2.1 TG, 1.2',
        expected: 'HDL 1.8 LDL 2.1 TG 1.2'
      },
      {
        description: 'valve gradient formatting',
        input: 'AV gradient 45 mmHg',
        expected: 'AV MPG 45 mmHg'
      },
      {
        description: 'aortic valve gradient correction',
        input: 'iotic valve gradient 50 mmHg',
        expected: 'AV MPG 50 mmHg'
      },
      {
        description: 'hemoglobin abbreviation (US spelling)',
        input: 'Hemoglobin 120',
        expected: 'Hb 120'
      },
      {
        description: 'haemoglobin abbreviation (British spelling)',
        input: 'Haemoglobin 135',
        expected: 'Hb 135'
      },
      {
        description: 'moderate to severe severity',
        input: 'moderate to severe MR',
        expected: 'mod-sev MR'
      },
      {
        description: 'mild to moderate severity',
        input: 'mild to moderate AS',
        expected: 'mild-mod AS'
      },
      {
        description: 'PASP greater than formatting',
        input: 'PASP 45',
        expected: 'PASP >45'
      },
      {
        description: 'RVSP with mmHg units',
        input: 'RVSP 40',
        expected: 'RVSP 40mmHg'
      },
      {
        description: 'RVSP range formatting',
        input: 'RVSP from 35 to 45',
        expected: 'RVSP from 35 to 45mmHg'
      }
    ];

    labFormattingTestCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Exercise Test Specific Patterns', () => {
    const exerciseTestCases = [
      {
        description: 'METs conversion from duplicate minutes',
        input: 'exercised for 8.5 minutes, 10.2 minutes',
        expected: 'exercised for 8.5 minutes, 10.2 METs'
      },
      {
        description: 'METs conversion with trailing period',
        input: 'exercised for 6.0 minutes, 9.5.',
        expected: 'exercised for 6.0 minutes, 9.5 METs;'
      },
      {
        description: 'exercise test with Bruce stage',
        input: 'bruce stage 3, exercised for 7.3 minutes, 8.9 minutes',
        expected: 'Bruce Stage 3, exercised for 7.3 minutes, 8.9 METs'
      },
      // New test cases for direct dictation formats
      {
        description: 'direct minutes and mets format',
        input: '3.5 minutes 5.6 mets',
        expected: 'exercised for 3.5 minutes, 5.6 METs'
      },
      {
        description: 'direct minutes and METs format (uppercase)',
        input: '4.2 minutes 7.1 METs',
        expected: 'exercised for 4.2 minutes, 7.1 METs'
      },
      {
        description: 'direct minutes with comma and mets',
        input: '6.0 minutes, 9.2 mets',
        expected: 'exercised for 6.0 minutes, 9.2 METs'
      },
      {
        description: 'exercised without for prefix',
        input: 'exercised 8.5 minutes 12.3 mets',
        expected: 'exercised for 8.5 minutes, 12.3 METs'
      },
      {
        description: 'user specific case from bug report',
        input: 'Stress echo 17th January 2025 3.5 minutes 5.6 mets, normal biventricular size and function satisfactory valvular function no evidence of inducible ischaemia',
        expected: 'Stress echo 17th January 2025 exercised for 3.5 minutes, 5.6 METs, normal biventricular size and function satisfactory valvular function no evidence of inducible ischaemia'
      }
    ];

    exerciseTestCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Complex Integration Cases', () => {
    const complexTestCases = [
      {
        description: 'comprehensive TTE report',
        input: 'TTE, 15th March 2024 LED stenosis moderate to severe, RBSP from 45 to 55, EF greater than 50',
        expected: 'TTE (15 Mar 2024): LAD stenosis mod-sev, RVSP from 45 to 55mmHg, EF >50'
      },
      {
        description: 'RHC with multiple hemodynamics',
        input: 'RHC: PA mean 28, pulmonary capillary wedge pressure 18, cardiac output 4.2, right atrial pressure 12',
        expected: 'RHC: PAm 28, PCWP 18, CO 4.2, RAP 12'
      },
      {
        description: 'exercise test with complete data',
        input: 'bruce stage 4, exercised for 12.3 minutes, 14.8 minutes, achieved greater than 85 percent maximum predicted heart rate',
        expected: 'Bruce Stage 4, exercised for 12.3 minutes, 14.8 METs, achieved >85 percent maximum predicted heart rate'
      },
      {
        description: 'comprehensive bloods report',
        input: 'Bloods TChol, 4.8 HDL, 1.6 LDL, 2.9 HbA1c 6.8 Hemoglobin 142 eGFR greater than 90',
        expected: 'Bloods: TChol 4.8 HDL 1.6 LDL 2.9 HbA1c 6.8% Hb 142 eGFR >90'
      },
      {
        description: 'stress echo with measurements',
        input: 'stress echo cardiogram normal, no LED stenosis, aortic valve gradient 25 millimeters',
        expected: 'Stress TTE: normal, no LAD stenosis, AV MPG 25 (millimeters)'
      }
    ];

    complexTestCases.forEach(({ description, input, expected }) => {
      it(`preserves behavior for ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const edgeCaseTestCases = [
      {
        description: 'empty string',
        input: '',
        expected: ''
      },
      {
        description: 'whitespace only',
        input: '   \n\t  ',
        expected: ''
      },
      {
        description: 'single word',
        input: 'normal',
        expected: 'normal'
      },
      {
        description: 'already formatted mmHg',
        input: 'RVSP 45mmHg',
        expected: 'RVSP 45mmHg'
      },
      {
        description: 'multiple spaces normalization',
        input: 'TTE    normal     function     EF    55%',
        expected: 'TTE: normal function EF 55%'
      },
      {
        description: 'mixed case patterns',
        input: 'led stenosis MODERATE TO SEVERE rbsp 45',
        expected: 'LAD stenosis mod-sev RVSP 45mmHg'
      }
    ];

    edgeCaseTestCases.forEach(({ description, input, expected }) => {
      it(`handles edge case: ${description}`, () => {
        const result = asrEngine.preNormalizeInvestigationTextSync(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle large investigation text efficiently', () => {
      const largeText = 'TTE normal function, no LED stenosis, moderate to severe MR, RBSP 45, eGFR greater than 90. '.repeat(50);
      
      const startTime = Date.now();
      const result = asrEngine.preNormalizeInvestigationTextSync(largeText);
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(result).toContain('TTE: normal function');
      expect(result).toContain('LAD stenosis');
      expect(result).toContain('mod-sev MR');
      expect(result).toContain('RVSP 45mmHg');
    });

    it('should handle concurrent investigation corrections', async () => {
      const testInputs = [
        'TTE normal function',
        'RHC PA mean 25',
        'bruce stage 3',
        'RBSP 45 mmHg',
        'eGFR greater than 90'
      ];

      const promises = testInputs.map(input => 
        Promise.resolve(asrEngine.preNormalizeInvestigationTextSync(input))
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(results[0]).toBe('TTE: normal function');
      expect(results[1]).toBe('RHC: PAm 25');
      expect(results[2]).toBe('Bruce Stage 3');
      expect(results[3]).toBe('RVSP 45 mmHg');
      expect(results[4]).toBe('eGFR >90');
    });
  });

  describe('Async vs Sync Method Consistency', () => {
    const consistencyTestCases = [
      'TTE normal function',
      'LED stenosis moderate to severe',
      'RHC PA mean 25 PCWP 18',
      'bruce stage 4 exercised for 10.5 minutes, 12.2 minutes',
      'TChol, 4.5 HDL, 1.8 HbA1c 6.2'
    ];

    consistencyTestCases.forEach((input, index) => {
      it(`async and sync methods produce identical results for case ${index + 1}`, async () => {
        const syncResult = asrEngine.preNormalizeInvestigationTextSync(input);
        const asyncResult = await asrEngine.preNormalizeInvestigationText(input);
        
        expect(syncResult).toBe(asyncResult);
      });
    });
  });
});