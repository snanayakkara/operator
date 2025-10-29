/**
 * Model Information and Metadata
 *
 * Provides information about available AI models including memory requirements,
 * performance characteristics, and recommended use cases.
 */

export interface ModelMetadata {
  /** Display name for UI */
  displayName: string;
  /** Estimated memory requirement in GB */
  memoryGB: number;
  /** Relative processing speed */
  speed: 'very-fast' | 'fast' | 'moderate' | 'slow';
  /** Relative output quality */
  quality: 'excellent' | 'very-good' | 'good' | 'basic';
  /** Recommended use cases */
  useCases: string[];
  /** Model family/type */
  family: 'medgemma' | 'qwen' | 'gemma' | 'other';
  /** Whether model supports vision/multimodal input */
  supportsVision?: boolean;
}

export const MODEL_INFO: Record<string, ModelMetadata> = {
  // MedGemma models - Medical-specialized
  'medgemma-27b-text-it-mlx': {
    displayName: 'MedGemma 27B (Best Quality)',
    memoryGB: 10,
    speed: 'slow',
    quality: 'excellent',
    useCases: [
      'Complex procedural reports (TAVI, PCI, RHC)',
      'Comprehensive AI medical review',
      'Detailed consultation notes'
    ],
    family: 'medgemma'
  },
  'medgemma-4b-it-mlx': {
    displayName: 'MedGemma 4B (Fast & Medical)',
    memoryGB: 3,
    speed: 'fast',
    quality: 'very-good',
    useCases: [
      'Quick medical letters',
      'Investigation summaries',
      'Medication lists',
      'Medical backgrounds'
    ],
    family: 'medgemma'
  },

  // Qwen models - General purpose with good speed
  'qwen/qwen3-4b-2507': {
    displayName: 'Qwen 4B (Fastest)',
    memoryGB: 3,
    speed: 'very-fast',
    quality: 'good',
    useCases: [
      'Simple formatting tasks',
      'Blood test ordering',
      'Quick clinical notes',
      'Investigation formatting'
    ],
    family: 'qwen'
  },
  'qwen/qwen3-vl-8b': {
    displayName: 'Qwen Vision 8B (Multimodal)',
    memoryGB: 5,
    speed: 'moderate',
    quality: 'very-good',
    useCases: [
      'BP diary image extraction',
      'ECG interpretation',
      'Radiology image analysis'
    ],
    family: 'qwen',
    supportsVision: true
  },

  // Gemma models
  'google/gemma-3n-e4b': {
    displayName: 'Gemma 3N (Vision-capable)',
    memoryGB: 3,
    speed: 'fast',
    quality: 'good',
    useCases: [
      'BP diary extraction (vision)',
      'Document OCR',
      'Image-based data extraction'
    ],
    family: 'gemma',
    supportsVision: true
  }
};

/**
 * Get model metadata by ID, with fallback to basic info
 */
export function getModelInfo(modelId: string): ModelMetadata {
  // Return known metadata if available
  if (MODEL_INFO[modelId]) {
    return MODEL_INFO[modelId];
  }

  // Infer basic metadata from model ID for unknown models
  const lowerId = modelId.toLowerCase();

  // Estimate memory based on parameter count in name
  let memoryGB = 4; // Default estimate
  const paramMatch = lowerId.match(/(\d+)b/);
  if (paramMatch) {
    const params = parseInt(paramMatch[1]);
    memoryGB = Math.max(2, Math.ceil(params * 0.4)); // Rough estimate: 400MB per billion params
  }

  // Infer family
  let family: ModelMetadata['family'] = 'other';
  if (lowerId.includes('medgemma')) family = 'medgemma';
  else if (lowerId.includes('qwen')) family = 'qwen';
  else if (lowerId.includes('gemma')) family = 'gemma';

  // Infer vision capability
  const supportsVision = lowerId.includes('vision') ||
                          lowerId.includes('-vl-') ||
                          lowerId.includes('multimodal');

  return {
    displayName: modelId,
    memoryGB,
    speed: 'moderate',
    quality: 'good',
    useCases: ['General text generation'],
    family,
    supportsVision
  };
}

/**
 * Get models suitable for current system memory (with safety margin)
 */
export function getModelsForAvailableMemory(
  availableMemoryGB: number,
  allModelIds: string[]
): string[] {
  // Use 80% of available memory as safe threshold
  const safeMemoryGB = availableMemoryGB * 0.8;

  return allModelIds.filter(modelId => {
    const info = getModelInfo(modelId);
    return info.memoryGB <= safeMemoryGB;
  });
}

/**
 * Get recommended fallback model for a given agent type
 */
export function getRecommendedFallbackModel(
  agentType: string,
  availableModels: string[]
): string | null {
  // Priority order for complex medical tasks
  const medicalPriority = [
    'medgemma-4b-it-mlx',
    'qwen/qwen3-4b-2507',
    'google/gemma-3n-e4b'
  ];

  // Priority order for vision tasks
  const visionPriority = [
    'qwen/qwen3-vl-8b',
    'google/gemma-3n-e4b'
  ];

  // Choose priority list based on agent type
  const priority = agentType === 'bp-diary-extraction'
    ? visionPriority
    : medicalPriority;

  // Return first available model from priority list
  for (const modelId of priority) {
    if (availableModels.includes(modelId)) {
      return modelId;
    }
  }

  // Return any available non-vision model as last resort
  return availableModels.find(m => !getModelInfo(m).supportsVision) || null;
}

/**
 * Format memory size for display
 */
export function formatMemorySize(memoryGB: number): string {
  if (memoryGB < 1) {
    return `${Math.round(memoryGB * 1024)} MB`;
  }
  return `${memoryGB.toFixed(1)} GB`;
}
