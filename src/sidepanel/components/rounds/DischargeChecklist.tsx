import React, { useState } from 'react';
import { ChevronDown, ClipboardCheck, LogOut, Flag } from 'lucide-react';
import { useRounds } from '@/contexts/RoundsContext';
import { RoundsPatient, AdmissionDischargeChecklist } from '@/types/rounds.types';

interface DischargeChecklistProps {
  patient: RoundsPatient;
}

// Standard discharge checklist items as specified
const DISCHARGE_ITEMS: { key: keyof AdmissionDischargeChecklist; label: string; description?: string }[] = [
  { key: 'medicationReconciliation', label: 'Medication reconciliation', description: 'Medications reviewed and reconciled' },
  { key: 'dischargeInstructions', label: 'Discharge instructions', description: 'Patient/family given discharge instructions' },
  { key: 'followupScheduled', label: 'Follow-up scheduled', description: 'Outpatient follow-up appointment booked' },
  { key: 'transportArranged', label: 'Transport arranged', description: 'Transport home or to facility arranged' },
  { key: 'gpLetterSent', label: 'GP letter sent', description: 'Discharge summary sent to GP' },
];

// Admission flags 
const ADMISSION_FLAGS: { key: keyof AdmissionDischargeChecklist; label: string; color: string }[] = [
  { key: 'dischargePlanning', label: 'Discharge planning', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'familyMeeting', label: 'Family meeting needed', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'socialWork', label: 'Social work consult', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { key: 'palliativeCare', label: 'Palliative care', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

export const DischargeChecklist: React.FC<DischargeChecklistProps> = ({ patient }) => {
  const { updateChecklist, toggleDischargePlanning } = useRounds();
  const [expanded, setExpanded] = useState(false);

  const checklist = patient.checklist || {};
  const isDischargePlanning = checklist.dischargePlanning || false;
  
  // Count completed discharge items
  const completedDischargeItems = DISCHARGE_ITEMS.filter(
    item => checklist[item.key]
  ).length;

  // Count active admission flags
  const activeFlags = ADMISSION_FLAGS.filter(
    flag => checklist[flag.key]
  ).length;

  const handleToggleItem = (key: keyof AdmissionDischargeChecklist) => {
    updateChecklist(patient.id, { [key]: !checklist[key] });
  };

  const handleToggleDischargePlanning = () => {
    toggleDischargePlanning(patient.id, !isDischargePlanning);
  };

  return (
    <div className="rounded-xl border border-purple-400 p-4 bg-white shadow-sm">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-purple-600" />
          <h4 className="text-sm font-semibold text-gray-900">Admission & Discharge</h4>
          {(activeFlags > 0 || isDischargePlanning) && (
            <span className="text-xs text-gray-500">
              ({activeFlags} flag{activeFlags !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDischargePlanning && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
              <LogOut className="w-3 h-3" />
              D/C {completedDischargeItems}/{DISCHARGE_ITEMS.length}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Admission Flags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flag className="w-3 h-3 text-gray-400" />
              <span className="text-xs uppercase text-gray-500">Admission Flags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ADMISSION_FLAGS.map(flag => (
                <button
                  key={flag.key}
                  onClick={() => handleToggleItem(flag.key)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    checklist[flag.key]
                      ? flag.color
                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {flag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discharge Planning Toggle */}
          <div className="border-t border-gray-100 pt-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDischargePlanning}
                onChange={handleToggleDischargePlanning}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Discharge planning active</span>
                <p className="text-xs text-gray-500">Enable to show discharge checklist</p>
              </div>
              <LogOut className={`w-4 h-4 ${isDischargePlanning ? 'text-purple-600' : 'text-gray-300'}`} />
            </label>
          </div>

          {/* Discharge Checklist (only shown when discharge planning is active) */}
          {isDischargePlanning && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <LogOut className="w-3 h-3 text-purple-500" />
                <span className="text-xs uppercase text-gray-500">Discharge Checklist</span>
                <span className="text-xs text-gray-400">
                  {completedDischargeItems}/{DISCHARGE_ITEMS.length} complete
                </span>
              </div>
              
              <div className="space-y-1">
                {DISCHARGE_ITEMS.map(item => (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      checklist[item.key] ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[item.key])}
                      onChange={() => handleToggleItem(item.key)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${checklist[item.key] ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                        {item.label}
                      </span>
                      {item.description && (
                        <p className="text-xs text-gray-500">{item.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-300"
                    style={{ width: `${(completedDischargeItems / DISCHARGE_ITEMS.length) * 100}%` }}
                  />
                </div>
                {completedDischargeItems === DISCHARGE_ITEMS.length && (
                  <p className="text-xs text-green-600 font-medium mt-1 text-center">
                    ✓ Ready for discharge
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
