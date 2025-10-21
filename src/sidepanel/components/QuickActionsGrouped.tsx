/**
 * QuickActions Component - Grouped Layout with ALL Original Functionality
 *
 * Features:
 * - Two visual groups: Core (primary) and Secondary (tools)
 * - Vertical layout: icon above label
 * - EXPANDABLE actions: hover reveals Dictate/Type
 * - Full-panel takeovers for Wrap Up and Investigation Options
 * - AI actions split cell
 * - Proper z-index stacking
 */

import React, { useState, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Calendar,
  Search,
  ArrowLeft,
  Settings,
  ChevronRight,
  ChevronDown,
  Mic,
  Keyboard
} from 'lucide-react';
import { QuickActionItem } from './QuickActionItem';
import { RecordPanel } from './RecordPanel';
import { AppointmentMatrixBuilder } from './AppointmentMatrixBuilder';
import { APPOINTMENT_PRESETS, type AppointmentPreset } from '@/config/appointmentPresets';
import { CORE_ACTIONS, SECONDARY_ACTIONS } from '@/config/quickActionsConfig';
import type { AgentType } from '@/types/medical.types';
import {
  staggerContainer,
  listItemVariants,
  withReducedMotion,
  STAGGER_CONFIGS
} from '@/utils/animations';

interface QuickActionsGroupedProps {
  onQuickAction: (actionId: string, data?: unknown) => Promise<void>;
  onStartWorkflow?: (workflowId: AgentType, quickActionField?: string) => void;
  isFooter?: boolean;
  // RecordPanel props
  isRecording?: boolean;
  activeWorkflow?: AgentType | null;
  voiceActivityLevel?: number;
  recordingTime?: number;
  whisperServerRunning?: boolean;
  onTypeClick?: (workflowId: AgentType) => void; // For expandable workflows that support Type mode
}

