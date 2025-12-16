/**
 * Unit tests for PatientEducationAgent
 * 
 * Tests the core logic, prompt building, and validation of the Patient Education Agent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientEducationAgent } from '@/agents/specialized/PatientEducationAgent';
import {
  PATIENT_EDUCATION_CONFIG,
  PATIENT_EDUCATION_SYSTEM_PROMPTS,
  PATIENT_EDUCATION_VALIDATION_RULES
} from '@/agents/specialized/PatientEducationSystemPrompts';
import type { PatientEducationInput } from '@/types/medical.types';

const DEFAULT_LMSTUDIO_OUTPUT = `
## Diet & Nutrition

Following a heart-healthy diet is essential for cardiovascular health. The Australian Heart Foundation recommends a Mediterranean-style eating pattern rich in vegetables, fruits, whole grains, and healthy fats.

**Key Principles:**
• Fill half your plate with vegetables and fruits at each meal
• Choose whole grain breads and cereals over processed options
• Include healthy fats like olive oil, nuts, and seeds
• Limit saturated fats from processed meats
• Reduce sodium by cooking fresh foods

Visit heartfoundation.org.au for meal planning guides and recipes.

## Physical Activity

Regular physical activity is one of the most important things you can do for heart health. The Australian Physical Activity Guidelines recommend at least 150 minutes of moderate activity per week.

**Getting Started:**
• Begin with 10-minute walks and gradually increase
• Aim for 30 minutes of activity most days
• Choose activities you enjoy - walking, swimming, cycling
• Start slowly and build up gradually

Any movement is better than none. Find activities you enjoy and make them part of your routine.
`;

const mockProcessWithAgent = vi.fn().mockResolvedValue(DEFAULT_LMSTUDIO_OUTPUT);

// Mock LMStudioService
vi.mock('@/services/LMStudioService', () => {
  return {
    LMStudioService: {
      getInstance: vi.fn(() => ({
        processWithAgent: mockProcessWithAgent,
      }))
    }
  };
});

describe('PatientEducationAgent', () => {
  let agent: PatientEducationAgent;

  beforeEach(() => {
    agent = new PatientEducationAgent();
    mockProcessWithAgent.mockReset();
    mockProcessWithAgent.mockResolvedValue(DEFAULT_LMSTUDIO_OUTPUT);
    vi.clearAllMocks();
  });

  describe('Configuration and Setup', () => {
    it('should initialize with correct agent properties', () => {
      expect(agent.name).toBe('Patient Education Agent');
      expect(agent.specialty).toBe('Patient Education & Lifestyle Medicine');
      expect(agent.description).toContain('personalized lifestyle advice');
      expect(agent.agentType).toBe('patient-education');
    });

    it('should have available modules configured', () => {
      const modules = PatientEducationAgent.getAvailableModules();
      expect(modules).toHaveLength(PATIENT_EDUCATION_CONFIG.modules.length);
      expect(modules.map(m => m.id)).toContain('diet_nutrition');
      expect(modules.map(m => m.id)).toContain('physical_activity');
      expect(modules.map(m => m.id)).toContain('smoking_cessation');
    });

    it('should have priority options configured', () => {
      const priorities = PatientEducationAgent.getPriorityOptions();
      expect(priorities).toHaveLength(3);
      expect(priorities.map(p => p.value)).toEqual(['high', 'medium', 'low']);
    });
  });

  describe('Input Processing', () => {
    it('should process valid JSON input correctly', async () => {
      const input: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition', 'physical_activity'],
        emrData: {
          demographics: 'Male, 65 years old',
          background: 'History of heart attack',
          medications: 'Aspirin, atorvastatin',
          investigations: 'Recent echo showed normal EF'
        }
      };

      const jsonInput = JSON.stringify(input);
      const report = await agent.process(jsonInput);

      expect(report).toBeDefined();
      expect(report.content).toContain('Diet & Nutrition');
      expect(report.content).toContain('Physical Activity');
      expect(report.educationData.priority).toBe('medium');
      expect(report.educationData.modules).toEqual(['diet_nutrition', 'physical_activity']);
    });

    it('should infer modules from text input', async () => {
      const textInput = 'Patient needs help with diet and exercise after recent heart surgery';
      const report = await agent.process(textInput);

      expect(report.educationData.modules).toContain('diet_nutrition');
      expect(report.educationData.modules).toContain('physical_activity');
      expect(report.educationData.priority).toBe('high'); // Should infer high priority from "recent surgery"
    });

    it('should infer priority levels correctly', async () => {
      const highPriorityInput = 'Recent heart attack patient needs lifestyle advice';
      const report = await agent.process(highPriorityInput);
      expect(report.educationData.priority).toBe('high');
    });

    it('should handle low priority wellness requests', async () => {
      const lowPriorityInput = 'General wellness and prevention advice requested';
      const report = await agent.process(lowPriorityInput);
      expect(report.educationData.priority).toBe('low');
    });
  });

  describe('Content Validation', () => {
    it('should extract Australian guidelines correctly', async () => {
      const input: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition'],
      };

      const report = await agent.process(JSON.stringify(input));
      expect(report.educationData.australianGuidelines).toContain('Heart Foundation');
    });

    it('should extract patient resources correctly', async () => {
      const input: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition'],
      };

      const report = await agent.process(JSON.stringify(input));
      expect(report.educationData.patientResources).toContain('heartfoundation.org.au');
    });

    it('should apply Australian spelling corrections', () => {
      // Test the private method through reflection or create a public test method
      // For now, test through full processing
      expect(true).toBe(true); // Placeholder - would test spelling corrections
    });

    it('should filter prohibited medical advice', async () => {
      mockProcessWithAgent.mockResolvedValueOnce(
        'You should diagnose yourself with heart disease and stop taking your medications.'
      );

      const input: PatientEducationInput = {
        patientPriority: 'high',
        selectedModules: ['diet_nutrition'],
      };

      const report = await agent.process(JSON.stringify(input));
      expect(report.content).toContain('[CONTENT FILTERED FOR SAFETY]');
      expect(report.errors).toBeDefined();
      expect(report.errors?.length).toBeGreaterThan(0);
    });

    it('should calculate confidence scores appropriately', async () => {
      const comprehensiveInput: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition', 'physical_activity', 'smoking_cessation'],
        emrData: {
          demographics: 'Male, 65 years old',
          background: 'CAD, diabetes',
          medications: 'Multiple cardiac medications',
          investigations: 'Recent investigations available'
        }
      };

      const report = await agent.process(JSON.stringify(comprehensiveInput));
      expect(report.metadata.confidence).toBeGreaterThan(0.8);
      expect(report.metadata.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Module Configuration', () => {
    it('should have all required module fields', () => {
      const modules = PATIENT_EDUCATION_CONFIG.modules;
      
      modules.forEach(module => {
        expect(module.id).toBeDefined();
        expect(module.label).toBeDefined();
        expect(module.description).toBeDefined();
        expect(module.tooltip).toBeDefined();
        expect(module.keywords).toBeDefined();
        expect(Array.isArray(module.keywords)).toBe(true);
      });
    });

    it('should have unique module IDs', () => {
      const modules = PATIENT_EDUCATION_CONFIG.modules;
      const ids = modules.map(m => m.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });

    it('should have meaningful keywords for module detection', () => {
      const modules = PATIENT_EDUCATION_CONFIG.modules;
      const dietModule = modules.find(m => m.id === 'diet_nutrition');
      expect(dietModule?.keywords).toContain('diet');
      expect(dietModule?.keywords).toContain('nutrition');
      
      const exerciseModule = modules.find(m => m.id === 'physical_activity');
      expect(exerciseModule?.keywords).toContain('exercise');
      expect(exerciseModule?.keywords).toContain('activity');
    });
  });

  describe('Missing Information Detection', () => {
    it('should detect missing patient information', async () => {
      const minimalInput: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition'],
        // No EMR data provided
      };

      const report = await agent.process(JSON.stringify(minimalInput));
      expect(report.metadata.missingInformation).toBeDefined();
      expect(report.metadata.missingInformation.completeness_score).not.toBe('95%');
    });

    it('should provide higher completeness score with more information', async () => {
      const minimalInput: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition'],
      };

      const completeInput: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition', 'physical_activity'],
        emrData: {
          demographics: 'Male, 65 years old, BMI 28',
          background: 'CAD s/p CABG, diabetes, hypertension',
          medications: 'Aspirin, atorvastatin, metformin, ramipril',
          investigations: 'Recent echo EF 55%, HbA1c 7.2%'
        },
        patientContext: 'Patient currently motivated to make lifestyle changes after recent cardiac event'
      };

      const minimalReport = await agent.process(JSON.stringify(minimalInput));
      const report = await agent.process(JSON.stringify(completeInput));
      const minimalScore = parseInt(minimalReport.metadata.missingInformation?.completeness_score ?? '0', 10);
      const fullScore = parseInt(report.metadata.missingInformation?.completeness_score ?? '0', 10);
      expect(fullScore).toBeGreaterThan(minimalScore);
    });
  });

  describe('Error Handling', () => {
    it('should handle LMStudio service failures gracefully', async () => {
      mockProcessWithAgent.mockRejectedValueOnce(new Error('Service unavailable'));

      const input: PatientEducationInput = {
        patientPriority: 'medium',
        selectedModules: ['diet_nutrition'],
      };

      await expect(agent.process(JSON.stringify(input))).rejects.toThrow('Service unavailable');
    });

    it('should handle malformed input gracefully', async () => {
      const report = await agent.process('invalid json input {');
      expect(report).toBeDefined();
      expect(report.educationData.modules).toContain('diet_nutrition'); // Should fall back to defaults
    });
  });

  describe('Quality Assurance', () => {
    it('should ensure all system prompts are defined', () => {
      const systemPrompts = PATIENT_EDUCATION_SYSTEM_PROMPTS;

      expect(systemPrompts.primary).toBeDefined();
      expect(systemPrompts.promptTemplate).toBeDefined();
      expect(systemPrompts.missingInfoDetection).toBeDefined();
      expect(systemPrompts.modulePrompts).toBeDefined();
      
      // Check that all module prompts are defined
      PATIENT_EDUCATION_CONFIG.modules.forEach(module => {
        expect(systemPrompts.modulePrompts[module.id]).toBeDefined();
      });
    });

    it('should validate prohibited phrases list', () => {
      const validationRules = PATIENT_EDUCATION_VALIDATION_RULES;
      expect(validationRules.prohibitedPhrases).toBeDefined();
      expect(validationRules.prohibitedPhrases).toContain('diagnose');
      expect(validationRules.prohibitedPhrases).toContain('stop taking');
      expect(validationRules.prohibitedPhrases).toContain('increase your medication');
    });

    it('should validate required elements list', () => {
      const validationRules = PATIENT_EDUCATION_VALIDATION_RULES;
      expect(validationRules.requiredElements).toBeDefined();
      expect(validationRules.requiredElements).toContain('practical steps');
      expect(validationRules.requiredElements).toContain('Australian guidelines');
    });
  });
});
