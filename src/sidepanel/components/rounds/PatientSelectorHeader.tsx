import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRounds } from '@/contexts/RoundsContext';
import { IconButton } from './IconButton';

interface PatientSelectorHeaderProps {
  className?: string;
}

export const PatientSelectorHeader: React.FC<PatientSelectorHeaderProps> = ({ className = '' }) => {
  const {
    patients,
    selectedPatient,
    isPatientListCollapsed,
    togglePatientList,
    navigateToPatient
  } = useRounds();

  const isFormControl = (el: HTMLElement | null) => {
    if (!el) return false;
    const tag = el.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON'].includes(tag)) return true;
    if (el.isContentEditable) return true;
    return !!el.closest('input, textarea, select, [contenteditable="true"]');
  };

  // Get active patients sorted by round order
  const activePatients = patients
    .filter(p => p.status === 'active')
    .sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));

  const currentIndex = selectedPatient
    ? activePatients.findIndex(p => p.id === selectedPatient.id)
    : -1;

  const hasPrevious = activePatients.length > 1;
  const hasNext = activePatients.length > 1;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFormControl(e.target as HTMLElement | null)) {
      return;
    }
    // Arrow keys for navigation
    if (e.key === 'ArrowLeft' && hasPrevious) {
      e.preventDefault();
      navigateToPatient('prev');
    } else if (e.key === 'ArrowRight' && hasNext) {
      e.preventDefault();
      navigateToPatient('next');
    }
    // Ctrl+Up/Down for keyboard power users
    else if ((e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) && hasPrevious) {
      e.preventDefault();
      navigateToPatient('prev');
    } else if ((e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) && hasNext) {
      e.preventDefault();
      navigateToPatient('next');
    }
  }, [hasPrevious, hasNext, navigateToPatient]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!selectedPatient) {
    return null;
  }

  const patientPosition = currentIndex >= 0 ? `${currentIndex + 1}/${activePatients.length}` : '';

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role="navigation"
      aria-label="Patient selector"
    >
      {/* Previous button */}
      <IconButton
        icon={ChevronLeft}
        onClick={() => navigateToPatient('prev')}
        disabled={!hasPrevious}
        tooltip="Previous patient (←)"
      />

      {/* Patient name and toggle - ultra compact */}
      <button
        type="button"
        onClick={togglePatientList}
        className="flex-1 flex items-center justify-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors min-w-0 text-xs"
        title="Click to toggle patient list"
        aria-label={`${selectedPatient.name}, ${patientPosition}. Click to ${isPatientListCollapsed ? 'show' : 'hide'} list`}
      >
        <span className="font-medium truncate text-gray-900">
          {selectedPatient.name}
        </span>
        {patientPosition && (
          <span className="text-[10px] text-gray-500 flex-shrink-0">
            ({patientPosition})
          </span>
        )}
      </button>

      {/* Next button */}
      <IconButton
        icon={ChevronRight}
        onClick={() => navigateToPatient('next')}
        disabled={!hasNext}
        tooltip="Next patient (→)"
      />
    </div>
  );
};
