import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Clock, Zap, User, Video, Phone, UserPlus, RotateCcw, Calendar, CalendarX } from 'lucide-react';
import type {
  AppointmentMatrix,
  AppointmentComplexity,
  AppointmentModality,
  AppointmentType,
  FollowUpPeriod
} from '../../config/appointmentPresets';
import { generatePresetFromMatrix, getItemCodeFromMatrix, getNotesFromMatrix } from '../../config/appointmentPresets';

interface AppointmentMatrixBuilderProps {
  onGenerate: (preset: { itemCode: string; notes: string; displayName: string }) => void;
}

interface OptionButton {
  value: string;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMPLEXITY_OPTIONS: OptionButton[] = [
  { value: 'simple', label: 'Simple', sublabel: 'Standard consult', icon: Clock },
  { value: 'complex', label: 'Complex', sublabel: 'Extended time', icon: Zap }
];

const MODALITY_OPTIONS: OptionButton[] = [
  { value: 'f2f', label: 'Face to Face', sublabel: 'In-person', icon: User },
  { value: 'telehealth', label: 'Telehealth', sublabel: 'Video call', icon: Video },
  { value: 'phone', label: 'Phone Call', sublabel: 'Voice only', icon: Phone }
];

const TYPE_OPTIONS: OptionButton[] = [
  { value: 'new', label: 'New', sublabel: 'First visit', icon: UserPlus },
  { value: 'review', label: 'Review', sublabel: 'Follow-up visit', icon: RotateCcw }
];

const FOLLOWUP_OPTIONS: OptionButton[] = [
  { value: '6wk', label: '6 Weeks', sublabel: 'Early review', icon: Calendar },
  { value: '3mth', label: '3 Months', sublabel: 'Standard', icon: Calendar },
  { value: '12mth', label: '12 Months', sublabel: 'Extended', icon: Calendar },
  { value: 'none', label: 'No Follow-up', sublabel: 'Discharged', icon: CalendarX }
];

export const AppointmentMatrixBuilder: React.FC<AppointmentMatrixBuilderProps> = ({ onGenerate }) => {
  const [matrix, setMatrix] = useState<AppointmentMatrix>({
    complexity: 'simple',
    modality: 'f2f',
    type: 'review',
    followUp: '3mth'
  });

  const updateMatrix = <K extends keyof AppointmentMatrix>(
    key: K,
    value: AppointmentMatrix[K]
  ) => {
    setMatrix(prev => ({ ...prev, [key]: value }));
  };

  // Keyboard navigation - cycle through options
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle numeric keys 1-4
      if (!['1', '2', '3', '4'].includes(event.key)) {
        return;
      }

      // Prevent default behavior
      event.preventDefault();

      switch (event.key) {
        case '1': {
          // Cycle complexity: simple <-> complex
          const newComplexity = matrix.complexity === 'simple' ? 'complex' : 'simple';
          updateMatrix('complexity', newComplexity);
          break;
        }
        case '2': {
          // Cycle modality: f2f -> telehealth -> phone -> f2f
          const modalityOrder: AppointmentModality[] = ['f2f', 'telehealth', 'phone'];
          const currentIndex = modalityOrder.indexOf(matrix.modality);
          const nextIndex = (currentIndex + 1) % modalityOrder.length;
          updateMatrix('modality', modalityOrder[nextIndex]);
          break;
        }
        case '3': {
          // Cycle type: new <-> review
          const newType = matrix.type === 'new' ? 'review' : 'new';
          updateMatrix('type', newType);
          break;
        }
        case '4': {
          // Cycle follow-up: 6wk -> 3mth -> 12mth -> none -> 6wk
          const followUpOrder: FollowUpPeriod[] = ['6wk', '3mth', '12mth', 'none'];
          const currentIndex = followUpOrder.indexOf(matrix.followUp);
          const nextIndex = (currentIndex + 1) % followUpOrder.length;
          updateMatrix('followUp', followUpOrder[nextIndex]);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [matrix]);

  const handleGenerate = () => {
    const preset = generatePresetFromMatrix(matrix);
    onGenerate({
      itemCode: preset.itemCode,
      notes: preset.notes,
      displayName: preset.displayName
    });
  };

  // Calculate preview
  const itemCode = getItemCodeFromMatrix(matrix);
  const notes = getNotesFromMatrix(matrix);

  return (
    <div className="space-y-4">
      {/* Step 1: Complexity */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          1. Complexity <span className="text-gray-500 font-normal">(Press 1)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {COMPLEXITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateMatrix('complexity', option.value as AppointmentComplexity)}
              className={`
                relative p-3 rounded-lg border-2 text-center transition-all
                ${matrix.complexity === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <option.icon className={`w-5 h-5 flex-shrink-0 ${matrix.complexity === option.value ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.sublabel}</div>
              </div>
              {matrix.complexity === option.value && (
                <Check className="w-4 h-4 text-blue-600 absolute top-2 right-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Modality */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          2. Modality <span className="text-gray-500 font-normal">(Press 2)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MODALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateMatrix('modality', option.value as AppointmentModality)}
              className={`
                relative p-3 rounded-lg border-2 text-center transition-all
                ${matrix.modality === option.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <option.icon className={`w-5 h-5 flex-shrink-0 ${matrix.modality === option.value ? 'text-emerald-600' : 'text-gray-400'}`} />
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.sublabel}</div>
              </div>
              {matrix.modality === option.value && (
                <Check className="w-4 h-4 text-emerald-600 absolute top-2 right-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          3. Appointment Type <span className="text-gray-500 font-normal">(Press 3)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateMatrix('type', option.value as AppointmentType)}
              className={`
                relative p-3 rounded-lg border-2 text-center transition-all
                ${matrix.type === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <option.icon className={`w-5 h-5 flex-shrink-0 ${matrix.type === option.value ? 'text-purple-600' : 'text-gray-400'}`} />
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.sublabel}</div>
              </div>
              {matrix.type === option.value && (
                <Check className="w-4 h-4 text-purple-600 absolute top-2 right-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 4: Follow-up */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          4. Follow-up Period <span className="text-gray-500 font-normal">(Press 4)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FOLLOWUP_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateMatrix('followUp', option.value as FollowUpPeriod)}
              className={`
                relative p-3 rounded-lg border-2 text-center transition-all
                ${matrix.followUp === option.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <option.icon className={`w-5 h-5 flex-shrink-0 ${matrix.followUp === option.value ? 'text-orange-600' : 'text-gray-400'}`} />
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.sublabel}</div>
              </div>
              {matrix.followUp === option.value && (
                <Check className="w-4 h-4 text-orange-600 absolute top-2 right-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview & Generate */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start space-x-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-700 mb-2">Preview</div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-gray-900">
                Item Code: <span className="text-blue-600">{itemCode}</span>
              </div>
              <div className="text-xs text-gray-700">
                Notes: <span className="italic">"{notes}"</span>
              </div>
            </div>
          </div>
        </div>
        
        <motion.button
          onClick={handleGenerate}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm shadow-md"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Apply This Appointment
        </motion.button>
      </div>
    </div>
  );
};
