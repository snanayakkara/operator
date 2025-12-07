/**
 * Sparsity Stepper Modal Component
 *
 * 4-question stepper to collect minimum info when notes are too sparse.
 * Triggered when completeness < 85% or > 2 missing items (before LLM call).
 */

import React, { useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button, { IconButton } from './buttons/Button';
import type { StepperResult } from '@/types/pasteNotes.types';

interface SparsityStepperModalProps {
  isVisible: boolean;
  missingFields: string[];
  onComplete: (result: StepperResult) => void;
  onCancel: () => void;
  prefillData?: {
    diagnosis?: string;
    plan?: string;
  };
}

const STEPS = [
  {
    id: 'purpose',
    title: 'Letter Purpose',
    question: 'What is the purpose of this letter?',
    type: 'select' as const,
    options: [
      { value: 'referral', label: 'Referral to specialist' },
      { value: 'follow-up', label: 'Follow-up consultation' },
      { value: 'results', label: 'Investigation results' },
      { value: 'discharge', label: 'Discharge summary' }
    ]
  },
  {
    id: 'diagnosis',
    title: 'Primary Problem',
    question: 'What is the primary problem or diagnosis?',
    type: 'text' as const,
    placeholder: 'e.g., Hypertension, Atrial fibrillation, Chest pain'
  },
  {
    id: 'plan',
    title: 'Plan',
    question: 'What are the recommendations or plan?',
    type: 'textarea' as const,
    placeholder: 'e.g., Continue current medications, arrange echo, review in 4 weeks'
  },
  {
    id: 'medications',
    title: 'Medication Changes',
    question: 'Are there any medication changes?',
    type: 'textarea' as const,
    placeholder: 'e.g., Increase perindopril to 5 mg od, stop amlodipine, or "no medication changes"'
  }
];

export const SparsityStepperModal: React.FC<SparsityStepperModalProps> = ({
  isVisible,
  missingFields,
  onComplete,
  onCancel,
  prefillData
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    purpose: '',
    diagnosis: prefillData?.diagnosis || '',
    plan: prefillData?.plan || '',
    medications: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentStepData = STEPS[currentStep];

  const validateStep = useCallback((): boolean => {
    const answer = answers[currentStepData.id];
    if (!answer || answer.trim().length === 0) {
      setErrors({ [currentStepData.id]: 'This field is required' });
      return false;
    }
    setErrors({});
    return true;
  }, [answers, currentStepData.id]);

  const handleNext = useCallback(() => {
    if (!validateStep()) return;

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - complete
      const result: StepperResult = {
        purpose: answers.purpose,
        diagnosis: answers.diagnosis,
        plan: answers.plan,
        medications: answers.medications
      };
      onComplete(result);
    }
  }, [currentStep, answers, validateStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  }, [currentStep]);

  const handleChange = useCallback((value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentStepData.id]: value
    }));
    setErrors({});
  }, [currentStepData.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter' && currentStepData.type === 'select') {
        e.preventDefault();
        handleNext();
      }
    },
    [currentStepData.type, handleNext, onCancel]
  );

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-modal shadow-modal max-w-xl w-full border-2 border-amber-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="stepper-title"
          aria-describedby="stepper-description"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 id="stepper-title" className="text-lg font-semibold text-gray-900">
                    Additional Information Needed
                  </h3>
                  <p id="stepper-description" className="text-xs text-gray-600">
                    Step {currentStep + 1} of {STEPS.length}
                  </p>
                </div>
              </div>
              <IconButton
                onClick={onCancel}
                icon={<X />}
                variant="ghost"
                size="md"
                aria-label="Close stepper"
                className="text-gray-500 hover:text-gray-700"
              />
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center space-x-1">
                {STEPS.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      idx < currentStep
                        ? 'bg-green-500'
                        : idx === currentStep
                        ? 'bg-amber-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            {/* Missing fields notice */}
            {missingFields.length > 0 && currentStep === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm text-amber-800">
                  <strong>Missing information:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    {missingFields.map((field, idx) => (
                      <li key={idx}>• {field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Question */}
            <div>
              <label htmlFor={`step-${currentStepData.id}`} className="block text-lg font-medium text-gray-900 mb-2">
                {currentStepData.question}
              </label>

              {currentStepData.type === 'select' && (
                <select
                  id={`step-${currentStepData.id}`}
                  value={answers[currentStepData.id]}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                  autoFocus
                >
                  <option value="">Select an option...</option>
                  {currentStepData.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {currentStepData.type === 'text' && (
                <input
                  type="text"
                  id={`step-${currentStepData.id}`}
                  value={answers[currentStepData.id]}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentStepData.placeholder}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                  autoFocus
                />
              )}

              {currentStepData.type === 'textarea' && (
                <textarea
                  id={`step-${currentStepData.id}`}
                  value={answers[currentStepData.id]}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentStepData.placeholder}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y text-base"
                  autoFocus
                />
              )}

              {errors[currentStepData.id] && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-600"
                >
                  {errors[currentStepData.id]}
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <Button
                onClick={handleBack}
                disabled={currentStep === 0}
                variant="outline"
                size="sm"
                startIcon={<ChevronLeft />}
                className="bg-white"
              >
                Back
              </Button>

              <div className="text-xs text-gray-500">
                Press Enter to continue • Esc to cancel
              </div>

              <Button
                onClick={handleNext}
                variant="primary"
                size="sm"
                endIcon={<ChevronRight />}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {currentStep === STEPS.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
