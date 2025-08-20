import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Check, X, Eye, EyeOff, Copy, Send, RefreshCw, ChevronDown } from 'lucide-react';
import type { AgentType } from '@/types/medical.types';

interface TranscriptionDisplayProps {
  transcription: string;
  onEdit: (newTranscription: string) => void;
  isEditable?: boolean;
  onCopy?: (text: string) => void;
  onInsertToEMR?: (text: string) => void;
  currentAgent?: AgentType | null;
  onAgentReprocess?: (agentType: AgentType) => void;
  isProcessing?: boolean;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcription,
  onEdit,
  isEditable = true,
  onCopy,
  onInsertToEMR,
  currentAgent,
  onAgentReprocess,
  isProcessing = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editValue, setEditValue] = useState(transcription);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [insertedRecently, setInsertedRecently] = useState(false);
  const [showReprocessDropdown, setShowReprocessDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(transcription);
  }, [transcription]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!isEditable) return;
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEdit(editValue.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(transcription);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (isEditing) {
      adjustTextareaHeight();
    }
  }, [isEditing, editValue]);

  const handleCopy = async () => {
    if (!onCopy || !transcription) return;
    try {
      await onCopy(transcription);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to copy transcription:', error);
    }
  };

  const handleInsertToEMR = async () => {
    if (!onInsertToEMR || !transcription) return;
    try {
      await onInsertToEMR(transcription);
      setInsertedRecently(true);
      setTimeout(() => setInsertedRecently(false), 2000);
    } catch (error) {
      console.error('Failed to insert transcription to EMR:', error);
    }
  };

  const handleReprocess = (agentType: AgentType) => {
    if (onAgentReprocess && !isProcessing) {
      onAgentReprocess(agentType);
      setShowReprocessDropdown(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowReprocessDropdown(false);
      }
    };

    if (showReprocessDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReprocessDropdown]);

  const getPreviewText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Available agents for reprocessing
  const availableAgents = [
    { id: 'tavi', label: 'TAVI', icon: '🫀' },
    { id: 'angiogram-pci', label: 'Angiogram/PCI', icon: '🩺' },
    { id: 'quick-letter', label: 'Quick Letter', icon: '📝' },
    { id: 'consultation', label: 'Consultation', icon: '👨‍⚕️' },
    { id: 'investigation-summary', label: 'Investigation', icon: '🔬' }
  ] as const;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-gray-900 font-medium text-sm">Transcription</h3>
          <span className="text-xs text-gray-500">{transcription.split(' ').length} words</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Copy and Insert buttons - only show when transcription exists */}
          {transcription && onCopy && (
            <button
              onClick={handleCopy}
              className="glass-button p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Copy transcription to clipboard"
            >
              {copiedRecently ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          
          {transcription && onInsertToEMR && (
            <button
              onClick={handleInsertToEMR}
              className="glass-button p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Insert transcription to EMR"
            >
              {insertedRecently ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Send className="w-4 h-4 text-blue-600" />
              )}
            </button>
          )}

          {/* Reprocess Dropdown - only show when reprocess functionality is available */}
          {transcription && onAgentReprocess && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowReprocessDropdown(!showReprocessDropdown)}
                disabled={isProcessing}
                className={`glass-button p-2 rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-1 ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Reprocess with different agent"
              >
                <RefreshCw className={`w-4 h-4 text-purple-600 ${isProcessing ? 'animate-spin' : ''}`} />
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>

              {/* Dropdown Menu */}
              {showReprocessDropdown && !isProcessing && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 min-w-[160px]">
                  <div className="py-1">
                    {availableAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleReprocess(agent.id as AgentType)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 ${
                          currentAgent === agent.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <span>{agent.icon}</span>
                        <span>{agent.label}</span>
                        {currentAgent === agent.id && (
                          <span className="ml-auto text-xs text-blue-500">Current</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isEditable && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="glass-button p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Edit transcription"
            >
              <Edit3 className="w-4 h-4 text-blue-600" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="glass-button p-2 rounded-lg hover:bg-white/20 transition-colors"
            title={isExpanded ? 'Collapse transcription' : 'Expand transcription'}
          >
            {isExpanded ? (
              <EyeOff className="w-4 h-4 text-gray-600" />
            ) : (
              <Eye className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            className="w-full glass-input p-3 rounded-lg resize-none overflow-hidden text-sm leading-relaxed"
            placeholder="Edit your transcription..."
            rows={3}
          />
          
          <div className="flex space-x-2">
            <button
              onClick={handleSaveEdit}
              className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Save</span>
            </button>
            
            <button
              onClick={handleCancelEdit}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
          
          <p className="text-gray-500 text-xs">
            Press {navigator.platform.toLowerCase().includes('mac') ? '⌘+Enter' : 'Ctrl+Enter'} to save, Esc to cancel
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {isExpanded ? (
            <div className="bg-gray-50/80 rounded-lg p-3 min-h-[60px] border border-gray-200/50">
              <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                {transcription || 'Your transcription will appear here...'}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-200/50">
              <p className="text-gray-900 text-sm leading-relaxed">
                {transcription ? getPreviewText(transcription) : 'Your transcription will appear here...'}
              </p>
            </div>
          )}
          
          {transcription && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{transcription.split(' ').length} words</span>
              {isEditable && (
                <span>Click {isExpanded ? 'edit to modify' : 'expand to view full text'}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};