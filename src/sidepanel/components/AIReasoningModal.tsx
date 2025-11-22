/**
 * AI Reasoning Modal Component
 *
 * Professional modal component for viewing AI reasoning artifacts
 * - Tabbed interface for different reasoning sections
 * - Monochrome design following medical UI standards
 * - Copy functionality for transparency and debugging
 * - Educational tooltips for medical professionals
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Brain, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { buttonVariants } from '@/utils/animations';
import { Modal } from './modals';
import { Button } from './buttons';

interface ReasoningArtifacts {
  dictationAnalysis?: string;
  summaryPlanning?: string;
  letterPlanning?: string;
  constraintChecklist?: string;
  mentalSandbox?: string;
  confidenceScore?: string;
  otherArtifacts?: string[];
  hasReasoningContent?: boolean;
}

interface AIReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasoningArtifacts?: ReasoningArtifacts;
  rawAIOutput?: string;
  agentName?: string;
}

type TabId = 'analysis' | 'planning' | 'process' | 'raw';

interface ReasoningTab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
  content: string | null;
}

const AIReasoningModal: React.FC<AIReasoningModalProps> = ({
  isOpen,
  onClose,
  reasoningArtifacts,
  rawAIOutput,
  agentName = 'Quick Letter Agent'
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('analysis');
  const [copiedTab, setCopiedTab] = useState<TabId | null>(null);

  // Prepare tabs with content
  const tabs: ReasoningTab[] = useMemo(() => [
    {
      id: 'analysis',
      label: 'Analysis',
      icon: <AlertCircle className="w-4 h-4" />,
      description: 'How the AI analyzed the dictation',
      content: reasoningArtifacts?.dictationAnalysis || null
    },
    {
      id: 'planning',
      label: 'Planning',
      icon: <Info className="w-4 h-4" />,
      description: 'How the AI planned the letter structure',
      content: [
        reasoningArtifacts?.summaryPlanning,
        reasoningArtifacts?.letterPlanning
      ].filter(Boolean).join('\n\n') || null
    },
    {
      id: 'process',
      label: 'Process',
      icon: <CheckCircle className="w-4 h-4" />,
      description: 'AI reasoning process and confidence assessment',
      content: [
        reasoningArtifacts?.constraintChecklist,
        reasoningArtifacts?.mentalSandbox,
        reasoningArtifacts?.confidenceScore,
        ...(reasoningArtifacts?.otherArtifacts || [])
      ].filter(Boolean).join('\n\n') || null
    },
    {
      id: 'raw',
      label: 'Raw Output',
      icon: <Brain className="w-4 h-4" />,
      description: 'Complete unprocessed AI response',
      content: rawAIOutput || null
    }
  ], [reasoningArtifacts, rawAIOutput]);

  // Filter tabs to only show those with content
  const availableTabs = tabs.filter(tab => tab.content && tab.content.trim().length > 0);

  // Set first available tab as default if current active tab has no content
  React.useEffect(() => {
    const activeTabHasContent = availableTabs.some(tab => tab.id === activeTab);
    if (!activeTabHasContent && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [activeTab, availableTabs]);

  const handleCopy = async (content: string, tabId: TabId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTab(tabId);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch (error) {
      console.error('Failed to copy reasoning content:', error);
    }
  };

  if (!reasoningArtifacts?.hasReasoningContent && !rawAIOutput) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      header={
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-gray-700" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Reasoning Process</h2>
            <p className="text-sm text-gray-600">{agentName} • Medical Letter Generation</p>
          </div>
        </div>
      }
      footer={
        <p className="text-xs text-gray-500 text-center w-full">
          AI reasoning artifacts are captured for transparency and debugging purposes.
          This shows how the AI model processed your dictation to generate the final letter.
        </p>
      }
    >

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {availableTabs.map((tab) => (
            <motion.button
              key={tab.id}
              variants={buttonVariants}
              className={`
                px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ease-out
                ${activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center space-x-2">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {availableTabs.map((tab) => (
            tab.id === activeTab && (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                {/* Tab Header with Description */}
                <div className="p-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{tab.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{tab.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => tab.content && handleCopy(tab.content, tab.id)}
                      disabled={!tab.content}
                      isSuccess={copiedTab === tab.id}
                      startIcon={
                        copiedTab === tab.id
                          ? <CheckCircle className="w-4 h-4" />
                          : <Copy className="w-4 h-4" />
                      }
                    >
                      {copiedTab === tab.id ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>

                {/* Content Display */}
                <div className="flex-1 overflow-auto p-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm leading-relaxed">
                    <pre className="whitespace-pre-wrap text-gray-800">
                      {tab.content || 'No reasoning content available for this section.'}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

export default AIReasoningModal;
