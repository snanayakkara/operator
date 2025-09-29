/**
 * QuickLetter Summary Extraction Utilities
 * 
 * Extracted from QuickLetterAgent to support summary generation
 * in streaming completion flow without full agent processing.
 */

/**
 * Clean summary text to remove trailing dashes and separators
 */
function cleanSummaryText(summaryText: string): string {
  return summaryText
    .trim()
    // Remove trailing dashes of various types
    .replace(/[-–—]+\s*$/, '')
    // Remove any remaining trailing whitespace
    .trim();
}

/**
 * Clean up and format the summary
 */
function cleanUpSummary(summary: string): string {
  return summary
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/;\s*;/g, ';')
    .replace(/,\s*,/g, ',')
    .trim();
}

/**
 * Extract clinical findings from text for intelligent summary generation
 */
function extractClinicalFindings(text: string): string[] {
  const findings: string[] = [];
  const _lowerText = text.toLowerCase();
  
  // Look for common medical findings patterns
  const patterns = [
    // Cardiac findings
    /(?:ejection fraction|ef)\s+(?:of\s+)?(\d+%?)/gi,
    /(?:blood pressure|bp)\s+(?:of\s+)?(\d+\/\d+)/gi,
    /(?:heart rate|hr)\s+(?:of\s+)?(\d+)/gi,
    
    // Symptoms
    /(?:chest pain|dyspnoea|palpitations|dizziness|syncope)/gi,
    
    // Conditions
    /(?:atrial fibrillation|af|coronary artery disease|cad|heart failure|hypertension)/gi,
    
    // Medications
    /(?:aspirin|metoprolol|ramipril|atorvastatin|warfarin|apixaban)/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!findings.some(f => f.toLowerCase().includes(match.toLowerCase()))) {
          findings.push(match);
        }
      });
    }
  });
  
  // Look for specific value findings
  if (text.includes('normal') && (text.includes('ejection fraction') || text.includes('ef'))) {
    findings.push('Normal EF');
  }
  
  return findings;
}

/**
 * Fallback summary extraction for cases where pattern matching fails
 */
function extractFallbackSummary(content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  
  // Filter out greeting and closing sentences
  const clinicalSentences = sentences.filter(s => {
    const lower = s.toLowerCase();
    return !lower.includes('thank you') &&
           !lower.includes('dear') &&
           !lower.includes('kind regards') &&
           !lower.includes('yours sincerely') &&
           !lower.includes('best wishes');
  });
  
  // Take the first 2-3 meaningful clinical sentences
  const summaryParts = clinicalSentences.slice(0, 3);
  if (summaryParts.length === 0) {
    // If no clinical sentences found, use first sentence
    return sentences.length > 0 ? sentences[0].trim() + '.' : 'No summary available.';
  }
  
  return summaryParts.join('. ').trim() + '.';
}

/**
 * Generate intelligent summary from letter content using medical pattern recognition
 */
function generateIntelligentSummary(content: string): string {
  // Extract clinical findings
  const findings = extractClinicalFindings(content);
  
  if (findings.length > 0) {
    // Create summary from findings
    const summaryParts: string[] = [];
    
    // Group findings by type
    const conditions = findings.filter(f => 
      /(?:atrial fibrillation|af|coronary artery disease|cad|heart failure|hypertension)/i.test(f)
    );
    const values = findings.filter(f => 
      /(?:ejection fraction|blood pressure|heart rate)/i.test(f)
    );
    const symptoms = findings.filter(f => 
      /(?:chest pain|dyspnoea|palpitations|dizziness|syncope)/i.test(f)
    );
    
    if (conditions.length > 0) {
      summaryParts.push(`Patient with ${conditions.slice(0, 2).join(' and ')}`);
    }
    if (symptoms.length > 0) {
      summaryParts.push(`presenting with ${symptoms.slice(0, 2).join(' and ')}`);
    }
    if (values.length > 0) {
      summaryParts.push(`${values.slice(0, 2).join(', ')}`);
    }
    
    if (summaryParts.length > 0) {
      return summaryParts.join('. ') + '.';
    }
  }
  
  // Fallback to sentence extraction
  return extractFallbackSummary(content);
}

/**
 * Parse structured response with SUMMARY: and LETTER: sections
 * Extracted from QuickLetterAgent for reuse in streaming completion
 */
export function parseQuickLetterStructuredResponse(outputText: string): { summary: string; letterContent: string } {
  try {
    console.log('🔧 Parsing QuickLetter structured response for SUMMARY: and LETTER: markers');
    
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
      const summary = cleanSummaryText(summaryRaw);
      console.log('🧹 Cleaned summary:', summary);
      return { summary, letterContent };
    }

    // 2) Legacy pattern with explicit '---' divider (if it survived cleaning)
    console.log('🔍 Checking for legacy --- divider pattern');
    const legacySummaryMatch = outputText.match(/SUMMARY:\s*([\s\S]+?)(?=---)/);
    const legacyLetterMatch = outputText.match(/LETTER:\s*([\s\S]*)/);  
    if (legacySummaryMatch && legacyLetterMatch) {
      console.log('✅ Found legacy pattern with --- divider');
      const summary = cleanSummaryText(legacySummaryMatch[1].trim());
      const letterContent = legacyLetterMatch[1].trim();
      return { summary, letterContent };
    }

    // 3) Fallback: treat entire output as letter content and synthesize a summary
    console.log('⚠️ No SUMMARY:/LETTER: markers found, using fallback parsing');
    console.log('📄 Raw output for fallback:', outputText.substring(0, 200) + '...');
    const intelligentSummary = generateIntelligentSummary(outputText);
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
 * Extract summary from QuickLetter streaming output
 * This function handles the summary generation that was missing in the streaming flow
 */
export function extractQuickLetterSummary(streamedOutput: string): string {
  const { summary } = parseQuickLetterStructuredResponse(streamedOutput);
  return cleanUpSummary(summary);
}