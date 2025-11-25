/**
 * Advanced Intelligence: Smart Recommendation Engine
 *
 * Leverages prior-stage intelligence and cross-agent insights to provide
 * intelligent agent selection and workflow optimization recommendations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AgentType } from '@/types/medical.types';
import { CrossAgentIntelligence } from '@/services/CrossAgentIntelligence';
import { LazyAgentLoader } from '@/services/LazyAgentLoader';

interface SmartRecommendation {
  id: string;
  type: 'agent_selection' | 'workflow_optimization' | 'clinical_insight' | 'quality_improvement';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendedAgent?: AgentType;
  confidence: number;
  reasoning: string[];
  actionable: boolean;
  estimatedTimeSaving?: number; // in seconds
  qualityImprovement?: number; // 0-1 scale
}

interface InputAnalysis {
  detectedMedicalTerms: string[];
  suggestedAgents: {
    agentType: AgentType;
    confidence: number;
    reasoning: string;
  }[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedProcessingTime: number;
  qualityFactors: {
    factor: string;
    score: number;
    impact: string;
  }[];
}

interface RecommendationEngineProps {
  sessionId?: string;
  currentInput?: string;
  onRecommendationSelect: (recommendation: SmartRecommendation) => void;
  onAgentSuggestion: (agentType: AgentType, confidence: number) => void;
}

/**
 * Smart Recommendation Engine for intelligent agent selection and workflow optimization
 */
