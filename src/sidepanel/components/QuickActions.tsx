import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  User, 
  Pill, 
  CheckSquare, 
  Calendar, 
  Search,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  Mic,
  Keyboard,
  Camera,
  Bot,
  Shield,
  UserCheck,
  Users,
  BarChart3 as _BarChart3,
  Combine,
  GraduationCap,
  TestTube,
  Scan
} from 'lucide-react';
import { SmallTrophySpin, MediumTrophySpin } from './TrophySpinLoader';
import { ExpandableActionButton, ExpandableActionConfig } from './ExpandableActionButton';
import { APPOINTMENT_PRESETS, AppointmentPreset } from '../../config/appointmentPresets';
import type { AgentType } from '../../types/medical.types';
import { 
  staggerContainer,
  listItemVariants,
  buttonVariants,
  withReducedMotion,
  STAGGER_CONFIGS,
  ANIMATION_DURATIONS as _ANIMATION_DURATIONS
} from '@/utils/animations';

interface InvestigationOption {
  id: 'dictate' | 'type';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const INVESTIGATION_OPTIONS: InvestigationOption[] = [
  {
    id: 'dictate',
    label: 'Dictate',
    icon: Mic,
    description: 'Voice-to-text with AI formatting'
  },
  {
    id: 'type',
    label: 'Type',
    icon: Keyboard,
    description: 'Open field for manual entry'
  }
];

const EXPANDABLE_ACTION_CONFIGS: Record<string, ExpandableActionConfig> = {
  'investigation-summary': {
    icon: Search,
    label: 'Investigations',
    actionId: 'investigation-summary',
    workflowId: 'investigation-summary',
    color: 'emerald'
  },
  'background': {
    icon: User,
    label: 'Background',
    actionId: 'background', 
    workflowId: 'background',
    color: 'blue'
  },
  'medications': {
    icon: Pill,
    label: 'Medications',
    actionId: 'medications',
    workflowId: 'medication',
    color: 'purple'
  },
  'social-history': {
    icon: UserCheck,
    label: 'Social',
    actionId: 'social-history',
    workflowId: 'background', // Use background workflow for social history
    color: 'indigo'
  },
  'bloods': {
    icon: TestTube,
    label: 'Bloods',
    actionId: 'bloods',
    workflowId: 'bloods',
    color: 'red'
  },
  'imaging': {
    icon: Scan,
    label: 'Imaging',
    actionId: 'imaging',
    workflowId: 'imaging',
    color: 'cyan'
  }
};

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  shortcut?: string;
  category: 'emr' | 'documentation' | 'workflow' | 'analysis';
}

interface QuickActionsProps {
  onQuickAction: (actionId: string, data?: any) => Promise<void>;
  onStartWorkflow?: (workflowId: AgentType) => void;
  isFooter?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'background',
    label: 'Background',
    icon: User,
    description: 'Access patient background notes',
    category: 'emr'
  },
  {
    id: 'investigation-summary',
    label: 'Investigations',
    icon: Search,
    description: 'Open investigation summary field',
    category: 'emr'
  },
  {
    id: 'medications',
    label: 'Medications',
    icon: Pill,
    description: 'View/edit medication list',
    category: 'emr'
  },
  {
    id: 'social-history',
    label: 'Social History',
    icon: UserCheck,
    description: 'Access social & family history section',
    category: 'emr'
  },
  {
    id: 'bloods',
    label: 'Bloods',
    icon: TestTube,
    description: 'Blood test results and analysis',
    category: 'emr'
  },
  {
    id: 'imaging',
    label: 'Imaging',
    icon: Scan,
    description: 'Medical imaging reports and analysis',
    category: 'emr'
  },
  {
    id: 'profile-photo',
    label: 'Photo',
    icon: Camera,
    description: 'Capture screenshot for patient profile',
    category: 'emr'
  },
  {
    id: 'annotate-screenshots',
    label: 'Canvas',
    icon: Combine,
    description: 'Capture, annotate, and combine multiple screenshots',
    category: 'emr'
  },
  {
    id: 'quick-letter',
    label: 'Quick Letter',
    icon: FileText,
    description: 'Generate quick medical letter',
    category: 'documentation'
  },
  {
    id: 'create-task',
    label: 'Create Task',
    icon: CheckSquare,
    description: 'Add new task to workflow',
    category: 'workflow'
  },
  {
    id: 'appointment-wrap-up',
    label: 'Wrap Up',
    icon: Calendar,
    description: 'Complete appointment workflow',
    category: 'workflow'
  },
  {
    id: 'patient-education',
    label: 'Patient Education',
    icon: GraduationCap,
    description: 'Generate lifestyle advice and education',
    category: 'documentation'
  }
];

