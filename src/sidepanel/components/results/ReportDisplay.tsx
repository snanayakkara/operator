/**
 * Report Display Component
 * 
 * Focused component for displaying medical reports with optimizations:
 * - Virtualization for long reports
 * - Progressive disclosure for better UX
 * - Memoization to prevent unnecessary re-renders
 */

import React, { memo, useState, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, FileText, BookOpen, Copy, Download, CheckCircle } from 'lucide-react';
import type { AgentType } from '@/types/medical.types';

interface ReportDisplayProps {
  results: string;
  agentType: AgentType | null;
  className?: string;
}

const ReportDisplay: React.FC<ReportDisplayProps> = memo(({
  results,
  agentType,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);
  const [copiedContent, setCopiedContent] = useState<string | null>(null);
  const jsonBoxRef = useRef<HTMLDivElement>(null);

  // Parse two-part response for patient-education agent
  const parsedPatientEducation = useMemo(() => {
    if (agentType !== 'patient-education') return null;

    try {
      // Look for the --- delimiter (may have surrounding whitespace)
      const delimiterMatch = results.match(/\n---\n/);

      if (delimiterMatch && delimiterMatch.index !== undefined) {
        const jsonPart = results.substring(0, delimiterMatch.index).trim();
        const letterPart = results.substring(delimiterMatch.index + delimiterMatch[0].length).trim();

        try {
          const jsonMetadata = JSON.parse(jsonPart);
          return {
            jsonMetadata,
            letterContent: letterPart
          };
        } catch (parseError) {
          console.warn('Failed to parse JSON metadata:', parseError);
          // If JSON parse fails, treat entire content as letter
          return {
            jsonMetadata: null,
            letterContent: results
          };
        }
      } else {
        // No delimiter found, treat as single letter
        console.warn('No delimiter found in patient education output');
        return {
          jsonMetadata: null,
          letterContent: results
        };
      }
    } catch (error) {
      console.error('Error parsing patient education response:', error);
      // On any error, return null to use default rendering
    }

    return null;
  }, [results, agentType]);
  
  // Memoized calculations for performance
  const reportMetrics = useMemo(() => {
    const wordCount = results.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    const charCount = results.length;
    const lineCount = results.split('\n').length;
    
    return { wordCount, readingTime, charCount, lineCount };
  }, [results]);
  
  // Progressive disclosure - show first 500 characters by default for long reports
  const shouldTruncate = agentType !== 'angiogram-pci' && results.length > 1000;
  const displayContent = useMemo(() => {
    if (!shouldTruncate || showFullContent) {
      return results;
    }
    return results.substring(0, 500) + '...';
  }, [results, shouldTruncate, showFullContent]);
  
  const parseSections = useCallback((content: string) => {
    const sections: { title: string; content: string }[] = [];
    const lines = content.split('\n');
    let currentSection: { title: string; content: string } | null = null;

    const commitSection = () => {
      if (currentSection && currentSection.content.trim().length > 0) {
        sections.push({
          title: currentSection.title || 'Medical Report',
          content: currentSection.content.trim()
        });
      }
    };

    // For angiogram-pci and right-heart-cath, only split on main section headers
    const isAngiogramPCI = agentType === 'angiogram-pci';
    const isRHC = agentType === 'right-heart-cath';
    const mainSectionHeaders = [
      'PREAMBLE',
      'FINDINGS',
      'FINDINGS/PROCEDURE',
      'PROCEDURE',
      'CONCLUSION'
    ];

    for (const rawLine of lines) {
      const trimmedLine = rawLine.trim();
      if (!trimmedLine) continue;

      const normalizedHeading = trimmedLine
        .replace(/^[#>*\s]+/, '')
        .replace(/\*+$/g, '')
        .replace(/:$/, '')
        .trim();

      const isHeading = (() => {
        if (!normalizedHeading) return false;
        const upper = normalizedHeading.toUpperCase();

        // For angiogram-pci and right-heart-cath, only treat main section headers as headings
        if (isAngiogramPCI || isRHC) {
          return mainSectionHeaders.includes(upper);
        }

        // For other agents, use original logic
        const known = [
          'PREAMBLE',
          'FINDINGS',
          'FINDINGS/PROCEDURE',
          'PROCEDURE',
          'CONCLUSION',
          'ADDITIONAL NOTES',
          'LEFT VENTRICLE'
        ];
        if (known.includes(upper)) return true;
        const isAllCaps = normalizedHeading === upper && upper.length <= 60 && !upper.includes('.');
        const isTitleStyle = /^[A-Z][A-Za-z\s()/-]{2,40}$/.test(normalizedHeading);
        return isAllCaps || isTitleStyle;
      })();

      if (isHeading) {
        commitSection();
        currentSection = { title: normalizedHeading, content: '' };
      } else {
        if (!currentSection) {
          currentSection = { title: 'Medical Report', content: rawLine };
        } else {
          currentSection.content += (currentSection.content ? '\n' : '') + rawLine;
        }
      }
    }

    commitSection();

    if (sections.length === 0) {
      return [{ title: 'Medical Report', content: content }];
    }

    return sections;
  }, [agentType]);

  const fullReportSections = useMemo(() => parseSections(results), [results, parseSections]);
  const displaySections = useMemo(() => parseSections(displayContent), [displayContent, parseSections]);
  
  const getAgentDisplayName = (type: AgentType | null): string => {
    const names: Record<AgentType, string> = {
      'tavi': 'TAVI Report',
      'angiogram-pci': 'Angiogram/PCI Report',
      'quick-letter': 'Quick Letter',
      'consultation': 'Consultation Report',
      'investigation-summary': 'Investigation Summary',
      'background': 'Background Summary',
      'medication': 'Medication Review',
      'bloods': 'Blood Test Order',
      'imaging': 'Imaging Order',
      'mteer': 'mTEER Report',
      'tteer': 'TTEER Report',
      'pfo-closure': 'PFO Closure Report',
      'asd-closure': 'ASD Closure Report',
      'pvl-plug': 'PVL Plug Report',
      'bypass-graft': 'Bypass Graft Report',
      'right-heart-cath': 'Right Heart Catheterisation',
      'tavi-workup': 'TAVI Workup',
      'ai-medical-review': 'AI Medical Review',
      'batch-ai-review': 'Batch AI Review',
      'patient-education': 'Patient Education',
      'pre-op-plan': 'Pre-Op Plan Summary',
      'ohif-viewer': 'Imaging Viewer Summary',
      'aus-medical-review': 'Australian Medical Review',
      'enhancement': 'Enhanced Report',
      'transcription': 'Transcription',
      'generation': 'Generated Report'
    };
    return type ? names[type] || type.toUpperCase() : 'Medical Report';
  };

  const handleCopy = async (content: string, type: string) => {
    try {
      // Convert markdown bold (**text**) to HTML <strong> tags
      const convertMarkdownToHtml = (text: string): string => {
        // Replace **text** with <strong>text</strong>
        let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Preserve line breaks
        html = html.replace(/\n/g, '<br>');

        return html;
      };

      const htmlContent = convertMarkdownToHtml(content);

      // Try to copy both HTML and plain text for maximum compatibility
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([content], { type: 'text/plain' })
      });

      await navigator.clipboard.write([clipboardItem]);
      setCopiedContent(type);
      setTimeout(() => setCopiedContent(null), 2000);
    } catch (error) {
      // Fallback to plain text if HTML copy fails
      console.warn('HTML copy failed, falling back to plain text:', error);
      try {
        await navigator.clipboard.writeText(content);
        setCopiedContent(type);
        setTimeout(() => setCopiedContent(null), 2000);
      } catch (fallbackError) {
        console.error('Failed to copy:', fallbackError);
      }
    }
  };

  const handlePrintPDF = () => {
    if (jsonBoxRef.current && parsedPatientEducation?.jsonMetadata) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const jsonContent = JSON.stringify(parsedPatientEducation.jsonMetadata, null, 2);
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Patient Education Plan - Structured Data</title>
              <style>
                body { font-family: monospace; padding: 20px; }
                pre { white-space: pre-wrap; word-wrap: break-word; }
                h1 { font-size: 18px; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <h1>Patient Education Plan - Structured Data</h1>
              <pre>${jsonContent}</pre>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (!results) {
    return null;
  }

  // Patient Education: Two-box layout (Letter + JSON)
  if (agentType === 'patient-education' && parsedPatientEducation) {
    const { letterContent, jsonMetadata } = parsedPatientEducation;

    return (
      <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4 space-y-4">
          {/* Patient Letter Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-gray-900">Patient Letter</h4>
              </div>
              <button
                onClick={() => handleCopy(letterContent, 'letter')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
              >
                {copiedContent === 'letter' ? (
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
              <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {letterContent}
              </div>
            </div>
          </div>

          {/* JSON Metadata Box */}
          {jsonMetadata && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Action Plan (Structured Data)</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(JSON.stringify(jsonMetadata, null, 2), 'json')}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
                  >
                    {copiedContent === 'json' ? (
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
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>
              <div ref={jsonBoxRef} className="bg-gray-900 rounded-lg p-4 border border-gray-700 overflow-x-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(jsonMetadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default rendering for other agents
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header with report info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse report' : 'Expand report'}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            <div>
              <h3 className="text-gray-900 font-semibold text-sm">
                {getAgentDisplayName(agentType)}
              </h3>
              <div className="text-gray-600 text-xs mt-1">
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Expand/Collapse indicator */}
          {shouldTruncate && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
            >
              {showFullContent ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      </div>

      {/* Report content */}
      {isExpanded && (
        <div className="report-content">
          <div className="space-y-4 p-4">
            {displaySections.map((section, index) => {
              const copyContent = fullReportSections[index]?.content || section.content;
              const title = section.title || `Section ${index + 1}`;
              const copyKey = `section-${index}`;

              return (
                <div
                  key={`${title}-${index}`}
                  className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {title}
                    </h4>
                    <button
                      onClick={() => handleCopy(copyContent, copyKey)}
                      className={`
                        flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors
                        ${copiedContent === copyKey
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                        }
                      `}
                    >
                      {copiedContent === copyKey ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              );
            })}
          </div>

          {displaySections.length === 0 && (
            <div className="p-4">
              <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                {displayContent}
              </div>
            </div>
          )}

          {/* Truncation indicator */}
          {shouldTruncate && !showFullContent && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowFullContent(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 transition-colors"
              >
                <span>Show complete report ({reportMetrics.charCount} characters)</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ReportDisplay.displayName = 'ReportDisplay';

export { ReportDisplay };
