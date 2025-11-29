import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical, ClipboardList, Plus, CheckSquare, Undo2, Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';

interface OverflowMenuProps {
  onHandover: () => void;
  onQuickAdd: () => void;
  onDischarge: () => void;
  onUndo: () => void;
  onDelete: () => void;
  activeCount: number;
  canUndo: boolean;
  className?: string;
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  onHandover,
  onQuickAdd,
  onDischarge,
  onUndo,
  onDelete,
  activeCount,
  canUndo,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <IconButton
        icon={MoreVertical}
        onClick={() => setIsOpen(!isOpen)}
        tooltip="More actions"
      />

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {/* Handover */}
            <button
              type="button"
              onClick={() => handleAction(onHandover)}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5 text-gray-600" />
              <span>Handover ({activeCount})</span>
            </button>

            {/* Quick Add */}
            <button
              type="button"
              onClick={() => handleAction(onQuickAdd)}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-gray-600" />
              <span>Quick Add Patient</span>
            </button>

            <div className="border-t border-gray-100 my-1" />

            {/* Discharge */}
            <button
              type="button"
              onClick={() => handleAction(onDischarge)}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-gray-600" />
              <span>Discharge</span>
            </button>

            {/* Undo */}
            <button
              type="button"
              onClick={() => handleAction(onUndo)}
              disabled={!canUndo}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="h-3.5 w-3.5 text-gray-600" />
              <span>Undo Last Update</span>
            </button>

            <div className="border-t border-gray-100 my-1" />

            {/* Delete */}
            <button
              type="button"
              onClick={() => handleAction(onDelete)}
              className="w-full px-3 py-2 text-xs text-left hover:bg-rose-50 flex items-center gap-2 transition-colors text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Patient</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
