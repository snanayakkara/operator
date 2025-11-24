/**
 * Investigation Image Extractor Service
 *
 * Extracts medical investigation findings from report images using a vision-capable OCR model.
 * Used by the Investigation Summary agent to process photos/screenshots of medical reports.
 */

import { LMStudioService } from './LMStudioService';
import { logger } from '@/utils/Logger';

export interface InvestigationExtractionResult {
  success: boolean;
  extractedText: string;
  investigationType: string;
  investigationDate: string;
  error?: string;
  processingTime: number;
  rawResponse?: string;
}

export const INVESTIGATION_TYPES = [
  { value: 'TTE', label: 'TTE (Transthoracic Echo)' },
  { value: 'TOE', label: 'TOE (Transoesophageal Echo)' },
  { value: 'CTCA', label: 'CTCA (CT Coronary Angiogram)' },
  { value: 'Stress Echo', label: 'Stress Echo' },
  { value: 'ECG', label: 'ECG' },
  { value: 'Holter', label: 'Holter Monitor' },
  { value: 'CXR', label: 'Chest X-ray' },
  { value: 'RHC', label: 'RHC (Right Heart Cath)' },
  { value: 'Coronary Angiogram', label: 'Coronary Angiogram' },
  { value: 'Bloods', label: 'Blood Tests' },
  { value: 'Calcium Score', label: 'Calcium Score' },
  { value: 'MRI Cardiac', label: 'Cardiac MRI' },
  { value: 'Custom', label: 'Custom (specify below)' }
] as const;

export type InvestigationType = typeof INVESTIGATION_TYPES[number]['value'];

export class InvestigationImageExtractor {
  private static instance: InvestigationImageExtractor;
  private lmStudioService: LMStudioService;

  private constructor() {
    this.lmStudioService = LMStudioService.getInstance();
  }

  public static getInstance(): InvestigationImageExtractor {
    if (!InvestigationImageExtractor.instance) {
      InvestigationImageExtractor.instance = new InvestigationImageExtractor();
    }
    return InvestigationImageExtractor.instance;
  }

  /**
   * Expose default OCR model used for vision processing.
   */
  public getDefaultOCRModel(): string {
    return this.lmStudioService.getDefaultOCRModel();
  }

  /**
   * Extract investigation findings from an image
   * @param imageDataUrl - Base64 encoded image data URL
   * @param investigationType - Type of investigation (TTE, TOE, CTCA, etc.)
   * @param investigationDate - Date of the investigation (DD/MM/YYYY format)
   * @param signal - Optional AbortSignal for cancellation
   * @param modelOverride - Optional model name to use instead of default
   */
  public async extractFromImage(
    imageDataUrl: string,
    investigationType: string,
    investigationDate: string,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<InvestigationExtractionResult> {
    const startTime = Date.now();

    try {
      const defaultModel = this.getDefaultOCRModel();
      const ocrModel = modelOverride || defaultModel;

      // Validate image format and size
      const validationError = this.validateImage(imageDataUrl);
      if (validationError) {
        return {
          success: false,
          extractedText: '',
          investigationType,
          investigationDate,
          error: validationError,
          processingTime: Date.now() - startTime
        };
      }

      logger.info('Starting investigation image extraction', {
        component: 'investigation-image-extractor',
        imageSize: imageDataUrl.length,
        imageSizeMB: (imageDataUrl.length / (1024 * 1024)).toFixed(2),
        investigationType,
        investigationDate,
        model: ocrModel
      });

      // Build extraction prompt
      const textPrompt = this.buildExtractionPrompt(investigationType);

      // Call LM Studio vision API
      const response = await this.lmStudioService.processWithVisionAgent(
        this.getSystemPrompt(investigationType),
        textPrompt,
        imageDataUrl,
        'investigation-image-extraction',
        signal,
        ocrModel
      );

      logger.info('Received LM Studio response', {
        component: 'investigation-image-extractor',
        responseLength: response.length,
        responsePreview: response.substring(0, 100)
      });

      // Check for empty response
      const trimmedResponse = response.trim();
      if (trimmedResponse === '' || trimmedResponse.length < 10) {
        logger.warn('Vision model returned empty response', {
          component: 'investigation-image-extractor',
          response: trimmedResponse,
          modelUsed: ocrModel
        });

        return {
          success: false,
          extractedText: '',
          investigationType,
          investigationDate,
          error: `Vision model could not extract any findings from the image. This may indicate:\n\n` +
                 `1. The image quality may be too poor for the model to read\n` +
                 `2. The model (${ocrModel}) may not be properly loaded with vision support\n` +
                 `3. The image may not contain recognizable medical report data\n\n` +
                 `Try:\n` +
                 `- Using a clearer photo with better lighting\n` +
                 `- Ensuring the entire report is visible in the image\n` +
                 `- Using a different vision-capable model`,
          processingTime: Date.now() - startTime
        };
      }

      const processingTime = Date.now() - startTime;

      logger.info('Investigation image extraction complete', {
        component: 'investigation-image-extractor',
        extractedLength: trimmedResponse.length,
        processingTime,
        modelUsed: ocrModel
      });

      return {
        success: true,
        extractedText: trimmedResponse,
        investigationType,
        investigationDate,
        rawResponse: response,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Investigation image extraction failed', {
        component: 'investigation-image-extractor',
        error: errorMessage,
        processingTime
      });

      return {
        success: false,
        extractedText: '',
        investigationType,
        investigationDate,
        error: errorMessage,
        processingTime
      };
    }
  }

