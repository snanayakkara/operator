/**
 * Field Ingestion Overlay Component
 *
 * Provides visual feedback showing which EMR fields are being discovered,
 * extracted, and processed during AI Review workflow.
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Search, FileText, Pill } from 'lucide-react';
import { useFocusTrap, useScrollLock, useEscapeKey, useRestoreFocus } from '@/utils/modalHelpers';
import { VerticalStepper, type Step, type StepStatus } from './VerticalStepper';

interface FieldStatus {
  name: string;
  displayName: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'discovering' | 'extracting' | 'complete' | 'not-found' | 'error';
  content?: string;
  timestamp?: number;
}

interface FieldIngestionOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  className?: string;
  progress?: number; // 0-100, actual progress from parent
  currentPhase?: string; // Current phase description from parent
}

const EMR_FIELDS: Omit<FieldStatus, 'status' | 'timestamp'>[] = [
  {
    name: 'background',
    displayName: 'Background History',
    icon: FileText
  },
  {
    name: 'investigations',
    displayName: 'Investigation Results',
    icon: Search
  },
  {
    name: 'medications-problemlist',
    displayName: 'Medications & Problems',
    icon: Pill
  }
];

export const FieldIngestionOverlay: React.FC<FieldIngestionOverlayProps> = ({
  isActive,
  onComplete,
  className = '',
  progress: externalProgress,
  currentPhase: externalPhase
}) => {
  const [fields, setFields] = useState<FieldStatus[]>([]);

  // Use external progress/phase if provided, otherwise use internal state
  const progress = externalProgress ?? 0;
  const currentPhase = externalPhase ?? 'Discovering EMR fields...';

  // Modal behavior hooks
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isActive);
  useScrollLock(isActive);
  useEscapeKey(isActive, onComplete);
  useRestoreFocus(isActive, modalRef);

  // Initialize fields when overlay becomes active
  useEffect(() => {
    if (isActive) {
      const initialFields = EMR_FIELDS.map(field => ({
        ...field,
        status: 'discovering' as const,
        timestamp: Date.now()
      }));
      setFields(initialFields);
    } else {
      // Reset state when overlay is hidden
      setFields([]);
    }
  }, [isActive]);

  // Update field status based on progress from parent
  useEffect(() => {
    if (!isActive || fields.length === 0) return;

    // Map progress to field status:
    // 0-30%: Field Discovery/Extraction
    // 30-90%: AI Analysis (fields complete)
    // 90-100%: Advisory Generation (all done)

    if (progress >= 30) {
      // Mark all fields as complete when we move to AI Analysis phase
      setFields(prev => prev.map(field => ({
        ...field,
        status: 'complete' as const,
        timestamp: Date.now()
      })));
    } else if (progress > 0) {
      // During extraction, show fields as extracting
      setFields(prev => prev.map(field => ({
        ...field,
        status: 'extracting' as const,
        timestamp: Date.now()
      })));
    }
  }, [progress, isActive, fields.length]);

  // Convert FieldStatus to Step[] for VerticalStepper
  const steps: Step[] = useMemo(() => {
    return fields.map((field, index) => {
      // Map field status to StepStatus
      let stepStatus: StepStatus = 'queued';
      if (field.status === 'complete') {
        stepStatus = 'done';
      } else if (field.status === 'extracting') {
        stepStatus = 'running';
      } else if (field.status === 'error' || field.status === 'not-found') {
        stepStatus = 'failed';
      }

      return {
        id: field.name,
        label: field.displayName,
        icon: field.icon,
        status: stepStatus
      };
    });
  }, [fields]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      className={`bg-white rounded-lg border border-gray-200 p-4 pointer-events-auto ${className}`}
      style={{
        boxShadow: '0 8px 24px -4px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.04)'
      }}
      role="status"
      aria-labelledby="field-ingestion-title"
      aria-describedby="field-ingestion-description"
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <Search className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 id="field-ingestion-title" className="text-sm font-medium text-gray-900">
              Field Extraction
            </h3>
          </div>
          <p id="field-ingestion-description" className="text-xs text-gray-500">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2">
            <span className="text-xs text-gray-600" aria-live="polite">
              {currentPhase}
            </span>
          </div>
          <div
            className="w-full bg-gray-200 rounded-full h-1.5"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Field extraction progress"
          >
            <div
              className="bg-indigo-600 h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Field Status List - Using Vertical Stepper */}
        <VerticalStepper steps={steps} />

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Local processing with MedGemma-27b model
          </p>
        </div>
    </div>
  );
};