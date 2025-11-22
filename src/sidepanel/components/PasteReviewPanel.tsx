/**
 * Paste Review Panel Component
 *
 * Two-stage review panel:
 * 1. Preflight mode (before LLM) - review parsed notes, conflicts, medications
 * 2. Post-gen mode (after LLM) - review generated content quality before actions
 */

import React from 'react';
import { X, AlertTriangle, Check, Info, FileText, Pill, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReviewTriggerResult, ParsedNotes, EMRContext } from '@/types/pasteNotes.types';
import { getTriggerDescription } from '@/utils/pasteNotes/ReviewTriggers';
import Button, { IconButton } from './buttons/Button';

interface PasteReviewPanelProps {
  isVisible: boolean;
  mode: 'preflight' | 'postgen';
  triggers: ReviewTriggerResult;
  parsedNotes?: ParsedNotes;
  emrContext?: EMRContext;
  generatedContent?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PasteReviewPanel: React.FC<PasteReviewPanelProps> = ({
  isVisible,
  mode,
  triggers,
  parsedNotes,
  emrContext,
  generatedContent,
  onConfirm,
  onCancel
}) => {
  if (!isVisible) return null;

  const relevantTriggers = mode === 'preflight' ? triggers.preflight : triggers.postGen;

  if (!relevantTriggers.triggered) return null;

  const isHighRisk = relevantTriggers.triggers.some(t =>
    ['identity_mismatch', 'high_impact_anticoagulation', 'urgent_red_flags'].includes(t)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`bg-white rounded-2xl shadow-xl max-w-4xl w-full border-2 ${
          isHighRisk ? 'border-red-300' : 'border-amber-200'
        } max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="review-title"
        aria-describedby="review-description"
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-200 ${
          isHighRisk
            ? 'bg-gradient-to-r from-red-50 to-orange-50'
            : 'bg-gradient-to-r from-amber-50 to-yellow-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isHighRisk ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${isHighRisk ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <h3 id="review-title" className="text-lg font-semibold text-gray-900">
                  {mode === 'preflight' ? 'Review Before Generation' : 'Review Before Actions'}
                </h3>
                <p id="review-description" className="text-xs text-gray-600">
                  {mode === 'preflight'
                    ? 'Please review the following items before generating the letter'
                    : 'Please review the generated content before enabling copy/insert actions'
                  }
                </p>
              </div>
            </div>
            <IconButton
              onClick={onCancel}
              icon={<X />}
              variant="ghost"
              size="sm"
              aria-label="Close review panel"
            />
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Triggers summary */}
          <div className={`rounded-lg p-4 ${isHighRisk ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`text-sm font-medium ${isHighRisk ? 'text-red-900' : 'text-amber-900'} mb-2`}>
              {relevantTriggers.triggers.length} {relevantTriggers.triggers.length === 1 ? 'Issue' : 'Issues'} Detected:
            </div>
            <ul className="space-y-1">
              {relevantTriggers.triggers.map((trigger, idx) => (
                <li key={idx} className={`text-sm flex items-start space-x-2 ${isHighRisk ? 'text-red-800' : 'text-amber-800'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isHighRisk ? 'bg-red-600' : 'bg-amber-600'}`}></span>
                  <span>{getTriggerDescription(trigger)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Preflight mode content */}
          {mode === 'preflight' && parsedNotes && emrContext && (
            <>
              {/* EMR Context (read-only) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-900">EMR Context (Baseline)</h4>
                </div>
                <div className="space-y-2 text-sm text-blue-800">
                  <div>
                    <strong>Patient:</strong>{' '}
                    {emrContext.demographics.name || 'Unknown'},{' '}
                    {emrContext.demographics.age || 'Age unknown'},{' '}
                    {emrContext.demographics.gender || 'Gender unknown'}
                    {emrContext.demographics.mrn && ` (MRN: ${emrContext.demographics.mrn})`}
                  </div>
                  {emrContext.gp && (
                    <div>
                      <strong>GP:</strong> {emrContext.gp}
                    </div>
                  )}
                  {emrContext.allergies.length > 0 && (
                    <div>
                      <strong>Allergies:</strong> {emrContext.allergies.join(', ')}
                    </div>
                  )}
                  {emrContext.medications_emr.length > 0 && (
                    <div>
                      <strong>Current Medications ({emrContext.medications_emr.length}):</strong>
                      <ul className="mt-1 ml-4 space-y-0.5">
                        {emrContext.medications_emr.slice(0, 5).map((med, idx) => (
                          <li key={idx} className="text-xs">
                            {med.drug} {med.dose}{med.unit} {med.freq} {med.route && `(${med.route})`}
                          </li>
                        ))}
                        {emrContext.medications_emr.length > 5 && (
                          <li className="text-xs italic">... and {emrContext.medications_emr.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsed Notes */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <FileText className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm font-semibold text-green-900">Parsed Notes (Modifications)</h4>
                </div>
                <div className="space-y-3 text-sm text-green-800">
                  {parsedNotes.meds_snapshot.length > 0 && (
                    <div>
                      <strong>Medication Snapshot ({parsedNotes.meds_snapshot.length}):</strong>
                      <ul className="mt-1 ml-4 space-y-0.5">
                        {parsedNotes.meds_snapshot.map((med, idx) => (
                          <li key={idx} className="text-xs">
                            {med.drug} {med.dose}{med.unit} {med.freq} {med.route && `(${med.route})`}
                            {med.formulation && ` [${med.formulation}]`}
                          </li>
                        ))}
                      </ul>
                      <div className="text-xs mt-1 text-green-700">
                        Confidence: {Math.round(parsedNotes.confidence * 100)}%
                        {!parsedNotes.contains_meds_header && ' (heuristic detection)'}
                      </div>
                    </div>
                  )}

                  {parsedNotes.deltas.length > 0 && (
                    <div>
                      <strong>Medication Changes ({parsedNotes.deltas.length}):</strong>
                      <ul className="mt-1 ml-4 space-y-0.5">
                        {parsedNotes.deltas.map((delta, idx) => (
                          <li key={idx} className="text-xs">
                            <span className="capitalize font-medium">{delta.action}</span>: {delta.drug}
                            {delta.to && ` → ${delta.to.dose}${delta.to.unit} ${delta.to.freq}`}
                            {delta.reason && ` (${delta.reason})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsedNotes.placeholders.length > 0 && (
                    <div>
                      <strong>Placeholders/Ambiguities:</strong>
                      <div className="mt-1 text-xs">{parsedNotes.placeholders.join(', ')}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ChangeLog (succinct) */}
              {parsedNotes.deltas.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Pill className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-semibold text-purple-900">Medication ChangeLog</h4>
                  </div>
                  <div className="text-sm text-purple-800">
                    {parsedNotes.deltas.map((delta, idx) => (
                      <span key={idx}>
                        {idx > 0 && '; '}
                        <span className="capitalize">{delta.action === 'increase' ? '↑' : delta.action === 'decrease' ? '↓' : delta.action}</span>{' '}
                        {delta.drug}
                        {delta.to && delta.to.dose && ` to ${delta.to.dose}${delta.to.unit} ${delta.to.freq}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trigger details */}
              {Object.keys(relevantTriggers.details).length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Details</h4>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700">
                    {Object.entries(relevantTriggers.details).map(([key, value]) => (
                      <div key={key}>
                        <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Post-gen mode content */}
          {mode === 'postgen' && generatedContent && (
            <>
              {/* Generated content preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Activity className="w-4 h-4 text-gray-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Generated Content Preview</h4>
                </div>
                <div className="bg-white border border-gray-300 rounded p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                    {generatedContent.length > 500
                      ? `${generatedContent.substring(0, 500)}...\n\n[Content truncated - ${generatedContent.length} chars total]`
                      : generatedContent
                    }
                  </pre>
                </div>
              </div>

              {/* Trigger details */}
              {Object.keys(relevantTriggers.details).length > 0 && (
                <div className={`rounded-lg p-4 ${isHighRisk ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className={`w-4 h-4 ${isHighRisk ? 'text-red-600' : 'text-amber-600'}`} />
                    <h4 className={`text-sm font-semibold ${isHighRisk ? 'text-red-900' : 'text-amber-900'}`}>Quality Metrics</h4>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700">
                    {Object.entries(relevantTriggers.details).map(([key, value]) => (
                      <div key={key}>
                        <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <Button
              onClick={onCancel}
              variant="outline"
              size="md"
            >
              Cancel
            </Button>

            <div className="flex items-center space-x-3">
              {isHighRisk && (
                <div className="flex items-center space-x-2 text-xs text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>High-risk changes detected</span>
                </div>
              )}

              <Button
                onClick={onConfirm}
                variant={isHighRisk ? 'danger' : 'primary'}
                size="md"
                startIcon={<Check />}
              >
                {mode === 'preflight' ? 'Confirm & Generate' : 'Confirm & Enable Actions'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
