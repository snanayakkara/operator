/**
 * DICOM Types - Phase 8.2
 *
 * Type definitions for DICOM viewer integration with TAVI Workup.
 * Designed for future CornerstoneJS integration.
 */

/**
 * Camera position for 3D viewport
 */
export interface ViewportCamera {
  position: [number, number, number];
  focalPoint: [number, number, number];
  viewUp: [number, number, number];
}

/**
 * Window/level settings for CT display
 */
export interface WindowLevel {
  windowCenter: number;
  windowWidth: number;
  preset?: 'mediastinum' | 'lung' | 'bone' | 'soft_tissue' | 'custom';
}

/**
 * Captured DICOM viewport snapshot
 * Stores image data + viewport state for reproducibility
 */
export interface DicomSnapshot {
  id: string; // UUID

  // Image data
  imageData: string; // base64 PNG
  thumbnailData?: string; // smaller base64 PNG for list views

  // Viewport state (for restoring view)
  camera: ViewportCamera;
  windowLevel: WindowLevel;
  sliceIndex: number;
  sliceTotal?: number; // Total slices in series

  // Metadata
  label?: string; // User-defined label (e.g., "Annulus plane", "LM height")
  description?: string; // Additional notes
  capturedAt: number; // Unix timestamp

  // Source info
  seriesUID?: string;
  instanceUID?: string;
  studyDate?: string; // YYYYMMDD from DICOM
}

/**
 * DICOM study metadata
 */
export interface DicomStudy {
  studyUID: string;
  studyDate?: string;
  studyDescription?: string;
  patientId?: string;
  patientName?: string;
  modality: string; // CT, MR, etc.
  series: DicomSeries[];
}

/**
 * DICOM series within a study
 */
export interface DicomSeries {
  seriesUID: string;
  seriesNumber?: number;
  seriesDescription?: string;
  modality: string;
  instanceCount: number;
  imageUrls: string[]; // URLs or file paths to DICOM instances
}

/**
 * DICOM viewer state
 */
export interface DicomViewerState {
  isLoading: boolean;
  error?: string;

  // Current view
  currentStudy?: DicomStudy;
  currentSeries?: DicomSeries;
  currentSlice: number;

  // Viewport settings
  camera: ViewportCamera;
  windowLevel: WindowLevel;
  zoom: number;
  pan: { x: number; y: number };

  // Tools
  activeTool: 'scroll' | 'window' | 'zoom' | 'pan' | 'crosshairs' | 'measure';

  // Captured snapshots
  snapshots: DicomSnapshot[];
}

/**
 * DICOM viewer props for React component
 */
export interface DicomViewerProps {
  // Data source
  dicomUrls?: string[];
  studyData?: DicomStudy;

  // Callbacks
  onSnapshotCapture?: (snapshot: DicomSnapshot) => void;
  onMeasurementChange?: (measurements: Record<string, number>) => void;
  onError?: (error: Error) => void;

  // Display options
  showToolbar?: boolean;
  showSliceInfo?: boolean;
  initialWindowPreset?: WindowLevel['preset'];

  // Size
  width?: number | string;
  height?: number | string;
  className?: string;
}

/**
 * Measurement annotation on DICOM image
 */
export interface DicomMeasurement {
  id: string;
  type: 'length' | 'area' | 'angle' | 'ellipse';
  points: Array<{ x: number; y: number; z?: number }>;
  value: number;
  unit: string; // 'mm', 'mm²', '°'
  label?: string;
  sliceIndex: number;
  seriesUID?: string;
}

/**
 * Default window presets for CT
 */
export const WINDOW_PRESETS: Record<NonNullable<WindowLevel['preset']>, WindowLevel> = {
  mediastinum: { windowCenter: 40, windowWidth: 400, preset: 'mediastinum' },
  lung: { windowCenter: -600, windowWidth: 1500, preset: 'lung' },
  bone: { windowCenter: 300, windowWidth: 1500, preset: 'bone' },
  soft_tissue: { windowCenter: 50, windowWidth: 350, preset: 'soft_tissue' },
  custom: { windowCenter: 40, windowWidth: 400, preset: 'custom' }
};

/**
 * Default camera for axial view
 */
export const DEFAULT_CAMERA: ViewportCamera = {
  position: [0, 0, 500],
  focalPoint: [0, 0, 0],
  viewUp: [0, -1, 0]
};

/**
 * Create empty DICOM viewer state
 */
export function createEmptyDicomViewerState(): DicomViewerState {
  return {
    isLoading: false,
    currentSlice: 0,
    camera: DEFAULT_CAMERA,
    windowLevel: WINDOW_PRESETS.mediastinum,
    zoom: 1,
    pan: { x: 0, y: 0 },
    activeTool: 'scroll',
    snapshots: []
  };
}
