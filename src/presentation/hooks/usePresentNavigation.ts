/**
 * usePresentNavigation - Keyboard Navigation Hook
 * 
 * Manages focus state, step navigation, and expansion for presentation mode.
 */

import { useState, useCallback } from 'react';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';

// Total number of navigable tiles
const TOTAL_TILES = 10;

interface UsePresentNavigationReturn {
  focusedIndex: number;
  expandedTiles: Set<number>;
  setFocusedIndex: (index: number) => void;
  toggleExpand: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  jumpToSection: (index: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

export const usePresentNavigation = (workup: TAVIWorkupItem | null): UsePresentNavigationReturn => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedTiles, setExpandedTiles] = useState<Set<number>>(new Set());

  // Toggle expansion for a tile
  const toggleExpand = useCallback((index: number) => {
    setExpandedTiles(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Move to next step (wraps around)
  const nextStep = useCallback(() => {
    setFocusedIndex(prev => (prev + 1) % TOTAL_TILES);
  }, []);

  // Move to previous step (wraps around)
  const prevStep = useCallback(() => {
    setFocusedIndex(prev => (prev - 1 + TOTAL_TILES) % TOTAL_TILES);
  }, []);

  // Jump to specific section
  const jumpToSection = useCallback((index: number) => {
    if (index >= 0 && index < TOTAL_TILES) {
      setFocusedIndex(index);
    }
  }, []);

  // Expand all tiles
  const expandAll = useCallback(() => {
    const all = new Set<number>();
    for (let i = 0; i < TOTAL_TILES; i++) {
      all.add(i);
    }
    setExpandedTiles(all);
  }, []);

  // Collapse all tiles
  const collapseAll = useCallback(() => {
    setExpandedTiles(new Set());
  }, []);

  return {
    focusedIndex,
    expandedTiles,
    setFocusedIndex,
    toggleExpand,
    nextStep,
    prevStep,
    jumpToSection,
    expandAll,
    collapseAll
  };
};