// AI Actions that will be rendered in the split cell
const AI_ACTIONS: QuickAction[] = [
  {
    id: 'ai-medical-review',
    label: 'AI Medical Review',
    icon: Bot,
    description: 'Australian clinical oversight and guidelines review (analyzes existing EMR data)',
    category: 'analysis'
  },
  {
    id: 'batch-ai-review',
    label: 'Batch AI Review',
    icon: Users,
    description: 'AI review for multiple patients from appointment book',
    category: 'analysis'
  }
];

export const QuickActions: React.FC<QuickActionsProps> = memo(({ onQuickAction, onStartWorkflow, isFooter = false }) => {
  
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showInvestigationOptions, setShowInvestigationOptions] = useState(false);

  const handleAction = async (actionId: string, data?: any) => {
    
    // Show preset selection for appointment wrap-up
    if (actionId === 'appointment-wrap-up' && !data) {
      setShowPresets(true);
      return;
    }
    
    // Show investigation options for investigation-summary
    if (actionId === 'investigation-summary' && !data) {
      setShowInvestigationOptions(true);
      return;
    }
    
    // Handle patient education - show configuration card
    if (actionId === 'patient-education') {
      try {
        setProcessingAction(actionId);
        console.log('🎓 Starting Patient Education...');
        
        // Trigger patient education configuration through quick action
        await onQuickAction(actionId, { type: 'show-config' });
        
        console.log('✅ Patient Education config triggered');
      } catch (error) {
        console.error(`❌ Patient Education failed:`, error);
      } finally {
        setProcessingAction(null);
      }
      return;
    }
    
    // Handle batch AI review - show patient selection modal
    if (actionId === 'batch-ai-review') {
      try {
        setProcessingAction(actionId);
        console.log('👥 Starting Batch AI Review...');
        
        // Trigger patient selection modal through quick action
        await onQuickAction(actionId, { type: 'show-modal' });
        
        console.log('✅ Batch AI Review modal triggered');
      } catch (error) {
        console.error(`❌ Batch AI Review failed:`, error);
      } finally {
        setProcessingAction(null);
      }
      return;
    }

    // Handle AI medical review - extract EMR data and process directly (no recording)
    if (actionId === 'ai-medical-review') {
      try {
        setProcessingAction(actionId);
        console.log('🔍 Starting AI Medical Review...');
        
        // Extract patient data from EMR fields
        console.log('📋 Extracting EMR data for AI medical review...');
        const emrData = await extractEMRData();
        
        if (emrData) {
          // Enhanced data validation with detailed reporting
          const dataValidation = {
            background: { hasContent: !!emrData.background.trim(), length: emrData.background.length },
            investigations: { hasContent: !!emrData.investigations.trim(), length: emrData.investigations.length },
            medications: { hasContent: !!emrData.medications.trim(), length: emrData.medications.length }
          };
          
          const fieldsWithData = Object.entries(dataValidation).filter(([, data]) => data.hasContent);
          const totalFields = Object.keys(dataValidation).length;
          
          console.log('📋 EMR DATA VALIDATION:', {
            fieldsWithData: fieldsWithData.length,
            totalFields,
            details: dataValidation,
            extractionMeta: emrData.extractionMeta
          });
          
          // Allow processing with partial data (at least 1 field required)
          if (fieldsWithData.length === 0) {
            const emptyFieldsMessage = Object.entries(dataValidation)
              .filter(([, data]) => !data.hasContent)
              .map(([field]) => field)
              .join(', ');
            
            throw new Error(`No clinical data found - all EMR fields are empty: ${emptyFieldsMessage}. Please ensure the patient record contains data in Background, Investigations, or Medications fields.`);
          }
          
          // Show warning for missing fields but continue processing
          if (fieldsWithData.length < totalFields) {
            const missingFields = Object.entries(dataValidation)
              .filter(([, data]) => !data.hasContent)
              .map(([field]) => field);
            
            console.warn(`⚠️ EMR PARTIAL DATA: Processing with ${fieldsWithData.length}/${totalFields} fields. Missing: ${missingFields.join(', ')}`);
          }
          
          console.log(`✅ EMR data validation passed: ${fieldsWithData.length}/${totalFields} fields available`);
          console.log('🔄 Processing with Australian Medical Review Agent...');
          
          // Format the data for the agent
          const formattedInput = formatEMRDataForReview(emrData);
          
          // Process directly through App.tsx quick action handler (side panel only)
          await onQuickAction(actionId, { 
            emrData,
            formattedInput,
            type: 'australian-medical-review'
          });
          
          console.log('✅ AI Medical Review completed successfully');
        } else {
          // Enhanced error for null emrData response
          console.error('❌ EMR EXTRACTION: extractEMRData returned null - critical extraction failure');
          throw new Error('EMR data extraction failed - unable to connect to content script or read EMR fields. Please refresh the EMR page and ensure you are on a patient record page.');
        }
      } catch (error) {
        console.error(`❌ AI MEDICAL REVIEW FAILED:`, error);
        
        // Enhanced error handling with specific guidance
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('🚨 AI Review Error Details:', {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack trace',
          timestamp: new Date().toISOString()
        });
        
        // Provide user-friendly error messages with troubleshooting steps
        let userMessage = `AI Medical Review Error\n\n${errorMessage}`;
        
        if (errorMessage.includes('Content script not responding')) {
          userMessage += '\n\n🔧 Troubleshooting:\n1. Refresh the EMR page\n2. Make sure you are on a patient record page\n3. Try the AI Medical Review again';
        } else if (errorMessage.includes('all EMR fields are empty')) {
          userMessage += '\n\n🔧 Troubleshooting:\n1. Navigate to a patient record with clinical data\n2. Ensure Background, Investigations, or Medications fields contain information\n3. Try the AI Medical Review again';
        } else if (errorMessage.includes('extraction failed')) {
          userMessage += '\n\n🔧 Troubleshooting:\n1. Check the browser console for detailed logs\n2. Refresh the EMR page\n3. Contact support if the issue persists';
        }
        
        // Create a simple alert for user feedback (temporary solution)
        if (typeof window !== 'undefined') {
          // Try to show a more user-friendly error
          const _userMessage = errorMessage.includes('Unknown message type') 
            ? 'Please reload the extension in chrome://extensions and try again'
            : errorMessage.includes('No clinical data')
            ? 'Please navigate to a patient page with clinical data and try again'
            : `AI Review failed: ${errorMessage}`;
            
          alert(`AI Medical Review Error\n\n${userMessage}`);
        }
      } finally {
        setProcessingAction(null);
      }
      return;
    }
    
    try {
      setProcessingAction(actionId);
      console.log('⚡ Calling onQuickAction...');
      await onQuickAction(actionId, data);
      console.log('⚡ onQuickAction completed successfully');
      setShowPresets(false); // Hide presets after successful action
      setShowInvestigationOptions(false); // Hide investigation options after successful action
    } catch (error) {
      console.error(`❌ Quick action ${actionId} failed:`, error);
    } finally {
      setProcessingAction(null);
    }
  };

  // Extract EMR data using proven working EXECUTE_ACTION system
  const extractEMRData = async (): Promise<{ 
    background: string; 
    investigations: string; 
    medications: string; 
    extractionMeta: {
      successfulFields: number;
      totalFields: number;
      failedFields: string[];
      fieldDetails: Record<string, any>;
    }
  } | null> => {
    try {
      console.log('📋 EMR EXTRACTION: Starting EMR data extraction...');
      console.log('📋 EMR EXTRACTION: Current tab info:', await chrome.tabs.query({active: true, currentWindow: true}));
      
      // First, verify content script is responding
      console.log('📋 EMR EXTRACTION: Testing content script connection...');
      try {
        const pingResponse = await chrome.runtime.sendMessage({
          type: 'PING'
        });
        console.log('📋 EMR EXTRACTION: Content script ping response:', pingResponse);
      } catch (pingError) {
        console.error('📋 EMR EXTRACTION: Content script ping failed:', pingError);
        throw new Error('Content script not responding - please refresh the EMR page and try again');
      }
      
      console.log('📋 EMR EXTRACTION: Making individual EXECUTE_ACTION calls...');
      
      // Use individual EXECUTE_ACTION calls with timeout and detailed logging
      const extractionPromises = [
        {
          name: 'background',
          promise: chrome.runtime.sendMessage({
            type: 'EXECUTE_ACTION',
            action: 'background',
            data: { extractOnly: true }
          })
        },
        {
          name: 'investigation-summary',
          promise: chrome.runtime.sendMessage({
            type: 'EXECUTE_ACTION', 
            action: 'investigation-summary',
            data: { extractOnly: true }
          })
        },
        {
          name: 'medications',
          promise: chrome.runtime.sendMessage({
            type: 'EXECUTE_ACTION',
            action: 'medications', 
            data: { extractOnly: true }
          })
        }
      ];
      
      // Execute with detailed logging for each field
      const results = await Promise.allSettled(extractionPromises.map(item => item.promise));
      const [backgroundResult, investigationResult, medicationResult] = results;
      
      console.log('📋 EMR EXTRACTION: Detailed extraction results:');
      results.forEach((result, index) => {
        const fieldName = extractionPromises[index].name;
        if (result.status === 'fulfilled') {
          console.log(`📋 EMR EXTRACTION: ${fieldName} - SUCCESS:`, result.value);
        } else {
          console.error(`📋 EMR EXTRACTION: ${fieldName} - FAILED:`, result.reason);
        }
      });
      
      // Extract responses (handle both fulfilled and rejected promises)
      const backgroundResponse = backgroundResult.status === 'fulfilled' ? backgroundResult.value : null;
      const investigationResponse = investigationResult.status === 'fulfilled' ? investigationResult.value : null;
      const medicationResponse = medicationResult.status === 'fulfilled' ? medicationResult.value : null;
      
      // Enhanced response validation with detailed field-level reporting
      const fieldExtractions = {
        background: {
          response: backgroundResponse,
          success: backgroundResponse?.success || false,
          hasData: !!backgroundResponse?.data,
          error: backgroundResult.status === 'rejected' ? backgroundResult.reason : null
        },
        investigations: {
          response: investigationResponse,
          success: investigationResponse?.success || false,
          hasData: !!investigationResponse?.data,
          error: investigationResult.status === 'rejected' ? investigationResult.reason : null
        },
        medications: {
          response: medicationResponse,
          success: medicationResponse?.success || false,
          hasData: !!medicationResponse?.data,
          error: medicationResult.status === 'rejected' ? medicationResult.reason : null
        }
      };
      
      console.log('📋 EMR EXTRACTION: Detailed response validation:', fieldExtractions);
      
      // Extract text content from responses with enhanced error handling
      const background = extractTextFromResponse(backgroundResponse, 'Background');
      const investigations = extractTextFromResponse(investigationResponse, 'Investigation Summary');
      const medications = extractTextFromResponse(medicationResponse, 'Medications');
      
      // Report extraction results
      const extractionSummary = {
        background: { length: background.length, hasContent: !!background.trim() },
        investigations: { length: investigations.length, hasContent: !!investigations.trim() },
        medications: { length: medications.length, hasContent: !!medications.trim() }
      };
      
      console.log('📋 EMR EXTRACTION: Final extraction summary:', extractionSummary);
      
      // Count successful extractions
      const successfulExtractions = Object.values(extractionSummary).filter(field => field.hasContent).length;
      console.log(`📋 EMR EXTRACTION: Successfully extracted ${successfulExtractions}/3 fields`);
      
      // Create detailed error message for failed extractions
      const failedFields = [];
      if (!extractionSummary.background.hasContent && fieldExtractions.background.error) {
        failedFields.push(`Background: ${fieldExtractions.background.error.message || fieldExtractions.background.error}`);
      }
      if (!extractionSummary.investigations.hasContent && fieldExtractions.investigations.error) {
        failedFields.push(`Investigations: ${fieldExtractions.investigations.error.message || fieldExtractions.investigations.error}`);
      }
      if (!extractionSummary.medications.hasContent && fieldExtractions.medications.error) {
        failedFields.push(`Medications: ${fieldExtractions.medications.error.message || fieldExtractions.medications.error}`);
      }
      
      if (failedFields.length > 0) {
        console.warn('📋 EMR EXTRACTION: Some fields failed to extract:', failedFields);
      }
      
      return { 
        background, 
        investigations, 
        medications,
        extractionMeta: {
          successfulFields: successfulExtractions,
          totalFields: 3,
          failedFields,
          fieldDetails: extractionSummary
        }
      };
      
    } catch (error) {
      console.error('❌ EMR EXTRACTION: Critical error in extraction process:', error);
      throw new Error(`EMR data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to extract text content from action responses
  const extractTextFromResponse = (response: any, fieldName: string = 'Unknown'): string => {
    console.log(`📋 EMR EXTRACTION: Parsing ${fieldName} response:`, response);
    
    if (!response) {
      console.log(`📋 EMR EXTRACTION: ${fieldName} - No response received`);
      return '';
    }
    
    // Check various possible response formats
    let extractedText = '';
    
    if (typeof response === 'string') {
      extractedText = response;
    } else if (response.data && typeof response.data === 'string') {
      extractedText = response.data;
    } else if (response.content && typeof response.content === 'string') {
      extractedText = response.content;
    } else if (response.text && typeof response.text === 'string') {
      extractedText = response.text;
    } else if (response.value && typeof response.value === 'string') {
      extractedText = response.value;
    }
    
    console.log(`📋 EMR EXTRACTION: ${fieldName} - Extracted ${extractedText.length} characters:`, 
      extractedText ? `"${extractedText.substring(0, 100)}${extractedText.length > 100 ? '...' : ''}"` : '(empty)');
    
    return extractedText;
  };

  // Format EMR data for the Australian medical review agent
  const formatEMRDataForReview = (emrData: { background: string; investigations: string; medications: string }): string => {
    return `BACKGROUND: ${emrData.background || 'Not provided'}

INVESTIGATIONS: ${emrData.investigations || 'Not provided'}

MEDICATIONS: ${emrData.medications || 'Not provided'}`;
  };

  const handlePresetSelect = async (preset: AppointmentPreset) => {
    await handleAction('appointment-wrap-up', { preset });
  };

  const handleInvestigationOptionSelect = (option: InvestigationOption) => {
    if (option.id === 'dictate') {
      // Trigger the investigation-summary workflow
      if (onStartWorkflow) {
        onStartWorkflow('investigation-summary');
        setShowInvestigationOptions(false);
      }
    } else if (option.id === 'type') {
      // Trigger the regular investigation-summary quick action
      handleAction('investigation-summary', { type: 'manual' });
    }
  };

  const handleBackToActions = () => {
    setShowPresets(false);
    setShowInvestigationOptions(false);
  };

  // Include all actions - analysis actions are now integrated into the Quick Actions
  const filteredActions = QUICK_ACTIONS;
  
  const groupedActions = filteredActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const categoryLabels = {
    emr: 'EMR Navigation',
    documentation: 'Documentation',
    workflow: 'Workflow',
    analysis: 'Clinical Analysis'
  };

  const categoryIcons = {
    emr: ExternalLink,
    documentation: FileText,
    workflow: CheckSquare,
    analysis: Shield
  };

  // Show investigation options interface
  if (showInvestigationOptions) {
    return (
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleBackToActions}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
            </button>
            <Search className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <h3 className="text-gray-900 font-medium text-sm">Investigation Summary</h3>
              <p className="text-gray-600 text-xs">Choose how to add your summary</p>
            </div>
          </div>
        </div>

        {/* Investigation Options */}
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3">
            {INVESTIGATION_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleInvestigationOptionSelect(option)}
                disabled={processingAction === 'investigation-summary'}
                className={`
                  bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ease-out rounded-lg p-4 text-left
                  ${processingAction === 'investigation-summary' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start space-x-3">
                  <option.icon className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900 text-sm font-semibold mb-1">
                      {option.label}
                    </div>
                    <div className="text-gray-600 text-xs leading-tight">
                      {option.description}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
                
                {processingAction === 'investigation-summary' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <MediumTrophySpin />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50">
          <p className="text-gray-600 text-xs">
            💡 <strong>Tip:</strong> Dictate uses AI to format your speech, Type opens the field for manual entry
          </p>
        </div>
      </div>
    );
  }

  // Show preset selection interface
  if (showPresets) {
    return (
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleBackToActions}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
            </button>
            <Calendar className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <h3 className="text-gray-900 font-medium text-sm">Appointment Wrap-up Presets</h3>
              <p className="text-gray-600 text-xs">Choose a preset to apply</p>
            </div>
          </div>
        </div>

        {/* Preset Options */}
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3">
            {APPOINTMENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                disabled={processingAction === 'appointment-wrap-up'}
                className={`
                  bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ease-out rounded-lg p-4 text-left
                  ${processingAction === 'appointment-wrap-up' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900 text-sm font-semibold mb-1">
                      {preset.displayName}
                    </div>
                    <div className="text-gray-600 text-xs mb-2">
                      <span className="font-medium">Item Code:</span> {preset.itemCode}
                    </div>
                    <div className="text-gray-600 text-xs leading-tight">
                      <span className="font-medium">Notes:</span> "{preset.notes}"
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
                
                {processingAction === 'appointment-wrap-up' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <MediumTrophySpin />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50">
          <p className="text-gray-600 text-xs">
            💡 <strong>Tip:</strong> Presets will automatically fill the Item Code and Appointment Notes fields
          </p>
        </div>
      </div>
    );
  }

  // Footer layout - 2x3 grid of actions
  if (isFooter) {
    return (
      <motion.div 
        className="bg-white"
        variants={withReducedMotion(staggerContainer)}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div 
          className="flex items-center space-x-2 mb-3"
          variants={withReducedMotion(listItemVariants)}
        >
          <CheckSquare className="w-3 h-3 text-blue-600" />
          <h3 className="text-gray-900 font-medium text-xs">Quick Actions</h3>
        </motion.div>

        {/* 4-column grid of actions with stagger animation */}
        <motion.div 
          className="grid grid-cols-4 gap-2"
          variants={withReducedMotion(staggerContainer)}
          transition={{
            staggerChildren: STAGGER_CONFIGS.tight,
            delayChildren: 0.1
          }}
        >
          {filteredActions.map((action, index) => (
            <motion.div
              key={action.id}
              variants={withReducedMotion(listItemVariants)}
              custom={index}
            >
              {EXPANDABLE_ACTION_CONFIGS[action.id] ? (
                <ExpandableActionButton
                  config={EXPANDABLE_ACTION_CONFIGS[action.id]}
                  onStartWorkflow={onStartWorkflow}
                  onQuickAction={onQuickAction}
                  processingAction={processingAction}
                  isFooter={true}
                />
              ) : (
                <motion.button
                  onClick={() => {
                    console.log('🔧 Button clicked:', action.id, 'at', new Date().toISOString());
                    handleAction(action.id);
                  }}
                  disabled={processingAction === action.id}
                  className={`
                    relative p-2 rounded-2xl transition-all duration-150 text-left min-h-10 flex items-center
                    hover:bg-surface-primary hover:border hover:border-line-primary hover:shadow-sm
                    ${action.category === 'analysis' 
                      ? 'hover:border-accent-violet/30' 
                      : ''
                    }
                    ${processingAction === action.id ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  variants={withReducedMotion(buttonVariants)}
                  whileHover={processingAction !== action.id ? "hover" : undefined}
                  whileTap={processingAction !== action.id ? "tap" : undefined}
                >
                  <div className="flex items-center space-x-1.5">
                    <action.icon className={`w-3 h-3 flex-shrink-0 ${
                      action.category === 'analysis' ? 'text-accent-violet' : 'text-accent-emerald'
                    }`} />
                    <div className="text-ink-primary text-[10px] font-medium leading-tight min-w-0 flex-1">
                      {action.label}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {processingAction === action.id && (
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <SmallTrophySpin />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </motion.div>
          ))}
          
          {/* Split AI Buttons in the last cell */}
          {(() => {
            // Calculate if AI buttons will be alone in their row
            const totalButtons = filteredActions.length + 1; // +1 for the AI split cell
            const isAIButtonsAloneInRow = totalButtons % 4 === 1;

            return (
              <motion.div
                className={`relative rounded-2xl min-h-10 flex transition-all duration-150 hover:bg-surface-primary hover:border hover:border-accent-violet/30 ${
                  isAIButtonsAloneInRow ? 'col-span-4' : ''
                }`}
                variants={withReducedMotion(listItemVariants)}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className={`flex h-full ${isAIButtonsAloneInRow ? 'justify-center space-x-8' : ''}`}>
                  {AI_ACTIONS.map((aiAction, aiIndex) => (
                    <motion.button
                      key={aiAction.id}
                      onClick={() => {
                        console.log('🔧 AI Button clicked:', aiAction.id, 'at', new Date().toISOString());
                        handleAction(aiAction.id);
                      }}
                      disabled={processingAction === aiAction.id}
                      className={`
                        ${isAIButtonsAloneInRow ? 'px-6 py-2' : 'flex-1 p-1'} relative transition-all text-left
                        ${!isAIButtonsAloneInRow && aiIndex === 0 ? 'rounded-l-2xl border-r border-line-primary' : ''}
                        ${!isAIButtonsAloneInRow && aiIndex === 1 ? 'rounded-r-2xl' : ''}
                        ${isAIButtonsAloneInRow ? 'rounded-2xl' : ''}
                        hover:bg-surface-tertiary
                        ${processingAction === aiAction.id ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      whileHover={processingAction !== aiAction.id ? { scale: 1.05 } : undefined}
                      whileTap={processingAction !== aiAction.id ? { scale: 0.95 } : undefined}
                    >
                      <div className={`flex items-center ${isAIButtonsAloneInRow ? 'flex-row space-x-2' : 'justify-center flex-col space-y-0.5'}`}>
                        <aiAction.icon className={`${isAIButtonsAloneInRow ? 'w-4 h-4' : 'w-3 h-3'} flex-shrink-0 text-accent-violet`} />
                        <div className={`text-ink-primary font-medium leading-tight ${isAIButtonsAloneInRow ? 'text-xs' : 'text-[9px] text-center'}`}>
                          {aiAction.id === 'ai-medical-review' ? 'AI Review' : 'Batch AI'}
                        </div>
                      </div>

                      <AnimatePresence>
                        {processingAction === aiAction.id && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-surface-tertiary rounded-lg"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <SmallTrophySpin />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            );
          })()}
        </motion.div>
      </motion.div>
    );
  }

  // Normal layout - vertical grouped actions
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <div className="text-left">
            <h3 className="text-gray-900 font-medium text-sm">Quick Actions</h3>
            <p className="text-gray-600 text-xs">EMR shortcuts and workflows</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
          {Object.entries(groupedActions).map(([category, actions]) => {
            const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
            
            return (
              <div key={category} className="p-4 border-b border-gray-100 last:border-b-0">
                {/* Category Header */}
                <div className="flex items-center space-x-2 mb-3">
                  <CategoryIcon className="w-4 h-4 text-gray-500" />
                  <h4 className="text-gray-700 text-xs font-medium uppercase tracking-wide">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h4>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-1 gap-2">
                  {actions.map((action) => (
                    EXPANDABLE_ACTION_CONFIGS[action.id] ? (
                      <ExpandableActionButton
                        key={action.id}
                        config={EXPANDABLE_ACTION_CONFIGS[action.id]}
                        onStartWorkflow={onStartWorkflow}
                        onQuickAction={onQuickAction}
                        processingAction={processingAction}
                        isFooter={false}
                      />
                    ) : (
                      <button
                        key={action.id}
                        onClick={() => handleAction(action.id)}
                        disabled={processingAction === action.id}
                        className={`
                          p-3 rounded-2xl text-left transition-all duration-150 micro-press micro-lift
                          hover:bg-surface-primary hover:border hover:border-line-primary hover:shadow-sm
                          ${action.category === 'analysis' 
                            ? 'hover:border-accent-violet/30' 
                            : ''
                          }
                          ${processingAction === action.id ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="flex items-start space-x-2">
                          <action.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            action.category === 'analysis' ? 'text-accent-violet' : 'text-accent-emerald'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-ink-primary text-xs font-medium truncate">
                              {action.label}
                            </div>
                            <div className="text-ink-secondary text-xs mt-1 leading-tight">
                              {action.description}
                            </div>
                          </div>
                        </div>
                        
                        {processingAction === action.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                            <MediumTrophySpin />
                          </div>
                        )}
                      </button>
                    )
                  ))}
                </div>
              </div>
            );
          })}

        {/* Footer with tip */}
        <div className="p-4 bg-surface-tertiary">
          <p className="text-ink-secondary text-xs">
            💡 <strong>Tip:</strong> Quick actions provide fast access to EMR fields and workflows
          </p>
        </div>
      </div>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';
