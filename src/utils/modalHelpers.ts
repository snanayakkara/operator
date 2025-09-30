/**
 * Modal Utility Hooks
 *
 * Reusable hooks for proper modal behavior:
 * - Focus trapping (tab cycling within modal)
 * - Scroll locking (prevent body scroll)
 * - Escape key handling
 * - Focus restoration
 */

import { useEffect, useRef, RefObject } from 'react';

/**
 * useFocusTrap - Trap focus within a modal container
 *
 * Ensures keyboard navigation (Tab/Shift+Tab) cycles only through
 * focusable elements inside the modal.
 *
 * @param containerRef - Ref to the modal container element
 * @param isOpen - Whether the modal is currently open
 *
 * @example
 * const modalRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(modalRef, isOpen);
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isOpen: boolean
): void {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');

      return Array.from(container.querySelectorAll<HTMLElement>(selector));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element: wrap to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab on last element: wrap to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, containerRef]);
}

/**
 * useScrollLock - Lock body scroll when modal is open
 *
 * Prevents background scrolling while modal is visible.
 * Restores original overflow style on close.
 *
 * @param isOpen - Whether the modal is currently open
 *
 * @example
 * useScrollLock(isOpen);
 */
export function useScrollLock(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;

    // Store original styles
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Lock scroll
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Restore on cleanup
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);
}

/**
 * useEscapeKey - Close modal on Escape key press
 *
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Callback to close the modal
 *
 * @example
 * useEscapeKey(isOpen, () => setIsOpen(false));
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
}

/**
 * useRestoreFocus - Return focus to trigger element on modal close
 *
 * Stores the currently focused element when modal opens, and
 * restores focus to it when modal closes (for accessibility).
 *
 * @param isOpen - Whether the modal is currently open
 * @param modalRef - Ref to the modal container (for initial focus)
 *
 * @example
 * const modalRef = useRef<HTMLDivElement>(null);
 * useRestoreFocus(isOpen, modalRef);
 */
export function useRestoreFocus(
  isOpen: boolean,
  modalRef: RefObject<HTMLElement>
): void {
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the element that had focus before modal opened
      triggerElementRef.current = document.activeElement as HTMLElement;

      // Focus the modal container for screen readers
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // Restore focus to trigger element when modal closes
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        // Small delay to avoid focus conflicts
        setTimeout(() => {
          triggerElementRef.current?.focus();
        }, 0);
      }
    }
  }, [isOpen, modalRef]);
}
