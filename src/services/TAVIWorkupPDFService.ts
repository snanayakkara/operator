/**
 * TAVI Workup PDF Export Service - Phase 8.4
 *
 * Generates PDF reports from TAVI workup data using jsPDF.
 * Creates a structured, print-friendly document with:
 * - Patient header and metadata
 * - CT measurements table
 * - Valve sizing recommendation
 * - Workup sections
 * - Captured DICOM snapshots
 */

import jsPDF from 'jspdf';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';
import { ValveSizingServiceV2, type ValveSelection } from './ValveSizingServiceV2';

// PDF Configuration
const PDF_CONFIG = {
  pageWidth: 210, // A4 width in mm
  pageHeight: 297, // A4 height in mm
  margin: 15,
  headerHeight: 25,
  footerHeight: 10,
  lineHeight: 6,
  sectionGap: 8,
  fontSize: {
    title: 16,
    heading: 12,
    subheading: 10,
    body: 9,
    small: 8
  },
  colors: {
    primary: [79, 70, 229] as [number, number, number], // Purple
    secondary: [107, 114, 128] as [number, number, number], // Gray
    accent: [16, 185, 129] as [number, number, number], // Emerald
    danger: [239, 68, 68] as [number, number, number], // Red
    text: [31, 41, 55] as [number, number, number], // Dark gray
    lightGray: [243, 244, 246] as [number, number, number]
  }
};

export class TAVIWorkupPDFService {
  private static instance: TAVIWorkupPDFService;
  private valveSizingService = ValveSizingServiceV2.getInstance();

  static getInstance(): TAVIWorkupPDFService {
    if (!TAVIWorkupPDFService.instance) {
      TAVIWorkupPDFService.instance = new TAVIWorkupPDFService();
    }
    return TAVIWorkupPDFService.instance;
  }

  /**
   * Generate PDF blob from workup data
   */
  async generatePDF(workup: TAVIWorkupItem): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPos = PDF_CONFIG.margin;

    // Add header
    yPos = this.addHeader(doc, workup, yPos);

    // Add patient info section
    yPos = this.addPatientInfo(doc, workup, yPos);

    // Add CT measurements if present
    if (workup.ctMeasurements) {
      yPos = this.addCTMeasurements(doc, workup.ctMeasurements, yPos);
    }

    // Add valve recommendation if CT measurements present
    if (workup.ctMeasurements?.annulusArea && workup.ctMeasurements?.annulusPerimeter) {
      yPos = this.addValveRecommendation(doc, workup, yPos);
    }

    // Add workup sections
    yPos = this.addWorkupSections(doc, workup, yPos);

    // Add snapshots if present (new page)
    if (workup.snapshots && workup.snapshots.length > 0) {
      doc.addPage();
      this.addSnapshotsPage(doc, workup);
    }

    // Add footer to all pages
    this.addFooters(doc, workup);

