import { useState, useEffect, useRef, useCallback } from 'react';

interface DropdownPosition {
  top: number;
  left?: number;
  right?: number;
  maxHeight?: number;
}

interface UseDropdownPositionOptions {
  isOpen: boolean;
  offset?: { x: number; y: number };
  alignment?: 'left' | 'right' | 'center';
  maxHeight?: number;
}

export const useDropdownPosition = (options: UseDropdownPositionOptions) => {
  const { isOpen, offset = { x: 0, y: 8 }, alignment = 'right', maxHeight = 320 } = options;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0 });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let top = triggerRect.bottom + offset.y;
    let left = triggerRect.left + offset.x;
    let right: number | undefined;

    // Adjust horizontal positioning based on alignment
    if (alignment === 'right') {
      left = triggerRect.right - 280; // Assume dropdown width of 280px
      right = viewport.width - triggerRect.right + offset.x;
    } else if (alignment === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - 140; // Half of assumed dropdown width
    }

    // Ensure dropdown doesn't go off screen horizontally
    if (left < 8) {
      left = 8;
      right = undefined;
    } else if (left + 280 > viewport.width - 8) {
      left = viewport.width - 280 - 8;
      right = 8;
    }

    // Adjust vertical positioning if dropdown would go off screen
    const availableSpaceBelow = viewport.height - triggerRect.bottom - 8;
    const availableSpaceAbove = triggerRect.top - 8;
    
    let adjustedMaxHeight = maxHeight;
    
    if (availableSpaceBelow < maxHeight && availableSpaceAbove > availableSpaceBelow) {
      // Show above the trigger
      top = triggerRect.top - maxHeight - offset.y;
      adjustedMaxHeight = Math.min(maxHeight, availableSpaceAbove);
    } else {
      // Show below the trigger (default)
      adjustedMaxHeight = Math.min(maxHeight, availableSpaceBelow);
    }

    setPosition({
      top,
      left: right !== undefined ? undefined : left,
      right,
      maxHeight: adjustedMaxHeight
    });
  }, [isOpen, offset, alignment, maxHeight]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      
      // Recalculate on window resize or scroll
      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, calculatePosition]);

  return {
    triggerRef,
    dropdownRef,
    position,
    calculatePosition
  };
};