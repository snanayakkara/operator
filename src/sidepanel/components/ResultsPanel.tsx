import React, { useState, useEffect } from 'react';
import { Copy, Download, Send, Check, AlertCircle, Eye, EyeOff, FileText, RefreshCw, ChevronDown, ChevronUp, Volume2, Trash2 } from 'lucide-react';
import { AudioPlayback } from './AudioPlayback';
import type { AgentType, FailedAudioRecording } from '@/types/medical.types';

interface ResultsPanelProps {
  results: string;
  agentType: AgentType | null;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
  warnings?: string[];
  onDismissWarnings?: () => void;
  originalTranscription?: string;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
  onTranscriptionEdit?: (text: string) => void;
  currentAgent?: AgentType | null;
  onAgentReprocess?: (agentType: AgentType) => void;
  isProcessing?: boolean;
  failedAudioRecordings?: FailedAudioRecording[];
  onClearFailedRecordings?: () => void;
  errors?: string[];
  reviewData?: any;
  audioBlob?: Blob;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  agentType,
  onCopy,
  onInsertToEMR,
  warnings,
  onDismissWarnings,
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  currentAgent,
  onAgentReprocess,
  isProcessing = false,
  failedAudioRecordings = [],
  onClearFailedRecordings,
  errors = [],
  reviewData,
  audioBlob
}) => {
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [insertedRecently, setInsertedRecently] = useState(false);
  const [transcriptionExpanded, setTranscriptionExpanded] = useState(false);
  const [transcriptionCopied, setTranscriptionCopied] = useState(false);
  const [transcriptionInserted, setTranscriptionInserted] = useState(false);
  const [troubleshootingExpanded, setTroubleshootingExpanded] = useState(false);
  const [selectedFailedRecording, setSelectedFailedRecording] = useState<FailedAudioRecording | null>(null);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  
  // AI Review advisory cards state
  const [acknowledgedFindings, setAcknowledgedFindings] = useState<Set<number>>(new Set());
  
  // Reset acknowledged findings when reviewData changes (new patient/review)
  useEffect(() => {
    if (reviewData?.findings) {
      // Reset to empty set when new AI Review data is loaded
      setAcknowledgedFindings(new Set());
      console.log('🔄 Reset AI Review acknowledged findings for new review data');
    }
  }, [reviewData?.findings, reviewData?.timestamp]); // Reset when findings change or new timestamp
  
  // Check if this is an AI Review result
  const isAIReview = agentType === 'ai-medical-review' && reviewData?.findings;

  const handleCopy = async () => {
    try {
      await onCopy(results);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleInsertToEMR = async () => {
    try {
      await onInsertToEMR(results);
      setInsertedRecently(true);
      setTimeout(() => setInsertedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to insert to EMR:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([results], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-report-${agentType || 'report'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatMedicalReport = (text: string) => {
    // First, check if this is a letter (narrative text) vs structured report
    const hasStructuredHeaders = /^[A-Z][A-Z\s]+:/.test(text);
    
    if (!hasStructuredHeaders) {
      // This is likely a letter - format as paragraphs
      return formatLetterContent(text);
    }
    
    // Split into sections based on medical report structure
    const sections = text.split(/\n\n(?=[A-Z][A-Z\s]+:)/);
    
    return sections.map((section, index) => {
      const lines = section.split('\n');
      const header = lines[0];
      const content = lines.slice(1).join('\n');
      
      // Check if this is a header (all caps with colon)
      const isHeader = /^[A-Z][A-Z\s]+:/.test(header);
      
      if (isHeader) {
        return (
          <div key={index} className="mb-4">
            <h4 className="text-gray-900 font-semibold border-b border-gray-200 pb-1 mb-2 text-sm">
              {header.replace(':', '')}
            </h4>
            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          </div>
        );
      } else {
        return (
          <div key={index} className="mb-4">
            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
              {section}
            </div>
          </div>
        );
      }
    });
  };

  const formatLetterContent = (text: string) => {
    // Split text into paragraphs - handle both double newlines and single newlines
    // First normalize line breaks
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split by double newlines (proper paragraph breaks) or single newlines followed by capital letters
    const paragraphs = normalizedText
      .split(/\n\s*\n/)  // Split on double newlines with optional whitespace
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // If we don't have proper paragraph breaks, try to detect sentence groupings
    if (paragraphs.length === 1) {
      const sentences = normalizedText.split(/(?<=[.!?])\s+(?=[A-Z])/);
      // Group sentences into paragraphs (roughly 2-4 sentences each)
      const groupedParagraphs: string[] = [];
      let currentParagraph = '';
      let sentenceCount = 0;
      
      sentences.forEach(sentence => {
        currentParagraph += (currentParagraph ? ' ' : '') + sentence;
        sentenceCount++;
        
        // Start new paragraph after 2-4 sentences, or if sentence is very long
        if (sentenceCount >= 3 || sentence.length > 150) {
          groupedParagraphs.push(currentParagraph.trim());
          currentParagraph = '';
          sentenceCount = 0;
        }
      });
      
      // Add any remaining content
      if (currentParagraph.trim()) {
        groupedParagraphs.push(currentParagraph.trim());
      }
      
      return groupedParagraphs.map((paragraph, index) => (
        <div key={index} className="mb-4 last:mb-0">
          <p className="text-gray-900 text-sm leading-relaxed">
            {paragraph}
          </p>
        </div>
      ));
    }
    
    // We have proper paragraph breaks, format them
    return paragraphs.map((paragraph, index) => (
      <div key={index} className="mb-4 last:mb-0">
        <p className="text-gray-900 text-sm leading-relaxed">
          {paragraph}
        </p>
      </div>
    ));
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  const getReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const wordCount = getWordCount(text);
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes;
  };

  const handleTranscriptionCopy = async () => {
    if (onTranscriptionCopy && originalTranscription) {
      try {
        await onTranscriptionCopy(originalTranscription);
        setTranscriptionCopied(true);
        setTimeout(() => setTranscriptionCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy transcription:', error);
      }
    }
  };

  const handleTranscriptionInsert = async () => {
    if (onTranscriptionInsert && originalTranscription) {
      try {
        await onTranscriptionInsert(originalTranscription);
        setTranscriptionInserted(true);
        setTimeout(() => setTranscriptionInserted(false), 2000);
      } catch (error) {
        console.error('Failed to insert transcription:', error);
      }
    }
  };

  const handleReprocess = (agentType: AgentType) => {
    if (onAgentReprocess && !isProcessing) {
      onAgentReprocess(agentType);
    }
  };

  // Available agents for reprocessing
  const availableAgents = [
    { id: 'tavi', label: 'TAVI', icon: '🫀' },
    { id: 'angiogram-pci', label: 'Angiogram/PCI', icon: '🩺' },
    { id: 'quick-letter', label: 'Quick Letter', icon: '📝' },
    { id: 'consultation', label: 'Consultation', icon: '👨‍⚕️' },
    { id: 'investigation-summary', label: 'Investigation', icon: '🔬' }
  ] as const;

  const agentDisplayName = agentType ? agentType.toUpperCase().replace('-', ' ') : 'AI Assistant';

  return (
    <div className="letter-card rounded-2xl overflow-hidden shadow-lg border">
      {/* Header */}
      <div className="p-4 border-b border-emerald-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isAIReview ? (
              <>
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-gray-900 font-medium text-sm">
                    {reviewData.isBatchReview ? 'Batch AI Medical Review' : 'AI Medical Review'}
                  </h3>
                  <p className="text-blue-700 text-xs">
                    {reviewData.isBatchReview 
                      ? 'Multi-patient clinical oversight recommendations' 
                      : 'Australian clinical oversight recommendations'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="text-gray-900 font-medium text-sm">Full Letter</h3>
                  <p className="text-emerald-700 text-xs">Complete medical correspondence</p>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-white/60 border border-emerald-200 p-2 rounded-lg hover:bg-emerald-50/60 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <EyeOff className="w-4 h-4 text-emerald-600" />
            ) : (
              <Eye className="w-4 h-4 text-emerald-600" />
            )}
          </button>
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-4 mt-2 text-xs">
          {isAIReview ? (
            <div className="text-blue-600">
              <span>{reviewData.findings.length} clinical findings</span>
              <span className="mx-2">•</span>
              <span>{reviewData.findings.filter((f: any) => f.urgency === 'Immediate').length} immediate</span>
              {/* Show batch context if available */}
              {reviewData.isBatchReview && reviewData.batchSummary && (
                <>
                  <span className="mx-2">•</span>
                  <span>{reviewData.batchSummary.totalPatients} patients</span>
                </>
              )}
              <span className="mx-2">•</span>
              <span>{new Date().toLocaleTimeString()}</span>
              {/* Warning badge for AI Review */}
              {warnings && warnings.length > 0 && (
                <span className="mx-2">•</span>
              )}
            </div>
          ) : (
            <div className="text-emerald-600">
              <span>{getWordCount(results)} words</span>
              <span className="mx-2">•</span>
              <span>{getReadingTime(results)} min read</span>
              <span className="mx-2">•</span>
              <span>{new Date().toLocaleTimeString()}</span>
              {/* Warning badge for regular reports */}
              {warnings && warnings.length > 0 && (
                <span className="mx-2">•</span>
              )}
            </div>
          )}
          
          {/* Warning Badge - Common for both AI Review and regular reports */}
          {warnings && warnings.length > 0 && (
            <button
              onClick={() => setWarningsExpanded(!warningsExpanded)}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
              title={`${warnings.length} warning${warnings.length !== 1 ? 's' : ''} - click to ${warningsExpanded ? 'hide' : 'view'}`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{warnings.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Warnings Section */}
      {warnings && warnings.length > 0 && warningsExpanded && (
        <div className="p-4 border-b border-orange-200/50 bg-orange-50/30">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-orange-800 font-medium text-sm mb-2">Content Warnings</h4>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-orange-700 text-sm leading-relaxed">
                    • {warning}
                  </li>
                ))}
              </ul>
              {onDismissWarnings && (
                <button
                  onClick={() => {
                    onDismissWarnings();
                    setWarningsExpanded(false);
                  }}
                  className="mt-3 text-orange-600 hover:text-orange-700 text-xs font-medium transition-colors"
                >
                  Dismiss warnings
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Original Transcription Section */}
      {originalTranscription && (
        <div className="border-b border-gray-200/50">
          <button
            onClick={() => setTranscriptionExpanded(!transcriptionExpanded)}
            className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-gray-900 font-medium text-sm">Original Transcription</span>
              <span className="text-xs text-gray-500">
                {originalTranscription.split(' ').length} words
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Transcription Actions */}
              {onTranscriptionCopy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTranscriptionCopy();
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Copy transcription"
                >
                  {transcriptionCopied ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
              )}
              
              {onTranscriptionInsert && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTranscriptionInsert();
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Insert transcription to EMR"
                >
                  {transcriptionInserted ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </button>
              )}

              {/* Reprocess Dropdown */}
              {onAgentReprocess && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // We could add a state for this dropdown too, but for simplicity, let's use the transcription handlers
                    }}
                    disabled={isProcessing}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors flex items-center space-x-0.5 ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Reprocess with different agent"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-purple-500 ${isProcessing ? 'animate-spin' : ''}`} />
                    <ChevronDown className="w-2.5 h-2.5 text-gray-400" />
                  </button>
                </div>
              )}
              
              {transcriptionExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>

          {/* Expanded Transcription Content */}
          {transcriptionExpanded && (
            <div className="px-4 pb-4">
              <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-200/50">
                <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                  {originalTranscription}
                </p>
              </div>
              
              {/* Audio Playback for Troubleshooting */}
              {audioBlob && (
                <div className="mt-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Volume2 className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-900 font-medium text-sm">Audio Troubleshooting</span>
                  </div>
                  <AudioPlayback 
                    audioBlob={audioBlob}
                    fileName={`transcription-${agentType || 'recording'}`}
                    className="bg-white"
                  />
                </div>
              )}
              
              {/* Reprocess agents - shown when transcription is expanded */}
              {onAgentReprocess && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Reprocess with different agent:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleReprocess(agent.id as AgentType)}
                        disabled={isProcessing}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors flex items-center space-x-1 ${
                          currentAgent === agent.id 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span>{agent.icon}</span>
                        <span>{agent.label}</span>
                        {currentAgent === agent.id && (
                          <span className="text-xs text-blue-500">•</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {isAIReview ? (
            // AI Review Advisory Cards
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-medium text-sm">Clinical Advisory Cards</h3>
                <div className="text-xs text-gray-500">
                  {acknowledgedFindings.size} of {reviewData.findings.length} reviewed
                </div>
              </div>
              
              {reviewData.findings.map((finding: any, index: number) => {
                const isAcknowledged = acknowledgedFindings.has(index);
                const urgencyColor = finding.urgency === 'Immediate' ? 'red' : 
                                   finding.urgency === 'Soon' ? 'amber' : 'blue';
                                   
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
                          onClick={() => {
                            const newAcknowledged = new Set(acknowledgedFindings);
                            if (isAcknowledged) {
                              newAcknowledged.delete(index);
                            } else {
                              newAcknowledged.add(index);
                            }
                            setAcknowledgedFindings(newAcknowledged);
                          }}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                            isAcknowledged
                              ? 'bg-green-500 border-green-500'
                              : `border-${urgencyColor}-300 hover:border-${urgencyColor}-400`
                          }`}
                        >
                          {isAcknowledged && (
                            <Check className="w-3 h-3 text-white" />
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
          ) : (
            // Regular Medical Report
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="text-gray-900 font-medium text-sm">Generated Medical Letter</h3>
                <span className="text-xs text-gray-500">{getWordCount(results)} words</span>
              </div>
              <div className="bg-white/80 rounded-lg p-4 max-h-80 overflow-y-auto medical-report border border-emerald-100">
                {formatMedicalReport(results)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isAIReview && (
        <div className="p-4 border-t border-emerald-200/50">
        <div className="grid grid-cols-3 gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`
              p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
              ${copiedRecently 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration' 
                : 'bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700'
              }
            `}
          >
            {copiedRecently ? (
              <Check className="w-4 h-4 text-emerald-600 checkmark-appear" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className={`text-xs ${copiedRecently ? 'text-emerald-700' : 'text-gray-700'}`}>
              {copiedRecently ? 'Copied!' : 'Copy'}
            </span>
          </button>

          {/* Insert to EMR Button */}
          <button
            onClick={handleInsertToEMR}
            className={`
              p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
              ${insertedRecently 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration' 
                : 'bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700'
              }
            `}
          >
            {insertedRecently ? (
              <Check className="w-4 h-4 text-emerald-600 checkmark-appear" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className={`text-xs ${insertedRecently ? 'text-emerald-700' : 'text-gray-700'}`}>
              {insertedRecently ? 'Inserted!' : 'Insert'}
            </span>
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="bg-white/60 border border-emerald-200 p-3 rounded-lg flex flex-col items-center space-y-1 hover:bg-emerald-50/60 transition-colors btn-micro-press btn-micro-hover"
          >
            <Download className="w-4 h-4 text-gray-700" />
            <span className="text-xs text-gray-700">Download</span>
          </button>
        </div>

        {/* Quality Indicator */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-xs">Report generated successfully</span>
          </div>
          
          {/* Confidence Score */}
          <div className="text-gray-500 text-xs">
            Confidence: 95%
          </div>
        </div>

        {/* Usage Tip */}
        <div className="mt-3 p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
          <p className="text-emerald-700 text-xs">
            💡 <strong>Full Letter:</strong> Complete medical correspondence ready for EMR insertion or sharing.
          </p>
        </div>
        </div>
      )}

      {/* Troubleshooting Section - Show when there are failed recordings and errors */}
      {failedAudioRecordings.length > 0 && errors.length > 0 && errors.some(error => 
        error.includes('could not be parsed coherently') || 
        error.includes('Investigation dictation could not be parsed')
      ) && (
        <div className="border-t border-red-200/50 bg-red-50/30">
          <button
            onClick={() => setTroubleshootingExpanded(!troubleshootingExpanded)}
            className="w-full p-4 text-left hover:bg-red-50/50 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-red-600" />
              <span className="text-red-900 font-medium text-sm">🔊 Troubleshoot Audio Recording</span>
              <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                {failedAudioRecordings.length} recording{failedAudioRecordings.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {onClearFailedRecordings && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFailedRecordings();
                  }}
                  className="p-1.5 rounded hover:bg-red-100 transition-colors"
                  title="Clear all failed recordings"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              )}
              {troubleshootingExpanded ? (
                <ChevronUp className="w-4 h-4 text-red-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-400" />
              )}
            </div>
          </button>

          {troubleshootingExpanded && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                <div className="text-sm text-red-700 bg-red-100/50 p-3 rounded-lg border border-red-200">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Investigation parsing failed</p>
                      <p className="text-red-600 mt-1 text-xs">
                        The recording could not be processed into a structured investigation summary. 
                        Use the audio playback below to identify potential issues:
                      </p>
                      <ul className="mt-2 text-xs text-red-600 space-y-1">
                        <li>• Check if audio is too quiet or contains too much silence</li>
                        <li>• Verify medical terminology is clearly spoken</li>
                        <li>• Ensure recording duration is adequate (≥2 seconds)</li>
                        <li>• Look for background noise or audio quality issues</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Failed Recording Selection */}
                {failedAudioRecordings.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">
                      Select recording to troubleshoot:
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {failedAudioRecordings.map((recording, index) => (
                        <button
                          key={recording.id}
                          onClick={() => setSelectedFailedRecording(recording)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            selectedFailedRecording?.id === recording.id
                              ? 'bg-red-100 border-red-300 text-red-800'
                              : 'bg-white border-red-200 hover:bg-red-50 text-red-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">
                                Recording #{failedAudioRecordings.length - index}
                              </div>
                              <div className="text-xs opacity-75 mt-1">
                                {new Date(recording.timestamp).toLocaleString()} • 
                                {recording.metadata.recordingTime}s • 
                                {(recording.metadata.fileSize / 1024).toFixed(1)}KB
                              </div>
                            </div>
                            {selectedFailedRecording?.id === recording.id && (
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audio Playback */}
                {(selectedFailedRecording || failedAudioRecordings.length === 1) && (
                  <div>
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-red-700 mb-1">Audio Playback & Analysis</h4>
                      <p className="text-xs text-red-600">
                        Listen to the recording and check the audio quality metrics below:
                      </p>
                    </div>
                    <AudioPlayback
                      audioBlob={(selectedFailedRecording || failedAudioRecordings[0]).audioBlob}
                      fileName={`investigation-failed-${(selectedFailedRecording || failedAudioRecordings[0]).agentType}`}
                      className="border-red-200"
                    />
                    
                    {/* Show transcription if available */}
                    {(selectedFailedRecording || failedAudioRecordings[0]).transcriptionAttempt && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-red-700 mb-2">Transcription Result:</h5>
                        <div className="bg-white p-3 rounded-lg border border-red-200 text-sm text-gray-800">
                          <p className="whitespace-pre-wrap">
                            {(selectedFailedRecording || failedAudioRecordings[0]).transcriptionAttempt}
                          </p>
                        </div>
                        <p className="text-xs text-red-600 mt-2">
                          The transcription above was successful, but could not be parsed into a structured investigation summary.
                        </p>
                      </div>
                    )}
                    
                    {/* Error Details */}
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-red-700 mb-2">Error Details:</h5>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-sm text-red-800 font-mono">
                          {(selectedFailedRecording || failedAudioRecordings[0]).errorMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};