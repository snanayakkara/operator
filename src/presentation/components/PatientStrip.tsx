/**
 * PatientStrip - Pinned Header
 * 
 * Fixed 56px header with patient info, always visible during presentation.
 * Includes thin accent bar based on category.
 */

import React from 'react';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';

interface PatientStripProps {
  workup: TAVIWorkupItem;
}

// Category to accent colour mapping
const CATEGORY_COLORS: Record<string, string> = {
  'Elective': '#8B5CF6',
  'Urgent': '#F59E0B',
  'Emergency': '#EF4444',
  'Redo': '#6366F1',
  'default': '#6B7280'
};

// Status chip styles
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'draft': { bg: '#FEF3C7', text: '#92400E' },
  'ready': { bg: '#D1FAE5', text: '#065F46' },
  'presented': { bg: '#EDE9FE', text: '#5B21B6' },
  'Pending': { bg: '#FEF3C7', text: '#92400E' },
  'In Progress': { bg: '#DBEAFE', text: '#1E40AF' },
  'Completed': { bg: '#D1FAE5', text: '#065F46' },
};

export const PatientStrip: React.FC<PatientStripProps> = ({ workup }) => {
  // Get initials from patient name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Format date for display
  const formatDate = (date?: string): string => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return date;
    }
  };

  const accentColor = CATEGORY_COLORS[workup.category || 'default'] || CATEGORY_COLORS.default;
  const statusStyle = STATUS_STYLES[workup.status] || STATUS_STYLES.draft;

  return (
    <div className="patient-strip">
      <div className="patient-strip-content">
        {/* Patient Initials Badge */}
        <div className="patient-initials">
          {getInitials(workup.patient)}
        </div>

        {/* Patient Info */}
        <div className="patient-info">
          <div className="patient-name">{workup.patient}</div>
          <div className="patient-meta">
            {workup.procedureDate && (
              <>
                <span>Procedure: {formatDate(workup.procedureDate)}</span>
                <span className="meta-separator">•</span>
              </>
            )}
            {workup.referrer && (
              <>
                <span>Ref: {workup.referrer}</span>
                <span className="meta-separator">•</span>
              </>
            )}
            {workup.location && (
              <span>{workup.location}</span>
            )}
          </div>
        </div>

        {/* Status & Category Chips */}
        <div className="patient-chips">
          {workup.category && (
            <span className="category-chip" style={{ borderColor: accentColor, color: accentColor }}>
              {workup.category}
            </span>
          )}
          <span 
            className="status-chip"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
          >
            {workup.status}
          </span>
          <span className="completion-badge">
            {workup.completionPercentage}%
          </span>
        </div>
      </div>

      {/* Thin accent bar */}
      <div className="patient-strip-accent" style={{ backgroundColor: accentColor }} />
    </div>
  );
};
