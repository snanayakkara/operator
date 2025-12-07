import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Clock, Zap, User, Video, Phone, UserPlus, RotateCcw, Calendar, CalendarX, Plus, X } from 'lucide-react';
import { IconButton } from './buttons/Button';
import { SegmentedControl } from './ui/SegmentedControl';
import type {
  AppointmentMatrix,
  AppointmentComplexity,
  AppointmentModality,
  AppointmentType,
  FollowUpPeriod,
  FollowUpTask
} from '../../config/appointmentPresets';
import { generatePresetFromMatrix, getItemCodeFromMatrix, getTaskMessageFromMatrix } from '../../config/appointmentPresets';

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
  { value: 'simple', label: 'Simple', icon: Clock },
  { value: 'complex', label: 'Complex', icon: Zap }
];

const MODALITY_OPTIONS: OptionButton[] = [
  { value: 'f2f', label: 'F2F', icon: User },
  { value: 'telehealth', label: 'Telehealth', icon: Video },
  { value: 'phone', label: 'Phone', icon: Phone }
];

const TYPE_OPTIONS: OptionButton[] = [
  { value: 'new', label: 'New', icon: UserPlus },
  { value: 'review', label: 'Review', icon: RotateCcw }
];

const FOLLOWUP_OPTIONS: OptionButton[] = [
  { value: '1wk', label: '1 Week', icon: Calendar },
  { value: '6wk', label: '6 Weeks', icon: Calendar },
  { value: '3mth', label: '3 Months', icon: Calendar },
  { value: '6mth', label: '6 Months', icon: Calendar },
  { value: '12mth', label: '12 Months', icon: Calendar },
  { value: 'none', label: 'No Follow-up', icon: CalendarX }
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
      // Ignore if user is typing in input/textarea
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable;

      if (isTyping) return; // Let user type freely

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
          // Cycle follow-up: 1wk -> 6wk -> 3mth -> 6mth -> 12mth -> none -> 1wk
          const followUpOrder: FollowUpPeriod[] = ['1wk', '6wk', '3mth', '6mth', '12mth', 'none'];
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
    <div className="space-y-2.5">
      {/* Step 1: Complexity */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          1. Complexity <span className="text-xs text-gray-500 font-normal">(Press 1)</span>
        </label>
        <SegmentedControl
          options={COMPLEXITY_OPTIONS.map(opt => ({
            id: opt.value,
            label: opt.label,
            icon: opt.icon
          }))}
          value={matrix.complexity}
          onChange={(value) => updateMatrix('complexity', value as AppointmentComplexity)}
          size="sm"
          accentColor="blue"
          fullWidth
        />
      </div>

      {/* Step 2: Modality */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          2. Modality <span className="text-xs text-gray-500 font-normal">(Press 2)</span>
        </label>
        <SegmentedControl
          options={MODALITY_OPTIONS.map(opt => ({
            id: opt.value,
            label: opt.label,
            icon: opt.icon
          }))}
          value={matrix.modality}
          onChange={(value) => updateMatrix('modality', value as AppointmentModality)}
          size="sm"
          accentColor="blue"
          fullWidth
        />
      </div>

      {/* Gradient separator (blue → purple) */}
      <div className="h-0.5 bg-gradient-to-r from-blue-200 via-purple-100 to-purple-200 rounded-full" />

      {/* Step 3: Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          3. Appointment Type <span className="text-xs text-gray-500 font-normal">(Press 3)</span>
        </label>
        <SegmentedControl
          options={TYPE_OPTIONS.map(opt => ({
            id: opt.value,
            label: opt.label,
            icon: opt.icon
          }))}
          value={matrix.type}
          onChange={(value) => updateMatrix('type', value as AppointmentType)}
          size="sm"
          accentColor="purple"
          fullWidth
        />
      </div>

      {/* Step 4: Follow-up Period */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          4. Follow-up Period <span className="text-xs text-gray-500 font-normal">(Press 4)</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {FOLLOWUP_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateMatrix('followUp', option.value as FollowUpPeriod)}
              className={`
                h-7 px-2 text-xs rounded-md font-medium transition-all
                inline-flex items-center justify-between gap-1 border-2
                ${matrix.followUp === option.value
                  ? 'bg-purple-50 text-purple-900 border-purple-200 shadow-sm'
                  : 'bg-white border-purple-100 text-gray-700 hover:border-purple-200 hover:bg-purple-50/30'
                }
              `}
            >
              <option.icon className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1 text-left">{option.label}</span>
              {matrix.followUp === option.value && <Check className="w-3 h-3 flex-shrink-0 text-purple-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Gradient separator (purple → emerald) */}
      <div className="h-0.5 bg-gradient-to-r from-purple-200 via-emerald-100 to-emerald-200 rounded-full" />

      {/* Step 5: Follow Up Method */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          5. Follow Up Method <span className="text-xs text-gray-500 font-normal">(Press 5)</span>
        </label>
        <SegmentedControl
          options={MODALITY_OPTIONS.map(opt => ({
            id: opt.value,
            label: opt.label,
            icon: opt.icon
          }))}
          value={matrix.followUpMethod}
          onChange={(value) => updateMatrix('followUpMethod', value as AppointmentModality)}
          size="sm"
          accentColor="emerald"
          fullWidth
        />
      </div>

      {/* Step 6: Follow-Up Tasks */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          6. Follow-up Tasks <span className="text-xs text-gray-500 font-normal">(Optional)</span>
        </label>

        {/* Quick-select buttons for tests */}
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-0.5">Tests:</div>
          <div className="flex flex-wrap gap-1">
            {['TTE', 'CTCA', 'Stress Echo', 'Holter', 'HeartBug', 'RFT', 'Bloods'].map((test) => (
              <button
                key={test}
                type="button"
                onClick={() => addTask(test === 'RFT' ? 'Respiratory Function Tests' : test === 'Bloods' ? 'Review Bloods' : test)}
                className="text-xs py-0.5 px-1.5 border border-amber-200 rounded-md bg-white hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
              >
                + {test}
              </button>
            ))}
          </div>
        </div>

        {/* Quick-select buttons for locations */}
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-0.5">Locations:</div>
          <div className="flex flex-wrap gap-1">
            {[
              { short: 'Alfred', full: 'The Alfred' },
              { short: 'Cap Rad', full: 'Capital Radiology Carlton' },
              { short: 'Bayside', full: 'Bayside Heart' },
              { short: 'Vision Rad', full: 'Vision Radiology Shepparton' },
              { short: 'Cabrini', full: 'Cabrini' }
            ].map(({ short, full }) => (
              <button
                key={full}
                type="button"
                onClick={() => {
                  if (matrix.followUpTasks.length > 0) {
                    const lastTask = matrix.followUpTasks[matrix.followUpTasks.length - 1];
                    if (!lastTask.location) {
                      setMatrix(prev => ({
                        ...prev,
                        followUpTasks: [
                          ...prev.followUpTasks.slice(0, -1),
                          { ...lastTask, location: full }
                        ]
                      }));
                    }
                  }
                }}
                className="text-xs py-0.5 px-1.5 border border-amber-200 rounded-md bg-white hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
              >
                @ {short}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe selection */}
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-0.5">Timeframe:</div>
          <div className="flex flex-wrap gap-1">
            {[
              { short: '2wk', full: '2 weeks' },
              { short: '4wk', full: '4 weeks' },
              { short: '6-8wk', full: '6-8 weeks' },
              { short: 'Before appt', full: 'prior to next appointment' },
              { short: 'ASAP', full: 'next available' }
            ].map(({ short, full }) => (
              <button
                key={full}
                type="button"
                onClick={() => {
                  if (matrix.followUpTasks.length > 0) {
                    updateTask(matrix.followUpTasks.length - 1, 'timeframe', full);
                  }
                }}
                className="text-xs py-0.5 px-1.5 border border-amber-200 rounded-md bg-white hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
              >
                {short}
              </button>
            ))}
          </div>
        </div>

        {/* Notes/Indication selection */}
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-0.5">Notes:</div>
          <div className="flex flex-wrap gap-1">
            {['chest discomfort', 'worsening dyspnoea'].map((notes) => (
              <button
                key={notes}
                type="button"
                onClick={() => {
                  if (matrix.followUpTasks.length > 0) {
                    updateTask(matrix.followUpTasks.length - 1, 'notes', notes);
                  }
                }}
                className="text-xs py-0.5 px-1.5 border border-amber-200 rounded-md bg-white hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
              >
                {notes}
              </button>
            ))}
          </div>
        </div>

        {/* Task list display */}
        {matrix.followUpTasks.length > 0 && (
          <div className="mb-2 space-y-1 max-h-24 overflow-y-auto">
            {matrix.followUpTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2 text-xs">
                <span className="text-gray-900 flex-1">
                  {task.name}
                  {task.location && <span className="text-gray-600"> @ {task.location}</span>}
                  {task.timeframe && <span className="text-indigo-600"> ({task.timeframe})</span>}
                  {task.notes && <span className="text-pink-600">, notes: {task.notes}</span>}
                </span>
                <IconButton
                  onClick={() => removeTask(index)}
                  icon={X}
                  variant="ghost"
                  size="sm"
                  aria-label="Remove task"
                  className="text-gray-400 hover:text-red-600 ml-2 w-auto h-auto p-0.5"
                />
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
          <IconButton
            onClick={addCustomTask}
            disabled={!customTaskInput.trim()}
            icon={Plus}
            variant="secondary"
            size="md"
            aria-label="Add custom task"
            className="disabled:bg-gray-300"
          />
        </div>
      </div>

      {/* Preview & Generate */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-2.5 border border-blue-200">
        <div className="flex items-start space-x-2 mb-2">
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
