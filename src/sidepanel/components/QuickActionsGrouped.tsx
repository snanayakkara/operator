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
  Calendar,
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Mic,
  Keyboard,
  Stethoscope,
  Camera
} from 'lucide-react';
import { QuickActionItem } from './QuickActionItem';
import { RecordPanel } from './RecordPanel';
import { AppointmentMatrixBuilder } from './AppointmentMatrixBuilder';
import { CORE_ACTIONS, SECONDARY_ACTIONS } from '@/config/quickActionsConfig';
import type { AgentType } from '@/types/medical.types';
import {
  staggerContainer,
  withReducedMotion
} from '@/utils/animations';
import { Button, IconButton } from './buttons';

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
  onOpenRounds?: () => void;
  onImageInvestigation?: () => void; // For image-based investigation summary
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
  onTypeClick,
  onOpenRounds,
  onImageInvestigation
}) => {
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showAppointmentBuilder, setShowAppointmentBuilder] = useState(false);
  const [showInvestigationOptions, setShowInvestigationOptions] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('quickActionsCollapsed');
    return saved === null ? true : saved === 'true';
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('quickActionsCollapsed', isCollapsed.toString());
  }, [isCollapsed]);


  const handleAction = async (actionId: string, data?: unknown) => {
    // Show appointment builder for appointment wrap-up
    if (actionId === 'appointment-wrap-up' && !data) {
      setShowAppointmentBuilder(true);
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

  const handleBackToActions = () => {
    setShowAppointmentBuilder(false);
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
            <IconButton
              onClick={handleBackToActions}
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              aria-label="Back to actions"
              className="text-blue-600 hover:text-blue-700"
            />
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
            <Button
              onClick={() => {
                if (onStartWorkflow) {
                  onStartWorkflow('investigation-summary', 'investigation-summary');
                }
                setShowInvestigationOptions(false);
              }}
              disabled={processingAction === 'investigation-summary'}
              variant="outline"
              className="justify-start h-auto py-4"
            >
              <div className="flex items-start space-x-3 w-full">
                <Mic className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Dictate</div>
                  <div className="text-gray-600 text-xs">Voice-to-text with AI formatting</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </Button>

            <Button
              onClick={() => handleType('investigation-summary')}
              disabled={processingAction === 'investigation-summary'}
              variant="outline"
              className="justify-start h-auto py-4"
            >
              <div className="flex items-start space-x-3 w-full">
                <Keyboard className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Type</div>
                  <div className="text-gray-600 text-xs">Open field for manual entry</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </Button>

            <Button
              onClick={() => {
                if (onImageInvestigation) {
                  onImageInvestigation();
                }
                setShowInvestigationOptions(false);
              }}
              disabled={processingAction === 'investigation-summary'}
              variant="outline"
              className="justify-start h-auto py-4"
            >
              <div className="flex items-start space-x-3 w-full">
                <Camera className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Image</div>
                  <div className="text-gray-600 text-xs">Scan from photo or screenshot</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50">
          <p className="text-gray-600 text-xs">
            💡 <strong>Tip:</strong> Dictate uses AI to format your speech, Type opens the field for manual entry, Image extracts from photos
          </p>
        </div>
      </div>
    );
  }

  // Appointment Wrap-Up - FULL PANEL TAKEOVER
  if (showAppointmentBuilder) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ zIndex: 20, maxHeight: 'calc(100vh - 100px)' }}>
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <IconButton
              onClick={handleBackToActions}
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              aria-label="Back to actions"
              className="text-blue-600 hover:text-blue-700"
            />
            <Calendar className="w-5 h-5 text-blue-600" />
            <div className="text-left flex-1">
              <h3 className="text-gray-900 font-medium text-sm">Appointment Wrap-up</h3>
              <p className="text-gray-600 text-xs">Build your appointment</p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <AppointmentMatrixBuilder
            onGenerate={async (preset) => {
              try {
                await handleAction('appointment-wrap-up', {
                  preset: {
                    id: 'matrix-generated',
                    displayName: preset.displayName,
                    itemCode: preset.itemCode,
                    notes: preset.notes,
                    taskMessage: preset.taskMessage
                  }
                });
              } finally {
                handleBackToActions();
              }
            }}
          />
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 p-4 bg-gray-50">
          <p className="text-gray-600 text-xs">
            💡 <strong>Tip:</strong> Use keyboard shortcuts (1-5) to quickly navigate and cycle through options
          </p>
        </div>
      </div>
    );
  }

  // MAIN GRID VIEW - 5-column grid with collapse toggle
  return (
    <motion.div
      className="bg-white pb-2"
      variants={withReducedMotion(staggerContainer)}
      initial="hidden"
      animate="visible"
      style={{ position: 'relative', zIndex: 10 }}
    >
      {/* Header with collapse toggle */}
      <div className="px-2 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Actions</span>
        <div className="flex items-center gap-1">
          {onOpenRounds && (
            <button
              onClick={onOpenRounds}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Open Rounds"
            >
              <Stethoscope className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isCollapsed ? "Expand actions" : "Collapse actions"}
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Collapsed View - single row with 5 essential items */}
      {isCollapsed && (
        <div className="px-2">
          <div className="grid grid-cols-5 gap-0.5">
            {/* Record Button */}
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

            {/* 4 essential actions */}
            {CORE_ACTIONS.filter(action =>
              ['background', 'investigation-summary', 'medications', 'quick-letter'].includes(action.id)
            ).map((action) => (
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
                onImage={action.id === 'investigation-summary' ? () => onImageInvestigation?.() : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expanded View - all actions in 5-column grid */}
      {!isCollapsed && (
        <div className="px-2">
          <div className="grid grid-cols-5 gap-0.5">
            {/* Record Button */}
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
                onImage={action.id === 'investigation-summary' ? () => onImageInvestigation?.() : undefined}
              />
            ))}

            {/* All Secondary Actions */}
            {SECONDARY_ACTIONS.map((action) => (
              <QuickActionItem
                key={action.id}
                id={action.id}
                label={action.label}
                alias={action.alias}
                icon={action.icon}
                category="secondary"
                onClick={() => handleAction(action.id)}
                isProcessing={processingAction === action.id}
                colorTheme={action.colorTheme}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
});

QuickActionsGrouped.displayName = 'QuickActionsGrouped';
