/**
 * Medical Report Validation Framework
 * 
 * Comprehensive validation system for medical report quality,
 * terminology accuracy, and Australian clinical compliance.
 */

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'terminology' | 'structure' | 'spelling' | 'measurement' | 'clinical';
  message: string;
  location?: string;
  severity: 'high' | 'medium' | 'low';
}

export class MedicalReportValidator {
  // Australian medical terminology dictionary
  private readonly australianTerminology = new Map([
    // Spelling variations
    ['anaesthesia', 'anesthesia'],
    ['haemodynamic', 'hemodynamic'],
    ['oesophageal', 'esophageal'],
    ['haemoglobin', 'hemoglobin'],
    ['paediatric', 'pediatric'],
    ['colour', 'color'],
    ['centre', 'center'],
    ['metre', 'meter'],
    ['litre', 'liter'],
    ['optimise', 'optimize'],
    ['realise', 'realize'],
    ['paralyse', 'paralyze'],
    
    // Clinical terms
    ['myocardial infarction', 'heart attack'],
    ['cerebrovascular accident', 'stroke'],
    ['percutaneous coronary intervention', 'PCI'],
    ['transcatheter aortic valve implantation', 'TAVI'],
    ['left ventricular ejection fraction', 'LVEF'],
    ['coronary artery bypass graft', 'CABG'],
  ]);

