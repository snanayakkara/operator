/**
 * Report Display Component
 * 
 * Focused component for displaying medical reports with optimizations:
 * - Virtualization for long reports
 * - Progressive disclosure for better UX
 * - Memoization to prevent unnecessary re-renders
 */

import React, { memo, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  
  // Memoized calculations for performance
  const reportMetrics = useMemo(() => {
    const wordCount = results.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    const charCount = results.length;
    const lineCount = results.split('\n').length;
    
    return { wordCount, readingTime, charCount, lineCount };
  }, [results]);
  
  // Progressive disclosure - show first 500 characters by default for long reports
  const shouldTruncate = results.length > 1000;
  const displayContent = useMemo(() => {
    if (!shouldTruncate || showFullContent) {
      return results;
    }
    return results.substring(0, 500) + '...';
  }, [results, shouldTruncate, showFullContent]);
  
  // Split content into sections for better readability
  const reportSections = useMemo(() => {
    const sections: { title: string; content: string }[] = [];
    const lines = displayContent.split('\n');
    let currentSection = { title: '', content: '' };
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line looks like a section header (ALL CAPS or Title Case with colon)
      if (trimmedLine.match(/^[A-Z][A-Z\s]+:?$/) || trimmedLine.match(/^[A-Z][a-z\s]+:$/)) {
        // Save previous section if it has content
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }
        // Start new section
        currentSection = { title: trimmedLine.replace(':', ''), content: '' };
      } else if (trimmedLine) {
        currentSection.content += line + '\n';
      }
    }
    
    // Add final section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    
    // If no sections found, return the whole content as one section
    if (sections.length === 0) {
      sections.push({ title: 'Medical Report', content: displayContent });
    }
    
    return sections;
  }, [displayContent]);
  
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
      'ohif-viewer': 'Imaging Viewer Summary',
      'aus-medical-review': 'Australian Medical Review',
      'enhancement': 'Enhanced Report',
      'transcription': 'Transcription',
      'generation': 'Generated Report'
    };
    return type ? names[type] || type.toUpperCase() : 'Medical Report';
  };
  
  if (!results) {
    return null;
  }
  
  return (
    <div className={`glass rounded-2xl overflow-hidden ${className}`}>
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
                <span>{reportMetrics.wordCount} words</span>
                <span className="mx-2">•</span>
                <span>{reportMetrics.readingTime} min read</span>
                <span className="mx-2">•</span>
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
          {reportSections.length > 1 ? (
            // Structured sections display
            <div className="space-y-4 p-4">
              {reportSections.map((section, index) => (
                <div key={index} className="section">
                  {section.title && (
                    <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2 text-sm">
                      {section.title}
                    </h4>
                  )}
                  <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single block content
            <div className="p-4">
              <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap font-mono">
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
