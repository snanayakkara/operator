import React, { useMemo, useState } from 'react';
import { Modal } from '../modals';
import { FormInput, FormTextarea } from '../forms';
import { Button } from '../buttons';
import { AlertCircle, Info, AlertTriangle, Edit3, Check, Brain, ChevronDown, ChevronRight } from 'lucide-react';

type ValidationCorrection = {
  field: string;
  regexValue: unknown;
  correctValue: unknown;
  reason: string;
  confidence: number;
};

type ValidationMissingField = {
  field: string;
  reason: string;
  critical?: boolean;
  // Optional suggested value from validator; if present, allow one-click accept
  suggestedValue?: unknown;
};

export interface ValidationPromptData {
  corrections: ValidationCorrection[];
  missingCritical: ValidationMissingField[];
  missingOptional: ValidationMissingField[];
  confidence: number;
  modelReasoning?: string; // Optional raw reasoning from LLM
}

export interface FieldDisplayConfig {
  label?: string;
  inputType?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  helperText?: string;
}

export interface ValidationPromptCopy {
  heading?: string;
  description?: string;
  confidenceLabel?: string;
  criticalTitle?: string;
  criticalHelper?: string;
  optionalTitle?: string;
  optionalHelper?: string;
  suggestionsTitle?: string;
  suggestionsHelper?: string;
  cancelLabel?: string;
  skipLabel?: string;
  continueLabel?: string;
}

interface FieldValidationPromptProps<TValidation extends ValidationPromptData> {
  agentLabel: string;
  validation: TValidation;
  onCancel: () => void;
  onContinue: (userFields: Record<string, unknown>) => void;
  onSkip?: () => void;
  fieldConfig?: Record<string, FieldDisplayConfig>;
  copy?: ValidationPromptCopy;
  autoConfidenceThreshold?: number;
}

const DEFAULT_COPY: Required<Pick<ValidationPromptCopy,
  'confidenceLabel' | 'criticalTitle' | 'criticalHelper' | 'optionalTitle' | 'optionalHelper' | 'suggestionsTitle' | 'suggestionsHelper' | 'cancelLabel' | 'skipLabel' | 'continueLabel'
>> = {
  confidenceLabel: 'Validation confidence',
  criticalTitle: 'Critical Missing Fields',
  criticalHelper: 'These fields are required before continuing.',
  optionalTitle: 'Optional Fields',
  optionalHelper: 'Adding these values improves documentation quality.',
  suggestionsTitle: 'Suggested Corrections',
  suggestionsHelper: 'Review low-confidence corrections from the quick model.',
  cancelLabel: 'Cancel',
  skipLabel: 'Skip & Generate Anyway',
  continueLabel: 'Validate & Continue'
};

const formatFieldPath = (path: string): string => {
  // Only use the last segment of the path (the actual field name)
  const segments = path.split('.');
  const lastSegment = segments[segments.length - 1];
  return lastSegment
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b([a-z])/g, char => char.toUpperCase());
};

