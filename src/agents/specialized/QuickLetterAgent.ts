import { NarrativeLetterAgent } from '../base/NarrativeLetterAgent';
import type { MedicalContext, MedicalReport } from '@/types/medical.types';

/**
 * Specialized agent for processing Quick Medical Letters and brief correspondence.
 * Generates clean narrative prose for dictated letters, referrals, and brief medical notes.
 * Handles single-speaker dictated content with phrases like "Thank you for seeing..."
 */
export class QuickLetterAgent extends NarrativeLetterAgent {
  
  /**
   * Simple heuristic to detect hallucinated content:
   * Counts tokens (>3 chars) that never appeared in the original dictation.
   * If >15 novel tokens are present, we flag it as hallucination.
   */
  protected detectHallucination(source: string, generated: string): boolean {
    const srcTokens = new Set((source.toLowerCase().match(/\b[a-z0-9]+\b/g) || []));
    const genTokens = generated.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    let novel = 0;
    for (const tok of genTokens) {
      if (tok.length > 3 && !srcTokens.has(tok)) {
        novel++;
        if (novel > 15) return true;
      }
    }
    return false;
  }

  // Comprehensive medical terminology for Australian cardiology context
  private readonly medicationCategories: Record<string, string[]> = {
    'cardiac': [
      // Antiplatelet agents
      'aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel',
      // Anticoagulants
      'warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin',
      // ACE inhibitors/ARBs
      'perindopril', 'ramipril', 'lisinopril', 'candesartan', 'irbesartan', 'telmisartan',
      // Beta-blockers
      'metoprolol', 'bisoprolol', 'carvedilol', 'atenolol', 'nebivolol',
      // Calcium channel blockers
      'amlodipine', 'diltiazem', 'verapamil', 'felodipine', 'lercanidipine',
      // Diuretics
      'frusemide', 'indapamide', 'hydrochlorothiazide', 'spironolactone', 'eplerenone',
      'amiloride',
      // Statins
      'atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin',
      // Anti-arrhythmics
      'amiodarone', 'sotalol', 'flecainide', 'digoxin',
      // Heart‑failure & vasodilators
      'sacubitril-valsartan', 'ivabradine', 'vericiguat',
      'glyceryl trinitrate', 'isosorbide mononitrate', 'isosorbide dinitrate',
      'nicorandil', 'hydralazine',
      // Advanced lipid‑lowering
      'evolocumab', 'alirocumab', 'inclisiran',
      // Additional anti‑arrhythmics
      'dofetilide', 'propafenone', 'disopyramide',
      // Pulmonary‑HTN / HF adjuncts
      'macitentan', 'sildenafil', 'tadalafil', 'ambrisentan', 'riociguat'
    ],
    'diabetes': [
      'metformin', 'gliclazide', 'glimepiride', 'insulin', 'empagliflozin', 
      'dapagliflozin', 'sitagliptin', 'linagliptin', 'dulaglutide', 'semaglutide'
    ],
    'respiratory': [
      'salbutamol', 'tiotropium', 'budesonide', 'prednisolone', 'formoterol',
      'salmeterol', 'ipratropium', 'montelukast'
    ],
    'pain': [
      'paracetamol', 'ibuprofen', 'tramadol', 'morphine', 'oxycodone',
      'celecoxib', 'diclofenac', 'naproxen'
    ],
    'gastrointestinal': [
      'omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole', 'ranitidine'
    ],
    'other': [
      'allopurinol', 'colchicine', 'levothyroxine', 'vitamin_d', 'calcium'
    ]
  };

  constructor() {
    super(
      'Quick Letter Agent',
      'Medical Correspondence',
      'Generates clean narrative prose for dictated medical letters and brief correspondence',
      'quick-letter'
    );
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    // Store basic extracted data for potential context enhancement
    const extractedData = this.extractBasicLetterData(input);
    
    // Add context about letter type to the system prompt if detected
    let contextualPrompt = this.systemPrompt;
    if (extractedData.letterType !== 'general') {
      contextualPrompt += `\n\nDetected context: This appears to be ${extractedData.letterType} correspondence. Focus on the relevant clinical content while maintaining continuous narrative prose format.`;
    }

    // Use the base NarrativeLetterAgent processing with enhanced context
    const tempSystemPrompt = this.systemPrompt;
    this.systemPrompt = contextualPrompt;
    
    try {
      const result = await super.process(input, context);
      
      // Parse the structured response to extract summary and letter content
      const outputText = result.content ?? '';
      const parsedResult = this.parseStructuredResponse(outputText);
      
      // Hallucination guard on the letter content
      if (this.detectHallucination(input, parsedResult.letterContent)) {
        this.systemPrompt = tempSystemPrompt; // ensure prompt restored
        // Add warning instead of replacing content
        const warnings = result.warnings ? [...result.warnings] : [];
        warnings.push('Output may contain material not present in original dictation. Please review carefully.');
        return {
          ...result,
          content: parsedResult.letterContent,
          summary: parsedResult.summary,
          warnings
        };
      }
      
      this.systemPrompt = tempSystemPrompt; // Restore original
      return {
        ...result,
        content: parsedResult.letterContent,
        summary: parsedResult.summary
      };
    } catch (error) {
      this.systemPrompt = tempSystemPrompt; // Restore original
      throw error;
    }
  }

