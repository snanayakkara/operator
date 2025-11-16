import React, { useState, useCallback, useEffect } from 'react';
import {
  GraduationCap,
  CheckSquare,
  Square,
  AlertCircle,
  Loader,
  RefreshCw,
  Info,
  X
} from 'lucide-react';
import type { PatientEducationInput } from '@/agents/specialized/PatientEducationAgent';
import type { PatientEducationModule } from '@/agents/specialized/PatientEducationSystemPrompts';
import type { PatientInfo as _PatientInfo, PipelineProgress } from '@/types/medical.types';
import { UnifiedPipelineProgress } from './UnifiedPipelineProgress';
import { Button, IconButton } from './buttons';

// Dynamic import types
type _PatientEducationAgent = any;
type PriorityOption = { value: string; label: string; description: string };
type AgentStaticMethods = {
  getPriorityOptions: () => PriorityOption[];
  getAvailableModules: () => PatientEducationModule[];
};

interface PatientEducationConfigCardProps {
  onGenerate: (input: PatientEducationInput) => Promise<void>;
  isGenerating: boolean;
  isVisible: boolean;
  onClose: () => void;
  emrExtractionError?: string;
  onRetryExtraction?: () => Promise<void>;
  pipelineProgress?: PipelineProgress | null;
  processingStartTime?: number | null;
}

