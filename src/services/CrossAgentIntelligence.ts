/**
 * Phase 4: Cross-Agent Intelligence System
 * 
 * Enables Phase 3 agents to share insights, medical context, and learning
 * for enhanced clinical accuracy and comprehensive patient assessment.
 */

import type { AgentType, MedicalReport } from '@/types/medical.types';

export interface MedicalInsight {
  id: string;
  agentType: AgentType;
  category: 'diagnosis' | 'medication' | 'procedure' | 'risk_factor' | 'comorbidity' | 'contraindication' | 'recommendation';
  confidence: number;
  finding: string;
  clinicalSignificance: 'high' | 'medium' | 'low';
  timestamp: number;
  relatedFindings?: string[];
  medicalCodes?: { code: string; system: string; description: string }[];
  context?: Record<string, any>;
}

export interface PatientProfile {
  sessionId: string;
  demographics?: {
    age?: number;
    gender?: string;
    riskFactors?: string[];
  };
  medicalHistory: MedicalInsight[];
  currentMedications: MedicalInsight[];
  allergies: MedicalInsight[];
  procedures: MedicalInsight[];
  investigations: MedicalInsight[];
  activeProblems: MedicalInsight[];
  riskProfile: {
    cardiovascular: number;
    bleeding: number;
    renal: number;
    hepatic: number;
    overall: number;
  };
  lastUpdated: number;
}

export interface CrossAgentRecommendation {
  id: string;
  type: 'clinical_alert' | 'drug_interaction' | 'contraindication' | 'monitoring_required' | 'optimization_opportunity';
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  title: string;
  description: string;
  sourceAgents: AgentType[];
  supportingEvidence: MedicalInsight[];
  recommendedActions: string[];
  timestamp: number;
}

export interface MedicalContextEnhancement {
  sharedInsights: MedicalInsight[];
  riskAssessment: {
    category: string;
    level: 'high' | 'moderate' | 'low';
    factors: string[];
  }[];
  drugInteractions: {
    drugs: string[];
    severity: 'major' | 'moderate' | 'minor';
    description: string;
  }[];
  clinicalCorrelations: {
    finding: string;
    relatedConditions: string[];
    significance: string;
  }[];
  recommendations: CrossAgentRecommendation[];
}

export interface CrossAgentMetrics {
  activeProfiles: number;
  totalInsights: number;
  totalRecommendations: number;
  trackedPatterns: number;
  lastInsightTimestamp: number | null;
  lastAnalysisTimestamp: number | null;
  topCategories: { category: string; count: number }[];
  insightSummary: string;
  recentRecommendations: CrossAgentRecommendation[];
}

type CorrelationDescriptor = {
  relationship: string;
  significance: number;
  recommendation?: string;
};

/**
 * Cross-Agent Intelligence coordinator for Phase 3 medical agents
 */
export class CrossAgentIntelligence {
  private static instance: CrossAgentIntelligence;
  private patientProfiles: Map<string, PatientProfile> = new Map();
  private globalInsights: Map<string, MedicalInsight[]> = new Map(); // Pattern-based insights
  private correlationRules: Map<string, (insights: MedicalInsight[]) => CrossAgentRecommendation[]> = new Map();
  private globalCategoryCounts: Map<MedicalInsight['category'], number> = new Map();
  private correlationLookup: Map<string, CorrelationDescriptor> = new Map();
  private relatedConditionMap: Map<string, string[]> = new Map();
  private metrics = {
    totalInsights: 0,
    totalRecommendations: 0,
    trackedPatterns: 0,
    lastInsightTimestamp: 0,
    lastAnalysisTimestamp: 0,
    topCategories: [] as { category: string; count: number }[],
    insightSummary: 'Collecting intelligence',
    recentRecommendations: [] as CrossAgentRecommendation[]
  };

  constructor() {
    this.initializeCorrelationRules();
    this.initializeCorrelationKnowledge();
    this.startPeriodicAnalysis();
  }

  static getInstance(): CrossAgentIntelligence {
    if (!CrossAgentIntelligence.instance) {
      CrossAgentIntelligence.instance = new CrossAgentIntelligence();
    }
    return CrossAgentIntelligence.instance;
  }

  /**
   * Register insights from agent processing
   */
  registerInsights(
    sessionId: string,
    agentType: AgentType,
    report: MedicalReport,
    extractedFindings?: any[]
  ): MedicalInsight[] {
    const insights = this.extractInsightsFromReport(agentType, report, extractedFindings);
    
    // Update patient profile
    this.updatePatientProfile(sessionId, agentType, insights);
    
    // Update global pattern insights
    this.updateGlobalInsights(insights);

    this.metrics.totalInsights += insights.length;
    this.metrics.lastInsightTimestamp = Date.now();
    this.metrics.trackedPatterns = this.globalInsights.size;
    this.updateMetricsSnapshot();
    
    console.log(`🧠 Registered ${insights.length} insights from ${agentType} agent`);
    return insights;
  }

