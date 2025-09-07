import { NarrativeLetterAgent } from '../base/NarrativeLetterAgent';
import { QUICK_LETTER_SYSTEM_PROMPTS } from './QuickLetterSystemPrompts';
import { QUICK_LETTER_PATIENT_VERSION_SYSTEM_PROMPTS } from './QuickLetterPatientVersionSystemPrompts';
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
    
    // Override the base system prompt with Quick Letter specific prompts
    this.systemPrompt = QUICK_LETTER_SYSTEM_PROMPTS.primary;
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    // Store basic extracted data for potential context enhancement
    const extractedData = this.extractBasicLetterData(input);
    
    // Build contextualized system prompt
    let contextualPrompt = this.systemPrompt;
    if (extractedData.letterType !== 'general') {
      contextualPrompt += `\n\nDetected context: This appears to be ${extractedData.letterType} correspondence. Focus on the relevant clinical content while maintaining continuous narrative prose format.`;
    }

    const startTime = Date.now();
    
    console.log('📝 QuickLetter: Starting main letter generation');
    console.log('🔧 System prompt preview:', contextualPrompt.substring(0, 200) + '...');
    console.log('📥 Input preview:', input.substring(0, 100) + '...');
    
    // Get raw model output directly so we can parse SUMMARY/LETTER
    const rawOutput = await this.lmStudioService.processWithAgent(
      contextualPrompt,
      input,
      this.agentType
    );

    console.log('📤 Raw LMStudio output length:', rawOutput.length);
    console.log('📤 Raw output preview:', rawOutput.substring(0, 300) + '...');
    console.log('🔍 Looking for SUMMARY: and LETTER: markers in output');

    // Parse into summary + letter, then clean letter
    const { summary, letterContent } = this.parseStructuredResponse(rawOutput);
    console.log('✅ Parsed summary:', summary.substring(0, 150) + '...');
    console.log('✅ Parsed letter content length:', letterContent.length);
    console.log('✅ Parsed letter preview:', letterContent.substring(0, 200) + '...');
    const cleanedLetter = this.cleanNarrativeTextPreserveParagraphs(letterContent);

    // Apply fallback paragraph detection if needed
    const finalLetter = this.applyFallbackParagraphFormatting(cleanedLetter);

    // Confidence and warnings
    const hasHallucination = this.detectHallucination(input, finalLetter);
    const warnings: string[] = hasHallucination 
      ? ['Output may contain material not present in original dictation. Please review carefully.']
      : [];
    const confidence = this.calculateNarrativeConfidence(input, finalLetter);

    // Detect missing information (separate analysis call)
    console.log('🔍 QuickLetter: Starting missing information analysis (separate from main letter)');
    const missingInfo = await this.detectMissingInformation(input, extractedData.letterType);
    console.log('📊 Missing info analysis complete:', missingInfo ? JSON.stringify(missingInfo).substring(0, 200) + '...' : 'null');

    // Validate minimum content
    const validation = this.validateAndFormatContent(finalLetter, input, confidence);
    const errors: string[] = [];
    if (validation.hasError && validation.errorMessage) {
      errors.push(validation.errorMessage);
    }

    const processingTime = Date.now() - startTime;
    const report = this.createReport(
      validation.content,
      [],
      context,
      processingTime,
      confidence,
      warnings,
      errors
    );

    // Add missing information warnings to metadata
    if (missingInfo) {
      report.metadata.missingInformation = missingInfo;
    }

    return { ...report, content: validation.content, summary };
  }

  /**
   * Clean and normalize narrative text while preserving paragraph breaks.
   * Mirrors base cleaning rules but keeps double newlines intact.
   */
  private cleanNarrativeTextPreserveParagraphs(text: string): string {
    let cleaned = text;

    // Remove salutations and sign-offs (end-only). Do NOT remove 'Thank you' in body.
    cleaned = cleaned.replace(/^(Dear\s+[^,\n]+,?\s*)/gmi, '');
    cleaned = cleaned.replace(/(?:\r?\n|\r)(Kind\s+regards|Yours\s+sincerely|Best\s+wishes)[\s\S]*$/gmi, '');

    // Remove section headers and formatting
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, ''); // Remove **headings**
    cleaned = cleaned.replace(/^#+\s+.*/gm, ''); // Remove markdown headers
    cleaned = cleaned.replace(/^[-=]{2,}$/gm, ''); // Remove dividers

    // Strip filler words and false starts
    cleaned = cleaned.replace(/\b(um|uh|er|you know|like|I mean|actually|basically|sort of|kind of)\b/gi, '');
    cleaned = cleaned.replace(/\b(\w+)\s+\.\.\.\s+\1\b/gi, '$1');

    // Convert numbers to digits with units
    cleaned = cleaned.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(mg|mcg|g|ml|l|mmol\/l|mmhg|units?|years?|months?|weeks?|days?|hours?)\b/gi, (match, num, unit) => {
      const numbers: { [key: string]: string } = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
      };
      return `${numbers[num.toLowerCase()]} ${unit}`;
    });

    // Normalise medication format
    cleaned = cleaned.replace(/(\b[a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole)\b)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g)\s+(daily|once daily|twice daily|bd|od|tds)\b/gi,
      '$1 $2 $3 $4');

    // Australian spelling conversions (general and medical terminology)
    const australianSpelling: { [key: string]: string } = {
      // General terms
      'recognize': 'recognise', 'optimize': 'optimise', 'center': 'centre',
      'favor': 'favour', 'color': 'colour', 'organize': 'organise',
      'realize': 'realise', 'analyze': 'analyse', 'defense': 'defence',
      
      // Medical terminology - American to Australian
      'dyspnea': 'dyspnoea', 'anemia': 'anaemia', 'edema': 'oedema',
      'esophageal': 'oesophageal', 'hemoglobin': 'haemoglobin', 'hemorrhage': 'haemorrhage',
      'leukemia': 'leukaemia', 'pediatric': 'paediatric', 'orthopedic': 'orthopaedic',
      'anesthesia': 'anaesthesia', 'hemodynamic': 'haemodynamic', 'tumor': 'tumour',
      'diarrhea': 'diarrhoea', 'estrogen': 'oestrogen', 'fetus': 'foetus'
    };
    for (const [american, australian] of Object.entries(australianSpelling)) {
      const regex = new RegExp(`\\b${american}\\b`, 'gi');
      cleaned = cleaned.replace(regex, australian);
    }

    // Expand common contractions (formal medical prose)
    const contractions: Record<string, string> = {
      "I'm": 'I am',
      "I've": 'I have',
      "I'll": 'I will',
      "I'd": 'I would',
      "he's": 'he is',
      "she's": 'she is',
      "it's": 'it is',
      "we're": 'we are',
      "we've": 'we have',
      "we'll": 'we will',
      "they're": 'they are',
      "they've": 'they have',
      "they'll": 'they will',
      "can't": 'cannot',
      "won't": 'will not',
      "don't": 'do not',
      "doesn't": 'does not',
      "didn't": 'did not',
      "isn't": 'is not',
      "aren't": 'are not',
      "wasn't": 'was not',
      "weren't": 'were not',
      "haven't": 'have not',
      "hasn't": 'has not',
      "hadn't": 'had not',
      "shouldn't": 'should not',
      "wouldn't": 'would not',
      "couldn't": 'could not'
    };
    for (const [c, e] of Object.entries(contractions)) {
      const re = new RegExp(`\\b${c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
      cleaned = cleaned.replace(re, e);
    }

    // Preserve paragraph structure:
    // - Normalize line endings
    // - Collapse 3+ newlines to exactly two (blank line between paragraphs)
    // - Trim trailing spaces on lines while preserving paragraph breaks
    cleaned = cleaned.replace(/\r\n?/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // FIXED: Preserve paragraph breaks while trimming line spaces
    // Split by paragraph breaks, trim each paragraph's lines, then rejoin
    const paragraphs = cleaned.split('\n\n');
    cleaned = paragraphs
      .map(paragraph => 
        paragraph
          .split('\n')
          .map(line => line.trim())
          .join('\n')
          .trim()
      )
      .filter(paragraph => paragraph.length > 0) // Remove empty paragraphs
      .join('\n\n');

    // Ensure proper spacing after sentence punctuation across line joins but don't remove paragraph breaks
    cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1 $2');

    // Final trim
    cleaned = cleaned.trim();
    return cleaned;
  }

  /**
   * Clean summary text to remove trailing dashes and separators
   */
  private cleanSummaryText(summaryText: string): string {
    return summaryText
      .trim()
      // Remove trailing dashes of various types
      .replace(/[-–—]+\s*$/, '')
      // Remove any remaining trailing whitespace
      .trim();
  }

  /**
   * Parse structured response with SUMMARY: and LETTER: sections
   */
  private parseStructuredResponse(outputText: string): { summary: string; letterContent: string } {
    try {
      console.log('🔧 Parsing structured response for SUMMARY: and LETTER: markers');
      
      // Robust parsing that does not depend on a '---' divider
      // 1) Prefer explicit markers if present (even if formatting was cleaned)
      const summaryIdx = outputText.indexOf('SUMMARY:');
      const letterIdx = outputText.indexOf('LETTER:');

      console.log('🔍 Found SUMMARY: at index:', summaryIdx);
      console.log('🔍 Found LETTER: at index:', letterIdx);

      if (summaryIdx !== -1 && letterIdx !== -1 && summaryIdx < letterIdx) {
        console.log('✅ Found both SUMMARY: and LETTER: markers in correct order');
        const summaryRaw = outputText
          .substring(summaryIdx + 'SUMMARY:'.length, letterIdx)
          .trim();
        const letterContent = outputText
          .substring(letterIdx + 'LETTER:'.length)
          .trim();

        console.log('📋 Extracted summary raw:', summaryRaw.substring(0, 100) + '...');
        console.log('📝 Extracted letter content length:', letterContent.length);
        
        // Clean the extracted summary to remove trailing dashes
        const summary = this.cleanSummaryText(summaryRaw);
        console.log('🧹 Cleaned summary:', summary);
        return { summary, letterContent };
      }

      // 2) Legacy pattern with explicit '---' divider (if it survived cleaning)
      console.log('🔍 Checking for legacy --- divider pattern');
      const legacySummaryMatch = outputText.match(/SUMMARY:\s*(.+?)(?=---)/s);
      const legacyLetterMatch = outputText.match(/LETTER:\s*(.*)/s);
      if (legacySummaryMatch && legacyLetterMatch) {
        console.log('✅ Found legacy pattern with --- divider');
        const summary = this.cleanSummaryText(legacySummaryMatch[1].trim());
        const letterContent = legacyLetterMatch[1].trim();
        return { summary, letterContent };
      }

      // 3) Fallback: treat entire output as letter content and synthesize a summary
      console.log('⚠️ No SUMMARY:/LETTER: markers found, using fallback parsing');
      console.log('📄 Raw output for fallback:', outputText.substring(0, 200) + '...');
      const intelligentSummary = this.generateIntelligentSummary(outputText);
      const fallbackSummary = intelligentSummary.length > 150
        ? intelligentSummary.substring(0, 147) + '...'
        : intelligentSummary;

      console.log('🔄 Generated fallback summary:', fallbackSummary);
      console.log('📝 Using entire output as letter content (length:', outputText.length, ')');

      return {
        summary: fallbackSummary,
        letterContent: outputText
      };
    } catch (error) {
      console.warn('❌ Error parsing structured response:', error);
      const fallbackSummary = outputText.length > 150
        ? outputText.substring(0, 147) + '...'
        : outputText;
      console.log('🚨 Using emergency fallback parsing');
      return { summary: fallbackSummary, letterContent: outputText };
    }
  }

  /**
   * Apply fallback paragraph formatting if AI model failed to create proper paragraphs
   * Intelligently detects topic changes and clinical sections for paragraph insertion
   */
  private applyFallbackParagraphFormatting(text: string): string {
    // If text already has good paragraph structure, return as-is
    const currentParagraphs = (text.match(/\n\n/g) || []).length;
    const totalSentences = (text.match(/[.!?]\s+/g) || []).length;
    const textLength = text.length;

    // Heuristic: If we have reasonable paragraph breaks relative to content, don't modify
    if (currentParagraphs > 0 && textLength > 200) {
      const paragraphDensity = totalSentences / (currentParagraphs + 1);
      if (paragraphDensity < 8) { // Reasonable paragraph length (< 8 sentences per paragraph)
        return text;
      }
    }

    let formatted = text;

    // Define patterns that typically indicate paragraph breaks in medical letters
    const paragraphBreakPatterns = [
      // Time transitions
      /\.\s+(Today|Yesterday|On \w+|This morning|This afternoon|This evening|Initially|Subsequently|Following|After|During|Prior to)\s/g,
      
      // Clinical assessment transitions
      /\.\s+(On examination|Examination revealed|Clinical assessment|Assessment shows|I found|I noted|I observed|The patient|He|She)\s/g,
      
      // Investigation transitions
      /\.\s+(Investigations|Results showed|The ECG|The echo|The chest X-ray|Blood tests|Further testing|Imaging|Laboratory results)\s/g,
      
      // Treatment and plan transitions
      /\.\s+(Treatment|Management|The plan|I recommend|I have arranged|We discussed|I explained|Follow.up|Next steps)\s/g,
      
      // Clinical reasoning transitions
      /\.\s+(Given|Considering|In view of|Based on|Therefore|Hence|Consequently|As a result)\s/g,
      
      // Procedural steps
      /\.\s+(The procedure|During the|We proceeded|I performed|The intervention|Under|With)\s/g
    ];

    // Apply paragraph breaks at pattern matches
    paragraphBreakPatterns.forEach(pattern => {
      formatted = formatted.replace(pattern, (match) => {
        const parts = match.split(/\.\s+/);
        if (parts.length >= 2) {
          return parts[0] + '.\n\n' + parts.slice(1).join('. ');
        }
        return match;
      });
    });

    // Clean up any excessive spacing that may have been created
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.trim();

    // Log paragraph improvements if significant
    const newParagraphs = (formatted.match(/\n\n/g) || []).length;
    if (newParagraphs > currentParagraphs) {
      console.log(`📝 QuickLetter: Added ${newParagraphs - currentParagraphs} paragraph breaks for better formatting`);
    }

    return formatted;
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

  /**
   * Detect missing information in letter dictation for comprehensive medical correspondence
   */
  private async detectMissingInformation(input: string, letterType: string): Promise<any> {
    try {
      console.log('🕵️ QuickLetter Missing Info: Using analysis prompt (NOT letter generation)');
      const missingInfoPrompt = `${QUICK_LETTER_SYSTEM_PROMPTS.missingInfoDetection}

DICTATION TO ANALYZE:
${input}`;

      console.log('🕵️ Missing info prompt preview:', missingInfoPrompt.substring(0, 100) + '...');
      const response = await this.lmStudioService.processWithAgent(missingInfoPrompt, input);
      console.log('🕵️ Missing info response length:', response.length);
      console.log('🕵️ Missing info response preview:', response.substring(0, 200) + '...');
      
      try {
        const missingInfo = JSON.parse(response.replace(/```json|```/g, '').trim());
        console.log('✅ Successfully parsed missing info JSON');
        return missingInfo;
      } catch (parseError) {
        console.warn('⚠️ Failed to parse missing info JSON, using fallback');
        return this.fallbackMissingInfoDetection(input, letterType);
      }
      
    } catch (error) {
      console.error('❌ Error detecting missing information:', error);
      return this.fallbackMissingInfoDetection(input, letterType);
    }
  }

  /**
   * Fallback missing info detection using keyword analysis for Quick Letters
   */
  private fallbackMissingInfoDetection(input: string, letterType: string): any {
    const text = input.toLowerCase();
    const missing = {
      letter_type: letterType,
      missing_purpose: [] as string[],
      missing_clinical: [] as string[],
      missing_recommendations: [] as string[],
      completeness_score: "80%"
    };

    // Check for purpose clarity
    if (!text.includes('refer') && !text.includes('follow up') && !text.includes('consultation') && 
        !text.includes('thank you') && letterType === 'general') {
      missing.missing_purpose.push('Letter purpose or reason for correspondence');
    }

    // Check for clinical context
    if (!text.includes('patient') && !text.includes('gentleman') && !text.includes('lady') && 
        !text.includes('year old') && !text.includes('age')) {
      missing.missing_clinical.push('Patient demographics or context');
    }

    // Check for clinical findings
    if (!text.includes('examination') && !text.includes('found') && !text.includes('shows') &&
        !text.includes('revealed') && !text.includes('noted') && text.length > 100) {
      missing.missing_clinical.push('Clinical examination findings');
    }

    // Check for investigations when mentioned
    if ((text.includes('test') || text.includes('scan') || text.includes('echo') || 
         text.includes('ecg') || text.includes('x-ray')) && 
        !text.includes('result') && !text.includes('showed') && !text.includes('revealed')) {
      missing.missing_clinical.push('Investigation results');
    }

    // Check for treatment recommendations
    if ((text.includes('recommend') || text.includes('suggest') || text.includes('advise')) &&
        !text.includes('follow up') && !text.includes('appointment') && !text.includes('monitor')) {
      missing.missing_recommendations.push('Specific follow-up arrangements');
    }

    // Check for medication details when medications mentioned
    const medicationMentioned = this.extractMentionedMedications(text).length > 0;
    if (medicationMentioned && !text.includes('mg') && !text.includes('dose') && 
        !text.includes('daily') && !text.includes('twice') && !text.includes('continue')) {
      missing.missing_recommendations.push('Medication dosages or administration details');
    }

    // Adjust completeness score based on missing elements
    const totalMissing = missing.missing_purpose.length + missing.missing_clinical.length + missing.missing_recommendations.length;
    if (totalMissing === 0) {
      missing.completeness_score = "95%";
    } else if (totalMissing <= 2) {
      missing.completeness_score = "85%";
    } else if (totalMissing <= 4) {
      missing.completeness_score = "70%";
    } else {
      missing.completeness_score = "60%";
    }

    return missing;
  }

  /**
   * Generate a patient-friendly version of a medical letter
   * Converts medical jargon into accessible language for patients
   */
  async generatePatientVersion(medicalLetter: string): Promise<string> {
    try {
      const startTime = Date.now();
      
      console.log('🎯 QuickLetter: Generating patient-friendly version');
      
      // Build the prompt for patient version conversion
      const conversionPrompt = `${QUICK_LETTER_PATIENT_VERSION_SYSTEM_PROMPTS.primary}

MEDICAL LETTER TO CONVERT:
${medicalLetter}

Please rewrite this medical letter in a clear, patient-friendly format that patients and their families can easily understand.`;

      // Process with LMStudio service using the patient version prompts
      const patientFriendlyContent = await this.lmStudioService.processWithAgent(
        conversionPrompt,
        medicalLetter,
        'quick-letter' // Use same agent type for consistency
      );

      // Clean up the patient version content
      const cleanedContent = this.cleanPatientVersionContent(patientFriendlyContent);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Patient version generated in ${processingTime}ms`);
      
      return cleanedContent;
      
    } catch (error) {
      console.error('❌ Error generating patient version:', error);
      
      // Fallback patient-friendly message
      return `Dear Patient,

We wanted to share some information about your recent medical consultation in simple terms.

${this.createFallbackPatientVersion(medicalLetter)}

If you have any questions about this information, please don't hesitate to call us on (03) 9509 5009.`;
    }
  }

  /**
   * Clean and format patient version content
   */
  private cleanPatientVersionContent(content: string): string {
    let cleaned = content.trim();
    
    // Remove any system prompt artifacts
    cleaned = cleaned.replace(/^(You are|Please rewrite|MEDICAL LETTER|Patient Version|CONVERSION:).*$/gim, '');
    
    // Ensure proper paragraph spacing
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Remove any remaining medical abbreviations without explanation
    const commonAbbreviations: Record<string, string> = {
      'CAD': 'coronary artery disease',
      'MI': 'heart attack',
      'CABG': 'heart bypass surgery', 
      'PCI': 'artery opening procedure',
      'AF': 'irregular heartbeat',
      'HF': 'heart failure',
      'HTN': 'high blood pressure',
      'DM': 'diabetes',
      'COPD': 'lung disease',
      'PE': 'blood clot in lung',
      'DVT': 'blood clot in leg'
    };
    
    // Replace abbreviations with full terms
    Object.entries(commonAbbreviations).forEach(([abbrev, fullTerm]) => {
      const regex = new RegExp(`\\b${abbrev}\\b(?!\\s*\\()`, 'gi');
      cleaned = cleaned.replace(regex, fullTerm);
    });
    
    // Ensure the letter starts properly
    if (!cleaned.match(/^(Dear|Hello)/i)) {
      cleaned = 'Dear Patient,\n\n' + cleaned;
    }
    
    // Ensure proper closing if missing
    if (!cleaned.match(/(sincerely|regards|team)$/i)) {
      cleaned += '\n\nBest regards,\nYour Medical Team';
    }
    
    return cleaned.trim();
  }

  /**
   * Create a basic fallback patient version when AI processing fails
   */
  private createFallbackPatientVersion(medicalLetter: string): string {
    // Extract key information using simple patterns
    const text = medicalLetter.toLowerCase();
    let fallback = '';
    
    // Try to extract basic condition information
    if (text.includes('heart') || text.includes('cardiac')) {
      fallback += 'We discussed your heart condition. ';
    }
    if (text.includes('blood pressure') || text.includes('hypertension')) {
      fallback += 'Your blood pressure needs attention. ';
    }
    if (text.includes('medication') || text.includes('tablet')) {
      fallback += 'We have prescribed medication to help with your condition. ';
    }
    if (text.includes('follow up') || text.includes('appointment')) {
      fallback += 'We would like to see you for a follow-up appointment. ';
    }
    
    // If no specific conditions found, provide general message
    if (!fallback) {
      fallback = 'We have reviewed your medical information and will contact you with next steps. ';
    }
    
    fallback += 'Please contact our office if you have any questions about your care.';
    
    return fallback;
  }
}
