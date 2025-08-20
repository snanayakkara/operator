/**
 * Optimized App State Management with useReducer
 * 
 * Replaces 20+ useState hooks with centralized state management
 * to dramatically reduce re-renders and improve performance.
 */

import { useReducer, useCallback, useRef } from 'react';
import type { AppState, AgentType, ProcessingStatus, FailedAudioRecording, PatientAppointment, BatchAIReviewReport, PatientSession, PatientInfo } from '@/types/medical.types';

// Consolidated UI state interface
interface UIState {
  // Recording state
  activeWorkflow: AgentType | null;
  isCancelling: boolean;
  
  // UI visibility state
  showAlerts: boolean;
  showPatientSelectionModal: boolean;
  showMainMenu: boolean;
  isExtractingPatients: boolean;
  isBatchProcessing: boolean;
  
  // Content state
  warnings: string[];
  errors: string[];
  resultSummary: string;
  
  // Calendar and batch processing state
  calendarData: {
    appointmentDate: string;
    patients: PatientAppointment[];
    totalCount: number;
    calendarUrl?: string;
  } | null;
  extractError: string | null;
  batchProcessingProgress: any;
}

// Combined app state
interface CombinedAppState extends AppState {
  ui: UIState;
  // Patient session management
  patientSessions: PatientSession[];
  currentPatientInfo: PatientInfo | null;
}

// Action types for state updates
type AppAction =
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_CURRENT_AGENT'; payload: AgentType | null }
  | { type: 'SET_TRANSCRIPTION'; payload: string }
  | { type: 'SET_RESULTS'; payload: string }
  | { type: 'SET_PROCESSING_STATUS'; payload: ProcessingStatus }
  | { type: 'SET_VOICE_ACTIVITY'; payload: { level: number; frequencyData: number[] } }
  | { type: 'SET_MODEL_STATUS'; payload: AppState['modelStatus'] }
  | { type: 'SET_TIMING_DATA'; payload: Partial<Pick<AppState, 'transcriptionTime' | 'agentProcessingTime' | 'totalProcessingTime' | 'processingStartTime'>> }
  | { type: 'SET_CURRENT_AGENT_NAME'; payload: string | null }
  | { type: 'SET_FAILED_RECORDINGS'; payload: FailedAudioRecording[] }
  | { type: 'SET_REVIEW_DATA'; payload: BatchAIReviewReport | null }
  | { type: 'SET_ACTIVE_WORKFLOW'; payload: AgentType | null }
  | { type: 'SET_CANCELLING'; payload: boolean }
  | { type: 'SET_WARNINGS'; payload: string[] }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'SET_ALERTS_VISIBLE'; payload: boolean }
  | { type: 'SET_RESULT_SUMMARY'; payload: string }
  | { type: 'SET_PATIENT_MODAL'; payload: boolean }
  | { type: 'SET_MAIN_MENU'; payload: boolean }
  | { type: 'SET_CALENDAR_DATA'; payload: UIState['calendarData'] }
  | { type: 'SET_EXTRACTING_PATIENTS'; payload: boolean }
  | { type: 'SET_EXTRACT_ERROR'; payload: string | null }
  | { type: 'SET_BATCH_PROCESSING'; payload: boolean }
  | { type: 'SET_BATCH_PROGRESS'; payload: any }
  | { type: 'SET_PROCESSING_START_TIME'; payload: number }
  | { type: 'RESET_STATE' }
  | { type: 'CLEAR_RECORDING' }
  | { type: 'SET_CURRENT_PATIENT_INFO'; payload: PatientInfo | null }
  | { type: 'ADD_PATIENT_SESSION'; payload: PatientSession }
  | { type: 'UPDATE_PATIENT_SESSION'; payload: { id: string; updates: Partial<PatientSession> } }
  | { type: 'REMOVE_PATIENT_SESSION'; payload: string }
  | { type: 'CLEAR_PATIENT_SESSIONS' };