  /**
   * Get enhanced medical context for agent processing
   */
  getEnhancedContext(sessionId: string, agentType: AgentType): MedicalContextEnhancement {
    const profile = this.patientProfiles.get(sessionId);
    
    if (!profile) {
      return this.getEmptyContextEnhancement();
    }

    const enhancement: MedicalContextEnhancement = {
      sharedInsights: this.getRelevantInsights(profile, agentType),
      riskAssessment: this.assessRisks(profile),
      drugInteractions: this.identifyDrugInteractions(profile),
      clinicalCorrelations: this.findClinicalCorrelations(profile),
      recommendations: this.generateRecommendations(profile, agentType)
    };

    console.log(`🔗 Generated enhanced context for ${agentType} with ${enhancement.sharedInsights.length} shared insights`);
    return enhancement;
  }

  /**
   * Analyze patient profile for comprehensive insights
   */
  analyzePatientProfile(sessionId: string): PatientProfile | null {
    const profile = this.patientProfiles.get(sessionId);
    if (!profile) return null;

    // Update risk profile based on current insights
    profile.riskProfile = this.calculateRiskProfile(profile);
    profile.lastUpdated = Date.now();

    // Generate cross-agent recommendations
    const _recommendations = this.generateComprehensiveRecommendations(profile);
    if (_recommendations.length > 0) {
      this.metrics.recentRecommendations = _recommendations.slice(0, 5);
      this.metrics.totalRecommendations += _recommendations.length;
    }
    this.metrics.lastAnalysisTimestamp = Date.now();
    this.updateMetricsSnapshot();
    
    console.log(`📋 Analyzed patient profile: ${profile.medicalHistory.length} conditions, ${profile.currentMedications.length} medications`);
    
    return profile;
  }

  getMetrics(): CrossAgentMetrics {
    return {
      activeProfiles: this.patientProfiles.size,
      totalInsights: this.metrics.totalInsights,
      totalRecommendations: this.metrics.totalRecommendations,
      trackedPatterns: this.metrics.trackedPatterns,
      lastInsightTimestamp: this.metrics.lastInsightTimestamp || null,
      lastAnalysisTimestamp: this.metrics.lastAnalysisTimestamp || null,
      topCategories: [...this.metrics.topCategories],
      insightSummary: this.metrics.insightSummary,
      recentRecommendations: [...this.metrics.recentRecommendations]
    };
  }

  /**
   * Get correlation insights between different findings
   */
  getCorrelationInsights(findings: string[]): {
    correlations: { finding1: string; finding2: string; relationship: string; significance: number }[];
    recommendations: string[];
  } {
    const correlations: any[] = [];
    const recommendations: string[] = [];

    // Check for known clinical correlations
    for (let i = 0; i < findings.length; i++) {
      for (let j = i + 1; j < findings.length; j++) {
        const correlation = this.findCorrelation(findings[i], findings[j]);
        if (correlation) {
          correlations.push(correlation);
          
          if (correlation.significance > 0.7) {
            recommendations.push(correlation.recommendation || `Consider relationship between ${findings[i]} and ${findings[j]}`);
          }
        }
      }
    }

    return { correlations, recommendations };
  }