/**
 * Format a value for display with reasonable decimal places
 * Prevents showing values like "44.811753902663" - limits to 2 decimal places
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'none';
  if (typeof value === 'number') {
    // Round to 2 decimal places for display
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  // For strings that look like numbers with many decimals, format them
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num) && value.includes('.') && value.split('.')[1]?.length > 2) {
      return num.toFixed(2);
    }
  }
  return String(value);
};

export const FieldValidationPrompt = <TValidation extends ValidationPromptData>({
  agentLabel,
  validation,
  onCancel,
  onContinue,
  onSkip,
  fieldConfig = {},
  copy = {},
  autoConfidenceThreshold = 0.8
}: FieldValidationPromptProps<TValidation>) => {
  const [userFields, setUserFields] = useState<Record<string, unknown>>({});
  const [acceptedCorrections, setAcceptedCorrections] = useState<Set<string>>(new Set());
  // Track which corrections are being edited by the user
  const [editingCorrections, setEditingCorrections] = useState<Set<string>>(new Set());
  // Track user-edited values for corrections (separate from accepted corrections)
  const [editedCorrectionValues, setEditedCorrectionValues] = useState<Record<string, string>>({});
  // Toggle for showing model reasoning
  const [showReasoning, setShowReasoning] = useState(false);

  const mergedCopy = useMemo(() => ({
    heading: copy.heading ?? `${agentLabel} Validation Required`,
    description: copy.description,
    confidenceLabel: copy.confidenceLabel ?? DEFAULT_COPY.confidenceLabel,
    criticalTitle: copy.criticalTitle ?? DEFAULT_COPY.criticalTitle,
    criticalHelper: copy.criticalHelper ?? DEFAULT_COPY.criticalHelper,
    optionalTitle: copy.optionalTitle ?? DEFAULT_COPY.optionalTitle,
    optionalHelper: copy.optionalHelper ?? DEFAULT_COPY.optionalHelper,
    suggestionsTitle: copy.suggestionsTitle ?? DEFAULT_COPY.suggestionsTitle,
    suggestionsHelper: copy.suggestionsHelper ?? DEFAULT_COPY.suggestionsHelper,
    cancelLabel: copy.cancelLabel ?? DEFAULT_COPY.cancelLabel,
    skipLabel: copy.skipLabel ?? DEFAULT_COPY.skipLabel,
    continueLabel: copy.continueLabel ?? DEFAULT_COPY.continueLabel
  }), [agentLabel, copy]);

  const lowConfidenceCorrections = useMemo(
    () => validation.corrections.filter(correction => correction.confidence < autoConfidenceThreshold),
    [validation.corrections, autoConfidenceThreshold]
  );

  const handleFieldChange = (fieldPath: string, value: unknown) => {
    setUserFields(prev => ({
      ...prev,
      [fieldPath]: value
    }));
  };

  // Parse a suggested value out of reason text if validator didn't provide structured value
  const parseSuggestedFromReason = (reason: string): unknown => {
    // Try to find a number (int or float) after words like "suggested" or in parentheses
    const m1 = reason.match(/suggest(?:ed|ion)?\s*[:-]?\s*(\d+(?:\.\d+)?)/i);
    if (m1) return Number(m1[1]);
    const m2 = reason.match(/\((\d+(?:\.\d+)?)\)/);
    if (m2) return Number(m2[1]);
    // Fallback: plain number anywhere
    const m3 = reason.match(/(\d+(?:\.\d+)?)/);
    if (m3) return Number(m3[1]);
    return undefined;
  };

  const getSuggestedValue = (field: ValidationMissingField): unknown => {
    if (field.suggestedValue !== undefined) return field.suggestedValue;
    return parseSuggestedFromReason(field.reason);
  };

  const acceptMissingFieldSuggestion = (field: ValidationMissingField) => {
    const value = getSuggestedValue(field);
    if (value !== undefined) {
      handleFieldChange(field.field, value);
    }
  };

  const handleAcceptAll = () => {
    const nextAccepted = new Set<string>(acceptedCorrections);
    const nextFields: Record<string, unknown> = { ...userFields };

    // Accept all low-confidence corrections
    for (const c of lowConfidenceCorrections) {
      nextAccepted.add(c.field);
      nextFields[c.field] = c.correctValue;
    }

    // Accept suggestions for missing fields when we can parse a suggested value
    for (const m of [...validation.missingCritical, ...validation.missingOptional]) {
      const suggestion = getSuggestedValue(m);
      if (suggestion !== undefined) {
        nextFields[m.field] = suggestion;
      }
    }

    setAcceptedCorrections(nextAccepted);
    setUserFields(nextFields);
    
    // Immediately continue with the collected fields
    onContinue(nextFields);
  };

  const handleCorrectionToggle = (correction: ValidationCorrection, accept: boolean) => {
    // Clear editing state when accepting/rejecting
    setEditingCorrections(prev => {
      const updated = new Set(prev);
      updated.delete(correction.field);
      return updated;
    });
    
    setAcceptedCorrections(prev => {
      const updated = new Set(prev);
      if (accept) {
        updated.add(correction.field);
        // Use edited value if available, otherwise use suggested correction
        const valueToUse = editedCorrectionValues[correction.field] ?? correction.correctValue;
        setUserFields(existing => ({
          ...existing,
          [correction.field]: valueToUse
        }));
      } else {
        updated.delete(correction.field);
        setUserFields(existing => {
          const next = { ...existing };
          delete next[correction.field];
          return next;
        });
      }
      return updated;
    });
  };

  // Toggle editing mode for a correction field
  const handleStartEditing = (correction: ValidationCorrection) => {
    setEditingCorrections(prev => {
      const updated = new Set(prev);
      updated.add(correction.field);
      return updated;
    });
    // Initialize with the current best value (edited, suggested, or original)
    const currentValue = editedCorrectionValues[correction.field] 
      ?? String(correction.correctValue ?? correction.regexValue ?? '');
    setEditedCorrectionValues(prev => ({
      ...prev,
      [correction.field]: currentValue
    }));
  };

  // Apply the user's edited value
  const handleApplyEdit = (correction: ValidationCorrection) => {
    const editedValue = editedCorrectionValues[correction.field];
    if (editedValue !== undefined) {
      setAcceptedCorrections(prev => {
        const updated = new Set(prev);
        updated.add(correction.field);
        return updated;
      });
      setUserFields(existing => ({
        ...existing,
        [correction.field]: editedValue
      }));
    }
    setEditingCorrections(prev => {
      const updated = new Set(prev);
      updated.delete(correction.field);
      return updated;
    });
  };

  const renderInput = (field: ValidationMissingField, isCritical: boolean) => {
    const config = fieldConfig[field.field];
    const label = config?.label ?? formatFieldPath(field.field);
    const inputType = config?.inputType ?? 'text';
    const placeholder = config?.placeholder ?? (isCritical ? field.reason : 'Optional');
    const helperText = config?.helperText ?? field.reason;
    const suggestion = getSuggestedValue(field);

    if (inputType === 'textarea') {
      return (
        <div key={field.field} className="space-y-2">
          <FormTextarea
            label={label}
            placeholder={placeholder}
            rows={3}
            helperText={helperText}
            onChange={(event) => handleFieldChange(field.field, event.target.value)}
          />
          {suggestion !== undefined && (
            <Button
              variant="success"
              size="sm"
              onClick={() => acceptMissingFieldSuggestion(field)}
            >
              Accept {String(suggestion)}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div key={field.field} className="space-y-2">
        <FormInput
          label={label}
          type={inputType}
          step="any"
          placeholder={placeholder}
          helperText={helperText}
          onChange={(event) => handleFieldChange(field.field, event.target.value)}
        />
        {suggestion !== undefined && (
          <Button
            variant="success"
            size="sm"
            onClick={() => acceptMissingFieldSuggestion(field)}
          >
            Accept {String(suggestion)}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      size="lg"
      title={mergedCopy.heading}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {onSkip && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={onSkip}
            >
              Skip
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            size="sm"
            className="text-xs"
            onClick={handleAcceptAll}
          >
            Save & Continue
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Description and confidence */}
        <div className="space-y-2">
          {mergedCopy.description && (
            <p className="text-sm text-gray-600">
              {mergedCopy.description}
            </p>
          )}
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {mergedCopy.confidenceLabel}: <span className="font-semibold text-gray-800">{Math.round(validation.confidence * 100)}%</span>
          </div>
        </div>

        {/* Model Reasoning Toggle (if available) */}
        {validation.modelReasoning && (
          <section className="border border-purple-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
            >
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Model Reasoning</span>
              {showReasoning ? (
                <ChevronDown className="w-4 h-4 text-purple-500 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 text-purple-500 ml-auto" />
              )}
            </button>
            {showReasoning && (
              <div className="p-4 bg-purple-50/50">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {validation.modelReasoning}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Critical Missing Fields */}
        {validation.missingCritical.length > 0 && (
          <section className="bg-rose-50/50 border border-rose-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span className="text-rose-700 font-semibold">{mergedCopy.criticalTitle}</span>
            </div>
            <p className="text-xs text-rose-600">{mergedCopy.criticalHelper}</p>
            <div className="space-y-4">
              {validation.missingCritical.map(field => renderInput(field, true))}
            </div>
          </section>
        )}

        {/* Low-confidence corrections */}
        {lowConfidenceCorrections.length > 0 && (
          <section className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-amber-700 font-semibold">{mergedCopy.suggestionsTitle}</span>
            </div>
            <p className="text-xs text-amber-600">{mergedCopy.suggestionsHelper}</p>
            <div className="space-y-3">
              {lowConfidenceCorrections.map(correction => {
                const config = fieldConfig[correction.field];
                const label = config?.label ?? formatFieldPath(correction.field);
                const isAccepted = acceptedCorrections.has(correction.field);
                const isEditing = editingCorrections.has(correction.field);
                const inputType = config?.inputType ?? 'text';

                return (
                  <div key={correction.field} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="text-sm font-medium text-gray-700">
                      {label}
                    </div>
                    
                    {/* Show edit input when in editing mode */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Original: <span className="font-mono bg-gray-100 px-1 rounded">{String(correction.regexValue ?? 'none')}</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type={inputType}
                            value={editedCorrectionValues[correction.field] ?? ''}
                            onChange={(e) => setEditedCorrectionValues(prev => ({
                              ...prev,
                              [correction.field]: e.target.value
                            }))}
                            placeholder={config?.placeholder ?? 'Enter corrected value'}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApplyEdit(correction)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                        {config?.helperText && (
                          <div className="text-xs text-gray-400">{config.helperText}</div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-gray-600">
                          {correction.regexValue !== null && correction.regexValue !== undefined ? (
                            <>Transcription: <strong className="font-mono bg-amber-50 px-1 rounded">{formatValue(correction.regexValue)}</strong> → Suggested: <strong className="font-mono bg-green-50 px-1 rounded">{formatValue(correction.correctValue)}</strong></>
                          ) : (
                            <>Suggested: <strong className="font-mono bg-green-50 px-1 rounded">{formatValue(correction.correctValue)}</strong></>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {correction.reason}
                        </div>
                      </>
                    )}
                    
                    {!isEditing && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={isAccepted ? 'success' : 'outline'}
                          size="xs"
                          className="text-xs px-2 py-1"
                          onClick={() => handleCorrectionToggle(correction, true)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant={!isAccepted ? 'primary' : 'outline'}
                          size="xs"
                          className="text-xs px-2 py-1"
                          onClick={() => handleCorrectionToggle(correction, false)}
                        >
                          Keep
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="text-xs px-2 py-1"
                          onClick={() => handleStartEditing(correction)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Confidence: {(correction.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Optional missing fields */}
        {validation.missingOptional.length > 0 && (
          <section className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-blue-700 font-semibold">{mergedCopy.optionalTitle}</span>
            </div>
            <p className="text-xs text-blue-600">{mergedCopy.optionalHelper}</p>
            <div className="space-y-4">
              {validation.missingOptional.map(field => renderInput(field, false))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