// Initial state
const initialState: CombinedAppState = {
  // Core app state
  isRecording: false,
  isProcessing: false,
  currentAgent: null,
  transcription: '',
  results: '',
  processingStatus: 'idle',
  voiceActivityLevel: 0,
  frequencyData: [],
  modelStatus: {
    isConnected: false,
    classifierModel: '',
    processorModel: '',
    lastPing: 0,
    latency: 0
  },
  transcriptionTime: null,
  agentProcessingTime: null,
  totalProcessingTime: null,
  currentAgentName: null,
  processingStartTime: null,
  failedAudioRecordings: [],
  reviewData: null,
  
  // Patient session management
  patientSessions: [],
  currentPatientInfo: null,
  
  // UI state
  ui: {
    activeWorkflow: null,
    isCancelling: false,
    showAlerts: true,
    showPatientSelectionModal: false,
    showMainMenu: false,
    isExtractingPatients: false,
    isBatchProcessing: false,
    warnings: [],
    errors: [],
    resultSummary: '',
    calendarData: null,
    extractError: null,
    batchProcessingProgress: null
  }
};

// State reducer with performance optimizations
function appStateReducer(state: CombinedAppState, action: AppAction): CombinedAppState {
  switch (action.type) {
    case 'SET_RECORDING':
      if (state.isRecording === action.payload) return state;
      return { ...state, isRecording: action.payload };
      
    case 'SET_PROCESSING':
      if (state.isProcessing === action.payload) return state;
      return { ...state, isProcessing: action.payload };
      
    case 'SET_CURRENT_AGENT':
      if (state.currentAgent === action.payload) return state;
      return { ...state, currentAgent: action.payload };
      
    case 'SET_TRANSCRIPTION':
      if (state.transcription === action.payload) return state;
      return { ...state, transcription: action.payload };
      
    case 'SET_RESULTS':
      if (state.results === action.payload) return state;
      return { ...state, results: action.payload };
      
    case 'SET_PROCESSING_STATUS':
      if (state.processingStatus === action.payload) return state;
      return { ...state, processingStatus: action.payload };
      
    case 'SET_VOICE_ACTIVITY':
      // Only update if there's a meaningful change (throttling)
      const timeSinceLastUpdate = Date.now() - (state.modelStatus.lastPing || 0);
      if (timeSinceLastUpdate < 200) return state; // Throttle to 200ms
      
      return {
        ...state,
        voiceActivityLevel: action.payload.level,
        frequencyData: action.payload.frequencyData,
        modelStatus: { ...state.modelStatus, lastPing: Date.now() }
      };
      
    case 'SET_MODEL_STATUS':
      return { ...state, modelStatus: action.payload };
      
    case 'SET_TIMING_DATA':
      return { ...state, ...action.payload };
      
    case 'SET_CURRENT_AGENT_NAME':
      if (state.currentAgentName === action.payload) return state;
      return { ...state, currentAgentName: action.payload };
      
    case 'SET_FAILED_RECORDINGS':
      return { ...state, failedAudioRecordings: action.payload };
      
    case 'SET_REVIEW_DATA':
      return { ...state, reviewData: action.payload };
      
    case 'SET_ACTIVE_WORKFLOW':
      if (state.ui.activeWorkflow === action.payload) return state;
      return { ...state, ui: { ...state.ui, activeWorkflow: action.payload } };
      
    case 'SET_CANCELLING':
      if (state.ui.isCancelling === action.payload) return state;
      return { ...state, ui: { ...state.ui, isCancelling: action.payload } };
      
    case 'SET_WARNINGS':
      return { ...state, ui: { ...state.ui, warnings: action.payload } };
      
    case 'SET_ERRORS':
      return { ...state, ui: { ...state.ui, errors: action.payload } };
      
    case 'SET_ALERTS_VISIBLE':
      if (state.ui.showAlerts === action.payload) return state;
      return { ...state, ui: { ...state.ui, showAlerts: action.payload } };
      
    case 'SET_RESULT_SUMMARY':
      if (state.ui.resultSummary === action.payload) return state;
      return { ...state, ui: { ...state.ui, resultSummary: action.payload } };
      
    case 'SET_PATIENT_MODAL':
      if (state.ui.showPatientSelectionModal === action.payload) return state;
      return { ...state, ui: { ...state.ui, showPatientSelectionModal: action.payload } };
      
    case 'SET_MAIN_MENU':
      if (state.ui.showMainMenu === action.payload) return state;
      return { ...state, ui: { ...state.ui, showMainMenu: action.payload } };
      
    case 'SET_CALENDAR_DATA':
      return { ...state, ui: { ...state.ui, calendarData: action.payload } };
      
    case 'SET_EXTRACTING_PATIENTS':
      if (state.ui.isExtractingPatients === action.payload) return state;
      return { ...state, ui: { ...state.ui, isExtractingPatients: action.payload } };
      
    case 'SET_EXTRACT_ERROR':
      if (state.ui.extractError === action.payload) return state;
      return { ...state, ui: { ...state.ui, extractError: action.payload } };
      
    case 'SET_BATCH_PROCESSING':
      if (state.ui.isBatchProcessing === action.payload) return state;
      return { ...state, ui: { ...state.ui, isBatchProcessing: action.payload } };
      
    case 'SET_BATCH_PROGRESS':
      return { ...state, ui: { ...state.ui, batchProcessingProgress: action.payload } };
      
    case 'SET_PROCESSING_START_TIME':
      return { ...state, processingStartTime: action.payload };
      
    case 'RESET_STATE':
      return initialState;
      
    case 'CLEAR_RECORDING':
      return {
        ...state,
        transcription: '',
        results: '',
        processingStatus: 'idle',
        currentAgent: null,
        currentAgentName: null,
        transcriptionTime: null,
        agentProcessingTime: null,
        totalProcessingTime: null,
        processingStartTime: null,
        reviewData: null,
        ui: {
          ...state.ui,
          activeWorkflow: null,
          warnings: [],
          errors: [],
          resultSummary: '',
          isCancelling: false
        }
      };
      
    case 'SET_CURRENT_PATIENT_INFO':
      return { ...state, currentPatientInfo: action.payload };
      
    case 'ADD_PATIENT_SESSION':
      return { ...state, patientSessions: [action.payload, ...state.patientSessions] };
      
    case 'UPDATE_PATIENT_SESSION':
      return {
        ...state,
        patientSessions: state.patientSessions.map(session =>
          session.id === action.payload.id
            ? { ...session, ...action.payload.updates }
            : session
        )
      };
      
    case 'REMOVE_PATIENT_SESSION':
      return {
        ...state,
        patientSessions: state.patientSessions.filter(session => session.id !== action.payload)
      };
      
    case 'CLEAR_PATIENT_SESSIONS':
      return { ...state, patientSessions: [], currentPatientInfo: null };
      
    default:
      return state;
  }
}

