/**
 * AI Review Section Component
 * 
 * Dedicated section for AI Medical Review and Batch AI Review functionality
 * Separated from main Quick Actions for better organization
 */

import React, { useState } from 'react';
import { Bot, Users, Shield } from 'lucide-react';
import { SmallTrophySpin } from './TrophySpinLoader';

interface AIReviewAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface AIReviewSectionProps {
  onQuickAction: (actionId: string, data?: any) => Promise<void>;
  processingAction: string | null;
  isFooter?: boolean;
}

const AI_REVIEW_ACTIONS: AIReviewAction[] = [
  {
    id: 'ai-medical-review',
    label: 'AI Medical Review',
    icon: Bot,
    description: 'Australian clinical oversight and guidelines review (analyzes existing EMR data)'
  },
  {
    id: 'batch-ai-review',
    label: 'Batch AI Review',
    icon: Users,
    description: 'AI review for multiple patients from appointment book'
  }
];

export const AIReviewSection: React.FC<AIReviewSectionProps> = ({
  onQuickAction,
  processingAction,
  isFooter = false
}) => {
  const [processingActionLocal, setProcessingActionLocal] = useState<string | null>(null);

  const handleAction = async (actionId: string, data?: any) => {
    if (actionId === 'ai-medical-review') {
      setProcessingActionLocal(actionId);
      
      console.log('🤖 AI Medical Review action triggered...');
      
      try {
        // Extract EMR data using robust service worker messaging
        console.log('📋 EMR EXTRACTION: Starting EMR data extraction via service worker...');
        
        const extractResult = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
          console.log('📋 EMR EXTRACTION: Sending EXTRACT_EMR_DATA_AI_REVIEW message to service worker');
          chrome.runtime.sendMessage({
            type: 'EXTRACT_EMR_DATA_AI_REVIEW',
            fields: ['background', 'investigations', 'medications-problemlist']
          }, (response) => {
            console.log('📋 EMR EXTRACTION: Response from service worker:', response);
            
            // Check for Chrome runtime errors
            if (chrome.runtime.lastError) {
              console.error('📋 EMR EXTRACTION: Chrome runtime error:', chrome.runtime.lastError);
              resolve({ 
                success: false, 
                error: `Chrome runtime error: ${chrome.runtime.lastError.message}` 
              });
              return;
            }
            
            // Handle undefined/null response
            if (!response) {
              console.error('📋 EMR EXTRACTION: No response received from service worker');
              resolve({ 
                success: false, 
                error: 'No response from service worker' 
              });
              return;
            }
            
            resolve(response);
          });
        });
        
        if (extractResult.success && extractResult.data) {
          const emrData = extractResult.data;
          console.log('📋 EMR EXTRACTION: Successfully received data:', emrData);
          
          // Validate data and format for AI review
          const fieldsWithData = Object.entries(emrData).filter(([key, value]) => 
            value && typeof value === 'string' && value.trim().length > 0
          );
          
          if (fieldsWithData.length === 0) {
            throw new Error(`No EMR data found. Please ensure you're on a patient page with clinical data.`);
          }
          
          // Format the data for AI review
          const formattedInput = `
Background: ${emrData.background || 'No background data available'}

Investigations: ${emrData.investigations || 'No investigations data available'}

Medications: ${emrData['medications-problemlist'] || 'No medications data available'}
          `.trim();
          
          console.log('📋 EMR EXTRACTION: Processing EMR data for AI review');
          
          // Pass data to parent (OptimizedApp) which handles overlay coordination
          await onQuickAction(actionId, { 
            emrData,
            formattedInput,
            type: 'australian-medical-review'
          });
          
          console.log('✅ AI Medical Review completed successfully');
        } else {
          const specificError = extractResult.error || 'Unknown extraction error';
          throw new Error(`Failed to extract EMR data: ${specificError}`);
        }
      } catch (error) {
        console.error(`❌ AI Medical Review failed:`, error);
        
        // Show user-visible error notification
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('AI Review Error:', errorMessage);
        
        if (typeof window !== 'undefined') {
          alert(`AI Medical Review Error\n\n${errorMessage}`);
        }
      } finally {
        setProcessingActionLocal(null);
      }
      return;
    }
    
    try {
      setProcessingActionLocal(actionId);
      console.log('⚡ Calling onQuickAction for AI Review...');
      await onQuickAction(actionId, data);
      console.log('⚡ AI Review onQuickAction completed successfully');
    } catch (error) {
      console.error(`❌ AI Review action ${actionId} failed:`, error);
    } finally {
      setProcessingActionLocal(null);
    }
  };

  const isProcessing = (actionId: string) => 
    processingAction === actionId || processingActionLocal === actionId;

  // Footer layout - compact version
  if (isFooter) {
    return (
      <div className="bg-white">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="w-3 h-3 text-indigo-600" />
          <h3 className="text-gray-900 font-medium text-xs">AI Medical Review</h3>
        </div>

        {/* Compact Grid */}
        <div className="grid grid-cols-2 gap-2">
          {AI_REVIEW_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={isProcessing(action.id)}
              className={`
                bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 relative p-2 rounded-lg transition-all text-center btn-micro-press btn-micro-hover shadow-none
                hover:bg-indigo-50 border border-indigo-200 bg-indigo-50
                ${isProcessing(action.id) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex flex-col items-center space-y-1">
                <action.icon className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                <div className="text-gray-900 text-xs font-medium leading-tight">
                  {action.label}
                </div>
              </div>
              
              {isProcessing(action.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-100 rounded-lg">
                  <SmallTrophySpin />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Normal layout - dedicated section
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-indigo-600" />
          <div className="text-left">
            <h3 className="text-gray-900 font-medium text-sm">AI Medical Review</h3>
            <p className="text-gray-600 text-xs">Clinical analysis and guidelines review</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-3">
          {AI_REVIEW_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={isProcessing(action.id)}
              className={`
                bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 p-3 rounded-lg text-left transition-all btn-micro-press btn-micro-hover shadow-none
                hover:bg-indigo-50 border border-indigo-200 bg-indigo-50
                ${isProcessing(action.id) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start space-x-2">
                <action.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-gray-900 text-xs font-medium truncate">
                    {action.label}
                  </div>
                  <div className="text-gray-600 text-xs mt-1 leading-tight">
                    {action.description}
                  </div>
                </div>
              </div>
              
              {isProcessing(action.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-100 rounded-lg">
                  <SmallTrophySpin />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-indigo-50">
        <p className="text-indigo-700 text-xs">
          💡 <strong>Note:</strong> AI Review uses MedGemma-27b for comprehensive clinical analysis
        </p>
      </div>

    </div>
  );
};
