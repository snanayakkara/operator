/**
 * PageTabBar - Summary/Imaging Page Switcher
 * 
 * Subtle tab bar below patient strip for switching between pages.
 */

import React from 'react';

type PageType = 'summary' | 'imaging' | 'sizing';

interface PageTabBarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  planPinned: boolean;
  onTogglePlan: () => void;
}

export const PageTabBar: React.FC<PageTabBarProps> = ({
  currentPage,
  onPageChange,
  planPinned,
  onTogglePlan
}) => {
  return (
    <div className="page-tab-bar">
      <div className="tab-bar-left" role="tablist" aria-label="Page navigation">
        <button
          className={`tab-button ${currentPage === 'summary' ? 'active' : ''}`}
          onClick={() => onPageChange('summary')}
          aria-selected={currentPage === 'summary' ? 'true' : 'false'}
          role="tab"
          id="tab-summary"
          aria-controls="panel-summary"
        >
          <span className="tab-label">Summary</span>
          {currentPage === 'summary' && <span className="tab-indicator" />}
        </button>
        <button
          className={`tab-button ${currentPage === 'imaging' ? 'active' : ''}`}
          onClick={() => onPageChange('imaging')}
          aria-selected={currentPage === 'imaging' ? 'true' : 'false'}
          role="tab"
          id="tab-imaging"
          aria-controls="panel-imaging"
        >
          <span className="tab-label">Imaging</span>
          {currentPage === 'imaging' && <span className="tab-indicator" />}
        </button>
        <button
          className={`tab-button ${currentPage === 'sizing' ? 'active' : ''}`}
          onClick={() => onPageChange('sizing')}
          aria-selected={currentPage === 'sizing' ? 'true' : 'false'}
          role="tab"
          id="tab-sizing"
          aria-controls="panel-sizing"
        >
          <span className="tab-label">Valve Sizing</span>
          {currentPage === 'sizing' && <span className="tab-indicator" />}
        </button>
      </div>

      <div className="tab-bar-right">
        <button
          className={`pin-plan-button ${planPinned ? 'pinned' : ''}`}
          onClick={onTogglePlan}
          aria-pressed={planPinned ? 'true' : 'false'}
          title={planPinned ? 'Hide Plan Rail (P)' : 'Show Plan Rail (P)'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 1V15M8 1L4 5M8 1L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{planPinned ? 'Plan Pinned' : 'Pin Plan'}</span>
        </button>
        <div className="keyboard-shortcuts-hint">
          <kbd>S</kbd> Summary
          <kbd>I</kbd> Imaging
          <kbd>V</kbd> Sizing
          <kbd>P</kbd> Toggle Plan
        </div>
      </div>
    </div>
  );
};
