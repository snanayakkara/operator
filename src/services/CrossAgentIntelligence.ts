/**
 * Phase 4: Cross-Agent Intelligence System
 * 
 * Enables Phase 3 agents to share insights, medical context, and learning
 * for enhanced clinical accuracy and comprehensive patient assessment.
 */

import type { AgentType, MedicalContext, MedicalReport } from '@/types/medical.types';

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

/**
 * Cross-Agent Intelligence coordinator for Phase 3 medical agents
 */
export class CrossAgentIntelligence {
  private static instance: CrossAgentIntelligence;
  private patientProfiles: Map<string, PatientProfile> = new Map();
  private globalInsights: Map<string, MedicalInsight[]> = new Map(); // Pattern-based insights
  private correlationRules: Map<string, (insights: MedicalInsight[]) => CrossAgentRecommendation[]> = new Map();

  constructor() {
    this.initializeCorrelationRules();
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
    const recommendations = this.generateComprehensiveRecommendations(profile);
    
    console.log(`📋 Analyzed patient profile: ${profile.medicalHistory.length} conditions, ${profile.currentMedications.length} medications`);
    
    return profile;
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
    this.correlationRules.forEach((ruleFunc, ruleName) => {
      const allInsights = [
        ...profile.medicalHistory,
        ...profile.currentMedications,
        ...profile.procedures,
        ...profile.activeProblems
      ];
      
      const ruleRecommendations = ruleFunc(allInsights);
      recommendations.push(...ruleRecommendations);
    });

    return recommendations.filter(rec => 
      rec.sourceAgents.length === 0 || rec.sourceAgents.includes(agentType)
    );
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
    // This would implement comprehensive recommendation generation
    // based on the complete patient profile
    return [];
  }

  private findCorrelation(finding1: string, finding2: string): any {
    // Implement correlation finding logic
    return null;
  }

  private getRelatedConditions(condition: string): string[] {
    // Implement related condition lookup
    return [];
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
    });
  }

  private startPeriodicAnalysis(): void {
    // Periodic analysis of patterns and updates
    setInterval(() => {
      this.analyzeGlobalPatterns();
    }, 300000); // Every 5 minutes
  }

  private analyzeGlobalPatterns(): void {
    console.log(`🔍 Analyzing global patterns: ${this.globalInsights.size} pattern categories`);
    // Implement pattern analysis and learning
  }
}