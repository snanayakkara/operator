/**
 * PlanCommandCard - Procedure Plan "Command Card"
 * 
 * Right column component showing the procedural plan.
 * Structured format: Device, Access, Wire, Pacing, Closure, Notes
 */

import React, { useMemo } from 'react';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import {
  PROCEDURE_PLAN_FIELDS,
  parseProcedurePlanContent,
  type ProcedurePlanFieldKey
} from '@/utils/taviProcedurePlan';

interface PlanCommandCardProps {
  workup: TAVIWorkupItem;
  isFocused: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
}

interface PlanField {
  label: string;
  value: string;
  icon: string;
}

const PLAN_FIELD_ICONS: Record<ProcedurePlanFieldKey, string> = {
  device: '🔧',
  access: '🎯',
  wire: '〰️',
  pacing: '⚡',
  closure: '🔒',
  notes: '📝'
};

export const PlanCommandCard: React.FC<PlanCommandCardProps> = ({
  workup,
  isFocused,
  isExpanded,
  onClick,
  onToggleExpand
}) => {
  const planFields = useMemo((): PlanField[] => {
    const values = parseProcedurePlanContent(workup.structuredSections.procedure_planning?.content || '');
    return PROCEDURE_PLAN_FIELDS.map(field => ({
      label: field.label,
      value: values[field.key],
      icon: PLAN_FIELD_ICONS[field.key]
    }));
  }, [workup.structuredSections.procedure_planning?.content]);

  // Check if we have CT measurements
  const ctMeasurements = workup.ctMeasurements;

  return (
    <div
      className={`plan-command-card ${isFocused ? 'focused' : ''} ${isExpanded ? 'expanded' : ''}`}
      onClick={onClick}
      role="region"
      aria-label="Procedure Plan"
      aria-expanded={isExpanded ? 'true' : 'false'}
      aria-current={isFocused ? 'step' : undefined}
      tabIndex={0}
    >
      {/* Accent bar */}
      <div className="plan-accent-bar" />

      {/* Header */}
      <div className="plan-header">
        <div className="plan-header-left">
          <span className="plan-icon">📋</span>
          <span className="plan-title">Command Card</span>
        </div>
        <button
          className={`plan-expand-btn ${isExpanded ? 'rotated' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Plan Fields */}
      <div className="plan-fields">
        {planFields.map(field => (
          <div key={field.label} className="plan-field">
            <div className="plan-field-label">
              <span className="plan-field-icon">{field.icon}</span>
              <span>{field.label}</span>
            </div>
            <div className={`plan-field-value ${!field.value ? 'empty' : ''}`}>
              {field.value || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* CT Measurements Summary (if available) */}
      {isExpanded && ctMeasurements && (
        <div className="plan-ct-summary">
          <div className="ct-summary-header">CT Measurements</div>
          <div className="ct-summary-grid">
            {ctMeasurements.annulusAreaMm2 && (
              <div className="ct-field">
                <span className="ct-label">Annulus Area</span>
                <span className="ct-value">{ctMeasurements.annulusAreaMm2} mm²</span>
              </div>
            )}
            {ctMeasurements.annulusPerimeterMm && (
              <div className="ct-field">
                <span className="ct-label">Perimeter</span>
                <span className="ct-value">{ctMeasurements.annulusPerimeterMm} mm</span>
              </div>
            )}
            {ctMeasurements.lvotAreaMm2 && (
              <div className="ct-field">
                <span className="ct-label">LVOT Area</span>
                <span className="ct-value">{ctMeasurements.lvotAreaMm2} mm²</span>
              </div>
            )}
            {ctMeasurements.stjHeightMm && (
              <div className="ct-field">
                <span className="ct-label">STJ Height</span>
                <span className="ct-value">{ctMeasurements.stjHeightMm} mm</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
