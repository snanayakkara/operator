/**
 * PreOpCardLayout Component
 *
 * A presentation-ready A5 card layout (14.8cm × 21cm) for pre-op procedure plans.
 * Designed to be rendered at 300 DPI (1748×2480px) for high-quality PNG export.
 *
 * Layout Structure:
 * - Header: Procedure type with emoji, indication
 * - Core Details: Access, equipment, medications
 * - Clinical Info: Allergies, labs, site prep
 * - Next-of-Kin: Emergency contact details
 * - Footer: Completeness score, generation timestamp
 *
 * Supports all procedure types: ANGIOGRAM_OR_PCI, RIGHT_HEART_CATH, TAVI, MITRAL_TEER
 */

import React from 'react';
import type { PreOpProcedureType } from '@/types/medical.types';

interface PreOpCardLayoutProps {
  procedureType: PreOpProcedureType;
  cardMarkdown: string;
  jsonData: any;
  completenessScore?: string;
  patientInfo?: {
    name?: string;
    mrn?: string;
    dob?: string;
  };
  operatorInfo?: {
    operator?: string;
    institution?: string;
    date?: string;
  };
}

// Procedure type configuration
const PROCEDURE_CONFIG: Record<PreOpProcedureType, { emoji: string; color: string; label: string }> = {
  'ANGIOGRAM_OR_PCI': { emoji: '🩺', color: '#3B82F6', label: 'Angiogram/PCI' },
  'RIGHT_HEART_CATH': { emoji: '🩺', color: '#8B5CF6', label: 'Right Heart Catheterisation' },
  'TAVI': { emoji: '🫀', color: '#10B981', label: 'TAVI' },
  'MITRAL_TEER': { emoji: '🫀', color: '#14B8A6', label: 'Mitral TEER' }
};

export const PreOpCardLayout: React.FC<PreOpCardLayoutProps> = ({
  procedureType,
  cardMarkdown,
  jsonData,
  completenessScore,
  patientInfo,
  operatorInfo
}) => {
  const config = PROCEDURE_CONFIG[procedureType] || PROCEDURE_CONFIG['ANGIOGRAM_OR_PCI'];
  const fields = jsonData?.fields || {};

  // Parse markdown into structured fields for clean display
  const parseMarkdownFields = (markdown: string): Array<{ label: string; value: string }> => {
    const lines = markdown.split('\n');
    const parsedFields: Array<{ label: string; value: string }> = [];

    for (const line of lines) {
      // Skip title lines and empty lines
      if (!line.trim() || line.includes(config.emoji) || line.startsWith('#')) {
        continue;
      }

      // Parse field lines: **Label** — Value
      const match = line.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
      if (match) {
        parsedFields.push({
          label: match[1].trim(),
          value: match[2].trim()
        });
      }
    }

    return parsedFields;
  };

  const displayFields = parseMarkdownFields(cardMarkdown);

  return (
    <div
      style={{
        width: '14.8cm',
        height: '21cm',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#FFFFFF',
        padding: '24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header Section */}
      <div
        style={{
          borderBottom: `3px solid ${config.color}`,
          paddingBottom: '14px',
          marginBottom: '18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>{config.emoji}</span>
          <h1
            style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: '700',
              color: '#1F2937',
              letterSpacing: '-0.5px'
            }}
          >
            {config.label}
          </h1>
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#6B7280',
            marginTop: '6px'
          }}
        >
          Pre-Procedure Summary Card
        </div>

        {/* Patient & Procedure Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '10px',
            fontSize: '12px',
            color: '#6B7280'
          }}
        >
          <div>
            {patientInfo?.name && <div><strong>Patient:</strong> {patientInfo.name}</div>}
            {patientInfo?.mrn && <div><strong>MRN:</strong> {patientInfo.mrn}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            {operatorInfo?.date && <div><strong>Date:</strong> {operatorInfo.date}</div>}
            {fields.indication && fields.indication !== 'Not specified' && (
              <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>
                {fields.indication}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Procedure Details Grid */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '8px'
          }}
        >
          {displayFields.map((field, index) => (
            <div
              key={index}
              style={{
                backgroundColor: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  minWidth: '120px',
                  flexShrink: 0
                }}
              >
                {field.label}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#1F2937',
                  textAlign: 'right',
                  fontWeight: field.value === 'Not specified' ? '400' : '500',
                  fontStyle: field.value === 'Not specified' ? 'italic' : 'normal',
                  opacity: field.value === 'Not specified' ? 0.5 : 1,
                  flex: 1
                }}
              >
                {field.value}
              </div>
            </div>
          ))}
        </div>

        {/* Special Highlights Section (for critical fields) */}
        {(fields.allergies || fields.protamine || fields.goals_of_care) && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#FFFBEB',
              border: '2px solid #FDE68A',
              borderRadius: '8px'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#92400E',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              ⚠️ Important Considerations
            </div>
            <div style={{ fontSize: '11px', color: '#78350F', lineHeight: '1.5' }}>
              {fields.allergies && fields.allergies !== 'Not specified' && (
                <div><strong>Allergies:</strong> {fields.allergies}</div>
              )}
              {fields.protamine && fields.protamine !== 'Not specified' && (
                <div><strong>Protamine:</strong> {fields.protamine}</div>
              )}
              {fields.goals_of_care && fields.goals_of_care !== 'Not specified' && (
                <div><strong>Goals of Care:</strong> {fields.goals_of_care}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '14px',
          borderTop: '2px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}
      >
        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
          {operatorInfo?.operator && <div><strong>Operator:</strong> {operatorInfo.operator}</div>}
          {operatorInfo?.institution && <div>{operatorInfo.institution}</div>}
          {completenessScore && (
            <div style={{ marginTop: '4px' }}>
              <strong>Completeness:</strong> {completenessScore}
            </div>
          )}
        </div>
        <div style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'right' }}>
          <div style={{ fontWeight: '600' }}>Generated by Operator</div>
          <div>High-Fidelity Medical AI</div>
          <div style={{ fontSize: '9px', marginTop: '2px' }}>
            {new Date().toLocaleDateString('en-AU', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
