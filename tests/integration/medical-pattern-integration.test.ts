import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MedicalPatternService } from '@/utils/medical-text/MedicalPatternService';
import { ContextualMedicalAnalyzer } from '@/utils/medical-text/ContextualMedicalAnalyzer';
import { MedicalConfidenceScorer } from '@/utils/medical-text/MedicalConfidenceScorer';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';

// Medical text samples for comprehensive testing
const MEDICAL_TEXT_SAMPLES = {
  TAVI_PROCEDURE: `
    Patient underwent transcatheter aortic valve implantation (TAVI) for severe aortic stenosis.
    Pre-procedure assessment showed aortic valve area 0.6 cm² with peak gradient 85 mmHg.
    26mm Sapien 3 valve successfully deployed with excellent positioning.
    Post-procedure gradient reduced to 12 mmHg with no paravalvular leak.
    Patient hemodynamically stable post-procedure.
  `,
  
  PCI_PROCEDURE: `
    Emergency primary PCI performed for acute anterior STEMI.
    Coronary angiography revealed 100% proximal LAD occlusion with TIMI 0 flow.
    Successful deployment of 3.0 x 28mm drug-eluting stent.
    Final result: TIMI 3 flow with <10% residual stenosis.
    Door-to-balloon time: 78 minutes.
  `,
  
  CONSULTATION_NOTE: `
    67-year-old gentleman referred for cardiac consultation.
    History of hypertension, diabetes mellitus, and dyslipidemia.
    Recent stress test positive for inducible ischaemia.
    Examination: BP 145/92, HR 72 regular, no murmurs.
    Plan: Coronary angiography and optimization of medical therapy.
  `,
  
  MEDICATION_REVIEW: `
    Current medications: Aspirin 100mg daily, Metoprolol 50mg BID,
    Atorvastatin 40mg nocte, Ramipril 5mg daily.
    Drug interactions: None identified.
    Adherence: Good patient compliance reported.
    Recommendations: Continue current regimen with LDL monitoring.
  `,
  
  INVESTIGATION_SUMMARY: `
    Echocardiogram: Normal LV size and function (EF 60%).
    Mild mitral regurgitation. No wall motion abnormalities.
    CT coronary angiogram: Non-obstructive CAD with mild calcification.
    Stress test: Achieved 85% MPHR with no ischemic changes.
    Lipid profile: TC 4.2, LDL 2.1, HDL 1.8, TG 1.1 mmol/L.
  `,
  
  AUSTRALIAN_COMPLIANCE: `
    Management per Australian Heart Foundation guidelines.
    Patient counselled regarding lifestyle modifications.
    Prescribed PBS-listed medications with appropriate safety monitoring.
    Follow-up arranged through local GP and specialist clinic.
    Adherence to TGA medication safety protocols confirmed.
  `,
  
  COMPLEX_CASE: `
    84-year-old female with severe symptomatic aortic stenosis.
    Comorbidities: Chronic kidney disease (eGFR 35), COPD, frailty.
    STS risk score 8.2% indicating intermediate surgical risk.
    Heart team decision: TAVI preferred over surgical AVR.
    Procedure: Successful 26mm CoreValve Evolut deployment.
    Complications: Temporary AV block requiring temporary pacing.
    Outcome: Patient discharged day 3 in good condition.
  `,
  
  ERROR_PRONE_TEXT: `
    Patient had heart attack and needs bypass surgery.
    Blood pressure was 500/300 and heart rate 20.
    Gave 5000mg aspirin and patient felt better.
    CT scan showed everything was fine.
    Will follow up in 1 year if needed.
  `
};

