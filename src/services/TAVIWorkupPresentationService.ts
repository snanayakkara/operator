/**
 * TAVI Workup Presentation Service - Phase 6
 *
 * Generates beautiful bento box HTML for presenting TAVI workups.
 * Pattern: Material-inspired grid layout with 12 sections
 *
 * Features:
 * - Responsive bento box grid
 * - Color-coded sections
 * - Print-friendly styling
 * - Alert highlighting
 * - Optional Synoptic iframe (placeholder for future)
 */

import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';

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
      ${sections.map(section => this.renderSectionCard(section)).join('\n')}
    </div>

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

.card-content {
  padding: 16px;
  font-size: 14px;
  color: #374151;
  white-space: pre-wrap;
}

.empty { color: #9ca3af; font-style: italic; }

.footer {
  text-align: center;
  padding: 20px;
  color: #6b7280;
  font-size: 12px;
}

@media print {
  body { background: white; padding: 0; }
  .card { page-break-inside: avoid; box-shadow: none; border: 1px solid #e5e7eb; }
  .card:hover { transform: none; box-shadow: none; }
}

@media (max-width: 768px) {
  .card-medium, .card-large { grid-column: span 1; }
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
}