export const QuickActionsGrouped: React.FC<QuickActionsGroupedProps> = memo(({
  onQuickAction,
  onStartWorkflow,
  isFooter = false,
  isRecording = false,
  activeWorkflow = null,
  voiceActivityLevel = 0,
  recordingTime = 0,
  whisperServerRunning = true,
  onTypeClick
}) => {
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showMatrixBuilder, setShowMatrixBuilder] = useState(false);
  const [showInvestigationOptions, setShowInvestigationOptions] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage, default to true (collapsed)
    const saved = localStorage.getItem('quickActionsCollapsed');
    return saved === null ? true : saved === 'true';
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('quickActionsCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Extract AI action configs for JSX rendering
  const aiReviewAction = SECONDARY_ACTIONS.find(action => action.id === 'ai-medical-review');
  const batchAiAction = SECONDARY_ACTIONS.find(action => action.id === 'batch-ai-review');
  const AiReviewIcon = aiReviewAction?.icon;
  const BatchAiIcon = batchAiAction?.icon;

  const handleAction = async (actionId: string, data?: unknown) => {
    // Show preset selection for appointment wrap-up
    if (actionId === 'appointment-wrap-up' && !data) {
      setShowPresets(true);
      return;
    }

    // Show investigation options
    if (actionId === 'investigation-summary' && !data) {
      setShowInvestigationOptions(true);
      return;
    }

    // Handle patient education
    if (actionId === 'patient-education') {
      try {
        setProcessingAction(actionId);
        await onQuickAction(actionId, { type: 'show-config' });
      } catch (error) {
        console.error('Patient Education failed:', error);
      } finally {
        setProcessingAction(null);
      }
      return;
    }

    // Handle batch AI review
    if (actionId === 'batch-ai-review') {
      try {
        setProcessingAction(actionId);
        await onQuickAction(actionId, { type: 'show-modal' });
      } catch (error) {
        console.error('Batch AI Review failed:', error);
      } finally {
        setProcessingAction(null);
      }
      return;
    }

    // Default: execute action
    try {
      setProcessingAction(actionId);
      await onQuickAction(actionId, data);
    } catch (error) {
      console.error(`Action ${actionId} failed:`, error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDictate = (workflowId: AgentType, actionId: string) => {
    // For bloods agent, prepare modal first
    if (actionId === 'bloods') {
      onQuickAction(actionId, { type: 'prepare-modal' });
    }

    if (onStartWorkflow) {
      // Pass actionId as second param for Quick Action field tracking
      onStartWorkflow(workflowId, actionId);
    }
  };

  const handleType = async (actionId: string) => {
    await handleAction(actionId, { type: 'manual' });
  };

  const handlePresetSelect = async (preset: AppointmentPreset) => {
    await handleAction('appointment-wrap-up', { preset });
  };

  const handleBackToActions = () => {
    setShowPresets(false);
    setShowMatrixBuilder(false);
    setShowInvestigationOptions(false);
  };

  // Only show footer layout
  if (!isFooter) {
    return null;
  }

  // Investigation Options - FULL PANEL TAKEOVER
  if (showInvestigationOptions) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden" style={{ zIndex: 20 }}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToActions}
              className="flex items-center text-blue-600 hover:text-blue-700"
              aria-label="Back to actions"
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

        {/* Options */}
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => {
                if (onStartWorkflow) {
                  onStartWorkflow('investigation-summary', 'investigation-summary');
                }
                setShowInvestigationOptions(false);
              }}
              disabled={processingAction === 'investigation-summary'}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-lg p-4 text-left"
            >
              <div className="flex items-start space-x-3">
                <Mic className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Dictate</div>
                  <div className="text-gray-600 text-xs">Voice-to-text with AI formatting</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </button>

            <button
              onClick={() => handleType('investigation-summary')}
              disabled={processingAction === 'investigation-summary'}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-lg p-4 text-left"
            >
              <div className="flex items-start space-x-3">
                <Keyboard className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Type</div>
                  <div className="text-gray-600 text-xs">Open field for manual entry</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </button>
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

  // Appointment Wrap-Up - FULL PANEL TAKEOVER
  if (showPresets) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden" style={{ zIndex: 20 }}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToActions}
              className="flex items-center text-blue-600 hover:text-blue-700"
              aria-label="Back to actions"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
            </button>
            <Calendar className="w-5 h-5 text-blue-600" />
            <div className="text-left flex-1">
              <h3 className="text-gray-900 font-medium text-sm">Appointment Wrap-up</h3>
              <p className="text-gray-600 text-xs">Quick presets or custom builder</p>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex rounded-lg bg-white border border-gray-200 p-1">
            <button
              onClick={() => setShowMatrixBuilder(false)}
              className={`
                flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all
                ${!showMatrixBuilder
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Quick Presets
            </button>
            <button
              onClick={() => setShowMatrixBuilder(true)}
              className={`
                flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center space-x-1
                ${showMatrixBuilder
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Settings className="w-3 h-3" />
              <span>Custom Builder</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {showMatrixBuilder ? (
            // Matrix Builder Interface
            <AppointmentMatrixBuilder
              onGenerate={async (preset) => {
                await handleAction('appointment-wrap-up', {
                  preset: {
                    id: 'matrix-generated',
                    displayName: preset.displayName,
                    itemCode: preset.itemCode,
                    notes: preset.notes
                  }
                });
              }}
            />
          ) : (
            // Quick Presets Grid
            <div className="grid grid-cols-1 gap-3">
              {APPOINTMENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={processingAction === 'appointment-wrap-up'}
                  className={`
                    bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-lg p-4 text-left
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
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50">
          <p className="text-gray-600 text-xs">
            💡 <strong>Tip:</strong> {showMatrixBuilder
              ? 'Build any appointment combination by selecting options in each category'
              : 'Choose a quick preset or switch to Custom Builder for more options'
            }
          </p>
        </div>
      </div>
    );
  }

  // MAIN GRID VIEW
  return (
    <motion.div
      className="bg-white pb-3"
      variants={withReducedMotion(staggerContainer)}
      initial="hidden"
      animate="visible"
      style={{ position: 'relative', zIndex: 10 }}
    >
      {/* Header with collapse/expand button */}
      <motion.div
        className="px-2 mb-3"
        variants={withReducedMotion(listItemVariants)}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <h3 className="text-gray-900 font-semibold text-[13px]">Quick Actions</h3>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-600 hover:text-gray-900 transition-colors p-1"
            aria-label={isCollapsed ? "Expand quick actions" : "Collapse quick actions"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="h-px bg-gray-200" />
      </motion.div>

      {/* Collapsed View - All 5 items in single row (compact) */}
      {isCollapsed && (
        <motion.div
          className="px-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="grid grid-cols-5 gap-x-1.5">
            {/* Record Button in first position - compact */}
            {onStartWorkflow && (
              <div className="flex items-center justify-center scale-90" style={{ position: 'relative', zIndex: 100 }}>
                <RecordPanel
                  onWorkflowSelect={onStartWorkflow}
                  activeWorkflow={activeWorkflow}
                  isRecording={isRecording}
                  disabled={false}
                  voiceActivityLevel={voiceActivityLevel}
                  recordingTime={recordingTime}
                  whisperServerRunning={whisperServerRunning}
                  onTypeClick={onTypeClick}
                />
              </div>
            )}

            {/* All 4 essential actions: Background, Investigations, Medications, Wrap Up */}
            {CORE_ACTIONS.filter(action =>
              ['background', 'investigation-summary', 'medications', 'appointment-wrap-up'].includes(action.id)
            ).map((action) => (
              <div key={action.id} className="scale-90">
                <QuickActionItem
                  id={action.id}
                  label={action.label}
                  alias={action.alias}
                  icon={action.icon}
                  category="core"
                  onClick={() => handleAction(action.id)}
                  isProcessing={processingAction === action.id}
                  isExpandable={action.isExpandable}
                  workflowId={action.workflowId}
                  onDictate={handleDictate}
                  onType={handleType}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Expanded View - All Actions */}
      {!isCollapsed && (
        <>
          {/* Core Actions Group with Record Button */}
          <motion.div
            className="px-2 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
              {/* Record Button in first position */}
              {onStartWorkflow && (
                <div className="flex items-center justify-center" style={{ position: 'relative', zIndex: 100 }}>
                  <RecordPanel
                    onWorkflowSelect={onStartWorkflow}
                    activeWorkflow={activeWorkflow}
                    isRecording={isRecording}
                    disabled={false}
                    voiceActivityLevel={voiceActivityLevel}
                    recordingTime={recordingTime}
                    whisperServerRunning={whisperServerRunning}
                    onTypeClick={onTypeClick}
                  />
                </div>
              )}

              {/* All Core Actions */}
              {CORE_ACTIONS.map((action) => (
                <QuickActionItem
                  key={action.id}
                  id={action.id}
                  label={action.label}
                  alias={action.alias}
                  icon={action.icon}
                  category="core"
                  onClick={() => handleAction(action.id)}
                  isProcessing={processingAction === action.id}
                  isExpandable={action.isExpandable}
                  workflowId={action.workflowId}
                  onDictate={handleDictate}
                  onType={handleType}
                />
              ))}
            </div>
          </motion.div>

          {/* Group Separator */}
          <div className="px-2 mb-4">
            <div className="h-px bg-gray-100" />
          </div>

          {/* Secondary Actions Group (6 items + AI split cell) */}
          <motion.div
            className="px-2"
            variants={withReducedMotion(staggerContainer)}
            transition={{
              staggerChildren: STAGGER_CONFIGS.tight,
              delayChildren: 0.1
            }}
          >
            <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
              {SECONDARY_ACTIONS.filter(action => !['ai-medical-review', 'batch-ai-review'].includes(action.id)).map((action, index) => (
                <motion.div
                  key={action.id}
                  variants={withReducedMotion(listItemVariants)}
                  custom={index}
                >
                  <QuickActionItem
                    id={action.id}
                    label={action.label}
                    alias={action.alias}
                    icon={action.icon}
                    category="secondary"
                    onClick={() => handleAction(action.id)}
                    isProcessing={processingAction === action.id}
                  />
                </motion.div>
              ))}

              {/* AI Actions Split Cell - Last cell contains both AI actions side by side */}
              <motion.div
                variants={withReducedMotion(listItemVariants)}
                custom={SECONDARY_ACTIONS.filter(action => !['ai-medical-review', 'batch-ai-review'].includes(action.id)).length}
                className="relative overflow-hidden rounded-lg transition-all"
                style={{ minHeight: '64px' }}
              >
                <div className="grid grid-cols-2 gap-0 h-full">
                  {/* AI Medical Review (left half) */}
                  <button
                    onClick={() => handleAction('ai-medical-review')}
                    disabled={processingAction === 'ai-medical-review'}
                    className="flex flex-col items-center justify-center p-1 border-r border-gray-200 hover:bg-purple-50 transition-all"
                    title="AI Medical Review"
                  >
                    {AiReviewIcon && (
                      <>
                        <AiReviewIcon className="w-4 h-4 text-purple-600 mb-1" strokeWidth={2} />
                        <div className="text-[9px] font-medium text-gray-700 text-center leading-tight">
                          AI Review
                        </div>
                      </>
                    )}
                  </button>

                  {/* Batch AI Review (right half) */}
                  <button
                    onClick={() => handleAction('batch-ai-review')}
                    disabled={processingAction === 'batch-ai-review'}
                    className="flex flex-col items-center justify-center p-1 hover:bg-purple-50 transition-all"
                    title="Batch AI Review"
                  >
                    {BatchAiIcon && (
                      <>
                        <BatchAiIcon className="w-4 h-4 text-purple-600 mb-1" strokeWidth={2} />
                        <div className="text-[9px] font-medium text-gray-700 text-center leading-tight">
                          Batch AI
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {(processingAction === 'ai-medical-review' || processingAction === 'batch-ai-review') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
});

QuickActionsGrouped.displayName = 'QuickActionsGrouped';
