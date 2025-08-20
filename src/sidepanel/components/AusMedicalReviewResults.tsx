import React from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  FileText,
  Heart,
  Calculator,
  MapPin
} from 'lucide-react';
import type { AusMedicalReviewFinding } from '@/types/medical.types';

interface AusMedicalReviewResultsProps {
  findings: AusMedicalReviewFinding[];
  guidelineReferences: string[];
  heartFoundationResources: string[];
  cvdRiskCalculatorRecommended: boolean;
  aboriginalTorresStraitIslander: boolean;
  qtProlongationRisk: boolean;
  medicationSafetyIssues: number;
  isProcessing?: boolean;
}

export const AusMedicalReviewResults: React.FC<AusMedicalReviewResultsProps> = ({
  findings,
  guidelineReferences,
  heartFoundationResources,
  cvdRiskCalculatorRecommended,
  aboriginalTorresStraitIslander,
  qtProlongationRisk,
  medicationSafetyIssues,
  isProcessing = false
}) => {
  
  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'Immediate':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'Soon':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'Routine':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Immediate':
        return 'border-red-200 bg-red-50';
      case 'Soon':
        return 'border-orange-200 bg-orange-50';
      case 'Routine':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case 'Immediate':
        return 'bg-red-100 text-red-800';
      case 'Soon':
        return 'bg-orange-100 text-orange-800';
      case 'Routine':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
            <h3 className="text-gray-900 font-semibold text-lg">Australian Medical Review</h3>
            <p className="text-gray-600 text-sm">Clinical oversight based on NHFA/CSANZ/RACGP guidelines</p>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{findings.length}</div>
            <div className="text-xs text-gray-600">Total Findings</div>
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

      {/* Findings */}
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
          <div className="space-y-4">
            {findings.map((finding, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-4 ${getUrgencyColor(finding.urgency)}`}
              >
                {/* Finding Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getUrgencyIcon(finding.urgency)}
                    <span className="font-semibold text-gray-900 text-sm">
                      Finding {index + 1}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyBadgeColor(finding.urgency)}`}>
                    {finding.urgency}
                  </span>
                </div>

                {/* Finding Content */}
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gray-900 text-sm mb-1">Clinical Finding</h5>
                    <p className="text-gray-700 text-sm">{finding.finding}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 text-sm mb-1">Australian Guideline</h5>
                    <p className="text-blue-700 text-sm font-medium">{finding.australianGuideline}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 text-sm mb-1">Clinical Reasoning</h5>
                    <p className="text-gray-700 text-sm">{finding.clinicalReasoning}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 text-sm mb-1">Recommended Action</h5>
                    <p className="text-gray-700 text-sm">{finding.recommendedAction}</p>
                  </div>


                  {finding.heartFoundationLink && (
                    <div>
                      <a
                        href={finding.heartFoundationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm"
                      >
                        <Heart className="w-4 h-4" />
                        <span>Heart Foundation Resource</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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