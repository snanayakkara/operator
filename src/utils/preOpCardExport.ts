/**
 * Pre-Op Card Export Utility
 *
 * Generates high-resolution A5 (14.8×21cm) PNG cards from Pre-Op Plan data.
 * Uses html2canvas to render React components to canvas, then exports as PNG.
 * Supports both clipboard copy and file download.
 *
 * Technical Specifications:
 * - Card Size: 14.8cm × 21cm (A5 portrait, 557px × 791px at 96 DPI)
 * - Export Resolution: 300 DPI (1748px × 2480px)
 * - Scale Factor: 3.14 (300 DPI / 96 DPI)
 * - File Format: PNG with optimal compression
 *
 * Workflow:
 * 1. Create temporary DOM container
 * 2. Render PreOpCardLayout component
 * 3. Capture with html2canvas at 300 DPI
 * 4. Convert canvas to blob
 * 5. Either copy to clipboard OR trigger download
 * 6. Clean up temporary elements
 */

import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { PreOpCardLayout } from '@/sidepanel/components/results/PreOpCardLayout';
import type { PreOpProcedureType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

interface PreOpCardData {
  procedureType: PreOpProcedureType;
  cardMarkdown: string;
  jsonData: any;
  completenessScore?: string;
}

interface ExportOptions {
  patientInfo?: {
    name?: string;
    mrn?: string;
    dob?: string;
  };
  operatorInfo?: {
    operator?: string;
    institution?: string;
    date?: string;
  };
  filename?: string;
}

/**
 * Copies Pre-Op card as high-resolution PNG to clipboard
 */
export async function copyPreOpCardToClipboard(
  cardData: PreOpCardData,
  options: ExportOptions = {}
): Promise<void> {
  logger.info('PreOpCardExport: Starting clipboard copy', {
    procedureType: cardData.procedureType,
    component: 'pre-op-card-export'
  });

  return new Promise((resolve, reject) => {
    try {
      // 1. Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px'; // Move off-screen
      container.style.top = '0';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      // 2. Render PreOpCardLayout component
      const root = createRoot(container);
      root.render(
        PreOpCardLayout({
          procedureType: cardData.procedureType,
          cardMarkdown: cardData.cardMarkdown,
          jsonData: cardData.jsonData,
          completenessScore: cardData.completenessScore,
          patientInfo: options.patientInfo,
          operatorInfo: options.operatorInfo
        })
      );

      // 3. Wait for rendering to complete, then capture with html2canvas
      setTimeout(async () => {
        try {
          const cardElement = container.querySelector('div') as HTMLElement;

          if (!cardElement) {
            throw new Error('Card element not found after rendering');
          }

          // Capture at 300 DPI (scale factor: 3.14)
          // A5 at 96 DPI = 557px × 791px
          // A5 at 300 DPI = 1748px × 2480px
          // Scale factor = 300 / 96 ≈ 3.14
          const canvas = await html2canvas(cardElement, {
            scale: 3.14, // 300 DPI resolution
            backgroundColor: '#FFFFFF',
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: 557, // 14.8cm at 96 DPI
            height: 791 // 21cm at 96 DPI
          });

          logger.info('PreOpCardExport: Canvas captured successfully', {
            width: canvas.width,
            height: canvas.height,
            component: 'pre-op-card-export'
          });

          // 4. Convert canvas to blob
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error('Failed to create image blob'));
                return;
              }

              try {
                // 5. Copy to clipboard using ClipboardItem API
                const clipboardItem = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([clipboardItem]);

                logger.info('PreOpCardExport: Image copied to clipboard', {
                  blobSize: blob.size,
                  component: 'pre-op-card-export'
                });

                // 6. Clean up temporary elements
                root.unmount();
                document.body.removeChild(container);

                resolve();
              } catch (clipboardError) {
                // Clean up on error
                root.unmount();
                document.body.removeChild(container);

                logger.error('PreOpCardExport: Clipboard write failed', {
                  error: clipboardError instanceof Error ? clipboardError.message : String(clipboardError),
                  component: 'pre-op-card-export'
                });

                reject(new Error('Failed to copy image to clipboard. Please check browser permissions.'));
              }
            },
            'image/png',
            1.0 // Maximum quality
          );
        } catch (error) {
          // Clean up on error
          root.unmount();
          document.body.removeChild(container);

          logger.error('PreOpCardExport: Canvas capture failed', {
            error: error instanceof Error ? error.message : String(error),
            component: 'pre-op-card-export'
          });

          reject(error);
        }
      }, 100); // 100ms delay for React rendering
    } catch (error) {
      logger.error('PreOpCardExport: Setup failed', {
        error: error instanceof Error ? error.message : String(error),
        component: 'pre-op-card-export'
      });

      reject(error);
    }
  });
}

/**
 * Downloads Pre-Op card as high-resolution PNG file
 */
