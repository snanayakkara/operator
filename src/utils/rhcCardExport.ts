/**
 * RHC Card Export Utility
 *
 * Generates high-resolution 18×10cm PNG cards from Right Heart Catheterisation data.
 * Uses html2canvas to render React components to canvas, then exports as PNG.
 *
 * Technical Specifications:
 * - Card Size: 18cm × 10cm (680px × 378px at 96 DPI)
 * - Export Resolution: 300 DPI (2126px × 1181px)
 * - Scale Factor: 3.125 (300 DPI / 96 DPI)
 * - File Format: PNG with optimal compression
 * - Designed for embedding in Xestro EMR "Findings" section
 *
 * Workflow:
 * 1. Create temporary DOM container
 * 2. Render RHCCardLayout component
 * 3. Capture with html2canvas at 300 DPI
 * 4. Convert canvas to blob
 * 5. Trigger download
 * 6. Clean up temporary elements
 */

import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { RHCCardLayout } from '@/sidepanel/components/results/RHCCardLayout';
import type { RightHeartCathReport } from '@/types/medical.types';

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
 * Exports RHC data as a high-resolution 18×10cm PNG card
 */
export async function exportRHCCard(
  rhcData: RightHeartCathReport,
  options: ExportOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 1. Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px'; // Move off-screen
      container.style.top = '0';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      // 2. Render RHCCardLayout component
      const root = createRoot(container);
      root.render(
        RHCCardLayout({
          rhcData,
          patientInfo: options.patientInfo,
          operatorInfo: options.operatorInfo
        })
      );

      // 3. Wait for rendering to complete, then capture with html2canvas
      // Use setTimeout to ensure React has finished rendering (300ms for reliable state propagation)
      setTimeout(async () => {
        try {
          const cardElement = container.firstElementChild as HTMLElement;

          if (!cardElement) {
            throw new Error('Card element not found after rendering');
          }

          // Capture at 300 DPI (scale factor: 3.125)
          // 18cm at 96 DPI = 680px
          // 18cm at 300 DPI = 2126px
          // 10cm at 96 DPI = 378px
          // 10cm at 300 DPI = 1181px
          // Scale factor = 300 / 96 = 3.125
          const canvas = await html2canvas(cardElement, {
            scale: 3.125, // 300 DPI resolution
            backgroundColor: '#FFFFFF',
            logging: false, // Disable console logs
            useCORS: true, // Handle cross-origin images if any
            allowTaint: false,
            width: 680, // 18cm at 96 DPI
            height: 378 // 10cm at 96 DPI
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
              const defaultFilename = `RHC_Card_${options.patientInfo?.mrn || timestamp}.png`;

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

              resolve();
            },
            'image/png',
            1.0 // Maximum quality
          );
        } catch (error) {
          // Clean up on error
          root.unmount();
          document.body.removeChild(container);
          reject(error);
        }
      }, 300); // 300ms delay for React rendering and state propagation
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Validates that RHC data is suitable for card export
 * More lenient validation - requires at least SOME key haemodynamic data to be present
 */
export function validateRHCDataForExport(rhcData: RightHeartCathReport): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  let hasAnyPressureData = false;
  let hasCardiacOutput = false;

  // Check pressure data - track if ANY pressure is present
  if (!rhcData.haemodynamicPressures.ra.mean && !rhcData.haemodynamicPressures.ra.aWave && !rhcData.haemodynamicPressures.ra.vWave) {
    missingFields.push('Right Atrial Pressure');
  } else {
    hasAnyPressureData = true;
  }

  if (!rhcData.haemodynamicPressures.rv.systolic && !rhcData.haemodynamicPressures.rv.diastolic) {
    missingFields.push('Right Ventricular Pressure');
  } else {
    hasAnyPressureData = true;
  }

  if (!rhcData.haemodynamicPressures.pa.systolic && !rhcData.haemodynamicPressures.pa.diastolic && !rhcData.haemodynamicPressures.pa.mean) {
    missingFields.push('Pulmonary Artery Pressure');
  } else {
    hasAnyPressureData = true;
  }

  if (!rhcData.haemodynamicPressures.pcwp.mean && !rhcData.haemodynamicPressures.pcwp.aWave && !rhcData.haemodynamicPressures.pcwp.vWave) {
    missingFields.push('PCWP');
  } else {
    hasAnyPressureData = true;
  }

  // Check cardiac output
  if (!rhcData.cardiacOutput.thermodilution.co && !rhcData.cardiacOutput.fick.co) {
    missingFields.push('Cardiac Output');
  } else {
    hasCardiacOutput = true;
  }

  // Valid if we have at least some pressure data OR cardiac output
  // This allows partial data cards to be exported
  const valid = hasAnyPressureData || hasCardiacOutput;

  return {
    valid,
    missingFields
  };
}

/**
 * Generates a blob of the card for copy-to-clipboard
 * Returns both the blob and data URL for preview
 */
export async function generateRHCCardBlob(
  rhcData: RightHeartCathReport,
  options: ExportOptions = {}
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    try {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      const root = createRoot(container);
      root.render(
        RHCCardLayout({
          rhcData,
          patientInfo: options.patientInfo,
          operatorInfo: options.operatorInfo
        })
      );

      setTimeout(async () => {
        try {
          const cardElement = container.firstElementChild as HTMLElement;

          if (!cardElement) {
            throw new Error('Card element not found after rendering');
          }

          const canvas = await html2canvas(cardElement, {
            scale: 3.125, // 300 DPI for high-quality copy
            backgroundColor: '#FFFFFF',
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: 680, // 18cm at 96 DPI
            height: 378 // 10cm at 96 DPI
          });

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create image blob'));
                return;
              }

              const dataUrl = canvas.toDataURL('image/png');

              // Clean up
              root.unmount();
              document.body.removeChild(container);

              resolve({ blob, dataUrl });
            },
            'image/png',
            1.0
          );
        } catch (error) {
          root.unmount();
          document.body.removeChild(container);
          reject(error);
        }
      }, 300); // 300ms delay for React rendering and state propagation
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a preview of the card without downloading
 * Useful for showing users what the card will look like
 */
export async function previewRHCCard(
  rhcData: RightHeartCathReport,
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

      // Render RHCCardLayout component
      const root = createRoot(container);
      root.render(
        RHCCardLayout({
          rhcData,
          patientInfo: options.patientInfo,
          operatorInfo: options.operatorInfo
        })
      );

      // Wait for rendering, then capture
      setTimeout(async () => {
        try {
          const cardElement = container.firstElementChild as HTMLElement;

          if (!cardElement) {
            throw new Error('Card element not found after rendering');
          }

          const canvas = await html2canvas(cardElement, {
            scale: 1, // Lower resolution for preview
            backgroundColor: '#FFFFFF',
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: 680, // 18cm at 96 DPI
            height: 378 // 10cm at 96 DPI
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
      }, 300); // 300ms delay for React rendering and state propagation
    } catch (error) {
      reject(error);
    }
  });
}
