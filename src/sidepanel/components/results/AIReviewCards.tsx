/**
 * AI Review Cards Component
 *
 * Wrapper component for displaying comprehensive AI medical review (PRIMARY + SECONDARY prevention):
 * - Delegates to BatchPatientReviewResults for full display
 * - Handles data transformation from reviewData to component props
 * - Supports patient classification display
 * - Australian medical guidelines integration
 * - Reads bright card preference from Chrome storage
 * - Memoized for performance
 */

import React, { memo, useState, useEffect } from 'react';
import { BatchPatientReviewResults } from '../BatchPatientReviewResults';
import type { PatientClassification } from '@/types/medical.types';

interface Finding {
  classificationTag?: 'PRIMARY' | 'SECONDARY-CAD' | 'SECONDARY-HFrEF' | 'SECONDARY-VALVULAR';
  finding: string;
  evidence?: string;
  urgency: 'Immediate' | 'Soon' | 'Routine';
  priority?: 'very_high' | 'high' | 'moderate' | 'routine';
  threshold?: string;
  mechanism?: string;
  australianGuideline?: string;
  clinicalReasoning?: string;
  recommendedAction: string;
  heartFoundationLink?: string;
  patientName?: string;
  patientFileNumber?: string;
}

interface ReviewData {
  classification?: PatientClassification;
  findings: Finding[];
  guidelineReferences?: string[];
  heartFoundationResources?: string[];
  cvdRiskCalculatorRecommended?: boolean;
  aboriginalTorresStraitIslander?: boolean;
  qtProlongationRisk?: boolean;
  medicationSafetyIssues?: number;
  missingTests?: string[];
  therapyTargets?: Record<string, string>;
  clinicalNotes?: string;
  isBatchReview?: boolean;
  batchSummary?: {
    totalPatients: number;
  };
  timestamp?: number;
}

interface AIReviewCardsProps {
  reviewData: ReviewData;
  className?: string;
  useBrightCards?: boolean; // Enable bright card design (overrides storage)
  storageKey?: string; // Chrome storage key to read preference from
}

const AIReviewCards: React.FC<AIReviewCardsProps> = memo(({
  reviewData,
  className = '',
  useBrightCards: useBrightCardsProp,
  storageKey = 'ui_preferences_card_theme'
}) => {
  const [useBrightCardsFromStorage, setUseBrightCardsFromStorage] = useState(false);
  const [_storageLoaded, setStorageLoaded] = useState(false);

  // Load preference from Chrome storage on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const result = await chrome.storage.local.get(storageKey);
        const theme = result[storageKey] as string;
        // Convert theme to boolean: 'bright' = true, anything else = false
        setUseBrightCardsFromStorage(theme === 'bright');
      } catch (error) {
        console.error('Failed to load card theme preference:', error);
      } finally {
        setStorageLoaded(true);
      }
    };

    loadPreference();

    // Listen for storage changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[storageKey]) {
        const newTheme = changes[storageKey].newValue as string;
        setUseBrightCardsFromStorage(newTheme === 'bright');
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [storageKey]);

  // Use prop if provided, otherwise use storage value
  const useBrightCards = useBrightCardsProp !== undefined ? useBrightCardsProp : useBrightCardsFromStorage;
  // Debug logging
  console.log('🎴 AI REVIEW CARDS: Rendering with data:', {
    hasReviewData: !!reviewData,
    hasClassification: !!reviewData?.classification,
    findingsCount: reviewData?.findings?.length || 0,
    hasMissingTests: !!reviewData?.missingTests,
    hasTherapyTargets: !!reviewData?.therapyTargets,
    classification: reviewData?.classification?.category
  });

  // Ensure we have valid data with defaults
  const safeFindings = Array.isArray(reviewData?.findings) ? reviewData.findings : [];

  const defaultClassification: PatientClassification = {
    category: 'primary',
    rationale: 'Classification not provided',
    triggers: [],
    reviewFocus: []
  };

  return (
    <div className={className}>
      <BatchPatientReviewResults
        classification={reviewData?.classification || defaultClassification}
        findings={safeFindings as any} // Type assertion since we've validated the structure
        guidelineReferences={reviewData?.guidelineReferences || []}
        heartFoundationResources={reviewData?.heartFoundationResources || []}
        cvdRiskCalculatorRecommended={reviewData?.cvdRiskCalculatorRecommended || false}
        aboriginalTorresStraitIslander={reviewData?.aboriginalTorresStraitIslander || false}
        qtProlongationRisk={reviewData?.qtProlongationRisk || false}
        medicationSafetyIssues={reviewData?.medicationSafetyIssues || 0}
        missingTests={reviewData?.missingTests}
        therapyTargets={reviewData?.therapyTargets}
        clinicalNotes={reviewData?.clinicalNotes}
        isProcessing={false}
        useBrightCards={useBrightCards}
      />
    </div>
  );
});

AIReviewCards.displayName = 'AIReviewCards';

export { AIReviewCards };