  /**
   * Extract insights from agent report
   */
  private extractInsightsFromReport(
    agentType: AgentType,
    report: MedicalReport,
    extractedFindings?: any[]
  ): MedicalInsight[] {
    const insights: MedicalInsight[] = [];

    // Extract from Phase 3 findings if available
    if (extractedFindings && extractedFindings.length > 0) {
      extractedFindings.forEach(finding => {
        insights.push({
          id: `${agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          agentType,
          category: this.mapCategoryFromFinding(finding.category),
          confidence: finding.confidence || 0.7,
          finding: finding.finding,
          clinicalSignificance: this.assessClinicalSignificance(finding.finding, finding.severity),
          timestamp: Date.now(),
          relatedFindings: finding.context ? [finding.context] : undefined,
          medicalCodes: finding.codes || report.metadata?.medicalCodes,
          context: { originalCategory: finding.category, severity: finding.severity }
        });
      });
    }

    // Extract from report content using pattern matching
    const contentInsights = this.extractInsightsFromContent(agentType, report.content);
    insights.push(...contentInsights);

    return insights;
  }

  /**
   * Update patient profile with new insights
   */
  private updatePatientProfile(sessionId: string, agentType: AgentType, insights: MedicalInsight[]): void {
    let profile = this.patientProfiles.get(sessionId);
    
    if (!profile) {
      profile = {
        sessionId,
        medicalHistory: [],
        currentMedications: [],
        allergies: [],
        procedures: [],
        investigations: [],
        activeProblems: [],
        riskProfile: {
          cardiovascular: 0,
          bleeding: 0,
          renal: 0,
          hepatic: 0,
          overall: 0
        },
        lastUpdated: Date.now()
      };
      this.patientProfiles.set(sessionId, profile);
    }

    // Categorize insights into appropriate profile sections
    insights.forEach(insight => {
      switch (insight.category) {
        case 'diagnosis':
          profile!.medicalHistory.push(insight);
          break;
        case 'medication':
          profile!.currentMedications.push(insight);
          break;
        case 'procedure':
          profile!.procedures.push(insight);
          break;
        case 'risk_factor':
          profile!.activeProblems.push(insight);
          break;
        default:
          if (agentType === 'investigation-summary') {
            profile!.investigations.push(insight);
          } else {
            profile!.activeProblems.push(insight);
          }
      }
    });

    profile.lastUpdated = Date.now();
  }

  /**
   * Get relevant insights for specific agent type
   */
  private getRelevantInsights(profile: PatientProfile, agentType: AgentType): MedicalInsight[] {
    const allInsights = [
      ...profile.medicalHistory,
      ...profile.currentMedications,
      ...profile.procedures,
      ...profile.investigations,
      ...profile.activeProblems
    ];

    // Filter insights relevant to the requesting agent
    return allInsights.filter(insight => {
      switch (agentType) {
        case 'medication':
          return insight.category === 'medication' || 
                 insight.category === 'diagnosis' || 
                 insight.category === 'contraindication';
                 
        case 'background':
          return insight.category === 'diagnosis' || 
                 insight.category === 'risk_factor' || 
                 insight.category === 'comorbidity';
                 
        case 'quick-letter':
          return insight.clinicalSignificance === 'high' || 
                 insight.category === 'diagnosis' || 
                 insight.category === 'procedure';
                 
        case 'investigation-summary':
          return insight.category === 'diagnosis' || 
                 insight.category === 'procedure' || 
                 insight.category === 'risk_factor';
                 
        default:
          return insight.clinicalSignificance === 'high';
      }
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 10); // Top 10 most relevant
  }

  /**
   * Assess risks based on patient profile
   */
  private assessRisks(profile: PatientProfile): { category: string; level: 'high' | 'moderate' | 'low'; factors: string[] }[] {
    const risks: { category: string; level: 'high' | 'moderate' | 'low'; factors: string[] }[] = [];

    // Cardiovascular risk assessment
    const cardiacFactors = profile.medicalHistory.filter(h => 
      h.finding.toLowerCase().includes('cardiac') ||
      h.finding.toLowerCase().includes('coronary') ||
      h.finding.toLowerCase().includes('heart') ||
      h.finding.toLowerCase().includes('hypertension') ||
      h.finding.toLowerCase().includes('diabetes')
    ).map(h => h.finding);

    if (cardiacFactors.length > 0) {
      const level = cardiacFactors.length >= 3 ? 'high' : cardiacFactors.length >= 2 ? 'moderate' : 'low';
      risks.push({
        category: 'Cardiovascular',
        level,
        factors: cardiacFactors
      });
    }

    // Bleeding risk assessment
    const bleedingFactors = profile.currentMedications.filter(m =>
      m.finding.toLowerCase().includes('warfarin') ||
      m.finding.toLowerCase().includes('aspirin') ||
      m.finding.toLowerCase().includes('clopidogrel') ||
      m.finding.toLowerCase().includes('anticoagulant')
    ).map(m => m.finding);

    if (bleedingFactors.length > 0) {
      risks.push({
        category: 'Bleeding',
        level: bleedingFactors.length >= 2 ? 'moderate' : 'low',
        factors: bleedingFactors
      });
    }

    return risks;
  }

  /**
   * Identify drug interactions
   */
  private identifyDrugInteractions(profile: PatientProfile): { drugs: string[]; severity: 'major' | 'moderate' | 'minor'; description: string }[] {
    const interactions: { drugs: string[]; severity: 'major' | 'moderate' | 'minor'; description: string }[] = [];
    const medications = profile.currentMedications.map(m => m.finding.toLowerCase());

    // Common interaction patterns
    const interactionRules = [
      {
        drugs: ['warfarin', 'aspirin'],
        severity: 'major' as const,
        description: 'Increased bleeding risk with concurrent warfarin and aspirin'
      },
      {
        drugs: ['ace inhibitor', 'spironolactone'],
        severity: 'moderate' as const,
        description: 'Risk of hyperkalaemia with ACE inhibitor and spironolactone'
      },
      {
        drugs: ['digoxin', 'furosemide'],
        severity: 'moderate' as const,
        description: 'Diuretic may increase digoxin toxicity risk'
      }
    ];

    interactionRules.forEach(rule => {
      const foundDrugs = rule.drugs.filter(drug => 
        medications.some(med => med.includes(drug.toLowerCase()))
      );
      
      if (foundDrugs.length >= 2) {
        interactions.push({
          drugs: foundDrugs,
          severity: rule.severity,
          description: rule.description
        });
      }
    });

    return interactions;
  }

  /**
   * Find clinical correlations
   */
  private findClinicalCorrelations(profile: PatientProfile): { finding: string; relatedConditions: string[]; significance: string }[] {
    const correlations: { finding: string; relatedConditions: string[]; significance: string }[] = [];
    const conditions = profile.medicalHistory.map(h => h.finding);

    conditions.forEach(condition => {
      const related = this.getRelatedConditions(condition);
      if (related.length > 0) {
        correlations.push({
          finding: condition,
          relatedConditions: related.filter(r => conditions.includes(r)),
          significance: this.getCorrelationSignificance(condition, related)
        });
      }
    });

    return correlations;
  }

  /**
   * Generate recommendations based on profile
   */
  private generateRecommendations(profile: PatientProfile, agentType: AgentType): CrossAgentRecommendation[] {
    const recommendations: CrossAgentRecommendation[] = [];

    // Apply correlation rules
    this.correlationRules.forEach((ruleFunc, _ruleName) => {
      const allInsights = [
        ...profile.medicalHistory,
        ...profile.currentMedications,
        ...profile.procedures,
        ...profile.activeProblems
      ];
      
      const ruleRecommendations = ruleFunc(allInsights);
      recommendations.push(...ruleRecommendations);
    });

    const filtered = recommendations.filter(rec => 
      rec.sourceAgents.length === 0 || rec.sourceAgents.includes(agentType)
    );

    if (filtered.length > 0) {
      this.metrics.recentRecommendations = filtered.slice(0, 5);
    }

    return filtered;
  }

  /**
   * Initialize correlation rules
   */
  private initializeCorrelationRules(): void {
    // Rule: Diabetes + Cardiac medication monitoring
    this.correlationRules.set('diabetes-cardiac-monitoring', (insights: MedicalInsight[]) => {
      const hasDiabetes = insights.some(i => i.finding.toLowerCase().includes('diabetes'));
      const hasCardiacMeds = insights.some(i => 
        i.category === 'medication' && (
          i.finding.toLowerCase().includes('ace inhibitor') ||
          i.finding.toLowerCase().includes('beta blocker') ||
          i.finding.toLowerCase().includes('statin')
        )
      );

      if (hasDiabetes && hasCardiacMeds) {
        return [{
          id: `diabetes-cardiac-${Date.now()}`,
          type: 'monitoring_required',
          severity: 'moderate',
          title: 'Diabetes + Cardiac Medication Monitoring',
          description: 'Patient with diabetes on cardiac medications requires regular monitoring',
          sourceAgents: ['medication', 'background'],
          supportingEvidence: insights.filter(i => 
            i.finding.toLowerCase().includes('diabetes') || 
            (i.category === 'medication' && i.finding.toLowerCase().includes('cardiac'))
          ),
          recommendedActions: [
            'Monitor HbA1c every 3-6 months',
            'Regular lipid profile monitoring',
            'Blood pressure monitoring',
            'Renal function assessment'
          ],
          timestamp: Date.now()
        }];
      }
      return [];
    });

    // Rule: Anticoagulation + Bleeding risk
    this.correlationRules.set('anticoagulation-bleeding', (insights: MedicalInsight[]) => {
      const anticoagulants = insights.filter(i => 
        i.category === 'medication' && (
          i.finding.toLowerCase().includes('warfarin') ||
          i.finding.toLowerCase().includes('dabigatran') ||
          i.finding.toLowerCase().includes('rivaroxaban') ||
          i.finding.toLowerCase().includes('apixaban')
        )
      );

      if (anticoagulants.length > 0) {
        return [{
          id: `anticoagulation-bleeding-${Date.now()}`,
          type: 'clinical_alert',
          severity: 'major',
          title: 'Anticoagulation Bleeding Risk Assessment',
          description: 'Patient on anticoagulation requires bleeding risk assessment',
          sourceAgents: ['medication'],
          supportingEvidence: anticoagulants,
          recommendedActions: [
            'Calculate HAS-BLED score',
            'Review for bleeding contraindications',
            'Regular INR monitoring if on warfarin',
            'Patient education on bleeding precautions'
          ],
          timestamp: Date.now()
        }];
      }
      return [];
    });

    // Rule: Heart failure without guideline-directed therapy
    this.correlationRules.set('heart-failure-therapy-gap', (insights: MedicalInsight[]) => {
      const heartFailure = insights.filter(i => i.finding.toLowerCase().includes('heart failure'));
      if (heartFailure.length === 0) {
        return [];
      }

      const medications = insights.filter(i => i.category === 'medication');
      const medsText = medications.map(m => m.finding.toLowerCase());
      const hasBetaBlocker = medsText.some(text => /(beta\s*blocker|bisoprolol|metoprolol|carvedilol|nebivolol)/i.test(text));
      const hasAce = medsText.some(text => /(ace\s*inhibitor|perindopril|ramipril|enalapril|pril$)/i.test(text));
      const hasArni = medsText.some(text => /(sacubitril|valsartan|entresto)/i.test(text));

      if (hasBetaBlocker || hasAce || hasArni) {
        return [];
      }

      return [{
        id: `hf-therapy-gap-${Date.now()}`,
        type: 'optimization_opportunity',
        severity: 'major',
        title: 'Heart failure therapy gap',
        description: 'Heart failure identified without beta-blocker or ACE/ARNI coverage.',
        sourceAgents: ['background', 'medication'],
        supportingEvidence: heartFailure,
        recommendedActions: [
          'Review suitability for beta-blocker and ACE inhibitor / ARNI',
          'Consider adding MRA / SGLT2i based on phenotype',
          'Monitor vitals and renal function after optimisation'
        ],
        timestamp: Date.now()
      }];
    });

    // Rule: Atrial fibrillation without anticoagulation
    this.correlationRules.set('atrial-fibrillation-anticoagulation', (insights: MedicalInsight[]) => {
      const atrialFibrillation = insights.filter(i => i.finding.toLowerCase().includes('atrial fibrillation'));
      if (atrialFibrillation.length === 0) {
        return [];
      }

      const hasAnticoagulant = insights.some(i =>
        i.category === 'medication' &&
        /(warfarin|anticoagulant|apixaban|rivaroxaban|dabigatran|edoxaban)/i.test(i.finding.toLowerCase())
      );

      if (hasAnticoagulant) {
        return [];
      }

      return [{
        id: `af-anticoagulation-${Date.now()}`,
        type: 'clinical_alert',
        severity: 'critical',
        title: 'Atrial fibrillation without anticoagulation',
        description: 'Assess stroke prevention strategy for atrial fibrillation.',
        sourceAgents: ['background', 'medication'],
        supportingEvidence: atrialFibrillation,
        recommendedActions: [
          'Calculate CHA₂DS₂-VASc score',
          'Discuss anticoagulation options and contraindications',
          'Review bleeding history and renal function'
        ],
        timestamp: Date.now()
      }];
    });

    // Rule: Diabetes without statin coverage
    this.correlationRules.set('diabetes-statin-gap', (insights: MedicalInsight[]) => {
      const diabetes = insights.filter(i => i.finding.toLowerCase().includes('diabetes'));
      if (diabetes.length === 0) {
        return [];
      }

      const hasStatin = insights.some(i =>
        i.category === 'medication' && /(statin|atorvastatin|rosuvastatin|simvastatin|pravastatin)/i.test(i.finding.toLowerCase())
      );

      if (hasStatin) {
        return [];
      }

      return [{
        id: `diabetes-statin-gap-${Date.now()}`,
        type: 'optimization_opportunity',
        severity: 'moderate',
        title: 'Diabetes without statin therapy',
        description: 'Consider statin therapy for diabetes patients without contraindications.',
        sourceAgents: ['background', 'medication'],
        supportingEvidence: diabetes,
        recommendedActions: [
          'Review lipid profile and cardiovascular risk',
          'Discuss statin therapy benefits and tolerance',
          'Plan follow-up lipid monitoring'
        ],
        timestamp: Date.now()
      }];
    });
  }

  private initializeCorrelationKnowledge(): void {
    const addCorrelation = (findingA: string, findingB: string, descriptor: CorrelationDescriptor) => {
      const key = CrossAgentIntelligence.makeCorrelationKey(findingA, findingB);
      this.correlationLookup.set(key, descriptor);
    };

    addCorrelation('atrial fibrillation', 'stroke', {
      relationship: 'Atrial fibrillation increases stroke risk without anticoagulation.',
      significance: 0.88,
      recommendation: 'Ensure CHA₂DS₂-VASc assessment and anticoagulation strategy.'
    });

    addCorrelation('diabetes', 'chronic kidney disease', {
      relationship: 'Diabetes accelerates chronic kidney disease progression.',
      significance: 0.82,
      recommendation: 'Monitor renal function and optimise reno-protective therapy.'
    });

    addCorrelation('diabetes', 'hypertension', {
      relationship: 'Diabetes and hypertension compound cardiovascular risk.',
      significance: 0.78,
      recommendation: 'Tight blood pressure control is recommended (<130/80) in diabetes with hypertension.'
    });

    addCorrelation('heart failure', 'renal impairment', {
      relationship: 'Heart failure with renal impairment suggests possible cardiorenal syndrome.',
      significance: 0.76,
      recommendation: 'Balance diuretic therapy with renal monitoring and adjust dosages accordingly.'
    });

    addCorrelation('copd', 'smoking', {
      relationship: 'Active smoking worsens COPD prognosis and exacerbation frequency.',
      significance: 0.74,
      recommendation: 'Provide structured smoking cessation and consider pulmonary rehabilitation.'
    });

    addCorrelation('coronary artery disease', 'diabetes', {
      relationship: 'Diabetes with CAD requires intensive secondary prevention.',
      significance: 0.8,
      recommendation: 'Ensure high-intensity statin, ACE inhibitor and lifestyle optimisation.'
    });

    const setRelated = (condition: string, related: string[]) => {
      this.relatedConditionMap.set(condition.toLowerCase(), related);
    };

    setRelated('atrial fibrillation', ['stroke', 'heart failure', 'thyroid disease']);
    setRelated('diabetes', ['chronic kidney disease', 'hypertension', 'dyslipidaemia']);
    setRelated('heart failure', ['renal impairment', 'atrial fibrillation', 'anaemia']);
    setRelated('copd', ['smoking', 'pulmonary hypertension', 'sleep apnoea']);
    setRelated('coronary artery disease', ['diabetes', 'hypertension', 'dyslipidaemia']);
  }

  /**
   * Helper functions for insight processing
   */
  private mapCategoryFromFinding(category: string): MedicalInsight['category'] {
    const mapping: Record<string, MedicalInsight['category']> = {
      'medical_history': 'diagnosis',
      'medications': 'medication',
      'procedures': 'procedure',
      'risk_factors': 'risk_factor',
      'comorbidity': 'comorbidity',
      'drug_interactions': 'contraindication',
      'recommendations': 'recommendation'
    };
    
    return mapping[category] || 'diagnosis';
  }

  private assessClinicalSignificance(finding: string, severity?: string): 'high' | 'medium' | 'low' {
    if (severity === 'critical' || severity === 'severe') return 'high';
    if (severity === 'moderate') return 'medium';
    
    // High significance conditions
    const highSignificance = [
      'myocardial infarction', 'stroke', 'heart failure', 'atrial fibrillation',
      'diabetes', 'kidney disease', 'cancer', 'bleeding', 'anticoagulant'
    ];
    
    if (highSignificance.some(term => finding.toLowerCase().includes(term))) {
      return 'high';
    }
    
    return 'medium';
  }

  private extractInsightsFromContent(agentType: AgentType, content: string): MedicalInsight[] {
    const insights: MedicalInsight[] = [];
    
    // Pattern-based extraction for different agent types
    const patterns = {
      medication: [
        /(\w+)\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|units)\s+(?:daily|BD|TDS|QID|PRN)/gi,
        /(?:aspirin|warfarin|clopidogrel|heparin)/gi
      ],
      diagnosis: [
        /(?:hypertension|diabetes|atrial fibrillation|heart failure|coronary artery disease|stroke)/gi,
        /(?:stenosis|regurgitation|insufficiency)/gi
      ]
    };

    // Extract medication insights
    if (patterns.medication) {
      patterns.medication.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            insights.push({
              id: `pattern-${agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              agentType,
              category: 'medication',
              confidence: 0.8,
              finding: match,
              clinicalSignificance: 'medium',
              timestamp: Date.now()
            });
          });
        }
      });
    }

    return insights;
  }

  private calculateRiskProfile(profile: PatientProfile): PatientProfile['riskProfile'] {
    const calculateRisk = (category: string): number => {
      const relevantInsights = [
        ...profile.medicalHistory,
        ...profile.currentMedications,
        ...profile.activeProblems
      ].filter(insight => 
        insight.finding.toLowerCase().includes(category.toLowerCase()) ||
        insight.context?.category === category
      );

      return Math.min(1, relevantInsights.length * 0.2 + 
        relevantInsights.reduce((sum, i) => sum + i.confidence, 0) / relevantInsights.length * 0.5);
    };

    const cardiovascular = calculateRisk('cardiac');
    const bleeding = calculateRisk('bleeding');
    const renal = calculateRisk('renal');
    const hepatic = calculateRisk('hepatic');

    return {
      cardiovascular,
      bleeding,
      renal,
      hepatic,
      overall: (cardiovascular + bleeding + renal + hepatic) / 4
    };
  }

  private generateComprehensiveRecommendations(profile: PatientProfile): CrossAgentRecommendation[] {
    const recommendations: CrossAgentRecommendation[] = [];
    const insights = [
      ...profile.medicalHistory,
      ...profile.currentMedications,
      ...profile.procedures,
      ...profile.activeProblems
    ];

    // Include rule-based recommendations
    recommendations.push(...this.generateRecommendations(profile, 'quick-letter'));

    const medicationTexts = profile.currentMedications.map(m => m.finding.toLowerCase());
    const historyTexts = profile.medicalHistory.map(h => h.finding.toLowerCase());
    const risk = profile.riskProfile;
    const timestamp = Date.now();

    const hasMedication = (patterns: RegExp[]) =>
      medicationTexts.some(text => patterns.some(pattern => pattern.test(text)));

    const findInsights = (predicate: (insight: MedicalInsight) => boolean) =>
      insights.filter(predicate);

    // Heart failure without guideline-directed therapy
    if (historyTexts.some(text => text.includes('heart failure'))) {
      const hasBetaBlocker = hasMedication([/(beta\s*blocker|bisoprolol|metoprolol|carvedilol|nebivolol)/i]);
      const hasAce = hasMedication([/(ace\s*inhibitor|pril$|perindopril|ramipril|enalapril)/i]);
      const hasArni = hasMedication([/(sacubitril|valsartan|entresto)/i]);

      if (!hasBetaBlocker && !hasAce && !hasArni) {
        const evidence = findInsights(insight => insight.finding.toLowerCase().includes('heart failure'));
        recommendations.push({
          id: this.createRecommendationId('hf-therapy'),
          type: 'optimization_opportunity',
          severity: 'major',
          title: 'Heart failure therapy optimisation',
          description: 'Heart failure identified without beta-blocker or ACE/ARNI coverage. Review guideline-directed medical therapy.',
          sourceAgents: ['background', 'medication'],
          supportingEvidence: evidence,
          recommendedActions: [
            'Review suitability for beta-blocker and ACE inhibitor / ARNI',
            'Assess recent echocardiography and LVEF',
            'Monitor blood pressure and renal function after therapy changes'
          ],
          timestamp
        });
      }
    }

    // Atrial fibrillation without anticoagulation
    if (historyTexts.some(text => text.includes('atrial fibrillation'))) {
      const hasAnticoagulant = hasMedication([
        /(warfarin|apixaban|rivaroxaban|dabigatran|edoxaban|anticoagulant)/i
      ]);
      if (!hasAnticoagulant) {
        const evidence = findInsights(insight => insight.finding.toLowerCase().includes('atrial fibrillation'));
        recommendations.push({
          id: this.createRecommendationId('af-anticoagulation'),
          type: 'clinical_alert',
          severity: 'critical',
          title: 'Atrial fibrillation stroke prevention',
          description: 'Atrial fibrillation noted without anticoagulation therapy. Assess CHA₂DS₂-VASc score and anticoagulation needs.',
          sourceAgents: ['background', 'medication'],
          supportingEvidence: evidence,
          recommendedActions: [
            'Calculate CHA₂DS₂-VASc and HAS-BLED scores',
            'Discuss anticoagulation options with patient',
            'Review bleeding history and renal function before initiation'
          ],
          timestamp
        });
      }
    }

    // Diabetes risk optimisation
    if (historyTexts.some(text => text.includes('diabetes'))) {
      const hasStatin = hasMedication([/(statin|atorvastatin|rosuvastatin|pravastatin|simvastatin)/i]);
      if (!hasStatin && risk.cardiovascular >= 0.5) {
        const evidence = findInsights(insight => insight.finding.toLowerCase().includes('diabetes'));
        recommendations.push({
          id: this.createRecommendationId('diabetes-lipid'),
          type: 'optimization_opportunity',
          severity: 'moderate',
          title: 'Diabetes cardiovascular risk optimisation',
          description: 'Diabetes identified without statin therapy despite elevated cardiovascular risk.',
          sourceAgents: ['background', 'medication'],
          supportingEvidence: evidence,
          recommendedActions: [
            'Review lipid profile and LDL-C goal',
            'Consider initiating or uptitrating statin therapy',
            'Reinforce lifestyle measures for cardiometabolic risk'
          ],
          timestamp
        });
      }

      const renalRisk = risk.renal >= 0.5 || historyTexts.some(text => text.includes('kidney'));
      if (renalRisk) {
        const evidence = findInsights(insight =>
          insight.finding.toLowerCase().includes('diabetes') || insight.finding.toLowerCase().includes('kidney')
        );
        recommendations.push({
          id: this.createRecommendationId('diabetes-renal-monitoring'),
          type: 'monitoring_required',
          severity: 'major',
          title: 'Diabetes with renal involvement monitoring',
          description: 'Diabetes with renal risk factors detected. Ensure renal monitoring and nephroprotective therapy.',
          sourceAgents: ['background'],
          supportingEvidence: evidence,
          recommendedActions: [
            'Arrange annual eGFR and urine ACR testing',
            'Review ACE inhibitor / ARB coverage for renal protection',
            'Assess blood pressure control and glycaemic targets'
          ],
          timestamp
        });
      }
    }

    // Anticoagulation with elevated bleeding risk
    if (risk.bleeding >= 0.6) {
      const anticoagulantEvidence = findInsights(insight =>
        insight.category === 'medication' && /(warfarin|apixaban|rivaroxaban|dabigatran|anticoagulant)/i.test(insight.finding.toLowerCase())
      );

      if (anticoagulantEvidence.length > 0) {
        recommendations.push({
          id: this.createRecommendationId('bleeding-risk'),
          type: 'clinical_alert',
          severity: 'major',
          title: 'Bleeding risk mitigation',
          description: 'Elevated bleeding risk detected in patient receiving anticoagulation.',
          sourceAgents: ['medication'],
          supportingEvidence: anticoagulantEvidence,
          recommendedActions: [
            'Review HAS-BLED score and reversible risk factors',
            'Check haemoglobin and renal function',
            'Provide bleeding precautions and review concomitant antiplatelets'
          ],
          timestamp
        });
      }
    }

    // High cardiovascular risk overall
    if (risk.cardiovascular >= 0.7) {
      const cardiovascularEvidence = findInsights(insight =>
        /(coronary|ischemic|ischaemic|mi|myocardial infarction|stroke|heart)/i.test(insight.finding.toLowerCase())
      );

      recommendations.push({
        id: this.createRecommendationId('cardio-risk'),
        type: 'monitoring_required',
        severity: 'moderate',
        title: 'Cardiovascular risk review',
        description: 'High cardiovascular risk profile identified. Ensure risk factor control plan is current.',
        sourceAgents: ['background', 'medication'],
        supportingEvidence: cardiovascularEvidence.slice(0, 5),
        recommendedActions: [
          'Confirm blood pressure, lipid and glycaemic targets are met',
          'Schedule lifestyle counselling or cardiac rehabilitation review',
          'Ensure secondary prevention therapies are optimised'
        ],
        timestamp
      });
    }

    return this.deduplicateRecommendations(recommendations);
  }

  private deduplicateRecommendations(
    recommendations: CrossAgentRecommendation[]
  ): CrossAgentRecommendation[] {
    const byTitle = new Map<string, CrossAgentRecommendation>();

    recommendations.forEach(recommendation => {
      const key = recommendation.title.toLowerCase();
      const existing = byTitle.get(key);

      if (!existing) {
        byTitle.set(key, recommendation);
        return;
      }

      const severityRank: Record<CrossAgentRecommendation['severity'], number> = {
        critical: 3,
        major: 2,
        moderate: 1,
        minor: 0
      };

      if (severityRank[recommendation.severity] > severityRank[existing.severity]) {
        byTitle.set(key, recommendation);
      }
    });

    return Array.from(byTitle.values());
  }

  private createRecommendationId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private findCorrelation(findingA: string, findingB: string): any {
    const normalizedA = findingA.toLowerCase();
    const normalizedB = findingB.toLowerCase();
    const key = CrossAgentIntelligence.makeCorrelationKey(normalizedA, normalizedB);

    const descriptor = this.correlationLookup.get(key);
    if (descriptor) {
      return {
        finding1: findingA,
        finding2: findingB,
        relationship: descriptor.relationship,
        significance: descriptor.significance,
        recommendation: descriptor.recommendation
      };
    }

    // Heuristic correlations for unlisted combinations
    const pairs: Array<{
      match: (a: string, b: string) => boolean;
      relationship: string;
      recommendation?: string;
      significance: number;
    }> = [
      {
        match: (a, b) => a.includes('diabetes') && (b.includes('renal') || b.includes('kidney')),
        relationship: 'Diabetes accelerates renal decline and warrants tight renal monitoring.',
        recommendation: 'Check eGFR and urine ACR at least annually and optimise ACE/ARB therapy.',
        significance: 0.78
      },
      {
        match: (a, b) => a.includes('heart failure') && b.includes('renal'),
        relationship: 'Cardiorenal syndrome risk with concurrent heart failure and renal impairment.',
        recommendation: 'Balance diuresis with renal function monitoring and review medication dosing.',
        significance: 0.72
      },
      {
        match: (a, b) => a.includes('copd') && b.includes('smok'),
        relationship: 'Active smoking worsens COPD outcomes and accelerates decline.',
        recommendation: 'Provide smoking cessation support and consider pulmonary rehab referral.',
        significance: 0.7
      }
    ];

    const heuristic = pairs.find(pair => pair.match(normalizedA, normalizedB) || pair.match(normalizedB, normalizedA));
    if (heuristic) {
      return {
        finding1: findingA,
        finding2: findingB,
        relationship: heuristic.relationship,
        significance: heuristic.significance,
        recommendation: heuristic.recommendation
      };
    }

    return null;
  }

  private getRelatedConditions(condition: string): string[] {
    const normalized = condition.toLowerCase();
    const direct = this.relatedConditionMap.get(normalized);
    if (direct) {
      return direct;
    }

    const related = new Set<string>();

    if (normalized.includes('diabetes')) {
      ['chronic kidney disease', 'hypertension', 'dyslipidaemia', 'neuropathy'].forEach(item => related.add(item));
    }

    if (normalized.includes('atrial fibrillation')) {
      ['stroke', 'heart failure', 'thyroid disease'].forEach(item => related.add(item));
    }

    if (normalized.includes('chronic kidney') || normalized.includes('renal')) {
      ['anemia', 'hypertension', 'mineral bone disease'].forEach(item => related.add(item));
    }

    if (normalized.includes('copd')) {
      ['smoking', 'pulmonary hypertension', 'sleep apnoea'].forEach(item => related.add(item));
    }

    return Array.from(related);
  }

  private getCorrelationSignificance(condition: string, related: string[]): string {
    return related.length > 2 ? 'high' : related.length > 0 ? 'moderate' : 'low';
  }

  private getEmptyContextEnhancement(): MedicalContextEnhancement {
    return {
      sharedInsights: [],
      riskAssessment: [],
      drugInteractions: [],
      clinicalCorrelations: [],
      recommendations: []
    };
  }

  private updateGlobalInsights(insights: MedicalInsight[]): void {
    // Update global pattern insights for machine learning
    insights.forEach(insight => {
      const key = insight.category + '_' + insight.finding.toLowerCase().slice(0, 20);
      const existing = this.globalInsights.get(key) || [];
      existing.push(insight);
      this.globalInsights.set(key, existing.slice(-100)); // Keep last 100

      const current = this.globalCategoryCounts.get(insight.category) || 0;
      this.globalCategoryCounts.set(insight.category, current + 1);
    });

    this.updateMetricsSnapshot();
  }

  private startPeriodicAnalysis(): void {
    // Periodic analysis of patterns and updates
    setInterval(() => {
      this.analyzeGlobalPatterns();
    }, 300000); // Every 5 minutes
  }

  private analyzeGlobalPatterns(): void {
    const totalPatterns = this.globalInsights.size;
    this.metrics.trackedPatterns = totalPatterns;
    this.metrics.lastAnalysisTimestamp = Date.now();
    this.updateMetricsSnapshot();

    const topPatterns = Array.from(this.globalInsights.entries())
      .sort(([, aInsights], [, bInsights]) => bInsights.length - aInsights.length)
      .slice(0, 3)
      .map(([key, values]) => {
        const label = key.split('_')[1] ?? key;
        return `${label}: ${values.length}`;
      });

    console.log(
      `🔍 Analyzing global patterns: ${totalPatterns} tracked, top signals: ${topPatterns.join(', ') || 'none yet'}`
    );
  }

  private updateMetricsSnapshot(): void {
    const topCategories = Array.from(this.globalCategoryCounts.entries())
      .sort(([, aCount], [, bCount]) => bCount - aCount)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));

    this.metrics.topCategories = topCategories;
    this.metrics.insightSummary = topCategories.length > 0
      ? topCategories.map(({ category, count }) => `${category}: ${count}`).join(', ')
      : 'Collecting intelligence';
  }

  private static makeCorrelationKey(findingA: string, findingB: string): string {
    return [findingA.toLowerCase().trim(), findingB.toLowerCase().trim()].sort().join('::');
  }
}
