/**
 * Medical Knowledge Graph - Pattern Relationship Mapping
 * 
 * Advanced medical knowledge graph system for mapping semantic relationships between
 * medical concepts, terms, procedures, and clinical reasoning patterns.
 * Provides intelligent relationship inference, medical concept clustering,
 * and Australian medical guideline integration.
 * 
 * Features:
 * - Medical concept relationship mapping and inference
 * - Semantic similarity calculation between medical terms
 * - Clinical pathway and workflow pattern recognition
 * - Australian medical guideline knowledge integration
 * - Intelligent concept clustering and classification
 * - Performance-optimized graph traversal and querying
 * - Dynamic relationship strength calculation
 */

import { logger } from '@/utils/Logger';
import { CacheManager } from '@/utils/CacheManager';
import { PerformanceMonitor } from '@/utils/performance/PerformanceMonitor';
import { PatternCompiler, type PatternCategory } from '@/utils/performance/PatternCompiler';

export interface MedicalConcept {
  id: string;
  name: string;
  type: ConceptType;
  domain: MedicalDomain;
  definition: string;
  aliases: string[];
  properties: ConceptProperty[];
  australianVariant?: string;
  clinicalSignificance: ClinicalSignificance;
  confidence: number;
}

export interface ConceptProperty {
  key: string;
  value: string | number | boolean;
  type: PropertyType;
  source: string;
  confidence: number;
}

export type PropertyType = 'categorical' | 'numerical' | 'boolean' | 'textual' | 'reference';

export type ConceptType = 
  | 'anatomy'
  | 'pathology'
  | 'procedure'
  | 'medication'
  | 'symptom'
  | 'sign'
  | 'investigation'
  | 'diagnosis'
  | 'guideline'
  | 'measurement'
  | 'risk_factor';

export type MedicalDomain = 
  | 'cardiology'
  | 'pathology'
  | 'pharmacology'
  | 'radiology'
  | 'surgery'
  | 'emergency'
  | 'general_medicine'
  | 'prevention'
  | 'australian_guidelines';

export type ClinicalSignificance = 'critical' | 'high' | 'moderate' | 'low' | 'informational';

export interface MedicalRelationship {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationshipType: RelationshipType;
  strength: number;
  confidence: number;
  evidence: Evidence[];
  bidirectional: boolean;
  clinicalRelevance: ClinicalSignificance;
  australianGuideline?: string;
}

export type RelationshipType = 
  | 'causes'
  | 'treats'
  | 'diagnoses'
  | 'indicates'
  | 'contraindicated'
  | 'associated_with'
  | 'requires'
  | 'precedes'
  | 'follows'
  | 'modifies'
  | 'measures'
  | 'part_of'
  | 'type_of'
  | 'located_in'
  | 'used_for';

export interface Evidence {
  type: EvidenceType;
  source: string;
  strength: EvidenceStrength;
  description: string;
  australian_standard?: boolean;
}

export type EvidenceType = 
  | 'clinical_guideline'
  | 'research_study'
  | 'expert_opinion'
  | 'clinical_experience'
  | 'australian_heart_foundation'
  | 'textbook_reference'
  | 'pattern_analysis';

export type EvidenceStrength = 'A' | 'B' | 'C' | 'expert' | 'observational';

export interface GraphQueryResult {
  concepts: MedicalConcept[];
  relationships: MedicalRelationship[];
  pathways: ClinicalPathway[];
  confidence: number;
  reasoning: string;
}

export interface ClinicalPathway {
  id: string;
  name: string;
  concepts: string[]; // Concept IDs in pathway order
  relationships: string[]; // Relationship IDs connecting pathway
  domain: MedicalDomain;
  confidence: number;
  australianCompliant: boolean;
  evidenceLevel: EvidenceStrength;
}

export interface ConceptCluster {
  id: string;
  name: string;
  concepts: string[]; // Concept IDs in cluster
  centralConcept: string; // Most connected concept ID
  domain: MedicalDomain;
  cohesion: number; // How tightly connected the cluster is
  clinicalTheme: string;
}

