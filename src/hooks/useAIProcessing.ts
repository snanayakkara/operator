import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentFactory } from '@/services/AgentFactory';
import { LMStudioService } from '@/services/LMStudioService';
import type { AgentType } from '@/types/medical.types';

// Custom hook for AI processing with caching and optimistic updates
export function useAIProcessing() {
  const queryClient = useQueryClient();
  const lmStudioService = LMStudioService.getInstance();

  // Transcription mutation with caching
  const transcriptionMutation = useMutation({
    mutationFn: async ({ audioBlob, signal, agentType }: { audioBlob: Blob; signal?: AbortSignal; agentType?: string }) => {
      return await lmStudioService.transcribeAudio(audioBlob, signal, agentType);
    },
    // Cache transcription results by audio blob hash
    mutationKey: ['transcription'],
    onSuccess: (data, variables) => {
      // Cache the transcription result (include agentType for different optimization routes)
      const audioKey = `transcription-${variables.audioBlob.size}-${variables.audioBlob.type}-${variables.agentType || 'default'}`;
      queryClient.setQueryData([audioKey], data);
    },
  });

  // Agent processing mutation with intelligent caching
  const processingMutation = useMutation({
    mutationFn: async ({ 
      agentType, 
      transcription, 
      context, 
      signal 
    }: { 
      agentType: AgentType; 
      transcription: string; 
      context?: any; 
      signal?: AbortSignal;
    }) => {
      return await AgentFactory.processWithAgent(agentType, transcription, context, signal);
    },
    mutationKey: ['agentProcessing'],
    onSuccess: (data, variables) => {
      // Cache agent results by content hash
      const contentKey = `agent-${variables.agentType}-${variables.transcription.slice(0, 100)}`;
      queryClient.setQueryData([contentKey], data);
    },
  });

  // Helper function to check if similar content has been processed
  const getCachedResult = (agentType: AgentType, transcription: string) => {
    const contentKey = `agent-${agentType}-${transcription.slice(0, 100)}`;
    return queryClient.getQueryData([contentKey]);
  };

  return {
    transcriptionMutation,
    processingMutation,
    getCachedResult,
    // Utility functions
    isTranscribing: transcriptionMutation.isPending,
    isProcessing: processingMutation.isPending,
    transcriptionError: transcriptionMutation.error,
    processingError: processingMutation.error,
  };
}