// Custom hook for optimized app state management
export function useAppState() {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  
  // Throttled voice activity update
  const lastVoiceUpdateRef = useRef<number>(0);
  
  // Memoized action creators to prevent unnecessary re-renders
  const actions = {
    setRecording: useCallback((isRecording: boolean) => {
      dispatch({ type: 'SET_RECORDING', payload: isRecording });
    }, []),
    
    setProcessing: useCallback((isProcessing: boolean) => {
      dispatch({ type: 'SET_PROCESSING', payload: isProcessing });
    }, []),
    
    setCurrentAgent: useCallback((agent: AgentType | null) => {
      dispatch({ type: 'SET_CURRENT_AGENT', payload: agent });
    }, []),
    
    setTranscription: useCallback((transcription: string) => {
      dispatch({ type: 'SET_TRANSCRIPTION', payload: transcription });
    }, []),
    
    setResults: useCallback((results: string) => {
      dispatch({ type: 'SET_RESULTS', payload: results });
    }, []),
    
    setProcessingStatus: useCallback((status: ProcessingStatus) => {
      dispatch({ type: 'SET_PROCESSING_STATUS', payload: status });
    }, []),
    
    setVoiceActivity: useCallback((level: number, frequencyData: number[]) => {
      const now = Date.now();
      if (now - lastVoiceUpdateRef.current >= 200) { // 200ms throttling
        lastVoiceUpdateRef.current = now;
        dispatch({ type: 'SET_VOICE_ACTIVITY', payload: { level, frequencyData } });
      }
    }, []),
    
    setModelStatus: useCallback((status: AppState['modelStatus']) => {
      dispatch({ type: 'SET_MODEL_STATUS', payload: status });
    }, []),
    
    setTimingData: useCallback((timing: Partial<Pick<AppState, 'transcriptionTime' | 'agentProcessingTime' | 'totalProcessingTime' | 'processingStartTime'>>) => {
      dispatch({ type: 'SET_TIMING_DATA', payload: timing });
    }, []),
    
    setCurrentAgentName: useCallback((name: string | null) => {
      dispatch({ type: 'SET_CURRENT_AGENT_NAME', payload: name });
    }, []),
    
    setFailedRecordings: useCallback((recordings: FailedAudioRecording[]) => {
      dispatch({ type: 'SET_FAILED_RECORDINGS', payload: recordings });
    }, []),
    
    setReviewData: useCallback((data: BatchAIReviewReport | null) => {
      dispatch({ type: 'SET_REVIEW_DATA', payload: data });
    }, []),
    
    setActiveWorkflow: useCallback((workflow: AgentType | null) => {
      dispatch({ type: 'SET_ACTIVE_WORKFLOW', payload: workflow });
    }, []),
    
    setCancelling: useCallback((isCancelling: boolean) => {
      dispatch({ type: 'SET_CANCELLING', payload: isCancelling });
    }, []),
    
    setWarnings: useCallback((warnings: string[]) => {
      dispatch({ type: 'SET_WARNINGS', payload: warnings });
    }, []),
    
    setErrors: useCallback((errors: string[]) => {
      dispatch({ type: 'SET_ERRORS', payload: errors });
    }, []),
    
    setAlertsVisible: useCallback((visible: boolean) => {
      dispatch({ type: 'SET_ALERTS_VISIBLE', payload: visible });
    }, []),
    
    setResultSummary: useCallback((summary: string) => {
      dispatch({ type: 'SET_RESULT_SUMMARY', payload: summary });
    }, []),
    
    setPatientModal: useCallback((show: boolean) => {
      dispatch({ type: 'SET_PATIENT_MODAL', payload: show });
    }, []),
    
    setMainMenu: useCallback((show: boolean) => {
      dispatch({ type: 'SET_MAIN_MENU', payload: show });
    }, []),
    
    setCalendarData: useCallback((data: UIState['calendarData']) => {
      dispatch({ type: 'SET_CALENDAR_DATA', payload: data });
    }, []),
    
    setExtractingPatients: useCallback((extracting: boolean) => {
      dispatch({ type: 'SET_EXTRACTING_PATIENTS', payload: extracting });
    }, []),
    
    setExtractError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_EXTRACT_ERROR', payload: error });
    }, []),
    
    setBatchProcessing: useCallback((processing: boolean) => {
      dispatch({ type: 'SET_BATCH_PROCESSING', payload: processing });
    }, []),
    
    setBatchProgress: useCallback((progress: any) => {
      dispatch({ type: 'SET_BATCH_PROGRESS', payload: progress });
    }, []),
    
    setProcessingStartTime: useCallback((time: number) => {
      dispatch({ type: 'SET_PROCESSING_START_TIME', payload: time });
    }, []),
    
    resetState: useCallback(() => {
      dispatch({ type: 'RESET_STATE' });
    }, []),
    
    clearRecording: useCallback(() => {
      dispatch({ type: 'CLEAR_RECORDING' });
    }, []),
    
    // Patient session management actions
    setCurrentPatientInfo: useCallback((patientInfo: PatientInfo | null) => {
      dispatch({ type: 'SET_CURRENT_PATIENT_INFO', payload: patientInfo });
    }, []),
    
    addPatientSession: useCallback((session: PatientSession) => {
      dispatch({ type: 'ADD_PATIENT_SESSION', payload: session });
    }, []),
    
    updatePatientSession: useCallback((id: string, updates: Partial<PatientSession>) => {
      dispatch({ type: 'UPDATE_PATIENT_SESSION', payload: { id, updates } });
    }, []),
    
    removePatientSession: useCallback((id: string) => {
      dispatch({ type: 'REMOVE_PATIENT_SESSION', payload: id });
    }, []),
    
    clearPatientSessions: useCallback(() => {
      dispatch({ type: 'CLEAR_PATIENT_SESSIONS' });
    }, [])
  };
  
  return {
    state,
    actions
  };
}