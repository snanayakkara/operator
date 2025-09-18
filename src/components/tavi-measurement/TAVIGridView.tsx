import React from 'react';
import {
  TAVIMeasurementData,
  MeasurementCompletionStatus
} from '@/types/medical.types';

interface TAVIGridViewProps {
  measurements: TAVIMeasurementData[];
  completionStatus: MeasurementCompletionStatus;
  averagePostDeploymentExpansion: {
    mm: number;
    percentage: number;
  };
  onMeasurementSelect: (measurement: TAVIMeasurementData) => void;
}

export const TAVIGridView: React.FC<TAVIGridViewProps> = ({
  measurements,
  completionStatus,
  averagePostDeploymentExpansion,
  onMeasurementSelect
}) => {

  const renderMeasurementThumbnail = (measurement: TAVIMeasurementData) => {
    const status = completionStatus[measurement.id];
    const isCompleted = status?.completed || false;
    const percentage = status?.percentage || 0;

    return (
      <div
        key={measurement.id}
        className="tavi-measurement-thumbnail"
        onClick={() => onMeasurementSelect(measurement)}
      >
        <div className="thumbnail-image-container">
          {/* Placeholder for actual medical image */}
          <div
            className={`thumbnail-image ${isCompleted ? 'with-measurements' : 'blank'}`}
            style={{
              backgroundImage: isCompleted ? `url(${measurement.thumbnailUrl || measurement.imageUrl})` : undefined
            }}
          >
            {!isCompleted && (
              <div className="thumbnail-placeholder">
                <div className="placeholder-icon">📷</div>
                <div className="placeholder-text">Click to measure</div>
              </div>
            )}

            {/* Measurement overlay for completed measurements */}
            {isCompleted && measurement.measurements.length > 0 && (
              <div className="measurement-overlay">
                {measurement.measurements.map((m, index) => (
                  <div
                    key={m.id}
                    className="measurement-line"
                    style={{
                      // Position based on measurement coordinates
                      left: m.coordinates ? `${m.coordinates.startX}%` : `${20 + index * 15}%`,
                      top: m.coordinates ? `${m.coordinates.startY}%` : `${30 + index * 15}%`,
                      width: m.coordinates ?
                        `${Math.sqrt(Math.pow(m.coordinates.endX - m.coordinates.startX, 2) + Math.pow(m.coordinates.endY - m.coordinates.startY, 2))}px` :
                        '40px'
                    }}
                  >
                    <div className="measurement-label">
                      {m.label}: {m.value}mm {m.percentage ? `(${m.percentage}%)` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="thumbnail-info">
          <h3 className="thumbnail-title">{measurement.title}</h3>
          <p className="thumbnail-view">{measurement.view}</p>

          <div className="thumbnail-status">
            {isCompleted ? (
              <div className="status-completed">
                <span className="status-icon">✓</span>
                <span className="status-text">Complete ({percentage}%)</span>
              </div>
            ) : (
              <div className="status-pending">
                <span className="status-icon">○</span>
                <span className="status-text">Pending</span>
              </div>
            )}
          </div>

          {/* Show measurement summary for completed items */}
          {isCompleted && measurement.measurements.length > 0 && (
            <div className="measurement-summary">
              {measurement.measurements.slice(0, 2).map(m => (
                <div key={m.id} className="summary-item">
                  <span className="summary-label">{m.label}:</span>
                  <span className="summary-value">
                    {m.value}mm
                    {m.percentage && (
                      <span className="summary-percentage"> ({m.percentage}%)</span>
                    )}
                  </span>
                </div>
              ))}
              {measurement.measurements.length > 2 && (
                <div className="summary-more">
                  +{measurement.measurements.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCompletionTable = () => {
    const totalMeasurements = measurements.length;
    const completedMeasurements = Object.values(completionStatus).filter(s => s.completed).length;
    const overallProgress = totalMeasurements > 0 ? Math.round((completedMeasurements / totalMeasurements) * 100) : 0;

    return (
      <div className="measurement-results-table">
        <h3>Measurement Results</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Measurement</th>
                <th>Status</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map(measurement => {
                const status = completionStatus[measurement.id];
                const percentage = status?.percentage || 0;

                return (
                  <tr key={measurement.id} className={status?.completed ? 'completed' : 'pending'}>
                    <td className="measurement-name">
                      <div className="name-primary">{measurement.title}</div>
                      <div className="name-secondary">{measurement.view}</div>
                    </td>
                    <td className="measurement-status">
                      {status?.completed ? (
                        <span className="status-complete">Complete</span>
                      ) : (
                        <span className="status-pending">Pending</span>
                      )}
                    </td>
                    <td className="measurement-percentage">
                      <span className="percentage-value">{percentage}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="overall-progress">
          <div className="progress-label">Overall Progress:</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="progress-text">{overallProgress}%</div>
        </div>
      </div>
    );
  };

  const renderPostDeploymentExpansion = () => {
    if (averagePostDeploymentExpansion.mm === 0) return null;

    return (
      <div className="post-deployment-expansion">
        <h3>Average Post Deployment Expansion</h3>
        <div className="expansion-values">
          <div className="expansion-mm">
            <span className="value-label">Distance:</span>
            <span className="value-number">{averagePostDeploymentExpansion.mm}mm</span>
          </div>
          <div className="expansion-percentage">
            <span className="value-label">Percentage:</span>
            <span className="value-number">{averagePostDeploymentExpansion.percentage}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="tavi-grid-view">
      <div className="grid-header">
        <h2>TAVI Measurement Grid</h2>
        <p>Click on any image below to begin or continue measurements</p>
      </div>

      {/* Measurement thumbnails grid */}
      <div className="measurement-grid">
        {measurements.map(renderMeasurementThumbnail)}
      </div>

      {/* Results section */}
      <div className="results-section">
        {renderCompletionTable()}
        {renderPostDeploymentExpansion()}
      </div>
    </div>
  );
};

export default TAVIGridView;