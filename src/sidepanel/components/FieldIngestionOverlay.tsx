/**
 * Field Ingestion Overlay Component
 * 
 * Provides visual feedback showing which EMR fields are being discovered,
 * extracted, and processed during AI Review workflow.
 */

import React, { useEffect, useState } from 'react';
import { Search, FileText, Pill, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface FieldStatus {
  name: string;
  displayName: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'discovering' | 'extracting' | 'complete' | 'not-found' | 'error';
  content?: string;
  timestamp?: number;
}

interface FieldIngestionOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  className?: string;
}

const EMR_FIELDS: Omit<FieldStatus, 'status' | 'timestamp'>[] = [
  {
    name: 'background',
    displayName: 'Background History',
    icon: FileText
  },
  {
    name: 'investigations',
    displayName: 'Investigation Results',
    icon: Search
  },
  {
    name: 'medications-problemlist',
    displayName: 'Medications & Problems',
    icon: Pill
  }
];

export const FieldIngestionOverlay: React.FC<FieldIngestionOverlayProps> = ({
  isActive,
  onComplete,
  className = ''
}) => {
  const [fields, setFields] = useState<FieldStatus[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('Initializing...');
  const [progress, setProgress] = useState(0);

  // Initialize fields when overlay becomes active
  useEffect(() => {
    if (isActive) {
      const initialFields = EMR_FIELDS.map(field => ({
        ...field,
        status: 'discovering' as const,
        timestamp: Date.now()
      }));
      setFields(initialFields);
      setCurrentPhase('Discovering EMR fields...');
      setProgress(10);
      
      // Simulate field discovery and extraction process
      simulateFieldProcessing();
    } else {
      // Reset state when overlay is hidden
      setFields([]);
      setCurrentPhase('');
      setProgress(0);
    }
  }, [isActive]);

  const simulateFieldProcessing = async () => {
    // Phase 1: Field Discovery (10-25%)
    setCurrentPhase('Locating EMR sections...');
    await updateFieldsSequentially('extracting', 200, 10, 25);
    
    // Phase 2: Individual Field Extraction (25-85%) - Show each field being processed
    setCurrentPhase('Extracting Background section...');
    await updateSpecificField(0, 'complete', 300, 35);
    
    setCurrentPhase('Extracting Investigations section...');
    await updateSpecificField(1, 'complete', 400, 55);
    
    setCurrentPhase('Extracting Medications section...');
    await updateSpecificField(2, 'complete', 350, 75);
    
    // Phase 3: Data Validation (75-90%)
    setCurrentPhase('Validating extracted data...');
    setProgress(85);
    await wait(600);
    
    // Phase 4: AI Processing Preparation (90-100%)
    setCurrentPhase('Preparing data for AI analysis...');
    setProgress(95);
    await wait(500);
    setProgress(100);
    
    setCurrentPhase('Complete! Starting AI medical review...');
    
    // Auto-hide overlay after completion
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  const updateFieldsSequentially = async (
    status: FieldStatus['status'],
    delayMs: number,
    startProgress: number,
    endProgress: number
  ) => {
    const progressStep = (endProgress - startProgress) / EMR_FIELDS.length;
    
    for (let i = 0; i < EMR_FIELDS.length; i++) {
      await wait(delayMs);
      
      setFields(prev => prev.map((field, index) => 
        index === i 
          ? { ...field, status, timestamp: Date.now() }
          : field
      ));
      
      setProgress(startProgress + (progressStep * (i + 1)));
    }
  };

  const updateSpecificField = async (
    fieldIndex: number,
    status: FieldStatus['status'],
    delayMs: number,
    progressValue: number
  ) => {
    await wait(delayMs);
    
    setFields(prev => prev.map((field, index) => 
      index === fieldIndex 
        ? { ...field, status, timestamp: Date.now() }
        : field
    ));
    
    setProgress(progressValue);
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getStatusIcon = (status: FieldStatus['status']) => {
    switch (status) {
      case 'discovering':
        return <Search className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'extracting':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'not-found':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: FieldStatus['status']) => {
    switch (status) {
      case 'discovering':
        return 'Scanning...';
      case 'extracting':
        return 'Extracting...';
      case 'complete':
        return 'Complete';
      case 'not-found':
        return 'Not found';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: FieldStatus['status']) => {
    switch (status) {
      case 'discovering':
        return 'border-blue-200 bg-blue-50';
      case 'extracting':
        return 'border-amber-200 bg-amber-50';
      case 'complete':
        return 'border-green-200 bg-green-50';
      case 'not-found':
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <div 
      className={`absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-ingestion-title"
      aria-describedby="field-ingestion-description"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 m-4 max-w-md w-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-reduce:transition-none">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 id="field-ingestion-title" className="text-lg font-semibold text-gray-900 mb-2">
            AI Medical Review
          </h3>
          <p id="field-ingestion-description" className="text-sm text-gray-600">
            Analyzing EMR data for clinical insights
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {currentPhase}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div 
              className="bg-indigo-600 h-2 rounded-full motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Field Status List */}
        <div className="space-y-3">
          {fields.map((field, _index) => (
            <div
              key={field.name}
              className={`flex items-center space-x-3 p-3 rounded-lg border motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${getStatusColor(field.status)}`}
              role="status"
              aria-label={`${field.displayName}: ${getStatusText(field.status)}`}
            >
              <field.icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {field.displayName}
                  </span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(field.status)}
                    <span className="text-xs text-gray-600">
                      {getStatusText(field.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Processing EMR data locally with MedGemma-27b
          </p>
        </div>
      </div>
    </div>
  );
};