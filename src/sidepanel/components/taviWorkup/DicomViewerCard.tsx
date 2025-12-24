/**
 * DICOM Viewer Card - Phase 8.2 (Intentionally Deferred)
 *
 * Stub component providing snapshot gallery and instructions for CT image capture.
 * Full CornerstoneJS integration deferred due to:
 * - Bundle size (~2-3MB for CornerstoneJS)
 * - Chrome extension CSP/WebAssembly complexity
 * - Current workflow uses external viewers (Horos, OsiriX, 3D Slicer)
 *
 * Current Features:
 * - Snapshot gallery with remove functionality
 * - Workaround instructions for external viewer workflow
 * - Proper TypeScript types (DicomSnapshot)
 *
 * Future (if needed): CornerstoneJS 3D integration for native DICOM viewing
 */

import React, { useState } from 'react';
import { Image, ChevronDown, ChevronUp, Camera, Upload, AlertCircle } from 'lucide-react';
import Button from '../buttons/Button';
import type { DicomSnapshot } from '@/types/dicom.types';

interface DicomViewerCardProps {
  snapshots?: DicomSnapshot[];
  onSnapshotCapture?: (snapshot: DicomSnapshot) => void;
  onSnapshotsChange?: (snapshots: DicomSnapshot[]) => void;
}

export const DicomViewerCard: React.FC<DicomViewerCardProps> = ({
  snapshots = [],
  onSnapshotCapture,
  onSnapshotsChange
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleRemoveSnapshot = (id: string) => {
    if (onSnapshotsChange) {
      onSnapshotsChange(snapshots.filter(s => s.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-line-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
          snapshots.length > 0
            ? 'bg-blue-50 border-l-4 border-l-blue-500'
            : 'bg-gray-50 border-l-4 border-l-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-blue-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink-primary">CT Images</h3>
            <p className="text-xs text-ink-tertiary">
              {snapshots.length > 0
                ? `${snapshots.length} snapshot${snapshots.length !== 1 ? 's' : ''} captured`
                : 'No images loaded'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-ink-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-tertiary" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-3 border-t border-line-primary space-y-3">
          {/* Placeholder for DICOM Viewer */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
            <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600 text-center">
              DICOM Viewer Coming Soon
            </p>
            <p className="text-xs text-gray-500 text-center mt-1 max-w-xs">
              CornerstoneJS integration planned for Phase 8.2.
              For now, use external DICOM viewer and capture screenshots.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                icon={<Upload className="w-3 h-3" />}
                disabled
              >
                Load DICOM
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Camera className="w-3 h-3" />}
                disabled
              >
                Capture
              </Button>
            </div>
          </div>

          {/* Snapshot Gallery */}
          {snapshots.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-ink-primary">Captured Snapshots</h4>
              <div className="grid grid-cols-3 gap-2">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="relative group rounded-lg overflow-hidden border border-gray-200"
                  >
                    <img
                      src={snapshot.thumbnailData || snapshot.imageData}
                      alt={snapshot.label || 'CT Snapshot'}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveSnapshot(snapshot.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs bg-red-500 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                    {snapshot.label && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-1 py-0.5">
                        <p className="text-xs text-white truncate">{snapshot.label}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-ink-tertiary bg-amber-50 border border-amber-200 rounded p-2">
            <p className="font-medium text-amber-800 mb-1">Workaround:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-amber-700">
              <li>Open CT in external viewer (Horos, OsiriX, 3D Slicer)</li>
              <li>Navigate to desired plane (annulus, coronaries, access)</li>
              <li>Take screenshot and paste/upload here (coming soon)</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default DicomViewerCard;