  /**
   * Parse structured response with SUMMARY: and LETTER: sections
   */
  private parseStructuredResponse(outputText: string): { summary: string; letterContent: string } {
    try {
      // Look for the structured format: SUMMARY: ... --- LETTER: ...
      const summaryMatch = outputText.match(/SUMMARY:\s*(.+?)(?=---)/s);
      const letterMatch = outputText.match(/LETTER:\s*(.*)/s);
      
      if (summaryMatch && letterMatch) {
        const letterContent = letterMatch[1].trim();
        
        // Always use our enhanced intelligent summary generation instead of AI-generated summary
        const intelligentSummary = this.generateIntelligentSummary(letterContent);
        const enhancedSummary = intelligentSummary.length > 150 ? 
          intelligentSummary.substring(0, 147) + '...' : 
          intelligentSummary;
        
        return {
          summary: enhancedSummary,
          letterContent: letterContent
        };
      }
      
      // Fallback: if structured format not found, treat entire output as letter content
      // and generate an intelligent summary by analyzing the content
      const intelligentSummary = this.generateIntelligentSummary(outputText);
      const fallbackSummary = intelligentSummary.length > 150 ? 
        intelligentSummary.substring(0, 147) + '...' : 
        intelligentSummary;
      
      return {
        summary: fallbackSummary,
        letterContent: outputText
      };
    } catch (error) {
      console.warn('Error parsing structured response:', error);
      // Fallback: return original content for both
      const fallbackSummary = outputText.length > 150 ? 
        outputText.substring(0, 147) + '...' : 
        outputText;
      
      return {
        summary: fallbackSummary,
        letterContent: outputText
      };
    }
  }

  /**
   * Generate an intelligent clinical summary by analyzing the letter content
   * Focuses on key diagnoses, procedures, and actionable recommendations
   */
  private generateIntelligentSummary(content: string): string {
    const text = content.toLowerCase();
    const summaryComponents: string[] = [];
    
    // 1. Extract primary cardiac conditions with severity
    const cardiacFindings = this.extractCardiacFindings(text);
    if (cardiacFindings.length > 0) {
      summaryComponents.push(cardiacFindings.join(' + '));
    }
    
    // 2. Extract other key medical findings
    const otherFindings = this.extractOtherMedicalFindings(text);
    if (otherFindings.length > 0) {
      summaryComponents.push(...otherFindings);
    }
    
    // 3. Extract surgical/procedural recommendations
    const surgicalRecs = this.extractSurgicalRecommendations(text);
    if (surgicalRecs.length > 0) {
      summaryComponents.push(surgicalRecs.join('; '));
    }
    
    // 4. Extract medication recommendations
    const medicationRecs = this.extractMedicationRecommendations(text);
    if (medicationRecs.length > 0) {
      summaryComponents.push(...medicationRecs);
    }
    
    // 5. Extract follow-up and monitoring plans
    const followUpPlans = this.extractFollowUpPlans(text);
    if (followUpPlans.length > 0) {
      summaryComponents.push(...followUpPlans);
    }
    
    // 6. Extract normal findings (important for reassurance)
    const normalFindings = this.extractNormalFindings(text);
    if (normalFindings.length > 0) {
      summaryComponents.push(...normalFindings);
    }
    
    // Construct the summary
    if (summaryComponents.length > 0) {
      // Join components with appropriate punctuation
      let summary = summaryComponents.join('. ');
      
      // Clean up the summary
      summary = this.cleanUpSummary(summary);
      
      // Ensure proper ending
      if (!summary.match(/[.!?]$/)) {
        summary += '.';
      }
      
      return summary;
    }
    
    // Fallback: extract most important clinical sentence
    return this.extractFallbackSummary(content);
  }

