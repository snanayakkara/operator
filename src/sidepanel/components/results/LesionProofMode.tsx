import React, { useState, useMemo, useCallback } from 'react';
import { GitBranch, Plus, Trash2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { LesionEntry, LesionTree, KeyFactsProofResult } from '../../../types/medical.types';

interface LesionProofModeProps {
  initialLesionTree: LesionTree;
  extractionMethod: 'regex' | 'quick-model';
  agentLabel: string;
  onComplete: (result: KeyFactsProofResult & { refinedLesions: LesionTree }) => void;
  onCancel: () => void;
}

const vesselOrder: { key: keyof LesionTree; color: string; label: string; abbrev: string }[] = [
  { key: 'lm', color: 'bg-amber-400', label: 'Left Main', abbrev: 'LM' },
  { key: 'lad', color: 'bg-rose-400', label: 'Left Anterior Descending', abbrev: 'LAD' },
  { key: 'lcx', color: 'bg-sky-400', label: 'Left Circumflex', abbrev: 'LCx' },
  { key: 'rca', color: 'bg-emerald-400', label: 'Right Coronary', abbrev: 'RCA' },
  { key: 'grafts', color: 'bg-indigo-400', label: 'Grafts', abbrev: 'Grafts' }
];

/** Lesion row component */
const LesionRow: React.FC<{
  lesion: LesionEntry;
  vesselAbbrev: string;
  vesselColor: string;
  onChange: (field: keyof LesionEntry, value: string) => void;
  onRemove: () => void;
}> = ({ lesion, vesselAbbrev, vesselColor, onChange, onRemove }) => {
  return (
    <div className="relative bg-white rounded border border-gray-200 group hover:border-violet-300 transition-colors">
      {/* Vessel indicator bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l ${vesselColor}`} />

      <div className="pl-2 pr-1 py-1.5">
        {/* Top row: Branch + Severity inline */}
        <div className="flex items-center gap-1 mb-1">
          <input
            className="flex-1 min-w-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs font-medium text-gray-900 focus:border-violet-400 focus:bg-white focus:outline-none"
            value={lesion.branch}
            onChange={(e) => onChange('branch', e.target.value)}
            placeholder={vesselAbbrev}
            title="Branch/Segment"
          />
          <input
            className="w-20 flex-shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs text-gray-700 focus:border-violet-400 focus:bg-white focus:outline-none"
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
          className="w-full rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs text-gray-600 focus:border-violet-400 focus:bg-white focus:outline-none resize-none"
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
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ vessel, lesions, onLesionChange, onAddLesion, onRemoveLesion, isExpanded, onToggle }) => {
  const hasLesions = lesions.length > 0;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${vessel.color}`} />
        <span className="text-sm font-semibold text-gray-800">{vessel.abbrev}</span>
        <span className="text-xs text-gray-500 flex-1 truncate">{vessel.label}</span>
        {hasLesions ? (
          <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
            {lesions.length}
          </span>
        ) : (
          <span className="text-xs text-gray-400">No lesions</span>
        )}
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 bg-gray-50">
          {lesions.map((lesion) => (
            <LesionRow
              key={lesion.id}
              lesion={lesion}
              vesselAbbrev={vessel.abbrev}
              vesselColor={vessel.color}
              onChange={(field, value) => onLesionChange(lesion.id, field, value)}
              onRemove={() => onRemoveLesion(lesion.id)}
            />
          ))}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddLesion();
            }}
            className="w-full py-1.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded border border-dashed border-violet-300 hover:border-violet-400 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Lesion
          </button>
        </div>
      )}
    </div>
  );
};

export const LesionProofMode: React.FC<LesionProofModeProps> = ({
  initialLesionTree,
  extractionMethod,
  agentLabel,
  onComplete,
  onCancel,
}) => {
  const [lesionTree, setLesionTree] = useState<LesionTree>(initialLesionTree);
  const [expandedVessels, setExpandedVessels] = useState<Set<string>>(
    new Set(
      vesselOrder
        .filter((v) => initialLesionTree[v.key].length > 0)
        .map((v) => v.key)
    )
  );
  const [startTime] = useState(Date.now());

  const stats = useMemo(() => {
    const totalLesions = Object.values(lesionTree).flat().length;
    const vesselsWithLesions = vesselOrder.filter(
      (v) => lesionTree[v.key].length > 0
    );
    return { totalLesions, vesselsWithLesions };
  }, [lesionTree]);

  const toggleVessel = useCallback((key: keyof LesionTree) => {
    setExpandedVessels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleAddLesion = useCallback((vessel: keyof LesionTree) => {
    const newLesion: LesionEntry = {
      id: `manual-${Date.now()}`,
      branch: '',
      severity: '50%',
      description: '',
    };

    setLesionTree((prev) => ({
      ...prev,
      [vessel]: [...prev[vessel], newLesion],
    }));

    // Expand vessel if not already expanded
    setExpandedVessels((prev) => new Set([...prev, vessel]));
  }, []);

  const handleRemoveLesion = useCallback((vessel: keyof LesionTree, lesionId: string) => {
    setLesionTree((prev) => ({
      ...prev,
      [vessel]: prev[vessel].filter((l) => l.id !== lesionId),
    }));
  }, []);

  const handleLesionChange = useCallback(
    (vessel: keyof LesionTree, lesionId: string, field: keyof LesionEntry, value: string) => {
      setLesionTree((prev) => ({
        ...prev,
        [vessel]: prev[vessel].map((l) =>
          l.id === lesionId ? { ...l, [field]: value } : l
        ),
      }));
    },
    []
  );

  const handleConfirm = useCallback(() => {
    const result: KeyFactsProofResult & { refinedLesions: LesionTree } = {
      facts: [], // Empty facts array for lesion-only mode
      action: 'confirmed',
      modeUsed: 'lesions',
      timeSpent: Date.now() - startTime,
      completedAt: Date.now(),
      editsCount: 0, // Could track edits if needed
      rejectsCount: 0,
      refinedLesions: lesionTree,
    };
    onComplete(result);
  }, [lesionTree, startTime, onComplete]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-violet-600" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Review Lesions</h3>
            <p className="text-xs text-gray-500">{agentLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              extractionMethod === 'quick-model'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {extractionMethod === 'quick-model' ? '✨ AI-Refined' : '⚡ Auto-Detected'}
          </span>
          <div className="text-sm text-gray-600">
            {stats.totalLesions} lesion{stats.totalLesions !== 1 ? 's' : ''}
            {stats.vesselsWithLesions.length > 0 && (
              <span className="text-gray-400 ml-1">
                · {stats.vesselsWithLesions.length} vessel{stats.vesselsWithLesions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info banner */}
      {extractionMethod === 'regex' && stats.totalLesions > 0 && (
        <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Lesions were automatically detected from your dictation. Please review and refine as needed before confirming.
          </p>
        </div>
      )}

      {/* Scrollable vessel sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {vesselOrder.map((vessel) => {
          const vesselLesions = lesionTree[vessel.key];
          const isExpanded = expandedVessels.has(vessel.key);

          return (
            <VesselSection
              key={vessel.key}
              vessel={vessel}
              lesions={vesselLesions}
              onLesionChange={(id, field, value) =>
                handleLesionChange(vessel.key, id, field, value)
              }
              onAddLesion={() => handleAddLesion(vessel.key)}
              onRemoveLesion={(id) => handleRemoveLesion(vessel.key, id)}
              isExpanded={isExpanded}
              onToggle={() => toggleVessel(vessel.key)}
            />
          );
        })}

        {stats.totalLesions === 0 && (
          <div className="text-center py-12 text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-medium mb-1">No lesions detected</p>
            <p className="text-sm text-gray-400">
              Click "Add Lesion" on any vessel to document findings
            </p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-6 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          Confirm Lesions & Generate Report
        </button>
      </div>
    </div>
  );
};
