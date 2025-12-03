/**
 * Pre-Op Plan Display Component
 *
 * Displays pre-procedure summary cards with:
 * - Visual A5-sized card preview with emoji icons
 * - Collapsible JSON metadata
 * - Print/Copy/Export actions
 * - Procedure type badge
 */

import React, { memo, useState, useEffect } from 'react';
import { ResultsContainer } from './ResultsContainer';
import { PreOpCardLayout } from './PreOpCardLayout';
import { FieldValidationPrompt } from './FieldValidationPrompt';
import { Printer, Download, ChevronDown, ChevronRight, Clipboard, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../buttons';
import type { PatientSession, PreOpProcedureType } from '@/types/medical.types';
import type { TranscriptionApprovalState, TranscriptionApprovalStatus } from '@/types/optimization';
import { copyPreOpCardToClipboard, downloadPreOpCard, validatePreOpDataForExport } from '@/utils/preOpCardExport';
import { ToastService } from '@/services/ToastService';
import { getValidationConfig } from '@/config/validationFieldConfig';

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
  onReprocessWithValidation?: (userFields: Record<string, any>) => void;
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
  isProcessing = false,
  onReprocessWithValidation
}) => {
  const [showJSON, setShowJSON] = useState(false);
  const [copyCardState, setCopyCardState] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [downloadCardState, setDownloadCardState] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Get validation configuration
  const { fieldConfig: PREOP_FIELD_CONFIG, copy: PREOP_VALIDATION_COPY } = getValidationConfig('pre-op-plan');

  // Extract pre-op plan data
  const preOpData = session.preOpPlanData;

  // Detect validation state and show modal
  useEffect(() => {
    if (session.preOpValidationStatus === 'awaiting_validation' && session.preOpValidationResult) {
      console.log('🔍 Pre-Op Display: Validation required, showing modal');
      setShowValidationModal(true);
    }
  }, [session.preOpValidationStatus, session.preOpValidationResult]);
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

    // Check if we have any data at all
    if (!validation.valid) {
      ToastService.getInstance().error(
        'Cannot copy card: No procedure data available. Please ensure validation workflow has completed.'
      );
      setCopyCardState('error');
      setTimeout(() => setCopyCardState('idle'), 2000);
      return;
    }

    // Also check if planData exists with fields
    if (!preOpData || !jsonData || !jsonData.fields || Object.keys(jsonData.fields).length === 0) {
      ToastService.getInstance().error(
        'Cannot copy card: No validated data available. Please complete the validation workflow first.'
      );
      setCopyCardState('error');
      setTimeout(() => setCopyCardState('idle'), 2000);
      return;
    }

    // Show warning if incomplete but allow export to proceed
    if (validation.warningMessage) {
      ToastService.getInstance().warning(validation.warningMessage);
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
      ToastService.getInstance().success(
        validation.completenessPercent === 100
          ? 'A5 card copied to clipboard! Ready to paste into documents.'
          : `A5 card copied to clipboard (${validation.completenessPercent}% complete)! Review and fill missing fields as needed.`
      );

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

    // Check if we have any data at all
    if (!validation.valid) {
      ToastService.getInstance().error(
        'Cannot download card: No procedure data available. Please ensure validation workflow has completed.'
      );
      setDownloadCardState('error');
      setTimeout(() => setDownloadCardState('idle'), 2000);
      return;
    }

    // Also check if planData exists with fields
    if (!preOpData || !jsonData || !jsonData.fields || Object.keys(jsonData.fields).length === 0) {
      ToastService.getInstance().error(
        'Cannot download card: No validated data available. Please complete the validation workflow first.'
      );
      setDownloadCardState('error');
      setTimeout(() => setDownloadCardState('idle'), 2000);
      return;
    }

    // Show warning if incomplete but allow export to proceed
    if (validation.warningMessage) {
      ToastService.getInstance().warning(validation.warningMessage);
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
      ToastService.getInstance().success(
        validation.completenessPercent === 100
          ? 'A5 card downloaded successfully!'
          : `A5 card downloaded (${validation.completenessPercent}% complete)! Review and fill missing fields as needed.`
      );

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
        {/* Completeness indicator - subtle, no duplicate procedure badge */}
        {completenessScore && (
          <div className="flex items-center justify-end">
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              {completenessScore}
            </div>
          </div>
        )}

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

        {/* Card Preview - Visual Component */}
        <PreOpCardLayout
          jsonData={jsonData}
          procedureInfo={procedureInfo}
        />

        {/* Custom Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Copy A5 Card to Clipboard */}
          <Button
            onClick={handleCopyCard}
            disabled={copyCardState === 'copying'}
            variant={
              copyCardState === 'success' ? 'success' :
              copyCardState === 'error' ? 'danger' : 'outline'
            }
            size="md"
            isLoading={copyCardState === 'copying'}
            isSuccess={copyCardState === 'success'}
            startIcon={
              copyCardState === 'error' ? <AlertCircle className="w-4 h-4" /> :
              copyCardState === 'copying' || copyCardState === 'success' ? undefined :
              <Clipboard className="w-4 h-4" />
            }
            className={
              copyCardState === 'copying' ? 'bg-gray-50 border-gray-200 text-gray-500' :
              copyCardState === 'success' || copyCardState === 'error' ? '' :
              'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700'
            }
          >
            {copyCardState === 'copying' ? 'Copying...' :
             copyCardState === 'success' ? 'Copied!' :
             copyCardState === 'error' ? 'Failed' :
             'Copy A5 Card'}
          </Button>

          {/* Download A5 Card */}
          <Button
            onClick={handleDownloadCard}
            disabled={downloadCardState === 'downloading'}
            variant={
              downloadCardState === 'success' ? 'success' :
              downloadCardState === 'error' ? 'danger' : 'outline'
            }
            size="md"
            isLoading={downloadCardState === 'downloading'}
            isSuccess={downloadCardState === 'success'}
            startIcon={
              downloadCardState === 'error' ? <AlertCircle className="w-4 h-4" /> :
              downloadCardState === 'downloading' || downloadCardState === 'success' ? undefined :
              <Download className="w-4 h-4" />
            }
            className={
              downloadCardState === 'downloading' ? 'bg-gray-50 border-gray-200 text-gray-500' :
              downloadCardState === 'success' || downloadCardState === 'error' ? '' :
              'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
            }
          >
            {downloadCardState === 'downloading' ? 'Generating...' :
             downloadCardState === 'success' ? 'Downloaded!' :
             downloadCardState === 'error' ? 'Failed' :
             'Download A5 Card'}
          </Button>

          {/* Print A5 Card */}
          <Button
            onClick={handlePrint}
            variant="outline"
            size="md"
            startIcon={<Printer className="w-4 h-4" />}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            Print
          </Button>

          {/* Export JSON */}
          <Button
            onClick={handleExportJSON}
            variant="outline"
            size="md"
            startIcon={<Download className="w-4 h-4" />}
          >
            Export JSON
          </Button>
        </div>

        {/* Collapsible JSON Metadata */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Button
            onClick={() => setShowJSON(!showJSON)}
            variant="ghost"
            size="md"
            fullWidth
            className="justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-none"
            endIcon={showJSON ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          >
            <span className="text-sm font-medium text-gray-700">
              Structured JSON Metadata
            </span>
          </Button>
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

      {/* Validation Modal */}
      {showValidationModal && session.preOpValidationResult && (
        <FieldValidationPrompt
          agentLabel="Pre-Op Plan"
          validation={session.preOpValidationResult}
          fieldConfig={PREOP_FIELD_CONFIG}
          copy={PREOP_VALIDATION_COPY}
          onCancel={() => {
            console.log('🚫 Pre-Op Display: Validation cancelled');
            setShowValidationModal(false);
          }}
          onSkip={() => {
            console.log('⏭️ Pre-Op Display: Validation skipped');
            setShowValidationModal(false);
          }}
          onContinue={(userFields) => {
            console.log('✅ Pre-Op Display: Validation completed, reprocessing with user fields', userFields);
            setShowValidationModal(false);
            if (onReprocessWithValidation) {
              onReprocessWithValidation(userFields);
            }
          }}
        />
      )}
    </ResultsContainer>
  );
});

PreOpPlanDisplay.displayName = 'PreOpPlanDisplay';
