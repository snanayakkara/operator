import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import type { LesionEntry, LesionTree } from '@/types/medical.types';
import {
  CORONARY_ANATOMY,
  type VesselKey,
  type VesselDefinition,
  type BranchDefinition,
  checkLesionPlacement,
  getVesselDefinition
} from '@/utils/coronaryAnatomy';

interface CoronaryAnatomyTreeProps {
  lesionTree: LesionTree;
  onLesionMove: (lesionId: string, fromVessel: VesselKey, toVessel: VesselKey) => void;
  onLesionChange: (vessel: VesselKey, lesionId: string, field: keyof LesionEntry, value: string) => void;
  onLesionAdd: (vessel: VesselKey) => void;
  onLesionRemove: (vessel: VesselKey, lesionId: string) => void;
  readOnly?: boolean;
}

interface DragState {
  lesionId: string;
  sourceVessel: VesselKey;
}

/**
 * Anatomical tree visualization for coronary lesions
 * Shows vessels with nested branches and supports drag-drop reorganization
 */
export const CoronaryAnatomyTree: React.FC<CoronaryAnatomyTreeProps> = ({
  lesionTree,
  onLesionMove,
  onLesionChange,
  onLesionAdd,
  onLesionRemove,
  readOnly = false
}) => {
  // Track which vessels are expanded
  const [expandedVessels, setExpandedVessels] = useState<Set<VesselKey>>(() => {
    // Start with vessels that have lesions expanded
    const initial = new Set<VesselKey>();
    Object.entries(lesionTree).forEach(([key, lesions]) => {
      if (lesions.length > 0) {
        initial.add(key as VesselKey);
      }
    });
    return initial;
  });

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<VesselKey | null>(null);

  // Count lesions per vessel for badges
  const lesionCounts = useMemo(() => {
    const counts: Record<VesselKey, number> = { lm: 0, lad: 0, lcx: 0, rca: 0, grafts: 0 };
    Object.entries(lesionTree).forEach(([vessel, lesions]) => {
      counts[vessel as VesselKey] = lesions.length;
    });
    return counts;
  }, [lesionTree]);

  // Total lesion count
  const totalLesions = useMemo(() => {
    return Object.values(lesionCounts).reduce((sum, count) => sum + count, 0);
  }, [lesionCounts]);

  // Toggle vessel expansion
  const toggleVessel = useCallback((vessel: VesselKey) => {
    setExpandedVessels(prev => {
      const next = new Set(prev);
      if (next.has(vessel)) {
        next.delete(vessel);
      } else {
        next.add(vessel);
      }
      return next;
    });
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, lesionId: string, sourceVessel: VesselKey) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lesionId);
    setDragState({ lesionId, sourceVessel });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, vessel: VesselKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragState && dragState.sourceVessel !== vessel) {
      setDropTarget(vessel);
    }
  }, [dragState]);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetVessel: VesselKey) => {
    e.preventDefault();
    if (dragState && dragState.sourceVessel !== targetVessel) {
      onLesionMove(dragState.lesionId, dragState.sourceVessel, targetVessel);
    }
    setDragState(null);
    setDropTarget(null);
  }, [dragState, onLesionMove]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="coronary-anatomy-tree">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Coronary Findings
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
            {totalLesions} lesion{totalLesions !== 1 ? 's' : ''}
          </span>
        </div>
        {!readOnly && (
          <span className="text-[10px] text-gray-400">
            Drag to reorganize
          </span>
        )}
      </div>

      {/* Vessel sections */}
      <div className="space-y-1">
        {CORONARY_ANATOMY.map(vessel => (
          <VesselSection
            key={vessel.key}
            vessel={vessel}
            lesions={lesionTree[vessel.key] || []}
            isExpanded={expandedVessels.has(vessel.key)}
            onToggle={() => toggleVessel(vessel.key)}
            onLesionChange={(lesionId, field, value) =>
              onLesionChange(vessel.key, lesionId, field, value)
            }
            onLesionAdd={() => onLesionAdd(vessel.key)}
            onLesionRemove={(lesionId) => onLesionRemove(vessel.key, lesionId)}
            onDragStart={(e, lesionId) => handleDragStart(e, lesionId, vessel.key)}
            onDragOver={(e) => handleDragOver(e, vessel.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, vessel.key)}
            onDragEnd={handleDragEnd}
            isDropTarget={dropTarget === vessel.key}
            isDragging={dragState?.sourceVessel === vessel.key}
            draggedLesionId={dragState?.lesionId ?? null}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
};

interface VesselSectionProps {
  vessel: VesselDefinition;
  lesions: LesionEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onLesionChange: (lesionId: string, field: keyof LesionEntry, value: string) => void;
  onLesionAdd: () => void;
  onLesionRemove: (lesionId: string) => void;
  onDragStart: (e: React.DragEvent, lesionId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
  isDragging: boolean;
  draggedLesionId: string | null;
  readOnly: boolean;
}

const VesselSection: React.FC<VesselSectionProps> = ({
  vessel,
  lesions,
  isExpanded,
  onToggle,
  onLesionChange,
  onLesionAdd,
  onLesionRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDropTarget,
  isDragging,
  draggedLesionId,
  readOnly
}) => {
  const count = lesions.length;

  // Group lesions by branch
  const lesionsByBranch = useMemo(() => {
    const grouped: Map<string, LesionEntry[]> = new Map();
    const unassigned: LesionEntry[] = [];

    lesions.forEach(lesion => {
      // Find matching branch
      const matchingBranch = vessel.branches.find(branch =>
        branch.abbrevs.some(abbrev =>
          lesion.branch.toLowerCase().includes(abbrev.toLowerCase())
        )
      );

      if (matchingBranch) {
        const existing = grouped.get(matchingBranch.id) || [];
        grouped.set(matchingBranch.id, [...existing, lesion]);
      } else {
        unassigned.push(lesion);
      }
    });

    return { grouped, unassigned };
  }, [lesions, vessel.branches]);

  return (
    <div
      className={`vessel-section rounded-lg border transition-all ${
        isDropTarget
          ? 'border-violet-400 bg-violet-50/50 ring-2 ring-violet-200/50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Vessel Header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50/50 transition-colors rounded-t-lg"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${vessel.color}`} />
        <span className="text-sm font-semibold text-gray-800">{vessel.abbrev}</span>
        <span className="text-xs text-gray-400 flex-1 text-left truncate">
          {vessel.label}
        </span>
        {count > 0 ? (
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${vessel.color} text-white`}>
            {count}
          </span>
        ) : (
          <span className="text-[10px] text-gray-300">-</span>
        )}
      </button>

      {/* Expanded content with branches */}
      {isExpanded && (
        <div className="px-2 pb-2">
          {/* Tree structure */}
          <div className="ml-2 border-l border-gray-200">
            {vessel.branches.map((branch, branchIdx) => {
              const branchLesions = lesionsByBranch.grouped.get(branch.id) || [];
              const isLastBranch = branchIdx === vessel.branches.length - 1 &&
                                   lesionsByBranch.unassigned.length === 0;

              return (
                <BranchSection
                  key={branch.id}
                  branch={branch}
                  lesions={branchLesions}
                  vesselKey={vessel.key}
                  vesselColor={vessel.color}
                  isLast={isLastBranch}
                  onLesionChange={onLesionChange}
                  onLesionRemove={onLesionRemove}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  draggedLesionId={draggedLesionId}
                  readOnly={readOnly}
                />
              );
            })}

            {/* Unassigned lesions */}
            {lesionsByBranch.unassigned.length > 0 && (
              <div className="relative pl-4 py-1">
                {/* Tree connector */}
                <div className="absolute left-0 top-0 w-4 h-3 border-l border-b border-gray-200 rounded-bl" />
                <div className="text-[10px] text-gray-400 font-medium mb-1">Other</div>
                <div className="space-y-1">
                  {lesionsByBranch.unassigned.map(lesion => (
                    <LesionCard
                      key={lesion.id}
                      lesion={lesion}
                      vesselKey={vessel.key}
                      vesselColor={vessel.color}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onChange={onLesionChange}
                      onRemove={onLesionRemove}
                      readOnly={readOnly}
                      isDragging={draggedLesionId === lesion.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {count === 0 && (
            <div className="ml-6 text-[10px] text-gray-400 py-2 italic">
              No lesions
            </div>
          )}

          {/* Add button */}
          {!readOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); onLesionAdd(); }}
              className="ml-6 mt-1 flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 hover:bg-violet-50 px-2 py-1 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add lesion
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface BranchSectionProps {
  branch: BranchDefinition;
  lesions: LesionEntry[];
  vesselKey: VesselKey;
  vesselColor: string;
  isLast: boolean;
  onLesionChange: (lesionId: string, field: keyof LesionEntry, value: string) => void;
  onLesionRemove: (lesionId: string) => void;
  onDragStart: (e: React.DragEvent, lesionId: string) => void;
  onDragEnd: () => void;
  draggedLesionId: string | null;
  readOnly: boolean;
}

const BranchSection: React.FC<BranchSectionProps> = ({
  branch,
  lesions,
  vesselKey,
  vesselColor,
  isLast,
  onLesionChange,
  onLesionRemove,
  onDragStart,
  onDragEnd,
  draggedLesionId,
  readOnly
}) => {
  if (lesions.length === 0) {
    return null; // Don't show empty branches
  }

  return (
    <div className="relative pl-4 py-1">
      {/* Tree connector - horizontal line to branch */}
      <div
        className={`absolute left-0 top-3 w-4 h-px bg-gray-200`}
      />
      {/* Vertical continuation line */}
      {!isLast && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" />
      )}

      {/* Branch label */}
      <div className="text-[10px] text-gray-500 font-medium mb-1">
        {branch.label}
      </div>

      {/* Lesions for this branch */}
      <div className="space-y-1">
        {lesions.map(lesion => (
          <LesionCard
            key={lesion.id}
            lesion={lesion}
            vesselKey={vesselKey}
            vesselColor={vesselColor}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onChange={onLesionChange}
            onRemove={onLesionRemove}
            readOnly={readOnly}
            isDragging={draggedLesionId === lesion.id}
          />
        ))}
      </div>
    </div>
  );
};

interface LesionCardProps {
  lesion: LesionEntry;
  vesselKey: VesselKey;
  vesselColor: string;
  onDragStart: (e: React.DragEvent, lesionId: string) => void;
  onDragEnd: () => void;
  onChange: (lesionId: string, field: keyof LesionEntry, value: string) => void;
  onRemove: (lesionId: string) => void;
  readOnly: boolean;
  isDragging: boolean;
}

const LesionCard: React.FC<LesionCardProps> = ({
  lesion,
  vesselKey,
  vesselColor,
  onDragStart,
  onDragEnd,
  onChange,
  onRemove,
  readOnly,
  isDragging
}) => {
  // Check if this lesion is misplaced (OM under RCA, etc.)
  const { isMisplaced, correctVessel } = checkLesionPlacement(lesion.branch, vesselKey);
  const correctVesselDef = correctVessel ? getVesselDefinition(correctVessel) : null;

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => onDragStart(e, lesion.id)}
      onDragEnd={onDragEnd}
      className={`lesion-card relative flex items-start gap-1.5 p-2 rounded-md border transition-all ${
        isDragging
          ? 'opacity-40 bg-gray-100 border-gray-300 scale-95'
          : isMisplaced
            ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
            : 'bg-white border-gray-200 hover:border-violet-300 hover:shadow-sm'
      } ${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Drag handle */}
      {!readOnly && (
        <div className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-gray-400">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Vessel color indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${vesselColor}`} />

      <div className="flex-1 min-w-0 pl-0.5">
        {/* Misplacement warning */}
        {isMisplaced && correctVesselDef && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 mb-1">
            <AlertTriangle className="w-3 h-3" />
            <span>
              Should be under <strong>{correctVesselDef.abbrev}</strong> - drag to move
            </span>
          </div>
        )}

        {/* Branch + Severity row */}
        <div className="flex items-center gap-1.5 mb-1">
          <input
            className="flex-1 min-w-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs font-medium text-gray-900 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200"
            value={lesion.branch}
            onChange={(e) => onChange(lesion.id, 'branch', e.target.value)}
            placeholder="Branch"
            disabled={readOnly}
          />
          <input
            className="w-20 flex-shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs text-gray-700 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200"
            value={lesion.severity}
            onChange={(e) => onChange(lesion.id, 'severity', e.target.value)}
            placeholder="Severity"
            disabled={readOnly}
          />
          {!readOnly && (
            <button
              onClick={() => onRemove(lesion.id)}
              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              title="Remove lesion"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Description */}
        {(lesion.description || !readOnly) && (
          <textarea
            className="w-full rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-[11px] text-gray-600 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200 resize-none"
            value={lesion.description}
            onChange={(e) => onChange(lesion.id, 'description', e.target.value)}
            placeholder="Description (characteristics, intervention, etc.)"
            rows={1}
            disabled={readOnly}
          />
        )}
      </div>
    </div>
  );
};

export default CoronaryAnatomyTree;
