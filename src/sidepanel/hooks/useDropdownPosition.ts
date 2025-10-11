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
  dropdownWidth?: number;
  preferredDirection?: 'auto' | 'up' | 'down';
}

export const useDropdownPosition = (options: UseDropdownPositionOptions) => {
  const {
    isOpen,
    offset = { x: 0, y: 8 },
    alignment = 'right',
    maxHeight = 320,
    dropdownWidth = 280,
    preferredDirection = 'auto'
  } = options;
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
      left = triggerRect.right - dropdownWidth;
      right = viewport.width - triggerRect.right + offset.x;
    } else if (alignment === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - dropdownWidth / 2;
    }

    // Ensure dropdown doesn't go off screen horizontally
    if (left < 8) {
      left = 8;
      right = undefined;
    } else if (left + dropdownWidth > viewport.width - 8) {
      left = viewport.width - dropdownWidth - 8;
      right = 8;
    }

    // Adjust vertical positioning based on preferredDirection
    const availableSpaceBelow = viewport.height - triggerRect.bottom - 8;
    const availableSpaceAbove = triggerRect.top - 8;

    let adjustedMaxHeight = maxHeight;

    // Determine direction: forced up, forced down, or auto
    let showAbove = false;

    if (preferredDirection === 'up') {
      // Force upward
      showAbove = true;
    } else if (preferredDirection === 'down') {
      // Force downward
      showAbove = false;
    } else {
      // Auto: choose based on available space
      showAbove = availableSpaceBelow < maxHeight && availableSpaceAbove > availableSpaceBelow;
    }

    if (showAbove) {
      // Show above the trigger - position bottom of dropdown just above the trigger
      adjustedMaxHeight = Math.min(maxHeight, availableSpaceAbove);
      top = triggerRect.top - adjustedMaxHeight - offset.y;
    } else {
      // Show below the trigger
      adjustedMaxHeight = Math.min(maxHeight, availableSpaceBelow);
    }

    setPosition({
      top,
      left: right !== undefined ? undefined : left,
      right,
      maxHeight: adjustedMaxHeight
    });
  }, [isOpen, offset, alignment, maxHeight, dropdownWidth, preferredDirection]);

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
