import React, { useMemo, useState } from 'react';

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

    if (inputType === 'textarea') {
      return (
        <div key={field.field} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
          <textarea
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
            rows={3}
            onChange={(event) => handleFieldChange(field.field, event.target.value)}
          />
          <span className="text-xs text-gray-500">{helperText}</span>
        </div>
      );
    }

    return (
      <div key={field.field} className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          type={inputType}
          step="any"
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          onChange={(event) => handleFieldChange(field.field, event.target.value)}
        />
        <span className="text-xs text-gray-500">{helperText}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {mergedCopy.heading}
          </h2>
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
              <span className="text-red-600 font-medium">⚠️ {mergedCopy.criticalTitle}</span>
              <span className="text-xs text-gray-500">{mergedCopy.criticalHelper}</span>
            </div>
            <div className="space-y-3">
              {validation.missingCritical.map(field => renderInput(field, true))}
            </div>
          </section>
        )}

        {/* Low-confidence corrections */}
        {lowConfidenceCorrections.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 font-medium">✏️ {mergedCopy.suggestionsTitle}</span>
              <span className="text-xs text-gray-500">{mergedCopy.suggestionsHelper}</span>
            </div>
            <div className="space-y-3">
              {lowConfidenceCorrections.map(correction => {
                const config = fieldConfig[correction.field];
                const label = config?.label ?? formatFieldPath(correction.field);

                return (
                  <div key={correction.field} className="border border-gray-200 rounded p-3 space-y-2">
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
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          acceptedCorrections.has(correction.field)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => handleCorrectionToggle(correction, true)}
                      >
                        Accept
                      </button>
                      <button
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          !acceptedCorrections.has(correction.field)
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => handleCorrectionToggle(correction, false)}
                      >
                        Keep Original
                      </button>
                    </div>
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
              <span className="text-blue-600 font-medium">ℹ️ {mergedCopy.optionalTitle}</span>
              <span className="text-xs text-gray-500">{mergedCopy.optionalHelper}</span>
            </div>
            <div className="space-y-3">
              {validation.missingOptional.map(field => renderInput(field, false))}
            </div>
          </section>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            {mergedCopy.cancelLabel}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-gray-700 bg-yellow-200 rounded hover:bg-yellow-300"
            >
              {mergedCopy.skipLabel}
            </button>
          )}
          <button
            onClick={() => onContinue(userFields)}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={validation.missingCritical.length > 0 && Object.keys(userFields).length === 0}
          >
            {mergedCopy.continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

