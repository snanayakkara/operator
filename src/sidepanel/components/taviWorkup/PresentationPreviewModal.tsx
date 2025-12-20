/**
 * Presentation Preview Modal - Phase 7
 *
 * Inline fullscreen preview of the TAVI workup bento box presentation.
 * Renders the same HTML as the external presentation but within a modal.
 */

import React, { useMemo } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import Button from '../buttons/Button';
import { TAVIWorkupPresentationService } from '@/services/TAVIWorkupPresentationService';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';

interface PresentationPreviewModalProps {
  workup: TAVIWorkupItem;
  onClose: () => void;
}

export const PresentationPreviewModal: React.FC<PresentationPreviewModalProps> = ({
  workup,
  onClose
}) => {
  const presentationService = useMemo(() => TAVIWorkupPresentationService.getInstance(), []);

  // Generate HTML for preview
  const previewHtml = useMemo(() => {
    return presentationService.generateBentoBoxHTML(workup);
  }, [workup, presentationService]);

  // Create blob URL for iframe
  const iframeSrc = useMemo(() => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [previewHtml]);

  // Open in new window
  const handleOpenExternal = () => {
    window.open(iframeSrc, '_blank');
  };

  // Download HTML file
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = iframeSrc;
    link.download = `TAVI_Workup_${workup.patient.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
  };

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      URL.revokeObjectURL(iframeSrc);
    };
  }, [iframeSrc]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black bg-opacity-90">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Presentation Preview</h2>
          <span className="text-sm text-gray-400">{workup.patient}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            icon={<Download className="w-4 h-4" />}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            icon={<ExternalLink className="w-4 h-4" />}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            Open in New Tab
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          />
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden p-4">
        <iframe
          src={iframeSrc}
          title="TAVI Workup Presentation Preview"
          className="w-full h-full rounded-lg bg-white shadow-2xl"
          sandbox="allow-same-origin"
        />
      </div>

      {/* Footer with completion info */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Completion: {workup.completionPercentage}%</span>
          <span>Status: {workup.status}</span>
          {workup.procedureDate && <span>Procedure: {workup.procedureDate}</span>}
        </div>
        <p className="text-xs text-gray-500">
          Press ESC or click the X to close
        </p>
      </div>
    </div>
  );
};
