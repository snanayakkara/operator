/**
 * VisualProofMode.tsx
 *
 * Visual proof mode component for Key Facts verification.
 * Displays critical procedural facts in an interactive tree/card layout
 * with keyboard-based corrections.
 *
 * Phase 1: Keyboard corrections only (voice corrections deferred to Phase 2)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Check, Edit3, X, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { KeyFact, KeyFactsProofResult } from '../../../types/medical.types';
import { Button } from '../buttons';

export interface VisualProofModeProps {
  /** Facts to verify */
  facts: KeyFact[];

  /** Agent name for context */
  agentLabel: string;

  /** Called when user confirms all facts */
  onConfirm: (result: KeyFactsProofResult) => void;

  /** Called when user cancels */
  onCancel: () => void;

  /** Group facts by category? */
  groupByCategory?: boolean;

  /** Show confidence scores? */
  showConfidence?: boolean;
}

interface FactGroup {
  category: string;
  facts: KeyFact[];
  allConfirmed: boolean;
}

/**
 * VisualProofMode - Interactive visual verification of key facts
 */
export const VisualProofMode: React.FC<VisualProofModeProps> = ({
  facts: initialFacts,
  agentLabel,
  onConfirm,
  onCancel,
  groupByCategory = true,
  showConfidence = false
}) => {
  const [facts, setFacts] = useState<KeyFact[]>(initialFacts);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [startTime] = useState(Date.now());

  // Auto-expand all categories on mount
  useEffect(() => {
    if (groupByCategory) {
      const categories = new Set(facts.map(f => f.category));
      setExpandedCategories(categories);
    }
  }, [groupByCategory, facts]);

  // Group facts by category
  const factGroups = useMemo<FactGroup[]>(() => {
    if (!groupByCategory) {
      return [{
        category: 'All Facts',
        facts,
        allConfirmed: facts.every(f => f.status !== 'pending')
      }];
    }

    const groups = new Map<string, KeyFact[]>();
    facts.forEach(fact => {
      if (!groups.has(fact.category)) {
        groups.set(fact.category, []);
      }
      groups.get(fact.category)!.push(fact);
    });

    return Array.from(groups.entries()).map(([category, groupFacts]) => ({
      category,
      facts: groupFacts,
      allConfirmed: groupFacts.every(f => f.status !== 'pending')
    }));
  }, [facts, groupByCategory]);

  // Check if all facts are confirmed or edited
  const allFactsReviewed = useMemo(
    () => facts.every(f => f.status !== 'pending'),
    [facts]
  );

  // Count edits and rejects
  const stats = useMemo(() => {
    return {
      editsCount: facts.filter(f => f.status === 'edited').length,
      rejectsCount: facts.filter(f => f.status === 'rejected').length,
      confirmedCount: facts.filter(f => f.status === 'confirmed').length,
      pendingCount: facts.filter(f => f.status === 'pending').length
    };
  }, [facts]);

  const handleConfirmFact = (factId: string) => {
    setFacts(prev => prev.map(f =>
      f.id === factId ? { ...f, status: 'confirmed' as const } : f
    ));
  };

  const handleStartEdit = (fact: KeyFact) => {
    setEditingFactId(fact.id);
    setEditValue(fact.value);
  };

  const handleSaveEdit = (factId: string) => {
    setFacts(prev => prev.map(f =>
      f.id === factId
        ? {
            ...f,
            originalValue: f.originalValue || f.value,
            value: editValue,
            status: 'edited' as const
          }
        : f
    ));
    setEditingFactId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingFactId(null);
    setEditValue('');
  };

  const handleRejectFact = (factId: string) => {
    setFacts(prev => prev.map(f =>
      f.id === factId ? { ...f, status: 'rejected' as const } : f
    ));
  };

  const handleToggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleConfirmAll = () => {
    const timeSpent = Date.now() - startTime;
    const result: KeyFactsProofResult = {
      facts,
      action: 'confirmed',
      modeUsed: 'visual',
      timeSpent,
      completedAt: Date.now(),
      editsCount: stats.editsCount,
      rejectsCount: stats.rejectsCount
    };
    onConfirm(result);
  };

  const handleCancelAll = () => {
    onCancel();
  };

  return (
    <div className="visual-proof-mode">
      {/* Header */}
      <div className="proof-mode-header">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Verify Key Facts — {agentLabel}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
          Review critical procedural details before generating the report.
          Use keyboard to confirm (✓) or edit values.
        </p>
      </div>

      {/* Stats bar */}
      <div className="stats-bar flex flex-wrap gap-3 text-xs mt-3 mb-4">
        <div className="stat">
          <span className="font-medium text-gray-600 dark:text-gray-300">Total:</span>{' '}
          <span className="text-gray-900 dark:text-gray-100">{facts.length}</span>
        </div>
        <div className="stat">
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Confirmed:</span>{' '}
          <span className="text-emerald-900 dark:text-emerald-100">{stats.confirmedCount}</span>
        </div>
        {stats.editsCount > 0 && (
          <div className="stat">
            <span className="font-medium text-blue-700 dark:text-blue-400">Edited:</span>{' '}
            <span className="text-blue-900 dark:text-blue-100">{stats.editsCount}</span>
          </div>
        )}
        {stats.rejectsCount > 0 && (
          <div className="stat">
            <span className="font-medium text-rose-700 dark:text-rose-400">Flagged:</span>{' '}
            <span className="text-rose-900 dark:text-rose-100">{stats.rejectsCount}</span>
          </div>
        )}
        {stats.pendingCount > 0 && (
          <div className="stat">
            <span className="font-medium text-amber-700 dark:text-amber-400">Pending:</span>{' '}
            <span className="text-amber-900 dark:text-amber-100">{stats.pendingCount}</span>
          </div>
        )}
      </div>

      {/* Fact groups */}
      <div className="fact-groups space-y-2 max-h-[56vh] overflow-y-auto">
        {factGroups.map(group => (
          <div key={group.category} className="fact-group">
            {/* Category header */}
            {groupByCategory && (
              <button
                onClick={() => handleToggleCategory(group.category)}
                className="category-header w-full flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-t hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedCategories.has(group.category) ? (
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {group.category}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-500">
                    ({group.facts.length})
                  </span>
                </div>
                {group.allConfirmed && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            )}

            {/* Facts list */}
            {(!groupByCategory || expandedCategories.has(group.category)) && (
              <div className="facts-list space-y-2 p-2">
                {group.facts.map(fact => (
                  <FactCard
                    key={fact.id}
                    fact={fact}
                    isEditing={editingFactId === fact.id}
                    editValue={editValue}
                    showConfidence={showConfidence}
                    onConfirm={() => handleConfirmFact(fact.id)}
                    onStartEdit={() => handleStartEdit(fact)}
                    onSaveEdit={() => handleSaveEdit(fact.id)}
                    onCancelEdit={handleCancelEdit}
                    onReject={() => handleRejectFact(fact.id)}
                    onEditValueChange={setEditValue}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="action-buttons flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={handleCancelAll}
          variant="secondary"
          size="sm"
          className="flex-1 h-auto py-2 text-sm leading-tight"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmAll}
          variant="primary"
          disabled={!allFactsReviewed}
          size="sm"
          className="flex-1 h-auto py-2 text-sm leading-tight whitespace-normal"
        >
          {allFactsReviewed
            ? `Generate Report`
            : `Review ${stats.pendingCount} remaining`}
        </Button>
      </div>
    </div>
  );
};

interface FactCardProps {
  fact: KeyFact;
  isEditing: boolean;
  editValue: string;
  showConfidence: boolean;
  onConfirm: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onReject: () => void;
  onEditValueChange: (value: string) => void;
}

const FactCard: React.FC<FactCardProps> = ({
  fact,
  isEditing,
  editValue,
  showConfidence,
  onConfirm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onReject,
  onEditValueChange
}) => {
  const statusColors = {
    pending: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30',
    confirmed: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30',
    edited: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30',
    rejected: 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30'
  };

  const statusIcons = {
    pending: null,
    confirmed: <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    edited: <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    rejected: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
  };

  return (
    <div
      className={`fact-card border-l-4 p-2.5 rounded-md ${statusColors[fact.status]}`}
    >
      <div className="fact-header flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {fact.label}
            </span>
            {statusIcons[fact.status]}
            {fact.critical && (
              <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded font-medium">
                CRITICAL
              </span>
            )}
          </div>
          {showConfidence && fact.confidence !== undefined && (
            <span className="text-[11px] text-gray-500 dark:text-gray-500">
              Confidence: {(fact.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Value display or edit */}
      {isEditing ? (
        <div className="edit-controls space-y-2">
          <input
            type="text"
            value={editValue}
            onChange={e => onEditValueChange(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="value-display">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {fact.value}
            {fact.unit && <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">{fact.unit}</span>}
          </p>
          {fact.status === 'edited' && fact.originalValue && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Original: <span className="line-through">{fact.originalValue}</span>
            </p>
          )}

          {/* Action buttons */}
          {fact.status === 'pending' && (
            <div className="action-buttons flex gap-2 mt-2">
              <button
                onClick={onConfirm}
                className="px-3 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" />
                Confirm
              </button>
              <button
                onClick={onStartEdit}
                className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={onReject}
                className="px-3 py-1 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Flag
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisualProofMode;
