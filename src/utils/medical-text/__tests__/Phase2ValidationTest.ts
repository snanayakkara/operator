/**
 * Phase 2 Consolidation Validation Test
 * 
 * Validates that Phase 2 consolidation maintains 95%+ accuracy
 * compared to original implementations
 */

import { medicalTextNormalizer } from '../MedicalTextNormalizer';
import { cardiologyRegistry } from '../CardiologyPatternRegistry';
import { agentIntegrationAdapter } from '../Phase2AdapterPatterns';
import type { AgentType } from '@/types/medical.types';

// Test cases from the original golden test file
const investigationTestCases = [
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
    description: 'CT coronary angiogram',
    input: 'CT coronary angiogram',
    expected: 'CTCA'
  },
  {
    description: 'TTE with date format conversion',
    input: 'TTE, 15th March 2024',
    expected: 'TTE (15 Mar 2024): '
  },
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
    description: 'moderate to severe severity',
    input: 'moderate to severe MR',
    expected: 'mod-sev MR'
  },
  {
    description: 'bruce stage formatting',
    input: 'bruce stage 4',
    expected: 'Bruce Stage 4'
  },
  {
    description: 'exercised for correction',
    input: 'exercise for 8.3 minutes',
    expected: 'exercised for 8.3 minutes'
  },
  {
    description: 'METs conversion from duplicate minutes',
    input: 'exercised for 8.5 minutes, 10.2 minutes',
    expected: 'exercised for 8.5 minutes, 10.2 METs'
  }
];

interface ValidationResult {
  testCase: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  accuracy: number;
}

/**
 * Phase 2 Validation Suite
 */
export class Phase2ValidationSuite {
  
