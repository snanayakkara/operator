import React, { useState, useCallback, useEffect } from 'react';
import {
  TAVIMeasurementSession,
  TAVIMeasurementData,
  ValveTypeOption,
  TAVIMeasurementConfig
} from '@/types/medical.types';
import { TAVIGridView } from './TAVIGridView';
import { TAVIMeasurementView } from './TAVIMeasurementView';
import { TAVIValveSelector } from './TAVIValveSelector';
import './styles/tavi-measurement.css';

interface TAVIMeasurementInterfaceProps {
  sessionId?: string;
  patientId?: string;
  onSessionUpdate?: (session: TAVIMeasurementSession) => void;
  onComplete?: (session: TAVIMeasurementSession) => void;
}

export const TAVIMeasurementInterface: React.FC<TAVIMeasurementInterfaceProps> = ({
  sessionId,
  patientId,
  onSessionUpdate,
  onComplete
}) => {
  const [currentView, setCurrentView] = useState<'grid' | 'measurement'>('grid');
  const [selectedMeasurement, setSelectedMeasurement] = useState<TAVIMeasurementData | null>(null);
  const [session, setSession] = useState<TAVIMeasurementSession>(() =>
    initializeSession(sessionId, patientId)
  );

  // Initialize a new measurement session
  function initializeSession(id?: string, patientId?: string): TAVIMeasurementSession {
    return {
      sessionId: id || `tavi-measurement-${Date.now()}`,
      patientId,
      measurements: generateSampleMeasurements(),
      valveType: 'Edwards Sapien',
      nativeAnnulus: {
        perimeter: 75,
        area: 456
      },
      additionalBalloonVolume: 2.0,
      averagePostDeploymentExpansion: {
        mm: 0,
        percentage: 0
      },
      completionStatus: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // Generate sample measurement data for demonstration
  function generateSampleMeasurements(): TAVIMeasurementData[] {
    return [
      {
        id: 'measurement-1',
        imageUrl: '/sample-tavi-image-1.jpg', // These would be real medical images
        title: 'Pre-deployment',
        view: 'Pre-deployment baseline',
        measurements: [],
        completed: false,
        timestamp: Date.now() - 300000
      },
      {
        id: 'measurement-2',
        imageUrl: '/sample-tavi-image-2.jpg',
        title: 'Post-deployment',
        view: 'Post-deployment + 3-cusp view',
        measurements: [],
        completed: false,
        timestamp: Date.now() - 200000
      },
      {
        id: 'measurement-3',
        imageUrl: '/sample-tavi-image-3.jpg',
        title: 'Final assessment',
        view: 'Final assessment + positioning',
        measurements: [],
        completed: false,
        timestamp: Date.now() - 100000
      }
    ];
  }

  // Calculate percentage of expected value
  const calculatePercentage = useCallback((measured: number, expected: number): number => {
    if (expected === 0) return 0;
    return Math.round((measured / expected) * 100);
  }, []);

  // Update session data
  const updateSession = useCallback((updates: Partial<TAVIMeasurementSession>) => {
    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: Date.now()
    };
    setSession(updatedSession);
    onSessionUpdate?.(updatedSession);
  }, [session, onSessionUpdate]);

  // Handle measurement selection from grid
  const handleMeasurementSelect = useCallback((measurement: TAVIMeasurementData) => {
    setSelectedMeasurement(measurement);
    setCurrentView('measurement');
  }, []);

  // Handle returning to grid view
  const handleBackToGrid = useCallback(() => {
    setCurrentView('grid');
    setSelectedMeasurement(null);
  }, []);

  // Handle measurement updates
  const handleMeasurementUpdate = useCallback((updatedMeasurement: TAVIMeasurementData) => {
    const updatedMeasurements = session.measurements.map(m =>
      m.id === updatedMeasurement.id ? updatedMeasurement : m
    );

    // Update completion status
    const completionStatus = { ...session.completionStatus };
    if (updatedMeasurement.completed) {
      const totalMeasurements = updatedMeasurement.measurements.length;
      const completedMeasurements = updatedMeasurement.measurements.filter(m => m.value > 0).length;
      const percentage = totalMeasurements > 0 ? Math.round((completedMeasurements / totalMeasurements) * 100) : 0;

      completionStatus[updatedMeasurement.id] = {
        completed: true,
        percentage
      };
    }

    // Calculate average post deployment expansion
    const postDeploymentMeasurements = updatedMeasurements
      .filter(m => m.view.includes('Post-deployment'))
      .flatMap(m => m.measurements.filter(measurement => measurement.type === 'height'));

    if (postDeploymentMeasurements.length > 0) {
      const avgMm = postDeploymentMeasurements.reduce((sum, m) => sum + m.value, 0) / postDeploymentMeasurements.length;
      const avgPercentage = postDeploymentMeasurements.reduce((sum, m) => sum + (m.percentage || 0), 0) / postDeploymentMeasurements.length;

      updateSession({
        measurements: updatedMeasurements,
        completionStatus,
        averagePostDeploymentExpansion: {
          mm: Math.round(avgMm * 10) / 10,
          percentage: Math.round(avgPercentage)
        }
      });
    } else {
      updateSession({
        measurements: updatedMeasurements,
        completionStatus
      });
    }
  }, [session, updateSession]);

  // Handle valve type change
  const handleValveTypeChange = useCallback((valveType: ValveTypeOption) => {
    updateSession({ valveType });
  }, [updateSession]);

  // Handle native annulus change
  const handleNativeAnnulusChange = useCallback((field: 'perimeter' | 'area', value: number) => {
    updateSession({
      nativeAnnulus: {
        ...session.nativeAnnulus,
        [field]: value
      }
    });
  }, [session, updateSession]);

  // Handle balloon volume change
  const handleBalloonVolumeChange = useCallback((volume: number) => {
    updateSession({ additionalBalloonVolume: volume });
  }, [updateSession]);

  // Check if session is complete
  const isSessionComplete = Object.keys(session.completionStatus).length === session.measurements.length &&
    Object.values(session.completionStatus).every(status => status.completed);

  // Handle session completion
  useEffect(() => {
    if (isSessionComplete && onComplete) {
      onComplete(session);
    }
  }, [isSessionComplete, session, onComplete]);

  return (
    <div className="tavi-measurement-interface">
      <div className="tavi-measurement-header">
        <h2>TAVI Measurement Interface</h2>
        <TAVIValveSelector
          selectedValve={session.valveType}
          onValveChange={handleValveTypeChange}
          nativePerimeter={session.nativeAnnulus.perimeter}
          nativeArea={session.nativeAnnulus.area}
          onNativePerimeterChange={(value) => handleNativeAnnulusChange('perimeter', value)}
          onNativeAreaChange={(value) => handleNativeAnnulusChange('area', value)}
          balloonVolume={session.additionalBalloonVolume}
          onBalloonVolumeChange={handleBalloonVolumeChange}
        />
      </div>

      {currentView === 'grid' ? (
        <TAVIGridView
          measurements={session.measurements}
          completionStatus={session.completionStatus}
          averagePostDeploymentExpansion={session.averagePostDeploymentExpansion}
          onMeasurementSelect={handleMeasurementSelect}
        />
      ) : (
        selectedMeasurement && (
          <TAVIMeasurementView
            measurement={selectedMeasurement}
            valveType={session.valveType}
            onBackToGrid={handleBackToGrid}
            onMeasurementUpdate={handleMeasurementUpdate}
          />
        )
      )}
    </div>
  );
};

export default TAVIMeasurementInterface;