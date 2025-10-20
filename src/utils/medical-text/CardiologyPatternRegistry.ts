/**
 * Cardiology Pattern Registry - Phase 2 Consolidation
 * 
 * Comprehensive registry of cardiology-specific medical patterns for cross-agent consolidation.
 * Provides standardized pattern definitions, terminology mappings, and clinical context
 * for all cardiology-focused medical agents.
 */

import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

export interface CardiologyPattern {
  id: string;
  pattern: RegExp;
  category: CardiologyCategory;
  priority: number;
  description: string;
  examples: string[];
  replacements?: PatternReplacement[];
  clinicalContext?: string;
  relatedTerms?: string[];
  australianSpelling?: boolean;
}

export interface PatternReplacement {
  match: string;
  replacement: string;
  conditions?: string[];
}

export type CardiologyCategory = 
  | 'anatomy'
  | 'procedures'
  | 'medications'
  | 'measurements'
  | 'pathology'
  | 'devices'
  | 'hemodynamics'
  | 'imaging'
  | 'symptoms'
  | 'complications';

export interface AgentCardiologyPatterns {
  agentType: AgentType;
  primaryPatterns: string[]; // Pattern IDs this agent primarily uses
  secondaryPatterns: string[]; // Pattern IDs this agent occasionally uses
  customPatterns?: CardiologyPattern[]; // Agent-specific patterns
  excludePatterns?: string[]; // Patterns this agent should not use
}

/**
 * Comprehensive Cardiology Pattern Registry
 * Centralized repository of all cardiology-related medical patterns
 */
export class CardiologyPatternRegistry {
  private static instance: CardiologyPatternRegistry;
  private patterns: Map<string, CardiologyPattern> = new Map();
  private categoryIndex: Map<CardiologyCategory, string[]> = new Map();
  private agentMappings: Map<AgentType, AgentCardiologyPatterns> = new Map();

  private constructor() {
    this.initializePatterns();
    this.initializeAgentMappings();
  }

  public static getInstance(): CardiologyPatternRegistry {
    if (!CardiologyPatternRegistry.instance) {
      CardiologyPatternRegistry.instance = new CardiologyPatternRegistry();
    }
    return CardiologyPatternRegistry.instance;
  }

