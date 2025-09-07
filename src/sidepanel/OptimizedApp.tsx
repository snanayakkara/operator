/**
 * OptimizedApp.tsx - Main Application Component with Audio Device Support
 * 
 * Comprehensive medical dictation application with AI-powered transcription,
 * specialized medical agents, EMR integration, and device management.
 * Optimized for performance with useReducer state management and React.memo.
 */

import React, { useEffect, useCallback, useRef, memo, startTransition } from 'react';
import './styles/globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AudioDeviceProvider, useAudioDeviceContext } from '@/contexts/AudioDeviceContext';
import { OptimizedResultsPanel } from './components/results/OptimizedResultsPanel';
import { QuickActions } from './components/QuickActions';
import { AIReviewSection } from './components/AIReviewSection';
import { StatusIndicator } from './components/StatusIndicator';
import { ToastContainer } from './components/ToastContainer';
import { PatientSelectionModal } from './components/PatientSelectionModal';
import { PatientEducationConfigCard } from './components/PatientEducationConfigCard';
import { FieldIngestionOverlay } from './components/FieldIngestionOverlay';
import { ProcessingPhaseIndicator } from './components/ProcessingPhaseIndicator';
import { SessionsPanel } from './components/SessionsPanel';
import { RecordingPromptCard } from './components/RecordingPromptCard';
import { hasRecordingPrompt } from '@/config/recordingPrompts';
import { MetricsDashboard } from './components/MetricsDashboard';
import { LiveAudioVisualizer } from './components/LiveAudioVisualizer';
import { ScreenshotAnnotationModal } from './components/ScreenshotAnnotationModal';
import { useAppState } from '@/hooks/useAppState';
import { NotificationService } from '@/services/NotificationService';
import { LMStudioService } from '@/services/LMStudioService';
import { WhisperServerService } from '@/services/WhisperServerService';
import { BatchAIReviewOrchestrator } from '@/orchestrators/BatchAIReviewOrchestrator';
import { getTargetField, getFieldDisplayName, supportsFieldSpecificInsertion } from '@/config/insertionConfig';
import { AgentType, PatientSession, PatientInfo, FailedAudioRecording, BatchAIReviewInput } from '@/types/medical.types';
import { PerformanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { useRecorder } from '@/hooks/useRecorder';
import { ToastService } from '@/services/ToastService';
import { logger } from '@/utils/Logger';

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
  const { state, actions } = useAppState();
  const audioDeviceContext = useAudioDeviceContext();
  const activeWorkflowRef = useRef<AgentType | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  
  // Store current audio blob for failed transcription storage
  const currentAudioBlobRef = useRef<Blob | null>(null);
  const currentRecordingTimeRef = useRef<number>(0);
  
  // AbortController refs for cancellation
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const processingAbortRef = useRef<AbortController | null>(null);
  
  // Stable service instances using useRef to prevent re-creation on renders
  const lmStudioService = useRef(LMStudioService.getInstance()).current;
  const whisperServerService = useRef(WhisperServerService.getInstance()).current;
  const batchOrchestrator = useRef<BatchAIReviewOrchestrator | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize BatchAIReviewOrchestrator only once using lazy initialization
  const getBatchOrchestrator = useCallback(() => {
    if (!batchOrchestrator.current) {
      batchOrchestrator.current = new BatchAIReviewOrchestrator();
    }
    return batchOrchestrator.current;
  }, []);

  // Store failed audio recording for troubleshooting
  const storeFailedAudioRecording = useCallback((
    audioBlob: Blob, 
    agentType: AgentType, 
    errorMessage: string, 
    transcriptionAttempt?: string,
    recordingTime?: number
  ) => {
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

    console.log('📱 Stored failed audio recording:', {
      id: failedRecording.id,
      agentType,
      errorMessage,
      fileSize: audioBlob.size,
      duration: failedRecording.metadata.duration
    });
  }, [actions, state.failedAudioRecordings]);

  // Clear failed recordings
  const clearFailedRecordings = useCallback(() => {
    actions.setFailedRecordings([]);
    console.log('🗑️ Cleared all failed audio recordings');
  }, [actions]);
  
  // Handle recording completion and processing
  // Separate function to process a session in the background
  const processSessionInBackground = useCallback(async (sessionId: string, audioBlob: Blob, workflowId: AgentType) => {
    console.log('🔄 Starting background processing for session:', sessionId);
    
    // Create dedicated AbortControllers for this session
    const sessionTranscriptionAbort = new AbortController();
    const sessionProcessingAbort = new AbortController();
    
    try {
      // Update session with transcription start time (status already set to transcribing in handleRecordingComplete)
      actions.updatePatientSession(sessionId, {
        transcriptionStartTime: Date.now()
      });
      
      // Transcribe audio with performance monitoring
      console.log('🔄 Transcribing session:', sessionId);
      const transcriptionStartTime = Date.now();
      const performanceMonitor = PerformanceMonitoringService.getInstance();
      
      const transcriptionResult = await lmStudioService.transcribeAudio(
        audioBlob,
        sessionTranscriptionAbort.signal,
        workflowId
      );
      
      const transcriptionDuration = Date.now() - transcriptionStartTime;
      performanceMonitor.recordMetrics('transcription', transcriptionDuration, {
        agentType: workflowId,
        audioSize: audioBlob.size
      });
      
      console.log('✅ Transcription complete for session:', sessionId);
      console.log('📝 Transcription result:', transcriptionResult.substring(0, 200) + (transcriptionResult.length > 200 ? '...' : ''));
      
      // Validate transcription before processing
      const cleanTranscription = transcriptionResult.trim();
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
        
        // Store the failed recording for troubleshooting
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
        
        // Update session with error state
        actions.updatePatientSession(sessionId, {
          transcription: cleanTranscription,
          status: 'error',
          errors: [`Audio transcription failed: ${
            isTranscriptionEmpty ? 'No audio detected. Please ensure your microphone is working and try again.' :
            isTranscriptionTooShort ? 'Recording too short. Please record for at least 3-5 seconds.' :
            isTranscriptionPlaceholder ? 'Transcription service unavailable. Please check if the Whisper server is running.' :
            'Transcription service error. Please try again or check the server status.'
          }`],
          completedTime: Date.now()
        });
        
        // Update main UI
        actions.setTranscription(cleanTranscription);
        actions.setErrors([`Audio transcription failed: ${
          isTranscriptionEmpty ? 'No audio detected. Please ensure your microphone is working and try again.' :
          isTranscriptionTooShort ? 'Recording too short. Please record for at least 3-5 seconds.' :
          isTranscriptionPlaceholder ? 'Transcription service unavailable. Please check if the Whisper server is running.' :
          'Transcription service error. Please try again or check the server status.'
        }`]);
        actions.setProcessingStatus('error');
        
        console.log('🚫 Skipping agent processing due to transcription validation failure');
        return;
      }
      
      // Transcription is valid - proceed with processing
      console.log('✅ Transcription validation passed, proceeding with agent processing');
      
      // Update session with transcription and move to processing
      actions.updatePatientSession(sessionId, {
        transcription: transcriptionResult,
        status: 'processing',
        processingStartTime: Date.now()
      });
      
      // Update main UI to show processing phase
      actions.setTranscription(transcriptionResult);
      actions.setProcessingStatus('processing');
      
      // Process with selected agent with performance monitoring
      console.log('🔄 Processing with agent for session:', sessionId, workflowId);
      const processingStartTime = Date.now();
      
      // Import AgentFactory dynamically to optimize bundle splitting
      const { AgentFactory } = await import('@/services/AgentFactory');
      
      const result = await AgentFactory.processWithAgent(
        workflowId,
        transcriptionResult,
        undefined,
        sessionProcessingAbort.signal,
        { skipNotification: true } // We'll handle notification manually with patient info
      );
      
      const processingDuration = Date.now() - processingStartTime;
      performanceMonitor.recordMetrics('agent-processing', processingDuration, {
        agentType: workflowId
      });
      
      console.log('✅ Agent processing complete for session:', sessionId);
      
      // Complete the session with results
      actions.updatePatientSession(sessionId, {
        results: result.content,
        summary: result.summary || '', // Store summary for dual card display
        agentName: result.agentName,
        status: 'completed',
        completed: true,
        completedTime: Date.now(),
        processingTime: result.processingTime,
        warnings: result.warnings,
        errors: result.errors
      });

      // Record completion metrics
      performanceMonitor.recordMetrics('complete', Date.now() - transcriptionStartTime, {
        agentType: workflowId
      });
      
      // Surface output to main results panel for immediate visibility
      actions.setTranscription(transcriptionResult);
      actions.setResults(result.content);
      // Store missing info (if any) for interactive completion
      actions.setMissingInfo(result.missingInfo || null);

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
      
      // Extract and set AI-generated summary (especially for QuickLetter)
      if (result.summary && result.summary.trim()) {
        logger.debug('Setting AI-generated summary', { component: 'summary', length: result.summary.length });
        actions.setAiGeneratedSummary(result.summary);
      } else {
        // Clear any previous AI-generated summary
        actions.setAiGeneratedSummary(undefined);
      }
      
      actions.setCurrentAgent(workflowId);
      
      // Set timing data for display components - this was missing!
      // Calculate recording duration from session timestamps
      const currentSession = state.patientSessions.find(s => s.id === sessionId);
      const recordingDuration = currentSession?.recordingStartTime ? 
        transcriptionStartTime - currentSession.recordingStartTime : 0;
      
      actions.setTimingData({
        recordingTime: recordingDuration,
        transcriptionTime: transcriptionDuration,
        agentProcessingTime: processingDuration,
        totalProcessingTime: recordingDuration + transcriptionDuration + processingDuration,
        processingStartTime: transcriptionStartTime // for consistency
      });
      
      actions.setProcessingStatus('complete');
      
      // Turn off processing state after completion
      actions.setProcessing(false);
      
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
      } catch (error) {
        console.warn('Failed to send completion notification:', error);
      }
      
      // Auto-scroll to results panel (motion-safe)
      try {
        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(() => {
          const target = resultsRef.current || document.getElementById('results-section');
          if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
          }
        }, 50);
      } catch {}
      
    } catch (error: any) {
      console.error('❌ Background processing failed for session:', sessionId, error);
      
      // Turn off processing state on error
      actions.setProcessing(false);
      actions.setProcessingStatus('idle');
      
      // Update session to error state
      if (error.name === 'AbortError') {
        actions.updatePatientSession(sessionId, {
          status: 'cancelled',
          errors: ['Processing was cancelled']
        });
      } else {
        actions.updatePatientSession(sessionId, {
          status: 'error',
          errors: [error.message || 'Processing failed']
        });
        
        // Show error in main UI
        actions.setErrors([error.message || 'Processing failed']);
      }
      
      // Store failed recording for troubleshooting
      storeFailedAudioRecording(
        audioBlob,
        workflowId,
        error.message || 'Background processing failed',
        '',
        0
      );
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

    // Update session status to transcribing immediately when recording stops
    actions.updatePatientSession(currentSessionId, {
      status: 'transcribing',
      audioBlob: audioBlob
    });

    // Keep processing state active to show progress in main area
    actions.setProcessing(true);
    actions.setProcessingStatus('transcribing');
    actions.setCurrentAgent(workflowId);
    
    // Clear recording-specific state but maintain processing visibility
    actions.setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    actions.setActiveWorkflow(null);
    activeWorkflowRef.current = null;
    
    // Start background processing (non-blocking)
    processSessionInBackground(currentSessionId, audioBlob, workflowId);
    
    console.log('🚀 Background processing started for session:', currentSessionId, '- ready for new recordings!');
  }, [actions, processSessionInBackground, state.ui.isCancelling, state.currentSessionId]);

  // Session selection handler - loads selected session data into display state
  const handleSessionSelect = useCallback((session: PatientSession) => {
    console.log('📋 Selected patient session:', session.patient.name, 'with status:', session.status);
    
    // Set the selected session ID
    actions.setSelectedSessionId(session.id);
    
    // Load the session's data into the display state
    if (session.transcription) {
      actions.setTranscription(session.transcription);
    }
    
    if (session.results) {
      actions.setResults(session.results);
    }
    
    if (session.summary) {
      actions.setAiGeneratedSummary(session.summary);
    }
    
    // Set the agent type that was used for this session
    if (session.agentType) {
      actions.setCurrentAgent(session.agentType);
      actions.setCurrentAgentName(session.agentName || session.agentType);
    }
    
    // Update patient info
    actions.setCurrentPatientInfo(session.patient);
    
    // Clear any active recording state to avoid conflicts
    actions.setActiveWorkflow(null);
    actions.setProcessingStatus('complete');
    actions.clearMissingInfo();
    
    console.log('✅ Session data loaded for patient:', session.patient.name);
  }, [actions]);

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
  const getDisplaySummary = useCallback((results: string, aiSummary?: string): string => {
    // Prioritize AI-generated summary from agents like QuickLetter
    if (aiSummary && aiSummary.trim()) {
      return aiSummary.trim();
    }
    
    // Fall back to JavaScript-generated summary for other agents
    return generateSmartSummary(results);
  }, [generateSmartSummary]);

  // Initialize recorder with optimized callbacks
  const recorder = useRecorder({
    onRecordingComplete: handleRecordingComplete,
    onVoiceActivityUpdate: useCallback((level: number, frequencyData: number[]) => {
      // Use startTransition for non-urgent voice activity updates
      startTransition(() => {
        actions.setVoiceActivity(level, frequencyData);
      });
    }, [actions]),
    onRecordingTimeUpdate: useCallback((time: number) => {
      currentRecordingTimeRef.current = time;
    }, []),
    getMicrophoneId: () => audioDeviceContext.selectedMicrophoneId
  });

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
  const handleWorkflowSelect = useCallback(async (workflowId: AgentType) => {
    console.log('🎯 Workflow selected:', workflowId);
    
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
    
    // Clear any selected session when starting a new recording
    if (state.selectedSessionId) {
      console.log('🔄 Clearing selected session view for new recording');
      actions.setSelectedSessionId(null);
    }
    
    // Count active sessions to check limits
    const activeSessions = state.patientSessions.filter(session => 
      ['recording', 'transcribing', 'processing'].includes(session.status)
    );
    const recordingSessions = state.patientSessions.filter(session => 
      session.status === 'recording'
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
      
      // Check if we already have a recording session (only one recording at a time)
      if (recordingSessions.length > 0) {
        actions.setErrors(['Another recording is already in progress. Please complete or cancel the current recording first.']);
        return;
      }
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
        recordingStartTime: Date.now()
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
        undefined,
        processingAbortRef.current?.signal
      );
      
      console.log('✅ Agent reprocessing completed');
      
      // Update results
      actions.setResults(result.content);
      actions.setMissingInfo(result.missingInfo || null);
      
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
      actions.setProcessingStatus('complete');
      actions.setProcessing(false);
      
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
        undefined,
        processingAbortRef.current?.signal
      );

      actions.setResults(result.content);
      actions.setMissingInfo(result.missingInfo || null);
      actions.setProcessingStatus('complete');
      actions.setProcessing(false);
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

  // EMR insertion with field-specific targeting
  const handleInsertToEMR = useCallback(async (text: string, targetField?: string) => {
    try {
      // Determine target field from agent type if not explicitly provided
      const currentAgentType = state.currentAgent || state.ui.activeWorkflow;
      const field = targetField || getTargetField(currentAgentType);
      
      if (field && supportsFieldSpecificInsertion(currentAgentType)) {
        // Field-specific insertion with modal opening + append
        console.log(`📝 Inserting to specific EMR field: ${field} (${getFieldDisplayName(field)})`);
        
        await chrome.runtime.sendMessage({
          type: 'EXECUTE_ACTION',
          action: field,
          data: { 
            content: text,
            insertMode: 'append' // New flag for append behavior
          }
        });
        
        console.log(`✅ Text inserted to ${getFieldDisplayName(field)} field with append mode`);
      } else {
        // Fallback to current generic insertion
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
    try {
      // Check both LMStudio and Whisper server status
      const status = await lmStudioService.checkConnection();
      
      // Ensure we have the most up-to-date Whisper server status
      // The checkConnection method already calls whisperServerService.checkServerStatus()
      // but we'll invalidate the cache to force a fresh check
      whisperServerService.invalidateCache();
      const freshWhisperStatus = await whisperServerService.checkServerStatus(true);
      
      // Update the status with the fresh Whisper server data
      const updatedStatus = {
        ...status,
        whisperServer: freshWhisperStatus
      };
      
      // Use startTransition for non-urgent status updates
      startTransition(() => {
        setModelStatus(updatedStatus);
      });
    } catch (error) {
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

  // Model status monitoring
  useEffect(() => {
    checkModelStatus();
    const interval = setInterval(checkModelStatus, 30000);
    return () => clearInterval(interval);
  }, [checkModelStatus]);

  // Recording state monitoring for prompt card
  useEffect(() => {
    if (recorder.isRecording && state.ui.activeWorkflow && hasRecordingPrompt(state.ui.activeWorkflow)) {
      actions.setRecordingPrompts(true);
    } else if (!recorder.isRecording) {
      actions.setRecordingPrompts(false);
    }
  }, [recorder.isRecording, state.ui.activeWorkflow]);

  // Agent preloading and memory management
  useEffect(() => {
    let preloadingTimeoutId: number;
    let memoryOptimizationIntervalId: number;
    
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
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-line-primary">
        <StatusIndicator 
          status={recorder.isRecording ? 'recording' : state.processingStatus}
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
          onShowMetrics={() => actions.setMetricsDashboard(true)}
          onNewRecording={actions.clearRecording}
          showNewRecording={state.results?.trim().length > 0 || state.patientSessions.some(s => s.status === 'completed')}
        />
      </div>


      {/* Main Content Area - Single Column Layout */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto" ref={resultsRef} id="results-section">
          
          {/* Unified Recording Interface - Show both LiveAudioVisualizer and RecordingPromptCard together */}
          {recorder.isRecording && !state.results && (
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
          
          {/* Transcription Processing Display - Show when transcribing/processing */}
          {!recorder.isRecording && (state.processingStatus === 'transcribing' || state.processingStatus === 'processing') && state.transcription && !state.results && (
            <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-blue-200 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-2 h-2 bg-accent-violet rounded-full animate-pulse"></div>
                  <h3 className="text-lg font-semibold text-blue-800">
                    {state.processingStatus === 'transcribing' ? 'Transcribing Audio...' : 'Processing Report...'}
                  </h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Transcription:</h4>
                  <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {state.transcription}
                  </div>
                </div>
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
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-line-primary">
              <AIReviewSection 
                onQuickAction={async (actionId: string, data?: any) => {
                  console.log('🔧 Quick action:', actionId, data);
                }}
                processingAction=""
              />
            </div>
          )}
          
          {/* Patient Education Config Card - Show in main content area */}
          {state.ui.showPatientEducationConfig && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <PatientEducationConfigCard
                isVisible={state.ui.showPatientEducationConfig}
                onClose={() => actions.setPatientEducationConfig(false)}
                isGenerating={state.isProcessing && state.currentAgent === 'patient-education'}
                onGenerate={async (input) => {
                  try {
                    actions.setProcessing(true);
                    actions.setCurrentAgent('patient-education');
                    actions.setResults('');
                    actions.setErrors([]);
                    
                    // Import AgentFactory dynamically
                    const { AgentFactory } = await import('@/services/AgentFactory');
                    
                    // Process with the Patient Education agent
                    console.log('🎓 Processing Patient Education with input:', input);
                    const result = await AgentFactory.processWithAgent('patient-education', JSON.stringify(input));
                    
                    actions.setResults(result.content);
                    actions.setPatientEducationConfig(false);
                    console.log('✅ Patient Education generation completed');
                  } catch (error) {
                    console.error('❌ Patient Education generation failed:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    actions.setErrors([`Patient Education generation failed: ${errorMessage}`]);
                  } finally {
                    actions.setProcessing(false);
                  }
                }}
              />
            </div>
          )}

          {/* Main Results Panel - Only show when we have actual results */}
          {(state.results && state.results.trim().length > 0) && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <OptimizedResultsPanel
                results={state.results}
                resultsSummary={state.aiGeneratedSummary || ''}
                warnings={state.ui.warnings}
                errors={state.ui.errors}
                agentType={state.currentAgent}
                onCopy={handleCopy}
                onInsertToEMR={handleInsertToEMR}
                originalTranscription={state.transcription}
                onTranscriptionCopy={handleCopy}
                onTranscriptionInsert={handleInsertToEMR}
                onAgentReprocess={handleAgentReprocess}
                missingInfo={state.missingInfo}
                onReprocessWithAnswers={handleReprocessWithMissingInfo}
                onDismissMissingInfo={() => actions.clearMissingInfo()}
                currentAgent={state.currentAgent}
                isProcessing={state.isProcessing}
                audioBlob={currentAudioBlobRef.current}
                transcriptionTime={state.transcriptionTime}
                agentProcessingTime={state.agentProcessingTime}
                totalProcessingTime={state.totalProcessingTime}
                processingStatus={state.processingStatus}
                currentAgentName={state.currentAgentName}
                selectedSessionId={state.selectedSessionId}
                selectedPatientName={
                  state.selectedSessionId 
                    ? state.patientSessions.find(s => s.id === state.selectedSessionId)?.patient.name 
                    : undefined
                }
                patientVersion={state.patientVersion}
                isGeneratingPatientVersion={state.isGeneratingPatientVersion}
                onGeneratePatientVersion={handleGeneratePatientVersion}
              />
            </div>
          )}
        </div>
        
        {/* Footer - Quick Actions */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-t border-line-primary p-4">
          <QuickActions
            onQuickAction={async (actionId, data) => {
              console.log('🔧 Quick action triggered:', actionId, data);
              
              try {
                // Handle screenshot annotation action
                if (actionId === 'annotate-screenshots') {
                  console.log('📸 Opening screenshot annotation modal');
                  actions.setScreenshotAnnotationModal(true);
                  return;
                }
                
                // Handle patient education - show configuration card
                if (actionId === 'patient-education') {
                  if (data?.type === 'show-config') {
                    console.log('🎓 Showing Patient Education configuration card');
                    actions.setPatientEducationConfig(true);
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
                      actions.setResults(result.content);
                      actions.setMissingInfo(result.missingInfo || null);
                      actions.setProcessing(false);
                      
                      console.log('✅ AI Medical Review completed successfully');
                    } catch (error) {
                      console.error('❌ AI Medical Review processing failed:', error);
                      actions.setErrors([`AI Medical Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
                      actions.setProcessing(false);
                    }
                  } else {
                    console.error('❌ AI Medical Review: No formatted input provided');
                    actions.setErrors(['AI Medical Review failed: No patient data available']);
                  }
                } else if (actionId === 'batch-ai-review' && data?.type === 'show-modal') {
                  // Handle batch AI review modal trigger
                  console.log('👥 Batch AI Review: Triggering patient selection modal');
                  actions.setPatientModal(true);
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
      {state.ui.showPatientSelectionModal && (
        <PatientSelectionModal
          isOpen={state.ui.showPatientSelectionModal}
          onClose={() => actions.setPatientModal(false)}
          onStartReview={() => {
            console.log('🔄 Starting patient review');
          }}
          calendarData={state.ui.calendarData}
          isExtracting={state.ui.isExtractingPatients}
          extractError={state.ui.extractError}
        />
      )}

      {/* Screenshot Annotation Modal */}
      {state.ui.showScreenshotAnnotationModal && (
        <ScreenshotAnnotationModal
          isOpen={state.ui.showScreenshotAnnotationModal}
          onClose={() => actions.setScreenshotAnnotationModal(false)}
        />
      )}
      
      {/* Recording Prompts are now integrated into the unified recording interface above */}
      
      
      {/* AI Medical Review Overlays - positioned relative to side panel */}
      <FieldIngestionOverlay
        isActive={state.ui.showFieldIngestionOverlay}
        onComplete={() => actions.setFieldIngestionOverlay(false)}
      />

      {/* Processing Phase Indicator - shown during AI processing */}
      {state.ui.showProcessingPhase && (
        <div className="absolute top-4 left-4 right-4 z-40">
          <ProcessingPhaseIndicator
            currentProgress={state.ui.processingProgress}
            isActive={state.ui.showProcessingPhase}
            startTime={state.ui.processingStartTime}
            agentType={state.currentAgent || undefined}
            transcriptionLength={state.transcription ? state.transcription.length : undefined}
            showTimeEstimate={true}
            onProcessingComplete={(actualTimeMs) => {
              // This will be called when processing completes
              console.log(`⏱️ Processing completed in ${actualTimeMs}ms`);
            }}
          />
        </div>
      )}
      
      {/* Metrics Dashboard */}
      <MetricsDashboard 
        isOpen={state.ui.showMetricsDashboard}
        onClose={() => actions.setMetricsDashboard(false)}
      />
      
      {/* Toast Notifications */}
      <ToastContainer />
      </div>
  );
});

OptimizedAppContent.displayName = 'OptimizedAppContent';

OptimizedApp.displayName = 'OptimizedApp';

export default OptimizedApp;
