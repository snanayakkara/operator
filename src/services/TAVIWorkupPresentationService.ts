/**
 * TAVI Workup Presentation Service - Phase 6/8/9
 *
 * Generates beautiful bento box HTML for presenting TAVI workups.
 * Pattern: Material-inspired grid layout with sections
 *
 * Features:
 * - Responsive bento box grid
 * - Color-coded sections
 * - Print-friendly styling
 * - Alert highlighting
 * - CT measurements card with structured data
 * - DICOM snapshot gallery (Phase 8.2)
 * - Valve recommendation display (Phase 8.3)
 * - Full valve sizing tab with 4-column grid (Phase 9)
 */

import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import type { TAVIWorkupStructuredSections, TAVIWorkupCTMeasurements } from '@/types/medical.types';
import type { DicomSnapshot } from '@/types/dicom.types';
import { ValveSizingServiceV2 } from './ValveSizingServiceV2';
import { generateValveSizingHTML } from '@/sidepanel/components/taviWorkup/ValveSizingTab';

export class TAVIWorkupPresentationService {
  private static instance: TAVIWorkupPresentationService | null = null;

  private constructor() {}

  public static getInstance(): TAVIWorkupPresentationService {
    if (!TAVIWorkupPresentationService.instance) {
      TAVIWorkupPresentationService.instance = new TAVIWorkupPresentationService();
    }
    return TAVIWorkupPresentationService.instance;
  }