  /**
   * Extract cardiac conditions with severity qualifiers
   */
  private extractCardiacFindings(text: string): string[] {
    const findings: string[] = [];
    
    // Valve conditions with severity
    const valvePatterns = [
      { pattern: /\b(severe|moderate|mild)\s+(mitral\s+regurgitation|mr)\b/g, abbrev: (severity: string) => `${severity} MR` },
      { pattern: /\b(severe|moderate|mild)\s+(aortic\s+stenosis|as)\b/g, abbrev: (severity: string) => `${severity} AS` },
      { pattern: /\b(severe|moderate|mild)\s+(aortic\s+regurgitation|ar)\b/g, abbrev: (severity: string) => `${severity} AR` },
      { pattern: /\b(severe|moderate|mild)\s+(tricuspid\s+regurgitation|tr)\b/g, abbrev: (severity: string) => `${severity} TR` },
      { pattern: /\b(severe|moderate|mild)\s+(mitral\s+stenosis|ms)\b/g, abbrev: (severity: string) => `${severity} MS` }
    ];
    
    valvePatterns.forEach(({ pattern, abbrev }) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        findings.push(abbrev(match[1]));
      }
    });
    
    // Ventricular function
    if (text.includes('severe') && (text.includes('left ventricular dysfunction') || text.includes('lv dysfunction'))) {
      findings.push('severe LV dysfunction');
    } else if (text.includes('moderate') && (text.includes('left ventricular dysfunction') || text.includes('lv dysfunction'))) {
      findings.push('moderate LV dysfunction');
    } else if (text.includes('mild') && (text.includes('left ventricular dysfunction') || text.includes('lv dysfunction'))) {
      findings.push('mild LV dysfunction');
    }
    
    // Structural abnormalities
    if (text.includes('left ventricular aneurysm') || text.includes('lv aneurysm')) {
      findings.push('LV aneurysm');
    }
    if (text.includes('ventricular septal defect') || text.includes('vsd')) {
      findings.push('VSD');
    }
    if (text.includes('atrial septal defect') || text.includes('asd')) {
      findings.push('ASD');
    }
    
    return findings;
  }

  /**
   * Extract other important medical findings
   */
  private extractOtherMedicalFindings(text: string): string[] {
    const findings: string[] = [];
    
    // Coronary artery disease
    if (text.includes('triple vessel disease') || text.includes('3 vessel disease')) {
      findings.push('Triple vessel CAD');
    } else if (text.includes('double vessel disease') || text.includes('2 vessel disease')) {
      findings.push('Double vessel CAD');
    } else if (text.includes('single vessel disease') || text.includes('1 vessel disease')) {
      findings.push('Single vessel CAD');
    } else if (text.includes('coronary artery disease') || text.includes('cad')) {
      findings.push('CAD');
    }
    
    // Arrhythmias
    if (text.includes('atrial fibrillation') || text.includes('af')) {
      findings.push('AF');
    }
    if (text.includes('ventricular tachycardia') || text.includes('vt')) {
      findings.push('VT');
    }
    
    // Heart failure
    if (text.includes('heart failure') || text.includes('hf')) {
      findings.push('Heart failure');
    }
    
    return findings;
  }

  /**
   * Extract surgical and procedural recommendations
   */
  private extractSurgicalRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    
    // Surgical procedures
    if (text.includes('consideration of') && (text.includes('surgical repair') || text.includes('surgical replacement'))) {
      recommendations.push('for consideration of surgical repair or replacement');
    } else if (text.includes('surgical repair')) {
      recommendations.push('surgical repair recommended');
    } else if (text.includes('surgical replacement')) {
      recommendations.push('surgical replacement recommended');
    }
    
    // Specific procedures
    if (text.includes('aneurysmectomy')) {
      recommendations.push('aneurysmectomy planned');
    }
    if (text.includes('mitral valve replacement') || text.includes('mvr')) {
      recommendations.push('MVR planned');
    }
    if (text.includes('aortic valve replacement') || text.includes('avr')) {
      recommendations.push('AVR planned');
    }
    if (text.includes('cabg') || text.includes('bypass')) {
      recommendations.push('CABG planned');
    }
    if (text.includes('pci') || text.includes('angioplasty')) {
      recommendations.push('PCI planned');
    }
    
    return recommendations;
  }

  /**
   * Extract medication recommendations
   */
  private extractMedicationRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    
    // Statin management
    if (text.includes('continue') && (text.includes('statin') || text.includes('rosuvastatin') || text.includes('atorvastatin'))) {
      if (text.includes('low dose')) {
        recommendations.push('Continue statin at low dose');
      } else {
        recommendations.push('Continue statin');
      }
    } else if (text.includes('start') && text.includes('statin')) {
      recommendations.push('Start statin therapy');
    }
    
    // Anticoagulation
    if (text.includes('continue') && (text.includes('warfarin') || text.includes('anticoagulation'))) {
      recommendations.push('Continue anticoagulation');
    } else if (text.includes('start') && text.includes('anticoagulation')) {
      recommendations.push('Start anticoagulation');
    }
    
    // ACE inhibitors
    if (text.includes('continue') && (text.includes('ace inhibitor') || text.includes('perindopril') || text.includes('ramipril'))) {
      recommendations.push('Continue ACE inhibitor');
    }
    
    return recommendations;
  }

  /**
   * Extract follow-up and monitoring plans
   */
  private extractFollowUpPlans(text: string): string[] {
    const plans: string[] = [];
    
    // Monitoring for hypertension
    if (text.includes('monitor') && text.includes('hypertension')) {
      if (text.includes('24 months') || text.includes('2 years')) {
        plans.push('Monitor for hypertension over next 24 months');
      } else {
        plans.push('Monitor for hypertension');
      }
    }
    
    // Blood pressure monitoring
    if (text.includes('monitor') && text.includes('blood pressure')) {
      plans.push('Monitor blood pressure');
    }
    
    // Echo follow-up
    if (text.includes('echo') && (text.includes('follow up') || text.includes('repeat'))) {
      if (text.includes('6 months')) {
        plans.push('Repeat echo in 6 months');
      } else if (text.includes('12 months') || text.includes('1 year')) {
        plans.push('Repeat echo in 12 months');
      } else {
        plans.push('Echo follow-up');
      }
    }
    
    // CT scan plans
    if (text.includes('ct scan') && text.includes('arrange')) {
      plans.push('CT scan planned');
    }
    
    return plans;
  }

  /**
   * Extract normal findings that provide reassurance
   */
  private extractNormalFindings(text: string): string[] {
    const findings: string[] = [];
    
    // Normal coronary arteries
    if (text.includes('normal coronary arteries') || 
        (text.includes('coronary arteries') && text.includes('normal'))) {
      findings.push('No coronary disease');
    }
    
    // Zero calcium score
    if (text.includes('calcium score') && (text.includes('zero') || text.includes('0'))) {
      findings.push('Calcium score 0');
    }
    
    // Normal ejection fraction
    if (text.includes('normal') && (text.includes('ejection fraction') || text.includes('ef'))) {
      findings.push('Normal EF');
    }
    
    return findings;
  }

  /**
   * Clean up and format the summary
   */
  private cleanUpSummary(summary: string): string {
    return summary
      .replace(/\s+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .replace(/;\s*;/g, ';')
      .replace(/,\s*,/g, ',')
      .trim();
  }

  /**
   * Fallback summary extraction for cases where pattern matching fails
   */
  private extractFallbackSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    // Filter out greeting and closing sentences
    const clinicalSentences = sentences.filter(s => {
      const lower = s.toLowerCase();
      return !lower.includes('thank you') &&
             !lower.includes('dear') &&
             !lower.includes('sincerely') &&
             !lower.includes('kind regards') &&
             !lower.includes('yours faithfully') &&
             !lower.includes('it was a pleasure') &&
             !lower.startsWith('please') &&
             lower.length > 20;
    });
    
    // Take the first meaningful clinical sentence
    if (clinicalSentences.length > 0) {
      let summary = clinicalSentences[0].trim();
      if (summary.length > 150) {
        summary = summary.substring(0, 147) + '...';
      }
      return summary;
    }
    
    // Last resort
    return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
  }

  /**
   * Extract basic letter context without complex template logic
   */
  private extractBasicLetterData(input: string) {
    const text = input.toLowerCase();
    
    return {
      letterType: this.determineLetterType(text),
      urgency: this.extractUrgency(text),
      medications: this.extractMentionedMedications(text)
    };
  }

  private determineLetterType(text: string): string {
    // Check for specific letter type indicators
    if (text.includes('refer') || text.includes('referral') || text.includes('specialist opinion')) {
      return 'referral';
    }
    if (text.includes('follow up') || text.includes('follow-up') || text.includes('appointment')) {
      return 'follow-up';
    }
    if (text.includes('discharge') || text.includes('discharged') || text.includes('going home')) {
      return 'discharge';
    }
    if (text.includes('consultation') || text.includes('consult') || text.includes('opinion')) {
      return 'consultation';
    }
    if (text.includes('results') || text.includes('test') || text.includes('investigation')) {
      return 'results';
    }
    if (text.includes('medication') || text.includes('prescription') || text.includes('drug change')) {
      return 'medication';
    }
    
    return 'general';
  }

  private extractUrgency(text: string): string {
    if (text.includes('immediate') || text.includes('emergent') || text.includes('stat')) {
      return 'immediate';
    }
    if (text.includes('very urgent') || text.includes('asap') || text.includes('priority')) {
      return 'very_urgent';
    }
    if (text.includes('urgent') || text.includes('soon')) {
      return 'urgent';
    }
    if (text.includes('semi urgent') || text.includes('semi-urgent')) {
      return 'semi_urgent';
    }
    
    return 'routine';
  }

  private extractMentionedMedications(text: string): string[] {
    const medications: string[] = [];
    
    // Check all medication categories
    for (const [, meds] of Object.entries(this.medicationCategories)) {
      for (const med of meds) {
        if (text.includes(med.toLowerCase())) {
          medications.push(med);
        }
      }
    }
    
    return [...new Set(medications)]; // Remove duplicates
  }
}