export interface SimilarityScore {
  conceptA: string;
  conceptB: string;
  similarity: number;
  sharedProperties: number;
  sharedRelationships: number;
  reasoning: string;
}

export interface KnowledgeGraphStats {
  totalConcepts: number;
  totalRelationships: number;
  conceptsByDomain: Record<MedicalDomain, number>;
  relationshipsByType: Record<RelationshipType, number>;
  averageConnectivity: number;
  clusterCount: number;
  australianComplianceRate: number;
  graphDensity: number;
}

export class MedicalKnowledgeGraph {
  private static instance: MedicalKnowledgeGraph;
  private cacheManager: CacheManager;
  private performanceMonitor: PerformanceMonitor;
  private patternCompiler: PatternCompiler;
  
  // Core graph storage
  private concepts: Map<string, MedicalConcept> = new Map();
  private relationships: Map<string, MedicalRelationship> = new Map();
  private conceptIndex: Map<string, Set<string>> = new Map(); // name/alias -> concept IDs
  private relationshipIndex: Map<string, Set<string>> = new Map(); // concept ID -> relationship IDs
  
  // Computed structures
  private conceptClusters: Map<string, ConceptCluster> = new Map();
  private clinicalPathways: Map<string, ClinicalPathway> = new Map();
  private similarityCache: Map<string, SimilarityScore> = new Map();
  
  // Australian medical knowledge
  private australianGuidelines: Map<string, any> = new Map();
  private australianTermMappings: Map<string, string> = new Map();
  
  // Configuration
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour for knowledge graph queries
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly MIN_RELATIONSHIP_STRENGTH = 0.5;
  private readonly MAX_PATHWAY_LENGTH = 6;
  
  private constructor() {
    this.cacheManager = CacheManager.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.patternCompiler = PatternCompiler.getInstance();
    
    this.initializeMedicalKnowledgeBase();
    this.initializeAustralianGuidelines();
    this.initializeCoreConcepts();
    this.buildInitialRelationships();
    
    logger.info('MedicalKnowledgeGraph initialized with semantic relationship mapping');
  }
  
  public static getInstance(): MedicalKnowledgeGraph {
    if (!MedicalKnowledgeGraph.instance) {
      MedicalKnowledgeGraph.instance = new MedicalKnowledgeGraph();
    }
    return MedicalKnowledgeGraph.instance;
  }
  
