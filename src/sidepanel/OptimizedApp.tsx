/**
 * Optimized App Component
 * 
 * Streamlined main application with:
 * - useReducer state management (replacing 20+ useState hooks)
 * - Memoized components for performance
 * - Voice activity throttling
 * - Optimized re-rendering patterns
 */

import React, { useEffect, useCallback, useRef, memo } from 'react';
import './styles/globals.css';
import { WorkflowButtons } from './components/WorkflowButtons';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { OptimizedResultsPanel } from './components/results/OptimizedResultsPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { QuickActions } from './components/QuickActions';
import { StatusIndicator } from './components/StatusIndicator';
import { ModelStatus } from './components/ModelStatus';
import { ErrorAlert } from './components/ErrorAlert';
import { ProcessingTimeDisplay } from './components/ProcessingTimeDisplay';
import { CancelButton } from './components/CancelButton';
import { PatientSelectionModal } from './components/PatientSelectionModal';
import { NewRecordingButton } from './components/NewRecordingButton';
import { SessionsPanel } from './components/SessionsPanel';
import { CheckCircle, Menu, ChevronDown } from 'lucide-react';
import type { AgentType, ProcessingStatus, FailedAudioRecording, PatientAppointment } from '@/types/medical.types';
import { useAppState } from '@/hooks/useAppState';

import { LMStudioService } from '@/services/LMStudioService';
import { WhisperServerService } from '@/services/WhisperServerService';
import { AgentFactory } from '@/services/AgentFactory';
import { BatchAIReviewOrchestrator } from '@/orchestrators/BatchAIReviewOrchestrator';
import { NotificationService } from '@/services/NotificationService';
import { AusMedicalReviewAgent } from '@/agents/specialized/AusMedicalReviewAgent';
import { useRecorder } from '@/hooks/useRecorder';