  /**
   * Generate bento box HTML for presentation
   */
  public generateBentoBoxHTML(workup: TAVIWorkupItem): string {
    const sections = this.prepareSections(workup.structuredSections);
    const css = this.getBentoBoxCSS();
    const ctMeasurementsHTML = this.renderCTMeasurementsCard(workup.ctMeasurements);
    const valveRecommendationHTML = this.renderValveRecommendationCard(workup.ctMeasurements);
    const valveSizingHTML = this.renderValveSizingSection(workup.ctMeasurements, workup.selectedValve);
    const snapshotsHTML = this.renderSnapshotsGallery(workup.snapshots);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TAVI Workup - ${workup.patient}</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${workup.patient} - TAVI Workup</h1>
      <div class="meta">
        <span>Procedure Date: ${workup.procedureDate || 'Not set'}</span>
        <span>Location: ${workup.location || 'Not specified'}</span>
        <span>Completion: ${workup.completionPercentage}%</span>
      </div>
    </header>

    <div class="bento-grid">
      ${ctMeasurementsHTML}
      ${valveRecommendationHTML}
      ${sections.map(section => this.renderSectionCard(section)).join('\n')}
    </div>

    ${valveSizingHTML}
    ${snapshotsHTML}

    <footer class="footer">
      <p>Generated with Operator Extension - ${new Date().toLocaleDateString()}</p>
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Prepare sections for display
   */
  private prepareSections(structuredSections: TAVIWorkupStructuredSections): Array<{
    key: string;
    title: string;
    content: string;
    size: 'small' | 'medium' | 'large';
    color: string;
    isAlert: boolean;
  }> {
    return [
      {
        key: 'patient',
        title: 'Patient',
        content: structuredSections.patient.content,
        size: 'large',
        color: 'blue',
        isAlert: false
      },
      {
        key: 'clinical',
        title: 'Clinical',
        content: structuredSections.clinical.content,
        size: 'large',
        color: 'green',
        isAlert: false
      },
      // enhanced_ct REMOVED - CT data now displayed via CTMeasurementsCard
      {
        key: 'echocardiography',
        title: 'Echo',
        content: structuredSections.echocardiography.content,
        size: 'medium',
        color: 'red',
        isAlert: false
      },
      {
        key: 'background',
        title: 'Background',
        content: structuredSections.background.content,
        size: 'medium',
        color: 'gray',
        isAlert: false
      },
      {
        key: 'medications',
        title: 'Medications',
        content: structuredSections.medications.content,
        size: 'small',
        color: 'orange',
        isAlert: false
      },
      {
        key: 'laboratory',
        title: 'Labs',
        content: structuredSections.laboratory.content,
        size: 'small',
        color: 'purple',
        isAlert: false
      },
      {
        key: 'ecg',
        title: 'ECG',
        content: structuredSections.ecg.content,
        size: 'small',
        color: 'red',
        isAlert: false
      },
      {
        key: 'investigations',
        title: 'Investigations',
        content: structuredSections.investigations.content,
        size: 'medium',
        color: 'indigo',
        isAlert: false
      },
      {
        key: 'procedure_planning',
        title: 'Procedure Plan',
        content: structuredSections.procedure_planning.content,
        size: 'medium',
        color: 'violet',
        isAlert: false
      },
      {
        key: 'social_history',
        title: 'Social',
        content: structuredSections.social_history.content,
        size: 'small',
        color: 'cyan',
        isAlert: false
      },
      {
        key: 'alerts',
        title: 'Alerts',
        content: structuredSections.alerts.content,
        size: 'large',
        color: 'red',
        isAlert: true
      }
    ];
  }

  /**
   * Render individual section card
   */
  private renderSectionCard(section: {
    key: string;
    title: string;
    content: string;
    size: string;
    color: string;
    isAlert: boolean;
  }): string {
    const hasContent = section.content && section.content !== 'Not provided';

    return `<div class="card card-${section.size} ${section.isAlert ? 'card-alert' : ''}" data-section="${section.key}">
  <div class="card-header color-${section.color}">
    <h3>${section.title}</h3>
  </div>
  <div class="card-content">
    ${hasContent ? `<p>${this.escapeHTML(section.content)}</p>` : '<p class="empty">Not provided</p>'}
  </div>
</div>`;
  }

  /**
   * Get bento box CSS
   */
  private getBentoBoxCSS(): string {
    return `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: #f5f5f7;
  padding: 20px;
  line-height: 1.6;
}

.container { max-width: 1400px; margin: 0 auto; }

.header {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
.meta { display: flex; gap: 20px; font-size: 14px; color: #666; }

.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }

.card-small { grid-column: span 1; }
.card-medium { grid-column: span 2; }
.card-large { grid-column: span 3; }

.card-alert { border: 3px solid #ef4444; }

.card-header {
  padding: 12px 16px;
  color: white;
  font-weight: 600;
}

.color-blue { background: #3b82f6; }
.color-green { background: #10b981; }
.color-purple { background: #8b5cf6; }
.color-red { background: #ef4444; }
.color-gray { background: #6b7280; }
.color-orange { background: #f59e0b; }
.color-indigo { background: #6366f1; }
.color-violet { background: #7c3aed; }
.color-cyan { background: #06b6d4; }
.color-teal { background: #14b8a6; }

.card-content {
  padding: 16px;
  font-size: 14px;
  color: #374151;
  white-space: pre-wrap;
}

.empty { color: #9ca3af; font-style: italic; }

/* CT Measurements Styles */
.ct-measurements .measurement-group {
  margin-bottom: 16px;
}
.ct-measurements .measurement-group:last-child { margin-bottom: 0; }
.ct-measurements h4 {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.measurement-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.measurement {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dotted #e5e7eb;
}
.measurement .label { color: #6b7280; font-size: 13px; }
.measurement .value { font-weight: 500; color: #111827; }
.narrative {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-style: italic;
  color: #4b5563;
}

/* Valve Recommendation Styles */
.valve-recommendation .primary-valve {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border-radius: 8px;
  margin-bottom: 12px;
}
.valve-name-large {
  font-size: 24px;
  font-weight: 700;
  color: #5b21b6;
  margin-bottom: 8px;
}
.valve-details-large {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}
.oversizing {
  font-size: 14px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}
.oversizing.optimal { background: #d1fae5; color: #065f46; }
.oversizing.within_range { background: #dbeafe; color: #1e40af; }
.oversizing.borderline { background: #fef3c7; color: #92400e; }
.oversizing.outside_range { background: #fee2e2; color: #991b1b; }
.category-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: capitalize;
}
.category-badge.optimal { background: #d1fae5; color: #065f46; }
.category-badge.within_range { background: #dbeafe; color: #1e40af; }
.category-badge.borderline { background: #fef3c7; color: #92400e; }
.category-badge.outside_range { background: #fee2e2; color: #991b1b; }
.rationale { font-size: 13px; color: #4b5563; margin-top: 8px; }
.alternatives h5 { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
.alternative-valve {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  margin-bottom: 4px;
}
.alternative-valve .valve-name { font-weight: 500; }
.alternative-valve .valve-details { color: #6b7280; font-size: 13px; }

/* Snapshots Gallery */
.snapshots-section {
  margin-top: 20px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.snapshots-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #111827;
}
.snapshots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.snapshot-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}
.snapshot-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  background: #1f2937;
}
.snapshot-label {
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.snapshot-label .label-text {
  font-weight: 500;
  font-size: 13px;
  color: #111827;
}
.snapshot-label .slice-info {
  font-size: 11px;
  color: #6b7280;
}

.footer {
  text-align: center;
  padding: 20px;
  color: #6b7280;
  font-size: 12px;
}

/* Valve Sizing Section (Phase 9) */
.valve-sizing-section {
  margin-top: 20px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.valve-sizing-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #111827;
}
.selected-valve-summary {
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border-radius: 8px;
  font-size: 14px;
  color: #5b21b6;
}

@media print {
  body { background: white; padding: 0; }
  .card { page-break-inside: avoid; box-shadow: none; border: 1px solid #e5e7eb; }
  .card:hover { transform: none; box-shadow: none; }
  .valve-sizing-section { page-break-before: always; box-shadow: none; border: 1px solid #e5e7eb; }
  .snapshots-section { page-break-before: always; }
  .snapshot-card { page-break-inside: avoid; }
}

@media (max-width: 768px) {
  .card-medium, .card-large { grid-column: span 1; }
  .snapshots-grid { grid-template-columns: repeat(2, 1fr); }
}
    `.trim();
  }

  /**
   * Escape HTML to prevent injection
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }

  /**
   * Open presentation in a new extension tab (live React page, no HTML download)
   * 
   * Opens chrome-extension://<id>/src/presentation/index.html?workupId=<uuid>
   * The presentation page fetches workup data from storage by ID.
   */
  public async presentWorkup(workup: TAVIWorkupItem): Promise<void> {
    // Build the extension page URL
    const extensionId = chrome.runtime.id;
    const presentationUrl = `chrome-extension://${extensionId}/src/presentation/index.html?workupId=${workup.id}`;
    
    // Open in a new tab
    await chrome.tabs.create({ url: presentationUrl, active: true });
    
    console.log(`[TAVIWorkupPresentationService] Opened presentation for workup ${workup.id}`);
  }

  /**
   * @deprecated Use presentWorkup() instead - this method downloads an HTML file
   * Kept for backwards compatibility with preview modal
   */
  public async downloadWorkupHTML(workup: TAVIWorkupItem): Promise<void> {
    const html = this.generateBentoBoxHTML(workup);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `TAVI_Workup_${workup.patient.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    link.click();

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // === PHASE 8 ADDITIONS ===

  /**
   * Render CT Measurements card for presentation
   */
  private renderCTMeasurementsCard(measurements?: TAVIWorkupCTMeasurements): string {
    if (!measurements) {
      return `<div class="card card-large" data-section="ct-measurements">
  <div class="card-header color-teal">
    <h3>CT Measurements</h3>
  </div>
  <div class="card-content">
    <p class="empty">No CT measurements recorded</p>
  </div>
</div>`;
    }

    const formatValue = (val: number | undefined, unit: string): string => {
      return val !== undefined ? `${val}${unit}` : '—';
    };

    const annulusHTML = `
      <div class="measurement-group">
        <h4>Annulus</h4>
        <div class="measurement-grid">
          <div class="measurement">
            <span class="label">Area</span>
            <span class="value">${formatValue(measurements.annulusAreaMm2, ' mm²')}</span>
          </div>
          <div class="measurement">
            <span class="label">Perimeter</span>
            <span class="value">${formatValue(measurements.annulusPerimeterMm, ' mm')}</span>
          </div>
          <div class="measurement">
            <span class="label">Mean Diameter</span>
            <span class="value">${formatValue(measurements.annulusMeanDiameterMm, ' mm')}</span>
          </div>
          <div class="measurement">
            <span class="label">Min/Max</span>
            <span class="value">${measurements.annulusMinDiameterMm ?? '—'} / ${measurements.annulusMaxDiameterMm ?? '—'} mm</span>
          </div>
        </div>
      </div>
    `;

    const coronaryHTML = measurements.coronaryHeights ? `
      <div class="measurement-group">
        <h4>Coronary Heights</h4>
        <div class="measurement-grid">
          <div class="measurement">
            <span class="label">LM</span>
            <span class="value">${formatValue(measurements.coronaryHeights.leftMainMm, ' mm')}</span>
          </div>
          <div class="measurement">
            <span class="label">RCA</span>
            <span class="value">${formatValue(measurements.coronaryHeights.rightCoronaryMm, ' mm')}</span>
          </div>
        </div>
      </div>
    ` : '';

    const accessHTML = measurements.accessVessels ? `
      <div class="measurement-group">
        <h4>Access Vessels</h4>
        <div class="measurement-grid">
          <div class="measurement">
            <span class="label">R CFA</span>
            <span class="value">${formatValue(measurements.accessVessels.rightCFAmm, ' mm')}</span>
          </div>
          <div class="measurement">
            <span class="label">L CFA</span>
            <span class="value">${formatValue(measurements.accessVessels.leftCFAmm, ' mm')}</span>
          </div>
          <div class="measurement">
            <span class="label">R EIA</span>
            <span class="value">${formatValue(measurements.accessVessels.rightEIAmm, ' mm')}</span>
          </div>
          <div class="measurement">
            <span class="label">L EIA</span>
            <span class="value">${formatValue(measurements.accessVessels.leftEIAmm, ' mm')}</span>
          </div>
        </div>
      </div>
    ` : '';

    const calciumHTML = (measurements.calciumScore !== undefined || measurements.lvotCalciumScore !== undefined) ? `
      <div class="measurement-group">
        <h4>Calcium Scoring</h4>
        <div class="measurement-grid">
          <div class="measurement">
            <span class="label">Leaflet</span>
            <span class="value">${formatValue(measurements.calciumScore, '')}</span>
          </div>
          <div class="measurement">
            <span class="label">LVOT</span>
            <span class="value">${formatValue(measurements.lvotCalciumScore, '')}</span>
          </div>
        </div>
      </div>
    ` : '';

    return `<div class="card card-large" data-section="ct-measurements">
  <div class="card-header color-teal">
    <h3>CT Measurements</h3>
  </div>
  <div class="card-content ct-measurements">
    ${annulusHTML}
    ${coronaryHTML}
    ${accessHTML}
    ${calciumHTML}
    ${measurements.narrative ? `<div class="narrative"><p>${this.escapeHTML(measurements.narrative)}</p></div>` : ''}
  </div>
</div>`;
  }

  /**
   * Render Valve Recommendation card for presentation (compact summary)
   */
  private renderValveRecommendationCard(measurements?: TAVIWorkupCTMeasurements): string {
    const area = measurements?.annulusArea ?? measurements?.annulusAreaMm2;
    const perimeter = measurements?.annulusPerimeter ?? measurements?.annulusPerimeterMm;

    if (!area || !perimeter) {
      return ''; // Don't show card if no measurements
    }

    try {
      const service = ValveSizingServiceV2.getInstance();
      const validation = service.validateMeasurements(area, perimeter);

      if (!validation.valid) {
        return `<div class="card card-medium" data-section="valve-recommendation">
  <div class="card-header color-violet">
    <h3>Valve Recommendation</h3>
  </div>
  <div class="card-content">
    <p class="empty">Measurements out of range for valve sizing</p>
  </div>
</div>`;
      }

      const bestPerBrand = service.getBestValvePerBrand(area, perimeter);
      const brandOrder = service.getBrandOrder();

      // Find best overall
      let bestOverall = bestPerBrand[brandOrder[0]];
      for (const brand of brandOrder) {
        const result = bestPerBrand[brand];
        if (result?.isOptimal && (!bestOverall?.isOptimal || result.oversizing < bestOverall.oversizing)) {
          bestOverall = result;
        }
      }

      const brandHTML = brandOrder.map(brand => {
        const result = bestPerBrand[brand];
        if (!result) return '';
        const mfr = service.getManufacturer(brand);
        const colorClass = result.isOptimal ? 'optimal' : 'within_range';
        return `
          <div class="alternative-valve">
            <span class="valve-name">${mfr.displayName} ${result.sizeName}</span>
            <span class="valve-details ${colorClass}">${result.oversizing.toFixed(1)}%${result.isOptimal ? ' ✓' : ''}</span>
          </div>
        `;
      }).join('');

      const primaryMfr = bestOverall ? service.getManufacturer(bestOverall.brand) : null;

      return `<div class="card card-medium" data-section="valve-recommendation">
  <div class="card-header color-violet">
    <h3>AI Valve Recommendation</h3>
  </div>
  <div class="card-content valve-recommendation">
    ${bestOverall ? `
    <div class="primary-valve">
      <div class="valve-name-large">${primaryMfr?.displayName} ${bestOverall.sizeName}</div>
      <div class="valve-details-large">
        <span class="oversizing ${bestOverall.isOptimal ? 'optimal' : 'within_range'}">${bestOverall.oversizing.toFixed(1)}% oversizing</span>
        ${bestOverall.isOptimal ? '<span class="category-badge optimal">Optimal</span>' : ''}
      </div>
    </div>
    ` : ''}
    <div class="alternatives">
      <h5>Best by Manufacturer</h5>
      ${brandHTML}
    </div>
  </div>
</div>`;
    } catch (error) {
      console.error('[TAVIWorkupPresentationService] Error generating valve recommendation:', error);
      return '';
    }
  }

  /**
   * Render full valve sizing section (4-column grid) for presentation
   */
  private renderValveSizingSection(measurements?: TAVIWorkupCTMeasurements, selectedValve?: TAVIWorkupItem['selectedValve']): string {
    const area = measurements?.annulusArea ?? measurements?.annulusAreaMm2;
    const perimeter = measurements?.annulusPerimeter ?? measurements?.annulusPerimeterMm;

    if (!area || !perimeter) {
      return '';
    }

    try {
      const service = ValveSizingServiceV2.getInstance();
      const validation = service.validateMeasurements(area, perimeter);

      if (!validation.valid) {
        return '';
      }

      // Use the exported static HTML generator from ValveSizingTab
      const valveSizingContent = generateValveSizingHTML(area, perimeter, selectedValve);

      return `
    <div class="valve-sizing-section">
      <h2>Valve Sizing Comparison</h2>
      ${valveSizingContent}
      ${selectedValve ? `
      <div class="selected-valve-summary">
        <strong>User Selected:</strong> ${service.getManufacturer(selectedValve.brand).displayName} ${selectedValve.size}mm
        ${selectedValve.volumeAdjustment !== undefined && selectedValve.volumeAdjustment !== 0 ?
          `(${selectedValve.volumeAdjustment > 0 ? '+' : ''}${selectedValve.volumeAdjustment.toFixed(1)}mL balloon adjustment)` : ''}
      </div>
      ` : ''}
    </div>
    `;
    } catch (error) {
      console.error('[TAVIWorkupPresentationService] Error generating valve sizing section:', error);
      return '';
    }
  }

  /**
   * Render DICOM snapshots gallery for presentation
   */
  private renderSnapshotsGallery(snapshots?: DicomSnapshot[]): string {
    if (!snapshots || snapshots.length === 0) {
      return '';
    }

    const snapshotCards = snapshots.map(snapshot => `
      <div class="snapshot-card">
        <img src="${snapshot.thumbnailData || snapshot.imageData}" alt="${this.escapeHTML(snapshot.label || 'CT Snapshot')}" />
        <div class="snapshot-label">
          <span class="label-text">${this.escapeHTML(snapshot.label || 'Unlabelled')}</span>
          <span class="slice-info">Slice ${snapshot.sliceIndex}${snapshot.sliceTotal ? ` / ${snapshot.sliceTotal}` : ''}</span>
        </div>
      </div>
    `).join('');

    return `
    <div class="snapshots-section">
      <h2>CT Images</h2>
      <div class="snapshots-grid">
        ${snapshotCards}
      </div>
    </div>
    `;
  }
}
