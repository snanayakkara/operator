import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { AgentFactory } from '@/services/AgentFactory';
import { LMStudioService } from '@/services/LMStudioService';
import { SystemToasts } from '@/utils/toastHelpers';
import type { AgentType } from '@/types/medical.types';

// Custom hook for AI processing with caching and optimistic updates
export function useAIProcessing() {
  const queryClient = useQueryClient();
  const lmStudioService = LMStudioService.getInstance();
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  // Agent processing with streaming support
  const streamingProcessingMutation = useMutation({
    mutationFn: async ({
      agentType,
      transcription,
      context,
      onToken,
      signal,
      enableStreaming = true
    }: {
      agentType: AgentType;
      transcription: string;
      context?: any;
      onToken?: (delta: string) => void;
      signal?: AbortSignal;
      enableStreaming?: boolean;
    }) => {
      if (enableStreaming && onToken) {
        // For streaming, we need to create messages and use the direct LMStudio service
        // This is a simplified approach for initial streaming support
        const systemMessage = { role: 'system' as const, content: 'You are a medical AI assistant. Provide clear, accurate medical information.' };
        const userMessage = { role: 'user' as const, content: transcription };
        const messages = [systemMessage, userMessage];

        return await lmStudioService.generateStream(messages, onToken, signal);
      } else {
        // Fallback to regular processing
        return await AgentFactory.processWithAgent(agentType, transcription, context, signal);
      }
    },
    mutationKey: ['streamingAgentProcessing']
  });

  return {
    transcriptionMutation,
    processingMutation,
    streamingProcessingMutation,
    getCachedResult,

    // Utility functions
    isTranscribing: transcriptionMutation.isPending,
    isProcessing: processingMutation.isPending || streamingProcessingMutation.isPending,
    transcriptionError: transcriptionMutation.error,
    processingError: processingMutation.error || streamingProcessingMutation.error,
    streaming,

    // Enhanced streaming methods
    async generateWithStreaming(
      agentType: AgentType,
      transcription: string,
      onToken: (delta: string) => void,
      context?: any,
      signal?: AbortSignal
    ): Promise<string> {
      const controller = new AbortController();
      const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

      abortRef.current = controller;
      setStreaming(true);

      try {
        const result = await streamingProcessingMutation.mutateAsync({
          agentType,
          transcription,
          context,
          onToken,
          signal: combinedSignal,
          enableStreaming: true
        });

        setStreaming(false);
        abortRef.current = null;

        // Ensure we return a string for streaming
        return typeof result === 'string' ? result : result.content;

      } catch (error) {
        setStreaming(false);
        abortRef.current = null;

        if (error instanceof Error && error.message.includes('cancelled')) {
          throw new Error('Streaming cancelled by user');
        }

        SystemToasts.streamingFailed();
        throw error;
      }
    },

    async processWithAgent(
      agentType: AgentType,
      transcription: string,
      context?: any,
      signal?: AbortSignal
    ) {
      return await processingMutation.mutateAsync({
        agentType,
        transcription,
        context,
        signal
      });
    },

    stopStreaming() {
      if (abortRef.current) {
        abortRef.current.abort();
        setStreaming(false);
        abortRef.current = null;
      }
    },

    // RHC validation reprocessing
    async reprocessWithUserInput(
      agentType: AgentType,
      transcription: string,
      userFields: Record<string, any>,
      context?: any,
      signal?: AbortSignal
    ) {
      // Merge user-provided fields into context
      const updatedContext = {
        ...context,
        userProvidedFields: userFields
      };

      console.log('🔄 Reprocessing with user-provided fields:', userFields);

      // Process again with updated context
      return await processingMutation.mutateAsync({
        agentType,
        transcription,
        context: updatedContext,
        signal
      });
    }
  };
}
