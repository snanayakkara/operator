import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePortal } from '../hooks/usePortal';

interface DropdownPortalProps {
  isOpen: boolean;
  children: ReactNode;
  onClickOutside?: () => void;
}

export const DropdownPortal: React.FC<DropdownPortalProps> = ({
  isOpen,
  children,
  onClickOutside
}) => {
  const portalContainer = usePortal('dropdown-portal');

  useEffect(() => {
    if (!isOpen || !onClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is outside dropdown content
      if (!target.closest('[data-dropdown-menu]') && !target.closest('[data-dropdown-trigger]')) {
        onClickOutside();
      }
    };

    // Add event listener with a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClickOutside]);

  if (!isOpen || !portalContainer) {
    return null;
  }

  return createPortal(
    <>
      {children}
    </>,
    portalContainer
  );
};