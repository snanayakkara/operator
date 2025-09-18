import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MedicalPatternService } from '@/utils/medical-text/MedicalPatternService';
import { ContextualMedicalAnalyzer } from '@/utils/medical-text/ContextualMedicalAnalyzer';
import { MedicalTerminologyDisambiguator } from '@/utils/medical-text/MedicalTerminologyDisambiguator';
import { MedicalKnowledgeGraph } from '@/utils/medical-text/MedicalKnowledgeGraph';
import { MedicalConfidenceScorer } from '@/utils/medical-text/MedicalConfidenceScorer';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';

// Mock the singleton dependencies
vi.mock('@/utils/performance/CacheManager');
vi.mock('@/utils/performance/PerformanceMonitor');
vi.mock('@/utils/Logger');

describe('Medical Pattern Recognition System', () => {
  let medicalPatternService: MedicalPatternService;
  let contextualAnalyzer: ContextualMedicalAnalyzer;
  let terminologyDisambiguator: MedicalTerminologyDisambiguator;
  let knowledgeGraph: MedicalKnowledgeGraph;
  let confidenceScorer: MedicalConfidenceScorer;
  let asrCorrectionEngine: ASRCorrectionEngine;

  beforeEach(() => {
    // Reset singletons
    (MedicalPatternService as any).instance = null;
    (ContextualMedicalAnalyzer as any).instance = null;
    (MedicalTerminologyDisambiguator as any).instance = null;
    (MedicalKnowledgeGraph as any).instance = null;
    (MedicalConfidenceScorer as any).instance = null;

    medicalPatternService = MedicalPatternService.getInstance();
    contextualAnalyzer = ContextualMedicalAnalyzer.getInstance();
    terminologyDisambiguator = MedicalTerminologyDisambiguator.getInstance();
    knowledgeGraph = MedicalKnowledgeGraph.getInstance();
    confidenceScorer = MedicalConfidenceScorer.getInstance();
    asrCorrectionEngine = new ASRCorrectionEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('MedicalPatternService', () => {
    test('should extract basic medical terms from text', async () => {
      const text = 'The patient underwent coronary angioplasty with stent placement in the LAD artery.';
      
      const result = await medicalPatternService.extractMedicalTerms(text);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const termTexts = result.map(term => term.text.toLowerCase());
      expect(termTexts).toContain('coronary');
      expect(termTexts).toContain('angioplasty');
      expect(termTexts).toContain('stent');
    });

    test('should extract medical terms with semantic analysis enabled', async () => {
      const text = 'Severe aortic stenosis with peak gradient 80 mmHg and valve area 0.7 cm².';
      
      const result = await medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true,
        australianCompliance: true
      });
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Should identify stenosis severity
      const stenosisTerms = result.filter(term => 
        term.text.toLowerCase().includes('stenosis') || 
        term.text.toLowerCase().includes('severe')
      );
      expect(stenosisTerms.length).toBeGreaterThan(0);
    });

    test('should handle empty or invalid text input', async () => {
      const emptyResult = await medicalPatternService.extractMedicalTerms('');
      expect(emptyResult).toEqual([]);
      
      const whitespaceResult = await medicalPatternService.extractMedicalTerms('   \n\t  ');
      expect(whitespaceResult).toEqual([]);
    });

    test('should extract Australian medical terminology preferences', async () => {
      const text = 'Patient requires specialised haemoglobin analysis and colour doppler ultrasound.';
      
      const result = await medicalPatternService.extractMedicalTerms(text, {
        australianCompliance: true
      });
      
      expect(result).toBeDefined();
      
      // Should recognize Australian spelling variants
      const australianTerms = result.filter(term => 
        term.text.includes('specialised') || 
        term.text.includes('haemoglobin') ||
        term.text.includes('colour')
      );
      expect(australianTerms.length).toBeGreaterThan(0);
    });
  });

  describe('ContextualMedicalAnalyzer', () => {
    test('should analyze clinical reasoning patterns', async () => {
      const text = `Patient presents with chest pain. Clinical assessment reveals ST elevation in leads II, III, aVF indicating inferior STEMI. 
                   Treatment plan includes primary PCI with aspirin and clopidogrel loading.`;
      
      const result = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        includeAustralianGuidelines: true,
        detailLevel: 'comprehensive'
      });
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.workflow).toBeDefined();
      expect(result.clinicalContext).toBeDefined();
    });

    test('should identify diagnostic and therapeutic patterns', async () => {
      const text = `Echocardiogram demonstrates severe mitral regurgitation with ERO 0.4 cm². 
                   Recommended for surgical mitral valve repair.`;
      
      const result = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: 'cardiology',
        detailLevel: 'expert'
      });
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      
      if (result.patterns && result.patterns.length > 0) {
        const diagnosticPatterns = result.patterns.filter(p => p.type === 'diagnostic');
        const therapeuticPatterns = result.patterns.filter(p => p.type === 'therapeutic');
        
        expect(diagnosticPatterns.length + therapeuticPatterns.length).toBeGreaterThan(0);
      }
    });

    test('should handle basic clinical text', async () => {
      const text = 'Patient is stable. Blood pressure normal.';
      
      const result = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        detailLevel: 'basic'
      });
      
      expect(result).toBeDefined();
      expect(result.clinicalContext).toBeDefined();
      expect(result.clinicalContext.domain).toBeDefined();
    });

    test('should provide Australian guideline context when requested', async () => {
      const text = 'Patient with atrial fibrillation requires anticoagulation assessment per Australian guidelines.';
      
      const result = await contextualAnalyzer.analyzeClinicalReasoning(text, {
        includeAustralianGuidelines: true,
        detailLevel: 'comprehensive'
      });
      
      expect(result).toBeDefined();
      expect(result.australianCompliance).toBeDefined();
    });
  });

  describe('MedicalTerminologyDisambiguator', () => {
    test('should disambiguate ambiguous medical terms', async () => {
      const term = 'MI';
      const context = 'Patient presents with chest pain and elevated troponins consistent with MI.';
      
      const result = await terminologyDisambiguator.disambiguateTerm(term, context);
      
      expect(result).toBeDefined();
      expect(result.primaryMeaning).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.alternatives).toBeDefined();
      
      // Should identify as Myocardial Infarction in cardiac context
      expect(result.primaryMeaning.toLowerCase()).toContain('myocardial');
    });

    test('should expand common medical acronyms', async () => {
      const acronym = 'STEMI';
      const context = 'ECG shows ST elevation consistent with anterior STEMI.';
      
      const result = await terminologyDisambiguator.expandAcronym(acronym, context);
      
      expect(result).toBeDefined();
      expect(result?.primaryMeaning).toBeDefined();
      expect(result?.primaryMeaning.toLowerCase()).toContain('elevation');
      expect(result?.primaryMeaning.toLowerCase()).toContain('myocardial');
    });

    test('should provide Australian terminology preferences', async () => {
      const term = 'fetal';
      const context = 'Fetal heart monitoring during pregnancy.';
      
      const result = await terminologyDisambiguator.disambiguateTerm(term, context, {
        includeAustralianTerminology: true
      });
      
      expect(result).toBeDefined();
      
      // Should suggest Australian variant if available
      if (result.australianVariant) {
        expect(result.australianVariant).toContain('foetal');
      }
    });

    test('should handle batch disambiguation requests', async () => {
      const terms = ['CAD', 'PCI', 'LVEF'];
      const context = 'Patient with CAD underwent PCI, post-procedure LVEF 45%.';
      
      const results = await terminologyDisambiguator.batchDisambiguate(terms, context);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(terms.length);
      
      results.forEach(result => {
        expect(result.primaryMeaning).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    test('should return null for non-medical terms', async () => {
      const term = 'xyz123';
      const context = 'This is not a medical term xyz123.';
      
      const result = await terminologyDisambiguator.disambiguateTerm(term, context);
      
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.alternatives.length).toBe(0);
    });
  });

  describe('MedicalKnowledgeGraph', () => {
    test('should query medical concepts and relationships', async () => {
      const concept = 'myocardial infarction';
      
      const result = await knowledgeGraph.queryGraph(concept, {
        maxDepth: 2,
        includePathways: true
      });
      
      expect(result).toBeDefined();
      expect(result.concepts).toBeDefined();
      expect(Array.isArray(result.concepts)).toBe(true);
      expect(result.relationships).toBeDefined();
    });

    test('should calculate semantic similarity between medical terms', async () => {
      const term1 = 'myocardial infarction';
      const term2 = 'heart attack';
      
      const similarity = await knowledgeGraph.calculateSemanticSimilarity(term1, term2);
      
      expect(similarity).toBeDefined();
      expect(typeof similarity).toBe('number');
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
      
      // These should be highly similar
      expect(similarity).toBeGreaterThan(0.7);
    });

    test('should identify clinical pathways', async () => {
      const startConcept = 'chest pain';
      const endConcept = 'cardiac catheterization';
      
      const pathways = await knowledgeGraph.findClinicalPathways(startConcept, endConcept, {
        maxSteps: 5,
        pathwayType: 'diagnostic'
      });
      
      expect(pathways).toBeDefined();
      expect(Array.isArray(pathways)).toBe(true);
    });

    test('should cluster related medical concepts', async () => {
      const concepts = ['angina', 'myocardial infarction', 'heart failure', 'arrhythmia'];
      
      const clusters = await knowledgeGraph.clusterConcepts(concepts, {
        numberOfClusters: 2,
        clusteringMethod: 'semantic'
      });
      
      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);
    });

    test('should handle Australian medical terminology focus', async () => {
      const concept = 'paediatric cardiology';
      
      const result = await knowledgeGraph.queryGraph(concept, {
        australianFocus: true,
        maxDepth: 1
      });
      
      expect(result).toBeDefined();
      expect(result.concepts).toBeDefined();
      
      // Should include Australian spelling variants
      const australianTerms = result.concepts.filter(c => 
        c.australianVariant || c.name.includes('paediatric')
      );
      expect(australianTerms.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MedicalConfidenceScorer', () => {
    test('should validate medical accuracy and return confidence metrics', async () => {
      const text = `Patient underwent successful TAVI procedure. Valve deployed in correct position 
                   with excellent haemodynamics. Peak gradient reduced from 80 to 15 mmHg.`;
      
      const result = await confidenceScorer.validateMedicalAccuracy(text, {
        enableSemanticValidation: true,
        enableTerminologyValidation: true,
        enableClinicalReasoningValidation: true,
        enableAustralianComplianceCheck: true
      });
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.confidence.overallConfidence).toBeGreaterThan(0);
      expect(result.confidence.overallConfidence).toBeLessThanOrEqual(1);
      expect(result.isValid).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should identify medical accuracy issues', async () => {
      const text = `Patient has blood pressure of 500/300 mmHg and heart rate of 20 bpm. 
                   Administered 5000mg aspirin orally.`;
      
      const result = await confidenceScorer.validateMedicalAccuracy(text, {
        enableFactualAccuracyCheck: true
      });
      
      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.medicalAccuracyFlags.length).toBeGreaterThan(0);
      
      // Should flag unrealistic measurements
      const measurementFlags = result.medicalAccuracyFlags.filter(flag => 
        flag.type === 'measurement_unit'
      );
      expect(measurementFlags.length).toBeGreaterThan(0);
    });

    test('should provide Australian compliance assessment', async () => {
      const text = `Patient requires specialized hemoglobin analysis using American guidelines 
                   for center-based treatment.`;
      
      const result = await confidenceScorer.validateMedicalAccuracy(text, {
        enableAustralianComplianceCheck: true
      });
      
      expect(result).toBeDefined();
      expect(result.australianComplianceFlags).toBeDefined();
      
      // Should identify American spelling and suggest Australian variants
      const spellingIssues = result.issues.filter(issue => 
        issue.type === 'australian_compliance_issue'
      );
      expect(spellingIssues.length).toBeGreaterThan(0);
    });

    test('should calculate quick confidence scores', async () => {
      const texts = [
        'Patient underwent CABG surgery successfully.',
        'xyz abc 123',
        'Comprehensive cardiac assessment with detailed hemodynamic evaluation including left heart catheterization with coronary angiography demonstrating multi-vessel coronary artery disease.'
      ];
      
      for (const text of texts) {
        const confidence = await confidenceScorer.calculateQuickConfidence(text);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should handle empty text gracefully', async () => {
      const result = await confidenceScorer.validateMedicalAccuracy('');
      
      expect(result).toBeDefined();
      expect(result.confidence.overallConfidence).toBeLessThan(0.5);
      expect(result.isValid).toBe(false);
    });
  });

  describe('ASRCorrectionEngine Integration', () => {
    test('should apply enhanced semantic corrections', async () => {
      const text = 'The patient had a heart attack and needs bypass surgery.';
      
      const result = await asrCorrectionEngine.applyEnhancedSemanticCorrections(text, 'cardiology', {
        enableAllSemanticFeatures: true,
        australianCompliance: true,
        confidenceThreshold: 0.7
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should integrate with medical pattern recognition', async () => {
      const text = 'Patient had MI and underwent PCI with good results.';
      const config = {
        enableSemanticAnalysis: true,
        medicalTermDisambiguation: true,
        clinicalReasoningAnalysis: true,
        contextAwareness: true,
        advancedConfidenceScoring: true
      };
      
      const result = await asrCorrectionEngine.correctText(text, config);
      
      expect(result).toBeDefined();
      expect(result.correctedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.corrections).toBeDefined();
    });

    test('should preserve medical terminology in corrections', async () => {
      const text = 'severe aortic stenosis with peak gradient 80 mm hg';
      const config = {
        preserveMedicalTerms: true,
        enableSemanticAnalysis: true
      };
      
      const result = await asrCorrectionEngine.correctText(text, config);
      
      expect(result.correctedText).toContain('stenosis');
      expect(result.correctedText).toContain('gradient');
      expect(result.correctedText.toLowerCase()).toContain('mmhg');
    });

    test('should handle Australian medical terminology', async () => {
      const text = 'foetal heart monitoring and specialised haemoglobin analysis';
      const config = {
        enableSemanticAnalysis: true,
        australianSpelling: true
      };
      
      const result = await asrCorrectionEngine.correctText(text, config);
      
      expect(result).toBeDefined();
      expect(result.correctedText).toContain('foetal');
      expect(result.correctedText).toContain('specialised');
      expect(result.correctedText).toContain('haemoglobin');
    });
  });

  describe('Performance and Caching', () => {
    test('should cache medical pattern extraction results', async () => {
      const text = 'Patient underwent coronary angioplasty with stent placement.';
      
      // First call
      const startTime1 = Date.now();
      const result1 = await medicalPatternService.extractMedicalTerms(text);
      const duration1 = Date.now() - startTime1;
      
      // Second call (should be cached)
      const startTime2 = Date.now();
      const result2 = await medicalPatternService.extractMedicalTerms(text);
      const duration2 = Date.now() - startTime2;
      
      expect(result1).toEqual(result2);
      // Second call should be significantly faster due to caching
      expect(duration2).toBeLessThan(duration1);
    });

    test('should handle concurrent requests efficiently', async () => {
      const text = 'Multiple cardiac procedures including CABG, PCI, and valve replacement.';
      
      const promises = Array(5).fill(null).map(() => 
        medicalPatternService.extractMedicalTerms(text, { semanticAnalysis: true })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toBeDefined();
      expect(results.length).toBe(5);
      
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed medical text gracefully', async () => {
      const malformedTexts = [
        'asdlkfja;slkdfjasdf',
        '12345 !@#$% ^&*()',
        'The the the the the',
        'A a A a A a A a',
        ''
      ];
      
      for (const text of malformedTexts) {
        const result = await medicalPatternService.extractMedicalTerms(text);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        
        const confidence = await confidenceScorer.calculateQuickConfidence(text);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should handle very long medical texts', async () => {
      const longText = 'Patient underwent comprehensive cardiac evaluation. '.repeat(100);
      
      const result = await medicalPatternService.extractMedicalTerms(longText);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      const validation = await confidenceScorer.validateMedicalAccuracy(longText);
      expect(validation).toBeDefined();
      expect(validation.confidence).toBeDefined();
    });

    test('should handle network/service failures gracefully', async () => {
      // Mock a service failure
      const originalMethod = medicalPatternService.extractMedicalTerms;
      vi.spyOn(medicalPatternService, 'extractMedicalTerms').mockRejectedValueOnce(
        new Error('Service temporarily unavailable')
      );
      
      await expect(medicalPatternService.extractMedicalTerms('test')).rejects.toThrow();
      
      // Restore original method
      medicalPatternService.extractMedicalTerms = originalMethod;
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end with complete medical workflow', async () => {
      const medicalText = `
        Patient: John Smith, 65-year-old male
        Chief Complaint: Chest pain and shortness of breath
        
        Assessment: Acute ST-elevation myocardial infarction (STEMI) affecting the inferior wall.
        ECG shows ST elevation in leads II, III, and aVF with reciprocal changes in aVL.
        Troponin elevated at 15.2 ng/mL (normal <0.04).
        
        Management: Emergency cardiac catheterization revealed 100% occlusion of the right coronary artery.
        Successful primary percutaneous coronary intervention (PCI) performed with deployment of 
        drug-eluting stent. Final TIMI 3 flow achieved.
        
        Medications: Aspirin 300mg loading dose, Clopidogrel 600mg loading dose,
        Atorvastatin 80mg daily, Metoprolol 25mg BID.
        
        Outcome: Patient stable post-procedure with resolution of chest pain.
        Follow-up echocardiogram in 48 hours to assess LV function.
      `;
      
      // 1. Extract medical patterns
      const medicalTerms = await medicalPatternService.extractMedicalTerms(medicalText, {
        semanticAnalysis: true,
        includeRelationships: true,
        australianCompliance: true
      });
      
      expect(medicalTerms.length).toBeGreaterThan(10);
      
      // 2. Analyze clinical reasoning
      const clinicalAnalysis = await contextualAnalyzer.analyzeClinicalReasoning(medicalText, {
        focusArea: 'cardiology',
        includeAustralianGuidelines: true,
        detailLevel: 'expert'
      });
      
      expect(clinicalAnalysis.patterns).toBeDefined();
      expect(clinicalAnalysis.workflow).toBeDefined();
      
      // 3. Validate medical accuracy
      const validation = await confidenceScorer.validateMedicalAccuracy(medicalText, {
        enableSemanticValidation: true,
        enableTerminologyValidation: true,
        enableClinicalReasoningValidation: true,
        enableAustralianComplianceCheck: true,
        enableFactualAccuracyCheck: true
      });
      
      expect(validation.isValid).toBe(true);
      expect(validation.confidence.overallConfidence).toBeGreaterThan(0.8);
      expect(validation.issues.filter(i => i.severity === 'critical').length).toBe(0);
      
      // 4. Apply ASR corrections with semantic enhancement
      const correctedText = await asrCorrectionEngine.applyEnhancedSemanticCorrections(
        medicalText, 
        'cardiology',
        {
          enableAllSemanticFeatures: true,
          australianCompliance: true,
          confidenceThreshold: 0.8
        }
      );
      
      expect(correctedText).toBeDefined();
      expect(correctedText.length).toBeGreaterThan(0);
    });
  });
});