  /**
   * System prompt for investigation image extraction
   */
  private getSystemPrompt(investigationType: string): string {
    return `You are a medical data extraction specialist with vision capabilities, specialized in reading and extracting findings from ${investigationType} medical reports.

Your task is to:
1. LOOK AT the provided image carefully and identify all medical findings
2. Extract key measurements, values, and clinical observations
3. Preserve medical terminology and abbreviations (e.g., LV, RV, EF, LVEDD, LVESD, GLS, TAPSE, TR, MR, AR)
4. Maintain numerical values with their units (mmHg, cm, mL, %, etc.)
5. Extract both normal and abnormal findings
6. Preserve the structure of findings (e.g., chamber sizes, valve function, pressures)

Output format:
- Return the extracted findings as clear, readable text
- Use natural language that can be spoken (as if dictating the report)
- Do NOT use JSON, tables, or code blocks
- Include all relevant clinical information visible in the report
- Preserve severity descriptors (mild, moderate, severe)
- Include any conclusions or impressions from the report

If the image is unclear or unreadable, describe what you can see and indicate which parts are unclear.`;
  }

  /**
   * Build the extraction prompt for vision analysis
   */
  private buildExtractionPrompt(investigationType: string): string {
    const typeSpecificInstructions = this.getTypeSpecificInstructions(investigationType);

    return `VISION TASK: You are analyzing a ${investigationType} medical report image. Extract all relevant findings.

${typeSpecificInstructions}

EXTRACTION GUIDELINES:
1. Read the entire report from top to bottom
2. Extract ALL measurements and values with their units
3. Note all normal AND abnormal findings
4. Preserve medical abbreviations (do not expand them)
5. Include severity descriptors (mild, moderate, severe, trivial)
6. Extract any conclusions or clinical impressions

OUTPUT FORMAT:
- Write the findings as clear text that could be dictated
- Use natural sentence structure
- Group related findings together
- Include all relevant clinical information
- Do NOT use JSON, markdown formatting, or tables

Now, examine the provided image and extract all visible medical findings.`;
  }

  /**
   * Get type-specific extraction instructions
   */
  private getTypeSpecificInstructions(investigationType: string): string {
    const instructions: Record<string, string> = {
      'TTE': `FOCUS ON:
- LV size and function (LVEDD, LVESD, EF, GLS)
- RV size and function (TAPSE, RV S')
- Chamber sizes (LA, RA volumes/dimensions)
- Valve function (MR, TR, AR, PR grades)
- Valve gradients and areas
- Diastolic function parameters
- Pericardium and any effusions
- Wall motion abnormalities`,

      'TOE': `FOCUS ON:
- Valve morphology and function
- LA appendage (thrombus, flow velocities)
- Interatrial septum (PFO, ASD)
- Mitral valve details (leaflet pathology, regurgitation mechanism)
- Prosthetic valve assessment
- Endocarditis findings
- Aortic pathology`,

      'CTCA': `FOCUS ON:
- Coronary artery stenoses (vessel, location, severity %)
- Plaque characterisation (calcified, mixed, non-calcified)
- Calcium score (Agatston)
- Anomalies or variants
- Non-coronary findings
- Technical quality`,

      'Stress Echo': `FOCUS ON:
- Resting LV function and wall motion
- Peak stress response
- New or worsening wall motion abnormalities
- Exercise capacity (METs, duration, stage)
- Symptoms during test
- ECG changes
- Blood pressure and heart rate response`,

      'RHC': `FOCUS ON:
- Right atrial pressure (mean)
- RV pressures (systolic, diastolic)
- PA pressures (systolic, diastolic, mean)
- PCWP
- Cardiac output/index (Fick/thermodilution)
- PVR and SVR
- Oxygen saturations
- Any shunt quantification`,

      'Bloods': `FOCUS ON:
- Full blood count values
- Renal function (Cr, eGFR, urea)
- Electrolytes
- Liver function tests
- Lipid profile
- Cardiac biomarkers (troponin, BNP/NT-proBNP)
- HbA1c, glucose
- Inflammatory markers
- Any flagged abnormal values`
    };

    return instructions[investigationType] || `FOCUS ON:
- Key measurements and values
- Normal and abnormal findings
- Clinical conclusions
- Any diagnostic impressions`;
  }

  /**
   * Validate image format and size
   */
  private validateImage(imageDataUrl: string): string | null {
    if (!imageDataUrl || imageDataUrl.length === 0) {
      return 'No image data provided';
    }

    if (!imageDataUrl.startsWith('data:image/')) {
      return 'Invalid image format. Expected data URL starting with "data:image/"';
    }

    const imageType = imageDataUrl.substring(5, imageDataUrl.indexOf(';'));
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(imageType)) {
      return `Unsupported image type: ${imageType}. Supported types: JPEG, PNG, WebP`;
    }

    const sizeInBytes = imageDataUrl.length;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 10) {
      return `Image too large (${sizeInMB.toFixed(1)}MB). Maximum size is 10MB. Please compress or resize the image.`;
    }

    if (sizeInMB > 5) {
      logger.warn('Large image detected', {
        component: 'investigation-image-extractor',
        sizeMB: sizeInMB.toFixed(2),
        message: 'Image is large and may take longer to process'
      });
    }

    return null;
  }

  /**
   * Format date from DD/MM/YYYY to the format expected by Investigation Summary agent
   */
  public formatDateForAgent(dateString: string): string {
    // Parse DD/MM/YYYY
    const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) {
      return dateString; // Return as-is if not matching expected format
    }

    const [, day, month, year] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;

    return `${parseInt(day, 10)} ${monthNames[monthIndex]} ${year}`;
  }
}
