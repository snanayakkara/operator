/**
 * Presentation Page - Main Container
 * 
 * Fetches workup by ID from URL params and renders the bento board.
 * Handles keyboard navigation, page switching, and presentation state.
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import { BentoBoard } from './components/BentoBoard';
import { PatientStrip } from './components/PatientStrip';
import { PageTabBar } from './components/PageTabBar';
import { ImagingGrid } from './components/ImagingGrid';
import { usePresentNavigation } from './hooks/usePresentNavigation';

type PageType = 'summary' | 'imaging';

export const PresentationPage: React.FC = () => {
  const [workup, setWorkup] = useState<TAVIWorkupItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('summary');
  const [planPinned, setPlanPinned] = useState(true);
  const [isEntering, setIsEntering] = useState(true);

  // Get workup ID from URL params
  const workupId = new URLSearchParams(window.location.search).get('workupId');
  const initialPage = new URLSearchParams(window.location.search).get('page') as PageType | null;

  // Fetch workup from storage
  useEffect(() => {
    const fetchWorkup = async () => {
      if (!workupId) {
        setError('No workup ID provided');
        setLoading(false);
        return;
      }

      try {
        // Dynamically import storage service to avoid bundle issues
        const { TAVIWorkupStorageService } = await import('@/services/TAVIWorkupStorageService');
        const storage = TAVIWorkupStorageService.getInstance();
        const workups = await storage.loadWorkups();
        const found = workups.find(w => w.id === workupId);

        if (found) {
          setWorkup(found);
          if (initialPage === 'imaging') {
            setCurrentPage('imaging');
          }
        } else {
          setError('Workup not found');
        }
      } catch (err) {
        console.error('[PresentationPage] Failed to fetch workup:', err);
        setError('Failed to load workup');
      } finally {
        setLoading(false);
        // Trigger enter animation after a short delay
        setTimeout(() => setIsEntering(false), 100);
      }
    };

    fetchWorkup();
  }, [workupId, initialPage]);

  // Navigation hook
  const {
    focusedIndex,
    expandedTiles,
    setFocusedIndex,
    toggleExpand,
    nextStep,
    prevStep,
    jumpToSection
  } = usePresentNavigation(workup);

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for our shortcuts
    const handled = ['ArrowRight', 'ArrowLeft', 'Space', 'Enter', 'Escape', 'KeyI', 'KeyS', 'KeyP', 'Slash'].includes(e.code) ||
      (e.code >= 'Digit0' && e.code <= 'Digit9');

    if (handled) {
      e.preventDefault();
    }

    switch (e.code) {
      case 'ArrowRight':
      case 'Space':
        nextStep();
        break;
      case 'ArrowLeft':
        prevStep();
        break;
      case 'Enter':
        toggleExpand(focusedIndex);
        break;
      case 'Escape':
        window.close();
        break;
      case 'KeyI':
        setCurrentPage('imaging');
        break;
      case 'KeyS':
        setCurrentPage('summary');
        break;
      case 'KeyP':
        setPlanPinned(p => !p);
        break;
      case 'Digit1':
        jumpToSection(0); // Patient
        break;
      case 'Digit2':
        jumpToSection(1); // Background
        break;
      case 'Digit3':
        jumpToSection(2); // Social
        break;
      case 'Digit4':
        jumpToSection(3); // Meds
        break;
      case 'Digit5':
        jumpToSection(4); // Labs
        break;
      case 'Digit6':
        jumpToSection(5); // ECG
        break;
      case 'Digit7':
        jumpToSection(6); // Echo
        break;
      case 'Digit8':
        jumpToSection(7); // Cath
        break;
      case 'Digit9':
        jumpToSection(8); // CT
        break;
      case 'Digit0':
        jumpToSection(9); // Plan
        break;
      case 'Slash':
        // Show help overlay (future)
        break;
    }
  }, [focusedIndex, nextStep, prevStep, toggleExpand, jumpToSection]);

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Loading state
  if (loading) {
    return (
      <div className="presentation-loading">
        <div className="loading-spinner" />
        <div className="loading-text">Loading presentation...</div>
      </div>
    );
  }

  // Error state
  if (error || !workup) {
    return (
      <div className="presentation-error">
        <div className="error-icon">⚠️</div>
        <h2>Unable to Load Presentation</h2>
        <p>{error || 'Workup data not available'}</p>
        <button onClick={() => window.close()} className="error-close-btn">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className={`presentation-container ${isEntering ? 'entering' : 'entered'}`}>
      {/* Patient Strip - Always visible */}
      <PatientStrip workup={workup} />

      {/* Page Tab Bar */}
      <PageTabBar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        planPinned={planPinned}
        onTogglePlan={() => setPlanPinned(p => !p)}
      />

      {/* Main Content Area */}
      <div className="presentation-content">
        {currentPage === 'summary' ? (
          <BentoBoard
            workup={workup}
            focusedIndex={focusedIndex}
            expandedTiles={expandedTiles}
            onTileClick={setFocusedIndex}
            onToggleExpand={toggleExpand}
            planPinned={planPinned}
          />
        ) : (
          <ImagingGrid
            workup={workup}
            planPinned={planPinned}
          />
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="keyboard-hint">
        <span>←→ Navigate</span>
        <span>Enter Expand</span>
        <span>S/I Pages</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
};
