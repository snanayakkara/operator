/**
 * Pre-Op Plan Display Component
 *
 * Displays pre-procedure summary cards with:
 * - Visual A5-sized card preview with emoji icons
 * - Collapsible JSON metadata
 * - Print/Copy/Export actions
 * - Procedure type badge
 */

import React, { memo, useState } from 'react';
import { ResultsContainer } from './ResultsContainer';
import { Printer, Download, ChevronDown, ChevronRight, ClipboardList, Clipboard, Check, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PatientSession, PreOpProcedureType } from '@/types/medical.types';
import type { TranscriptionApprovalState, TranscriptionApprovalStatus } from '@/types/optimization';
import { copyPreOpCardToClipboard, downloadPreOpCard, validatePreOpDataForExport } from '@/utils/preOpCardExport';
import { ToastService } from '@/services/ToastService';

interface PreOpPlanDisplayProps {
  session: PatientSession;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
  onTranscriptionEdit?: (text: string) => void;
  onTranscriptionApprove?: (status: TranscriptionApprovalStatus) => void;
  transcriptionApprovalState?: TranscriptionApprovalState;
  onAgentReprocess?: () => void;
  isProcessing?: boolean;
}

const PROCEDURE_TYPE_LABELS: Record<PreOpProcedureType, { label: string; color: string; emoji: string }> = {
  'ANGIOGRAM_OR_PCI': { label: 'Angiogram/PCI', color: 'blue', emoji: '🩺' },
  'RIGHT_HEART_CATH': { label: 'Right Heart Cath', color: 'purple', emoji: '🩺' },
  'TAVI': { label: 'TAVI', color: 'emerald', emoji: '🫀' },
  'MITRAL_TEER': { label: 'Mitral TEER', color: 'teal', emoji: '🫀' }
};

