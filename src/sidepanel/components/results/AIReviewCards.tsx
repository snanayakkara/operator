/**
 * AI Review Cards Component
 * 
 * Focused component for displaying AI medical review findings:
 * - Clinical advisory cards with urgency levels
 * - Acknowledgment tracking
 * - Batch review support
 * - Australian medical guidelines integration
 * - Memoized for performance
 */

import React, { memo, useState, useEffect } from 'react';
import { CheckIcon } from '../icons/OptimizedIcons';

interface Finding {
  finding: string;
  urgency: 'Immediate' | 'Soon' | 'Routine';
  australianGuideline: string;
  clinicalReasoning: string;
  recommendedAction: string;
  heartFoundationLink?: string;
  patientName?: string;
  patientFileNumber?: string;
}

interface ReviewData {
  findings: Finding[];
  isBatchReview?: boolean;
  batchSummary?: {
    totalPatients: number;
  };
  timestamp?: number;
}

interface AIReviewCardsProps {
  reviewData: ReviewData;
  className?: string;
}

const AIReviewCards: React.FC<AIReviewCardsProps> = memo(({ 
  reviewData, 
  className = '' 
}) => {
  const [acknowledgedFindings, setAcknowledgedFindings] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  
  // Debug logging for AI Review Cards
  console.log('🎴 AI REVIEW CARDS: Component render with data:', {
    hasReviewData: !!reviewData,
    reviewDataType: typeof reviewData,
    reviewDataKeys: reviewData ? Object.keys(reviewData) : null,
    findingsArray: reviewData?.findings,
    findingsType: typeof reviewData?.findings,
    findingsCount: reviewData?.findings?.length || 0,
    isBatchReview: reviewData?.isBatchReview,
    timestamp: reviewData?.timestamp,
    findingsPreview: Array.isArray(reviewData?.findings) ? reviewData.findings.slice(0, 2) : 'Not an array'
  });
  
  // Ensure we have a valid findings array
  const safeFindings = Array.isArray(reviewData?.findings) ? reviewData.findings : [];
  
  // Reset acknowledged findings when reviewData changes (new patient/review)
  useEffect(() => {
    if (safeFindings.length > 0) {
      setAcknowledgedFindings(new Set());
      setVisibleCards(new Set());
      setIsAnimating(true);
      console.log('🔄 Reset AI Review acknowledged findings for new review data');
      
      // Animate cards in sequence
      safeFindings.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(prev => new Set([...prev, index]));
        }, index * 200 + 300); // 300ms initial delay, then 200ms between cards
      });
      
      // Stop animation state after all cards are visible
      setTimeout(() => {
        setIsAnimating(false);
      }, safeFindings.length * 200 + 800);
    }
  }, [safeFindings.length, reviewData?.timestamp]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Immediate': return 'red';
      case 'Soon': return 'amber';
      default: return 'blue';
    }
  };

  const handleAcknowledgement = (index: number) => {
    const newAcknowledged = new Set(acknowledgedFindings);
    if (acknowledgedFindings.has(index)) {
      newAcknowledged.delete(index);
    } else {
      newAcknowledged.add(index);
    }
    setAcknowledgedFindings(newAcknowledged);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with fade-in animation */}
      <div className={`flex items-center justify-between mb-4 transition-all duration-500 ${
        visibleCards.size > 0 || safeFindings.length === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}>
        <h3 className="text-gray-900 font-medium text-sm">Clinical Advisory Cards</h3>
        <div className="text-xs text-gray-500">
          {safeFindings.length > 0 
            ? `${acknowledgedFindings.size} of ${safeFindings.length} reviewed`
            : 'No findings'
          }
        </div>
      </div>
      
      {/* Handle empty findings case */}
      {safeFindings.length === 0 ? (
        <div className="text-center py-8 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-green-800 font-medium mb-2">No Clinical Oversights Identified</h4>
          <p className="text-green-700 text-sm">
            {(reviewData as any)?.noFindingsReason || 'The AI review found no major clinical oversights based on Australian guidelines.'}
          </p>
        </div>
      ) : (
        safeFindings.map((finding: Finding, index: number) => {
        const isAcknowledged = acknowledgedFindings.has(index);
        const urgencyColor = getUrgencyColor(finding.urgency);
        const isVisible = visibleCards.has(index);
        
        return (
          <div
            key={index}
            className={`border rounded-lg motion-safe:transition-all motion-safe:duration-500 motion-safe:transform motion-reduce:transition-none ${
              isVisible 
                ? 'opacity-100 translate-y-0 scale-100' 
                : 'opacity-0 translate-y-4 scale-95'
            } ${
              isAcknowledged 
                ? 'opacity-60 border-gray-200 bg-gray-50' 
                : `border-${urgencyColor}-200 bg-white`
            }`}
            style={{
              transitionDelay: isVisible ? '0ms' : `${index * 100}ms`
            }}
            role="article"
            aria-labelledby={`finding-${index}-title`}
            aria-describedby={`finding-${index}-description`}
          >
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => handleAcknowledgement(index)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 motion-safe:transition-colors motion-reduce:transition-none flex items-center justify-center ${
                    isAcknowledged
                      ? 'bg-green-500 border-green-500'
                      : `border-${urgencyColor}-300 hover:border-${urgencyColor}-400`
                  }`}
                  aria-label={isAcknowledged ? 'Mark as unreviewed' : 'Mark as reviewed'}
                  aria-pressed={isAcknowledged}
                >
                  {isAcknowledged && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 
                      id={`finding-${index}-title`}
                      className={`font-medium text-sm ${
                        isAcknowledged ? 'text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {finding.finding}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      urgencyColor === 'red' ? 'bg-red-100 text-red-800' :
                      urgencyColor === 'amber' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {finding.urgency}
                    </span>
                    {/* Patient context for batch reviews */}
                    {finding.patientName && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {finding.patientName}
                      </span>
                    )}
                  </div>
                  
                  {/* Patient file number for batch reviews */}
                  {finding.patientFileNumber && (
                    <div className="text-xs text-gray-500 mb-2">
                      File: {finding.patientFileNumber}
                    </div>
                  )}
                  
                  {!isAcknowledged && (
                    <div id={`finding-${index}-description`} className="space-y-2">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Guideline:</span> {finding.australianGuideline}
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Reasoning:</span> {finding.clinicalReasoning}
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Recommendation:</span> {finding.recommendedAction}
                      </div>
                      {finding.heartFoundationLink && (
                        <div className="text-sm">
                          <a 
                            href={finding.heartFoundationLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 underline"
                          >
                            Heart Foundation Resource →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        })
      )}
    </div>
  );
});

AIReviewCards.displayName = 'AIReviewCards';

export { AIReviewCards };