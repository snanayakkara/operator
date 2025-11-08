/**
 * RHC Card Preview Modal Component
 *
 * Shows a preview of the 18×10cm RHC card with options to:
 * - Copy to clipboard
 * - Download as PNG
 * - Dismiss by clicking outside
 */

import React, { useState } from 'react';
import { X, Copy, Download, CheckCircle2 } from 'lucide-react';

interface RHCCardPreviewModalProps {
  imageDataUrl: string;
  imageBlob: Blob;
  patientName?: string;
  onClose: () => void;
}

export const RHCCardPreviewModal: React.FC<RHCCardPreviewModalProps> = ({
  imageDataUrl,
  imageBlob,
  patientName,
  onClose
}) => {
  const [buttonStates, setButtonStates] = useState({ copied: false, downloaded: false });

  const handleCopyToClipboard = async () => {
    try {
      // Use Clipboard API to copy image
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': imageBlob
        })
      ]);

      setButtonStates(prev => ({ ...prev, copied: true }));
      setTimeout(() => setButtonStates(prev => ({ ...prev, copied: false })), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try downloading instead.');
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(imageBlob);
    const downloadLink = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = patientName
      ? `RHC_Card_${patientName.replace(/\s+/g, '_')}_${timestamp}.png`
      : `RHC_Card_${timestamp}.png`;

    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();

    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    }, 100);

    setButtonStates(prev => ({ ...prev, downloaded: true }));
    setTimeout(() => setButtonStates(prev => ({ ...prev, downloaded: false })), 2000);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the overlay, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">RHC Card Preview</h2>
            <p className="text-sm text-gray-600 mt-1">18×10cm @ 300 DPI</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preview Image */}
        <div className="p-6">
          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
            <img
              src={imageDataUrl}
              alt="RHC Card Preview"
              className="max-w-full h-auto rounded shadow-lg"
              style={{ maxHeight: '60vh' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-slate-50 border-t-2 border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={handleCopyToClipboard}
            disabled={buttonStates.copied}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {buttonStates.copied ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy to Clipboard
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={buttonStates.downloaded}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {buttonStates.downloaded ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PNG
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
