/**
 * BentoTile - Individual Tile Component
 * 
 * Anatomy:
 * - 3px left accent bar
 * - Header with icon, title, expand chevron
 * - Content area (collapsed/expanded)
 * - Focus ring for presentation mode
 */

import React from 'react';

interface BentoTileProps {
  title: string;
  content: string;
  accentColor: string;
  icon: string;
  isFocused: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
  size?: 'normal' | 'large';
  isAlert?: boolean;
}

export const BentoTile: React.FC<BentoTileProps> = ({
  title,
  content,
  accentColor,
  icon,
  isFocused,
  isExpanded,
  onClick,
  onToggleExpand,
  size = 'normal',
  isAlert = false
}) => {
  const hasContent = content && content !== 'Not provided' && content.trim().length > 0;
  
  // Truncate content for summary view
  const getSummary = (): string => {
    if (!hasContent) return 'Not provided';
    const firstLine = content.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
  };

  return (
    <div
      className={`bento-tile ${isFocused ? 'focused' : ''} ${isExpanded ? 'expanded' : ''} ${size === 'large' ? 'tile-large' : ''} ${isAlert ? 'tile-alert' : ''} ${!hasContent ? 'tile-empty' : ''}`}
      onClick={onClick}
      role="region"
      aria-label={title}
      aria-expanded={isExpanded ? 'true' : 'false'}
      aria-current={isFocused ? 'step' : undefined}
      tabIndex={0}
    >
      {/* Left accent bar - using CSS variable for dynamic color */}
      <div 
        className="tile-accent-bar"
        style={{ '--accent-color': hasContent ? accentColor : '#E0E0E0' } as React.CSSProperties}
      />

      {/* Tile content wrapper */}
      <div className="tile-wrapper">
        {/* Header */}
        <div className="tile-header">
          <div className="tile-header-left">
            <span className="tile-icon">{icon}</span>
            <span className="tile-title">{title}</span>
          </div>
          <button
            className={`tile-expand-btn ${isExpanded ? 'rotated' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="tile-content">
          {isExpanded ? (
            <div className="tile-content-expanded">
              {hasContent ? (
                <pre className="tile-text">{content}</pre>
              ) : (
                <span className="tile-empty-text">Not provided</span>
              )}
            </div>
          ) : (
            <div className="tile-content-summary">
              <span className={hasContent ? 'tile-summary' : 'tile-empty-text'}>
                {getSummary()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
