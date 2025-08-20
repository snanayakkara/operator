import React, { useState, memo } from 'react';
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
  Users
} from 'lucide-react';
import { SmallTrophySpin, MediumTrophySpin } from './TrophySpinLoader';
import { ExpandableInvestigationButton } from './ExpandableInvestigationButton';
import { ExpandableBackgroundButton } from './ExpandableBackgroundButton';
import { ExpandableMedicationButton } from './ExpandableMedicationButton';
import { APPOINTMENT_PRESETS, AppointmentPreset } from '../../config/appointmentPresets';
import type { AgentType } from '../../types/medical.types';

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
  },
  {
    id: 'social-history',
    label: 'Social History',
    icon: UserCheck,
    description: 'Access social & family history section',
    category: 'emr'
  },
  {
    id: 'profile-photo',
    label: 'Profile Photo',
    icon: Camera,
    description: 'Capture screenshot for patient profile',
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
    label: 'Appointment Wrap-up',
    icon: Calendar,
    description: 'Complete appointment workflow',
    category: 'workflow'
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
          // Check if we have meaningful data (not all empty)
          const hasData = emrData.background.trim() || emrData.investigations.trim() || emrData.medications.trim();
          
          if (!hasData) {
            throw new Error('No clinical data found in EMR fields (Background, Investigations, Medications are all empty)');
          }
          
          console.log('✅ EMR data extracted successfully');
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
          throw new Error('Failed to extract EMR data');
        }
      } catch (error) {
        console.error(`❌ AI Medical Review failed:`, error);
        
        // Show user-visible error notification
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('AI Review Error:', errorMessage);
        
        // Create a simple alert for user feedback (temporary solution)
        if (typeof window !== 'undefined') {
          // Try to show a more user-friendly error
          const userMessage = errorMessage.includes('Unknown message type') 
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
  const extractEMRData = async (): Promise<{ background: string; investigations: string; medications: string } | null> => {
    try {
      console.log('📋 Extracting EMR data using working action system...');
      
      // Use individual EXECUTE_ACTION calls (same as other working buttons)
      const [backgroundResponse, investigationResponse, medicationResponse] = await Promise.all([
        chrome.runtime.sendMessage({
          type: 'EXECUTE_ACTION',
          action: 'background',
          data: { extractOnly: true }
        }),
        chrome.runtime.sendMessage({
          type: 'EXECUTE_ACTION', 
          action: 'investigation-summary',
          data: { extractOnly: true }
        }),
        chrome.runtime.sendMessage({
          type: 'EXECUTE_ACTION',
          action: 'medications', 
          data: { extractOnly: true }
        })
      ]);
      
      console.log('📋 Individual action responses:', { 
        background: backgroundResponse, 
        investigation: investigationResponse, 
        medication: medicationResponse 
      });
      
      // Check if responses contain data or errors
      console.log('📋 Response validation:', {
        backgroundSuccess: backgroundResponse?.success,
        backgroundHasData: !!backgroundResponse?.data,
        investigationSuccess: investigationResponse?.success,
        investigationHasData: !!investigationResponse?.data,
        medicationSuccess: medicationResponse?.success,
        medicationHasData: !!medicationResponse?.data
      });
      
      // Extract text content from responses (responses may contain field data)
      const background = extractTextFromResponse(backgroundResponse) || '';
      const investigations = extractTextFromResponse(investigationResponse) || '';
      const medications = extractTextFromResponse(medicationResponse) || '';
      
      console.log('✅ EMR data extracted successfully via actions:', { 
        background: background.length + ' chars',
        investigations: investigations.length + ' chars', 
        medications: medications.length + ' chars'
      });
      
      return { background, investigations, medications };
      
    } catch (error) {
      console.error('❌ Error extracting EMR data via actions:', error);
      return null;
    }
  };

  // Helper function to extract text content from action responses
  const extractTextFromResponse = (response: any): string => {
    if (!response) return '';
    
    // Check various possible response formats
    if (typeof response === 'string') return response;
    if (response.data && typeof response.data === 'string') return response.data;
    if (response.content && typeof response.content === 'string') return response.content;
    if (response.text && typeof response.text === 'string') return response.text;
    if (response.value && typeof response.value === 'string') return response.value;
    
    return '';
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

  const groupedActions = QUICK_ACTIONS.reduce((acc, action) => {
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
                  glass-button p-4 rounded-lg text-left transition-all hover:bg-gray-50 border-2 border-transparent hover:border-blue-200 btn-micro-press btn-micro-hover
                  ${processingAction === 'investigation-summary' ? 'opacity-50 cursor-not-allowed' : ''}
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
                  glass-button p-4 rounded-lg text-left transition-all hover:bg-gray-50 border-2 border-transparent hover:border-blue-200 btn-micro-press btn-micro-hover
                  ${processingAction === 'appointment-wrap-up' ? 'opacity-50 cursor-not-allowed' : ''}
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
      <div className="bg-white">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-2">
          <CheckSquare className="w-3 h-3 text-blue-600" />
          <h3 className="text-gray-900 font-medium text-xs">Quick Actions</h3>
        </div>

        {/* 2x3 Grid of actions */}
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((action) => (
            action.id === 'investigation-summary' ? (
              <ExpandableInvestigationButton
                key={action.id}
                onStartWorkflow={onStartWorkflow}
                onQuickAction={onQuickAction}
                processingAction={processingAction}
                isFooter={true}
              />
            ) : action.id === 'background' ? (
              <ExpandableBackgroundButton
                key={action.id}
                onStartWorkflow={onStartWorkflow}
                onQuickAction={onQuickAction}
                processingAction={processingAction}
                isFooter={true}
              />
            ) : action.id === 'medications' ? (
              <ExpandableMedicationButton
                key={action.id}
                onStartWorkflow={onStartWorkflow}
                onQuickAction={onQuickAction}
                processingAction={processingAction}
                isFooter={true}
              />
            ) : (
              <button
                key={action.id}
                onClick={() => {
                  console.log('🔧 Button clicked:', action.id, 'at', new Date().toISOString());
                  handleAction(action.id);
                }}
                disabled={processingAction === action.id}
                className={`
                  glass-button relative p-2 rounded-lg transition-all text-center btn-micro-press btn-micro-hover
                  ${action.category === 'analysis' 
                    ? 'hover:bg-indigo-50 border border-indigo-200 bg-indigo-50' 
                    : 'hover:bg-gray-50'
                  }
                  ${processingAction === action.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex flex-col items-center space-y-1">
                  <action.icon className={`w-3 h-3 flex-shrink-0 ${
                    action.category === 'analysis' ? 'text-indigo-600' : 'text-blue-600'
                  }`} />
                  <div className="text-gray-900 text-xs font-medium leading-tight">
                    {action.label}
                  </div>
                </div>
                
                {processingAction === action.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <SmallTrophySpin />
                  </div>
                )}
              </button>
            )
          ))}
        </div>
      </div>
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
                    action.id === 'investigation-summary' ? (
                      <ExpandableInvestigationButton
                        key={action.id}
                        onStartWorkflow={onStartWorkflow}
                        onQuickAction={onQuickAction}
                        processingAction={processingAction}
                        isFooter={false}
                      />
                    ) : action.id === 'background' ? (
                      <ExpandableBackgroundButton
                        key={action.id}
                        onStartWorkflow={onStartWorkflow}
                        onQuickAction={onQuickAction}
                        processingAction={processingAction}
                        isFooter={false}
                      />
                    ) : action.id === 'medications' ? (
                      <ExpandableMedicationButton
                        key={action.id}
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
                          glass-button p-3 rounded-lg text-left transition-all btn-micro-press btn-micro-hover
                          ${action.category === 'analysis' 
                            ? 'hover:bg-indigo-50 border border-indigo-200 bg-indigo-50' 
                            : 'hover:bg-gray-50'
                          }
                          ${processingAction === action.id ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="flex items-start space-x-2">
                          <action.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            action.category === 'analysis' ? 'text-indigo-600' : 'text-blue-600'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-gray-900 text-xs font-medium truncate">
                              {action.label}
                            </div>
                            <div className="text-gray-600 text-xs mt-1 leading-tight">
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
        <div className="p-4 bg-gray-50">
          <p className="text-gray-600 text-xs">
            💡 <strong>Tip:</strong> Quick actions provide fast access to EMR fields and workflows
          </p>
        </div>
      </div>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';