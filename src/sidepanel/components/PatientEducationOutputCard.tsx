import React, { useState, useRef } from 'react';
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
  Globe,
  FileText,
  Download
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

  const jsonBoxRef = useRef<HTMLDivElement>(null);

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const jsonMetadata = report.educationData.jsonMetadata;
    if (!jsonMetadata) {
      alert('No structured data available to export');
      return;
    }

    const priorityPlan = jsonMetadata.priority_plan || [];

    // Categorize actions by module type for color coding
    const categorizeAction = (action: any): string => {
      const title = action.title?.toLowerCase() || '';
      const id = action.id?.toLowerCase() || '';

      if (title.includes('exercise') || title.includes('physical') || title.includes('activity') ||
          id.includes('physical_activity')) {
        return 'exercise'; // Blue
      } else if (title.includes('diet') || title.includes('nutrition') || title.includes('food') ||
                 title.includes('fibre') || title.includes('salt') || id.includes('diet_nutrition')) {
        return 'diet'; // Green
      } else if (title.includes('alcohol') || id.includes('alcohol')) {
        return 'alcohol'; // Purple
      } else if (title.includes('weight') || title.includes('bmi') || id.includes('weight')) {
        return 'weight'; // Orange
      } else if (title.includes('smoking') || title.includes('tobacco') || id.includes('smoking')) {
        return 'smoking'; // Red
      } else if (title.includes('stress') || title.includes('mental') || id.includes('stress')) {
        return 'mental'; // Teal
      }
      return 'other'; // Gray
    };

    // Generate HTML cards
    const cardsHTML = priorityPlan.map((action: any, index: number) => {
      const category = categorizeAction(action);
      const impactLevel = action.expected_impact || 'medium';

      // Color schemes by category
      const colorSchemes: Record<string, { bg: string; border: string; text: string }> = {
        exercise: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },      // Blue
        diet: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },          // Emerald
        alcohol: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },       // Purple
        weight: { bg: '#FFF7ED', border: '#F97316', text: '#9A3412' },        // Orange
        smoking: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },       // Red
        mental: { bg: '#F0FDFA', border: '#14B8A6', text: '#115E59' },        // Teal
        other: { bg: '#F9FAFB', border: '#6B7280', text: '#374151' }          // Gray
      };

      const colors = colorSchemes[category];

      return `
        <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border};
                    padding: 16px; margin-bottom: 16px; border-radius: 8px; page-break-inside: avoid;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <div style="background: white; width: 28px; height: 28px; border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        font-weight: bold; font-size: 14px; color: ${colors.text}; flex-shrink: 0;">
              ${index + 1}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 8px 0; color: ${colors.text}; font-size: 16px; font-weight: 600;">
                ${action.title}
              </h3>
              ${action.magnitude_note ? `
                <p style="margin: 0 0 8px 0; color: ${colors.text}; opacity: 0.9; font-size: 14px;">
                  ${action.magnitude_note}
                </p>
              ` : ''}
              ${action.reason ? `
                <p style="margin: 0 0 8px 0; color: ${colors.text}; opacity: 0.8; font-size: 13px; font-style: italic;">
                  <strong>Why:</strong> ${action.reason}
                </p>
              ` : ''}
              ${action.next_action ? `
                <div style="background: rgba(255,255,255,0.6); padding: 8px; border-radius: 6px; margin-top: 8px;">
                  <p style="margin: 0; font-size: 13px; color: ${colors.text};">
                    <strong>Start here:</strong> ${action.next_action}
                  </p>
                </div>
              ` : ''}
              ${action.habit_cue ? `
                <div style="background: rgba(255,255,255,0.6); padding: 8px; border-radius: 6px; margin-top: 6px;">
                  <p style="margin: 0; font-size: 13px; color: ${colors.text};">
                    <strong>Habit cue:</strong> ${action.habit_cue}
                  </p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Education Action Plan</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
              color: #111827;
            }
            .subtitle {
              color: #6B7280;
              font-size: 14px;
              margin-bottom: 24px;
            }
            .legend {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              margin-bottom: 24px;
              padding: 16px;
              background: #F9FAFB;
              border-radius: 8px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
            }
            .legend-color {
              width: 16px;
              height: 16px;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <h1>Patient Education Action Plan</h1>
          <p class="subtitle">Personalized lifestyle and wellness recommendations</p>

          <div class="legend">
            <div class="legend-item">
              <div class="legend-color" style="background: #3B82F6;"></div>
              <span>Exercise</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #10B981;"></div>
              <span>Diet & Nutrition</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #A855F7;"></div>
              <span>Alcohol</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #F97316;"></div>
              <span>Weight Management</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #EF4444;"></div>
              <span>Smoking Cessation</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #14B8A6;"></div>
              <span>Mental Health</span>
            </div>
          </div>

          ${cardsHTML}

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB;
                      font-size: 12px; color: #6B7280; text-align: center;">
            <p style="margin: 0;">Generated by Operator - Patient Education & Lifestyle Medicine</p>
            <p style="margin: 4px 0 0 0;">This information is for general education only. Always follow your healthcare team's specific advice.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const renderLetterBox = () => {
    const letterContent = report.educationData.letterContent || report.content;
    const isCopied = copiedContent === 'letter';

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-semibold text-gray-900">Patient Letter</h4>
          </div>
          <button
            onClick={() => handleCopy(letterContent, 'letter')}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
          >
            {isCopied ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="prose prose-sm max-w-none">
            <div
              className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed font-sans"
              dangerouslySetInnerHTML={{
                __html: letterContent
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
      </div>
    );
  };

  const renderJsonBox = () => {
    const jsonMetadata = report.educationData.jsonMetadata;

    if (!jsonMetadata) {
      return null;
    }

    const isCopied = copiedContent === 'json';
    const priorityPlan = jsonMetadata.priority_plan || [];
    const sections = jsonMetadata.sections || [];

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-900">Quick Action Plan</h4>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopy(JSON.stringify(jsonMetadata, null, 2), 'json')}
              className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
              title="Copy structured data as JSON"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Priority Action Items */}
        {priorityPlan.length > 0 && (
          <div className="space-y-3">
            {priorityPlan.map((item: any, index: number) => {
              const impactColor = item.expected_impact === 'very_high' || item.expected_impact === 'high'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : item.expected_impact === 'medium'
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-gray-700 bg-gray-50 border-gray-200';

              return (
                <div key={index} className={`border rounded-lg p-3 ${impactColor}`}>
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-sm mb-1">{item.title}</h5>
                      {item.magnitude_note && (
                        <p className="text-xs mb-2 opacity-90">{item.magnitude_note}</p>
                      )}
                      {item.reason && (
                        <p className="text-xs mb-2 italic opacity-80">
                          <strong>Why:</strong> {item.reason}
                        </p>
                      )}
                      {item.next_action && (
                        <div className="bg-white bg-opacity-50 rounded px-2 py-1 mt-2">
                          <p className="text-xs font-medium">
                            <strong>Start here:</strong> {item.next_action}
                          </p>
                        </div>
                      )}
                      {item.habit_cue && (
                        <div className="bg-white bg-opacity-50 rounded px-2 py-1 mt-1">
                          <p className="text-xs">
                            <strong>Habit cue:</strong> {item.habit_cue}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Raw JSON for developers */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 font-medium">
            View structured data (JSON)
          </summary>
          <div ref={jsonBoxRef} className="mt-2 bg-gray-900 rounded-lg p-3 border border-gray-700 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(jsonMetadata, null, 2)}
            </pre>
          </div>
        </details>
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

          {/* Two-Box Output: Letter and JSON */}
          {renderLetterBox()}
          {renderJsonBox()}

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
        </div>
      </div>
    </div>
  );
};