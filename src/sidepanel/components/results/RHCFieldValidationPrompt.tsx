import React, { useState } from 'react';
import type { RHCValidationResult, RHCFieldCorrection, RHCMissingField } from '@/types/medical.types';

interface RHCFieldValidationPromptProps {
  validation: RHCValidationResult;
  onCancel: () => void;
  onSkip: () => void;
  onContinue: (userFields: Record<string, any>) => void;
}

export const RHCFieldValidationPrompt: React.FC<RHCFieldValidationPromptProps> = ({
  validation,
  onCancel,
  onSkip,
  onContinue
}) => {
  const [userFields, setUserFields] = useState<Record<string, any>>({});
  const [acceptedCorrections, setAcceptedCorrections] = useState<Set<string>>(new Set());

  const lowConfidenceCorrections = validation.corrections.filter(c => c.confidence < 0.8);

  const handleFieldChange = (fieldPath: string, value: string) => {
    setUserFields(prev => ({
      ...prev,
      [fieldPath]: value
    }));
  };

  const handleCorrectionToggle = (correction: RHCFieldCorrection, accept: boolean) => {
    const newAccepted = new Set(acceptedCorrections);
    if (accept) {
      newAccepted.add(correction.field);
      setUserFields(prev => ({
        ...prev,
        [correction.field]: correction.correctValue
      }));
    } else {
      newAccepted.delete(correction.field);
      setUserFields(prev => {
        const updated = { ...prev };
        delete updated[correction.field];
        return updated;
      });
    }
    setAcceptedCorrections(newAccepted);
  };

  const handleContinue = () => {
    onContinue(userFields);
  };

  // Field label helper
  const getFieldLabel = (fieldPath: string): string => {
    const labels: Record<string, string> = {
      'patientData.height': 'Height (cm)',
      'patientData.weight': 'Weight (kg)',
      'patientData.haemoglobin': 'Hemoglobin (g/L)',
      'patientData.sao2': 'Arterial O₂ Saturation (%)',
      'patientData.svo2': 'Mixed Venous O₂ Saturation (%)',
      'patientData.heartRate': 'Heart Rate (bpm)',
      'cardiacOutput.thermodilution.co': 'Thermodilution CO (L/min)',
      'haemodynamicPressures.ra.mean': 'RA Mean Pressure (mmHg)',
      'haemodynamicPressures.rv.systolic': 'RV Systolic Pressure (mmHg)',
      'haemodynamicPressures.pa.mean': 'PA Mean Pressure (mmHg)',
      'haemodynamicPressures.pcwp.mean': 'PCWP Mean Pressure (mmHg)'
    };
    return labels[fieldPath] || fieldPath;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          RHC Data Validation Required
        </h2>

        {/* Critical Missing Fields */}
        {validation.missingCritical.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-600 font-medium">⚠️ Critical Missing Fields</span>
              <span className="text-xs text-gray-500">(required for Fick calculations)</span>
            </div>
            <div className="space-y-3">
              {validation.missingCritical.map((field) => (
                <div key={field.field} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    {getFieldLabel(field.field)}
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={field.reason}
                    onChange={(e) => handleFieldChange(field.field, e.target.value)}
                  />
                  <span className="text-xs text-gray-500">{field.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low-Confidence Corrections */}
        {lowConfidenceCorrections.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-600 font-medium">✏️ Suggested Corrections</span>
              <span className="text-xs text-gray-500">(please review)</span>
            </div>
            <div className="space-y-3">
              {lowConfidenceCorrections.map((correction) => (
                <div key={correction.field} className="border border-gray-200 rounded p-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {getFieldLabel(correction.field)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {correction.regexValue !== null ? (
                      <>Regex found: <strong>{correction.regexValue}</strong> → Model suggests: <strong>{correction.correctValue}</strong></>
                    ) : (
                      <>Model found: <strong>{correction.correctValue}</strong></>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{correction.reason}</div>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        acceptedCorrections.has(correction.field)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleCorrectionToggle(correction, true)}
                    >
                      Accept
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        !acceptedCorrections.has(correction.field)
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleCorrectionToggle(correction, false)}
                    >
                      Keep Original
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Missing Fields */}
        {validation.missingOptional.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-600 font-medium">ℹ️ Optional Fields</span>
              <span className="text-xs text-gray-500">(improves accuracy)</span>
            </div>
            <div className="space-y-3">
              {validation.missingOptional.map((field) => (
                <div key={field.field} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    {getFieldLabel(field.field)}
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    onChange={(e) => handleFieldChange(field.field, e.target.value)}
                  />
                  <span className="text-xs text-gray-500">{field.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm text-gray-700 bg-yellow-200 rounded hover:bg-yellow-300"
          >
            Skip & Generate Anyway
          </button>
          <button
            onClick={handleContinue}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
            disabled={validation.missingCritical.length > 0 && Object.keys(userFields).length === 0}
          >
            Validate & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
