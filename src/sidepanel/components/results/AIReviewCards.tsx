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
  
  // Reset acknowledged findings when reviewData changes (new patient/review)
  useEffect(() => {
    if (reviewData?.findings) {
      setAcknowledgedFindings(new Set());
      console.log('🔄 Reset AI Review acknowledged findings for new review data');
    }
  }, [reviewData?.findings, reviewData?.timestamp]);

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 font-medium text-sm">Clinical Advisory Cards</h3>
        <div className="text-xs text-gray-500">
          {acknowledgedFindings.size} of {reviewData.findings.length} reviewed
        </div>
      </div>
      
      {reviewData.findings.map((finding: Finding, index: number) => {
        const isAcknowledged = acknowledgedFindings.has(index);
        const urgencyColor = getUrgencyColor(finding.urgency);
                           
        return (
          <div
            key={index}
            className={`border rounded-lg transition-all duration-300 ${
              isAcknowledged 
                ? 'opacity-60 border-gray-200 bg-gray-50' 
                : `border-${urgencyColor}-200 bg-white`
            }`}
          >
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => handleAcknowledgement(index)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                    isAcknowledged
                      ? 'bg-green-500 border-green-500'
                      : `border-${urgencyColor}-300 hover:border-${urgencyColor}-400`
                  }`}
                >
                  {isAcknowledged && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className={`font-medium text-sm ${
                      isAcknowledged ? 'text-gray-500' : 'text-gray-900'
                    }`}>
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
                    <div className="space-y-2">
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
      })}
    </div>
  );
});

AIReviewCards.displayName = 'AIReviewCards';

export { AIReviewCards };