  // Medical measurement patterns
  private readonly measurementPatterns = [
    /\d+\s*(?:mm|cm|m)\s*Hg/gi, // Blood pressure
    /\d+(?:\.\d+)?\s*(?:cm|mm)(?:\s*squared)?/gi, // Areas
    /\d+(?:\.\d+)?\s*(?:L|ml)\/min/gi, // Flow rates
    /\d+(?:\.\d+)?\s*(?:mg|mcg|g|units?)\/(?:kg|day|hour)/gi, // Dosages
    /\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|L)\b/gi, // Measurements
    /\d+(?:\.\d+)?\s*%/gi, // Percentages
    /\d+(?:\.\d+)?\s*m\/s/gi, // Velocities
    /\d+(?:\.\d+)?\s*dynes\.sec\.cm⁻⁵/gi, // Resistance
  ];

  // Clinical severity descriptors
  private readonly severityTerms = [
    'trivial', 'trace', 'mild', 'mild-moderate', 'moderate', 
    'moderate-severe', 'severe', 'critical', 'torrential'
  ];

  // TIMI flow grades
  private readonly timiFlowTerms = [
    'TIMI 0', 'TIMI I', 'TIMI II', 'TIMI III',
    'TIMI zero', 'TIMI one', 'TIMI two', 'TIMI three',
    'no flow', 'delayed flow', 'complete flow', 'normal flow'
  ];

  /**
   * Comprehensive validation of medical report
   */
  public validateReport(report: string, workflowType: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    let totalScore = 100;

    // Run all validation checks
    const structureResult = this.validateStructure(report, workflowType);
    const terminologyResult = this.validateTerminology(report);
    const spellingResult = this.validateAustralianSpelling(report);
    const measurementResult = this.validateMeasurements(report);
    const clinicalResult = this.validateClinicalContent(report, workflowType);

    // Combine results
    issues.push(...structureResult.issues);
    issues.push(...terminologyResult.issues);
    issues.push(...spellingResult.issues);
    issues.push(...measurementResult.issues);
    issues.push(...clinicalResult.issues);

    // Calculate weighted score
    const structureWeight = 0.25;
    const terminologyWeight = 0.25;
    const spellingWeight = 0.15;
    const measurementWeight = 0.20;
    const clinicalWeight = 0.15;

    totalScore = (
      structureResult.score * structureWeight +
      terminologyResult.score * terminologyWeight +
      spellingResult.score * spellingWeight +
      measurementResult.score * measurementWeight +
      clinicalResult.score * clinicalWeight
    );

    const suggestions = this.generateSuggestions(issues, workflowType);

    return {
      passed: totalScore >= 75 && !issues.some(i => i.type === 'error'),
      score: Math.round(totalScore),
      issues,
      suggestions
    };
  }

  /**
   * Validate report structure and organization
   */
  public validateStructure(report: string, workflowType: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    let score = 100;

    const sections = this.extractSections(report);
    const expectedSections = this.getExpectedSections(workflowType);

    // Check for required sections
    for (const expectedSection of expectedSections) {
      const hasSection = sections.some(section => 
        section.toLowerCase().includes(expectedSection.toLowerCase())
      );
      
      if (!hasSection) {
        issues.push({
          type: 'warning',
          category: 'structure',
          message: `Missing expected section: ${expectedSection}`,
          severity: 'medium'
        });
        score -= 10;
      }
    }

    // Check report length appropriateness
    const wordCount = report.split(/\s+/).length;
    const expectedRange = this.getExpectedWordCountRange(workflowType);
    
    if (wordCount < expectedRange.min) {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: `Report may be too brief (${wordCount} words, expected ${expectedRange.min}-${expectedRange.max})`,
        severity: 'low'
      });
      score -= 5;
    } else if (wordCount > expectedRange.max) {
      issues.push({
        type: 'info',
        category: 'structure',
        message: `Report is comprehensive (${wordCount} words)`,
        severity: 'low'
      });
    }

    // Check paragraph structure
    const paragraphs = report.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length < 2 && workflowType !== 'quick-letter') {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Report should have multiple paragraphs for better organization',
        severity: 'low'
      });
      score -= 5;
    }

    return {
      passed: score >= 75,
      score: Math.max(0, score),
      issues,
      suggestions: []
    };
  }

  /**
   * Validate medical terminology accuracy
   */
  public validateTerminology(report: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check for proper medical terminology
    const commonTerms = this.extractMedicalTerms(report);
    const incorrectTerms = this.findIncorrectTerminology(report);

    incorrectTerms.forEach(term => {
      issues.push({
        type: 'error',
        category: 'terminology',
        message: `Incorrect medical terminology: "${term.incorrect}" should be "${term.correct}"`,
        location: term.location,
        severity: 'high'
      });
      score -= 15;
    });

    // Check for appropriate clinical descriptors
    const hasSeverityTerms = this.severityTerms.some(term => 
      report.toLowerCase().includes(term)
    );

    if (!hasSeverityTerms && (report.includes('stenosis') || report.includes('regurgitation'))) {
      issues.push({
        type: 'warning',
        category: 'terminology',
        message: 'Consider adding severity descriptors (mild/moderate/severe) for valvular findings',
        severity: 'medium'
      });
      score -= 10;
    }

    // Check TIMI flow terminology for PCI reports
    if (report.toLowerCase().includes('pci') || report.toLowerCase().includes('angioplasty')) {
      const hasTIMI = this.timiFlowTerms.some(term => 
        report.toLowerCase().includes(term.toLowerCase())
      );
      
      if (!hasTIMI) {
        issues.push({
          type: 'warning',
          category: 'terminology',
          message: 'PCI reports should include TIMI flow assessment',
          severity: 'medium'
        });
        score -= 10;
      }
    }

    return {
      passed: score >= 75,
      score: Math.max(0, score),
      issues,
      suggestions: []
    };
  }

  /**
   * Validate Australian spelling compliance
   */
  public validateAustralianSpelling(report: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check for American spelling variants
    this.australianTerminology.forEach((american, australian) => {
      const americanRegex = new RegExp(`\\b${american}\\b`, 'gi');
      const matches = report.match(americanRegex);
      
      if (matches) {
        matches.forEach(match => {
          issues.push({
            type: 'warning',
            category: 'spelling',
            message: `Use Australian spelling: "${match}" should be "${australian}"`,
            severity: 'low'
          });
          score -= 3;
        });
      }
    });

    return {
      passed: score >= 75,
      score: Math.max(0, score),
      issues,
      suggestions: []
    };
  }

  /**
   * Validate measurement formatting and units
   */
  public validateMeasurements(report: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check for proper measurement formatting
    const measurements = this.extractMeasurements(report);
    
    measurements.forEach(measurement => {
      // Check for space before units
      if (!/\d\s+[a-zA-Z]/.test(measurement)) {
        issues.push({
          type: 'warning',
          category: 'measurement',
          message: `Measurement formatting: add space before units in "${measurement}"`,
          severity: 'low'
        });
        score -= 2;
      }
    });

    // Check for metric units
    const imperialUnits = ['inches', 'feet', 'pounds', 'fahrenheit'];
    imperialUnits.forEach(unit => {
      if (report.toLowerCase().includes(unit)) {
        issues.push({
          type: 'warning',
          category: 'measurement',
          message: `Use metric units instead of imperial (${unit})`,
          severity: 'medium'
        });
        score -= 5;
      }
    });

    return {
      passed: score >= 75,
      score: Math.max(0, score),
      issues,
      suggestions: []
    };
  }

  /**
   * Validate clinical content appropriateness
   */
  public validateClinicalContent(report: string, workflowType: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    let score = 100;

    const expectedTerms = this.getExpectedClinicalTerms(workflowType);
    const presentTerms = expectedTerms.filter(term => 
      report.toLowerCase().includes(term.toLowerCase())
    );

    const coveragePercent = (presentTerms.length / expectedTerms.length) * 100;

    if (coveragePercent < 50) {
      issues.push({
        type: 'warning',
        category: 'clinical',
        message: `Report may be missing key clinical elements for ${workflowType} (${Math.round(coveragePercent)}% coverage)`,
        severity: 'medium'
      });
      score -= 20;
    } else if (coveragePercent < 75) {
      issues.push({
        type: 'info',
        category: 'clinical',
        message: `Good clinical coverage for ${workflowType} (${Math.round(coveragePercent)}%)`,
        severity: 'low'
      });
      score -= 5;
    }

    // Check for clinical reasoning
    const reasoningIndicators = [
      'therefore', 'hence', 'consequently', 'due to', 'because',
      'given', 'considering', 'in view of', 'plan', 'recommend'
    ];

    const hasReasoning = reasoningIndicators.some(indicator =>
      report.toLowerCase().includes(indicator)
    );

    if (!hasReasoning && workflowType === 'consultation') {
      issues.push({
        type: 'warning',
        category: 'clinical',
        message: 'Consultation reports should include clinical reasoning',
        severity: 'medium'
      });
      score -= 10;
    }

    return {
      passed: score >= 75,
      score: Math.max(0, score),
      issues,
      suggestions: []
    };
  }

  // Helper methods
  private extractSections(report: string): string[] {
    // Extract section headers (words followed by colons or all caps)
    const sectionRegex = /^([A-Z][A-Z\s]+):?|^([A-Za-z\s]+):/gm;
    const matches = report.match(sectionRegex) || [];
    return matches.map(match => match.replace(':', '').trim());
  }

  private extractMedicalTerms(report: string): string[] {
    // Extract potential medical terms (capitalized words, abbreviations)
    const termRegex = /\b[A-Z]{2,}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    return report.match(termRegex) || [];
  }

  private extractMeasurements(report: string): string[] {
    const allMeasurements: string[] = [];
    this.measurementPatterns.forEach(pattern => {
      const matches = report.match(pattern) || [];
      allMeasurements.push(...matches);
    });
    return allMeasurements;
  }

  private findIncorrectTerminology(report: string): Array<{incorrect: string, correct: string, location: string}> {
    const errors: Array<{incorrect: string, correct: string, location: string}> = [];
    
    // Common medical terminology errors
    const commonErrors = new Map([
      ['heart attack', 'myocardial infarction'],
      ['blood clot', 'thrombus'],
      ['heart rate', 'heart rate'], // This is actually correct
      ['blood pressure', 'blood pressure'], // This is correct
    ]);

    commonErrors.forEach((correct, incorrect) => {
      const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
      const matches = [...report.matchAll(regex)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          errors.push({
            incorrect: match[0],
            correct,
            location: `Position ${match.index}`
          });
        }
      });
    });

    return errors;
  }

  private getExpectedSections(workflowType: string): string[] {
    const sectionMap: Record<string, string[]> = {
      'consultation': ['History', 'Examination', 'Investigations', 'Assessment', 'Plan'],
      'tavi': ['Procedure Details', 'Hemodynamic Results', 'Complications'],
      'angiogram-pci': ['Angiographic Findings', 'Intervention', 'Final Result'],
      'quick-letter': ['Assessment', 'Plan'],
      'mteer': ['Procedure', 'Results', 'Complications'],
      'pfo-closure': ['Indication', 'Procedure', 'Result'],
      'right-heart-cath': ['Hemodynamics', 'Measurements', 'Interpretation']
    };

    return sectionMap[workflowType] || ['Assessment', 'Plan'];
  }

  private getExpectedWordCountRange(workflowType: string): {min: number, max: number} {
    const ranges: Record<string, {min: number, max: number}> = {
      'quick-letter': {min: 50, max: 200},
      'consultation': {min: 200, max: 500},
      'tavi': {min: 300, max: 800},
      'angiogram-pci': {min: 250, max: 600},
      'mteer': {min: 200, max: 500},
      'pfo-closure': {min: 150, max: 400},
      'right-heart-cath': {min: 150, max: 350},
      'investigation-summary': {min: 100, max: 300},
      'background': {min: 100, max: 400},
      'medication': {min: 50, max: 250},
      'ai-medical-review': {min: 150, max: 400}
    };

    return ranges[workflowType] || {min: 100, max: 300};
  }

  private getExpectedClinicalTerms(workflowType: string): string[] {
    const termMap: Record<string, string[]> = {
      'tavi': ['valve', 'aortic', 'gradient', 'hemodynamic', 'procedure', 'deployment'],
      'angiogram-pci': ['coronary', 'stenosis', 'vessel', 'stent', 'TIMI', 'angiography'],
      'consultation': ['assessment', 'examination', 'history', 'plan', 'recommendation'],
      'mteer': ['mitral', 'regurgitation', 'clip', 'leaflet', 'repair'],
      'pfo-closure': ['foramen ovale', 'septal', 'device', 'closure', 'shunt'],
      'right-heart-cath': ['pressure', 'cardiac output', 'pulmonary', 'catheterisation']
    };

    return termMap[workflowType] || ['patient', 'clinical', 'assessment'];
  }

  private generateSuggestions(issues: ValidationIssue[], workflowType: string): string[] {
    const suggestions: string[] = [];

    // Generate suggestions based on issue types
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    if (errorCount > 0) {
      suggestions.push('Address critical terminology errors before finalizing report');
    }

    if (warningCount > 3) {
      suggestions.push('Consider reviewing clinical documentation guidelines');
    }

    const structureIssues = issues.filter(i => i.category === 'structure').length;
    if (structureIssues > 0) {
      suggestions.push('Improve report organization with clear section headers');
    }

    const spellingIssues = issues.filter(i => i.category === 'spelling').length;
    if (spellingIssues > 0) {
      suggestions.push('Use Australian spelling conventions for medical terminology');
    }

    return suggestions;
  }
}