/**
 * AI Review Cards Component
 *
 * Wrapper component for displaying comprehensive AI medical review (PRIMARY + SECONDARY prevention):
 * - Delegates to BatchPatientReviewResults for full display
 * - Handles data transformation from reviewData to component props
 * - Supports patient classification display
 * - Australian medical guidelines integration
 * - Memoized for performance
 */

import React, { memo } from 'react';
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
  useBrightCards?: boolean; // Enable bright card design
}

const AIReviewCards: React.FC<AIReviewCardsProps> = memo(({
  reviewData,
  className = '',
  useBrightCards = false
}) => {
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