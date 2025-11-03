import type { RHCValidationResult } from '@/types/medical.types';
import { useValidationCheckpoint } from './useValidationCheckpoint';

export const useRHCValidation = () =>
  useValidationCheckpoint<RHCValidationResult>({ agentType: 'right-heart-cath' });
