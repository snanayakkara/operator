/**
 * Pre-Op Card Layout Component
 *
 * Visual card component for displaying pre-procedure summary cards
 * Matches A5 card design with clean sections and proper formatting
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

export const PreOpCardLayout: React.FC<PreOpCardLayoutProps> = ({
  jsonData,
  procedureInfo
}) => {
  const fields = jsonData.fields || {};
  const procedureType = jsonData.procedure_type;

  // Helper to check if field has value (show "Not specified" for transparency)
  const hasValue = (value: any): boolean => {
    return value && value !== '';
  };

  // Helper to format values (add styling for "Not specified")
  const formatValue = (value: any): React.ReactNode => {
    if (!value || value === '') return null;
    if (value === 'Not specified') {
      return <span className="text-gray-400 italic">Not specified</span>;
    }
    return value;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-100">
        <span className="text-3xl">{procedureInfo.emoji}</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">
            {fields.procedure || procedureInfo.label}
          </h2>
          <p className="text-sm text-gray-600">{procedureType.replace(/_/g, '/')}</p>
        </div>
      </div>

      {/* Indication */}
      {hasValue(fields.indication) && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Indication
          </div>
          <div className="text-base text-gray-900">{formatValue(fields.indication)}</div>
        </div>
      )}

      {/* Access & Equipment Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
        {hasValue(fields.primary_access || fields.access_site) && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Access
            </div>
            <div className="text-base text-gray-900">
              {formatValue(fields.primary_access || fields.access_site)}
            </div>
          </div>
        )}

        {hasValue(fields.sheath_size_fr) && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Sheath
            </div>
            <div className="text-base text-gray-900">
              {formatValue(fields.sheath_size_fr)} {fields.sheath_size_fr !== 'Not specified' && 'Fr'}
            </div>
          </div>
        )}

        {/* TAVI-specific: Valve */}
        {procedureType === 'TAVI' && hasValue(fields.valve_type_size) && (
          <div className="col-span-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Valve
            </div>
            <div className="text-base text-gray-900">{fields.valve_type_size}</div>
          </div>
        )}

        {/* mTEER-specific: Transeptal Catheter */}
        {procedureType === 'MITRAL_TEER' && hasValue(fields.transeptal_catheter) && (
          <div className="col-span-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Transeptal Catheter
            </div>
            <div className="text-base text-gray-900">{fields.transeptal_catheter}</div>
          </div>
        )}
      </div>

      {/* Catheters */}
      {hasValue(fields.catheters) && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Catheters
          </div>
          <div className="text-base text-gray-900">
            {Array.isArray(fields.catheters)
              ? fields.catheters.join(', ')
              : fields.catheters}
          </div>
        </div>
      )}

      {/* TAVI-specific: Safety Planning Grid */}
      {procedureType === 'TAVI' && (
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
          {hasValue(fields.pacing_wire_access) && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Pacing Wire
              </div>
              <div className="text-sm text-gray-900">{fields.pacing_wire_access}</div>
            </div>
          )}
          {hasValue(fields.closure_plan) && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Closure
              </div>
              <div className="text-sm text-gray-900">{fields.closure_plan}</div>
            </div>
          )}
          {hasValue(fields.protamine) && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Protamine
              </div>
              <div className="text-sm text-gray-900">{fields.protamine}</div>
            </div>
          )}
          {hasValue(fields.goals_of_care) && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Goals of Care
              </div>
              <div className="text-sm text-gray-900">{fields.goals_of_care}</div>
            </div>
          )}
        </div>
      )}

      {/* RHC-specific: CO Measurement & Blood Gases */}
      {procedureType === 'RIGHT_HEART_CATH' && (
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
          {hasValue(fields.co_measurement) && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                CO Measurement
              </div>
              <div className="text-sm text-gray-900">{fields.co_measurement}</div>
            </div>
          )}
          {hasValue(fields.blood_gas_samples) && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Blood Gas Samples
              </div>
              <div className="text-sm text-gray-900">{fields.blood_gas_samples}</div>
            </div>
          )}
        </div>
      )}

      {/* mTEER-specific: Echo Summary */}
      {procedureType === 'MITRAL_TEER' && hasValue(fields.echo_summary) && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Echo Summary
          </div>
          <div className="text-sm text-gray-900">{fields.echo_summary}</div>
        </div>
      )}

      {/* Clinical Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
        {hasValue(fields.anticoagulation_plan) && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Antiplatelets
            </div>
            <div className="text-sm text-gray-900">{fields.anticoagulation_plan}</div>
          </div>
        )}
        {hasValue(fields.sedation) && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Sedation
            </div>
            <div className="text-sm text-gray-900">{fields.sedation}</div>
          </div>
        )}
        {hasValue(fields.allergies) && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Allergies
            </div>
            <div className="text-sm text-gray-900">{fields.allergies}</div>
          </div>
        )}
        {hasValue(fields.site_prep) && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Site Prep
            </div>
            <div className="text-sm text-gray-900">{fields.site_prep}</div>
          </div>
        )}
      </div>

      {/* Labs */}
      {fields.recent_labs && (hasValue(fields.recent_labs.hb_g_per_l) || hasValue(fields.recent_labs.creatinine_umol_per_l)) && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Follow-up
          </div>
          <div className="text-sm text-gray-900">{fields.planned_followup}</div>
        </div>
      )}

      {/* Next of Kin */}
      {hasValue(fields.nok_name) && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Next of Kin
          </div>
          <div className="text-base text-gray-900">
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
  );
};
