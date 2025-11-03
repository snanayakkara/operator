import { useState, useCallback } from 'react';
import type { RHCValidationResult } from '@/types/medical.types';

interface UseRHCValidationReturn {
  isValidating: boolean;
  validationResult: RHCValidationResult | null;
  showValidationModal: boolean;
  handleValidationRequired: (result: RHCValidationResult) => void;
  handleValidationContinue: (userFields: Record<string, any>) => void;
  handleValidationCancel: () => void;
  handleValidationSkip: () => void;
  getUserProvidedFields: () => Record<string, any> | undefined;
  clearValidationState: () => void;
}

export const useRHCValidation = (): UseRHCValidationReturn => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<RHCValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [userProvidedFields, setUserProvidedFields] = useState<Record<string, any>>({});

  const handleValidationRequired = useCallback((result: RHCValidationResult) => {
    setValidationResult(result);
    setShowValidationModal(true);
    setIsValidating(true);
  }, []);

  const handleValidationContinue = useCallback((fields: Record<string, any>) => {
    setUserProvidedFields(fields);
    setShowValidationModal(false);
    setIsValidating(false);
    // Caller should re-run processing with fields
  }, []);

  const handleValidationCancel = useCallback(() => {
    setShowValidationModal(false);
    setValidationResult(null);
    setIsValidating(false);
    setUserProvidedFields({});
  }, []);

  const handleValidationSkip = useCallback(() => {
    setShowValidationModal(false);
    setIsValidating(false);
    // Caller should proceed with incomplete data
  }, []);

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
    handleValidationRequired,
    handleValidationContinue,
    handleValidationCancel,
    handleValidationSkip,
    getUserProvidedFields,
    clearValidationState
  };
};
