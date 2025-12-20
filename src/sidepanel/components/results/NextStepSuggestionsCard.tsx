/**
 * NextStepSuggestionsCard
 * 
 * A separate UI card that displays suggestions from the Next-Step Engine.
 * This card appears below existing Letter and Summary cards.
 * 
 * Behavior:
 * - Expanded list when suggestions exist
 * - Collapsed reassurance state when none exist
 * - User may select suggestions and click "Integrate into Letter"
 * - Integration triggers a full-letter rewrite with undo support
 * 
 * @see docs/Operator_NextStep_Engine_Reference.md
 */

import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Square, 
  CheckSquare,
  Loader2,
  AlertCircle,
  Undo2,
  ArrowRight
} from 'lucide-react';
import type { 
  NextStepSuggestion, 
  NextStepEngineResult, 
  NextStepStatus,
  NextStepPriority 
} from '@/types/nextStep.types';
import { 
  cardVariants, 
  withReducedMotion, 
  ANIMATION_DURATIONS 
} from '@/utils/animations';

/**
 * Props for the NextStepSuggestionsCard component.
 */
interface NextStepSuggestionsCardProps {
  /** Current status of the Next-Step Engine */
  status: NextStepStatus;
  
  /** Result from the engine (null if not yet run or pending) */
  result: NextStepEngineResult | null;
  
  /** Callback when user requests integration of selected suggestions */
  onIntegrate: (suggestions: NextStepSuggestion[]) => Promise<void>;
  
  /** Callback to revert to the previous letter version */
  onUndo?: () => void;
  
  /** Whether undo is available */
  canUndo?: boolean;
  
  /** Whether an integration is currently in progress */
  isIntegrating?: boolean;
  
  /** Error message from integration attempt */
  integrationError?: string | null;
}

/**
 * Priority badge colors and styling.
 */
const PRIORITY_STYLES: Record<NextStepPriority, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  low: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
};

/**
 * Category icons and labels.
 */
const CATEGORY_LABELS: Record<string, string> = {
  investigation: 'Investigation',
  medication: 'Medication',
  referral: 'Referral',
  'follow-up': 'Follow-up',
  lifestyle: 'Lifestyle',
  monitoring: 'Monitoring',
  other: 'Other'
};

/**
 * Individual suggestion item component.
 */