export const PreOpPlanDisplay: React.FC<PreOpPlanDisplayProps> = memo(({
  session,
  onCopy,
  onInsertToEMR,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  onTranscriptionApprove,
  transcriptionApprovalState,
  onAgentReprocess,
  isProcessing = false
}) => {
  const [showJSON, setShowJSON] = useState(false);
  const [copyCardState, setCopyCardState] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [downloadCardState, setDownloadCardState] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');

  // Extract pre-op plan data
  const preOpData = session.preOpPlanData;
  if (!preOpData) {
    return (
      <div className="p-4 text-center text-gray-500">
        No pre-op plan data available
      </div>
    );
  }

  const { procedureType, cardMarkdown, jsonData, completenessScore } = preOpData;
  const warningMessages = preOpData.warnings ?? [];
  const procedureInfo = PROCEDURE_TYPE_LABELS[procedureType] || PROCEDURE_TYPE_LABELS['ANGIOGRAM_OR_PCI'];

  // Print handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pre-Op Plan - ${procedureInfo.label}</title>
          <style>
            @page {
              size: A5;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 10pt;
              line-height: 1.4;
              color: #1f2937;
              margin: 0;
              padding: 0;
            }
            h1 {
              font-size: 14pt;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .field {
              margin: 4px 0;
            }
            .field strong {
              color: #374151;
            }
            .header {
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .footer {
              margin-top: 20px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
              font-size: 8pt;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${procedureInfo.emoji} ${procedureInfo.label} Pre-Op Plan</h1>
          </div>
          <div class="content">
            ${cardMarkdown.split('\n').map(line => {
              if (line.startsWith('**')) {
                return `<div class="field">${line.replace(/\*\*/g, '<strong>').replace(/<\/strong>/g, '</strong>')}</div>`;
              }
              return line ? `<div>${line}</div>` : '';
            }).join('')}
          </div>
          <div class="footer">
            Generated: ${new Date().toLocaleString('en-AU')} | Completeness: ${completenessScore || 'N/A'}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Export JSON handler
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pre-op-plan-${procedureType.toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy A5 Card to Clipboard handler
  const handleCopyCard = async () => {
    // Validate data before export
    const validation = validatePreOpDataForExport({
      procedureType,
      cardMarkdown,
      jsonData,
      completenessScore
    });

    if (!validation.valid) {
      ToastService.getInstance().error(
        `Cannot copy card: Missing essential data\n\n${validation.missingFields.map(f => `• ${f}`).join('\n')}`
      );
      setCopyCardState('error');
      setTimeout(() => setCopyCardState('idle'), 2000);
      return;
    }

    setCopyCardState('copying');

    try {
      await copyPreOpCardToClipboard(
        {
          procedureType,
          cardMarkdown,
          jsonData,
          completenessScore
        },
        {
          // Optional: Could pull patient info from session context if available
          operatorInfo: {
            date: new Date().toLocaleDateString('en-AU', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          }
        }
      );

      setCopyCardState('success');
      ToastService.getInstance().success('A5 card copied to clipboard! Ready to paste into documents.');

      // Reset to idle after 3 seconds
      setTimeout(() => setCopyCardState('idle'), 3000);
    } catch (error) {
      console.error('Failed to copy card to clipboard:', error);
      setCopyCardState('error');
      ToastService.getInstance().error(
        error instanceof Error ? error.message : 'Failed to copy card to clipboard'
      );

      setTimeout(() => setCopyCardState('idle'), 2000);
    }
  };

  // Download A5 Card handler
  const handleDownloadCard = async () => {
    // Validate data before export
    const validation = validatePreOpDataForExport({
      procedureType,
      cardMarkdown,
      jsonData,
      completenessScore
    });

    if (!validation.valid) {
      ToastService.getInstance().error(
        `Cannot download card: Missing essential data\n\n${validation.missingFields.map(f => `• ${f}`).join('\n')}`
      );
      setDownloadCardState('error');
      setTimeout(() => setDownloadCardState('idle'), 2000);
      return;
    }

    setDownloadCardState('downloading');

    try {
      await downloadPreOpCard(
        {
          procedureType,
          cardMarkdown,
          jsonData,
          completenessScore
        },
        {
          operatorInfo: {
            date: new Date().toLocaleDateString('en-AU', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          }
        }
      );

      setDownloadCardState('success');
      ToastService.getInstance().success('A5 card downloaded successfully!');

      setTimeout(() => setDownloadCardState('idle'), 3000);
    } catch (error) {
      console.error('Failed to download card:', error);
      setDownloadCardState('error');
      ToastService.getInstance().error(
        error instanceof Error ? error.message : 'Failed to download card'
      );

      setTimeout(() => setDownloadCardState('idle'), 2000);
    }
  };

  return (
    <ResultsContainer
      agentType="pre-op-plan"
      title="Pre-Op Plan Summary Card"
      subtitle={procedureInfo.label}
      completedTime={session.completedTime}
      processingTime={session.processingTime}
      originalTranscription={session.transcription}
      onTranscriptionCopy={onTranscriptionCopy}
      onTranscriptionInsert={onTranscriptionInsert}
      onTranscriptionEdit={onTranscriptionEdit}
      onTranscriptionApprove={onTranscriptionApprove}
      transcriptionApprovalState={transcriptionApprovalState}
      onAgentReprocess={onAgentReprocess ? () => onAgentReprocess() : undefined}
      isProcessing={isProcessing}
      audioBlob={session.audioBlob || null}
      results={cardMarkdown}
      onCopy={onCopy}
      onInsertToEMR={onInsertToEMR}
      agentName="Pre-Op Plan"
      hideActions={false}
    >
      {/* Card Content */}
      <div className="space-y-6">
        {/* Procedure Type Badge + Completeness */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${procedureInfo.color}-50 border border-${procedureInfo.color}-200`}>
            <ClipboardList className={`w-4 h-4 text-${procedureInfo.color}-600`} />
            <span className={`text-sm font-medium text-${procedureInfo.color}-700`}>
              {procedureInfo.emoji} {procedureInfo.label}
            </span>
          </div>
          {completenessScore && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Completeness:</span> {completenessScore}
            </div>
          )}
        </div>

        {/* Warnings */}
        {warningMessages.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-800 mb-1">Warnings</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  {warningMessages.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Card Preview */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="prose prose-sm max-w-none">
            {cardMarkdown.split('\n').map((line, idx) => {
              // Title line (first line with emoji)
              if (idx === 0 && line.includes(procedureInfo.emoji)) {
                return (
                  <h3 key={idx} className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>{procedureInfo.emoji}</span>
                    <span>{line.replace(procedureInfo.emoji, '').trim()}</span>
                  </h3>
                );
              }
              // Field lines (with **)
              if (line.includes('**')) {
                const parts = line.split('—');
                if (parts.length === 2) {
                  const label = parts[0].replace(/\*\*/g, '').trim();
                  const value = parts[1].trim();
                  return (
                    <div key={idx} className="text-sm leading-relaxed mb-1.5">
                      <span className="font-semibold text-gray-700">{label}</span>
                      <span className="text-gray-500 mx-1">—</span>
                      <span className="text-gray-900">{value}</span>
                    </div>
                  );
                }
              }
              // Empty lines
              if (!line.trim()) {
                return <div key={idx} className="h-2" />;
              }
              // Other lines
              return (
                <div key={idx} className="text-sm text-gray-900 mb-1">
                  {line}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Copy A5 Card to Clipboard */}
          <button
            onClick={handleCopyCard}
            disabled={copyCardState === 'copying'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              copyCardState === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : copyCardState === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : copyCardState === 'copying'
                ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700'
            } border`}
          >
            {copyCardState === 'copying' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Copying...
              </>
            ) : copyCardState === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : copyCardState === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                Failed
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4" />
                Copy A5 Card
              </>
            )}
          </button>

          {/* Download A5 Card */}
          <button
            onClick={handleDownloadCard}
            disabled={downloadCardState === 'downloading'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              downloadCardState === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : downloadCardState === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : downloadCardState === 'downloading'
                ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
            } border`}
          >
            {downloadCardState === 'downloading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : downloadCardState === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                Downloaded!
              </>
            ) : downloadCardState === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                Failed
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download A5 Card
              </>
            )}
          </button>

          {/* Print A5 Card */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>

        {/* Collapsible JSON Metadata */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowJSON(!showJSON)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Structured JSON Metadata
            </span>
            {showJSON ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {showJSON && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
                  <pre>{JSON.stringify(jsonData, null, 2)}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ResultsContainer>
  );
});

PreOpPlanDisplay.displayName = 'PreOpPlanDisplay';