const OptimizedApp: React.FC = memo(() => {
  
  // Use optimized state management
  const { state, actions } = useAppState();
  const activeWorkflowRef = useRef<AgentType | null>(null);
  
  // Store current audio blob for failed transcription storage
  const currentAudioBlobRef = useRef<Blob | null>(null);
  const currentRecordingTimeRef = useRef<number>(0);
  
  // AbortController refs for cancellation
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const processingAbortRef = useRef<AbortController | null>(null);
  
  const lmStudioService = LMStudioService.getInstance();
  const whisperServerService = WhisperServerService.getInstance();
  const batchOrchestrator = useRef<BatchAIReviewOrchestrator | null>(null);
  
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
  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    // Store current audio blob for potential failed transcription storage
    currentAudioBlobRef.current = audioBlob;
    
    // Check if cancellation is in progress
    if (state.ui.isCancelling) {
      console.log('🛑 Recording completed but cancellation in progress - ignoring');
      actions.setCancelling(false);
      return;
    }

    // Get active workflow - prioritize ref for reliability
    const workflowId = activeWorkflowRef.current || state.ui.activeWorkflow;
    if (!workflowId) {
      console.error('❌ No active workflow selected');
      actions.setErrors(['No workflow selected. Please select a workflow type before recording.']);
      return;
    }

    try {
      // Set up transcription AbortController
      transcriptionAbortRef.current = new AbortController();
      
      // Transcribe audio with cancellation support
      console.log('🔄 Starting transcription...');
      actions.setProcessingStatus('transcribing');
      
      const transcriptionResult = await lmStudioService.transcribeAudio(
        audioBlob, 
        transcriptionAbortRef.current.signal
      );
      
      transcriptionAbortRef.current = null;
      console.log('✅ Transcription complete:', transcriptionResult.substring(0, 100) + '...');
      
      actions.setTranscription(transcriptionResult);
      actions.setProcessingStatus('processing');

      // Set up processing AbortController
      processingAbortRef.current = new AbortController();

      // Process with selected agent directly
      console.log('🔄 Processing with agent:', workflowId);
      const result = await AgentFactory.processWithAgent(
        workflowId, 
        transcriptionResult, 
        undefined,
        processingAbortRef.current.signal
      );
      console.log('✅ Agent processing complete');
      
      processingAbortRef.current = null;
      
      // Handle warnings and errors separately
      actions.setWarnings(result.warnings || []);
      actions.setErrors(result.errors || []);
      actions.setAlertsVisible(true);
      
      // Check if this is a failed investigation parsing
      if (result.errors && result.errors.length > 0) {
        const hasParsingError = result.errors.some(error => 
          error.includes('could not be parsed coherently') ||
          error.includes('Investigation dictation could not be parsed')
        );
        
        if (hasParsingError) {
          storeFailedAudioRecording(
            audioBlob, 
            workflowId, 
            result.errors.join('; '),
            transcriptionResult,
            currentRecordingTimeRef.current
          );
        }
      }
      
      // Set results and timing data
      actions.setResults(result.content);
      actions.setTimingData({
        agentProcessingTime: result.processingTime,
        totalProcessingTime: Date.now() - (state.processingStartTime || Date.now())
      });
      
      // Generate smart summary
      if (result.content) {
        const summary = result.summary || generateSmartSummary(result.content);
        actions.setResultSummary(summary);
      }
      
      // Set current agent name and review data
      actions.setCurrentAgentName(result.agentName);
      if (result.reviewData) {
        actions.setReviewData(result.reviewData);
      }

      // Create patient session if we have patient info
      if (state.currentPatientInfo) {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const patientSession = {
          id: sessionId,
          patient: state.currentPatientInfo,
          transcription: transcriptionResult,
          results: result.content,
          agentType: workflowId,
          agentName: result.agentName,
          timestamp: Date.now(),
          completed: true,
          processingTime: result.processingTime,
          warnings: result.warnings,
          errors: result.errors
        };
        
        actions.addPatientSession(patientSession);
        console.log('👤 Created patient session:', sessionId, 'for', state.currentPatientInfo.name);
      }
      
    } catch (error: any) {
      console.error('❌ Processing failed:', error);
      
      // Store failed recording for troubleshooting
      if (currentAudioBlobRef.current) {
        storeFailedAudioRecording(
          currentAudioBlobRef.current, 
          workflowId, 
          error.message || 'Processing failed',
          state.transcription || undefined,
          currentRecordingTimeRef.current
        );
      }
      
      // Set error state
      if (error.name === 'AbortError') {
        console.log('🛑 Processing was cancelled by user');
        actions.setProcessingStatus('idle');
        actions.setErrors(['Processing was cancelled']);
      } else {
        actions.setErrors([`Processing failed: ${error.message}`]);
        actions.setProcessingStatus('error');
      }
    } finally {
      // Clean up
      actions.setProcessing(false);
      actions.setProcessingStatus('idle');
      actions.setActiveWorkflow(null);
      actions.setCancelling(false);
      activeWorkflowRef.current = null;
      
      // Clear AbortControllers
      transcriptionAbortRef.current = null;
      processingAbortRef.current = null;
    }
  }, [actions, state, lmStudioService, storeFailedAudioRecording]);

  // Generate smart summary helper
  const generateSmartSummary = (content: string): string => {
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
  };

  // Initialize recorder with optimized callbacks
  const recorder = useRecorder({
    onRecordingComplete: handleRecordingComplete,
    onVoiceActivityUpdate: actions.setVoiceActivity,
    onRecordingTimeUpdate: (time: number) => {
      currentRecordingTimeRef.current = time;
    }
  });

  // Extract patient data from current EMR page
  const extractPatientData = useCallback(async (): Promise<any> => {
    try {
      console.log('👤 Extracting patient data from EMR...');
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_ACTION',
        action: 'extract-patient-data',
        data: {}
      });
      
      if (response?.success && response?.data) {
        console.log('✅ Patient data extracted:', response.data);
        return response.data;
      } else {
        console.log('❌ No patient data found or extraction failed');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to extract patient data:', error);
      return null;
    }
  }, []);

  // Handle workflow selection with optimized state updates
  const handleWorkflowSelect = useCallback(async (workflowId: AgentType) => {
    console.log('🎯 Workflow selected:', workflowId);
    
    if (recorder.isRecording && state.ui.activeWorkflow === workflowId) {
      // Stop recording for active workflow
      recorder.stopRecording();
    } else if (!recorder.isRecording) {
      // Extract patient data before starting workflow
      const patientData = await extractPatientData();
      if (patientData) {
        actions.setCurrentPatientInfo({
          name: patientData.name || 'Unknown Patient',
          id: patientData.id || 'Unknown ID',
          dob: patientData.dob || '',
          age: patientData.age || '',
          phone: patientData.phone,
          email: patientData.email,
          medicare: patientData.medicare,
          insurance: patientData.insurance,
          address: patientData.address,
          extractedAt: patientData.extractedAt || Date.now()
        });
        console.log('👤 Current patient set:', patientData.name, '(ID:', patientData.id + ')');
      }
      
      // Start recording for selected workflow
      actions.setActiveWorkflow(workflowId);
      activeWorkflowRef.current = workflowId;
      recorder.startRecording();
      actions.setProcessingStartTime(Date.now());
    }
  }, [recorder, state.ui.activeWorkflow, actions, extractPatientData]);

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
    
    // Reset state
    actions.setActiveWorkflow(null);
    actions.setProcessing(false);
    actions.setProcessingStatus('idle');
    actions.setWarnings([]);
    actions.setErrors([]);
    actions.setResults('');
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

  // EMR insertion
  const handleInsertToEMR = useCallback(async (text: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'EXECUTE_ACTION',
        action: 'insertText',
        data: { text }
      });
      console.log('📝 Text inserted to EMR');
    } catch (error) {
      console.error('Failed to insert text to EMR:', error);
      throw error;
    }
  }, []);

  // Model status monitoring
  useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const status = await lmStudioService.checkConnection();
        actions.setModelStatus(status);
      } catch (error) {
        actions.setModelStatus({
          isConnected: false,
          classifierModel: '',
          processorModel: '',
          lastPing: Date.now(),
          latency: 0
        });
      }
    };

    checkModelStatus();
    const interval = setInterval(checkModelStatus, 30000);
    return () => clearInterval(interval);
  }, [lmStudioService, actions]);

  return (
    <div className="h-screen max-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white/80 backdrop-blur-sm border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIndicator 
              status={recorder.isRecording ? 'recording' : state.processingStatus}
              currentAgent={state.currentAgent}
              isRecording={recorder.isRecording}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <ModelStatus 
              status={state.modelStatus} 
              onRefresh={async () => {
                const status = await lmStudioService.checkConnection();
                actions.setModelStatus(status);
              }}
              onRestartWhisper={async () => {
                try {
                  const result = await whisperServerService.startServer();
                  // Convert ServerStatus to WhisperServerStatus
                  return {
                    running: result.running,
                    model: result.model,
                    port: result.port,
                    error: result.error,
                    lastChecked: result.lastChecked
                  };
                } catch (error) {
                  return { 
                    running: false, 
                    port: 8001, 
                    error: error instanceof Error ? error.message : 'Unknown error',
                    lastChecked: Date.now()
                  };
                }
              }}
            />
            {(recorder.isRecording || state.isProcessing) && (
              <CancelButton 
                processingStatus={recorder.isRecording ? 'recording' : state.processingStatus}
                isRecording={recorder.isRecording}
                onCancel={handleCancel} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Workflow Selection - Pinned below header */}
      <div className="flex-shrink-0 p-3 bg-white/60 backdrop-blur-sm">
        <div className="max-w-md mx-auto">
          <WorkflowButtons
            onWorkflowSelect={handleWorkflowSelect}
            activeWorkflow={state.ui.activeWorkflow}
            isRecording={recorder.isRecording}
            disabled={state.isProcessing}
            voiceActivityLevel={state.voiceActivityLevel}
            recordingTime={currentRecordingTimeRef.current}
          />
        </div>
      </div>

      {/* Main Content - Flexible space */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-md mx-auto p-4 space-y-4 overflow-y-auto">
          {/* New Recording Button - show when there's content to clear */}
          {(state.transcription || state.results) && !recorder.isRecording && !state.isProcessing && (
            <div className="flex justify-center">
              <NewRecordingButton
                onClearRecording={actions.clearRecording}
                disabled={recorder.isRecording || state.isProcessing}
              />
            </div>
          )}

          {/* Error Alerts */}
          {state.ui.showAlerts && state.ui.errors.length > 0 && (
            <ErrorAlert
              errors={state.ui.errors}
              onDismiss={() => actions.setAlertsVisible(false)}
            />
          )}

          {/* Transcription Display */}
          {state.transcription && (
            <TranscriptionDisplay
              transcription={state.transcription}
              onEdit={actions.setTranscription}
              isProcessing={state.isProcessing}
            />
          )}

          {/* Processing Time Display */}
          {(recorder.isRecording || state.transcriptionTime || state.agentProcessingTime || state.totalProcessingTime) && (
            <ProcessingTimeDisplay
              appState={state}
              isRecording={recorder.isRecording}
              recordingTime={currentRecordingTimeRef.current}
            />
          )}

          {/* Results Display */}
          {state.results && (
            <OptimizedResultsPanel
              results={state.results}
              agentType={state.currentAgent}
              onCopy={handleCopy}
              onInsertToEMR={handleInsertToEMR}
              warnings={state.ui.warnings}
              onDismissWarnings={() => {
                actions.setWarnings([]);
                actions.setAlertsVisible(false);
              }}
              originalTranscription={state.transcription}
              onTranscriptionCopy={handleCopy}
              onTranscriptionInsert={handleInsertToEMR}
              currentAgent={state.currentAgent}
              isProcessing={state.isProcessing}
              failedAudioRecordings={state.failedAudioRecordings}
              onClearFailedRecordings={clearFailedRecordings}
              errors={state.ui.errors}
              reviewData={state.reviewData}
            />
          )}

          {/* Patient Sessions Panel */}
          {state.patientSessions.length > 0 && (
            <SessionsPanel
              sessions={state.patientSessions}
              onRemoveSession={actions.removePatientSession}
              onClearAllSessions={actions.clearPatientSessions}
              onSessionSelect={(session) => {
                console.log('📋 Selected patient session:', session.patient.name);
                // Optionally set current transcription/results to selected session
                actions.setTranscription(session.transcription);
                actions.setResults(session.results);
              }}
            />
          )}

        </div>
      </div>

      {/* Footer - QuickActions as compact footer */}
      <div className="flex-shrink-0 p-3 bg-white/80 backdrop-blur-sm border-t border-emerald-100">
        <div className="max-w-md mx-auto">
          <QuickActions 
            onQuickAction={async (actionId: string, data?: any) => {
              try {
                // Handle batch AI review - show patient selection modal
                if (actionId === 'batch-ai-review') {
                  console.log('👥 Showing Batch AI Review modal');
                  actions.setPatientModal(true);
                  return;
                }
                
                // Handle AI medical review - process directly with AusMedicalReviewAgent
                if (actionId === 'ai-medical-review') {
                  console.log('🔍 Processing AI Medical Review...');
                  actions.setProcessingStatus('processing');
                  actions.setCurrentAgent('ai-medical-review');
                  
                  try {
                    // Extract EMR data from the passed data object
                    const emrData = data?.emrData;
                    const formattedInput = data?.formattedInput;
                    
                    if (!emrData || !formattedInput) {
                      throw new Error('No EMR data provided for AI Medical Review');
                    }
                    
                    console.log('🔍 Creating AusMedicalReviewAgent and processing EMR data...');
                    
                    // Create agent instance and process the EMR data
                    const agent = new AusMedicalReviewAgent();
                    const report = await agent.process(formattedInput);
                    
                    console.log('✅ AI Medical Review completed:', report);
                    
                    // Update UI with actual AI-generated results
                    actions.setResults(report.content);
                    actions.setReviewData(report.reviewData);
                    actions.setProcessingStatus('complete');
                    
                  } catch (error) {
                    console.error('❌ AI Medical Review failed:', error);
                    actions.setProcessingStatus('error');
                    actions.setErrors([error instanceof Error ? error.message : 'AI Medical Review failed']);
                  }
                  return;
                }
                
                // Handle other quick actions through chrome message
                await chrome.runtime.sendMessage({
                  type: 'EXECUTE_ACTION',
                  action: actionId,
                  data: data
                });
                console.log(`✅ Quick action ${actionId} executed`);
              } catch (error) {
                console.error(`❌ Quick action ${actionId} failed:`, error);
                if (actionId === 'ai-medical-review') {
                  actions.setProcessingStatus('error');
                  actions.setErrors([error instanceof Error ? error.message : 'AI Medical Review failed']);
                }
              }
            }}
            onStartWorkflow={handleWorkflowSelect}
            isFooter={true}
          />
        </div>
      </div>

      {/* Patient Selection Modal for Batch AI Review */}
      {state.ui.showPatientSelectionModal && (
        <PatientSelectionModal
          isOpen={state.ui.showPatientSelectionModal}
          onClose={() => actions.setPatientModal(false)}
          onStartReview={async (patients: PatientAppointment[]) => {
            try {
              console.log('👥 Processing batch AI review for', patients.length, 'patients');
              actions.setPatientModal(false);
              actions.setBatchProcessing(true);
              
              // Process batch AI review with BatchAIReviewOrchestrator
              const result = await getBatchOrchestrator().processBatch({
                selectedPatients: patients,
                appointmentDate: new Date().toISOString().split('T')[0],
                calendarUrl: state.ui.calendarData?.calendarUrl || ''
              });
              
              console.log('✅ Batch AI review completed:', result);
            } catch (error) {
              console.error('❌ Batch AI review failed:', error);
            } finally {
              actions.setBatchProcessing(false);
            }
          }}
          calendarData={state.ui.calendarData}
          isExtracting={state.ui.isExtractingPatients}
          extractError={state.ui.extractError}
        />
      )}
    </div>
  );
});

OptimizedApp.displayName = 'OptimizedApp';

export default OptimizedApp;