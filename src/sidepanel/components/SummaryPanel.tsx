import React, { useState } from 'react';
import { Copy, Send, Check, FileText, Info } from 'lucide-react';
import type { AgentType } from '@/types/medical.types';
import Button from './buttons/Button';

interface SummaryPanelProps {
  summary: string;
  agentType: AgentType | null;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  summary,
  agentType,
  onCopy,
  onInsertToEMR
}) => {
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [insertedRecently, setInsertedRecently] = useState(false);

  const handleCopy = async () => {
    try {
      await onCopy(summary);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to copy summary:', error);
    }
  };

  const handleInsertToEMR = async () => {
    try {
      await onInsertToEMR(summary);
      setInsertedRecently(true);
      setTimeout(() => setInsertedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to insert summary to EMR:', error);
    }
  };

  const _agentDisplayName = agentType ? agentType.toUpperCase().replace('-', ' ') : 'AI Assistant';
  const characterCount = summary.length;
  
  // Determine if this is a narrative letter agent or structured report agent
  const isLetterAgent = agentType && ['quick-letter'].includes(agentType);
  const summaryTitle = isLetterAgent ? 'Letter Summary' : 'Report Summary';
  const summarySubtitle = isLetterAgent ? 'Key clinical highlight' : 'Key findings summary';

  return (
    <div className="summary-card rounded-2xl overflow-hidden shadow-lg border">
      {/* Header */}
      <div className="p-4 border-b border-blue-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-gray-900 font-medium text-sm">{summaryTitle}</h3>
              <p className="text-blue-700 text-xs">{summarySubtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-blue-600">
            <Info className="w-3 h-3" />
            <span>{characterCount}/150</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
          <p className="text-gray-800 text-sm leading-relaxed font-medium">
            {summary}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {/* Copy Summary Button */}
          <Button
            onClick={handleCopy}
            variant={copiedRecently ? 'primary' : 'outline'}
            size="md"
            className="flex-col !h-auto p-3"
          >
            {copiedRecently ? (
              <Check className="w-4 h-4 text-blue-600 mb-1" />
            ) : (
              <Copy className="w-4 h-4 mb-1" />
            )}
            <span className="text-xs">
              {copiedRecently ? 'Copied!' : 'Copy'}
            </span>
          </Button>

          {/* Insert Summary Button */}
          <Button
            onClick={handleInsertToEMR}
            variant={insertedRecently ? 'primary' : 'outline'}
            size="md"
            className="flex-col !h-auto p-3"
          >
            {insertedRecently ? (
              <Check className="w-4 h-4 text-blue-600 mb-1" />
            ) : (
              <Send className="w-4 h-4 mb-1" />
            )}
            <span className="text-xs">
              {insertedRecently ? 'Inserted!' : 'Insert'}
            </span>
          </Button>
        </div>

        {/* Usage Tip */}
        <div className="mt-3 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
          <p className="text-blue-700 text-xs">
            💡 <strong>Summary:</strong> Use this concise highlight for quick reference or brief documentation.
          </p>
        </div>
      </div>
    </div>
  );
};