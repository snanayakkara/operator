import { useState, useCallback } from 'react';

type GenericValidationResult = {
  corrections: Array<{
    field: string;
    regexValue: unknown;
    correctValue: unknown;
    reason: string;
    confidence: number;
  }>;
  missingCritical: Array<{ field: string; reason: string; critical?: boolean }>;
  missingOptional: Array<{ field: string; reason: string; critical?: boolean }>;
  confidence: number;
};

interface UseValidationCheckpointOptions {
  agentType?: string;
}

interface UseValidationCheckpointReturn<TValidation extends GenericValidationResult> {
  isValidating: boolean;
  validationResult: TValidation | null;
  showValidationModal: boolean;
  userProvidedFields: Record<string, unknown>;
  handleValidationRequired: (result: TValidation) => void;
  handleValidationContinue: (fields: Record<string, unknown>) => void;
  handleValidationCancel: () => void;
  handleValidationSkip: () => void;
  getUserProvidedFields: () => Record<string, unknown> | undefined;
  clearValidationState: () => void;
}

/**
 * Generic validation checkpoint hook shared across agents.
 *
 * Manages validation modal state, captures user-provided fields,
 * and exposes lifecycle handlers for verification workflows.
 */
export const useValidationCheckpoint = <
  TValidation extends GenericValidationResult = GenericValidationResult
>(
  options: UseValidationCheckpointOptions = {}
): UseValidationCheckpointReturn<TValidation> => {
  const { agentType } = options;

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<TValidation | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [userProvidedFields, setUserProvidedFields] = useState<Record<string, unknown>>({});

  const handleValidationRequired = useCallback((result: TValidation) => {
    if (agentType) {
      console.log(`🔍 ${agentType.toUpperCase()} validation checkpoint triggered`);
    }
    setValidationResult(result);
    setShowValidationModal(true);
    setIsValidating(true);
  }, [agentType]);

  const handleValidationContinue = useCallback((fields: Record<string, unknown>) => {
    setUserProvidedFields(fields);
    setShowValidationModal(false);
    setIsValidating(false);
  }, []);

  const handleValidationCancel = useCallback(() => {
    setShowValidationModal(false);
    setValidationResult(null);
    setIsValidating(false);
    setUserProvidedFields({});
  }, []);

  const handleValidationSkip = useCallback(() => {
    if (agentType) {
      console.log(`⏭️ ${agentType.toUpperCase()} validation skipped by user`);
    }
    setShowValidationModal(false);
    setIsValidating(false);
  }, [agentType]);

  const getUserProvidedFields = useCallback(() => {
    return Object.keys(userProvidedFields).length > 0 ? userProvidedFields : undefined;
  }, [userProvidedFields]);

  const clearValidationState = useCallback(() => {
    setIsValidating(false);
    setValidationResult(null);
    setShowValidationModal(false);
    setUserProvidedFields({});
  }, []);

  return {
    isValidating,
    validationResult,
    showValidationModal,
    userProvidedFields,
    handleValidationRequired,
    handleValidationContinue,
    handleValidationCancel,
    handleValidationSkip,
    getUserProvidedFields,
    clearValidationState
  };
};
