import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Clock, Zap, User, Video, Phone, UserPlus, RotateCcw, Calendar, CalendarX, Plus, X, Activity, Building2, MapPin, FileText, ClipboardList } from 'lucide-react';
import type {
  AppointmentMatrix,
  AppointmentComplexity,
  AppointmentModality,
  AppointmentType,
  FollowUpPeriod,
  FollowUpTask
} from '../../config/appointmentPresets';
import { generatePresetFromMatrix, getItemCodeFromMatrix, getTaskMessageFromMatrix, getNotesFromMatrix } from '../../config/appointmentPresets';

interface AppointmentMatrixBuilderProps {
  onGenerate: (preset: { itemCode: string; notes: string; displayName: string; taskMessage?: string }) => void;
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
  { value: 'f2f', label: 'F2F', sublabel: 'In-person', icon: User },
  { value: 'telehealth', label: 'Telehealth', sublabel: 'Video call', icon: Video },
  { value: 'phone', label: 'Phone', sublabel: 'Voice only', icon: Phone }
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
    followUp: '3mth',
    followUpMethod: 'f2f', // Default to match modality
    followUpTasks: []
  });
  const [customTaskInput, setCustomTaskInput] = useState<string>('');

  const updateMatrix = <K extends keyof AppointmentMatrix>(
    key: K,
    value: AppointmentMatrix[K]
  ) => {
    setMatrix(prev => ({ ...prev, [key]: value }));
  };

  // Sync followUpMethod with modality on initial load
  useEffect(() => {
    updateMatrix('followUpMethod', matrix.modality);
  }, []); // Only run once on mount

  // Keyboard navigation - cycle through options (1-5)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle numeric keys 1-5
      if (!['1', '2', '3', '4', '5'].includes(event.key)) {
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
        case '5': {
          // Cycle follow-up method: f2f -> telehealth -> phone -> f2f
          const modalityOrder: AppointmentModality[] = ['f2f', 'telehealth', 'phone'];
          const currentIndex = modalityOrder.indexOf(matrix.followUpMethod);
          const nextIndex = (currentIndex + 1) % modalityOrder.length;
          updateMatrix('followUpMethod', modalityOrder[nextIndex]);
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
      displayName: preset.displayName,
      taskMessage: preset.taskMessage
    });
  };

  // Helper functions for task management
  const addTask = (name: string, location?: string, timeframe?: string, notes?: string) => {
    const newTask: FollowUpTask = { name, location, timeframe, notes };
    setMatrix(prev => ({
      ...prev,
      followUpTasks: [...prev.followUpTasks, newTask]
    }));
  };

  // Update a specific task field
  const updateTask = (index: number, field: keyof FollowUpTask, value: string | undefined) => {
    setMatrix(prev => ({
      ...prev,
      followUpTasks: prev.followUpTasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const removeTask = (index: number) => {
    setMatrix(prev => ({
      ...prev,
      followUpTasks: prev.followUpTasks.filter((_, i) => i !== index)
    }));
  };

  const addCustomTask = () => {
    if (customTaskInput.trim()) {
      addTask(customTaskInput.trim());
      setCustomTaskInput('');
    }
  };

  // Calculate preview
  const itemCode = getItemCodeFromMatrix(matrix);
  const taskMessage = getTaskMessageFromMatrix(matrix);

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
                flex items-center justify-between px-3 py-1.5 rounded-lg border-2 transition-all
                ${matrix.complexity === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <option.icon className={`w-4 h-4 flex-shrink-0 ${matrix.complexity === option.value ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
              </div>
              {matrix.complexity === option.value && (
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
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
                flex items-center justify-between px-3 py-1.5 rounded-lg border-2 transition-all
                ${matrix.modality === option.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <option.icon className={`w-4 h-4 flex-shrink-0 ${matrix.modality === option.value ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
              </div>
              {matrix.modality === option.value && (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
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
                flex items-center justify-between px-3 py-1.5 rounded-lg border-2 transition-all
                ${matrix.type === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <option.icon className={`w-4 h-4 flex-shrink-0 ${matrix.type === option.value ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
              </div>
              {matrix.type === option.value && (
                <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 4: Follow-up Period */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          4. Follow-up Period <span className="text-gray-500 font-normal">(Press 4)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FOLLOWUP_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateMatrix('followUp', option.value as FollowUpPeriod)}
              className={`
                flex items-center justify-between px-3 py-1.5 rounded-lg border-2 transition-all
                ${matrix.followUp === option.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <option.icon className={`w-4 h-4 flex-shrink-0 ${matrix.followUp === option.value ? 'text-orange-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
              </div>
              {matrix.followUp === option.value && (
                <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 5: Follow Up Method */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          5. Follow Up Method <span className="text-gray-500 font-normal">(Press 5)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MODALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateMatrix('followUpMethod', option.value as AppointmentModality)}
              className={`
                flex items-center justify-between px-3 py-1.5 rounded-lg border-2 transition-all
                ${matrix.followUpMethod === option.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <option.icon className={`w-4 h-4 flex-shrink-0 ${matrix.followUpMethod === option.value ? 'text-teal-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
              </div>
              {matrix.followUpMethod === option.value && (
                <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 6: Follow-Up Tasks */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          6. Follow-up Tasks <span className="text-gray-500 font-normal">(Optional)</span>
        </label>

        {/* Quick-select buttons for tests */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Tests:</div>
          <div className="flex flex-wrap gap-1.5">
            {['TTE', 'CTCA', 'Stress Echo', 'Holter', 'HeartBug', 'Respiratory Function Tests', 'Review Bloods'].map((test) => (
              <button
                key={test}
                onClick={() => addTask(test)}
                className="flex items-center gap-1 text-xs py-1 px-2 rounded-md bg-white border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 transition-all"
              >
                <Activity className="w-3 h-3" />
                + {test}
              </button>
            ))}
          </div>
        </div>

        {/* Quick-select buttons for locations */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Locations:</div>
          <div className="flex flex-wrap gap-1.5">
            {['The Alfred', 'Capital Radiology Carlton', 'Bayside Heart', 'Vision Radiology Shepparton', 'Cabrini'].map((location) => (
              <button
                key={location}
                onClick={() => {
                  // Add location to last task if it doesn't have one
                  if (matrix.followUpTasks.length > 0) {
                    const lastTask = matrix.followUpTasks[matrix.followUpTasks.length - 1];
                    if (!lastTask.location) {
                      setMatrix(prev => ({
                        ...prev,
                        followUpTasks: [
                          ...prev.followUpTasks.slice(0, -1),
                          { ...lastTask, location }
                        ]
                      }));
                    }
                  }
                }}
                className="flex items-center gap-1 text-xs py-1 px-2 rounded-md bg-white border border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 text-gray-700 transition-all"
              >
                <Building2 className="w-3 h-3" />
                @ {location}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe selection */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Timeframe:</div>
          <div className="flex flex-wrap gap-1.5">
            {['2 weeks', '4 weeks', '6-8 weeks', 'next available'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => {
                  if (matrix.followUpTasks.length > 0) {
                    updateTask(matrix.followUpTasks.length - 1, 'timeframe', timeframe);
                  }
                }}
                className="flex items-center gap-1 text-xs py-1 px-2 rounded-md bg-white border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700 transition-all"
              >
                <Clock className="w-3 h-3" />
                {timeframe}
              </button>
            ))}
          </div>
        </div>

        {/* Notes/Indication selection */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Notes/Indication:</div>
          <div className="flex flex-wrap gap-1.5">
            {['chest discomfort', 'worsening dyspnoea'].map((notes) => (
              <button
                key={notes}
                onClick={() => {
                  if (matrix.followUpTasks.length > 0) {
                    updateTask(matrix.followUpTasks.length - 1, 'notes', notes);
                  }
                }}
                className="flex items-center gap-1 text-xs py-1 px-2 rounded-md bg-white border border-gray-300 hover:border-pink-400 hover:bg-pink-50 text-gray-700 transition-all"
              >
                <ClipboardList className="w-3 h-3" />
                {notes}
              </button>
            ))}
          </div>
        </div>

        {/* Task list display */}
        {matrix.followUpTasks.length > 0 && (
          <div className="mb-3 space-y-1.5 max-h-40 overflow-y-auto">
            {matrix.followUpTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2 text-xs">
                <span className="text-gray-900 flex-1">
                  {task.name}
                  {task.location && <span className="text-gray-600"> @ {task.location}</span>}
                  {task.timeframe && <span className="text-indigo-600"> ({task.timeframe})</span>}
                  {task.notes && <span className="text-pink-600">, notes: {task.notes}</span>}
                </span>
                <button
                  onClick={() => removeTask(index)}
                  className="text-gray-400 hover:text-red-600 transition-colors ml-2 flex-shrink-0"
                  aria-label="Remove task"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Custom task input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customTaskInput}
            onChange={(e) => setCustomTaskInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addCustomTask();
              }
            }}
            placeholder="Add custom task..."
            className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addCustomTask}
            disabled={!customTaskInput.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Add custom task"
          >
            <Plus className="w-4 h-4" />
          </button>
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
                Task: <span className="italic">"{taskMessage.split('\n')[0]}..."</span>
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