const SuggestionItem = memo(({ 
  suggestion, 
  isSelected, 
  onToggle,
  disabled 
}: { 
  suggestion: NextStepSuggestion; 
  isSelected: boolean; 
  onToggle: (id: string) => void;
  disabled?: boolean;
}) => {
  const priorityStyle = PRIORITY_STYLES[suggestion.priority];
  
  return (
    <motion.div
      className={`
        p-3 rounded-lg border transition-all cursor-pointer
        ${isSelected 
          ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && onToggle(suggestion.id)}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      layout
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <div className="flex-shrink-0 pt-0.5">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-indigo-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with title and badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-medium text-gray-900 text-sm">
              {suggestion.title}
            </h4>
            
            {/* Priority badge */}
            <span className={`
              px-2 py-0.5 text-xs rounded-full border
              ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}
            `}>
              {suggestion.priority}
            </span>
            
            {/* Category badge */}
            {suggestion.category && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {CATEGORY_LABELS[suggestion.category] || suggestion.category}
              </span>
            )}
          </div>
          
          {/* Reason */}
          <p className="text-gray-600 text-sm mb-2">
            {suggestion.reason}
          </p>
          
          {/* Suggested text preview */}
          <div className="text-gray-800 text-sm italic bg-gray-50 p-2 rounded border border-gray-100">
            <ArrowRight className="w-3 h-3 inline-block mr-1 text-gray-400" />
            "{suggestion.suggestedText}"
          </div>
        </div>
      </div>
    </motion.div>
  );
});

SuggestionItem.displayName = 'SuggestionItem';

/**
 * Main NextStepSuggestionsCard component.
 */
const NextStepSuggestionsCard: React.FC<NextStepSuggestionsCardProps> = memo(({
  status,
  result,
  onIntegrate,
  onUndo,
  canUndo = false,
  isIntegrating = false,
  integrationError = null
}) => {
  // Track which suggestions are selected
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Track expansion state
  const [isExpanded, setIsExpanded] = useState(true);
  
  const hasSuggestions = result?.suggestions && result.suggestions.length > 0;
  const suggestions = result?.suggestions || [];
  
  // Default expansion behavior: expanded when there are suggestions
  const effectiveExpanded = hasSuggestions ? isExpanded : false;
  
  /**
   * Toggle suggestion selection.
   */
  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  /**
   * Select all suggestions.
   */
  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(suggestions.map(s => s.id)));
  }, [suggestions]);
  
  /**
   * Clear all selections.
   */
  const handleClearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  
  /**
   * Handle integration request.
   */
  const handleIntegrate = useCallback(async () => {
    const selected = suggestions.filter(s => selectedIds.has(s.id));
    if (selected.length > 0) {
      await onIntegrate(selected);
      // Clear selections after successful integration
      setSelectedIds(new Set());
    }
  }, [suggestions, selectedIds, onIntegrate]);
  
  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === suggestions.length && suggestions.length > 0;
  
  // Render loading state
  if (status === 'pending' || status === 'processing') {
    return (
      <motion.div
        className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={withReducedMotion(cardVariants)}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <div>
            <h3 className="text-indigo-800 font-medium text-sm">
              Analyzing for Next Steps...
            </h3>
            <p className="text-indigo-600 text-xs">
              Reviewing letter for potential clinical considerations
            </p>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Don't render if idle or error with no result
  if (status === 'idle' || (status === 'error' && !result)) {
    return null;
  }
  
  return (
    <motion.div
      className="rounded-lg border border-indigo-200 bg-white overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={withReducedMotion(cardVariants)}
    >
      {/* Header */}
      <div 
        className={`
          px-4 py-3 flex items-center justify-between cursor-pointer
          ${hasSuggestions ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-gray-50'}
        `}
        onClick={() => hasSuggestions && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className={`w-5 h-5 ${hasSuggestions ? 'text-indigo-600' : 'text-gray-400'}`} />
          <div>
            <h3 className={`font-medium text-sm ${hasSuggestions ? 'text-indigo-800' : 'text-gray-600'}`}>
              Next-Step Suggestions
            </h3>
            {hasSuggestions ? (
              <p className="text-indigo-600 text-xs">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} for consideration
              </p>
            ) : (
              <p className="text-gray-500 text-xs">
                No additional next steps identified for this patient
              </p>
            )}
          </div>
        </div>
        
        {hasSuggestions && (
          <div className="flex items-center gap-2">
            {/* Undo button */}
            {canUndo && onUndo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUndo();
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}
            
            {/* Expand/collapse chevron */}
            {effectiveExpanded ? (
              <ChevronUp className="w-5 h-5 text-indigo-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-indigo-400" />
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <AnimatePresence>
        {effectiveExpanded && hasSuggestions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.normal }}
          >
            {/* Selection controls */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={allSelected ? handleClearAll : handleSelectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  disabled={isIntegrating}
                >
                  {allSelected ? (
                    <>
                      <Square className="w-4 h-4" />
                      Clear all
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Select all
                    </>
                  )}
                </button>
                
                {selectedCount > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedCount} selected
                  </span>
                )}
              </div>
            </div>
            
            {/* Suggestions list */}
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {suggestions.map(suggestion => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={selectedIds.has(suggestion.id)}
                  onToggle={handleToggle}
                  disabled={isIntegrating}
                />
              ))}
            </div>
            
            {/* Integration error */}
            {integrationError && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {integrationError}
                </div>
              </div>
            )}
            
            {/* Action footer */}
            <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
              <p className="text-xs text-gray-500 leading-tight">
                Selected suggestions will be smoothly integrated into your letter.
              </p>
              
              <button
                type="button"
                onClick={handleIntegrate}
                disabled={selectedCount === 0 || isIntegrating}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isIntegrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Integrating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Integrate into Letter</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Collapsed state with no suggestions - explanatory note */}
      <AnimatePresence>
        {!hasSuggestions && status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 text-gray-500 text-sm"
          >
            <p>
              The letter appears complete based on the patient's context and current plan. 
              No gaps were identified that would warrant additional clinical considerations.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

NextStepSuggestionsCard.displayName = 'NextStepSuggestionsCard';

export { NextStepSuggestionsCard };
export type { NextStepSuggestionsCardProps };
