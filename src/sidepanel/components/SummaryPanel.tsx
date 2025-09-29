import React, { useState } from 'react';
import { Copy, Send, Check, FileText, Info } from 'lucide-react';
import type { AgentType } from '@/types/medical.types';

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
          <button
            onClick={handleCopy}
            className={`
              p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border
              ${copiedRecently 
                ? 'bg-blue-500/20 border-blue-400 text-blue-700' 
                : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
              }
            `}
          >
            {copiedRecently ? (
              <Check className="w-4 h-4 text-blue-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className={`text-xs ${copiedRecently ? 'text-blue-700' : 'text-gray-700'}`}>
              {copiedRecently ? 'Copied!' : 'Copy'}
            </span>
          </button>

          {/* Insert Summary Button */}
          <button
            onClick={handleInsertToEMR}
            className={`
              p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border
              ${insertedRecently 
                ? 'bg-blue-500/20 border-blue-400 text-blue-700' 
                : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
              }
            `}
          >
            {insertedRecently ? (
              <Check className="w-4 h-4 text-blue-600" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className={`text-xs ${insertedRecently ? 'text-blue-700' : 'text-gray-700'}`}>
              {insertedRecently ? 'Inserted!' : 'Insert'}
            </span>
          </button>
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