/**
 * Pre-Op Card Layout Component
 *
 * Visual card component for displaying pre-procedure summary cards
 * A5 dimensions: 148mm × 210mm (portrait)
 * With 1cm borders: content area is 128mm × 190mm
 * At 96 DPI: ~559px × 794px card, ~484px × 719px content
 */

import React from 'react';
import type { PreOpPlanJSON } from '@/types/medical.types';

interface PreOpCardLayoutProps {
  jsonData: PreOpPlanJSON;
  procedureInfo: {
    label: string;
    emoji: string;
    color: string;
  };
}

// A5 dimensions in pixels at 96 DPI
// 148mm = 559px, 210mm = 794px
// 1cm border = 38px
const A5_STYLES = {
  card: {
    width: '559px',
    minHeight: '794px',
    padding: '38px', // 1cm border
    boxSizing: 'border-box' as const,
  }
};

export const PreOpCardLayout: React.FC<PreOpCardLayoutProps> = ({
  jsonData,
  procedureInfo
}) => {
  const fields = jsonData.fields || {};
  const procedureType = jsonData.procedure_type;

  // Helper to check if field has a real value (exclude "Not specified" to keep card clean)
  const hasValue = (value: any): boolean => {
    return value && value !== '' && value !== 'Not specified';
  };

  // Helper to format values (add styling for "Not specified")
  const formatValue = (value: any): React.ReactNode => {
    if (!value || value === '') return null;
    if (value === 'Not specified') {
      return <span className="text-gray-400 italic text-sm">Not specified</span>;
    }
    return value;
  };

  return (
    <div 
      className="bg-white border-2 border-gray-200 rounded-lg shadow-sm flex flex-col"
      style={A5_STYLES.card}
    >
      {/* Header - show procedure name if different from type, or just use indication as title */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-gray-100 flex-shrink-0">
        <span className="text-2xl">{procedureInfo.emoji}</span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {procedureInfo.label}
          </h2>
          {fields.procedure && fields.procedure !== procedureInfo.label && (
            <p className="text-xs text-gray-500">{fields.procedure}</p>
          )}
        </div>
      </div>

      {/* Content - grows to fill available space */}
      <div className="flex-1 flex flex-col text-sm">
        {/* Indication */}
        {hasValue(fields.indication) && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              Indication
            </div>
            <div className="text-sm text-gray-900">{formatValue(fields.indication)}</div>
          </div>
        )}

        {/* Access & Equipment Grid - only show if any field has value */}
        {(hasValue(fields.primary_access) || hasValue(fields.access_site) || hasValue(fields.sheath_size_fr) || 
          (procedureType === 'TAVI' && hasValue(fields.valve_type_size)) ||
          (procedureType === 'MITRAL_TEER' && hasValue(fields.transeptal_catheter))) && (
          <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100">
            {hasValue(fields.primary_access || fields.access_site) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Access
                </div>
                <div className="text-sm text-gray-900">
                  {formatValue(fields.primary_access || fields.access_site)}
                </div>
              </div>
            )}

            {hasValue(fields.sheath_size_fr) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Sheath
                </div>
                <div className="text-sm text-gray-900">
                  {formatValue(fields.sheath_size_fr)} Fr
                </div>
              </div>
            )}

            {/* TAVI-specific: Valve */}
            {procedureType === 'TAVI' && hasValue(fields.valve_type_size) && (
              <div className="col-span-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Valve
                </div>
                <div className="text-sm text-gray-900">{fields.valve_type_size}</div>
              </div>
            )}

            {/* mTEER-specific: Transeptal Catheter */}
            {procedureType === 'MITRAL_TEER' && hasValue(fields.transeptal_catheter) && (
              <div className="col-span-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Transeptal Catheter
                </div>
                <div className="text-sm text-gray-900">{fields.transeptal_catheter}</div>
              </div>
            )}
          </div>
        )}

        {/* Catheters */}
        {hasValue(fields.catheters) && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              Catheters
            </div>
            <div className="text-sm text-gray-900">
              {Array.isArray(fields.catheters)
                ? fields.catheters.join(', ')
                : fields.catheters}
            </div>
          </div>
        )}

        {/* TAVI-specific: Safety Planning Grid - only show if any field has real value */}
        {procedureType === 'TAVI' && (hasValue(fields.pacing_wire_access) || hasValue(fields.closure_plan) || hasValue(fields.protamine) || hasValue(fields.goals_of_care)) && (
          <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100">
            {hasValue(fields.pacing_wire_access) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Pacing Wire
                </div>
                <div className="text-sm text-gray-900">{fields.pacing_wire_access}</div>
              </div>
            )}
            {hasValue(fields.closure_plan) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Closure
                </div>
                <div className="text-sm text-gray-900">{fields.closure_plan}</div>
              </div>
            )}
            {hasValue(fields.protamine) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Protamine
                </div>
                <div className="text-sm text-gray-900">{fields.protamine}</div>
              </div>
            )}
            {hasValue(fields.goals_of_care) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Goals of Care
                </div>
                <div className="text-sm text-gray-900">{fields.goals_of_care}</div>
              </div>
            )}
          </div>
        )}

        {/* RHC-specific: CO Measurement & Blood Gases - only show if any value */}
        {procedureType === 'RIGHT_HEART_CATH' && (hasValue(fields.co_measurement) || hasValue(fields.blood_gas_samples)) && (
          <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100">
            {hasValue(fields.co_measurement) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  CO Measurement
                </div>
                <div className="text-sm text-gray-900">{fields.co_measurement}</div>
              </div>
            )}
            {hasValue(fields.blood_gas_samples) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Blood Gas Samples
                </div>
                <div className="text-sm text-gray-900">{fields.blood_gas_samples}</div>
              </div>
            )}
          </div>
        )}

        {/* mTEER-specific: Echo Summary */}
        {procedureType === 'MITRAL_TEER' && hasValue(fields.echo_summary) && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              Echo Summary
            </div>
            <div className="text-sm text-gray-900">{fields.echo_summary}</div>
          </div>
        )}

        {/* Clinical Info Grid - only show if any value */}
        {(hasValue(fields.anticoagulation_plan) || hasValue(fields.sedation) || hasValue(fields.allergies) || hasValue(fields.site_prep)) && (
          <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100">
            {hasValue(fields.anticoagulation_plan) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Antiplatelets
                </div>
                <div className="text-sm text-gray-900">{fields.anticoagulation_plan}</div>
              </div>
            )}
            {hasValue(fields.sedation) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Sedation
                </div>
                <div className="text-sm text-gray-900">{fields.sedation}</div>
              </div>
            )}
            {hasValue(fields.allergies) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Allergies
                </div>
                <div className="text-sm text-gray-900">{fields.allergies}</div>
              </div>
            )}
            {hasValue(fields.site_prep) && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Site Prep
                </div>
                <div className="text-sm text-gray-900">{fields.site_prep}</div>
              </div>
            )}
          </div>
        )}

        {/* Labs */}
        {fields.recent_labs && (hasValue(fields.recent_labs.hb_g_per_l) || hasValue(fields.recent_labs.creatinine_umol_per_l)) && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              Recent Labs
            </div>
            <div className="text-sm text-gray-900">
              {hasValue(fields.recent_labs.hb_g_per_l) && `Hb ${fields.recent_labs.hb_g_per_l} g/L`}
              {hasValue(fields.recent_labs.hb_g_per_l) && hasValue(fields.recent_labs.creatinine_umol_per_l) && ' • '}
              {hasValue(fields.recent_labs.creatinine_umol_per_l) && `Creatinine ${fields.recent_labs.creatinine_umol_per_l} µmol/L`}
            </div>
          </div>
        )}

        {/* Follow-up */}
        {hasValue(fields.planned_followup) && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              Follow-up
            </div>
            <div className="text-sm text-gray-900">{fields.planned_followup}</div>
          </div>
        )}

        {/* Spacer to push NOK to bottom */}
        <div className="flex-1" />

        {/* Next of Kin - pinned to bottom */}
        {hasValue(fields.nok_name) && (
          <div className="pt-3 border-t-2 border-gray-200 mt-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Next of Kin
            </div>
            <div className="text-sm text-gray-900">
              <span className="font-medium">{formatValue(fields.nok_name)}</span>
              {hasValue(fields.nok_relationship) && (
                <span className="text-gray-600"> ({formatValue(fields.nok_relationship)})</span>
              )}
              {hasValue(fields.nok_phone) && (
                <span className="text-gray-600"> • {formatValue(fields.nok_phone)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