  /**
   * Initialize comprehensive cardiology patterns
   */
  private initializePatterns(): void {
    const patterns: CardiologyPattern[] = [
      // Coronary Anatomy Patterns
      {
        id: 'coronary_vessels',
        pattern: /\b(?:LAD|RCA|LCX|LMS|OM|PDA|PLV|diagonal|marginal|septal)\b/gi,
        category: 'anatomy',
        priority: 100,
        description: 'Major coronary vessel nomenclature',
        examples: ['LAD stenosis', 'RCA occlusion', 'LCX disease'],
        clinicalContext: 'Coronary angiography and intervention',
        relatedTerms: ['vessel', 'artery', 'stenosis', 'occlusion'],
        australianSpelling: true
      },
      {
        id: 'coronary_segments',
        pattern: /\b(?:proximal|mid|distal|ostial)\s+(?:LAD|RCA|LCX|LMS)\b/gi,
        category: 'anatomy',
        priority: 95,
        description: 'Coronary vessel segment descriptions',
        examples: ['proximal LAD', 'distal RCA', 'ostial LMS'],
        replacements: [
          { match: 'proximal', replacement: 'prox', conditions: ['abbreviation_mode'] }
        ],
        clinicalContext: 'Precise lesion localization',
        australianSpelling: true
      },

      // Stenosis and Disease Severity
      {
        id: 'stenosis_severity',
        pattern: /\b(?:mild|moderate|severe|critical|subtotal|total)\s+(?:stenosis|narrowing|disease)\b/gi,
        category: 'pathology',
        priority: 100,
        description: 'Stenosis severity grading',
        examples: ['moderate stenosis', 'severe disease', 'critical narrowing'],
        clinicalContext: 'Quantitative stenosis assessment',
        relatedTerms: ['occlusion', 'lesion', 'plaque'],
        australianSpelling: true
      },
      {
        id: 'timi_flow',
        pattern: /\b(?:TIMI|timi)\s+(?:flow\s+)?(?:0|I|II|III|zero|one|two|three)\b/gi,
        category: 'measurements',
        priority: 90,
        description: 'TIMI flow grading system',
        examples: ['TIMI III flow', 'TIMI 0', 'timi flow II'],
        clinicalContext: 'Angiographic flow assessment post-intervention',
        relatedTerms: ['flow', 'perfusion', 'reperfusion'],
        australianSpelling: true
      },

      // Hemodynamic Measurements
      {
        id: 'pressure_measurements',
        pattern: /\b(?:PA|RA|PCWP|LVEDP|AoP|LVP)\s*(?:mean|systolic|diastolic)?\s*\d+(?:-\d+)?\s*mmHg\b/gi,
        category: 'hemodynamics',
        priority: 95,
        description: 'Cardiac pressure measurements',
        examples: ['PA mean 25 mmHg', 'LVEDP 18 mmHg', 'RA 8 mmHg'],
        replacements: [
          { match: 'pulmonary artery mean', replacement: 'PAm' },
          { match: 'pulmonary capillary wedge pressure', replacement: 'PCWP' },
          { match: 'right atrial pressure', replacement: 'RAP' }
        ],
        clinicalContext: 'Right heart catheterization',
        australianSpelling: true
      },
      {
        id: 'cardiac_output',
        pattern: /\b(?:CO|CI|SV|SVR|PVR)\s*\d+\.?\d*\s*(?:L\/min|ml|dynes|units)?\b/gi,
        category: 'hemodynamics',
        priority: 85,
        description: 'Cardiac output and derived measurements',
        examples: ['CO 4.5 L/min', 'CI 2.8', 'SVR 1200 dynes'],
        replacements: [
          { match: 'cardiac output', replacement: 'CO' },
          { match: 'cardiac index', replacement: 'CI' },
          { match: 'stroke volume', replacement: 'SV' }
        ],
        clinicalContext: 'Hemodynamic assessment',
        australianSpelling: true
      },

      // Valve Pathology
      {
        id: 'valve_disease',
        pattern: /\b(?:AS|AR|MS|MR|TS|TR)\b|\b(?:aortic|mitral|tricuspid|pulmonary)\s+(?:stenosis|regurgitation|insufficiency)\b/gi,
        category: 'pathology',
        priority: 95,
        description: 'Valvular heart disease terminology',
        examples: ['severe AS', 'moderate MR', 'aortic stenosis'],
        replacements: [
          { match: 'aortic stenosis', replacement: 'AS' },
          { match: 'mitral regurgitation', replacement: 'MR' },
          { match: 'moderate to severe', replacement: 'mod-sev' },
          { match: 'mild to moderate', replacement: 'mild-mod' }
        ],
        clinicalContext: 'Echocardiographic assessment',
        australianSpelling: true
      },
      {
        id: 'valve_gradients',
        pattern: /\b(?:AV|MV|TV|PV)\s+(?:gradient|MPG|peak)\s+\d+\s*mmHg\b/gi,
        category: 'measurements',
        priority: 80,
        description: 'Valve pressure gradients',
        examples: ['AV MPG 45 mmHg', 'MV gradient 12 mmHg'],
        replacements: [
          { match: 'gradient', replacement: 'MPG', conditions: ['valve_context'] },
          { match: 'aortic valve gradient', replacement: 'AV MPG' },
          { match: 'mitral valve gradient', replacement: 'MV MPG' }
        ],
        clinicalContext: 'Doppler echocardiography',
        australianSpelling: true
      },

      // Interventional Devices and Procedures
      {
        id: 'intervention_devices',
        pattern: /\b(?:DES|BMS|POBA|stent|balloon|guide|wire|catheter)\b/gi,
        category: 'devices',
        priority: 85,
        description: 'Interventional cardiology devices',
        examples: ['DES deployment', 'BMS placed', 'POBA performed'],
        clinicalContext: 'Percutaneous coronary intervention',
        relatedTerms: ['deployment', 'inflation', 'expansion'],
        australianSpelling: true
      },
      {
        id: 'tavi_devices',
        pattern: /\b(?:Edwards|Medtronic|CoreValve|SAPIEN|Evolut|THV|prosthesis)\b/gi,
        category: 'devices',
        priority: 80,
        description: 'TAVI prosthetic devices',
        examples: ['SAPIEN 3 valve', 'CoreValve deployment', 'Edwards prosthesis'],
        clinicalContext: 'Transcatheter aortic valve implantation',
        relatedTerms: ['deployment', 'positioning', 'sizing'],
        australianSpelling: true
      },

      // Procedural Terminology
      {
        id: 'procedures',
        pattern: /\b(?:TAVI|TAVR|PCI|CABG|valvuloplasty|angioplasty|atherectomy)\b/gi,
        category: 'procedures',
        priority: 100,
        description: 'Cardiac interventional procedures',
        examples: ['TAVI procedure', 'PCI to LAD', 'CABG planned'],
        clinicalContext: 'Cardiac interventions and surgery',
        relatedTerms: ['intervention', 'procedure', 'therapy'],
        australianSpelling: true
      },

      // Imaging and Diagnostics
      {
        id: 'imaging_modalities',
        pattern: /\b(?:TTE|TOE|CTCA|angiogram|fluoroscopy|IVUS|OCT)\b/gi,
        category: 'imaging',
        priority: 90,
        description: 'Cardiac imaging modalities',
        examples: ['TTE findings', 'TOE guidance', 'CTCA normal'],
        replacements: [
          { match: 'transthoracic echo', replacement: 'TTE' },
          { match: 'transoesophageal echo', replacement: 'TOE' },
          { match: 'CT coronary angiogram', replacement: 'CTCA' }
        ],
        clinicalContext: 'Cardiac imaging and diagnostics',
        australianSpelling: true
      },

      // Medications
      {
        id: 'cardiac_medications',
        pattern: /\b(?:aspirin|clopidogrel|ticagrelor|prasugrel|heparin|bivalirudin|atorvastatin|metoprolol|ramipril)\b/gi,
        category: 'medications',
        priority: 75,
        description: 'Common cardiac medications',
        examples: ['aspirin 100mg', 'clopidogrel loading', 'atorvastatin therapy'],
        clinicalContext: 'Cardiac pharmacotherapy',
        relatedTerms: ['antiplatelet', 'anticoagulant', 'statin', 'ACE inhibitor'],
        australianSpelling: true
      },

      // Laboratory Values
      {
        id: 'cardiac_biomarkers',
        pattern: /\b(?:troponin|CK|CKMB|BNP|proBNP|D-dimer)\s*\d*\.?\d*\b/gi,
        category: 'measurements',
        priority: 70,
        description: 'Cardiac biomarkers and laboratory values',
        examples: ['troponin 0.05', 'BNP 450', 'CK elevated'],
        clinicalContext: 'Cardiac biomarker assessment',
        relatedTerms: ['elevated', 'normal', 'peaked'],
        australianSpelling: true
      },

      // Complications and Adverse Events
      {
        id: 'complications',
        pattern: /\b(?:dissection|perforation|embolism|thrombosis|bleeding|hematoma|pseudoaneurysm)\b/gi,
        category: 'complications',
        priority: 95,
        description: 'Cardiac procedure complications',
        examples: ['coronary dissection', 'access site bleeding', 'distal embolism'],
        clinicalContext: 'Procedural complications and management',
        relatedTerms: ['adverse event', 'complication', 'emergency'],
        australianSpelling: true
      }
    ];

    // Add patterns to registry
    patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
      this.addToCategoryIndex(pattern.category, pattern.id);
    });

    logger.info('Cardiology pattern registry initialized', {
      totalPatterns: patterns.length,
      categories: Array.from(this.categoryIndex.keys())
    });
  }

  /**
   * Initialize agent-specific pattern mappings
   */
  private initializeAgentMappings(): void {
    const mappings: AgentCardiologyPatterns[] = [
      {
        agentType: 'tavi',
        primaryPatterns: [
          'tavi_devices', 'valve_disease', 'valve_gradients', 'procedures',
          'hemodynamics', 'pressure_measurements', 'imaging_modalities', 'complications'
        ],
        secondaryPatterns: ['coronary_vessels', 'cardiac_medications', 'cardiac_biomarkers'],
        excludePatterns: ['intervention_devices'] // TAVI doesn't use traditional stents
      },
      {
        agentType: 'angiogram-pci',
        primaryPatterns: [
          'coronary_vessels', 'coronary_segments', 'stenosis_severity', 'timi_flow',
          'intervention_devices', 'procedures', 'imaging_modalities', 'complications'
        ],
        secondaryPatterns: ['cardiac_medications', 'cardiac_biomarkers', 'hemodynamics'],
        excludePatterns: ['tavi_devices'] // PCI doesn't use TAVI devices
      },
      {
        agentType: 'mteer',
        primaryPatterns: [
          'valve_disease', 'valve_gradients', 'procedures', 'imaging_modalities',
          'hemodynamics', 'pressure_measurements', 'complications'
        ],
        secondaryPatterns: ['cardiac_medications', 'cardiac_biomarkers'],
        excludePatterns: ['coronary_vessels', 'intervention_devices'] // Focus on mitral valve
      },
      {
        agentType: 'pfo-closure',
        primaryPatterns: [
          'procedures', 'imaging_modalities', 'hemodynamics', 'complications'
        ],
        secondaryPatterns: ['cardiac_medications', 'cardiac_biomarkers'],
        excludePatterns: ['coronary_vessels', 'valve_disease'] // Structural heart focus
      },
      {
        agentType: 'right-heart-cath',
        primaryPatterns: [
          'hemodynamics', 'pressure_measurements', 'cardiac_output', 'procedures',
          'imaging_modalities', 'complications'
        ],
        secondaryPatterns: ['valve_disease', 'cardiac_biomarkers'],
        excludePatterns: ['coronary_vessels', 'intervention_devices'] // Right heart focus
      },
      {
        agentType: 'investigation-summary',
        primaryPatterns: [
          'imaging_modalities', 'cardiac_biomarkers', 'valve_disease', 'coronary_vessels',
          'stenosis_severity', 'hemodynamics'
        ],
        secondaryPatterns: ['procedures', 'cardiac_medications'],
        excludePatterns: [] // Investigation summary can use most patterns
      },
      {
        agentType: 'consultation',
        primaryPatterns: [
          'symptoms', 'cardiac_biomarkers', 'imaging_modalities', 'valve_disease',
          'coronary_vessels', 'cardiac_medications', 'procedures'
        ],
        secondaryPatterns: ['hemodynamics', 'complications'],
        excludePatterns: [] // Consultation can reference all patterns
      }
    ];

    mappings.forEach(mapping => {
      this.agentMappings.set(mapping.agentType, mapping);
    });

    logger.info('Agent pattern mappings initialized', {
      agentCount: mappings.length,
      agents: mappings.map(m => m.agentType)
    });
  }

  /**
   * Add pattern to category index
   */
  private addToCategoryIndex(category: CardiologyCategory, patternId: string): void {
    if (!this.categoryIndex.has(category)) {
      this.categoryIndex.set(category, []);
    }
    this.categoryIndex.get(category)!.push(patternId);
  }

  /**
   * Get patterns for specific agent
   */
  getAgentPatterns(agentType: AgentType): CardiologyPattern[] {
    const mapping = this.agentMappings.get(agentType);
    if (!mapping) {
      return [];
    }

    const patterns: CardiologyPattern[] = [];
    
    // Add primary patterns
    mapping.primaryPatterns.forEach(patternId => {
      const pattern = this.patterns.get(patternId);
      if (pattern) {
        patterns.push(pattern);
      }
    });

    // Add secondary patterns
    mapping.secondaryPatterns.forEach(patternId => {
      const pattern = this.patterns.get(patternId);
      if (pattern) {
        patterns.push({ ...pattern, priority: pattern.priority - 10 }); // Lower priority
      }
    });

    // Add custom patterns if any
    if (mapping.customPatterns) {
      patterns.push(...mapping.customPatterns);
    }

    // Sort by priority
    return patterns.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: CardiologyCategory): CardiologyPattern[] {
    const patternIds = this.categoryIndex.get(category) || [];
    return patternIds
      .map(id => this.patterns.get(id))
      .filter(pattern => pattern !== undefined)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get shared patterns between agents
   */
  getSharedPatterns(agentTypes: AgentType[]): CardiologyPattern[] {
    const agentPatternSets = agentTypes.map(agentType => {
      const mapping = this.agentMappings.get(agentType);
      if (!mapping) return new Set<string>();
      
      return new Set([...mapping.primaryPatterns, ...mapping.secondaryPatterns]);
    });

    if (agentPatternSets.length === 0) return [];

    // Find intersection of all pattern sets
    const sharedPatternIds = agentPatternSets.reduce((intersection, currentSet) => {
      return new Set([...intersection].filter(patternId => currentSet.has(patternId)));
    });

    return Array.from(sharedPatternIds)
      .map(id => this.patterns.get(id))
      .filter(pattern => pattern !== undefined)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all available patterns
   */
  getAllPatterns(): CardiologyPattern[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): CardiologyPattern | undefined {
    return this.patterns.get(patternId);
  }

  /**
   * Get all categories
   */
  getCategories(): CardiologyCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * Search patterns by description or clinical context
   */
  searchPatterns(query: string): CardiologyPattern[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.patterns.values()).filter(pattern => 
      pattern.description.toLowerCase().includes(lowerQuery) ||
      pattern.clinicalContext?.toLowerCase().includes(lowerQuery) ||
      pattern.examples.some(example => example.toLowerCase().includes(lowerQuery)) ||
      pattern.relatedTerms?.some(term => term.toLowerCase().includes(lowerQuery))
    ).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get pattern statistics for monitoring
   */
  getRegistryStats(): {
    totalPatterns: number;
    categoryCounts: Record<CardiologyCategory, number>;
    agentMappings: Record<AgentType, { primary: number; secondary: number; excluded: number }>;
    highPriorityPatterns: number;
  } {
    const categoryCounts = {} as Record<CardiologyCategory, number>;
    this.categoryIndex.forEach((patterns, category) => {
      categoryCounts[category] = patterns.length;
    });

    const agentMappings = {} as Record<AgentType, { primary: number; secondary: number; excluded: number }>;
    this.agentMappings.forEach((mapping, agentType) => {
      agentMappings[agentType] = {
        primary: mapping.primaryPatterns.length,
        secondary: mapping.secondaryPatterns.length,
        excluded: mapping.excludePatterns?.length || 0
      };
    });

    const highPriorityPatterns = Array.from(this.patterns.values())
      .filter(pattern => pattern.priority >= 90).length;

    return {
      totalPatterns: this.patterns.size,
      categoryCounts,
      agentMappings,
      highPriorityPatterns
    };
  }
}

// Convenience exports
export const cardiologyRegistry = CardiologyPatternRegistry.getInstance();

// Types are already exported above as interfaces