export const PatientEducationConfigCard: React.FC<PatientEducationConfigCardProps> = ({
  onGenerate,
  isGenerating,
  isVisible,
  onClose,
  emrExtractionError,
  onRetryExtraction,
  pipelineProgress,
  processingStartTime
}) => {
  const [patientPriority, setPatientPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedModules, setSelectedModules] = useState<string[]>(['diet_nutrition', 'physical_activity']);
  const [selectedSubFocus, setSelectedSubFocus] = useState<Record<string, string[]>>({});
  const [patientContext, setPatientContext] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEMRData, setExtractedEMRData] = useState<{
    demographics: string;
    background: string;
    medications: string;
    investigations: string;
  } | null>(null);
  
  // Dynamic loading state
  const [agentMethods, setAgentMethods] = useState<AgentStaticMethods | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);

  // Dynamically load agent methods
  useEffect(() => {
    const loadAgentMethods = async () => {
      if (agentMethods || isLoadingAgent) return;
      
      setIsLoadingAgent(true);
      try {
        const { PatientEducationAgent } = await import('@/agents/specialized/PatientEducationAgent');
        setAgentMethods({
          getPriorityOptions: PatientEducationAgent.getPriorityOptions.bind(PatientEducationAgent),
          getAvailableModules: PatientEducationAgent.getAvailableModules.bind(PatientEducationAgent)
        });
      } catch (error) {
        console.error('Failed to load PatientEducationAgent:', error);
      } finally {
        setIsLoadingAgent(false);
      }
    };

    if (isVisible) {
      loadAgentMethods();
    }
  }, [isVisible, agentMethods, isLoadingAgent]);

  const priorityOptions = agentMethods?.getPriorityOptions() || [];
  const availableModules = agentMethods?.getAvailableModules() || [];

  const handleModuleToggle = useCallback((moduleId: string) => {
    setSelectedModules(prev => {
      if (prev.includes(moduleId)) {
        // Module being unchecked - clear its sub-focus selections
        setSelectedSubFocus(prevSub => {
          const newSub = { ...prevSub };
          delete newSub[moduleId];
          return newSub;
        });
        return prev.filter(id => id !== moduleId);
      } else {
        // Module being checked - add it
        return [...prev, moduleId];
      }
    });
  }, []);

  const handleSubFocusToggle = useCallback((moduleId: string, subFocusId: string) => {
    setSelectedSubFocus(prev => {
      const currentSubFocus = prev[moduleId] || [];
      if (currentSubFocus.includes(subFocusId)) {
        // Remove sub-focus
        const newSubFocus = currentSubFocus.filter(id => id !== subFocusId);
        if (newSubFocus.length === 0) {
          const newState = { ...prev };
          delete newState[moduleId];
          return newState;
        }
        return { ...prev, [moduleId]: newSubFocus };
      } else {
        // Add sub-focus
        return { ...prev, [moduleId]: [...currentSubFocus, subFocusId] };
      }
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedModules.length === 0) {
      return;
    }

    // Extract EMR data from the current EMR system
    setIsExtracting(true);
    
    try {
      // Extract structured patient data (same as sessions system)
      const patientResponse = await chrome.runtime.sendMessage({
        type: 'EXECUTE_ACTION',
        action: 'extract-patient-data',
        data: {}
      });

      // Extract EMR clinical data
      const emrResponse = await chrome.runtime.sendMessage({
        type: 'EXTRACT_EMR_DATA',
        fields: ['background', 'medications', 'investigations']
      });

      const emrData = {
        demographics: '', // Will be replaced with structured patient data
        background: emrResponse?.background || '',
        medications: emrResponse?.medications || '',
        investigations: emrResponse?.investigations || ''
      };

      // Extract structured patient demographics
      const patientData = patientResponse?.success && patientResponse?.data ? patientResponse.data : null;
      
      console.log('🎓 Extracted patient data:', patientData);
      console.log('🎓 Extracted EMR data for Patient Education:', emrData);
      
      // Store the extracted data for display
      setExtractedEMRData(emrData);

      const input: PatientEducationInput = {
        patientPriority,
        selectedModules,
        selectedSubFocus: Object.keys(selectedSubFocus).length > 0 ? selectedSubFocus : undefined,
        emrData,
        patientData, // Add structured patient demographics
        patientContext: patientContext.trim() || undefined
      };

      await onGenerate(input);
    } catch (extractionError) {
      console.warn('⚠️ EMR extraction failed, proceeding with user context only:', extractionError);
      
      // Continue with empty EMR data if extraction fails
      const emrData = {
        demographics: '',
        background: '',
        medications: '',
        investigations: ''
      };

      const input: PatientEducationInput = {
        patientPriority,
        selectedModules,
        selectedSubFocus: Object.keys(selectedSubFocus).length > 0 ? selectedSubFocus : undefined,
        emrData,
        patientData: null, // No patient data available in fallback
        patientContext: patientContext.trim() || undefined
      };

      await onGenerate(input);
    } finally {
      setIsExtracting(false);
    }
  }, [patientPriority, selectedModules, selectedSubFocus, patientContext, onGenerate]);

  const handleRetryExtraction = useCallback(async () => {
    if (onRetryExtraction) {
      setIsExtracting(true);
      try {
        await onRetryExtraction();
      } finally {
        setIsExtracting(false);
      }
    }
  }, [onRetryExtraction]);

  if (!isVisible) {
    return null;
  }

  // Show loading state while agent is being loaded
  if (isLoadingAgent || !agentMethods) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-xl shadow-lg">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4" />
              <h3 className="font-semibold text-sm">Patient Education & Lifestyle Advice</h3>
            </div>
            <IconButton
              icon={<X />}
              onClick={onClose}
              variant="ghost"
              size="sm"
              aria-label="Close"
              className="text-emerald-100 hover:text-white"
            />
          </div>
        </div>
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <Loader className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-gray-600">Loading education modules...</span>
          </div>
        </div>
      </div>
    );
  }

  const renderModuleCheckbox = (module: PatientEducationModule) => {
    const isChecked = selectedModules.includes(module.id);
    const moduleSubFocus = selectedSubFocus[module.id] || [];
    
    return (
      <div key={module.id} className="border border-gray-200 rounded-lg">
        {/* Main Module */}
        <div className="flex items-start space-x-3 p-3 hover:border-blue-300 transition-colors">
          <IconButton
            icon={isChecked ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-400" />}
            onClick={() => handleModuleToggle(module.id)}
            variant="ghost"
            size="sm"
            aria-label={`Toggle ${module.label}`}
            disabled={isGenerating || isExtracting}
            className="flex-shrink-0 mt-0.5"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`font-medium text-sm ${isChecked ? 'text-blue-900' : 'text-gray-700'}`}>
                {module.label}
              </span>
              <div 
                className="group relative inline-block"
                title={module.tooltip}
              >
                <Info className="w-4 h-4 text-gray-400 hover:text-blue-600 cursor-help" />
                <div className="absolute left-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {module.tooltip}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">{module.description}</p>
          </div>
        </div>

        {/* Sub-Focus Points - Only show when module is selected and has sub-focus points */}
        {isChecked && module.subFocusPoints && module.subFocusPoints.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600 mb-2">Focus on specific areas (optional):</p>
            {module.subFocusPoints.map((subFocus) => {
              const isSubChecked = moduleSubFocus.includes(subFocus.id);
              return (
                <div key={subFocus.id} className="flex items-start space-x-2 ml-2">
                  <IconButton
                    icon={isSubChecked ? <CheckSquare className="text-emerald-600" /> : <Square className="text-gray-400" />}
                    onClick={() => handleSubFocusToggle(module.id, subFocus.id)}
                    variant="ghost"
                    size="sm"
                    aria-label={`Toggle ${subFocus.label}`}
                    disabled={isGenerating || isExtracting}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs ${isSubChecked ? 'text-emerald-800 font-medium' : 'text-gray-600'}`}>
                      {subFocus.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{subFocus.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-lg">
      <div className="bg-white w-full overflow-hidden rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4" />
              <h3 className="font-semibold text-sm">Patient Education & Lifestyle Advice</h3>
            </div>
            <IconButton
              icon={<X />}
              onClick={onClose}
              variant="ghost"
              size="sm"
              aria-label="Close"
              disabled={isGenerating || isExtracting}
              className="text-emerald-100 hover:text-white"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-full">
          {/* EMR Extraction Error */}
          {emrExtractionError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 font-medium">EMR Extraction Issue</p>
                  <p className="text-xs text-amber-700 mt-1">{emrExtractionError}</p>
                  {onRetryExtraction && (
                    <Button
                      onClick={handleRetryExtraction}
                      disabled={isExtracting}
                      variant="ghost"
                      size="sm"
                      startIcon={isExtracting ? <Loader /> : <RefreshCw />}
                      isLoading={isExtracting}
                      className="mt-2 bg-amber-100 hover:bg-amber-200 text-amber-800"
                    >
                      {isExtracting ? 'Retrying...' : 'Retry Extraction'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Patient Priority */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Patient Priority Level
            </label>
            <div className="space-y-2">
              {priorityOptions.map(option => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={option.value}
                    checked={patientPriority === option.value}
                    onChange={(e) => setPatientPriority(e.target.value as 'high' | 'medium' | 'low')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    disabled={isGenerating || isExtracting}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    <p className="text-xs text-gray-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Patient Specific Priorities */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Patient Specific Priorities & Goals
            </label>
            <textarea
              value={patientContext}
              onChange={(e) => setPatientContext(e.target.value)}
              placeholder="Enter specific patient priorities and goals (e.g., lose weight, stop smoking, improve fitness, reduce blood pressure, manage diabetes)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-sm"
              rows={3}
              disabled={isGenerating || isExtracting}
            />
            <p className="text-xs text-gray-500 mt-2">
              Optional: Describe what's most important for this patient to help personalize the lifestyle advice.
            </p>
          </div>

          {/* EMR Data Preview - Show extracted data if available */}
          {extractedEMRData && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Extracted Patient Information
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                {extractedEMRData.background && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Background:</span>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">{extractedEMRData.background}</p>
                  </div>
                )}
                {extractedEMRData.medications && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Medications:</span>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">{extractedEMRData.medications}</p>
                  </div>
                )}
                {extractedEMRData.investigations && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Recent Investigations:</span>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">{extractedEMRData.investigations}</p>
                  </div>
                )}
                {!extractedEMRData.background && !extractedEMRData.medications && !extractedEMRData.investigations && (
                  <p className="text-xs text-gray-500 italic">No patient data found in EMR fields</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This information will be used to personalize the lifestyle advice.
              </p>
            </div>
          )}

          {/* Lifestyle Modules */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Lifestyle Areas (Choose at least 1)
            </label>
            <div className="grid grid-cols-1 gap-3">
              {availableModules.map(renderModuleCheckbox)}
            </div>
            {selectedModules.length === 0 && (
              <p className="text-xs text-red-600 mt-2">Please select at least one lifestyle area</p>
            )}
          </div>

          {/* Important Notice */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Education Only</p>
                <p className="mt-1">
                  This tool provides lifestyle education and general wellness advice only. 
                  It does not diagnose conditions or recommend medication changes.
                </p>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end border-t border-gray-200 pt-4 mt-6">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isExtracting || selectedModules.length === 0}
              variant="success"
              size="lg"
              startIcon={<GraduationCap />}
              isLoading={isGenerating || isExtracting}
              className="px-8 shadow-lg"
            >
              {isGenerating || isExtracting ? 'Generating Advice...' : 'Generate Lifestyle Advice'}
            </Button>
          </div>

          {/* Progress indicator */}
          {(isGenerating || isExtracting) && pipelineProgress && (
            <div className="mt-4">
              <UnifiedPipelineProgress
                progress={pipelineProgress}
                startTime={processingStartTime || undefined}
                agentType="patient-education"
                showTimeEstimate={true}
              />
            </div>
          )}

          {/* Fallback progress indicator if pipeline progress not available */}
          {(isGenerating || isExtracting) && !pipelineProgress && (
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-600">
                Generating personalized lifestyle advice...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-emerald-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};