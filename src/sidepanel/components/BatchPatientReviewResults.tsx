import React, { useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Heart,
  Calculator,
  MapPin
} from 'lucide-react';
import type { BatchPatientReviewFinding } from '@/types/medical.types';
import { IndividualFindingCard } from './IndividualFindingCard';

interface BatchPatientReviewResultsProps {
  findings: BatchPatientReviewFinding[];
  guidelineReferences: string[];
  heartFoundationResources: string[];
  cvdRiskCalculatorRecommended: boolean;
  aboriginalTorresStraitIslander: boolean;
  qtProlongationRisk: boolean;
  medicationSafetyIssues: number;
  isProcessing?: boolean;
}

export const BatchPatientReviewResults: React.FC<BatchPatientReviewResultsProps> = ({
  findings,
  guidelineReferences,
  heartFoundationResources,
  cvdRiskCalculatorRecommended,
  aboriginalTorresStraitIslander,
  qtProlongationRisk,
  medicationSafetyIssues,
  isProcessing = false
}) => {
  // Track completion status for individual findings
  const [completedFindings, setCompletedFindings] = useState<Set<number>>(new Set());

  const handleToggleComplete = (index: number) => {
    const newCompleted = new Set(completedFindings);
    if (completedFindings.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedFindings(newCompleted);
  };

  const completedCount = completedFindings.size;
  const totalFindings = findings.length;

  if (isProcessing) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-purple-600 animate-pulse" />
          <div>
            <h3 className="text-gray-900 font-semibold text-lg">AI Medical Review</h3>
            <p className="text-gray-600 text-sm">Analyzing patient data against Australian guidelines...</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center space-x-3 mb-3">
          <Shield className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-gray-900 font-semibold text-lg">Batch Patient Review</h3>
            <p className="text-gray-600 text-sm">Multi-patient clinical oversight based on NHFA/CSANZ/RACGP guidelines</p>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalFindings}</div>
            <div className="text-xs text-gray-600">Total Findings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {findings.filter(f => f.urgency === 'Immediate').length}
            </div>
            <div className="text-xs text-gray-600">Immediate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{medicationSafetyIssues}</div>
            <div className="text-xs text-gray-600">Medication Safety</div>
          </div>
        </div>

        {/* Progress Bar */}
        {totalFindings > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">
                {completedCount}/{totalFindings} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalFindings > 0 ? (completedCount / totalFindings) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Safety Notifications */}
        <div className="mt-4 space-y-2">
          {/* Aboriginal/Torres Strait Islander Notice */}
          {aboriginalTorresStraitIslander && (
            <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 text-sm font-medium">
                  Aboriginal/Torres Strait Islander considerations included
                </span>
              </div>
            </div>
          )}
          
          {/* QT Prolongation Warning */}
          {qtProlongationRisk && (
            <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-800 text-sm font-medium">
                  QT prolongation risk identified - review medications and ECG monitoring
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Individual Findings */}
      <div className="p-6">
        {findings.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-gray-900 font-medium text-lg mb-2">No Critical Issues Identified</h4>
            <p className="text-gray-600 text-sm">
              The AI review found no major clinical oversights based on Australian guidelines.
            </p>
          </div>
        ) : (
          <>
            {/* Bulk Actions */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 text-base">Clinical Findings</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCompletedFindings(new Set())}
                  className="text-xs text-gray-600 hover:text-gray-800"
                  disabled={completedCount === 0}
                >
                  Clear all
                </button>
                <button
                  onClick={() => setCompletedFindings(new Set(Array.from({ length: totalFindings }, (_, i) => i)))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                  disabled={completedCount === totalFindings}
                >
                  Complete all
                </button>
              </div>
            </div>

            {/* Individual Finding Cards */}
            <div className="space-y-4">
              {findings.map((finding, index) => (
                <IndividualFindingCard
                  key={index}
                  finding={finding}
                  index={index}
                  isCompleted={completedFindings.has(index)}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>

            {/* Completion Summary */}
            {completedCount === totalFindings && totalFindings > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <h5 className="font-medium text-green-800">All Findings Addressed</h5>
                    <p className="text-green-700 text-sm">
                      You have completed all clinical findings from the AI review.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resources Section */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm mb-4">Australian Clinical Resources</h4>
        
        {/* Guideline References */}
        {guidelineReferences.length > 0 && (
          <div className="mb-4">
            <h5 className="font-medium text-gray-700 text-xs mb-2">Guidelines Referenced</h5>
            <div className="flex flex-wrap gap-2">
              {guidelineReferences.map((guideline, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {guideline}
                </span>
              ))}
            </div>
          </div>
        )}


        {/* Heart Foundation Resources */}
        {heartFoundationResources.length > 0 && (
          <div className="mb-4">
            <h5 className="font-medium text-gray-700 text-xs mb-2">Heart Foundation Resources</h5>
            <div className="space-y-2">
              {heartFoundationResources.map((resource, index) => (
                <a
                  key={index}
                  href={resource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 text-xs"
                >
                  <Heart className="w-3 h-3" />
                  <span>Resource {index + 1}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CVD Risk Calculator */}
        {cvdRiskCalculatorRecommended && (
          <div className="mb-4">
            <h5 className="font-medium text-gray-700 text-xs mb-2">Recommended Calculator</h5>
            <a
              href="http://www.cvdcheck.org.au/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-xs"
            >
              <Calculator className="w-3 h-3" />
              <span>Australian CVD Risk Calculator</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-800 text-xs font-medium mb-1">Important Disclaimer</p>
              <p className="text-yellow-700 text-xs">
                AI-generated clinical suggestions based on Australian guidelines (NHFA/CSANZ/RACGP) for cardiology practice. 
                Not a substitute for clinical judgment. Verify recommendations against current guidelines and local policies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};