  /**
   * Run comprehensive validation test
   */
  static async validateConsolidation(): Promise<{
    overallAccuracy: number;
    passedTests: number;
    totalTests: number;
    results: ValidationResult[];
    summary: string;
  }> {
    console.log('🧪 Starting Phase 2 Consolidation Validation...');
    
    const results: ValidationResult[] = [];
    let passedTests = 0;
    
    for (const testCase of investigationTestCases) {
      try {
        // Test with Phase 2 normalizer
        const actual = medicalTextNormalizer.preNormalizeInvestigationTextSync(testCase.input);
        
        // Calculate accuracy (simple string similarity)
        const accuracy = this.calculateAccuracy(testCase.expected, actual);
        const passed = accuracy >= 95; // 95% threshold
        
        if (passed) passedTests++;
        
        results.push({
          testCase: testCase.description,
          input: testCase.input,
          expected: testCase.expected,
          actual,
          passed,
          accuracy
        });
        
        console.log(`${passed ? '✅' : '❌'} ${testCase.description}: ${accuracy.toFixed(1)}%`);
        
      } catch (error) {
        console.error(`❌ ${testCase.description}: ERROR - ${error}`);
        results.push({
          testCase: testCase.description,
          input: testCase.input,
          expected: testCase.expected,
          actual: `ERROR: ${error}`,
          passed: false,
          accuracy: 0
        });
      }
    }
    
    const overallAccuracy = results.reduce((sum, result) => sum + result.accuracy, 0) / results.length;
    const summary = `Phase 2 Validation: ${passedTests}/${investigationTestCases.length} tests passed (${overallAccuracy.toFixed(1)}% accuracy)`;
    
    console.log('\n📊 Validation Summary:');
    console.log(`   Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);
    console.log(`   Tests Passed: ${passedTests}/${investigationTestCases.length}`);
    console.log(`   Success Rate: ${((passedTests / investigationTestCases.length) * 100).toFixed(1)}%`);
    
    if (overallAccuracy >= 95) {
      console.log('🎉 VALIDATION PASSED: Phase 2 maintains 95%+ accuracy threshold');
    } else {
      console.log('⚠️ VALIDATION WARNING: Phase 2 accuracy below 95% threshold');
    }
    
    return {
      overallAccuracy,
      passedTests,
      totalTests: investigationTestCases.length,
      results,
      summary
    };
  }
  
  /**
   * Validate cardiology registry patterns
   */
  static validateCardiologyRegistry(): {
    totalPatterns: number;
    agentCoverage: Record<AgentType, number>;
    highPriorityPatterns: number;
    recommendations: string[];
  } {
    console.log('🏥 Validating Cardiology Registry...');
    
    const stats = cardiologyRegistry.getRegistryStats();
    const recommendations: string[] = [];
    
    // Check coverage
    const cardiologyAgents: AgentType[] = ['tavi', 'angiogram-pci', 'mteer', 'right-heart-cath', 'investigation-summary'];
    const agentCoverage: Record<AgentType, number> = {} as Record<AgentType, number>;
    
    for (const agentType of cardiologyAgents) {
      const patterns = cardiologyRegistry.getAgentPatterns(agentType);
      agentCoverage[agentType] = patterns.length;
      
      if (patterns.length < 5) {
        recommendations.push(`${agentType} has limited pattern coverage (${patterns.length} patterns)`);
      }
    }
    
    if (stats.totalPatterns < 20) {
      recommendations.push('Consider adding more comprehensive patterns for better coverage');
    }
    
    if (stats.highPriorityPatterns < stats.totalPatterns * 0.3) {
      recommendations.push('Consider marking more patterns as high priority for better performance');
    }
    
    console.log(`   Total Patterns: ${stats.totalPatterns}`);
    console.log(`   High Priority: ${stats.highPriorityPatterns}`);
    console.log(`   Agent Coverage: ${Object.entries(agentCoverage).map(([agent, count]) => `${agent}:${count}`).join(', ')}`);
    
    return {
      totalPatterns: stats.totalPatterns,
      agentCoverage,
      highPriorityPatterns: stats.highPriorityPatterns,
      recommendations
    };
  }
  
  /**
   * Test agent integration adapter
   */
  static async validateAgentIntegration(): Promise<{
    testResults: Record<AgentType, boolean>;
    performanceGains: Record<AgentType, number>;
    recommendations: string[];
  }> {
    console.log('🔧 Validating Agent Integration...');
    
    const testAgents: AgentType[] = ['tavi', 'angiogram-pci', 'investigation-summary'];
    const testResults: Record<AgentType, boolean> = {} as Record<AgentType, boolean>;
    const performanceGains: Record<AgentType, number> = {} as Record<AgentType, number>;
    const recommendations: string[] = [];
    
    const testInput = 'Patient has LED stenosis moderate to severe, RBSP 45 mmHg, eGFR greater than 90';
    
    for (const agentType of testAgents) {
      try {
        console.log(`   Testing ${agentType}...`);
        
        const { result: _result, migrationData, recommendedMode } = await agentIntegrationAdapter.integrateAgent(
          agentType,
          testInput,
          {
            agentType,
            enableConsolidatedPatterns: true,
            fallbackToLegacy: true,
            migrationMode: 'hybrid'
          }
        );
        
        testResults[agentType] = migrationData.success;
        performanceGains[agentType] = migrationData.performanceGain;
        
        if (recommendedMode === 'legacy') {
          recommendations.push(`${agentType} should remain on legacy mode for now`);
        } else if (recommendedMode === 'consolidated') {
          recommendations.push(`${agentType} ready for full consolidation`);
        }
        
        console.log(`   ${agentType}: ${migrationData.success ? '✅' : '❌'} (${recommendedMode})`);
        
      } catch (error) {
        console.error(`   ${agentType}: ❌ ERROR - ${error}`);
        testResults[agentType] = false;
        performanceGains[agentType] = 0;
        recommendations.push(`${agentType} integration failed: ${error}`);
      }
    }
    
    return {
      testResults,
      performanceGains,
      recommendations
    };
  }
  
  /**
   * Calculate string similarity accuracy
   */
  private static calculateAccuracy(expected: string, actual: string): number {
    if (expected === actual) return 100;
    
    // Simple Levenshtein distance-based accuracy
    const maxLength = Math.max(expected.length, actual.length);
    if (maxLength === 0) return 100;
    
    const distance = this.levenshteinDistance(expected, actual);
    return Math.max(0, ((maxLength - distance) / maxLength) * 100);
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * Run all validation tests
 */
export async function runPhase2Validation(): Promise<void> {
  console.log('🚀 Running Complete Phase 2 Validation Suite');
  console.log('================================================');
  
  try {
    // 1. Validate consolidation accuracy
    const consolidationResults = await Phase2ValidationSuite.validateConsolidation();
    
    // 2. Validate registry completeness
    const registryResults = Phase2ValidationSuite.validateCardiologyRegistry();
    
    // 3. Validate agent integration
    const integrationResults = await Phase2ValidationSuite.validateAgentIntegration();
    
    console.log('\n📋 Final Validation Report:');
    console.log('================================================');
    console.log(`Consolidation Accuracy: ${consolidationResults.overallAccuracy.toFixed(1)}%`);
    console.log(`Registry Patterns: ${registryResults.totalPatterns}`);
    console.log(`Agent Integration: ${Object.values(integrationResults.testResults).filter(Boolean).length}/${Object.keys(integrationResults.testResults).length} passed`);
    
    const overallSuccess = consolidationResults.overallAccuracy >= 95 &&
                          registryResults.totalPatterns >= 15 &&
                          Object.values(integrationResults.testResults).filter(Boolean).length >= 2;
    
    if (overallSuccess) {
      console.log('\n🎉 PHASE 2 VALIDATION: ALL SYSTEMS GO!');
      console.log('Phase 2 consolidation is ready for production use.');
    } else {
      console.log('\n⚠️ PHASE 2 VALIDATION: ISSUES DETECTED');
      console.log('Some components need attention before full deployment.');
      
      // Log recommendations
      const allRecommendations = [
        ...registryResults.recommendations,
        ...integrationResults.recommendations
      ];
      
      if (allRecommendations.length > 0) {
        console.log('\nRecommendations:');
        allRecommendations.forEach(rec => console.log(`  • ${rec}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Phase 2 validation failed:', error);
  }
}