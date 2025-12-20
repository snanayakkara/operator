import React, { useEffect, useMemo, useState } from 'react';
import { GitBranch, Plus, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { LesionTree, LesionEntry } from '@/utils/AngioLesionUtils';
import { createEmptyLesionTree } from '@/utils/AngioLesionUtils';

interface AngioLesionReviewDialogProps {
  open: boolean;
  lesionTree: LesionTree | null;
  onClose: () => void;
  onConfirm: (tree: LesionTree) => void;
}

const vesselOrder: { key: keyof LesionTree; color: string; label: string; abbrev: string }[] = [
  { key: 'lm', color: 'bg-amber-400', label: 'Left Main', abbrev: 'LM' },
  { key: 'lad', color: 'bg-rose-400', label: 'Left Anterior Descending', abbrev: 'LAD' },
  { key: 'lcx', color: 'bg-sky-400', label: 'Left Circumflex', abbrev: 'LCx' },
  { key: 'rca', color: 'bg-emerald-400', label: 'Right Coronary', abbrev: 'RCA' },
  { key: 'grafts', color: 'bg-indigo-400', label: 'Grafts', abbrev: 'Grafts' }
];

/** Stacked lesion card for better readability */
const LesionRow: React.FC<{
  lesion: LesionEntry;
  vesselAbbrev: string;
  vesselColor: string;
  onChange: (field: keyof LesionEntry, value: string) => void;
  onRemove: () => void;
}> = ({ lesion, vesselAbbrev, vesselColor, onChange, onRemove }) => {
  return (
    <div className="relative bg-white rounded border border-gray-200 group hover:border-blue-300 transition-colors">
      {/* Vessel indicator bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l ${vesselColor}`} />
      
      <div className="pl-2 pr-1 py-1.5">
        {/* Top row: Branch + Severity inline */}
        <div className="flex items-center gap-1 mb-1">
          <input
            className="flex-1 min-w-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs font-medium text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none"
            value={lesion.branch}
            onChange={(e) => onChange('branch', e.target.value)}
            placeholder={vesselAbbrev}
            title="Branch/Segment"
          />
          <input
            className="w-20 flex-shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs text-gray-700 focus:border-blue-400 focus:bg-white focus:outline-none"
            value={lesion.severity}
            onChange={(e) => onChange('severity', e.target.value)}
            placeholder="%"
            title="Stenosis %"
          />
          <button
            onClick={onRemove}
            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0"
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        
        {/* Bottom row: Full-width description */}
        <textarea
          className="w-full rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs text-gray-600 focus:border-blue-400 focus:bg-white focus:outline-none resize-none"
          value={lesion.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Description..."
          title="Description"
          rows={2}
        />
      </div>
    </div>
  );
};

/** Collapsible vessel section */
const VesselSection: React.FC<{
  vessel: typeof vesselOrder[0];
  lesions: LesionEntry[];
  onLesionChange: (lesionId: string, field: keyof LesionEntry, value: string) => void;
  onAddLesion: () => void;
  onRemoveLesion: (lesionId: string) => void;
}> = ({ vessel, lesions, onLesionChange, onAddLesion, onRemoveLesion }) => {
  const [expanded, setExpanded] = useState(lesions.length > 0);
  const hasLesions = lesions.length > 0;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div 
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-50/50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${vessel.color}`} />
        <span className="text-xs font-semibold text-gray-800">{vessel.abbrev}</span>
        <span className="text-[10px] text-gray-400 flex-1 truncate">{vessel.label}</span>
        {hasLesions ? (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
            {lesions.length}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">—</span>
        )}
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
        )}
      </div>
      
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5">
          {lesions.map(lesion => (
            <LesionRow
              key={lesion.id}
              lesion={lesion}
              vesselAbbrev={vessel.abbrev}
              vesselColor={vessel.color}
              onChange={(field, value) => onLesionChange(lesion.id, field, value)}
              onRemove={() => onRemoveLesion(lesion.id)}
            />
          ))}
          {!hasLesions && (
            <div className="text-[10px] text-gray-400 py-1.5 px-2 bg-gray-50 rounded border border-dashed border-gray-200">
              No findings
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onAddLesion(); }}
            className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export const AngioLesionReviewDialog: React.FC<AngioLesionReviewDialogProps> = ({
  open,
  lesionTree,
  onClose,
  onConfirm
}) => {
  const [draftTree, setDraftTree] = useState<LesionTree>(createEmptyLesionTree());

  useEffect(() => {
    if (lesionTree) {
      setDraftTree(lesionTree);
    } else {
      setDraftTree(createEmptyLesionTree());
    }
  }, [lesionTree, open]);

  const totalLesions = useMemo(
    () => Object.values(draftTree).reduce((count, vessel) => count + vessel.length, 0),
    [draftTree]
  );

  const handleLesionChange = (vessel: keyof LesionTree, lesionId: string, field: keyof LesionEntry, value: string) => {
    setDraftTree(prev => ({
      ...prev,
      [vessel]: prev[vessel].map(lesion => lesion.id === lesionId ? { ...lesion, [field]: value } : lesion)
    }));
  };

  const handleAddLesion = (vessel: keyof LesionTree) => {
    setDraftTree(prev => ({
      ...prev,
      [vessel]: [
        ...prev[vessel],
        {
          id: Math.random().toString(36).slice(2, 8),
          branch: vesselOrder.find(v => v.key === vessel)?.abbrev || '',
          severity: '',
          description: ''
        }
      ]
    }));
  };

  const handleRemoveLesion = (vessel: keyof LesionTree, lesionId: string) => {
    setDraftTree(prev => ({
      ...prev,
      [vessel]: prev[vessel].filter(lesion => lesion.id !== lesionId)
    }));
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm p-2">
      <div className="flex-1 flex flex-col rounded-lg border border-blue-200 bg-white shadow-2xl overflow-hidden">
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-2 px-2 py-2 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-gray-900">Review Findings</h3>
              <p className="text-[10px] text-gray-500">
                {totalLesions} finding{totalLesions === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-100 rounded"
            >
              <X className="w-3 h-3" />
              Skip
            </button>
            <button
              onClick={() => onConfirm(draftTree)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              <Check className="w-3 h-3" />
              Update
            </button>
          </div>
        </div>

        {/* Vessel list - scrollable, takes remaining space */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {vesselOrder.map(vessel => (
            <VesselSection
              key={vessel.key}
              vessel={vessel}
              lesions={draftTree[vessel.key]}
              onLesionChange={(lesionId, field, value) => handleLesionChange(vessel.key, lesionId, field, value)}
              onAddLesion={() => handleAddLesion(vessel.key)}
              onRemoveLesion={(lesionId) => handleRemoveLesion(vessel.key, lesionId)}
            />
          ))}
        </div>

        {/* Minimal Footer */}
        <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <p className="text-[10px] text-gray-400 text-center">
            Edit findings or skip to keep original
          </p>
        </div>
      </div>
    </div>
  );
};

AngioLesionReviewDialog.displayName = 'AngioLesionReviewDialog';

export default AngioLesionReviewDialog;