export async function downloadPreOpCard(
  cardData: PreOpCardData,
  options: ExportOptions = {}
): Promise<void> {
  logger.info('PreOpCardExport: Starting download', {
    procedureType: cardData.procedureType,
    component: 'pre-op-card-export'
  });

  return new Promise((resolve, reject) => {
    try {
      // 1. Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      // 2. Render PreOpCardLayout component
      const root = createRoot(container);
      root.render(
        PreOpCardLayout({
          procedureType: cardData.procedureType,
          cardMarkdown: cardData.cardMarkdown,
          jsonData: cardData.jsonData,
          completenessScore: cardData.completenessScore,
          patientInfo: options.patientInfo,
          operatorInfo: options.operatorInfo
        })
      );

      // 3. Wait for rendering, then capture
      setTimeout(async () => {
        try {
          const cardElement = container.querySelector('div') as HTMLElement;

          if (!cardElement) {
            throw new Error('Card element not found after rendering');
          }

          const canvas = await html2canvas(cardElement, {
            scale: 3.14,
            backgroundColor: '#FFFFFF',
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: 557,
            height: 791
          });

          // 4. Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create image blob'));
                return;
              }

              // 5. Trigger download
              const url = URL.createObjectURL(blob);
              const downloadLink = document.createElement('a');
              const timestamp = new Date().toISOString().split('T')[0];
              const procedureLabel = cardData.procedureType.toLowerCase().replace(/_/g, '-');
              const defaultFilename = `PreOp_${procedureLabel}_${options.patientInfo?.mrn || timestamp}.png`;

              downloadLink.href = url;
              downloadLink.download = options.filename || defaultFilename;
              downloadLink.style.display = 'none';
              document.body.appendChild(downloadLink);
              downloadLink.click();

              // Clean up download link
              setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
              }, 100);

              // 6. Clean up temporary elements
              root.unmount();
              document.body.removeChild(container);

              logger.info('PreOpCardExport: Download completed', {
                filename: defaultFilename,
                component: 'pre-op-card-export'
              });

              resolve();
            },
            'image/png',
            1.0
          );
        } catch (error) {
          // Clean up on error
          root.unmount();
          document.body.removeChild(container);

          logger.error('PreOpCardExport: Download failed', {
            error: error instanceof Error ? error.message : String(error),
            component: 'pre-op-card-export'
          });

          reject(error);
        }
      }, 100);
    } catch (error) {
      logger.error('PreOpCardExport: Setup failed', {
        error: error instanceof Error ? error.message : String(error),
        component: 'pre-op-card-export'
      });

      reject(error);
    }
  });
}

/**
 * Validates Pre-Op data for card export with warning mode
 *
 * Now uses a warning system instead of blocking:
 * - Returns warnings for missing fields but allows export to proceed
 * - Only blocks if data is completely empty (no fields at all)
 * - Calculates completeness percentage for user awareness
 */
export function validatePreOpDataForExport(cardData: PreOpCardData): {
  valid: boolean;
  missingFields: string[];
  hasAnyData: boolean;
  completenessPercent: number;
  warningMessage?: string;
} {
  const missingFields: string[] = [];
  const fields = cardData.jsonData?.fields || {};

  // Check if we have ANY data at all
  const fieldValues = Object.values(fields);
  const hasAnyData = fieldValues.length > 0 &&
    fieldValues.some(v => v && v !== 'Not specified' && v !== '' && v !== 'parsing_error');

  // Check procedure-specific required fields
  const requiredFieldsByType: Record<PreOpProcedureType, string[]> = {
    'ANGIOGRAM_OR_PCI': ['procedure', 'indication', 'primary_access', 'nok_name'],
    'RIGHT_HEART_CATH': ['procedure', 'indication', 'access_site', 'nok_name'],
    'TAVI': ['procedure', 'indication', 'primary_access', 'valve_type_size', 'nok_name'],
    'MITRAL_TEER': ['procedure', 'indication', 'access_site', 'transeptal_catheter', 'nok_name']
  };

  const requiredFields = requiredFieldsByType[cardData.procedureType] || [];

  // Track present fields for completeness calculation
  let presentCount = 0;

  for (const field of requiredFields) {
    const value = fields[field];
    if (!value || value === 'Not specified' || value === '') {
      missingFields.push(field.replace(/_/g, ' '));
    } else {
      presentCount++;
    }
  }

  // Calculate completeness percentage
  const completenessPercent = requiredFields.length > 0
    ? Math.round((presentCount / requiredFields.length) * 100)
    : 100;

  // Generate warning message if incomplete
  let warningMessage: string | undefined;
  if (missingFields.length > 0) {
    warningMessage = `Card is ${completenessPercent}% complete. Missing fields: ${missingFields.join(', ')}. Export will proceed with available data.`;
  }

  // Only block if we have NO data at all (completely empty)
  // Otherwise allow export with warnings
  return {
    valid: hasAnyData,
    missingFields,
    hasAnyData,
    completenessPercent,
    warningMessage
  };
}

/**
 * Generates a preview of the card without exporting
 * Useful for showing users what the card will look like
 */
export async function previewPreOpCard(
  cardData: PreOpCardData,
  options: ExportOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      // Render PreOpCardLayout component
      const root = createRoot(container);
      root.render(
        PreOpCardLayout({
          procedureType: cardData.procedureType,
          cardMarkdown: cardData.cardMarkdown,
          jsonData: cardData.jsonData,
          completenessScore: cardData.completenessScore,
          patientInfo: options.patientInfo,
          operatorInfo: options.operatorInfo
        })
      );

      // Wait for rendering, then capture
      setTimeout(async () => {
        try {
          const cardElement = container.querySelector('div') as HTMLElement;

          if (!cardElement) {
            throw new Error('Card element not found after rendering');
          }

          const canvas = await html2canvas(cardElement, {
            scale: 1, // Lower resolution for preview
            backgroundColor: '#FFFFFF',
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: 557,
            height: 791
          });

          // Convert to data URL for preview
          const dataUrl = canvas.toDataURL('image/png');

          // Clean up
          root.unmount();
          document.body.removeChild(container);

          resolve(dataUrl);
        } catch (error) {
          root.unmount();
          document.body.removeChild(container);
          reject(error);
        }
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
}
