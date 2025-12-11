import React, { useEffect, useMemo, useState } from 'react';
import { GitBranch, Plus, Trash2, X, Check } from 'lucide-react';
import Button from '../buttons/Button';
import type { LesionTree, LesionEntry } from '@/utils/AngioLesionUtils';
import { createEmptyLesionTree } from '@/utils/AngioLesionUtils';

interface AngioLesionReviewDialogProps {
  open: boolean;
  lesionTree: LesionTree | null;
  onClose: () => void;
  onConfirm: (tree: LesionTree) => void;
}

const vesselOrder: { key: keyof LesionTree; color: string; label: string }[] = [
  { key: 'lm', color: 'bg-amber-400', label: 'LM (left main)' },
  { key: 'lad', color: 'bg-rose-400', label: 'LAD (left anterior descending)' },
  { key: 'lcx', color: 'bg-sky-400', label: 'LCx (left circumflex)' },
  { key: 'rca', color: 'bg-emerald-400', label: 'RCA (right coronary artery)' },
  { key: 'grafts', color: 'bg-indigo-400', label: 'Grafts' }
];

const LesionCard: React.FC<{
  lesion: LesionEntry;
  onChange: (field: keyof LesionEntry, value: string) => void;
  onRemove: () => void;
}> = ({ lesion, onChange, onRemove }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white/90 shadow-sm p-3 space-y-2">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-3">
          <label className="text-[11px] uppercase tracking-wide text-gray-500">Branch</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={lesion.branch}
            onChange={(e) => onChange('branch', e.target.value)}
            placeholder="e.g., Proximal, D1, OM1"
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <label className="text-[11px] uppercase tracking-wide text-gray-500">Severity</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={lesion.severity}
            onChange={(e) => onChange('severity', e.target.value)}
            placeholder="e.g., 40% stenosis, mild"
          />
        </div>
        <div className="col-span-12 md:col-span-5">
          <label className="text-[11px] uppercase tracking-wide text-gray-500">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={lesion.description}
            onChange={(e) => onChange('description', e.target.value)}
            rows={2}
            placeholder="Add plaque characteristics, calcification, flow, etc."
          />
        </div>
        <div className="col-span-12 md:col-span-1 flex items-end justify-end">
          <Button variant="ghost" size="sm" onClick={onRemove} startIcon={<Trash2 className="w-4 h-4 text-gray-500" />}>
            Remove
          </Button>
        </div>
      </div>
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
          branch: vesselOrder.find(v => v.key === vessel)?.label || '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 py-6">
      <div className="w-full max-w-5xl rounded-2xl border border-blue-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Lesion Review</p>
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">Confirm vessel & branch findings</h3>
            <p className="text-sm text-gray-600">
              We parsed your dictation into a vessel → branch tree. Adjust severities or remove branches before finalizing the report.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} startIcon={<X className="w-4 h-4" />}>
              Skip
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onConfirm(draftTree)}
              startIcon={<Check className="w-4 h-4" />}
            >
              Approve & Update
            </Button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-4 bg-gradient-to-b from-blue-50/40 via-white to-white">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <GitBranch className="w-4 h-4 text-blue-500" />
            <span>{totalLesions} lesion{totalLesions === 1 ? '' : 's'} detected across vessels</span>
          </div>

          {vesselOrder.map(vessel => (
            <div key={vessel.key} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${vessel.color}`} />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Vessel</p>
                    <p className="text-sm font-semibold text-gray-900">{vessel.label}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" startIcon={<Plus className="w-4 h-4" />} onClick={() => handleAddLesion(vessel.key)}>
                  Add lesion
                </Button>
              </div>

              <div className="p-4 space-y-3">
                {draftTree[vessel.key] && draftTree[vessel.key].length > 0 ? (
                  draftTree[vessel.key].map(lesion => (
                    <LesionCard
                      key={lesion.id}
                      lesion={lesion}
                      onChange={(field, value) => handleLesionChange(vessel.key, lesion.id, field, value)}
                      onRemove={() => handleRemoveLesion(vessel.key, lesion.id)}
                    />
                  ))
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 px-3 py-2">
                    No lesions detected for this vessel. Use “Add lesion” if needed.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

AngioLesionReviewDialog.displayName = 'AngioLesionReviewDialog';

export default AngioLesionReviewDialog;
