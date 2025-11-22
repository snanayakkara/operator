import React, { useMemo, useState } from 'react';
import Button from '../buttons/Button';
import type { AgentType } from '@/types/medical.types';

interface MissingInfoPanelProps {
  missingInfo: any;
  onSubmit: (answers: Record<string, string>) => void;
  onDismiss?: () => void;
  agentType?: AgentType | null;
}

export const MissingInfoPanel: React.FC<MissingInfoPanelProps> = ({ missingInfo, onSubmit, onDismiss, agentType }) => {
  console.log('🔍 MissingInfoPanel: Received missingInfo:', missingInfo, 'for agent:', agentType);

  const questions = useMemo(() => {
    const q: string[] = [];

    // DEFENSIVE: Filter out agent-inappropriate fields based on agent type
    // Investigation Summary should NEVER have QuickLetter-style missing info (letter purpose, clinical exam)
    // Background/Medication/Imaging agents shouldn't have letter-specific fields either

    const isLetterAgent = agentType === 'quick-letter';
    const isAngioPCIAgent = agentType === 'angiogram-pci';
    const isTAVIAgent = agentType === 'tavi-workup';
    const isInvestigationSummary = agentType === 'investigation-summary';

    // Log agent type for debugging
    if (isInvestigationSummary && (missingInfo?.missing_purpose || missingInfo?.missing_clinical)) {
      console.warn('⚠️ MissingInfoPanel: Investigation Summary incorrectly has QuickLetter-style missing info - filtering out');
    }

    // Handle AngiogramPCI format (only for angiogram-pci agent)
    if (isAngioPCIAgent && Array.isArray(missingInfo?.missing_diagnostic)) {
      console.log('📋 MissingInfoPanel: Adding missing_diagnostic (angiogram-pci):', missingInfo.missing_diagnostic);
      q.push(...missingInfo.missing_diagnostic);
    }
    if (isAngioPCIAgent && Array.isArray(missingInfo?.missing_intervention)) {
      console.log('📋 MissingInfoPanel: Adding missing_intervention (angiogram-pci):', missingInfo.missing_intervention);
      q.push(...missingInfo.missing_intervention);
    }

    // Handle Quick Letter format (ONLY for quick-letter agent)
    if (isLetterAgent && Array.isArray(missingInfo?.missing_purpose)) {
      console.log('📋 MissingInfoPanel: Adding missing_purpose (quick-letter):', missingInfo.missing_purpose);
      q.push(...missingInfo.missing_purpose);
    }
    if (isLetterAgent && Array.isArray(missingInfo?.missing_clinical)) {
      console.log('📋 MissingInfoPanel: Adding missing_clinical (quick-letter):', missingInfo.missing_clinical);
      q.push(...missingInfo.missing_clinical);
    }
    if (isLetterAgent && Array.isArray(missingInfo?.missing_recommendations)) {
      console.log('📋 MissingInfoPanel: Adding missing_recommendations (quick-letter):', missingInfo.missing_recommendations);
      q.push(...missingInfo.missing_recommendations);
    }

    // Structured TAVI workup missing fields (only for TAVI agent)
    if (isTAVIAgent && Array.isArray(missingInfo?.missing_structured)) {
      console.log('📋 MissingInfoPanel: Adding missing_structured (tavi-workup):', missingInfo.missing_structured);
      q.push(...missingInfo.missing_structured);
    }

    // TAVI-specific missing field categories (only for TAVI agent)
    if (isTAVIAgent && Array.isArray(missingInfo?.missing_measurements)) {
      console.log('📋 MissingInfoPanel: Adding missing_measurements (tavi-workup):', missingInfo.missing_measurements);
      q.push(...missingInfo.missing_measurements);
    }

    // Enhanced deduplication with normalization and semantic similarity detection
    const filteredQuestions = q.filter(question => question && question.trim().length > 0);

    // Normalize text for better comparison
    const normalizeText = (text: string): string => {
      return text.toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\b(the|a|an|and|or|of|in|on|at|to|for|with)\b/g, '') // Remove common words
        .trim();
    };

    // Check if two questions are semantically similar
    const areSimilar = (q1: string, q2: string): boolean => {
      const norm1 = normalizeText(q1);
      const norm2 = normalizeText(q2);

      // Exact match after normalization
      if (norm1 === norm2) return true;

      // Check if one is a substring of the other (with reasonable length)
      if (norm1.length > 10 && norm2.length > 10) {
        if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
      }

      // Check for common medical terms that are often duplicated
      const medicalTerms = ['gradient', 'measurement', 'diameter', 'area', 'valve', 'pressure'];
      const hasCommonMedicalTerm = medicalTerms.some(term =>
        norm1.includes(term) && norm2.includes(term)
      );

      if (hasCommonMedicalTerm) {
        // Calculate simple similarity for medical terms
        const words1 = norm1.split(' ').filter(w => w.length > 2);
        const words2 = norm2.split(' ').filter(w => w.length > 2);
        const commonWords = words1.filter(w => words2.includes(w));
        const similarity = commonWords.length / Math.max(words1.length, words2.length);

        if (similarity > 0.7) return true; // 70% word similarity threshold
      }

      return false;
    };

    // Remove duplicates with enhanced logic
    const uniqueQuestions: string[] = [];
    const seenNormalized = new Set<string>();

    for (const question of filteredQuestions) {
      const normalized = normalizeText(question);

      // Skip if already seen exact normalized version
      if (seenNormalized.has(normalized)) {
        console.log(`📋 MissingInfoPanel: Skipping exact duplicate: "${question}"`);
        continue;
      }

      // Check for semantic similarity with existing questions
      const isSimilarToExisting = uniqueQuestions.some(existing => areSimilar(question, existing));

      if (isSimilarToExisting) {
        console.log(`📋 MissingInfoPanel: Skipping similar question: "${question}"`);
        continue;
      }

      uniqueQuestions.push(question);
      seenNormalized.add(normalized);
    }

    console.log(`📊 MissingInfoPanel: Total questions before dedup: ${q.length}, after enhanced dedup: ${uniqueQuestions.length}`);
    console.log(`📊 MissingInfoPanel: Removed ${q.length - uniqueQuestions.length} duplicate/similar questions`);
    return uniqueQuestions;
  }, [missingInfo, agentType]);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleChange = (q: string, value: string) => {
    setAnswers(prev => ({ ...prev, [q]: value }));
  };

  const completeness = missingInfo?.completeness_score || '';

  if (questions.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50">
      <div className="p-3 border-b border-amber-200 bg-amber-100 flex items-center justify-between">
        <div>
          <h4 className="text-amber-900 font-semibold text-sm">Missing Information</h4>
          {completeness && (
            <p className="text-amber-700 text-xs">Completeness: {completeness}</p>
          )}
        </div>
        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="text-amber-700 text-xs underline"
          >
            Dismiss
          </Button>
        )}
      </div>
      <div className="p-3 space-y-3">
        {questions.map((q) => (
          <div key={q} className="space-y-1">
            <label className="text-xs font-medium text-amber-900 block">{q}</label>
            <input
              type="text"
              className="w-full text-sm p-2 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              placeholder="Add detail..."
              value={answers[q] || ''}
              onChange={(e) => handleChange(q, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-amber-200 bg-amber-50 flex items-center justify-end space-x-2">
        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="outline"
            size="sm"
            className="text-xs border-amber-200 bg-white hover:bg-amber-50"
          >
            Skip for now
          </Button>
        )}
        <Button
          onClick={() => onSubmit(answers)}
          variant="primary"
          size="sm"
          className="text-xs bg-amber-600 hover:bg-amber-700"
        >
          Reprocess with answers
        </Button>
      </div>
    </div>
  );
};