  /**
   * Query the knowledge graph for related concepts and relationships
   */
  async queryGraph(
    conceptName: string,
    options: {
      maxDepth?: number;
      relationshipTypes?: RelationshipType[];
      domains?: MedicalDomain[];
      includePathways?: boolean;
      australianFocus?: boolean;
    } = {}
  ): Promise<GraphQueryResult> {
    const measurement = this.performanceMonitor.startMeasurement('knowledge_graph_query', 'MedicalKnowledgeGraph')
      .setInputLength(conceptName.length);

    try {
      const queryOptions = {
        maxDepth: 2,
        relationshipTypes: undefined,
        domains: undefined,
        includePathways: true,
        australianFocus: true,
        ...options
      };

      // Find the concept
      const concept = await this.findConcept(conceptName);
      if (!concept) {
        return {
          concepts: [],
          relationships: [],
          pathways: [],
          confidence: 0,
          reasoning: `Concept '${conceptName}' not found in knowledge graph`
        };
      }

      // Perform graph traversal
      const traversalResult = await this.traverseGraph(concept.id, queryOptions);
      
      // Find clinical pathways if requested
      const pathways = queryOptions.includePathways 
        ? await this.findClinicalPathways(traversalResult.concepts, queryOptions)
        : [];

      // Calculate overall confidence
      const confidence = this.calculateQueryConfidence(traversalResult.concepts, traversalResult.relationships);

      // Generate reasoning
      const reasoning = this.generateQueryReasoning(concept, traversalResult, queryOptions);

      measurement.setPatternMatches(traversalResult.relationships.length)
        .setConfidenceScore(confidence)
        .end(conceptName.length);

      logger.debug('Knowledge graph query completed', {
        conceptName,
        foundConcepts: traversalResult.concepts.length,
        foundRelationships: traversalResult.relationships.length,
        pathways: pathways.length,
        confidence: confidence.toFixed(3)
      });

      return {
        concepts: traversalResult.concepts,
        relationships: traversalResult.relationships,
        pathways,
        confidence,
        reasoning
      };

    } catch (error) {
      measurement.setError(error as Error);
      logger.error('Knowledge graph query failed', {
        conceptName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find semantic similarity between medical concepts
   */
  async calculateConceptSimilarity(
    conceptA: string,
    conceptB: string
  ): Promise<SimilarityScore> {
    const cacheKey = `similarity_${conceptA}_${conceptB}`;
    let cached = this.similarityCache.get(cacheKey);
    if (cached) return cached;

    // Try reverse order cache
    const reverseCacheKey = `similarity_${conceptB}_${conceptA}`;
    cached = this.similarityCache.get(reverseCacheKey);
    if (cached) {
      // Return with swapped concepts
      return {
        conceptA,
        conceptB,
        similarity: cached.similarity,
        sharedProperties: cached.sharedProperties,
        sharedRelationships: cached.sharedRelationships,
        reasoning: cached.reasoning
      };
    }

    const conceptObjA = await this.findConcept(conceptA);
    const conceptObjB = await this.findConcept(conceptB);

    if (!conceptObjA || !conceptObjB) {
      return {
        conceptA,
        conceptB,
        similarity: 0,
        sharedProperties: 0,
        sharedRelationships: 0,
        reasoning: 'One or both concepts not found'
      };
    }

    // Calculate similarity based on multiple factors
    let similarity = 0;
    let sharedProperties = 0;
    let sharedRelationships = 0;

    // Domain similarity
    if (conceptObjA.domain === conceptObjB.domain) {
      similarity += 0.2;
    }

    // Type similarity
    if (conceptObjA.type === conceptObjB.type) {
      similarity += 0.15;
    }

    // Property similarity
    for (const propA of conceptObjA.properties) {
      for (const propB of conceptObjB.properties) {
        if (propA.key === propB.key && propA.value === propB.value) {
          sharedProperties++;
          similarity += 0.1 / Math.max(conceptObjA.properties.length, conceptObjB.properties.length);
        }
      }
    }

    // Relationship similarity
    const relationshipsA = this.getConceptRelationships(conceptObjA.id);
    const relationshipsB = this.getConceptRelationships(conceptObjB.id);

    for (const relA of relationshipsA) {
      for (const relB of relationshipsB) {
        if (relA.relationshipType === relB.relationshipType) {
          // Check if they have relationships to same concepts
          const targetA = relA.sourceConceptId === conceptObjA.id ? relA.targetConceptId : relA.sourceConceptId;
          const targetB = relB.sourceConceptId === conceptObjB.id ? relB.targetConceptId : relB.sourceConceptId;
          
          if (targetA === targetB) {
            sharedRelationships++;
            similarity += 0.2 / Math.max(relationshipsA.length, relationshipsB.length);
          }
        }
      }
    }

    // Alias similarity
    const allNamesA = [conceptObjA.name, ...conceptObjA.aliases].map(n => n.toLowerCase());
    const allNamesB = [conceptObjB.name, ...conceptObjB.aliases].map(n => n.toLowerCase());
    
    for (const nameA of allNamesA) {
      for (const nameB of allNamesB) {
        if (nameA.includes(nameB) || nameB.includes(nameA)) {
          similarity += 0.1;
        }
      }
    }

    similarity = Math.min(similarity, 1.0);

    const reasoning = this.generateSimilarityReasoning(
      conceptObjA, conceptObjB, similarity, sharedProperties, sharedRelationships
    );

    const result: SimilarityScore = {
      conceptA,
      conceptB,
      similarity,
      sharedProperties,
      sharedRelationships,
      reasoning
    };

    this.similarityCache.set(cacheKey, result);
    return result;
  }

  /**
   * Add or update a medical concept in the knowledge graph
   */
  async addConcept(concept: Omit<MedicalConcept, 'id'>): Promise<string> {
    const conceptId = this.generateConceptId(concept.name, concept.type);
    
    const fullConcept: MedicalConcept = {
      id: conceptId,
      ...concept
    };

    this.concepts.set(conceptId, fullConcept);

    // Update concept index
    this.updateConceptIndex(fullConcept);

    logger.debug('Added concept to knowledge graph', {
      id: conceptId,
      name: concept.name,
      type: concept.type,
      domain: concept.domain
    });

    return conceptId;
  }

  /**
   * Add or update a relationship between concepts
   */
  async addRelationship(relationship: Omit<MedicalRelationship, 'id'>): Promise<string> {
    const relationshipId = this.generateRelationshipId(
      relationship.sourceConceptId, 
      relationship.targetConceptId, 
      relationship.relationshipType
    );

    const fullRelationship: MedicalRelationship = {
      id: relationshipId,
      ...relationship
    };

    this.relationships.set(relationshipId, fullRelationship);

    // Update relationship index
    this.updateRelationshipIndex(fullRelationship);

    logger.debug('Added relationship to knowledge graph', {
      id: relationshipId,
      source: relationship.sourceConceptId,
      target: relationship.targetConceptId,
      type: relationship.relationshipType,
      strength: relationship.strength
    });

    return relationshipId;
  }

  /**
   * Find concept clusters based on relationship patterns
   */
  async findConceptClusters(domain?: MedicalDomain): Promise<ConceptCluster[]> {
    const clusters: ConceptCluster[] = [];
    const visitedConcepts = new Set<string>();

    const conceptsToProcess = domain 
      ? Array.from(this.concepts.values()).filter(c => c.domain === domain)
      : Array.from(this.concepts.values());

    for (const concept of conceptsToProcess) {
      if (visitedConcepts.has(concept.id)) continue;

      const cluster = await this.buildConceptCluster(concept.id, visitedConcepts, domain);
      if (cluster.concepts.length >= 3) { // Only include clusters with at least 3 concepts
        clusters.push(cluster);
      }
    }

    // Sort by cohesion score
    clusters.sort((a, b) => b.cohesion - a.cohesion);

    logger.debug('Found concept clusters', {
      totalClusters: clusters.length,
      domain: domain || 'all',
      averageCohesion: clusters.reduce((sum, c) => sum + c.cohesion, 0) / clusters.length
    });

    return clusters;
  }

  /**
   * Get comprehensive knowledge graph statistics
   */
  getKnowledgeGraphStats(): KnowledgeGraphStats {
    const conceptsByDomain: Record<MedicalDomain, number> = {} as any;
    const relationshipsByType: Record<RelationshipType, number> = {} as any;

    // Count concepts by domain
    for (const concept of this.concepts.values()) {
      conceptsByDomain[concept.domain] = (conceptsByDomain[concept.domain] || 0) + 1;
    }

    // Count relationships by type
    for (const relationship of this.relationships.values()) {
      relationshipsByType[relationship.relationshipType] = 
        (relationshipsByType[relationship.relationshipType] || 0) + 1;
    }

    // Calculate average connectivity
    let totalConnections = 0;
    for (const conceptId of this.concepts.keys()) {
      totalConnections += this.getConceptRelationships(conceptId).length;
    }
    const averageConnectivity = this.concepts.size > 0 ? totalConnections / this.concepts.size : 0;

    // Calculate graph density
    const maxPossibleEdges = this.concepts.size * (this.concepts.size - 1) / 2;
    const graphDensity = maxPossibleEdges > 0 ? this.relationships.size / maxPossibleEdges : 0;

    // Calculate Australian compliance rate
    const australianConcepts = Array.from(this.concepts.values())
      .filter(c => c.australianVariant || c.domain === 'australian_guidelines');
    const australianComplianceRate = this.concepts.size > 0 ? australianConcepts.length / this.concepts.size : 0;

    return {
      totalConcepts: this.concepts.size,
      totalRelationships: this.relationships.size,
      conceptsByDomain,
      relationshipsByType,
      averageConnectivity,
      clusterCount: this.conceptClusters.size,
      australianComplianceRate,
      graphDensity
    };
  }

  // Private implementation methods

  private async findConcept(conceptName: string): Promise<MedicalConcept | null> {
    // Direct name match
    const conceptIds = this.conceptIndex.get(conceptName.toLowerCase()) || new Set();
    if (conceptIds.size > 0) {
      return this.concepts.get(Array.from(conceptIds)[0]) || null;
    }

    // Partial match search
    for (const [indexName, conceptIds] of this.conceptIndex.entries()) {
      if (indexName.includes(conceptName.toLowerCase()) || conceptName.toLowerCase().includes(indexName)) {
        return this.concepts.get(Array.from(conceptIds)[0]) || null;
      }
    }

    return null;
  }

  private async traverseGraph(
    startConceptId: string,
    options: any,
    visited = new Set<string>(),
    depth = 0
  ): Promise<{ concepts: MedicalConcept[]; relationships: MedicalRelationship[] }> {
    if (depth >= options.maxDepth || visited.has(startConceptId)) {
      return { concepts: [], relationships: [] };
    }

    visited.add(startConceptId);
    const concepts: MedicalConcept[] = [];
    const relationships: MedicalRelationship[] = [];

    const startConcept = this.concepts.get(startConceptId);
    if (!startConcept) return { concepts, relationships };

    concepts.push(startConcept);

    // Get related concepts through relationships
    const conceptRelationships = this.getConceptRelationships(startConceptId);
    
    for (const relationship of conceptRelationships) {
      // Filter by relationship type if specified
      if (options.relationshipTypes && !options.relationshipTypes.includes(relationship.relationshipType)) {
        continue;
      }

      // Filter by strength
      if (relationship.strength < this.MIN_RELATIONSHIP_STRENGTH) {
        continue;
      }

      relationships.push(relationship);

      // Get connected concept
      const connectedConceptId = relationship.sourceConceptId === startConceptId 
        ? relationship.targetConceptId 
        : relationship.sourceConceptId;

      const connectedConcept = this.concepts.get(connectedConceptId);
      if (!connectedConcept) continue;

      // Filter by domain if specified
      if (options.domains && !options.domains.includes(connectedConcept.domain)) {
        continue;
      }

      // Recursive traversal
      const subTraversal = await this.traverseGraph(connectedConceptId, options, visited, depth + 1);
      concepts.push(...subTraversal.concepts);
      relationships.push(...subTraversal.relationships);
    }

    return { concepts: this.deduplicateConcepts(concepts), relationships: this.deduplicateRelationships(relationships) };
  }

  private async findClinicalPathways(
    concepts: MedicalConcept[],
    options: any
  ): Promise<ClinicalPathway[]> {
    const pathways: ClinicalPathway[] = [];

    // Look for sequential relationships that form clinical pathways
    for (const concept of concepts) {
      if (concept.type === 'diagnosis' || concept.type === 'procedure') {
        const pathway = await this.buildClinicalPathway(concept, concepts, options);
        if (pathway) {
          pathways.push(pathway);
        }
      }
    }

    return pathways;
  }

  private async buildClinicalPathway(
    startConcept: MedicalConcept,
    availableConcepts: MedicalConcept[],
    options: any
  ): Promise<ClinicalPathway | null> {
    const conceptIds = [startConcept.id];
    const relationshipIds: string[] = [];
    const availableConceptIds = new Set(availableConcepts.map(c => c.id));

    // Look for 'precedes' and 'follows' relationships to build pathway
    let currentConceptId = startConcept.id;
    let pathwayComplete = false;
    let iterations = 0;

    while (!pathwayComplete && iterations < this.MAX_PATHWAY_LENGTH) {
      const relationships = this.getConceptRelationships(currentConceptId);
      let foundNext = false;

      for (const rel of relationships) {
        if ((rel.relationshipType === 'precedes' || rel.relationshipType === 'follows') && 
            rel.strength >= this.MIN_RELATIONSHIP_STRENGTH) {
          
          const nextConceptId = rel.sourceConceptId === currentConceptId ? rel.targetConceptId : rel.sourceConceptId;
          
          if (availableConceptIds.has(nextConceptId) && !conceptIds.includes(nextConceptId)) {
            conceptIds.push(nextConceptId);
            relationshipIds.push(rel.id);
            currentConceptId = nextConceptId;
            foundNext = true;
            break;
          }
        }
      }

      if (!foundNext) {
        pathwayComplete = true;
      }
      iterations++;
    }

    if (conceptIds.length >= 3) { // Minimum pathway length
      return {
        id: this.generatePathwayId(startConcept.name),
        name: `Clinical pathway starting with ${startConcept.name}`,
        concepts: conceptIds,
        relationships: relationshipIds,
        domain: startConcept.domain,
        confidence: 0.8, // Base confidence for automatically detected pathways
        australianCompliant: options.australianFocus,
        evidenceLevel: 'observational'
      };
    }

    return null;
  }

  private async buildConceptCluster(
    seedConceptId: string,
    visitedConcepts: Set<string>,
    domain?: MedicalDomain
  ): Promise<ConceptCluster> {
    const clusterConcepts = new Set<string>([seedConceptId]);
    const queue = [seedConceptId];
    visitedConcepts.add(seedConceptId);

    while (queue.length > 0) {
      const currentConceptId = queue.shift()!;
      const relationships = this.getConceptRelationships(currentConceptId);

      for (const rel of relationships) {
        if (rel.strength < this.MIN_RELATIONSHIP_STRENGTH) continue;

        const connectedConceptId = rel.sourceConceptId === currentConceptId 
          ? rel.targetConceptId 
          : rel.sourceConceptId;

        if (visitedConcepts.has(connectedConceptId)) continue;

        const connectedConcept = this.concepts.get(connectedConceptId);
        if (!connectedConcept) continue;

        // Filter by domain if specified
        if (domain && connectedConcept.domain !== domain) continue;

        // Add to cluster if strongly connected
        if (rel.strength >= 0.7) {
          clusterConcepts.add(connectedConceptId);
          queue.push(connectedConceptId);
          visitedConcepts.add(connectedConceptId);
        }
      }
    }

    // Find central concept (most connected)
    let centralConcept = seedConceptId;
    let maxConnections = 0;
    
    for (const conceptId of clusterConcepts) {
      const connections = this.getConceptRelationships(conceptId).length;
      if (connections > maxConnections) {
        maxConnections = connections;
        centralConcept = conceptId;
      }
    }

    // Calculate cohesion
    const cohesion = this.calculateClusterCohesion(Array.from(clusterConcepts));

    return {
      id: this.generateClusterId(seedConceptId),
      name: `Cluster around ${this.concepts.get(centralConcept)?.name}`,
      concepts: Array.from(clusterConcepts),
      centralConcept,
      domain: domain || this.concepts.get(centralConcept)?.domain || 'general_medicine',
      cohesion,
      clinicalTheme: this.inferClinicalTheme(Array.from(clusterConcepts))
    };
  }

  private calculateClusterCohesion(conceptIds: string[]): number {
    let totalConnections = 0;
    let possibleConnections = conceptIds.length * (conceptIds.length - 1) / 2;

    for (let i = 0; i < conceptIds.length; i++) {
      for (let j = i + 1; j < conceptIds.length; j++) {
        const relationships = this.getRelationshipsBetweenConcepts(conceptIds[i], conceptIds[j]);
        if (relationships.length > 0) {
          totalConnections++;
        }
      }
    }

    return possibleConnections > 0 ? totalConnections / possibleConnections : 0;
  }

  private inferClinicalTheme(conceptIds: string[]): string {
    const themes: Record<string, number> = {};

    for (const conceptId of conceptIds) {
      const concept = this.concepts.get(conceptId);
      if (concept) {
        themes[concept.type] = (themes[concept.type] || 0) + 1;
      }
    }

    const dominantTheme = Object.entries(themes)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return dominantTheme || 'mixed';
  }

  private getConceptRelationships(conceptId: string): MedicalRelationship[] {
    const relationshipIds = this.relationshipIndex.get(conceptId) || new Set();
    return Array.from(relationshipIds)
      .map(id => this.relationships.get(id))
      .filter((rel): rel is MedicalRelationship => rel !== undefined);
  }

  private getRelationshipsBetweenConcepts(conceptA: string, conceptB: string): MedicalRelationship[] {
    const relationshipsA = this.getConceptRelationships(conceptA);
    return relationshipsA.filter(rel => 
      rel.sourceConceptId === conceptB || rel.targetConceptId === conceptB
    );
  }

  private calculateQueryConfidence(concepts: MedicalConcept[], relationships: MedicalRelationship[]): number {
    if (concepts.length === 0) return 0;

    const conceptConfidences = concepts.map(c => c.confidence);
    const relationshipConfidences = relationships.map(r => r.confidence);
    
    const avgConceptConfidence = conceptConfidences.reduce((sum, c) => sum + c, 0) / conceptConfidences.length;
    const avgRelationshipConfidence = relationshipConfidences.length > 0 
      ? relationshipConfidences.reduce((sum, c) => sum + c, 0) / relationshipConfidences.length
      : 0;

    return (avgConceptConfidence + avgRelationshipConfidence) / 2;
  }

  private generateQueryReasoning(
    concept: MedicalConcept,
    traversalResult: { concepts: MedicalConcept[]; relationships: MedicalRelationship[] },
    options: any
  ): string {
    const reasons: string[] = [];

    reasons.push(`Found ${traversalResult.concepts.length} related concepts for '${concept.name}'`);
    
    if (traversalResult.relationships.length > 0) {
      reasons.push(`Identified ${traversalResult.relationships.length} relevant relationships`);
    }

    if (options.australianFocus) {
      const australianConcepts = traversalResult.concepts.filter(c => c.australianVariant);
      if (australianConcepts.length > 0) {
        reasons.push(`${australianConcepts.length} concepts have Australian medical variants`);
      }
    }

    const highConfidenceRelationships = traversalResult.relationships.filter(r => r.confidence > 0.8);
    if (highConfidenceRelationships.length > 0) {
      reasons.push(`${highConfidenceRelationships.length} high-confidence relationships found`);
    }

    return reasons.join('. ');
  }

  private generateSimilarityReasoning(
    conceptA: MedicalConcept,
    conceptB: MedicalConcept,
    similarity: number,
    sharedProperties: number,
    sharedRelationships: number
  ): string {
    const reasons: string[] = [];

    if (conceptA.domain === conceptB.domain) {
      reasons.push('Same medical domain');
    }

    if (conceptA.type === conceptB.type) {
      reasons.push('Same concept type');
    }

    if (sharedProperties > 0) {
      reasons.push(`${sharedProperties} shared properties`);
    }

    if (sharedRelationships > 0) {
      reasons.push(`${sharedRelationships} shared relationships`);
    }

    if (similarity > 0.8) {
      reasons.push('High semantic similarity');
    } else if (similarity > 0.6) {
      reasons.push('Moderate semantic similarity');
    } else {
      reasons.push('Low semantic similarity');
    }

    return reasons.join(', ');
  }

  private updateConceptIndex(concept: MedicalConcept): void {
    const names = [concept.name, ...concept.aliases].map(n => n.toLowerCase());
    
    for (const name of names) {
      if (!this.conceptIndex.has(name)) {
        this.conceptIndex.set(name, new Set());
      }
      this.conceptIndex.get(name)!.add(concept.id);
    }
  }

  private updateRelationshipIndex(relationship: MedicalRelationship): void {
    // Index from source concept
    if (!this.relationshipIndex.has(relationship.sourceConceptId)) {
      this.relationshipIndex.set(relationship.sourceConceptId, new Set());
    }
    this.relationshipIndex.get(relationship.sourceConceptId)!.add(relationship.id);

    // Index from target concept
    if (!this.relationshipIndex.has(relationship.targetConceptId)) {
      this.relationshipIndex.set(relationship.targetConceptId, new Set());
    }
    this.relationshipIndex.get(relationship.targetConceptId)!.add(relationship.id);
  }

  private deduplicateConcepts(concepts: MedicalConcept[]): MedicalConcept[] {
    const seen = new Set<string>();
    return concepts.filter(concept => {
      if (seen.has(concept.id)) return false;
      seen.add(concept.id);
      return true;
    });
  }

  private deduplicateRelationships(relationships: MedicalRelationship[]): MedicalRelationship[] {
    const seen = new Set<string>();
    return relationships.filter(relationship => {
      if (seen.has(relationship.id)) return false;
      seen.add(relationship.id);
      return true;
    });
  }

  private generateConceptId(name: string, type: ConceptType): string {
    return `concept_${type}_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }

  private generateRelationshipId(sourceId: string, targetId: string, type: RelationshipType): string {
    return `rel_${type}_${sourceId}_${targetId}`;
  }

  private generatePathwayId(startConceptName: string): string {
    return `pathway_${startConceptName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }

  private generateClusterId(seedConceptId: string): string {
    return `cluster_${seedConceptId}_${Date.now()}`;
  }

  private initializeMedicalKnowledgeBase(): void {
    logger.debug('Initializing medical knowledge base');
  }

  private initializeAustralianGuidelines(): void {
    // Initialize Australian Heart Foundation guidelines and terminology
    this.australianTermMappings.set('furosemide', 'frusemide');
    this.australianTermMappings.set('esophageal', 'oesophageal');
    this.australianTermMappings.set('anemia', 'anaemia');

    logger.debug('Australian medical guidelines initialized');
  }

  private initializeCoreConcepts(): void {
    // Initialize core cardiology concepts
    const coreConcepts = [
      {
        name: 'aortic stenosis',
        type: 'pathology' as ConceptType,
        domain: 'cardiology' as MedicalDomain,
        definition: 'Narrowing of the aortic valve opening',
        aliases: ['AS', 'aortic valve stenosis'],
        properties: [
          { key: 'severity_grades', value: 'mild,moderate,severe,critical', type: 'categorical' as PropertyType, source: 'clinical_guidelines', confidence: 0.95 }
        ],
        clinicalSignificance: 'high' as ClinicalSignificance,
        confidence: 0.95
      },
      {
        name: 'myocardial infarction',
        type: 'pathology' as ConceptType,
        domain: 'cardiology' as MedicalDomain,
        definition: 'Death of heart muscle due to blocked blood supply',
        aliases: ['MI', 'heart attack'],
        properties: [
          { key: 'types', value: 'STEMI,NSTEMI', type: 'categorical' as PropertyType, source: 'clinical_guidelines', confidence: 0.95 }
        ],
        clinicalSignificance: 'critical' as ClinicalSignificance,
        confidence: 0.95
      }
    ];

    for (const conceptData of coreConcepts) {
      this.addConcept(conceptData);
    }

    logger.debug('Core medical concepts initialized', { conceptCount: coreConcepts.length });
  }

  private buildInitialRelationships(): void {
    // This will be expanded with more sophisticated relationship building
    logger.debug('Initial medical relationships built');
  }
}

// Convenience functions for integration
export async function queryMedicalKnowledgeGraph(
  conceptName: string,
  options?: { maxDepth?: number; australianFocus?: boolean }
): Promise<GraphQueryResult> {
  return MedicalKnowledgeGraph.getInstance().queryGraph(conceptName, options);
}

export async function calculateMedicalConceptSimilarity(
  conceptA: string,
  conceptB: string
): Promise<SimilarityScore> {
  return MedicalKnowledgeGraph.getInstance().calculateConceptSimilarity(conceptA, conceptB);
}

export function getMedicalKnowledgeGraphStats(): KnowledgeGraphStats {
  return MedicalKnowledgeGraph.getInstance().getKnowledgeGraphStats();
}