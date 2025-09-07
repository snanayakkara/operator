import React, { useState } from 'react';
import { 
  GraduationCap,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Heart,
  BookOpen,
  Globe
} from 'lucide-react';
import type { PatientEducationReport } from '@/types/medical.types';

interface PatientEducationOutputCardProps {
  report: PatientEducationReport;
  onCopy: (content: string) => Promise<void>;
  onInsert: (content: string) => Promise<void>;
  onRetry?: () => void;
  isVisible: boolean;
}

export const PatientEducationOutputCard: React.FC<PatientEducationOutputCardProps> = ({
  report,
  onCopy,
  onInsert,
  onRetry,
  isVisible
}) => {
  const [copiedContent, setCopiedContent] = useState<string | null>(null);
  const [insertedContent, setInsertedContent] = useState<string | null>(null);

  if (!isVisible) {
    return null;
  }

  const handleCopy = async (content: string, type: string) => {
    try {
      await onCopy(content);
      setCopiedContent(type);
      setTimeout(() => setCopiedContent(null), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleInsert = async (content: string, type: string) => {
    try {
      await onInsert(content);
      setInsertedContent(type);
      setTimeout(() => setInsertedContent(null), 2000);
    } catch (error) {
      console.error('Failed to insert content:', error);
    }
  };

  const formatModules = (modules: string[]): string => {
    return modules.map(moduleId => {
      // Convert snake_case to Title Case
      return moduleId
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }).join(', ');
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const renderWarnings = () => {
    if (!report.warnings || report.warnings.length === 0) return null;

    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Content Notice</p>
            {report.warnings.map((warning, index) => (
              <p key={index} className="text-xs text-amber-700 mt-1">{warning}</p>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderErrors = () => {
    if (!report.errors || report.errors.length === 0) return null;

    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Generation Issues</p>
            {report.errors.map((error, index) => (
              <p key={index} className="text-xs text-red-700 mt-1">{error}</p>
            ))}
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs rounded-md font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Regenerate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMissingInfo = () => {
    const missingInfo = report.metadata?.missingInformation;
    if (!missingInfo || missingInfo.completeness_score === "95%") return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Personalization Score: {missingInfo.completeness_score}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              More specific patient information could help provide even more personalized advice.
            </p>
            {missingInfo.recommendations?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-blue-800">Suggestions:</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  {missingInfo.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span>•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEducationMetadata = () => {
    const { educationData } = report;
    
    return (
      <div className="mb-4 bg-gray-50 rounded-lg p-3">
        <div className="grid grid-cols-1 gap-3">
          {/* Priority */}
          <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(educationData.priority)}`}>
            <Heart className="w-3 h-3 mr-1" />
            {educationData.priority.charAt(0).toUpperCase() + educationData.priority.slice(1)} Priority
          </div>

          {/* Modules */}
          <div>
            <span className="text-xs font-medium text-gray-700">Areas Covered: </span>
            <span className="text-xs text-gray-600">{formatModules(educationData.modules)}</span>
          </div>

          {/* Australian Guidelines */}
          {educationData.australianGuidelines?.length > 0 && (
            <div>
              <div className="flex items-center space-x-1 mb-1">
                <Globe className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-gray-700">Australian Guidelines Referenced:</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                {educationData.australianGuidelines.slice(0, 3).map((guideline, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span>•</span>
                    <span>{guideline}</span>
                  </li>
                ))}
                {educationData.australianGuidelines.length > 3 && (
                  <li className="text-xs text-gray-500 italic">
                    +{educationData.australianGuidelines.length - 3} more guidelines
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Patient Resources */}
          {educationData.patientResources?.length > 0 && (
            <div>
              <div className="flex items-center space-x-1 mb-1">
                <BookOpen className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">Support Resources Mentioned:</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                {educationData.patientResources.slice(0, 3).map((resource, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span>•</span>
                    <span>{resource}</span>
                  </li>
                ))}
                {educationData.patientResources.length > 3 && (
                  <li className="text-xs text-gray-500 italic">
                    +{educationData.patientResources.length - 3} more resources
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    const isCopied = copiedContent === 'full';
    const isInserted = insertedContent === 'full';

    return (
      <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
        <button
          onClick={() => handleCopy(report.content, 'full')}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          {isCopied ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>

        <button
          onClick={() => handleInsert(report.content, 'full')}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isInserted ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Inserted!</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              <span>Insert</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-lg">
      <div className="bg-white w-full overflow-hidden rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4" />
              <h3 className="font-semibold text-sm">Patient Education & Lifestyle Advice</h3>
            </div>
            <div className="text-emerald-100 text-xs">
              Generated in {Math.round(report.metadata.processingTime / 1000)}s
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Warnings and Errors */}
          {renderErrors()}
          {renderWarnings()}
          {renderMissingInfo()}

          {/* Education Metadata */}
          {renderEducationMetadata()}

          {/* Main Content */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: report.content
                    .replace(/\n\n/g, '</p><p class="mt-4">')
                    .replace(/^/, '<p>')
                    .replace(/$/, '</p>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/## (.*?)(?=\n|$)/g, '<h3 class="text-base font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-1">$1</h3>')
                    .replace(/• (.*?)(?=\n|$)/g, '<li class="ml-4">$1</li>')
                    .replace(/(<li.*?<\/li>)/g, '<ul class="list-disc list-inside space-y-1 mb-3">$1</ul>')
                }}
              />
            </div>
          </div>

          {/* Important Disclaimer */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Important Disclaimer</p>
                <p className="mt-1">
                  This information is for educational purposes only and should not replace professional medical advice. 
                  Always consult with your healthcare team before making significant lifestyle changes.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
};