describe('Medical Pattern Recognition Integration Tests', () => {
  let medicalPatternService: MedicalPatternService;
  let contextualAnalyzer: ContextualMedicalAnalyzer;
  let confidenceScorer: MedicalConfidenceScorer;
  let asrCorrectionEngine: ASRCorrectionEngine;

  beforeAll(() => {
    // Initialize services
    medicalPatternService = MedicalPatternService.getInstance();
    contextualAnalyzer = ContextualMedicalAnalyzer.getInstance();
    confidenceScorer = MedicalConfidenceScorer.getInstance();
    asrCorrectionEngine = new ASRCorrectionEngine();
  });

  describe('TAVI Procedure Integration', () => {
    test('should comprehensively analyze TAVI procedure text', async () => {
      const text = MEDICAL_TEXT_SAMPLES.TAVI_PROCEDURE;
      
      // Extract medical patterns
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true,
        australianCompliance: true
      });
      
      // Analyze clinical reasoning
      const reasoning = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: 'interventional_cardiology',
        detailLevel: 'expert'
      });
      
      // Validate medical accuracy
      const validation = await confidenceScorer.validateMedicalAccuracy(text, {
        enableSemanticValidation: true,
        enableTerminologyValidation: true,
        enableClinicalReasoningValidation: true,
        enableFactualAccuracyCheck: true
      });
      
      // Assertions
      expect(patterns.length).toBeGreaterThan(15);
      expect(patterns.some(p => p.text.toLowerCase().includes('tavi'))).toBe(true);
      expect(patterns.some(p => p.text.toLowerCase().includes('stenosis'))).toBe(true);
      expect(patterns.some(p => p.text.toLowerCase().includes('gradient'))).toBe(true);
      
      expect(reasoning).toBeDefined();
      expect(reasoning.clinicalContext.domain).toBe('interventional_cardiology');
      
      expect(validation.isValid).toBe(true);
      expect(validation.confidence.overallConfidence).toBeGreaterThan(0.8);
      expect(validation.confidence.terminologyAccuracy).toBeGreaterThan(0.8);
    });

    test('should identify TAVI-specific medical terminology', async () => {
      const text = MEDICAL_TEXT_SAMPLES.TAVI_PROCEDURE;
      
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true
      });
      
      const taviTerms = patterns.filter(p => 
        p.text.toLowerCase().includes('tavi') ||
        p.text.toLowerCase().includes('sapien') ||
        p.text.toLowerCase().includes('valve') ||
        p.text.toLowerCase().includes('gradient') ||
        p.text.toLowerCase().includes('paravalvular')
      );
      
      expect(taviTerms.length).toBeGreaterThan(5);
    });
  });

  describe('PCI Procedure Integration', () => {
    test('should comprehensively analyze PCI procedure text', async () => {
      const text = MEDICAL_TEXT_SAMPLES.PCI_PROCEDURE;
      
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true
      });
      
      const reasoning = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: 'interventional_cardiology',
        detailLevel: 'comprehensive'
      });
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text);
      
      expect(patterns.some(p => p.text.toLowerCase().includes('pci'))).toBe(true);
      expect(patterns.some(p => p.text.toLowerCase().includes('stemi'))).toBe(true);
      expect(patterns.some(p => p.text.toLowerCase().includes('timi'))).toBe(true);
      expect(patterns.some(p => p.text.toLowerCase().includes('lad'))).toBe(true);
      
      expect(reasoning.clinicalContext.urgency).toBe('emergency');
      expect(validation.confidence.clinicalReasoningAccuracy).toBeGreaterThan(0.7);
    });

    test('should preserve TIMI flow grading terminology', async () => {
      const text = MEDICAL_TEXT_SAMPLES.PCI_PROCEDURE;
      
      const correctedText = await asrCorrectionEngine.applyEnhancedSemanticCorrections(
        text, 
        'interventional_cardiology'
      );
      
      expect(correctedText).toContain('TIMI');
      expect(correctedText).toMatch(/TIMI\s+[0-3]/);
      expect(correctedText).not.toContain('TIMI 100%'); // Should not convert to percentage
    });
  });

  describe('Consultation Note Integration', () => {
    test('should analyze consultation patterns and reasoning', async () => {
      const text = MEDICAL_TEXT_SAMPLES.CONSULTATION_NOTE;
      
      const reasoning = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: 'cardiology',
        detailLevel: 'comprehensive'
      });
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text);
      
      expect(reasoning.patterns).toBeDefined();
      expect(reasoning.clinicalContext.patientDemographics).toBeDefined();
      expect(reasoning.workflow.steps.length).toBeGreaterThan(2);
      
      expect(validation.confidence.completenessScore).toBeGreaterThan(0.7);
      expect(validation.confidence.coherenceScore).toBeGreaterThan(0.7);
    });

    test('should identify clinical workflow steps', async () => {
      const text = MEDICAL_TEXT_SAMPLES.CONSULTATION_NOTE;
      
      const reasoning = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        detailLevel: 'expert'
      });
      
      expect(reasoning.workflow).toBeDefined();
      expect(reasoning.workflow.steps).toBeDefined();
      
      const workflowTypes = reasoning.workflow.steps.map(step => step.type);
      expect(workflowTypes).toContain('assessment');
      expect(workflowTypes).toContain('plan');
    });
  });

  describe('Medication Review Integration', () => {
    test('should analyze medication patterns and safety', async () => {
      const text = MEDICAL_TEXT_SAMPLES.MEDICATION_REVIEW;
      
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true
      });
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text, {
        enableFactualAccuracyCheck: true
      });
      
      const medicationTerms = patterns.filter(p => 
        p.category === 'medication' || 
        p.text.toLowerCase().includes('mg') ||
        ['aspirin', 'metoprolol', 'atorvastatin', 'ramipril'].some(med => 
          p.text.toLowerCase().includes(med)
        )
      );
      
      expect(medicationTerms.length).toBeGreaterThan(8);
      expect(validation.confidence.factualAccuracy).toBeGreaterThan(0.8);
      
      // Should not flag reasonable medication dosages
      const dosageFlags = validation.medicalAccuracyFlags.filter(flag => 
        flag.type === 'medication_dosage'
      );
      expect(dosageFlags.length).toBe(0);
    });

    test('should identify drug interaction concerns', async () => {
      const problematicText = `
        Patient taking Warfarin 5mg daily, Aspirin 325mg daily,
        Clopidogrel 75mg daily, and NSAIDs PRN for arthritis.
        Also prescribed Amiodarone 200mg daily.
      `;
      
      const validation = await confidenceScorer.validateMedicalAccuracy(problematicText, {
        enableFactualAccuracyCheck: true
      });
      
      // Should identify potential bleeding risk with triple antithrombotic therapy
      expect(validation.medicalAccuracyFlags.length).toBeGreaterThan(0);
      expect(validation.recommendations.some(r => 
        r.toLowerCase().includes('interaction') || 
        r.toLowerCase().includes('bleeding')
      )).toBe(true);
    });
  });

  describe('Investigation Summary Integration', () => {
    test('should analyze investigation results comprehensively', async () => {
      const text = MEDICAL_TEXT_SAMPLES.INVESTIGATION_SUMMARY;
      
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true
      });
      
      const reasoning = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: 'cardiology',
        detailLevel: 'comprehensive'
      });
      
      const investigationTerms = patterns.filter(p => 
        ['echocardiogram', 'ct', 'stress', 'ef', 'ldl'].some(term => 
          p.text.toLowerCase().includes(term)
        )
      );
      
      expect(investigationTerms.length).toBeGreaterThan(10);
      expect(reasoning.patterns.some(p => p.type === 'diagnostic')).toBe(true);
    });

    test('should validate normal ranges and measurements', async () => {
      const text = MEDICAL_TEXT_SAMPLES.INVESTIGATION_SUMMARY;
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text, {
        enableFactualAccuracyCheck: true
      });
      
      // Should recognize normal EF (60%), lipid values as reasonable
      const measurementFlags = validation.medicalAccuracyFlags.filter(flag => 
        flag.type === 'measurement_unit' && flag.severity === 'critical'
      );
      expect(measurementFlags.length).toBe(0);
      
      expect(validation.confidence.factualAccuracy).toBeGreaterThan(0.8);
    });
  });

  describe('Australian Compliance Integration', () => {
    test('should validate Australian medical compliance', async () => {
      const text = MEDICAL_TEXT_SAMPLES.AUSTRALIAN_COMPLIANCE;
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text, {
        enableAustralianComplianceCheck: true
      });
      
      expect(validation.australianComplianceFlags).toBeDefined();
      expect(validation.confidence.australianCompliance).toBeGreaterThan(0.8);
      
      // Should recognize Australian-specific references
      const complianceFlags = validation.australianComplianceFlags.filter(flag => 
        flag.complianceLevel === 'compliant'
      );
      expect(complianceFlags.length).toBeGreaterThan(0);
    });

    test('should suggest Australian spelling variants', async () => {
      const americanText = `
        Patient requires specialized hemoglobin analysis and color doppler study.
        Treatment will be center-based with pediatric consultation.
      `;
      
      const validation = await confidenceScorer.validateMedicalAccuracy(americanText, {
        enableAustralianComplianceCheck: true
      });
      
      const spellingIssues = validation.issues.filter(issue => 
        issue.type === 'australian_compliance_issue'
      );
      expect(spellingIssues.length).toBeGreaterThan(0);
      
      expect(validation.confidence.australianCompliance).toBeLessThan(0.9);
    });
  });

  describe('Complex Case Integration', () => {
    test('should handle complex multi-domain medical case', async () => {
      const text = MEDICAL_TEXT_SAMPLES.COMPLEX_CASE;
      
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true,
        australianCompliance: true
      });
      
      const reasoning = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        detailLevel: 'expert',
        includeAustralianGuidelines: true
      });
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text, {
        enableSemanticValidation: true,
        enableTerminologyValidation: true,
        enableClinicalReasoningValidation: true,
        enableFactualAccuracyCheck: true
      });
      
      // Should identify multiple medical domains
      const domains = new Set(patterns.map(p => p.domain).filter(Boolean));
      expect(domains.size).toBeGreaterThan(2);
      
      // Should recognize complex clinical reasoning
      expect(reasoning.patterns.length).toBeGreaterThan(3);
      expect(reasoning.workflow.steps.length).toBeGreaterThan(5);
      
      // Should validate as medically sound despite complexity
      expect(validation.isValid).toBe(true);
      expect(validation.confidence.overallConfidence).toBeGreaterThan(0.7);
    });

    test('should identify risk stratification patterns', async () => {
      const text = MEDICAL_TEXT_SAMPLES.COMPLEX_CASE;
      
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true
      });
      
      const riskTerms = patterns.filter(p => 
        p.text.toLowerCase().includes('risk') ||
        p.text.toLowerCase().includes('sts') ||
        p.text.toLowerCase().includes('frailty') ||
        p.text.toLowerCase().includes('comorbid')
      );
      
      expect(riskTerms.length).toBeGreaterThan(2);
    });
  });

  describe('Error Detection and Quality Assurance', () => {
    test('should detect and flag medical errors in problematic text', async () => {
      const text = MEDICAL_TEXT_SAMPLES.ERROR_PRONE_TEXT;
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text, {
        enableSemanticValidation: true,
        enableTerminologyValidation: true,
        enableFactualAccuracyCheck: true
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.confidence.overallConfidence).toBeLessThan(0.5);
      
      // Should flag unrealistic vital signs
      const measurementFlags = validation.medicalAccuracyFlags.filter(flag => 
        flag.type === 'measurement_unit'
      );
      expect(measurementFlags.length).toBeGreaterThan(0);
      
      // Should flag excessive medication dosage
      const dosageFlags = validation.medicalAccuracyFlags.filter(flag => 
        flag.type === 'medication_dosage'
      );
      expect(dosageFlags.length).toBeGreaterThan(0);
      
      expect(validation.recommendations.length).toBeGreaterThan(2);
    });

    test('should provide specific improvement recommendations', async () => {
      const text = MEDICAL_TEXT_SAMPLES.ERROR_PRONE_TEXT;
      
      const validation = await confidenceScorer.validateMedicalAccuracy(text);
      
      expect(validation.recommendations).toBeDefined();
      expect(validation.recommendations.length).toBeGreaterThan(0);
      
      const hasEmergencyRecommendation = validation.recommendations.some(r => 
        r.includes('🚨') || r.toLowerCase().includes('critical')
      );
      expect(hasEmergencyRecommendation).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle batch processing of multiple medical texts', async () => {
      const texts = Object.values(MEDICAL_TEXT_SAMPLES).slice(0, 5);
      
      const startTime = Date.now();
      
      const promises = texts.map(async (text) => {
        const patterns = await medicalPatternService.extractMedicalTerms(text, {
          semanticAnalysis: true
        });
        const validation = await confidenceScorer.validateMedicalAccuracy(text);
        return { patterns, validation };
      });
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toBeDefined();
      expect(results.length).toBe(texts.length);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      results.forEach(result => {
        expect(result.patterns).toBeDefined();
        expect(result.validation).toBeDefined();
        expect(result.validation.confidence).toBeDefined();
      });
    });

    test('should maintain performance with repeated identical requests', async () => {
      const text = MEDICAL_TEXT_SAMPLES.TAVI_PROCEDURE;
      
      const iterations = 5;
      const durations: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await medicalPatternService.extractMedicalTerms(text, {
          semanticAnalysis: true,
          includeRelationships: true
        });
        durations.push(Date.now() - startTime);
      }
      
      // Later iterations should be faster due to caching
      const firstDuration = durations[0];
      const lastDuration = durations[durations.length - 1];
      
      expect(lastDuration).toBeLessThanOrEqual(firstDuration);
    });
  });

  describe('Cross-Service Integration', () => {
    test('should integrate all services in comprehensive workflow', async () => {
      const text = MEDICAL_TEXT_SAMPLES.COMPLEX_CASE;
      
      // Step 1: Pattern extraction
      const patterns = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true,
        australianCompliance: true
      });
      
      // Step 2: Clinical reasoning analysis
      const reasoning = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: 'interventional_cardiology',
        includeAustralianGuidelines: true,
        detailLevel: 'expert'
      });
      
      // Step 3: Medical accuracy validation
      const validation = await confidenceScorer.validateMedicalAccuracy(text, {
        enableSemanticValidation: true,
        enableTerminologyValidation: true,
        enableClinicalReasoningValidation: true,
        enableAustralianComplianceCheck: true,
        enableFactualAccuracyCheck: true
      });
      
      // Step 4: ASR correction with semantic enhancement
      const correctedText = await asrCorrectionEngine.applyEnhancedSemanticCorrections(
        text,
        'interventional_cardiology',
        {
          enableAllSemanticFeatures: true,
          australianCompliance: true,
          confidenceThreshold: 0.8
        }
      );
      
      // Verify integration results
      expect(patterns.length).toBeGreaterThan(20);
      expect(reasoning.patterns.length).toBeGreaterThan(0);
      expect(reasoning.workflow.steps.length).toBeGreaterThan(0);
      expect(validation.confidence.overallConfidence).toBeGreaterThan(0.7);
      expect(correctedText.length).toBeGreaterThan(0);
      
      // Verify data consistency across services
      const patternTerms = patterns.map(p => p.text.toLowerCase());
      const reasoningEntities = reasoning.clinicalContext.entities?.map(e => e.text.toLowerCase()) || [];
      
      // Should have some overlap between pattern extraction and reasoning analysis
      const overlap = patternTerms.filter(term => 
        reasoningEntities.some(entity => entity.includes(term) || term.includes(entity))
      );
      expect(overlap.length).toBeGreaterThan(0);
    });

    test('should maintain data consistency across multiple service calls', async () => {
      const text = MEDICAL_TEXT_SAMPLES.PCI_PROCEDURE;
      
      // Multiple calls to the same services
      const patterns1 = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true
      });
      const patterns2 = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true
      });
      
      const validation1 = await confidenceScorer.validateMedicalAccuracy(text);
      const validation2 = await confidenceScorer.validateMedicalAccuracy(text);
      
      // Results should be identical
      expect(patterns1).toEqual(patterns2);
      expect(validation1.confidence.overallConfidence).toEqual(validation2.confidence.overallConfidence);
      expect(validation1.isValid).toEqual(validation2.isValid);
    });
  });
});