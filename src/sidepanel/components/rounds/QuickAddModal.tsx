import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../buttons/Button';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; scratchpad: string; ward?: string }) => Promise<void>;
  defaultWard?: string;
}

const WARD_OPTIONS = ['1 South', '1 West', 'ICU', '3 Central', '1 Central', 'Other'];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ open, onClose, onSave, defaultWard = '1 South' }) => {
  const [name, setName] = useState('');
  const [scratchpad, setScratchpad] = useState('');
  const [ward, setWard] = useState(defaultWard);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), scratchpad, ward });
      setName('');
      setScratchpad('');
      setWard(defaultWard);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Add Patient</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close quick add"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ward</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            >
              {WARD_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Scratchpad / referral</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
              placeholder="Phone handover notes..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Saved as an intake note; parsed in the background to seed issues, investigations, and tasks.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
