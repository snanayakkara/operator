/**
 * OptimizedApp.tsx - Main Application Component with Audio Device Support
 * 
 * Comprehensive medical dictation application with AI-powered transcription,
 * specialized medical agents, EMR integration, and device management.
 * Optimized for performance with useReducer state management and React.memo.
 */

import React, { useEffect, useCallback, useRef, memo, startTransition, useState, useMemo } from 'react';
import './styles/globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AudioDeviceProvider, useAudioDeviceContext } from '@/contexts/AudioDeviceContext';
import { OptimizedResultsPanel } from './components/results/OptimizedResultsPanel';
import { TranscriptionSection } from './components/results/TranscriptionSection';
import { QuickActions } from './components/QuickActions';
import { AIReviewSection } from './components/AIReviewSection';
import { StatusIndicator } from './components/StatusIndicator';
import { ToastContainer } from './components/ToastContainer';
import { PatientSelectionModal } from './components/PatientSelectionModal';
import { PatientEducationConfigCard } from './components/PatientEducationConfigCard';
import { UnifiedPipelineProgress } from './components/UnifiedPipelineProgress';
import { RecordingPromptCard } from './components/RecordingPromptCard';
import { hasRecordingPrompt } from '@/config/recordingPrompts';
import { MetricsDashboard } from './components/MetricsDashboard';
import { LiveAudioVisualizer } from './components/LiveAudioVisualizer';
import { ScreenshotAnnotationModal } from './components/ScreenshotAnnotationModal';
import { PatientMismatchConfirmationModal } from './components/PatientMismatchConfirmationModal';
import { BPDiaryImporter } from './components/BPDiaryImporter';
import { OptimizationPanel } from '../components/settings/OptimizationPanel';
import { useAppState } from '@/hooks/useAppState';
import { NotificationService } from '@/services/NotificationService';
import { LMStudioService, MODEL_CONFIG, streamChatCompletion } from '@/services/LMStudioService';
import { WhisperServerService } from '@/services/WhisperServerService';
import { BatchAIReviewOrchestrator } from '@/orchestrators/BatchAIReviewOrchestrator';
import { getTargetField, getFieldDisplayName, supportsFieldSpecificInsertion } from '@/config/insertionConfig';
import { patientNameValidator } from '@/utils/PatientNameValidator';
import { AgentType, PatientSession, PatientInfo, FailedAudioRecording, BatchAIReviewInput as _BatchAIReviewInput, ProcessingStatus } from '@/types/medical.types';
import type { TranscriptionApprovalStatus } from '@/types/optimization';
import { PerformanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { useRecorder } from '@/hooks/useRecorder';
import { ToastService } from '@/services/ToastService';
import { RecordingToasts } from '@/utils/toastHelpers';
import { logger } from '@/utils/Logger';
import { extractQuickLetterSummary, parseQuickLetterStructuredResponse } from '@/utils/QuickLetterSummaryExtractor';
import { ASRCorrectionsLog } from '@/services/ASRCorrectionsLog';

const OptimizedApp: React.FC = memo(() => {
  return (
    <QueryProvider>
      <AudioDeviceProvider>
        <OptimizedAppContent />
      </AudioDeviceProvider>
    </QueryProvider>
  );
});

const OptimizedAppContent: React.FC = memo(() => {
  // Use optimized state management
  const { state, actions, selectors } = useAppState();
  const audioDeviceContext = useAudioDeviceContext();
  const overlayState = {
    patientEducation: selectors.isOverlayActive('patient-education'),
    patientSelection: selectors.isOverlayActive('patient-selection'),
    screenshotAnnotation: selectors.isOverlayActive('screenshot-annotation'),
    bpDiaryImporter: selectors.isOverlayActive('bp-diary-importer'),
    patientMismatch: selectors.isOverlayActive('patient-mismatch')
  };
  const metricsDashboardOpen = selectors.isSidePanelOpen('metrics-dashboard');
  const activeWorkflowRef = useRef<AgentType | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  
  // Store current audio blob for failed transcription storage
  const currentAudioBlobRef = useRef<Blob | null>(null);
  const currentRecordingTimeRef = useRef<number>(0);

  // AbortController refs for cancellation
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const processingAbortRef = useRef<AbortController | null>(null);

  // Timeout ref for progress indicator cleanup
  const progressCleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable service instances using useRef to prevent re-creation on renders
  const lmStudioService = useRef(LMStudioService.getInstance()).current;
  const whisperServerService = useRef(WhisperServerService.getInstance()).current;
  const batchOrchestrator = useRef<BatchAIReviewOrchestrator | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Forward declare recorder hooks callbacks to avoid circular dependencies
  const handleRecordingCompleteRef = useRef<((audioBlob: Blob) => Promise<void>) | null>(null);
  const handleVoiceActivityUpdateRef = useRef<((level: number, frequencyData: number[]) => void) | null>(null);

  // Initialize recorder BEFORE using it in memoized values
  const recorder = useRecorder({
    onRecordingComplete: (audioBlob: Blob) => {
      if (handleRecordingCompleteRef.current) {
        return handleRecordingCompleteRef.current(audioBlob);
      }
    },
    onVoiceActivityUpdate: (level: number, frequencyData: number[]) => {
      if (handleVoiceActivityUpdateRef.current) {
        handleVoiceActivityUpdateRef.current(level, frequencyData);
      }
    },
    onRecordingTimeUpdate: useCallback((time: number) => {
      currentRecordingTimeRef.current = time;
    }, []),
    onError: useCallback((error: Error) => {
      console.error('🎤 Recording error:', error);

      // Clean up the failed session
      const currentSessionId = currentSessionIdRef.current || state.currentSessionId;
      if (currentSessionId) {
        console.log('🧹 Cleaning up failed recording session:', currentSessionId);
        actions.removePatientSession(currentSessionId);
        actions.setCurrentSessionId(null);
        currentSessionIdRef.current = null;
      }

      // Reset workflow state
      actions.setActiveWorkflow(null);
      activeWorkflowRef.current = null;
      actions.setUIMode('idle', { sessionId: null, origin: 'auto' });

      // Show user-friendly error message
      const errorMessage = error.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access to record.'
        : `Recording failed: ${error.message}`;

      actions.setErrors([errorMessage]);

      // Clear any processing state
      actions.setProcessing(false);
      actions.setProcessingStatus('idle');
    }, [actions, state.currentSessionId]),
    getMicrophoneId: () => audioDeviceContext.selectedMicrophoneId
  });

  // Session isolation - prevent UI context switches during recordings
  const stableSelectedSessionId = useMemo(() => {
    // If currently recording, keep the existing selected session to prevent UI context switches
    if (recorder.isRecording || currentSessionIdRef.current !== null) {
      return state.selectedSessionId;
    }
    return state.selectedSessionId;
  }, [state.selectedSessionId, recorder.isRecording]);

  const stableSelectedPatientName = useMemo(() => {
    if (!stableSelectedSessionId) return undefined;
    const session = state.patientSessions.find(s => s.id === stableSelectedSessionId);
    return session?.patient?.name;
  }, [stableSelectedSessionId, state.patientSessions]);

  // Streaming control
  const stopStreaming = useCallback(() => {
    if (processingAbortRef.current) {
      processingAbortRef.current.abort();
      processingAbortRef.current = null;
    }
    actions.streamCancelled();
    actions.setStreaming(false);
    // Clear any partial AI summary when cancelling
    actions.setAiGeneratedSummary(undefined);
  }, [actions]);

  const getSystemPromptForAgent = useCallback(async (agent: AgentType): Promise<string | null> => {
    try {
      // Use the centralized SystemPromptLoader for all agents
      const { systemPromptLoader } = await import('@/services/SystemPromptLoader');
      return await systemPromptLoader.loadSystemPrompt(agent, 'primary');
    } catch (error) {
      console.error('Failed to load system prompt for agent:', agent, error);
      return null;
    }
  }, []);

  // Legacy method for specific agent handling if needed
  const _getLegacySystemPromptForAgent = useCallback(async (agent: AgentType): Promise<string | null> => {
    try {
      switch (agent) {
        case 'quick-letter': {
          const mod = await import('@/agents/specialized/QuickLetterSystemPrompts');
          return mod.QUICK_LETTER_SYSTEM_PROMPTS.primary;
        }
        case 'investigation-summary': {
          const mod = await import('@/agents/specialized/InvestigationSummarySystemPrompts');
          return mod.INVESTIGATION_SUMMARY_SYSTEM_PROMPTS.primary;
        }
        case 'background': {
          const mod = await import('@/agents/specialized/BackgroundSystemPrompts');
          return mod.BACKGROUND_SYSTEM_PROMPTS.primary;
        }
        case 'medication': {
          const mod = await import('@/agents/specialized/MedicationSystemPrompts');
          return mod.MEDICATION_SYSTEM_PROMPTS.primary;
        }
        case 'bloods': {
          const mod = await import('@/agents/specialized/BloodsSystemPrompts');
          return mod.BLOODS_SYSTEM_PROMPTS.primary;
        }
        case 'imaging': {
          const mod = await import('@/agents/specialized/ImagingSystemPrompts');
          return mod.IMAGING_SYSTEM_PROMPTS.primary;
        }
        default:
          return null;
      }
    } catch (e) {
      console.warn('Failed to load system prompt for agent', agent, e);
      return null;
    }
  }, []);

  const getModelAndTokens = (agent: AgentType): { model: string; maxTokens: number } => {
    switch (agent) {
      case 'investigation-summary':
        return { model: MODEL_CONFIG.QUICK_MODEL, maxTokens: 2000 };
      case 'background':
        return { model: MODEL_CONFIG.QUICK_MODEL, maxTokens: 2000 };
      case 'medication':
        return { model: MODEL_CONFIG.QUICK_MODEL, maxTokens: 3000 };
      case 'quick-letter':
        return { model: MODEL_CONFIG.REASONING_MODEL, maxTokens: 5000 };
      default:
        return { model: MODEL_CONFIG.REASONING_MODEL, maxTokens: 4000 };
    }
  };

  const startStreamingGeneration = useCallback(async (sessionId: string, agent: AgentType, input: string) => {
    const systemPrompt = await getSystemPromptForAgent(agent);
    if (!systemPrompt) {
      return false;
    }
    actions.clearStream();
    actions.setStreaming(true);
    actions.setProcessingStatus('processing');
    const controller = new AbortController();
    processingAbortRef.current = controller;
    const { model, maxTokens } = getModelAndTokens(agent);
    let ttftMs: number | null = null;
    const t0 = performance.now();
    await streamChatCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input }
      ],
      temperature: 0.3,
      maxTokens,
      signal: controller.signal,
      onMessage: (json) => {
        if (ttftMs == null && json?.choices?.[0]?.delta?.content) {
          ttftMs = Math.round(performance.now() - t0);
          actions.setTTFT(ttftMs);
        }
      },
      onToken: (t) => {
        actions.appendStreamChunk(t);
      },
      onEnd: (final, usage) => {
        // Extract summary and letter content for QuickLetter agents to enable dual-card display
        let extractedSummary: string | undefined = undefined;
        let letterContent: string = final; // Default to full content for non-QuickLetter agents
        
        if (agent === 'quick-letter') {
          try {
            const parsed = parseQuickLetterStructuredResponse(final);
            extractedSummary = parsed.summary;
            letterContent = parsed.letterContent;
            console.log('📋 Parsed QuickLetter streaming output:');
            console.log('   Summary:', extractedSummary.substring(0, 100) + '...');
            console.log('   Letter content length:', letterContent.length);
          } catch (error) {
            console.warn('⚠️ Failed to parse QuickLetter output:', error);
            // Fallback to original extraction method
            extractedSummary = extractQuickLetterSummary(final);
            letterContent = final;
          }
        }
        
        // Use parsed letter content for results, not full output
        actions.streamDone(letterContent, usage, ttftMs);
        // Set the AI-generated summary for QuickLetter dual-card display
        if (extractedSummary) {
          actions.setAiGeneratedSummary(extractedSummary);
        }

        // Detect missing information for QuickLetter during streaming completion
        if (agent === 'quick-letter') {
          console.log('🔍 Streaming completion: detecting missing information for QuickLetter');
          // Use a simple async function to detect missing info without blocking UI
          (async () => {
            try {
              // Import QuickLetterAgent for missing info detection
              const { QuickLetterAgent } = await import('@/agents/specialized/QuickLetterAgent');
              const _quickLetterAgent = new QuickLetterAgent();
              // Call the missing info detection method directly (we need to make it public or create a wrapper)
              // For now, use a basic fallback detection
              const text = input.toLowerCase();
              const missing = {
                letter_type: 'general',
                missing_purpose: [] as string[],
                missing_clinical: [] as string[],
                missing_recommendations: [] as string[],
                completeness_score: "80%"
              };

              // Basic missing information detection logic (simplified version of QuickLetterAgent's fallback)
              if (!text.includes('refer') && !text.includes('follow up') && !text.includes('consultation') && 
                  !text.includes('thank you')) {
                missing.missing_purpose.push('Letter purpose or reason for correspondence');
              }

              if (!text.includes('patient') && !text.includes('gentleman') && !text.includes('lady') && 
                  !text.includes('year old') && !text.includes('age')) {
                missing.missing_clinical.push('Patient demographics or context');
              }

              if (!text.includes('examination') && !text.includes('found') && !text.includes('shows') &&
                  !text.includes('revealed') && !text.includes('noted') && text.length > 100) {
                missing.missing_clinical.push('Clinical examination findings');
              }

              // Only set missing info if there are actually missing items
              const totalMissing = missing.missing_purpose.length + missing.missing_clinical.length + missing.missing_recommendations.length;
              if (totalMissing > 0) {
                console.log('📊 Setting missing information from streaming completion:', totalMissing, 'items');
                actions.setMissingInfo(missing);
              } else {
                console.log('✅ No missing information detected during streaming completion');
                actions.setMissingInfo(null);
              }
            } catch (error) {
              console.warn('⚠️ Failed to detect missing information during streaming:', error);
            }
          })();
        }

        // Use atomic completion to prevent UI state race conditions
        console.log('🏁 Workflow Completion: Using atomic completion for streaming results');
        console.log('🏁 State Check: Before atomic completion - Processing:', state.isProcessing, 'Status:', state.processingStatus, 'Streaming:', state.streaming);

        try {
          // Preserve agent type for field-specific EMR insertion before atomic completion
          console.log('🔧 PRESERVING AGENT TYPE (streaming path):', agent, 'for session:', sessionId);
          actions.setCurrentAgent(agent);

          actions.completeProcessingAtomic(sessionId, letterContent, extractedSummary);
          console.log('🏁 Workflow Completion: Atomic completion done for streaming workflow');

          // Defensive check: ensure UI is actually ready after completion
          setTimeout(() => {
            if (state.streaming || state.currentSessionId !== null) {
              console.warn('🚨 UI still showing active state after completion - forcing ready state');
              actions.forceUIReadyState();
            }
          }, 1000);
        } catch (error) {
          console.error('❌ Atomic completion failed for streaming workflow:', error);
          actions.forceUIReadyState(); // Fallback to ensure UI is ready
        }

        processingAbortRef.current = null;
        actions.updatePatientSession(sessionId, {
          results: letterContent, // Store only letter content in results
          summary: extractedSummary, // Store summary separately
          status: 'completed',
          completed: true,
          completedTime: Date.now(),
          // Set progress to 100% briefly for smooth completion transition
          processingProgress: {
            phase: 'Complete',
            progress: 100,
            details: 'Streaming finished'
          }
        });

        // Clear progress indicator after fade-out animation (300ms)
        // Clear any existing timeout to prevent race conditions
        if (progressCleanupTimeoutRef.current) {
          clearTimeout(progressCleanupTimeoutRef.current);
        }
        progressCleanupTimeoutRef.current = setTimeout(() => {
          actions.updatePatientSession(sessionId, {
            processingProgress: undefined
          });
          progressCleanupTimeoutRef.current = null;
        }, 300);
      },
      onError: (err) => {
        if (err.name === 'AbortError') {
          actions.streamCancelled();
        } else {
          actions.streamError(String(err));
        }
        actions.setStreaming(false);
        // Clear any partial AI summary on error
        actions.setAiGeneratedSummary(undefined);
        processingAbortRef.current = null;
      }
    });
    return true;
  }, [actions, getSystemPromptForAgent]);
  
  // Optimization panel state
  const [isOptimizationPanelOpen, setIsOptimizationPanelOpen] = useState(false);
  
  // Initialize BatchAIReviewOrchestrator only once using lazy initialization
  const _getBatchOrchestrator = useCallback(() => {
    if (!batchOrchestrator.current) {
      batchOrchestrator.current = new BatchAIReviewOrchestrator();
    }
    return batchOrchestrator.current;
  }, []);

  // Store failed audio recording for troubleshooting (non-blocking)
  const storeFailedAudioRecording = useCallback((
    audioBlob: Blob, 
    agentType: AgentType, 
    errorMessage: string, 
    transcriptionAttempt?: string,
    recordingTime?: number
  ) => {
    // Make failed recording storage non-blocking to prevent UI freeze
    const performStorage = () => {
      const failedRecording: FailedAudioRecording = {
        id: `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        audioBlob,
        timestamp: Date.now(),
        agentType,
        errorMessage,
        transcriptionAttempt,
        metadata: {
          duration: recordingTime || currentRecordingTimeRef.current || 0,
          fileSize: audioBlob.size,
          recordingTime: recordingTime || currentRecordingTimeRef.current || 0
        }
      };

      actions.setFailedRecordings([failedRecording, ...state.failedAudioRecordings.slice(0, 4)]);

      // Reduce console logging during error states for better performance
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Stored failed audio recording:', {
          id: failedRecording.id,
          agentType,
          errorMessage: errorMessage.substring(0, 100), // Truncate long error messages
          fileSize: audioBlob.size
        });
      }
    };

    // Use requestIdleCallback for non-blocking storage, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(performStorage, { timeout: 1000 });
    } else {
      setTimeout(performStorage, 0);
    }
  }, [actions, state.failedAudioRecordings]);

  // Clear failed recordings
  const _clearFailedRecordings = useCallback(() => {
    actions.setFailedRecordings([]);
    console.log('🗑️ Cleared all failed audio recordings');
  }, [actions]);
  
  // Handle recording completion and processing
  // Separate function to process a session in the background
  const processSessionInBackground = useCallback(async (sessionId: string, audioBlob: Blob, workflowId: AgentType) => {
    console.log('🔄 Starting background processing for session:', sessionId);
    console.log('🎯 Current selectedSessionId at start:', state.selectedSessionId);

    // Create dedicated AbortControllers for this session
    const sessionProcessingAbort = new AbortController();
    // NOTE: No longer setting UI mode to 'processing' here - unified pipeline progress handles display

    try {
      // Update session with transcription start time (status already set to transcribing in handleRecordingComplete)
      actions.updatePatientSession(sessionId, {
        transcriptionStartTime: Date.now()
      });

      // Update pipeline progress - Transcription queued
      actions.setPipelineProgress({
        stage: 'transcribing',
        progress: 15,
        stageProgress: 10,
        details: 'Queued for transcription',
        modelName: 'MLX Whisper v3-turbo'
      });
      actions.updatePatientSession(sessionId, {
        pipelineProgress: {
          stage: 'transcribing',
          progress: 15,
          stageProgress: 10,
          details: 'Queued for transcription',
          modelName: 'MLX Whisper v3-turbo'
        }
      });

      // Use Audio Processing Queue for transcription with performance monitoring
      console.log('🔄 Queuing transcription for session:', sessionId);
      const transcriptionStartTime = Date.now();
      const performanceMonitor = PerformanceMonitoringService.getInstance();
      
      // Import and use the audio processing queue
      const { AudioProcessingQueueService } = await import('@/services/AudioProcessingQueueService');
      const audioQueue = AudioProcessingQueueService.getInstance();
      
      // Queue the transcription job with callbacks
      const transcriptionResult = await new Promise<string>((resolve, reject) => {
        audioQueue.addJob(sessionId, audioBlob, workflowId, {
          onProgress: (status, error) => {
            console.log(`📊 Session ${sessionId} transcription status:`, status, error || '');

            // Update session status based on queue progress
            if (status === 'processing') {
              // Update pipeline progress - Transcription in progress
              actions.setPipelineProgress({
                stage: 'transcribing',
                progress: 30,
                stageProgress: 60,
                details: 'Transcribing with Whisper',
                modelName: 'MLX Whisper v3-turbo'
              });
              actions.updatePatientSession(sessionId, {
                status: 'transcribing',
                pipelineProgress: {
                  stage: 'transcribing',
                  progress: 30,
                  stageProgress: 60,
                  details: 'Transcribing with Whisper',
                  modelName: 'MLX Whisper v3-turbo'
                }
              });
            } else if (status === 'failed' || status === 'cancelled') {
              actions.clearPipelineProgress();
              actions.updatePatientSession(sessionId, {
                status: 'error',
                errors: [error || 'Transcription failed'],
                completedTime: Date.now(),
                processingProgress: undefined, // Clear progress immediately on error
                pipelineProgress: undefined
              });
            }
          },
          onComplete: (result) => {
            console.log('✅ Queued transcription completed for session:', sessionId);
            resolve(result);
          },
          onError: (error) => {
            console.error('❌ Queued transcription failed for session:', sessionId, error);
            reject(new Error(error));
          }
        });
      });
      
      const transcriptionDuration = Date.now() - transcriptionStartTime;
      performanceMonitor.recordMetrics('transcription', transcriptionDuration, {
        agentType: workflowId,
        audioSize: audioBlob.size
      });
      
      console.log('✅ Transcription complete for session:', sessionId);
      console.log('📝 Transcription result:', transcriptionResult.substring(0, 200) + (transcriptionResult.length > 200 ? '...' : ''));

      // Apply phrasebook corrections to transcription
      let correctedTranscription = transcriptionResult;
      let appliedCorrections = 0;
      try {
        const asrLog = ASRCorrectionsLog.getInstance();
        const correctionResult = await asrLog.applyPhrasebookCorrections(transcriptionResult, workflowId);
        correctedTranscription = correctionResult.correctedText;
        appliedCorrections = correctionResult.appliedCorrections;

        if (appliedCorrections > 0) {
          console.log(`📖 Applied ${appliedCorrections} phrasebook corrections`);

          // Update UI to show corrections applied
          ToastService.getInstance().info(`Applied ${appliedCorrections} terminology correction${appliedCorrections === 1 ? '' : 's'}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to apply phrasebook corrections:', error);
        // Continue with original transcription if corrections fail
      }

      // Validate transcription before processing (use corrected version)
      const cleanTranscription = correctedTranscription.trim();
      const isTranscriptionTooShort = cleanTranscription.length < 10; // Minimum 10 characters
      const isTranscriptionEmpty = cleanTranscription.length === 0;
      const isTranscriptionPlaceholder = cleanTranscription.startsWith('[') && cleanTranscription.endsWith(']');
      const isTranscriptionError = cleanTranscription.toLowerCase().includes('transcription failed') || 
                                  cleanTranscription.toLowerCase().includes('server not running') ||
                                  cleanTranscription.toLowerCase().includes('timed out');
      
      // Check for suspicious or failed transcription
      if (isTranscriptionEmpty || isTranscriptionTooShort || isTranscriptionPlaceholder || isTranscriptionError) {
        console.warn('❌ Transcription validation failed:', {
          length: cleanTranscription.length,
          isEmpty: isTranscriptionEmpty,
          tooShort: isTranscriptionTooShort,
          isPlaceholder: isTranscriptionPlaceholder,
          isError: isTranscriptionError,
          preview: cleanTranscription.substring(0, 100)
        });
        
        // Batch transcription error updates to prevent UI blocking
        const performTranscriptionErrorUpdates = () => {
          // Store the failed recording for troubleshooting (non-blocking)
          storeFailedAudioRecording(
            audioBlob,
            workflowId,
            `Transcription validation failed: ${
              isTranscriptionEmpty ? 'Empty transcription' :
              isTranscriptionTooShort ? `Too short (${cleanTranscription.length} chars)` :
              isTranscriptionPlaceholder ? 'Placeholder response' :
              'Transcription error'
            }`,
            cleanTranscription
          );
          
          // Determine error type and show appropriate toast
          const errorType = isTranscriptionEmpty ? 'no-audio' :
            isTranscriptionTooShort ? 'too-short' :
            isTranscriptionPlaceholder ? 'service-unavailable' :
            'error';
          
          RecordingToasts.transcriptionFailed(errorType);
          
          // Simplify error message for better performance
          const errorMessage = isTranscriptionEmpty ? 'No audio detected' :
            isTranscriptionTooShort ? 'Recording too short' :
            isTranscriptionPlaceholder ? 'Transcription service unavailable' :
            'Transcription service error';
          
          // Update session with error state
          actions.updatePatientSession(sessionId, {
            transcription: cleanTranscription,
            status: 'error',
            errors: [`Audio transcription failed: ${errorMessage}`],
            completedTime: Date.now()
          });
          
          // Update main UI
          actions.setTranscription(cleanTranscription);
          actions.setErrors([`Audio transcription failed: ${errorMessage}`]);
          actions.setProcessingStatus('error');
        };

        // Execute transcription error updates in next tick to prevent blocking
        setTimeout(performTranscriptionErrorUpdates, 0);
        
        console.log('🚫 Skipping agent processing due to transcription validation failure');
        return;
      }
      
      // Transcription is valid - proceed with processing
      console.log('✅ Transcription validation passed, proceeding with agent processing');

      // Update pipeline progress - Transcription complete, entering AI analysis
      actions.setPipelineProgress({
        stage: 'ai-analysis',
        progress: 45,
        stageProgress: 10,
        details: 'Loading AI agent',
        modelName: 'MedGemma-27B'
      });

      // Update session with corrected transcription and move to processing
      const startTime = Date.now();
      actions.updatePatientSession(sessionId, {
        transcription: correctedTranscription,
        status: 'processing',
        processingStartTime: startTime,
        pipelineProgress: {
          stage: 'ai-analysis',
          progress: 45,
          stageProgress: 10,
          details: 'Loading AI agent',
          modelName: 'MedGemma-27B'
        }
      });

      // Update main UI to show processing phase
      actions.setTranscription(correctedTranscription);
      actions.setProcessingStatus('processing');
      actions.setTimingData({ processingStartTime: startTime });
      
      // Initialize approval state for the new transcription
      actions.setTranscriptionApproval({
        status: 'pending',
        originalText: transcriptionResult,
        currentText: transcriptionResult,
        hasBeenEdited: false
      });
      
      // Try streaming generation first for supported agents
      const didStream = await startStreamingGeneration(sessionId, workflowId, transcriptionResult);
      if (didStream) {
        return;
      }

      // Process with selected agent with performance monitoring (fallback)
      console.log('🔄 Processing with agent for session (non-streaming):', sessionId, workflowId);
      const processingStartTime = Date.now();
      const { AgentFactory } = await import('@/services/AgentFactory');

      // Initialize progress at 0% when entering processing state
      actions.updatePatientSession(sessionId, {
        status: 'processing',
        processingStartTime: Date.now(),
        processingProgress: {
          phase: 'Starting',
          progress: 0,
          details: 'Initializing agent'
        }
      });

      // Initialize processing progress
      actions.setProcessingProgress(0);

      // Special handling for TAVI workup with progress tracking
      const processOptions: any = {
        skipNotification: true,
        sessionId
      };

      // Add progress callback for all agent types
      processOptions.onProgress = (phase: string, progress: number, details?: string) => {
        const agentPrefix = workflowId === 'tavi-workup' ? '🫀 TAVI' : '🤖';
        console.log(`${agentPrefix} Progress: ${phase} (${progress}%) - ${details || ''}`);

        // Clamp progress to valid range
        const clampedProgress = Math.max(0, Math.min(100, progress));

        // Map agent progress (0-100%) to pipeline AI analysis range (40-90%)
        const pipelineProgress = 40 + (clampedProgress * 0.5); // 0% → 40%, 100% → 90%

        // Update unified pipeline progress
        actions.setPipelineProgress({
          stage: 'ai-analysis',
          progress: pipelineProgress,
          stageProgress: clampedProgress,
          details: details || phase || 'Processing with AI',
          modelName: 'MedGemma-27B'
        });

        // Update session with progress information (both old and new systems)
        actions.updatePatientSession(sessionId, {
          status: 'processing',
          processingProgress: {
            phase: phase || 'Processing',
            progress: clampedProgress,
            details
          },
          pipelineProgress: {
            stage: 'ai-analysis',
            progress: pipelineProgress,
            stageProgress: clampedProgress,
            details: details || phase || 'Processing with AI',
            modelName: 'MedGemma-27B'
          }
        });

        // Update processing progress
        actions.setProcessingProgress(clampedProgress);
      };

      const result = await AgentFactory.processWithAgent(
        workflowId,
        correctedTranscription,
        undefined,
        sessionProcessingAbort.signal,
        processOptions
      );
      
      const processingDuration = Date.now() - processingStartTime;
      performanceMonitor.recordMetrics('agent-processing', processingDuration, {
        agentType: workflowId
      });
      
      console.log('✅ Agent processing complete for session:', sessionId);

      // Update pipeline progress - Generation/completion phase
      actions.setPipelineProgress({
        stage: 'generation',
        progress: 95,
        stageProgress: 50,
        details: 'Formatting output',
        modelName: 'MedGemma-27B'
      });

      // Complete the session with results
      const sessionUpdate: any = {
        results: result.content,
        summary: result.summary || '', // Store summary for dual card display
        agentName: result.agentName,
        status: 'completed',
        completed: true,
        completedTime: Date.now(),
        processingTime: result.processingTime,
        warnings: result.warnings,
        errors: result.errors,
        // Set progress to 100% briefly for smooth completion transition
        processingProgress: {
          phase: 'Complete',
          progress: 100,
          details: 'Processing finished'
        },
        pipelineProgress: {
          stage: 'generation',
          progress: 100,
          stageProgress: 100,
          details: 'Complete'
        }
      };

      // Add TAVI structured sections if available
      if (result.taviStructuredSections) {
        sessionUpdate.taviStructuredSections = result.taviStructuredSections;
      }

      actions.updatePatientSession(sessionId, sessionUpdate);

      // Set UI progress to 100% for completion
      actions.setProcessingProgress(100);

      // Clear progress indicator after fade-out animation (300ms)
      // Clear any existing timeout to prevent race conditions
      if (progressCleanupTimeoutRef.current) {
        clearTimeout(progressCleanupTimeoutRef.current);
      }
      progressCleanupTimeoutRef.current = setTimeout(() => {
        actions.updatePatientSession(sessionId, {
          processingProgress: undefined,
          pipelineProgress: undefined
        });
        // Reset UI progress as well
        actions.setProcessingProgress(0);
        actions.clearPipelineProgress();
        progressCleanupTimeoutRef.current = null;
      }, 300);

      // Record completion metrics
      performanceMonitor.recordMetrics('complete', Date.now() - transcriptionStartTime, {
        agentType: workflowId
      });
      
      // Surface output to main results panel only if this session is currently selected at completion time
      const isCurrentlySelectedAtCompletion = sessionId === state.selectedSessionId;
      if (isCurrentlySelectedAtCompletion) {
        actions.setTranscription(transcriptionResult);
        actions.setResults(result.content);
        // Store missing info (if any) for interactive completion
        actions.setMissingInfo(result.missingInfo || null);
        // Store TAVI structured sections if available
        if (result.taviStructuredSections) {
          actions.setTaviStructuredSections(result.taviStructuredSections);
        }
        console.log('🎯 Updated main results panel for currently selected session:', sessionId);
      } else {
        console.log('🔕 Background session completed, results stored in session only:', sessionId);
      }

      // Special handling for bloods workflow - automatically insert results into Tests Requested field
      if (workflowId === 'bloods') {
        try {
          console.log('🩸 Bloods workflow completed - inserting results into Tests Requested field');
          const messageData = {
            content: result.content
          };
          
          const response = await chrome.runtime.sendMessage({
            type: 'EXECUTE_ACTION',
            action: 'bloods-insert',
            data: messageData
          });

          if (response?.success) {
            console.log('✅ Blood test results inserted into Tests Requested field successfully');
          } else {
            console.warn('⚠️ Failed to insert blood test results into Tests Requested field');
          }
        } catch (error) {
          console.error('❌ Failed to insert blood test results into Tests Requested field:', error);
        }
      }
      
      // Always preserve agent type for field-specific EMR insertion (Quick Actions)
      // This ensures "Insert to EMR" button can map to the correct field dialog
      console.log('🔧 PRESERVING AGENT TYPE:', workflowId, 'for session:', sessionId);
      actions.setCurrentAgent(workflowId);
      console.log('✅ Agent type preserved:', workflowId);

      // Extract and set AI-generated summary only if this session is currently selected
      if (isCurrentlySelectedAtCompletion) {
        if (result.summary && result.summary.trim()) {
          logger.debug('Setting AI-generated summary', { component: 'summary', length: result.summary.length });
          actions.setAiGeneratedSummary(result.summary);
        } else {
          // Clear any previous AI-generated summary
          actions.setAiGeneratedSummary(undefined);
        }

        console.log('🎯 Updated agent and summary for currently selected session:', sessionId);
      }
      
      // Set timing data for display components - this was missing!
      // Calculate recording duration from session timestamps
      const currentSession = state.patientSessions.find(s => s.id === sessionId);
      const recordingDuration = currentSession?.recordingStartTime ? 
        transcriptionStartTime - currentSession.recordingStartTime : 0;
      
      // Only update global state if this session is currently selected/active
      console.log('🔍 Session completion check:', {
        sessionId,
        currentSelectedSessionId: state.selectedSessionId,
        isCurrentlySelectedAtCompletion,
        willUpdateGlobalUI: isCurrentlySelectedAtCompletion
      });

      if (isCurrentlySelectedAtCompletion) {
        actions.setTimingData({
          recordingTime: recordingDuration,
          transcriptionTime: transcriptionDuration,
          agentProcessingTime: processingDuration,
          totalProcessingTime: recordingDuration + transcriptionDuration + processingDuration,
          processingStartTime: transcriptionStartTime // for consistency
        });

        console.log('🏁 Background Workflow Completion: Using atomic completion for background session');
        console.log('🏁 State Check: Before atomic completion - Processing:', state.isProcessing, 'Status:', state.processingStatus, 'Streaming:', state.streaming);

        // Handle both successful and error reports - error reports may not have summary property
        const summaryText = result.summary || result.content || 'Workflow completed';

        try {
          actions.completeProcessingAtomic(sessionId, result.content, summaryText);
          console.log('🏁 Background completion successful');

          // Defensive check for background sessions too
          setTimeout(() => {
            if (state.streaming || state.currentSessionId !== null) {
              console.warn('🚨 UI still showing active state after background completion - forcing ready state');
              actions.forceUIReadyState();
            }
          }, 1000);
        } catch (error) {
          console.error('❌ Atomic completion failed for background session:', error);
          actions.forceUIReadyState(); // Fallback to ensure UI is ready
        }

        // Set missing info if provided by the agent
        if (result.missingInfo) {
          actions.setMissingInfo(result.missingInfo);
        }

        // Set TAVI structured sections if available (TAVI-specific)
        if (result.taviStructuredSections) {
          actions.setTaviStructuredSections(result.taviStructuredSections);
        }

        console.log('🏁 Background Workflow Completion: Atomic completion done for background workflow');
        console.log('🎯 Updated global UI state for currently selected session:', sessionId);
      } else {
        console.log('🔕 Background session completed, skipping global UI state updates for:', sessionId);
      }
      
      console.log('✅ Session completed in background:', sessionId);
      
      // Show system notification for completed session
      try {
        const patientName = state.patientSessions.find(s => s.id === sessionId)?.patient.name || 'Unknown Patient';
        await NotificationService.showCompletionNotification(
          workflowId, 
          result.processingTime || 0, 
          undefined, // No extra info needed, patient name will be in title
          patientName
        );
        console.log('🎉 Background session completed for:', patientName);
        
        // Show in-app toast notification to encourage session review
        RecordingToasts.sessionReady(patientName, workflowId);
      } catch (error) {
        console.warn('Failed to send completion notification:', error);
      }
      
      // Auto-scroll to results panel only if this session is currently selected (motion-safe)
      if (isCurrentlySelectedAtCompletion) {
        try {
          const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          setTimeout(() => {
            const target = resultsRef.current || document.getElementById('results-section');
            if (target && typeof target.scrollIntoView === 'function') {
              target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
              console.log('🎯 Auto-scrolled to results for currently selected session:', sessionId);
            }
          }, 50);
        } catch (scrollError) {
          // Auto-scroll failed - log for debugging but don't interrupt user flow
          console.debug('Auto-scroll to results failed (non-critical):', scrollError instanceof Error ? scrollError.message : scrollError);
          
          // Fallback: try simple focus without animation if available
          try {
            const fallbackTarget = resultsRef.current || document.getElementById('results-section');
            if (fallbackTarget && typeof fallbackTarget.focus === 'function') {
              fallbackTarget.focus({ preventScroll: false });
            }
          } catch (focusError) {
            console.debug('Fallback focus also failed:', focusError instanceof Error ? focusError.message : focusError);
          }
        }
      } else {
        console.log('🔕 Background session completed, skipping auto-scroll for:', sessionId);
      }
      
    } catch (error: any) {
      console.error('❌ Background processing failed for session:', sessionId, error);
      
      // Batch all error state updates to prevent multiple re-renders
      const performErrorUpdates = () => {
        // Turn off processing state on error
        actions.setProcessing(false);
        actions.setProcessingStatus('idle');
        
        // Update session to error state
        if (error.name === 'AbortError') {
          actions.updatePatientSession(sessionId, {
            status: 'cancelled',
            errors: ['Processing was cancelled'],
            processingProgress: undefined // Clear progress immediately on cancel
          });
        } else {
          const currentSession = state.patientSessions.find(s => s.id === sessionId);
          const patientName = currentSession?.patient.name || 'Unknown Patient';

          actions.updatePatientSession(sessionId, {
            status: 'error',
            errors: [error.message || 'Processing failed'],
            processingProgress: undefined // Clear progress immediately on error
          });

          // Show simplified toast notification for background processing error
          RecordingToasts.processingFailed(patientName);
        }
        
        // Store failed recording for troubleshooting (non-blocking)
        storeFailedAudioRecording(
          audioBlob,
          workflowId,
          error.message || 'Background processing failed',
          '',
          0
        );
      };

      // Execute error updates in next tick to prevent blocking the UI
      setTimeout(performErrorUpdates, 0);
    }
  }, [actions, lmStudioService, storeFailedAudioRecording, state.patientSessions]);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    // Store current audio blob for potential failed transcription storage
    currentAudioBlobRef.current = audioBlob;
    
    // Check if cancellation is in progress
    if (state.ui.isCancelling) {
      console.log('🛑 Recording completed but cancellation in progress - ignoring');
      actions.setCancelling(false);
      return;
    }

    // Get active workflow and current session
    const workflowId = activeWorkflowRef.current || state.ui.activeWorkflow;
    const currentSessionId = currentSessionIdRef.current || state.currentSessionId;
    
    if (!workflowId) {
      console.error('❌ No active workflow selected');
      actions.setErrors(['No workflow selected. Please select a workflow type before recording.']);
      return;
    }
    
    if (!currentSessionId) {
      console.error('❌ No current session found');
      actions.setErrors(['No active session. Please start a new recording.']);
      return;
    }
    
    console.log('🎤 Recording completed, starting background processing for session:', currentSessionId);

    // Initialize unified pipeline progress - Audio Processing phase
    actions.setPipelineProgress({
      stage: 'audio-processing',
      progress: 5,
      stageProgress: 50,
      details: 'Validating recording format'
    });

    // Update session status to transcribing immediately when recording stops
    actions.updatePatientSession(currentSessionId, {
      status: 'transcribing',
      audioBlob: audioBlob,
      pipelineProgress: {
        stage: 'audio-processing',
        progress: 5,
        stageProgress: 50,
        details: 'Validating recording format'
      }
    });

    // Clear recording-specific state and make interface ready for next recording
    actions.setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    actions.setActiveWorkflow(null);
    activeWorkflowRef.current = null;
    
    // Reset selection and clear visible results to return to ready state
    actions.setSelectedSessionId(null);
    actions.clearRecording();
    
    // Show brief feedback that recording was sent for processing
    const currentSession = state.patientSessions.find(s => s.id === currentSessionId);
    const patientName = currentSession?.patient.name || 'Patient';
    RecordingToasts.recordingSent(patientName, workflowId);
    
    // Start background processing (non-blocking)
    processSessionInBackground(currentSessionId, audioBlob, workflowId);
    
    console.log('🚀 Background processing started for session:', currentSessionId, '- ready for new recordings!');
  }, [actions, processSessionInBackground, state.ui.isCancelling, state.currentSessionId]);

  // Voice activity handler
  const handleVoiceActivityUpdate = useCallback((level: number, frequencyData: number[]) => {
    // Use startTransition for non-urgent voice activity updates
    startTransition(() => {
      actions.setVoiceActivity(level, frequencyData);
    });
  }, [actions]);

  // Populate the refs with the actual callback functions
  useEffect(() => {
    handleRecordingCompleteRef.current = handleRecordingComplete;
    handleVoiceActivityUpdateRef.current = handleVoiceActivityUpdate;
  }, [handleRecordingComplete, handleVoiceActivityUpdate]);

  // Session selection handler - uses isolated display state to prevent cross-contamination
  const handleSessionSelect = useCallback((session: PatientSession) => {
    console.log('📋 🔍 USER EXPLICIT SESSION SELECTION - Selected:', {
      patientName: session.patient.name,
      sessionId: session.id,
      status: session.status,
      hasTranscription: !!session.transcription,
      hasResults: !!session.results,
      hasSummary: !!session.summary,
      agentType: session.agentType,
      currentBackgroundWork: {
        isRecording: recorder.isRecording,
        isProcessing: state.isProcessing,
        streaming: state.streaming,
        currentSessionId: state.currentSessionId
      }
    });

    // Always use isolated display session - prevents cross-contamination with active recordings
    startTransition(() => {
      console.log('📋 🎯 Loading session into isolated display state:', session.id);

      // Use new isolated session display action
      actions.setDisplaySession(session);
      actions.setUIMode('reviewing', { sessionId: session.id, origin: 'user' });

      // Show progress overlay if session is currently processing
      if (session.status === 'processing' || session.status === 'transcribing') {
        actions.openOverlay('field-ingestion');
        console.log('📊 Opened field-ingestion overlay for processing session:', session.id);
      }

      console.log('✅ 📋 SESSION SELECT COMPLETE - Session loaded in isolated display (will show even during active work):', {
        patientName: session.patient.name,
        sessionId: session.id,
        status: session.status,
        priorityLevel: 'PRIORITY 1 - User Explicit Selection'
      });

      // Debug display state after session selection
      setTimeout(() => {
        console.log('🔍 DISPLAY STATE CHECK - Post session selection:', {
          isDisplayingSession: state.displaySession?.isDisplayingSession,
          displaySessionId: state.displaySession?.displaySessionId,
          displayResultsLength: state.displaySession?.displayResults?.length || 0,
          displayTranscriptionLength: state.displaySession?.displayTranscription?.length || 0,
          // Active recording state should remain untouched
          activeRecordingResults: state.results?.length || 0,
          activeRecordingTranscription: state.transcription?.length || 0,
          isRecording: recorder.isRecording,
          currentSessionId: state.currentSessionId
        });
      }, 100);
    });
  }, [actions, state.displaySession, state.results, state.transcription, state.currentSessionId, recorder.isRecording]);

  const handleResumeRecording = useCallback((session: PatientSession) => {
    actions.setSelectedSessionId(session.id);
    actions.setUIMode('recording', { sessionId: session.id, origin: 'user' });
  }, [actions]);

  const handleMarkSessionComplete = useCallback((session: PatientSession) => {
    const timestamp = Date.now();
    actions.updatePatientSession(session.id, {
      reviewedAt: timestamp,
      finalizedAt: timestamp,
      completed: true,
      status: 'completed'
    });

    if (state.selectedSessionId === session.id) {
      actions.clearDisplaySession();
      actions.setUIMode('idle', { sessionId: null, origin: 'user' });
    }
  }, [actions, state.selectedSessionId]);

  // Memoized smart summary generation for performance
  const generateSmartSummary = useCallback((content: string): string => {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return content.substring(0, 150) + '...';
    
    // Look for key medical terms
    const keyTerms = ['stenosis', 'regurgitation', 'valve', 'artery', 'diagnosis', 'treatment'];
    const importantSentences = sentences.filter(sentence => 
      keyTerms.some(term => sentence.toLowerCase().includes(term))
    );
    
    if (importantSentences.length > 0) {
      return importantSentences.slice(0, 2).join('. ').trim() + '.';
    }
    
    return sentences[0]?.trim() + '.';
  }, []);

  // Memoized intelligent summary selection that prioritizes AI-generated summaries
  const _getDisplaySummary = useCallback((results: string, aiSummary?: string): string => {
    // Prioritize AI-generated summary from agents like QuickLetter
    if (aiSummary && aiSummary.trim()) {
      return aiSummary.trim();
    }

    // Fall back to JavaScript-generated summary for other agents
    return generateSmartSummary(results);
  }, [generateSmartSummary]);

  // Determine which data to display: PRIORITY 1: User selection, PRIORITY 2: Active work
  const getCurrentDisplayData = useCallback(() => {
    // PRIORITY 1: If user explicitly selected a completed session, ALWAYS show it (even during active work)
    if (state.displaySession.isDisplayingSession && state.displaySession.displaySessionId) {
      return {
        transcription: state.displaySession.displayTranscription,
        results: state.displaySession.displayResults,
        summary: state.displaySession.displaySummary,
        taviStructuredSections: state.displaySession.displayTaviStructuredSections,
        educationData: state.displaySession.displayEducationData,
        agent: state.displaySession.displayAgent,
        agentName: state.displaySession.displayAgentName,
        patientInfo: state.displaySession.displayPatientInfo,
        processingTime: state.displaySession.displayProcessingTime,
        processingStatus: 'complete' as ProcessingStatus, // Completed sessions are always 'complete'
        isDisplayingSession: true
      };
    }

    // PRIORITY 2: If actively working AND no explicit user selection, show active recording data
    const isActivelyWorking = recorder.isRecording ||
                             state.isProcessing ||
                             state.streaming ||
                             state.currentSessionId !== null;

    if (isActivelyWorking) {
      // Safety check: If we have results but are still streaming, this might be a stuck state
      if (state.streaming && state.results && state.processingStatus === 'complete') {
        console.warn('🚨 POTENTIAL STUCK STREAMING STATE DETECTED:', {
          streaming: state.streaming,
          hasResults: !!state.results,
          resultsLength: state.results.length,
          processingStatus: state.processingStatus,
          streamBuffer: state.streamBuffer?.length || 0
        });
      }

      return {
        transcription: state.transcription,
        results: state.results,
        summary: state.aiGeneratedSummary,
        agent: state.currentAgent,
        agentName: state.currentAgentName,
        patientInfo: state.currentPatientInfo,
        processingStatus: state.processingStatus,
        isDisplayingSession: false
      };
    }

    // PRIORITY 3: Default - show active recording data (even if empty)
    return {
      transcription: state.transcription,
      results: state.results,
      summary: state.aiGeneratedSummary,
      agent: state.currentAgent,
      agentName: state.currentAgentName,
      patientInfo: state.currentPatientInfo,
      processingStatus: state.processingStatus,
      isDisplayingSession: false
    };
  }, [
    recorder.isRecording,
    state.isProcessing,
    state.streaming,
    state.currentSessionId,
    state.transcription,
    state.results,
    state.aiGeneratedSummary,
    state.currentAgent,
    state.currentAgentName,
    state.currentPatientInfo,
    state.processingStatus,
    state.displaySession
  ]);

  // Recorder was moved earlier to resolve initialization order

  // Extract patient data from current EMR page with enhanced logging and retry logic
  const extractPatientData = useCallback(async (): Promise<any> => {
    try {
      console.log('👤 Extracting patient data from EMR...');
      
      // First, ensure we're targeting the correct EMR tab
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('🔍 Current active tab:', activeTab[0]?.url);
      
      // Add retry logic for patient extraction
      const maxRetries = 3;
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔍 Attempt ${attempt}/${maxRetries}: Sending extraction request to content script...`);
        
        try {
          const response = await Promise.race([
            chrome.runtime.sendMessage({
              type: 'EXECUTE_ACTION',
              action: 'extract-patient-data',
              data: {}
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Patient extraction timeout')), 10000)
            )
          ]);
          
          console.log('📬 Received response from content script:', response);
          
          if (response?.success && response?.data) {
            const patientData = response.data;
            console.log(`✅ Patient data extraction succeeded on attempt ${attempt}:`, patientData);
            
            // Validate the extracted data quality
            const hasName = patientData.name && patientData.name.trim() !== '';
            const hasId = patientData.id && patientData.id.trim() !== '';
            
            if (hasName || hasId) {
              console.log('✅ Patient data validation passed - returning data');
              return patientData; // Successfully extracted and validated
            } else {
              console.warn(`⚠️ Attempt ${attempt}: Extracted data lacks name and ID - will retry`);
              lastError = new Error('Extracted data lacks required patient name or ID');
            }
          } else {
            console.warn(`⚠️ Attempt ${attempt}: No valid patient data in response`);
            lastError = new Error(response?.error || 'No patient data found in response');
          }
        } catch (attemptError: any) {
          console.warn(`⚠️ Attempt ${attempt} failed:`, attemptError.message);
          lastError = attemptError;
          
          // Add delay between retries (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s max
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All retries failed
      console.error('❌ All patient extraction attempts failed. Last error:', lastError);
      return null;
    } catch (error) {
      console.error('❌ Critical error in patient data extraction:', error);
      console.error('🔍 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }, []);

  // Handle workflow selection with optimized state updates
  const handleWorkflowSelect = useCallback(async (workflowId: AgentType, quickActionField?: string) => {
    console.log('🎯 Workflow selected:', workflowId, quickActionField ? `(Quick Action field: ${quickActionField})` : '');
    
    // Auto-reset from error state when user attempts new recording
    if (state.processingStatus === 'error') {
      console.log('🔄 Auto-recovering from error state - resetting to idle for new recording');
      actions.setProcessingStatus('idle');
      actions.setErrors([]); // Clear error messages
      actions.setWarnings([]); // Clear warnings
      actions.clearRecording(); // Clear previous failed session data
    }
    
    // Clear previous results when switching to a new workflow (consistent with "New Recording" button)
    if (state.results?.trim().length > 0 || state.transcription?.trim().length > 0) {
      console.log('🔄 Clearing previous session before starting new workflow:', workflowId);
      actions.clearRecording();
    }
    
    // Clear any display session when starting a new recording to prevent cross-contamination
    if (state.displaySession.isDisplayingSession) {
      console.log('🔄 Clearing display session view for new recording');
      actions.clearDisplaySession();
      actions.setUIMode('idle', { sessionId: null, origin: 'user' });
    }
    
    // Count active sessions to check limits
    const activeSessions = state.patientSessions.filter(session =>
      ['recording', 'transcribing', 'processing'].includes(session.status)
    );

    if (recorder.isRecording && state.ui.activeWorkflow === workflowId) {
      // Stop recording for active workflow
      console.log('🛑 Stopping current recording for:', workflowId);
      recorder.stopRecording();
    } else if (!recorder.isRecording) {
      // Check if we have too many active sessions (max 3 concurrent processing)
      if (activeSessions.length >= 3) {
        actions.setErrors([`Too many active sessions (${activeSessions.length}). Please wait for some to complete before starting new recordings.`]);
        return;
      }

      // Allow concurrent recordings - removed single recording session limit
      console.log(`📊 Current active sessions: ${activeSessions.length}/3 - proceeding with new recording`);

      // Check Whisper server status before allowing recording
      console.log('🔍 Checking Whisper server status before recording...');
      if (!state.modelStatus.whisperServer?.running) {
        console.error('❌ Whisper server not running');
        actions.setErrors(['Whisper server is not running. Please start the server first using: ./start-whisper-server.sh']);
        return;
      }
      
      // Extract patient data before starting workflow with loading feedback
      console.log('📋 Extracting patient data for new recording...');
      actions.setExtractingPatients(true);
      let currentPatientInfo = null;
      
      try {
        const patientData = await extractPatientData();
        if (patientData && (patientData.name || patientData.id)) {
          currentPatientInfo = {
            name: patientData.name || 'Patient',
            id: patientData.id || 'No ID',
            dob: patientData.dob || '',
            age: patientData.age || '',
            phone: patientData.phone,
            email: patientData.email,
            medicare: patientData.medicare,
            insurance: patientData.insurance,
            address: patientData.address,
            extractedAt: patientData.extractedAt || Date.now()
          };
          
          actions.setCurrentPatientInfo(currentPatientInfo);
          console.log('✅ Patient data extracted successfully:', patientData.name, '(ID:', patientData.id + ')');
        } else {
          console.log('⚠️ No patient data extracted from EMR - generating fallback patient info');
          
          // Generate better fallback patient info with unique naming
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const sessionNumber = (state.patientSessions?.length || 0) + 1;
          
          currentPatientInfo = { 
            name: `Patient ${sessionNumber} (${timestamp})`, 
            id: `Session-${Date.now()}`, 
            dob: '', 
            age: '',
            extractedAt: Date.now() 
          };
          
          actions.setCurrentPatientInfo(currentPatientInfo);
          console.log('📝 Generated fallback patient info:', currentPatientInfo.name);
        }
      } catch (extractionError) {
        console.error('❌ Patient extraction failed with error:', extractionError);
        
        // Generate fallback patient info even on extraction failure
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sessionNumber = (state.patientSessions?.length || 0) + 1;
        
        currentPatientInfo = { 
          name: `Patient ${sessionNumber} (${timestamp})`, 
          id: `Session-${Date.now()}`, 
          dob: '', 
          age: '',
          extractedAt: Date.now() 
        };
        
        actions.setCurrentPatientInfo(currentPatientInfo);
        console.log('📝 Generated fallback patient info after extraction error:', currentPatientInfo.name);
      } finally {
        // Always clear the extracting state
        actions.setExtractingPatients(false);
      }
      
      // Create a new patient session when recording starts
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const patientSession: PatientSession = {
        id: sessionId,
        patient: currentPatientInfo,
        transcription: '',
        results: '',
        agentType: workflowId,
        agentName: '', // Will be set later
        timestamp: Date.now(),
        status: 'recording',
        completed: false,
        recordingStartTime: Date.now(),
        ...(quickActionField && { quickActionField }) // Store Quick Action field ID if provided
      };
      
      // Add the session and set as current
      actions.addPatientSession(patientSession);
      actions.setCurrentSessionId(sessionId);
      currentSessionIdRef.current = sessionId;
      console.log('📝 Created new session:', sessionId, 'for patient:', patientSession.patient.name);
      
      // Start recording for selected workflow
      console.log('✅ Whisper server is running, starting recording...');
      actions.setActiveWorkflow(workflowId);
      activeWorkflowRef.current = workflowId;
      actions.setUIMode('recording', { sessionId, origin: 'user' });
      recorder.startRecording();
      actions.setProcessingStartTime(Date.now());
    }
  }, [recorder, state.ui.activeWorkflow, actions, extractPatientData, state.patientSessions, state.modelStatus]);

  // Handle cancellation with proper cleanup
  const handleCancel = useCallback(() => {
    console.log('🛑 Cancellation requested');
    actions.setCancelling(true);
    
    // Cancel transcription
    if (transcriptionAbortRef.current) {
      transcriptionAbortRef.current.abort();
      transcriptionAbortRef.current = null;
    }
    
    // Cancel processing
    if (processingAbortRef.current) {
      processingAbortRef.current.abort();
      processingAbortRef.current = null;
    }
    
    // Stop recording if active
    if (recorder.isRecording) {
      recorder.stopRecording();
    }
    
    // Clean up current session if it exists
    const currentSessionId = currentSessionIdRef.current || state.currentSessionId;
    if (currentSessionId) {
      console.log('🧹 Cleaning up current session:', currentSessionId);
      actions.removePatientSession(currentSessionId);
      actions.setCurrentSessionId(null);
      currentSessionIdRef.current = null;
    }
    
    // Reset state
    actions.setActiveWorkflow(null);
    actions.setProcessing(false);
    actions.setProcessingStatus('idle');
    actions.setWarnings([]);
    actions.setErrors([]);
    actions.setResults('');
    actions.setResultsSummary(''); // Clear summary when cancelling
    activeWorkflowRef.current = null;
    actions.setUIMode('idle', { sessionId: null, origin: 'user' });

    setTimeout(() => actions.setCancelling(false), 1000);
  }, [recorder, actions]);

  // Clipboard operations
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text:', error);
      throw error;
    }
  }, []);

  // State for transcription edit feedback
  const [transcriptionSaveStatus, setTranscriptionSaveStatus] = useState<{
    status: 'idle' | 'saving' | 'saved' | 'error';
    message: string;
    timestamp?: Date;
  }>({ status: 'idle', message: '' });

  // Handle transcription editing with approval-based ASR corrections logging
  const handleTranscriptionEdit = useCallback(async (editedText: string) => {
    try {
      console.log('✏️ Transcription edited, length:', editedText.length);
      
      // Update application state with edited transcription
      actions.setTranscription(editedText);
      
      // Update approval state to indicate text has been edited
      const originalTranscription = state.transcription;
      if (originalTranscription && editedText !== originalTranscription) {
        // Mark as edited but don't auto-submit for training
        const updatedApprovalState = {
          ...state.transcriptionApproval,
          status: 'edited' as TranscriptionApprovalStatus,
          originalText: state.transcriptionApproval.originalText || originalTranscription,
          currentText: editedText,
          hasBeenEdited: true,
          editTimestamp: Date.now()
        };
        
        actions.setTranscriptionApproval(updatedApprovalState);
        
        // Show that the edit is ready to be submitted for training (but not automatically submitted)
        setTranscriptionSaveStatus({
          status: 'idle',
          message: 'Edit ready - click "Perfect" to submit for training'
        });
        
        console.log('✏️ Transcription marked as edited, ready for approval');
        
      } else if (editedText === originalTranscription) {
        // Reset approval state if text matches original
        const resetApprovalState = {
          ...state.transcriptionApproval,
          status: 'pending' as TranscriptionApprovalStatus,
          currentText: editedText,
          hasBeenEdited: false
        };
        
        actions.setTranscriptionApproval(resetApprovalState);
        setTranscriptionSaveStatus({ status: 'idle', message: '' });
      }
    } catch (error) {
      console.error('❌ Failed to handle transcription edit:', error);
      
      // Show error feedback
      setTranscriptionSaveStatus({
        status: 'error',
        message: '⚠ Failed to process edit',
        timestamp: new Date()
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setTranscriptionSaveStatus({ status: 'idle', message: '' });
      }, 5000);
      
      // Don't throw - we don't want to break the UI for this
    }
  }, [state.transcription, state.transcriptionApproval, state.currentAgent, state.selectedSessionId, actions]);

  // Handle transcription approval for ASR training
  const handleTranscriptionApproval = useCallback(async (status: TranscriptionApprovalStatus) => {
    try {
      console.log('✅ Transcription approval status changed:', status);
      
      // Update the transcription approval state
      const currentTranscription = state.transcription;
      const approvalState = state.transcriptionApproval;
      
      const updatedApprovalState = {
        ...approvalState,
        status,
        currentText: currentTranscription,
        approvalTimestamp: status === 'approved' ? Date.now() : approvalState.approvalTimestamp,
        editTimestamp: status === 'edited' ? Date.now() : approvalState.editTimestamp
      };
      
      actions.setTranscriptionApproval(updatedApprovalState);
      
      // Log to ASR corrections based on approval status
      if (status === 'approved' && currentTranscription.trim() !== '') {
        console.log('💾 Logging transcription for ASR training');
        
        // Determine if this was originally perfect or corrected
        const wasEdited = approvalState.hasBeenEdited;
        const originalText = approvalState.originalText || currentTranscription;
        
        await ASRCorrectionsLog.getInstance().addCorrection({
          rawText: originalText,
          correctedText: currentTranscription,
          agentType: state.currentAgent || 'transcription',
          sessionId: state.selectedSessionId || 'streaming',
          approvalStatus: 'approved',
          userExplicitlyApproved: true,
          approvalTimestamp: Date.now(),
          editTimestamp: wasEdited ? (approvalState.editTimestamp || Date.now()) : undefined
        });
        
        // Show appropriate feedback
        const message = wasEdited 
          ? '✓ Corrected transcription saved for training'
          : '✓ Perfect transcription saved for training';
          
        setTranscriptionSaveStatus({
          status: 'saved',
          message,
          timestamp: new Date()
        });
        
        setTimeout(() => {
          setTranscriptionSaveStatus({ status: 'idle', message: '' });
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ Failed to handle transcription approval:', error);
      setTranscriptionSaveStatus({
        status: 'error',
        message: '⚠ Failed to save approval',
        timestamp: new Date()
      });
      
      setTimeout(() => {
        setTranscriptionSaveStatus({ status: 'idle', message: '' });
      }, 5000);
    }
  }, [state.transcription, state.transcriptionApproval, state.currentAgent, state.selectedSessionId, actions]);

  // Handle reprocessing transcription with different agent
  const handleAgentReprocess = useCallback(async (newAgentType: AgentType) => {
    try {
      console.log('🔄 Reprocessing transcription with agent:', newAgentType);
      
      if (!state.transcription || state.transcription.trim().length === 0) {
        console.error('❌ No transcription available for reprocessing');
        actions.setErrors(['No transcription available for reprocessing']);
        return;
      }
      
      if (state.isProcessing) {
        console.warn('⚠️ Already processing, ignoring reprocess request');
        return;
      }
      
      // Clear previous results and warnings
      actions.setResults('');
      actions.setWarnings([]);
      actions.setErrors([]);
      actions.setResultsSummary('');
      
      // Update processing state
      actions.setProcessing(true);
      actions.setProcessingStatus('processing');
      actions.setCurrentAgent(newAgentType);
      actions.setProcessingStartTime(Date.now());
      
      console.log('🔄 Starting agent processing with:', newAgentType);
      
      // Clear previous missing info to avoid stale prompts
      actions.setMissingInfo(null);

      // Process with the new agent (dynamic import for bundle optimization)
      const { AgentFactory } = await import('@/services/AgentFactory');
      const result = await AgentFactory.processWithAgent(
        newAgentType,
        state.transcription,
        { isReprocessing: true }, // Add context to indicate reprocessing
        processingAbortRef.current?.signal
      );
      
      console.log('✅ Agent reprocessing completed');
      
      // Update results
      actions.setResults(result.content);
      actions.setMissingInfo(result.missingInfo || null);

      // Set TAVI structured sections if available
      if (result.taviStructuredSections) {
        actions.setTaviStructuredSections(result.taviStructuredSections);
      }
      
      // Extract and set AI-generated summary if available
      if (result.summary && result.summary.trim()) {
        logger.debug('Setting AI-generated summary from reprocessing', { component: 'summary', agent: newAgentType });
        actions.setAiGeneratedSummary(result.summary);
      } else {
        actions.setAiGeneratedSummary(undefined);
      }
      
      // Set timing data
      actions.setTimingData({
        agentProcessingTime: result.processingTime,
        totalProcessingTime: result.processingTime // For reprocessing, total = agent processing time
      });
      
      actions.setCurrentAgentName(result.agentName);
      // Use atomic completion to ensure consistent state management
      actions.completeProcessingAtomic(state.currentSessionId || 'reprocess-session', result.content);
      
      // Set warnings and errors if any
      if (result.warnings?.length) {
        actions.setWarnings(result.warnings);
      }
      if (result.errors?.length) {
        actions.setErrors(result.errors);
      }
      
    } catch (error: any) {
      console.error('❌ Agent reprocessing failed:', error);
      
      actions.setProcessing(false);
      actions.setProcessingStatus('idle');
      
      if (error.name === 'AbortError') {
        console.log('🛑 Agent reprocessing was cancelled');
      } else {
        actions.setErrors([error.message || 'Reprocessing failed']);
      }
    }
  }, [state.transcription, state.isProcessing, actions]);

  // Reprocess with user-provided answers for missing information
  const handleReprocessWithMissingInfo = useCallback(async (answers: Record<string, string>) => {
    try {
      if (!state.transcription || !state.currentAgent) return;
      actions.setProcessing(true);
      actions.setProcessingStatus('processing');

      // Build augmented input by appending answers in a structured block
      const additions = Object.entries(answers)
        .filter(([_, v]) => v && v.trim().length > 0)
        .map(([k, v]) => `- ${k}: ${v.trim()}`)
        .join('\n');
      const augmentedInput = `${state.transcription}\n\nAdditional details provided by clinician to fill missing information:\n${additions}`;

      // Dynamic import for bundle optimization
      const { AgentFactory } = await import('@/services/AgentFactory');
      const result = await AgentFactory.processWithAgent(
        state.currentAgent,
        augmentedInput,
        { isReprocessing: true, withMissingInfo: true }, // Add context for reprocessing with missing info
        processingAbortRef.current?.signal
      );

      actions.setMissingInfo(result.missingInfo || null);

      // Set TAVI structured sections if available
      if (result.taviStructuredSections) {
        actions.setTaviStructuredSections(result.taviStructuredSections);
      }

      // Use atomic completion to ensure consistent state management
      actions.completeProcessingAtomic(state.currentSessionId || 'missing-info-session', result.content);
    } catch (error) {
      console.error('Reprocess with missing info failed:', error);
      actions.setProcessing(false);
      actions.setProcessingStatus('idle');
    }
  }, [state.transcription, state.currentAgent, actions]);

  // Patient version generation handler
  const handleGeneratePatientVersion = useCallback(async () => {
    if (!state.results || state.currentAgent !== 'quick-letter' || state.isGeneratingPatientVersion) {
      return;
    }

    try {
      console.log('🎯 Generating patient-friendly version of letter');
      actions.setGeneratingPatientVersion(true);
      
      // Import QuickLetterAgent dynamically to avoid bundle bloat
      const { QuickLetterAgent } = await import('@/agents/specialized/QuickLetterAgent');
      const quickLetterAgent = new QuickLetterAgent();
      
      // Generate patient version from the existing letter content
      const patientFriendlyVersion = await quickLetterAgent.generatePatientVersion(state.results);
      
      // Update state with the generated patient version
      actions.setPatientVersion(patientFriendlyVersion);
      
      console.log('✅ Patient version generated successfully');
      
    } catch (error) {
      console.error('❌ Failed to generate patient version:', error);
      actions.setPatientVersion('Error generating patient version. Please try again.');
    } finally {
      actions.setGeneratingPatientVersion(false);
    }
  }, [state.results, state.currentAgent, state.isGeneratingPatientVersion, actions]);

  // Helper function to validate patient names before insertion
  const validatePatientBeforeInsertion = useCallback(async (text: string): Promise<boolean> => {
    try {
      console.log('🔍 Starting patient name validation before EMR insertion');

      // Get session patient name - find the session that generated these results
      let sessionPatientName = '';

      // If we have a selected session, use that patient name
      if (state.selectedSessionId) {
        const selectedSession = state.patientSessions.find(s => s.id === state.selectedSessionId);
        if (selectedSession) {
          sessionPatientName = selectedSession.patient.name;
          console.log('📋 Using selected session patient name:', sessionPatientName);
        }
      }
      // Otherwise, use the current active session or current patient info
      else if (state.currentSessionId) {
        const currentSession = state.patientSessions.find(s => s.id === state.currentSessionId);
        if (currentSession) {
          sessionPatientName = currentSession.patient.name;
          console.log('📋 Using current session patient name:', sessionPatientName);
        }
      }
      // Last fallback: use current patient info if available
      else if (state.currentPatientInfo?.name) {
        sessionPatientName = state.currentPatientInfo.name;
        console.log('📋 Using current patient info name:', sessionPatientName);
      }

      // Get current EMR patient name (fresh extraction)
      let emrPatientName = '';
      try {
        const freshPatientData = await extractPatientData();
        if (freshPatientData?.name) {
          emrPatientName = freshPatientData.name;
          console.log('🏥 Extracted fresh EMR patient name:', emrPatientName);
        } else if (state.currentPatientInfo?.name) {
          emrPatientName = state.currentPatientInfo.name;
          console.log('🏥 Using cached EMR patient name:', emrPatientName);
        }
      } catch (error) {
        console.warn('⚠️ Failed to extract fresh patient data, using cached:', error);
        if (state.currentPatientInfo?.name) {
          emrPatientName = state.currentPatientInfo.name;
        }
      }

      // Skip validation if we can't get both names
      if (patientNameValidator.shouldSkipValidation(sessionPatientName, emrPatientName)) {
        console.log('⏩ Skipping patient name validation - insufficient data');
        return true; // Allow insertion
      }

      // Perform validation
      const comparison = patientNameValidator.validatePatientNames(sessionPatientName, emrPatientName);
      console.log('📊 Patient name validation result:', comparison);

      // If names match, proceed without modal
      if (comparison.isMatch) {
        console.log('✅ Patient names match - proceeding with insertion');
        return true;
      }

      // Names don't match - show confirmation modal
      console.log('⚠️ Patient name mismatch detected - showing confirmation modal');

      return new Promise((resolve) => {
        // Set up modal data
        actions.setPatientMismatchData({
          comparison,
          textToInsert: text,
          onConfirm: () => {
            console.log('✅ User confirmed insertion despite mismatch');
            actions.closeOverlay('patient-mismatch');
            actions.setPatientMismatchData({
              comparison: null,
              textToInsert: null,
              onConfirm: null,
              onCancel: null
            });
            resolve(true);
          },
          onCancel: () => {
            console.log('❌ User cancelled insertion due to mismatch');
            actions.closeOverlay('patient-mismatch');
            actions.setPatientMismatchData({
              comparison: null,
              textToInsert: null,
              onConfirm: null,
              onCancel: null
            });
            resolve(false);
          }
        });

        // Show modal
        actions.openOverlay('patient-mismatch');
        actions.setUIMode('reviewing', { sessionId: state.selectedSessionId || null, origin: 'auto' });
      });

    } catch (error) {
      console.error('❌ Patient name validation failed:', error);
      // If validation fails, allow insertion with warning
      console.log('⚠️ Allowing insertion due to validation error');
      return true;
    }
  }, [state.selectedSessionId, state.currentSessionId, state.patientSessions, state.currentPatientInfo, extractPatientData, actions]);

  // EMR insertion with field-specific targeting
  const handleInsertToEMR = useCallback(async (text: string, targetField?: string, agentContext?: AgentType | null) => {
    try {
      // Step 1: Validate patient names before insertion
      const shouldProceed = await validatePatientBeforeInsertion(text);
      if (!shouldProceed) {
        console.log('🛑 Insertion cancelled due to patient mismatch');
        return;
      }

      // Step 2: Proceed with normal insertion logic
      console.log('✅ Patient validation passed - proceeding with insertion');

      // Determine target field from agent type if not explicitly provided
      // For display sessions, use the display session agent
      const displayData = getCurrentDisplayData();

      // PRIORITY: Check if there's a Quick Action field directly stored in the session
      const currentSession = state.patientSessions.find(s => s.id === state.currentSessionId) ||
                            state.patientSessions.find(s => s.id === state.displaySession.displaySessionId);
      const quickActionField = currentSession?.quickActionField;

      const currentAgentType = targetField ? null : (agentContext || displayData.agent || state.currentAgent || state.ui.activeWorkflow);
      const field = targetField || quickActionField || getTargetField(currentAgentType);

      console.log('🔍 EMR insertion debug:');
      console.log('  - agentContext:', agentContext);
      console.log('  - currentAgent:', state.currentAgent);
      console.log('  - activeWorkflow:', state.ui.activeWorkflow);
      console.log('  - displayData.agent:', displayData.agent);
      console.log('  - currentAgentType:', currentAgentType);
      console.log('  - targetField:', targetField);
      console.log('  - quickActionField (from session):', quickActionField);
      console.log('  - field (final):', field);
      console.log('  - supportsFieldSpecific:', supportsFieldSpecificInsertion(currentAgentType));
      console.log('  - isDisplayingSession:', displayData.isDisplayingSession);

      if (field && (quickActionField || supportsFieldSpecificInsertion(currentAgentType))) {
        // Field-specific insertion: open field dialog and append content at the end
        console.log(`📝 Opening ${getFieldDisplayName(field)} field and appending content`);

        // Use insertMode: 'append' pattern - this will:
        // 1. Open the field dialog
        // 2. Navigate to the end of the existing content
        // 3. Insert a newline and the new content
        await chrome.runtime.sendMessage({
          type: 'EXECUTE_ACTION',
          action: field, // Use the field name as the action (e.g., 'investigation-summary')
          data: {
            insertMode: 'append',
            content: text
          }
        });

        console.log(`✅ Content appended to ${getFieldDisplayName(field)} field`);
      } else if (text && text.trim().length > 0) {
        // Smart fallback: If we have text to insert but no agent type, try Quick Action fields
        // This handles cases where agent type tracking failed but we know we have processed content
        console.log('🔍 No agent type but have text to insert - trying Quick Action field detection');

        // Try each Quick Action field in sequence until one succeeds
        const quickActionFields = [
          { action: 'medications', displayName: 'Medications (Problem List for Phil)' },
          { action: 'investigation-summary', displayName: 'Investigation Summary' },
          { action: 'background', displayName: 'Background' }
        ];

        let inserted = false;
        for (const fieldConfig of quickActionFields) {
          try {
            console.log(`🔍 Attempting ${fieldConfig.displayName}...`);
            const response = await chrome.runtime.sendMessage({
              type: 'EXECUTE_ACTION',
              action: fieldConfig.action,
              data: {
                insertMode: 'append',
                content: text
              }
            });

            // Check if the insertion was successful
            if (response && response.success !== false) {
              console.log(`✅ Successfully inserted to ${fieldConfig.displayName}`);
              inserted = true;
              break;
            }
          } catch (error) {
            console.log(`⚠️ ${fieldConfig.displayName} attempt failed, trying next...`);
            continue;
          }
        }

        if (!inserted) {
          // All Quick Action attempts failed, fall back to generic insertion
          console.log('📝 All Quick Action fields failed - using generic insertion');
          await chrome.runtime.sendMessage({
            type: 'EXECUTE_ACTION',
            action: 'insertText',
            data: { text }
          });
        }
      } else {
        // No results or no agent type - use generic insertion
        console.log('📝 Using generic EMR text insertion (no specific field mapping)');

        await chrome.runtime.sendMessage({
          type: 'EXECUTE_ACTION',
          action: 'insertText',
          data: { text }
        });

        console.log('📝 Text inserted to EMR (generic)');
      }
    } catch (error) {
      console.error('Failed to insert text to EMR:', error);
      throw error;
    }
  }, [state.currentAgent, state.ui.activeWorkflow]);

  // Memoized status checking for better performance
  // Use a stable reference to avoid recreating the callback every render
  const setModelStatus = actions.setModelStatus;

  const checkModelStatus = useCallback(async () => {
    console.log('🔍 checkModelStatus called - CALL STACK:', new Error().stack);
    console.time('⏱️ Total checkModelStatus Duration');

    try {
      // Check both LMStudio and Whisper server status
      const status = await lmStudioService.checkConnection();
      
      // Use resilient status checking with retry logic for post-processing scenarios
      // This prevents workflow button from being disabled due to temporary server busy periods
      const freshWhisperStatus = await whisperServerService.checkServerStatus(false, {
        timeout: 5000, // Increased timeout for busy server scenarios
        retries: 2     // Retry once if timeout occurs
      });
      
      // Update the status with the fresh Whisper server data
      const updatedStatus = {
        ...status,
        whisperServer: freshWhisperStatus
      };
      
      // Use startTransition for non-urgent status updates
      startTransition(() => {
        setModelStatus(updatedStatus);
      });

      console.timeEnd('⏱️ Total checkModelStatus Duration');
    } catch (error) {
      console.timeEnd('⏱️ Total checkModelStatus Duration');
      startTransition(() => {
        setModelStatus({
          isConnected: false,
          classifierModel: '',
          processorModel: '',
          lastPing: Date.now(),
          latency: 0,
          whisperServer: {
            running: false,
            model: 'whisper-large-v3-turbo',
            port: 8001,
            lastChecked: Date.now(),
            error: error instanceof Error ? error.message : 'Status check failed'
          }
        });
      });
    }
  }, [lmStudioService, whisperServerService, setModelStatus]);

  // Initial model status check on mount (no recurring interval to avoid UI delays)
  useEffect(() => {
    console.log('🚀 Component mounted - performing initial model status check...');
    checkModelStatus();
  }, [checkModelStatus]);

  // Recurring model status monitoring - DISABLED to prevent interference with UI interactions
  // The automatic status checking was causing delays when interacting with notification bell
  // Status will be checked on demand or when explicitly refreshed
  // useEffect(() => {
  //   const interval = setInterval(checkModelStatus, 30000);
  //   return () => clearInterval(interval);
  // }, [checkModelStatus]);

  // Safety mechanism: Clear stuck states that block record button access
  useEffect(() => {
    // If we have completed results but are still in "actively working" state, fix it
    const hasCompletedResults = state.results && state.processingStatus === 'complete';
    const isStuckInActiveState = state.streaming || state.currentSessionId !== null;
    const shouldBeIdle = !recorder.isRecording && !state.isProcessing;

    if (hasCompletedResults && isStuckInActiveState && shouldBeIdle) {
      console.warn('🚨 FIXING STUCK "ACTIVELY WORKING" STATE - clearing to restore record button access', {
        streaming: state.streaming,
        currentSessionId: state.currentSessionId,
        processingStatus: state.processingStatus,
        hasResults: !!state.results
      });

      if (state.streaming) {
        actions.setStreaming(false);
        actions.clearStream();
      }

      if (state.currentSessionId !== null) {
        actions.setCurrentSessionId(null);
      }
    }
  }, [state.streaming, state.currentSessionId, state.results, state.processingStatus, recorder.isRecording, state.isProcessing, actions]);

  // Enhanced stuck state detection and auto-recovery
  useEffect(() => {
    // Only run validation checks periodically to avoid performance impact
    const validationInterval = setInterval(() => {
      // Validate state consistency
      actions.validateState();

      // Detect and recover from specific stuck state patterns
      const isStuckProcessing = state.processingStatus === 'processing' && state.isProcessing === false;
      const isStuckComplete = state.processingStatus === 'complete' && (state.streaming || state.currentSessionId);
      const hasCompletedResultsButActiveState = state.results && state.processingStatus === 'complete' && (state.streaming || state.currentSessionId) && !recorder.isRecording;

      // Check for background sessions still processing (don't recover if background work is happening)
      const hasBackgroundProcessing = Object.values(state.patientSessions).some(session =>
        session.status === 'processing' || session.status === 'transcribing'
      );

      if ((isStuckProcessing || isStuckComplete || hasCompletedResultsButActiveState) && !hasBackgroundProcessing) {
        console.warn('🚑 STUCK STATE DETECTED - Auto-recovering:', {
          isStuckProcessing,
          isStuckComplete,
          hasCompletedResultsButActiveState,
          processingStatus: state.processingStatus,
          isProcessing: state.isProcessing,
          streaming: state.streaming,
          currentSessionId: state.currentSessionId,
          hasResults: !!state.results
        });

        // Use enhanced recovery mechanisms to prevent UI freeze
        if (state.results && state.processingStatus === 'complete') {
          // For completed workflows with lingering indicators, force UI ready state
          console.log('🔧 Using forceUIReadyState for completed workflow with stuck indicators');
          actions.forceUIReadyState();
        } else {
          // Full recovery for other stuck states
          console.log('🔧 Using recoverStuckState for processing state inconsistencies');
          actions.recoverStuckState();
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(validationInterval);
  }, [state.processingStatus, state.isProcessing, state.streaming, state.currentSessionId, state.results, recorder.isRecording, actions]);

  // Note: Field ingestion overlay has been removed in favor of UnifiedPipelineProgress

  // Cleanup progress indicator timeout on unmount
  useEffect(() => {
    return () => {
      if (progressCleanupTimeoutRef.current) {
        clearTimeout(progressCleanupTimeoutRef.current);
        progressCleanupTimeoutRef.current = null;
      }
    };
  }, []);

  // Agent preloading and memory management
  useEffect(() => {
    let preloadingTimeoutId: ReturnType<typeof setTimeout>;
    let memoryOptimizationIntervalId: ReturnType<typeof setInterval>;
    
    // Preload critical agents immediately on app start
    const initializeAgents = async () => {
      try {
        console.log('🚀 Initializing critical agents for improved performance...');
        
        // Dynamic import for bundle optimization
        const { AgentFactory } = await import('@/services/AgentFactory');
        await AgentFactory.preloadCriticalAgents();
        
        // Delay preloading of common agents to avoid overwhelming startup
        preloadingTimeoutId = setTimeout(async () => {
          try {
            console.log('🔄 Background preloading of common agents...');
            await AgentFactory.preloadCommonAgents();
            console.log('✅ Background agent preloading completed');
          } catch (error) {
            console.warn('⚠️ Background preloading failed:', error);
          }
        }, 5000); // Wait 5 seconds after app start
        
      } catch (error) {
        console.warn('⚠️ Critical agent preloading failed:', error);
      }
    };

    // Memory optimization - run every 10 minutes
    const startMemoryOptimization = () => {
      memoryOptimizationIntervalId = setInterval(async () => {
        try {
          // Dynamic import for bundle optimization
          const { AgentFactory } = await import('@/services/AgentFactory');
          const memoryStats = AgentFactory.getMemoryEstimate();
          console.log(`📊 Agent memory usage: ${memoryStats.totalAgents} agents (~${memoryStats.estimatedMemoryMB}MB)`);
          
          // Optimize cache if we have too many agents loaded
          if (memoryStats.totalAgents > 8) {
            console.log('🧹 Optimizing agent cache due to high memory usage...');
            AgentFactory.optimizeCache();
          }
        } catch (error) {
          console.warn('⚠️ Memory optimization failed:', error);
        }
      }, 600000); // 10 minutes
    };

    // Initialize on component mount
    initializeAgents();
    startMemoryOptimization();

    // Cleanup on unmount
    return () => {
      if (preloadingTimeoutId) {
        clearTimeout(preloadingTimeoutId);
      }
      if (memoryOptimizationIntervalId) {
        clearInterval(memoryOptimizationIntervalId);
      }
    };
  }, []); // Run once on mount

  return (
    <div className="relative h-full max-h-full flex flex-col bg-surface-secondary overflow-hidden">
      {/* Header - Full Width Status Bar */}
      <div className="flex-shrink-0 bg-white  border-b border-gray-200">
        <StatusIndicator
          status={recorder.isRecording ? 'recording' : 'idle'}
          currentAgent={state.currentAgent || state.ui.activeWorkflow}
          isRecording={recorder.isRecording}
          modelStatus={state.modelStatus}
          onRefreshServices={checkModelStatus}
          onCompleteRecording={recorder.stopRecording}
          onCancelProcessing={handleCancel}
          onWorkflowSelect={handleWorkflowSelect}
          activeWorkflow={state.ui.activeWorkflow}
          voiceActivityLevel={state.voiceActivityLevel}
          recordingTime={recorder.recordingTime}
          isExtractingPatients={state.ui.isExtractingPatients}
          patientSessions={state.patientSessions}
          onRemoveSession={actions.removePatientSession}
          onClearAllSessions={actions.clearPatientSessions}
          onSessionSelect={handleSessionSelect}
          onResumeRecording={handleResumeRecording}
          onMarkSessionComplete={handleMarkSessionComplete}
          selectedSessionId={stableSelectedSessionId}
          currentSessionId={state.currentSessionId}
          onShowMetrics={() => actions.setSidePanel('metrics-dashboard')}
          onNewRecording={actions.clearRecording}
          showNewRecording={state.results?.trim().length > 0 || state.patientSessions.some(s => s.status === 'completed')}
        />
      </div>


      {/* Main Content Area - Single Column Layout */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto" ref={resultsRef} id="results-section">
          
          
          {/* Unified Recording Interface - Show both LiveAudioVisualizer and RecordingPromptCard together */}
          {recorder.isRecording && (
            <div className="flex flex-col space-y-4 p-4">
              {/* Top: Live Audio Visualizer with timer and stop button */}
              <div className="flex-shrink-0">
                <LiveAudioVisualizer
                  isRecording={recorder.isRecording}
                  voiceActivityLevel={recorder.voiceActivityLevel}
                  frequencyData={recorder.frequencyData}
                  audioLevelHistory={recorder.audioLevelHistory}
                  recordingTime={recorder.recordingTime}
                  activeDeviceInfo={recorder.activeDeviceInfo}
                  onStop={recorder.stopRecording}
                  className="min-h-0" // Allow shrinking in vertical layout
                />
              </div>
              
              {/* Bottom: Recording Prompt Card for reference (compact mode) */}
              {state.ui.activeWorkflow && hasRecordingPrompt(state.ui.activeWorkflow) && (
                <div className="flex-shrink-0">
                  <RecordingPromptCard
                    agentType={state.ui.activeWorkflow}
                    isVisible={true}
                    compactMode={true}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Transcription Processing Display - Show when actively transcribing/processing (not completed, not viewing sessions) */}
          {!recorder.isRecording &&
           (state.processingStatus === 'transcribing' || state.processingStatus === 'processing') &&
           state.transcription &&
           !state.streaming &&
           !state.displaySession.isDisplayingSession &&
           state.currentSessionId && ( // Only show for active sessions, not when viewing completed ones
            <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4">
              <div className="bg-white  rounded-lg border border-blue-200 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-2 h-2 bg-accent-violet rounded-full animate-pulse"></div>
                  <h3 className="text-lg font-semibold text-blue-800">
                    {state.processingStatus === 'transcribing' ? 'Transcribing Audio...' : 'Processing Report...'}
                  </h3>
                </div>
                {/* Use TranscriptionSection for consistent UI */}
                <TranscriptionSection
                  originalTranscription={state.transcription}
                  onTranscriptionCopy={(text) => {
                    navigator.clipboard.writeText(text);
                    ToastService.getInstance().success('Transcription copied to clipboard');
                  }}
                  onTranscriptionInsert={async (text) => {
                    try {
                      await chrome.runtime.sendMessage({
                        type: 'EXECUTE_ACTION',
                        action: 'insert-text',
                        data: { content: text }
                      });
                      ToastService.getInstance().success('Transcription inserted to EMR');
                    } catch (error) {
                      console.error('Failed to insert transcription:', error);
                      ToastService.getInstance().error('Failed to insert transcription');
                    }
                  }}
                  onTranscriptionEdit={(text) => {
                    // Update the transcription in state when edited during processing
                    actions.setTranscription(text);
                  }}
                  currentAgent={state.currentAgent}
                  isProcessing={state.processingStatus === 'processing'}
                  defaultExpanded={true}
                  className="border-0 bg-transparent"
                />
                {state.processingStatus === 'processing' && (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating {state.currentAgent} report...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Medical Review Section */}
          {state.reviewData && (
            <div className="flex-shrink-0 bg-white  border-b border-gray-200">
              <AIReviewSection 
                onQuickAction={async (actionId: string, data?: any) => {
                  console.log('🔧 Quick action:', actionId, data);
                }}
                processingAction=""
              />
            </div>
          )}
          
          {/* Patient Education Config Card - Show in main content area */}
          {overlayState.patientEducation && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <PatientEducationConfigCard
                isVisible={overlayState.patientEducation}
                onClose={() => {
                  actions.closeOverlay('patient-education');
                  actions.setUIMode('idle', { sessionId: null, origin: 'user' });
                }}
                isGenerating={state.isProcessing && state.currentAgent === 'patient-education'}
                pipelineProgress={state.pipelineProgress}
                processingStartTime={state.processingStartTime}
                onGenerate={async (input) => {
                  try {
                    // Create a session for this Patient Education generation
                    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                    const patientInfo = input.patientData || state.currentPatientInfo || {
                      name: 'Patient Education Session',
                      id: `PE-${Date.now()}`,
                      dob: '',
                      age: '',
                      extractedAt: Date.now()
                    };

                    const patientSession: PatientSession = {
                      id: sessionId,
                      patient: patientInfo,
                      transcription: '', // No audio transcription for Patient Education
                      results: '',
                      agentType: 'patient-education',
                      agentName: 'Patient Education & Lifestyle Medicine',
                      timestamp: Date.now(),
                      status: 'processing',
                      completed: false,
                      processingStartTime: Date.now()
                    };

                    // Add the session to the timeline
                    actions.addPatientSession(patientSession);
                    actions.setCurrentSessionId(sessionId);

                    actions.setProcessing(true);
                    actions.setCurrentAgent('patient-education');
                    actions.setResults('');
                    actions.setErrors([]);
                    actions.setProcessingStartTime(Date.now());

                    // Close the config overlay immediately to show progress in session timeline only
                    actions.closeOverlay('patient-education');

                    // Initialize pipeline progress at AI Analysis stage (skip audio/transcription for Patient Education)
                    actions.setPipelineProgress({
                      stage: 'ai-analysis',
                      progress: 45,
                      stageProgress: 10,
                      details: 'Loading Patient Education agent',
                      modelName: 'MedGemma-27B'
                    });
                    actions.updatePatientSession(sessionId, {
                      pipelineProgress: {
                        stage: 'ai-analysis',
                        progress: 45,
                        stageProgress: 10,
                        details: 'Loading Patient Education agent',
                        modelName: 'MedGemma-27B'
                      }
                    });

                    // Import AgentFactory dynamically
                    const { AgentFactory } = await import('@/services/AgentFactory');

                    // Process with the Patient Education agent with progress tracking
                    console.log('🎓 Processing Patient Education with input:', input);
                    const result = await AgentFactory.processWithAgent(
                      'patient-education',
                      JSON.stringify(input),
                      undefined,
                      undefined,
                      {
                        sessionId,
                        onProgress: (phase: string, progress: number, details?: string) => {
                          console.log(`🎓 Patient Education Progress: ${phase} (${progress}%) - ${details || ''}`);

                          const clampedProgress = Math.max(0, Math.min(100, progress));
                          const pipelineProgress = 40 + (clampedProgress * 0.5); // Map 0-100% to 40-90% range

                          actions.updatePipelineProgress({
                            stage: 'ai-analysis',
                            progress: pipelineProgress,
                            stageProgress: clampedProgress,
                            details: details || phase || 'Generating lifestyle advice',
                            modelName: 'MedGemma-27B'
                          });

                          actions.updatePatientSession(sessionId, {
                            pipelineProgress: {
                              stage: 'ai-analysis',
                              progress: pipelineProgress,
                              stageProgress: clampedProgress,
                              details: details || phase || 'Generating lifestyle advice',
                              modelName: 'MedGemma-27B'
                            }
                          });
                        }
                      }
                    );

                    // Update pipeline progress - Generation/completion phase
                    actions.updatePipelineProgress({
                      stage: 'generation',
                      progress: 95,
                      stageProgress: 50,
                      details: 'Formatting education plan'
                    });

                    // Update the session with results and education data
                    const processingTime = Date.now() - (patientSession.processingStartTime || Date.now());
                    actions.updatePatientSession(sessionId, {
                      results: result.content,
                      educationData: result.educationData, // Store structured JSON metadata and letter
                      status: 'completed',
                      completed: true,
                      processingTime,
                      completedTime: Date.now(),
                      pipelineProgress: {
                        stage: 'generation',
                        progress: 100,
                        stageProgress: 100,
                        details: 'Complete'
                      }
                    });

                    // Store education data in state for immediate display (not just session)
                    actions.setEducationData(result.educationData);

                    // Overlay already closed at start of processing
                    // Use atomic completion to ensure consistent state management
                    actions.completeProcessingAtomic(sessionId, result.content);
                    console.log('✅ Patient Education generation completed');
                  } catch (error) {
                    console.error('❌ Patient Education generation failed:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);

                    // Update session status to error if we have a sessionId
                    if (state.currentSessionId) {
                      actions.updatePatientSession(state.currentSessionId, {
                        status: 'error',
                        completed: true,
                        errors: [errorMessage]
                      });
                    }

                    actions.setErrors([`Patient Education generation failed: ${errorMessage}`]);
                    actions.setProcessingStatus('idle');
                    actions.setProcessing(false);
                  }
                }}
              />
            </div>
          )}

          {/* Session Loading State - Show when session selected but no results loaded and not completed, and not already displaying session */}
          {stableSelectedSessionId && !state.results && !state.streaming && !state.isProcessing && state.processingStatus !== 'complete' && !state.displaySession.isDisplayingSession && (
            <div className="flex-1 min-h-0 flex items-center justify-center p-8">
              <div className="max-w-md text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Loading Session</h3>
                  <p className="text-gray-600">
                    {(() => {
                      const session = state.patientSessions.find(s => s.id === stableSelectedSessionId);
                      if (session) {
                        return `Loading ${session.patient.name}'s ${session.agentType} session...`;
                      }
                      return 'Loading session data...';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Results Panel - Show when session selected, streaming, processing, or completed with results */}
          {(stableSelectedSessionId || state.streaming || state.isProcessing || (state.results && state.processingStatus === 'complete')) && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {(() => {
                const displayData = getCurrentDisplayData();
                return (
                  <OptimizedResultsPanel
                    results={displayData.results}
                    resultsSummary={displayData.summary || ''}
                    warnings={state.ui.warnings}
                    errors={state.ui.errors}
                    agentType={displayData.agent || null}
                    onCopy={handleCopy}
                    onInsertToEMR={(text: string, targetField?: string) => { handleInsertToEMR(text, targetField, displayData.agent || null); }}
                    originalTranscription={displayData.transcription}
                    onTranscriptionCopy={handleCopy}
                    onTranscriptionInsert={(text: string) => { handleInsertToEMR(text, undefined, displayData.agent || null); }}
                    onTranscriptionEdit={handleTranscriptionEdit}
                    transcriptionSaveStatus={transcriptionSaveStatus}
                    onAgentReprocess={displayData.isDisplayingSession ? undefined : handleAgentReprocess}
                    approvalState={displayData.isDisplayingSession
                      ? {
                          status: 'pending' as const,
                          originalText: displayData.transcription || '',
                          currentText: displayData.transcription || '',
                          hasBeenEdited: false
                        }
                      : state.transcriptionApproval}
                    onTranscriptionApprove={displayData.isDisplayingSession
                      ? (status) => {
                          console.log(`🧠 TAVI workup transcription approval for completed session:`, {
                            status,
                            sessionId: (displayData.isDisplayingSession ? displayData.patientInfo?.name : null) || 'unknown',
                            transcriptionLength: displayData.transcription?.length || 0
                          });
                          // For completed sessions, we can still collect approval data for training
                          handleTranscriptionApproval(status);
                        }
                      : handleTranscriptionApproval}
                missingInfo={displayData.isDisplayingSession ? null : state.missingInfo}
                onReprocessWithAnswers={displayData.isDisplayingSession ? undefined : handleReprocessWithMissingInfo}
                onDismissMissingInfo={displayData.isDisplayingSession ? undefined : () => actions.clearMissingInfo()}
                currentAgent={displayData.agent}
                isProcessing={displayData.isDisplayingSession ? false : state.isProcessing}
                audioBlob={displayData.isDisplayingSession ? null : currentAudioBlobRef.current}
                transcriptionTime={displayData.isDisplayingSession ? null : state.transcriptionTime}
                agentProcessingTime={displayData.isDisplayingSession ? null : state.agentProcessingTime}
                totalProcessingTime={displayData.isDisplayingSession ? (displayData.processingTime || null) : state.totalProcessingTime}
                processingStatus={displayData.processingStatus}
                currentAgentName={displayData.agentName}
                selectedSessionId={displayData.isDisplayingSession ? displayData.patientInfo?.name || 'Unknown' : stableSelectedSessionId}
                selectedPatientName={displayData.patientInfo?.name || stableSelectedPatientName}
                patientVersion={displayData.isDisplayingSession ? null : state.patientVersion}
                isGeneratingPatientVersion={displayData.isDisplayingSession ? false : state.isGeneratingPatientVersion}
                onGeneratePatientVersion={displayData.isDisplayingSession ? undefined : handleGeneratePatientVersion}
                streaming={displayData.isDisplayingSession ? false : !!state.streaming}
                streamBuffer={displayData.isDisplayingSession ? '' : state.streamBuffer || ''}
                ttftMs={displayData.isDisplayingSession ? null : state.ttftMs ?? null}
                onStopStreaming={displayData.isDisplayingSession ? undefined : stopStreaming}
                processingProgress={displayData.isDisplayingSession ? undefined : (
                  typeof state.ui.processingProgress === 'number'
                    ? { phase: 'processing', progress: state.ui.processingProgress, details: undefined }
                    : state.ui.processingProgress
                )}
                taviStructuredSections={displayData.isDisplayingSession ? displayData.taviStructuredSections : state.taviStructuredSections}
                educationData={displayData.isDisplayingSession ? displayData.educationData : state.educationData}
                pipelineProgress={displayData.isDisplayingSession ? null : state.pipelineProgress}
                processingStartTime={displayData.isDisplayingSession ? null : state.processingStartTime}
                  />
                );
              })()}
            </div>
          )}
          
          {/* Default State - Ready for Recording */}
          {!state.displaySession.isDisplayingSession && !recorder.isRecording && !state.streaming && !stableSelectedSessionId && !overlayState.patientEducation && !state.isProcessing && !(state.results && state.processingStatus === 'complete') && (
            <div className="flex-1 min-h-0 flex items-center justify-center p-8">
              <div className="max-w-md text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900">Ready to Record</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Select a workflow below to start recording for your next patient. 
                    Recordings will process in the background, allowing you to continue with other patients.
                  </p>
                </div>

                {/* Background Sessions Status */}
                {state.patientSessions.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-900">Background Processing</span>
                    </div>
                    <p className="text-xs text-blue-800">
                      {state.patientSessions.filter(s => ['transcribing', 'processing'].includes(s.status)).length} sessions processing, {' '}
                      {state.patientSessions.filter(s => s.status === 'completed').length} completed. 
                      Click the notification bell to view results.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - Quick Actions */}
        <div className="flex-shrink-0 bg-white  border-t border-gray-200 p-4">
          <QuickActions
            onQuickAction={async (actionId, data) => {
              console.log('🔧 Quick action triggered:', actionId, data);
              
              try {
                // Handle screenshot annotation action
                if (actionId === 'annotate-screenshots') {
                  console.log('📸 Opening screenshot annotation modal');
                  actions.openOverlay('screenshot-annotation');
                  actions.setUIMode('configuring', { sessionId: state.selectedSessionId, origin: 'user' });
                  return;
                }

                // Handle BP Diary Importer action
                if (actionId === 'bp-diary-importer') {
                  console.log('🩺 Opening BP Diary Importer');
                  actions.openOverlay('bp-diary-importer');
                  actions.setUIMode('configuring', { sessionId: state.selectedSessionId, origin: 'user' });
                  return;
                }
                
                // Handle patient education - show configuration card
                if (actionId === 'patient-education') {
                  if (data?.type === 'show-config') {
                    console.log('🎓 Showing Patient Education configuration card');
                    actions.openOverlay('patient-education');
                    actions.setUIMode('configuring', { sessionId: state.selectedSessionId, origin: 'user' });
                    return;
                  }
                }
                
                // Handle bloods prepare-modal action (opens modal before dictation)
                if (actionId === 'bloods' && data?.type === 'prepare-modal') {
                  console.log('🩸 Preparing bloods modal for dictation...');
                  await chrome.runtime.sendMessage({
                    type: 'EXECUTE_ACTION',
                    action: 'bloods',
                    data: {} // Open modal without content
                  });
                  console.log('✅ Bloods modal opened for dictation');
                  return;
                }
                
                // Handle EMR field actions
                if (['investigation-summary', 'background', 'medications', 'social-history', 'bloods', 'bloods-insert', 'imaging', 'quick-letter', 'appointment-wrap-up', 'profile-photo', 'create-task'].includes(actionId)) {
                  const messageData: any = {};

                  // Show field ingestion overlay for data extraction actions
                  if (['investigation-summary', 'background', 'medications', 'social-history'].includes(actionId) && data?.type !== 'manual') {
                    console.log(`🔧 TAVI Ingestion: Showing field ingestion overlay for ${actionId}`);
                    actions.openOverlay('field-ingestion');
                    actions.setUIMode('processing', { sessionId: state.selectedSessionId, origin: 'auto' });
                  }

                  // If we have results and it's not a manual type request, include the content
                  if (state.results && state.results.trim().length > 0 && data?.type !== 'manual') {
                    messageData.content = state.results;
                    console.log('🔧 Sending content to EMR field:', actionId);
                  } else {
                    console.log('🔧 Opening EMR field for manual entry:', actionId);
                  }

                  await chrome.runtime.sendMessage({
                    type: 'EXECUTE_ACTION',
                    action: actionId,
                    data: messageData
                  });

                  // Clear field ingestion overlay after action completes
                  if (['investigation-summary', 'background', 'medications', 'social-history'].includes(actionId)) {
                    console.log(`🔧 TAVI Ingestion: Clearing field ingestion overlay after ${actionId}`);
                    setTimeout(() => {
                      actions.closeOverlay('field-ingestion');
                    }, 1500); // Give time for the extraction to complete
                  }

                  console.log('✅ Quick action completed:', actionId);
                } else if (actionId === 'ai-medical-review') {
                  // Handle AI Medical Review processing
                  console.log('🤖 Processing AI Medical Review with data:', data);
                  
                  if (data?.formattedInput) {
                    // Set processing state
                    actions.setProcessing(true);
                    actions.setCurrentAgent('ai-medical-review');
                    actions.setResults('');
                    actions.setErrors([]);
                    
                    try {
                      // Import AgentFactory dynamically to avoid circular dependencies
                      const { AgentFactory } = await import('@/services/AgentFactory');
                      
                      // Process with the AI Medical Review agent
                      console.log('🤖 Processing with BatchPatientReviewAgent...');
                      const result = await AgentFactory.processWithAgent('ai-medical-review', data.formattedInput);
                      
                      // Update state with results
                      actions.setMissingInfo(result.missingInfo || null);
                      // Use atomic completion to ensure consistent state management
                      actions.completeProcessingAtomic(state.currentSessionId || 'ai-review-session', result.content);

                      console.log('✅ AI Medical Review completed successfully');
                    } catch (error) {
                      console.error('❌ AI Medical Review processing failed:', error);
                      actions.setErrors([`AI Medical Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
                      actions.setProcessingStatus('idle');
                      actions.setProcessing(false);
                    }
                  } else {
                    console.error('❌ AI Medical Review: No formatted input provided');
                    actions.setErrors(['AI Medical Review failed: No patient data available']);
                    actions.setProcessingStatus('idle');
                    actions.setProcessing(false);
                  }
                } else if (actionId === 'batch-ai-review' && data?.type === 'show-modal') {
                  // Handle batch AI review modal trigger
                  console.log('👥 Batch AI Review: Triggering patient selection modal');
                  actions.openOverlay('patient-selection');
                  actions.setUIMode('batch', { sessionId: null, origin: 'user' });
                } else {
                  console.log('ℹ️ Unhandled quick action:', actionId);
                }
              } catch (error) {
                console.error('❌ Quick action failed:', actionId, error);
                // Show user-friendly error feedback
                actions.setErrors([`Failed to execute ${actionId}: ${error instanceof Error ? error.message : 'Unknown error'}`]);
              }
            }}
            onStartWorkflow={(workflowId) => handleWorkflowSelect(workflowId as AgentType)}
            isFooter={true}
          />
        </div>
      </div>

      {/* Overlay Modals and Components */}
      
      {/* Patient Selection Modal for batch processing */}
      {overlayState.patientSelection && (
        <PatientSelectionModal
          isOpen={overlayState.patientSelection}
          onClose={() => {
            actions.closeOverlay('patient-selection');
            actions.setUIMode('idle', { sessionId: null, origin: 'user' });
          }}
          onStartReview={() => {
            console.log('🔄 Starting patient review');
          }}
          calendarData={state.ui.calendarData}
          isExtracting={state.ui.isExtractingPatients}
          extractError={state.ui.extractError}
        />
      )}

      {/* Screenshot Annotation Modal */}
      {overlayState.screenshotAnnotation && (
        <ScreenshotAnnotationModal
          isOpen={overlayState.screenshotAnnotation}
          onClose={() => {
            actions.closeOverlay('screenshot-annotation');
            actions.setUIMode('idle', { sessionId: null, origin: 'user' });
          }}
        />
      )}

      {/* BP Diary Importer Modal */}
      {overlayState.bpDiaryImporter && (
        <BPDiaryImporter
          isOpen={overlayState.bpDiaryImporter}
          onClose={() => {
            actions.closeOverlay('bp-diary-importer');
            actions.setUIMode('idle', { sessionId: null, origin: 'user' });
          }}
        />
      )}

      {/* Patient Mismatch Confirmation Modal */}
      {overlayState.patientMismatch && (
        <PatientMismatchConfirmationModal
          isOpen={overlayState.patientMismatch}
          comparison={state.patientMismatchData.comparison}
          textToInsert={state.patientMismatchData.textToInsert}
          onConfirm={state.patientMismatchData.onConfirm || (() => {})}
          onCancel={state.patientMismatchData.onCancel || (() => {})}
          onRefreshEMR={async () => {
            // Refresh EMR patient data and re-validate
            try {
              console.log('🔄 Refreshing EMR patient data...');
              const freshPatientData = await extractPatientData();
              if (freshPatientData?.name) {
                actions.setCurrentPatientInfo({
                  ...state.currentPatientInfo,
                  ...freshPatientData
                } as PatientInfo);
                console.log('✅ EMR patient data refreshed:', freshPatientData.name);
              }
            } catch (error) {
              console.error('❌ Failed to refresh EMR patient data:', error);
            }
          }}
        />
      )}
      
      {/* Recording Prompts are now integrated into the unified recording interface above */}


      {/* Unified Pipeline Progress is now shown within OptimizedResultsPanel to prevent UI overlap */}
      
      {/* Metrics Dashboard */}
      <MetricsDashboard 
        isOpen={metricsDashboardOpen}
        onClose={() => actions.clearSidePanel()}
      />
      
      {/* Optimization Panel */}
      <OptimizationPanel
        isOpen={isOptimizationPanelOpen}
        onClose={() => setIsOptimizationPanelOpen(false)}
      />
      

      {/* Toast Notifications */}
      <ToastContainer />
      </div>
  );
});

OptimizedAppContent.displayName = 'OptimizedAppContent';

OptimizedApp.displayName = 'OptimizedApp';

export default OptimizedApp;