export const SmartRecommendationEngine: React.FC<RecommendationEngineProps> = ({
  sessionId,
  currentInput,
  onRecommendationSelect,
  onAgentSuggestion
}) => {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [inputAnalysis, setInputAnalysis] = useState<InputAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [crossAgentIntelligence] = useState(() => CrossAgentIntelligence.getInstance());
  const [_agentLoader] = useState(() => LazyAgentLoader.getInstance());

  // Perform comprehensive input analysis
  const performInputAnalysis = async (input: string): Promise<InputAnalysis> => {
    const medicalTerms = extractMedicalTerms(input);
    const complexity = assessComplexity(input, medicalTerms);
    
    const suggestedAgents = await suggestAgents(input, medicalTerms, complexity);
    
    return {
      detectedMedicalTerms: medicalTerms,
      suggestedAgents,
      complexity,
      estimatedProcessingTime: estimateProcessingTime(complexity, suggestedAgents),
      qualityFactors: assessQualityFactors(input, medicalTerms)
    };
  };

  // Generate smart recommendations based on analysis
  const generateSmartRecommendations = async (
    input: string, 
    analysis: InputAnalysis,
    sessionId?: string
  ): Promise<SmartRecommendation[]> => {
    const recommendations: SmartRecommendation[] = [];

    // Agent selection recommendations
    if (analysis.suggestedAgents.length > 1) {
      const topAgent = analysis.suggestedAgents[0];
      recommendations.push({
        id: `agent-selection-${Date.now()}`,
        type: 'agent_selection',
        priority: topAgent.confidence > 0.9 ? 'high' : 'medium',
        title: `Recommended: ${formatAgentName(topAgent.agentType)} Agent`,
        description: `Based on analysis, this agent is best suited for your content`,
        recommendedAgent: topAgent.agentType,
        confidence: topAgent.confidence,
        reasoning: [topAgent.reasoning, `Confidence: ${(topAgent.confidence * 100).toFixed(0)}%`],
        actionable: true,
        estimatedTimeSaving: topAgent.confidence > 0.8 ? 15 : 5,
        qualityImprovement: topAgent.confidence > 0.8 ? 0.2 : 0.1
      });
    }

    // Workflow optimization recommendations
    if (analysis.complexity === 'complex') {
      recommendations.push({
        id: `workflow-complex-${Date.now()}`,
        type: 'workflow_optimization',
        priority: 'medium',
        title: 'Complex Content Detected',
        description: 'Consider breaking into smaller, focused sections for better accuracy',
        confidence: 0.8,
        reasoning: [
          'Complex medical content benefits from focused processing',
          'Multiple agents may provide more comprehensive results'
        ],
        actionable: true,
        qualityImprovement: 0.25
      });
    }

    // Clinical insight recommendations
    if (sessionId) {
      const contextEnhancement = crossAgentIntelligence.getEnhancedContext(sessionId, analysis.suggestedAgents[0]?.agentType || 'quick-letter');
      
      if (contextEnhancement.recommendations.length > 0) {
        contextEnhancement.recommendations.forEach(rec => {
          recommendations.push({
            id: `clinical-${rec.id}`,
            type: 'clinical_insight',
            priority: rec.severity === 'critical' ? 'high' : rec.severity === 'major' ? 'medium' : 'low',
            title: rec.title,
            description: rec.description,
            confidence: 0.9,
            reasoning: rec.recommendedActions,
            actionable: true
          });
        });
      }

      // Drug interaction alerts
      if (contextEnhancement.drugInteractions.length > 0) {
        contextEnhancement.drugInteractions.forEach(interaction => {
          recommendations.push({
            id: `interaction-${Date.now()}-${Math.random()}`,
            type: 'clinical_insight',
            priority: interaction.severity === 'major' ? 'high' : 'medium',
            title: `Drug Interaction Alert`,
            description: interaction.description,
            confidence: 0.95,
            reasoning: [`Interaction between: ${interaction.drugs.join(', ')}`],
            actionable: true
          });
        });
      }
    }

    // Quality improvement recommendations
    const qualityIssues = analysis.qualityFactors.filter(f => f.score < 0.7);
    if (qualityIssues.length > 0) {
      recommendations.push({
        id: `quality-${Date.now()}`,
        type: 'quality_improvement',
        priority: 'low',
        title: 'Quality Enhancement Suggestions',
        description: 'Some areas could be improved for better processing accuracy',
        confidence: 0.7,
        reasoning: qualityIssues.map(issue => `${issue.factor}: ${issue.impact}`),
        actionable: true,
        qualityImprovement: 0.15
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  // Analyze input and generate recommendations
  const analyzeInput = useCallback(async (input: string) => {
    if (!input || input.length < 10) return;

    setIsAnalyzing(true);
    
    try {
      // Analyze input content
      const analysis = await performInputAnalysis(input);
      setInputAnalysis(analysis);

      // Generate smart recommendations
      const smartRecs = await generateSmartRecommendations(input, analysis, sessionId);
      setRecommendations(smartRecs);

      // Suggest best agent if analysis is confident
      if (analysis.suggestedAgents.length > 0 && analysis.suggestedAgents[0].confidence > 0.8) {
        onAgentSuggestion(analysis.suggestedAgents[0].agentType, analysis.suggestedAgents[0].confidence);
      }

    } catch (error) {
      console.error('Failed to analyze input:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId, onAgentSuggestion]);

  // Debounced input analysis
  useEffect(() => {
    if (!currentInput) return;

    const timeoutId = setTimeout(() => {
      analyzeInput(currentInput);
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [currentInput, analyzeInput]);

  // Extract medical terms from input
  const extractMedicalTerms = (input: string): string[] => {
    const medicalPatterns = [
      // Procedures
      /\b(?:TTE|CTCA|coronary angiogram|stress test|ECG|echocardiogram|catheterisation|PCI|CABG|TAVI|TAVR|mitral clip|watchman|pfo closure)\b/gi,
      // Conditions  
      /\b(?:stenosis|regurgitation|atrial fibrillation|heart failure|hypertension|diabetes|coronary artery disease|myocardial infarction|stroke)\b/gi,
      // Medications
      /\b(?:aspirin|clopidogrel|warfarin|metoprolol|amlodipine|atorvastatin|metformin|insulin)\b/gi,
      // Measurements
      /\b(?:EF|ejection fraction|TIMI|METs|mmHg|bpm|mg|mcg)\b/gi,
      // Anatomy
      /\b(?:LAD|LCX|RCA|LV|RV|mitral|aortic|tricuspid|pulmonary)\b/gi
    ];

    const terms: string[] = [];
    medicalPatterns.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        terms.push(...matches.map(m => m.toLowerCase()));
      }
    });

    return Array.from(new Set(terms)); // Remove duplicates
  };

  // Assess input complexity
  const assessComplexity = (input: string, medicalTerms: string[]): 'simple' | 'moderate' | 'complex' => {
    const wordCount = input.split(/\s+/).length;
    const termDensity = medicalTerms.length / wordCount;
    
    if (wordCount > 200 || termDensity > 0.15 || medicalTerms.length > 10) {
      return 'complex';
    } else if (wordCount > 50 || termDensity > 0.08 || medicalTerms.length > 5) {
      return 'moderate';
    } else {
      return 'simple';
    }
  };

  // Suggest most appropriate agents
  const suggestAgents = async (
    input: string, 
    medicalTerms: string[], 
    complexity: string
  ): Promise<InputAnalysis['suggestedAgents']> => {
    const suggestions: InputAnalysis['suggestedAgents'] = [];

    // Agent scoring based on input content
    const agentScores: { [key in AgentType]?: number } = {};
    const lowerInput = input.toLowerCase();

    // Investigation terms suggest investigation-summary agent
    const investigationTerms = ['TTE', 'CTCA', 'stress test', 'echocardiogram', 'angiogram'];
    if (investigationTerms.some(term => lowerInput.includes(term.toLowerCase()))) {
      agentScores['investigation-summary'] = 0.9;
    }

    // Medication terms suggest medication agent
    const medicationTerms = ['medication', 'drug', 'aspirin', 'metoprolol', 'atorvastatin'];
    if (medicationTerms.some(term => lowerInput.includes(term.toLowerCase()))) {
      agentScores['medication'] = 0.85;
    }

    // Background/history terms suggest background agent
    const backgroundTerms = ['history', 'background', 'previous', 'past medical', 'comorbid'];
    if (backgroundTerms.some(term => lowerInput.includes(term.toLowerCase()))) {
      agentScores['background'] = 0.8;
    }

    // Procedure terms suggest specific procedure agents
    if (lowerInput.includes('tavi') || lowerInput.includes('tavr')) {
      agentScores['tavi'] = 0.95;
    }
    
    if (lowerInput.includes('pci') || lowerInput.includes('angioplasty')) {
      agentScores['angiogram-pci'] = 0.9;
    }

    const workupMarkers = [
      'annulus',
      'annular',
      'sinus of valsalva',
      'left main height',
      'right coronary height',
      'dimensionless index',
      'sts',
      'euro',
      'coplanar',
      'navitor',
      'evolut',
      'sapien'
    ];
    if (workupMarkers.some(marker => lowerInput.includes(marker))) {
      agentScores['tavi-workup'] = Math.max(agentScores['tavi-workup'] ?? 0, 0.88);
    }

    if (lowerInput.includes('workup') && (lowerInput.includes('tavi') || lowerInput.includes('tavr'))) {
      agentScores['tavi-workup'] = Math.max(agentScores['tavi-workup'] ?? 0, 0.95);
    }

    // Default to quick-letter for general content
    if (Object.keys(agentScores).length === 0 || complexity === 'simple') {
      agentScores['quick-letter'] = 0.7;
    }

    // Convert scores to suggestions
    Object.entries(agentScores).forEach(([agentType, score]) => {
      suggestions.push({
        agentType: agentType as AgentType,
        confidence: score,
        reasoning: getAgentRecommendationReasoning(agentType as AgentType, medicalTerms, complexity)
      });
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  };

  // Get reasoning for agent recommendation
  const getAgentRecommendationReasoning = (
    agentType: AgentType, 
    medicalTerms: string[], 
    complexity: string
  ): string => {
    const reasons: Record<AgentType, string> = {
      'investigation-summary': `Detected investigation terms: ${medicalTerms.filter(t => 
        ['tte', 'ctca', 'stress', 'echo'].some(inv => t.includes(inv))).join(', ')}`,
      'medication': `Medication-related content identified with ${medicalTerms.filter(t => 
        ['aspirin', 'metoprolol', 'drug'].some(med => t.includes(med))).length} drug references`,
      'background': `Medical history indicators present`,
      'quick-letter': `General medical content suitable for consultation letter format`,
      'tavi': `TAVI/TAVR procedure content detected`,
      'angiogram-pci': `PCI/angiogram procedure content identified`,
      'mteer': 'Mitral TEER content identified',
      'tteer': 'Tricuspid TEER content identified',
      'pfo-closure': 'PFO closure content detected',
      'asd-closure': 'ASD closure content detected',
      'pvl-plug': 'PVL plug content detected',
      'bypass-graft': 'Bypass graft content detected',
      'right-heart-cath': 'Right heart cath content detected',
      'consultation': 'Consultation narrative detected',
      'pre-op-plan': 'Pre-procedure planning details detected',
      'ai-medical-review': 'AI medical review context detected',
      'batch-ai-review': 'Batch review context detected',
      'tavi-workup': 'TAVI workup markers detected (annulus sizing, risk scores, or device planning)',
      'imaging': 'Imaging content detected',
      'bloods': 'Blood tests content detected',
      'patient-education': 'Patient education content detected',
      'ohif-viewer': 'OHIF viewer content detected',
      'aus-medical-review': 'Australian medical review context detected',
      'enhancement': 'Enhancement context detected',
      'transcription': 'Transcription context detected',
      'generation': 'Content generation context'
    };

    return reasons[agentType] || `${complexity} content matching ${agentType} agent capabilities`;
  };

  // Estimate processing time
  const estimateProcessingTime = (
    complexity: string,
    suggestedAgents: InputAnalysis['suggestedAgents']
  ): number => {
    const baseTime = {
      simple: 2000,    // 2 seconds
      moderate: 4000,  // 4 seconds
      complex: 8000    // 8 seconds
    };

    const agentMultiplier = suggestedAgents[0]?.agentType === 'investigation-summary' ? 0.7 : 1.0;
    
    return Math.round(baseTime[complexity as keyof typeof baseTime] * agentMultiplier);
  };

  // Assess quality factors
  const assessQualityFactors = (input: string, medicalTerms: string[]): InputAnalysis['qualityFactors'] => {
    const factors: InputAnalysis['qualityFactors'] = [];

    // Medical terminology density
    const termDensity = medicalTerms.length / input.split(/\s+/).length;
    factors.push({
      factor: 'Medical terminology',
      score: Math.min(1, termDensity * 10),
      impact: termDensity > 0.1 ? 'High accuracy expected' : 'Consider adding specific medical terms'
    });

    // Input length
    const wordCount = input.split(/\s+/).length;
    factors.push({
      factor: 'Content length',
      score: wordCount > 30 && wordCount < 300 ? 1 : wordCount < 30 ? 0.5 : 0.7,
      impact: wordCount > 30 && wordCount < 300 ? 'Optimal length' : 
              wordCount < 30 ? 'Consider adding more details' : 'Consider breaking into sections'
    });

    // Structure quality
    const hasPunctuation = /[.!?]/.test(input);
    const hasCapitalization = /[A-Z]/.test(input);
    const structureScore = (hasPunctuation ? 0.5 : 0) + (hasCapitalization ? 0.5 : 0);
    
    factors.push({
      factor: 'Text structure',
      score: structureScore,
      impact: structureScore > 0.8 ? 'Well structured' : 'Consider improving punctuation and capitalization'
    });

    return factors;
  };

  // Format agent name for display
  const formatAgentName = (agentType: AgentType): string => {
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
      'pre-op-plan': 'Pre-Op Plan',
      'tavi-workup': 'TAVI Workup',
      'imaging': 'Imaging',
      'bloods': 'Bloods',
      'patient-education': 'Patient Education',
      'ohif-viewer': 'OHIF Viewer',
      'enhancement': 'Enhancement',
      'transcription': 'Transcription',
      'generation': 'Generation',
      // Backward compat key
      'aus-medical-review': 'Australian Medical Review'
    };
    
    return names[agentType] || agentType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (recommendations.length === 0 && !isAnalyzing) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Smart Recommendations</h3>
        {isAnalyzing && (
          <div className="flex items-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            Analyzing...
          </div>
        )}
      </div>

      {inputAnalysis && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium text-gray-700">Input Analysis</div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Complexity:</span> {inputAnalysis.complexity}
            </div>
            <div>
              <span className="font-medium">Medical terms:</span> {inputAnalysis.detectedMedicalTerms.length}
            </div>
            <div>
              <span className="font-medium">Est. processing:</span> {(inputAnalysis.estimatedProcessingTime / 1000).toFixed(1)}s
            </div>
            <div>
              <span className="font-medium">Suggested agent:</span> {formatAgentName(inputAnalysis.suggestedAgents[0]?.agentType || 'quick-letter')}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
              rec.priority === 'high' 
                ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                : rec.priority === 'medium'
                ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => onRecommendationSelect(rec)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rec.priority === 'high' 
                      ? 'bg-red-100 text-red-800'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'  
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(rec.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                {rec.reasoning.length > 0 && (
                  <ul className="text-xs text-gray-500 space-y-1">
                    {rec.reasoning.map((reason, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-gray-400 mr-1">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {rec.actionable && (
                <button className="ml-4 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                  Apply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartRecommendationEngine;