    return doc.output('blob');
  }

  /**
   * Download PDF with filename
   */
  async downloadPDF(workup: TAVIWorkupItem): Promise<void> {
    const blob = await this.generatePDF(workup);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = this.generateFilename(workup);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  private generateFilename(workup: TAVIWorkupItem): string {
    const patientName = workup.patient.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    return `TAVI_Workup_${patientName}_${date}.pdf`;
  }

  private addHeader(doc: jsPDF, workup: TAVIWorkupItem, yPos: number): number {
    const { margin, pageWidth, colors, fontSize } = PDF_CONFIG;
    const contentWidth = pageWidth - 2 * margin;

    // Purple header bar
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos, contentWidth, 12, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize.title);
    doc.setTextColor(255, 255, 255);
    doc.text('TAVI Workup Report', margin + 4, yPos + 8);

    // Status badge
    const status = workup.status.toUpperCase();
    const statusColor = workup.status === 'presented' ? colors.accent :
                        workup.status === 'ready' ? colors.primary : colors.secondary;
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - margin - 25, yPos + 2, 22, 8, 2, 2, 'F');
    doc.setFontSize(fontSize.small);
    doc.text(status, pageWidth - margin - 14, yPos + 7, { align: 'center' });

    return yPos + 18;
  }

  private addPatientInfo(doc: jsPDF, workup: TAVIWorkupItem, yPos: number): number {
    const { margin, colors, fontSize, lineHeight } = PDF_CONFIG;

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize.heading);
    doc.setTextColor(...colors.text);
    doc.text('Patient Information', margin, yPos);
    yPos += lineHeight + 2;

    // Patient name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize.subheading);
    doc.text(workup.patient, margin, yPos);
    yPos += lineHeight;

    // Metadata grid
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize.body);
    doc.setTextColor(...colors.secondary);

    const metadata = [
      workup.procedureDate ? `Procedure: ${this.formatDate(workup.procedureDate)}` : null,
      workup.referralDate ? `Referral: ${this.formatDate(workup.referralDate)}` : null,
      workup.referrer ? `Referrer: ${workup.referrer}` : null,
      workup.location ? `Location: ${workup.location}` : null,
      workup.category ? `Category: ${workup.category}` : null
    ].filter(Boolean) as string[];

    metadata.forEach(item => {
      doc.text(item, margin, yPos);
      yPos += lineHeight - 1;
    });

    return yPos + PDF_CONFIG.sectionGap;
  }

  private addCTMeasurements(doc: jsPDF, ct: TAVIWorkupCTMeasurements, yPos: number): number {
    const { margin, pageWidth, colors, fontSize, lineHeight } = PDF_CONFIG;
    const contentWidth = pageWidth - 2 * margin;

    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = PDF_CONFIG.margin;
    }

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize.heading);
    doc.setTextColor(...colors.text);
    doc.text('CT Measurements', margin, yPos);
    yPos += lineHeight + 2;

    // Background box
    doc.setFillColor(...colors.lightGray);
    doc.rect(margin, yPos - 2, contentWidth, 40, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize.body);
    doc.setTextColor(...colors.text);

    const col1X = margin + 3;
    const col2X = margin + contentWidth / 2;
    let rowY = yPos + 4;

    // Annulus measurements
    const area = ct.annulusArea ?? ct.annulusAreaMm2;
    const perimeter = ct.annulusPerimeter ?? ct.annulusPerimeterMm;
    if (area || perimeter) {
      doc.setFont('helvetica', 'bold');
      doc.text('Annulus', col1X, rowY);
      doc.setFont('helvetica', 'normal');
      rowY += lineHeight - 1;

      if (area) {
        doc.text(`Area: ${area.toFixed(0)} mm²`, col1X, rowY);
      }
      if (perimeter) {
        doc.text(`Perimeter: ${perimeter.toFixed(1)} mm`, col2X, rowY);
      }
      rowY += lineHeight - 1;

      if (ct.annulusMaxDiameterMm && ct.annulusMinDiameterMm) {
        doc.text(`Diameters: ${ct.annulusMinDiameterMm.toFixed(1)} × ${ct.annulusMaxDiameterMm.toFixed(1)} mm`, col1X, rowY);
      }
      rowY += lineHeight;
    }

    // Coronary heights
    const lmHeight = ct.coronaryHeights?.leftMainMm;
    const rcaHeight = ct.coronaryHeights?.rightCoronaryMm;
    if (lmHeight || rcaHeight) {
      doc.setFont('helvetica', 'bold');
      doc.text('Coronary Heights', col1X, rowY);
      doc.setFont('helvetica', 'normal');
      rowY += lineHeight - 1;

      if (lmHeight) {
        doc.text(`LM: ${lmHeight.toFixed(1)} mm`, col1X, rowY);
      }
      if (rcaHeight) {
        doc.text(`RCA: ${rcaHeight.toFixed(1)} mm`, col2X, rowY);
      }
      rowY += lineHeight;
    }

    // Access vessels
    const rightCFA = ct.accessVessels?.rightCFAmm;
    const leftCFA = ct.accessVessels?.leftCFAmm;
    if (rightCFA || leftCFA) {
      doc.setFont('helvetica', 'bold');
      doc.text('Access', col1X, rowY);
      doc.setFont('helvetica', 'normal');
      rowY += lineHeight - 1;

      const accessParts: string[] = [];
      if (rightCFA) accessParts.push(`R CFA: ${rightCFA.toFixed(1)}mm`);
      if (leftCFA) accessParts.push(`L CFA: ${leftCFA.toFixed(1)}mm`);
      doc.text(accessParts.join('  |  '), col1X, rowY);
    }

    return yPos + 46;
  }

  private addValveRecommendation(doc: jsPDF, workup: TAVIWorkupItem, yPos: number): number {
    const { margin, pageWidth, colors, fontSize, lineHeight } = PDF_CONFIG;
    const contentWidth = pageWidth - 2 * margin;

    if (!workup.ctMeasurements?.annulusArea || !workup.ctMeasurements?.annulusPerimeter) {
      return yPos;
    }

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize.heading);
    doc.setTextColor(...colors.text);
    doc.text('Valve Recommendation', margin, yPos);
    yPos += lineHeight + 2;

    // Get best valve per brand
    const area = workup.ctMeasurements.annulusArea;
    const perimeter = workup.ctMeasurements.annulusPerimeter;
    const bestPerBrand = this.valveSizingService.getBestValvePerBrand(area, perimeter);

    // Recommendation box
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.rect(margin, yPos - 2, contentWidth, 28, 'F');

    let boxY = yPos + 4;
    doc.setFontSize(fontSize.body);

    // Show selected valve or AI recommendation
    if (workup.selectedValve) {
      const manufacturer = this.valveSizingService.getManufacturer(workup.selectedValve.brand);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(`Selected: ${manufacturer.displayName} ${workup.selectedValve.size}mm`, margin + 3, boxY);
      boxY += lineHeight - 1;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.secondary);
      doc.text(`Selected by ${workup.selectedValve.selectedBy === 'ai' ? 'AI' : 'user'}`, margin + 3, boxY);
    } else {
      // Show best valves
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.accent);
      doc.text('Best Options:', margin + 3, boxY);
      boxY += lineHeight - 1;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);

      const brandOrder = this.valveSizingService.getBrandOrder();
      const recommendations: string[] = [];

      for (const brand of brandOrder) {
        const result = bestPerBrand[brand];
        if (result) {
          const manufacturer = this.valveSizingService.getManufacturer(brand);
          const optimal = result.isOptimal ? ' ✓' : '';
          recommendations.push(`${manufacturer.displayName} ${result.size}mm (${result.oversizing.toFixed(0)}%)${optimal}`);
        }
      }

      // Show first two recommendations
      doc.text(recommendations.slice(0, 2).join('  |  '), margin + 3, boxY);
      boxY += lineHeight - 1;
      if (recommendations.length > 2) {
        doc.text(recommendations.slice(2).join('  |  '), margin + 3, boxY);
      }
    }

    return yPos + 34;
  }

  private addWorkupSections(doc: jsPDF, workup: TAVIWorkupItem, yPos: number): number {
    const { margin, pageWidth, colors, fontSize, lineHeight, sectionGap } = PDF_CONFIG;
    const contentWidth = pageWidth - 2 * margin;
    const sections = workup.structuredSections;

    const sectionOrder: Array<{ key: keyof typeof sections; label: string }> = [
      { key: 'clinical', label: 'Clinical Presentation' },
      { key: 'echocardiography', label: 'Echocardiography' },
      { key: 'background', label: 'Background' },
      { key: 'medications', label: 'Medications' },
      { key: 'investigations', label: 'Investigations' },
      { key: 'procedure_planning', label: 'Procedure Planning' },
      { key: 'alerts', label: 'Alerts & Precautions' }
    ];

    for (const { key, label } of sectionOrder) {
      const section = sections[key];
      if (!section || !('content' in section) || !section.content || section.content === 'Not provided') {
        continue;
      }

      // Check for new page
      if (yPos > 260) {
        doc.addPage();
        yPos = PDF_CONFIG.margin;
      }

      // Section title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize.subheading);
      doc.setTextColor(...colors.primary);
      doc.text(label, margin, yPos);
      yPos += lineHeight;

      // Section content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize.body);
      doc.setTextColor(...colors.text);

      const lines = doc.splitTextToSize(section.content, contentWidth);
      for (const line of lines) {
        if (yPos > 280) {
          doc.addPage();
          yPos = PDF_CONFIG.margin;
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight - 2;
      }

      yPos += sectionGap;
    }

    return yPos;
  }

  private addSnapshotsPage(doc: jsPDF, workup: TAVIWorkupItem): void {
    const { margin, pageWidth, colors, fontSize, lineHeight } = PDF_CONFIG;
    const snapshots = workup.snapshots || [];

    if (snapshots.length === 0) return;

    let yPos = margin;

    // Page title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize.heading);
    doc.setTextColor(...colors.text);
    doc.text('CT Image Snapshots', margin, yPos);
    yPos += lineHeight + 4;

    // Grid layout for snapshots (2 columns)
    const imageWidth = (pageWidth - 2 * margin - 10) / 2;
    const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio

    snapshots.forEach((snapshot, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + col * (imageWidth + 10);
      const y = yPos + row * (imageHeight + 20);

      // Check for new page
      if (y + imageHeight > 280) {
        doc.addPage();
        yPos = margin;
        return;
      }

      try {
        // Add image
        const imgData = snapshot.thumbnailData || snapshot.imageData;
        if (imgData) {
          doc.addImage(imgData, 'PNG', x, y, imageWidth, imageHeight);
        }

        // Add border
        doc.setDrawColor(...colors.secondary);
        doc.rect(x, y, imageWidth, imageHeight);

        // Add label
        if (snapshot.label) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fontSize.small);
          doc.setTextColor(...colors.text);
          doc.text(snapshot.label, x, y + imageHeight + 4);
        }
      } catch (error) {
        console.warn(`[TAVIWorkupPDFService] Failed to add snapshot ${snapshot.id}:`, error);
      }
    });
  }

  private addFooters(doc: jsPDF, workup: TAVIWorkupItem): void {
    const { margin, pageWidth, pageHeight, colors, fontSize } = PDF_CONFIG;
    const totalPages = doc.getNumberOfPages();
    const now = new Date().toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer line
      doc.setDrawColor(...colors.secondary);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      // Footer text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize.small);
      doc.setTextColor(...colors.secondary);

      // Left: Generated date
      doc.text(`Generated: ${now}`, margin, pageHeight - 8);

      // Center: Patient name
      doc.text(workup.patient, pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Right: Page number
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}

// Export singleton instance
export const taviWorkupPDFService = TAVIWorkupPDFService.getInstance();
