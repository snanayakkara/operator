import React, { useMemo, useState } from 'react';
import { Modal } from '../modals';
import { FormInput, FormTextarea } from '../forms';
import { Button, ButtonGroup } from '../buttons';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

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
  return path
    .split('.')
    .map(segment =>
      segment
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\b([a-z])/g, char => char.toUpperCase())
    )
    .join(' › ');
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
  const hasAnySuggestions = useMemo(() => {
    const missingWithSuggestions = [...validation.missingCritical, ...validation.missingOptional]
      .some(m => m.suggestedValue !== undefined || /suggest(ed|ion)\s*[:\-]\s*([^\s]+)/i.test(m.reason));
    const unacceptedCorrections = validation.corrections.some(c => !acceptedCorrections.has(c.field));
    return missingWithSuggestions || unacceptedCorrections;
  }, [validation.missingCritical, validation.missingOptional, validation.corrections, acceptedCorrections]);

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
    const m1 = reason.match(/suggest(?:ed|ion)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
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
  };

  const handleCorrectionToggle = (correction: ValidationCorrection, accept: boolean) => {
    setAcceptedCorrections(prev => {
      const updated = new Set(prev);
      if (accept) {
        updated.add(correction.field);
        setUserFields(existing => ({
          ...existing,
          [correction.field]: correction.correctValue
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
        <div className="flex items-center gap-3 w-full">
          {hasAnySuggestions && (
            <Button
              variant="success"
              size="md"
              onClick={handleAcceptAll}
            >
              Accept All Suggestions
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {mergedCopy.cancelLabel}
          </Button>
          {onSkip && (
            <Button
              variant="outline"
              onClick={onSkip}
            >
              {mergedCopy.skipLabel}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => onContinue(userFields)}
            disabled={validation.missingCritical.length > 0 && Object.keys(userFields).length === 0}
          >
            {mergedCopy.continueLabel}
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

        {/* Critical Missing Fields */}
        {validation.missingCritical.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span className="text-rose-600 font-medium">{mergedCopy.criticalTitle}</span>
              <span className="text-xs text-gray-500">{mergedCopy.criticalHelper}</span>
            </div>
            <div className="space-y-4">
              {validation.missingCritical.map(field => renderInput(field, true))}
            </div>
          </section>
        )}

        {/* Low-confidence corrections */}
        {lowConfidenceCorrections.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-amber-600 font-medium">{mergedCopy.suggestionsTitle}</span>
              <span className="text-xs text-gray-500">{mergedCopy.suggestionsHelper}</span>
            </div>
            <div className="space-y-3">
              {lowConfidenceCorrections.map(correction => {
                const config = fieldConfig[correction.field];
                const label = config?.label ?? formatFieldPath(correction.field);
                const isAccepted = acceptedCorrections.has(correction.field);

                return (
                  <div key={correction.field} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="text-sm font-medium text-gray-700">
                      {label}
                    </div>
                    <div className="text-sm text-gray-600">
                      {correction.regexValue !== null && correction.regexValue !== undefined ? (
                        <>Regex found: <strong>{String(correction.regexValue)}</strong> → Suggested: <strong>{String(correction.correctValue)}</strong></>
                      ) : (
                        <>Suggested: <strong>{String(correction.correctValue)}</strong></>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {correction.reason}
                    </div>
                    <ButtonGroup spacing="sm">
                      <Button
                        variant={isAccepted ? 'success' : 'outline'}
                        size="sm"
                        onClick={() => handleCorrectionToggle(correction, true)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant={!isAccepted ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleCorrectionToggle(correction, false)}
                      >
                        Keep Original
                      </Button>
                    </ButtonGroup>
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
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-medium">{mergedCopy.optionalTitle}</span>
              <span className="text-xs text-gray-500">{mergedCopy.optionalHelper}</span>
            </div>
            <div className="space-y-4">
              {validation.missingOptional.map(field => renderInput(field, false))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
