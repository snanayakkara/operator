/**
 * RHC Card Preview Modal Component
 *
 * Shows a preview of the 18×10cm RHC card with options to:
 * - Copy to clipboard
 * - Download as PNG
 * - Dismiss by clicking outside
 */

import React, { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { Modal } from '../modals';
import { Button } from '../buttons';

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
  const [copyState, setCopyState] = useState<'idle' | 'success'>('idle');
  const [downloadState, setDownloadState] = useState<'idle' | 'success'>('idle');

  const handleCopyToClipboard = async () => {
    try {
      // Use Clipboard API to copy image
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': imageBlob
        })
      ]);

      setCopyState('success');
      setTimeout(() => setCopyState('idle'), 2000);
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

    setDownloadState('success');
    setTimeout(() => setDownloadState('idle'), 2000);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      header={
        <div className="w-full -mx-6 -mt-5 px-6 py-4 rounded-t-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
          <h2 className="text-xl font-bold text-gray-900">RHC Card Preview</h2>
          <p className="text-sm text-gray-600 mt-1">18×10cm @ 300 DPI</p>
        </div>
      }
      footer={
        <div className="flex items-center gap-3 w-full -mx-6 -mb-4 px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-b-2xl border-t-2 border-gray-200">
          <Button
            variant="primary"
            onClick={handleCopyToClipboard}
            isSuccess={copyState === 'success'}
            icon={Copy}
            className="flex-1"
          >
            {copyState === 'success' ? 'Copied!' : 'Copy to Clipboard'}
          </Button>

          <Button
            variant="success"
            onClick={handleDownload}
            isSuccess={downloadState === 'success'}
            icon={Download}
            className="flex-1"
          >
            {downloadState === 'success' ? 'Downloaded!' : 'Download PNG'}
          </Button>
        </div>
      }
    >
      <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
        <img
          src={imageDataUrl}
          alt="RHC Card Preview"
          className="max-w-full h-auto rounded shadow-lg"
          style={{ maxHeight: '60vh' }}
        />
      </div>
    </Modal>
  );
};
