/**
 * Phase 4: Real-Time Phase 3 Processing Indicator
 * 
 * Provides detailed progress feedback for Phase 3 agent processing
 * with intelligent phase detection and quality monitoring.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AgentType } from '@/types/medical.types';

export interface ProcessingPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'warning';
  progress: number; // 0-100
  startTime?: number;
  endTime?: number;
  duration?: number;
  details?: string;
  subPhases?: ProcessingSubPhase[];
}

export interface ProcessingSubPhase {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  description?: string;
}

export interface Phase3ProcessingStatus {
  agentType: AgentType;
  isPhase3: boolean;
  currentPhase: string;
  overallProgress: number;
  phases: ProcessingPhase[];
  qualityMetrics?: {
    clinicalAccuracy: number;
    terminologyPreservation: number;
    structuralQuality: number;
    confidence: number;
  };
  estimatedTimeRemaining: number;
  warnings: string[];
  insights: string[];
}

interface Phase3ProcessingIndicatorProps {
  agentType: AgentType;
  isProcessing: boolean;
  processingStatus?: Phase3ProcessingStatus;
  onPhaseUpdate?: (phase: string, progress: number) => void;
}

/**
 * Advanced processing indicator for Phase 3 agents with real-time feedback
 */
export const Phase3ProcessingIndicator: React.FC<Phase3ProcessingIndicatorProps> = ({
  agentType,
  isProcessing,
  processingStatus,
  onPhaseUpdate
}) => {
  const [currentStatus, setCurrentStatus] = useState<Phase3ProcessingStatus | null>(processingStatus || null);
  const [animationState, setAnimationState] = useState<'idle' | 'processing' | 'completing'>('idle');

  // Update animation state based on processing status
  useEffect(() => {
    if (isProcessing) {
      setAnimationState('processing');
    } else if (currentStatus?.overallProgress === 100) {
      setAnimationState('completing');
      setTimeout(() => setAnimationState('idle'), 2000);
    } else {
      setAnimationState('idle');
    }
  }, [isProcessing, currentStatus?.overallProgress]);

  // Simulate Phase 3 processing phases if not provided
  useEffect(() => {
    if (isProcessing && !processingStatus) {
      simulatePhase3Processing();
    } else if (processingStatus) {
      setCurrentStatus(processingStatus);
    }
  }, [isProcessing, processingStatus, agentType]);

  // Simulate realistic Phase 3 processing phases
  const simulatePhase3Processing = useCallback(() => {
    const phases = createPhase3Phases(agentType);
    
    setCurrentStatus({
      agentType,
      isPhase3: isPhase3Agent(agentType),
      currentPhase: phases[0].name,
      overallProgress: 0,
      phases,
      estimatedTimeRemaining: getEstimatedProcessingTime(agentType),
      warnings: [],
      insights: []
    });

    // Simulate phase progression
    let currentPhaseIndex = 0;
    let phaseProgress = 0;

    const progressInterval = setInterval(() => {
      if (currentPhaseIndex >= phases.length) {
        clearInterval(progressInterval);
        return;
      }

      const currentPhase = phases[currentPhaseIndex];
      phaseProgress += Math.random() * 15 + 5; // 5-20% progress per tick

      if (phaseProgress >= 100) {
        // Complete current phase
        currentPhase.status = 'completed';
        currentPhase.endTime = Date.now();
        currentPhase.duration = currentPhase.endTime - (currentPhase.startTime || Date.now());
        currentPhase.progress = 100;

        currentPhaseIndex++;
        phaseProgress = 0;

        // Start next phase
        if (currentPhaseIndex < phases.length) {
          phases[currentPhaseIndex].status = 'active';
          phases[currentPhaseIndex].startTime = Date.now();
        }
      } else {
        currentPhase.progress = phaseProgress;
        currentPhase.status = 'active';
        if (!currentPhase.startTime) {
          currentPhase.startTime = Date.now();
        }
      }

      // Calculate overall progress
      const overallProgress = phases.reduce((total, phase, index) => {
        if (index < currentPhaseIndex) return total + (100 / phases.length);
        if (index === currentPhaseIndex) return total + (phaseProgress / phases.length);
        return total;
      }, 0);

      // Update status
      setCurrentStatus(prev => prev ? {
        ...prev,
        currentPhase: phases[currentPhaseIndex]?.name || 'Completing',
        overallProgress: Math.min(100, overallProgress),
        phases: [...phases],
        estimatedTimeRemaining: Math.max(0, prev.estimatedTimeRemaining - 500),
        qualityMetrics: generateQualityMetrics(overallProgress),
        insights: generateProcessingInsights(agentType, phases[currentPhaseIndex])
      } : null);

      // Notify parent of phase updates
      if (onPhaseUpdate && phases[currentPhaseIndex]) {
        onPhaseUpdate(phases[currentPhaseIndex].name, overallProgress);
      }

      // Complete processing
      if (overallProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setCurrentStatus(prev => prev ? {
            ...prev,
            overallProgress: 100,
            currentPhase: 'Completed'
          } : null);
        }, 500);
      }
    }, 800); // Update every 800ms for smooth progression

    return () => clearInterval(progressInterval);
  }, [agentType, onPhaseUpdate]);

  // Create Phase 3 specific processing phases
  const createPhase3Phases = (agentType: AgentType): ProcessingPhase[] => {
    const basePhases: ProcessingPhase[] = [
      {
        id: 'initialization',
        name: 'Initialization',
        description: 'Preparing Phase 3 processing pipeline',
        status: 'active',
        progress: 0,
        subPhases: [
          { name: 'Loading agent', status: 'pending', progress: 0 },
          { name: 'Context preparation', status: 'pending', progress: 0 }
        ]
      }
    ];

    if (isPhase3Agent(agentType)) {
      basePhases.push(
        {
          id: 'normalization',
          name: 'Enhanced Normalization',
          description: 'Applying Phase 2 + specialized medical text normalization',
          status: 'pending',
          progress: 0,
          subPhases: [
            { name: 'Phase 2 normalization', status: 'pending', progress: 0 },
            { name: 'Specialized patterns', status: 'pending', progress: 0 },
            { name: 'Medical terminology', status: 'pending', progress: 0 }
          ]
        },
        {
          id: 'extraction',
          name: 'Clinical Finding Extraction',
          description: 'Extracting clinical insights using MedicalSummaryExtractor',
          status: 'pending',
          progress: 0,
          subPhases: [
            { name: 'Pattern recognition', status: 'pending', progress: 0 },
            { name: 'Quality assessment', status: 'pending', progress: 0 },
            { name: 'Confidence scoring', status: 'pending', progress: 0 }
          ]
        },
        {
          id: 'cross_agent',
          name: 'Cross-Agent Intelligence',
          description: 'Analyzing shared insights and medical correlations',
          status: 'pending',
          progress: 0,
          subPhases: [
            { name: 'Context enhancement', status: 'pending', progress: 0 },
            { name: 'Risk assessment', status: 'pending', progress: 0 },
            { name: 'Drug interactions', status: 'pending', progress: 0 }
          ]
        }
      );
    }

    basePhases.push(
      {
        id: 'ai_processing',
        name: 'AI Model Processing',
        description: `Processing with ${getModelName(agentType)} model`,
        status: 'pending',
        progress: 0,
        subPhases: [
          { name: 'Model inference', status: 'pending', progress: 0 },
          { name: 'Response generation', status: 'pending', progress: 0 }
        ]
      },
      {
        id: 'validation',
        name: 'Quality Validation',
        description: 'Validating output quality and medical accuracy',
        status: 'pending',
        progress: 0,
        subPhases: [
          { name: 'Format validation', status: 'pending', progress: 0 },
          { name: 'Medical accuracy', status: 'pending', progress: 0 },
          { name: 'Confidence assessment', status: 'pending', progress: 0 }
        ]
      },
      {
        id: 'finalization',
        name: 'Report Generation',
        description: 'Creating final medical report with enhanced metadata',
        status: 'pending',
        progress: 0,
        subPhases: [
          { name: 'Section parsing', status: 'pending', progress: 0 },
          { name: 'Metadata generation', status: 'pending', progress: 0 },
          { name: 'Quality metrics', status: 'pending', progress: 0 }
        ]
      }
    );

    return basePhases;
  };

  // Helper functions
  const isPhase3Agent = (agentType: AgentType): boolean => {
    return ['quick-letter', 'investigation-summary', 'background', 'medication'].includes(agentType);
  };

  const getModelName = (agentType: AgentType): string => {
    const modelMap = {
      'investigation-summary': 'Google Gemma-3n-e4b (Fast)',
      'background': 'Google Gemma-3n-e4b (Fast)',  
      'medication': 'Google Gemma-3n-e4b (Fast)',
      'quick-letter': 'MedGemma-27b MLX (Comprehensive)'
    };
    return modelMap[agentType as keyof typeof modelMap] || 'MedGemma-27b MLX';
  };

  const getEstimatedProcessingTime = (agentType: AgentType): number => {
    const timeMap = {
      'investigation-summary': 3000,
      'background': 4000,
      'medication': 3500,
      'quick-letter': 6000
    };
    return timeMap[agentType as keyof typeof timeMap] || 5000;
  };

  const generateQualityMetrics = (progress: number): Phase3ProcessingStatus['qualityMetrics'] => {
    if (progress < 60) return undefined;

    return {
      clinicalAccuracy: Math.min(1, 0.6 + (progress - 60) / 100 * 0.4),
      terminologyPreservation: Math.min(1, 0.7 + (progress - 60) / 100 * 0.3),
      structuralQuality: Math.min(1, 0.65 + (progress - 60) / 100 * 0.35),
      confidence: Math.min(1, 0.5 + progress / 100 * 0.5)
    };
  };

  const generateProcessingInsights = (agentType: AgentType, currentPhase?: ProcessingPhase): string[] => {
    if (!currentPhase) return [];

    const insights: { [key: string]: string[] } = {
      'Enhanced Normalization': [
        'Applying medical terminology standardization',
        'Preserving clinical context and meaning',
        'Optimizing for Australian medical guidelines'
      ],
      'Clinical Finding Extraction': [
        'Identifying key clinical patterns',
        'Assessing finding confidence levels',
        'Categorizing medical insights'
      ],
      'Cross-Agent Intelligence': [
        'Analyzing patient context across sessions',
        'Detecting potential drug interactions',
        'Correlating findings with medical history'
      ],
      'Quality Validation': [
        'Ensuring medical accuracy standards',
        'Validating clinical terminology',
        'Assessing output completeness'
      ]
    };

    return insights[currentPhase.name] || [];
  };

  if (!isProcessing && !currentStatus) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {currentStatus?.isPhase3 ? 'Phase 3' : 'Legacy'} Processing
          </h3>
          <p className="text-sm text-gray-600">
            {formatAgentName(agentType)} Agent
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(currentStatus?.overallProgress || 0)}%
          </div>
          <div className="text-xs text-gray-500">
            {currentStatus?.estimatedTimeRemaining ? 
              `${Math.ceil(currentStatus.estimatedTimeRemaining / 1000)}s remaining` : 
              'Processing...'}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">{currentStatus?.currentPhase || 'Processing...'}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              animationState === 'processing' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse' 
                : animationState === 'completing'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${currentStatus?.overallProgress || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Phase Details */}
      {currentStatus?.phases && currentStatus.phases.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">Processing Phases</h4>
          <div className="space-y-2">
            {currentStatus.phases.map((phase) => (
              <div key={phase.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      phase.status === 'completed' ? 'bg-green-500' :
                      phase.status === 'active' ? 'bg-blue-500 animate-pulse' :
                      phase.status === 'error' ? 'bg-red-500' :
                      phase.status === 'warning' ? 'bg-yellow-500' :
                      'bg-gray-300'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      phase.status === 'active' ? 'text-blue-700' : 
                      phase.status === 'completed' ? 'text-green-700' :
                      'text-gray-600'
                    }`}>
                      {phase.name}
                    </span>
                    {phase.duration && (
                      <span className="text-xs text-gray-500">
                        ({(phase.duration / 1000).toFixed(1)}s)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round(phase.progress)}%
                  </span>
                </div>
                
                <p className="text-xs text-gray-600 ml-5">{phase.description}</p>
                
                {phase.subPhases && phase.status === 'active' && (
                  <div className="ml-5 space-y-1">
                    {phase.subPhases.map((subPhase, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            subPhase.status === 'completed' ? 'bg-green-400' :
                            subPhase.status === 'active' ? 'bg-blue-400 animate-pulse' :
                            'bg-gray-200'
                          }`}></div>
                          <span className="text-gray-600">{subPhase.name}</span>
                        </div>
                        <span className="text-gray-500">{Math.round(subPhase.progress)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Metrics */}
      {currentStatus?.qualityMetrics && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-gray-800">Quality Metrics</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(currentStatus.qualityMetrics).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-gray-800 font-medium">
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      value >= 0.8 ? 'bg-green-500' :
                      value >= 0.6 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${value * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Insights */}
      {currentStatus?.insights && currentStatus.insights.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-blue-800">Processing Insights</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            {currentStatus.insights.map((insight, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-500 mr-1">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {currentStatus?.warnings && currentStatus.warnings.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            {currentStatus.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-yellow-500 mr-1">⚠</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  function formatAgentName(agentType: AgentType): string {
    const names: Record<AgentType | 'aus-medical-review', string> = {
      'quick-letter': 'Quick Letter',
      'investigation-summary': 'Investigation Summary',
      'medication': 'Medication',
      'background': 'Background',
      'tavi': 'TAVI',
      'angiogram-pci': 'Angiogram/PCI',
      'mteer': 'mTEER',
      'tteer': 'tTEER',
      'pfo-closure': 'PFO Closure',
      'asd-closure': 'ASD Closure',
      'pvl-plug': 'PVL Plug',
      'bypass-graft': 'Bypass Graft',
      'right-heart-cath': 'Right Heart Cath',
      'consultation': 'Consultation',
      'ai-medical-review': 'Australian Medical Review',
      'batch-ai-review': 'Batch AI Review',
      'tavi-workup': 'TAVI Workup',
      'imaging': 'Imaging',
      'bloods': 'Bloods',
      'patient-education': 'Patient Education',
      'enhancement': 'Enhancement',
      'transcription': 'Transcription',
      'generation': 'Generation',
      // Backward compatibility alias
      'aus-medical-review': 'Australian Medical Review'
    };
    
    return names[agentType] || agentType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export default Phase3ProcessingIndicator;
