/**
 * Dropdown Component Library
 *
 * Composable dropdown system with automatic positioning, keyboard navigation,
 * and portal rendering. Consolidates dropdown logic from SessionDropdown,
 * RecordPanel, and DevicePopover.
 */

import React, { useState, useRef, useEffect, ReactNode, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { tokens } from '@/utils/design-tokens';

/**
 * Context for dropdown state management
 */
interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedValue?: string;
  onSelect?: (value: string) => void;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

const useDropdownContext = (): DropdownContextValue => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown');
  }
  return context;
};

/**
 * Dropdown Container
 */
interface DropdownProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultOpen?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  children,
  value,
  onValueChange,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const contextValue: DropdownContextValue = {
    isOpen,
    setIsOpen,
    selectedValue: value,
    onSelect: onValueChange,
  };

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
};

/**
 * DropdownTrigger
 * Button that opens the dropdown
 */
interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

export const DropdownTrigger: React.FC<DropdownTriggerProps> = ({
  children,
  className = '',
  asChild = false,
}) => {
  const { isOpen, setIsOpen } = useDropdownContext();

  const handleClick = (): void => {
    setIsOpen(!isOpen);
  };

  if (asChild) {
    // Clone child and add click handler
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        inline-flex items-center justify-between gap-2
        px-4 py-2 rounded-lg
        bg-white border border-gray-300
        hover:bg-gray-50 hover:border-gray-400
        focus:outline-none focus:ring-2 focus:ring-violet-500
        transition-all
        ${className}
      `}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
    >
      {children}
      <ChevronDown
        className={`w-4 h-4 text-gray-500 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
};

/**
 * DropdownMenu
 * Container for dropdown items with portal and auto-positioning
 */
interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  maxHeight?: number;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  className = '',
  align = 'start',
  sideOffset = 8,
  maxHeight = 320,
}) => {
  const { isOpen, setIsOpen } = useDropdownContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight });

  // Calculate position on open
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const updatePosition = (): void => {
      const trigger = menuRef.current?.parentElement?.querySelector('[aria-haspopup]');
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menuRef.current?.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let top = triggerRect.bottom + sideOffset;
      let left = triggerRect.left;

      // Horizontal alignment
      if (align === 'center') {
        left = triggerRect.left + triggerRect.width / 2 - (menuRect?.width || 0) / 2;
      } else if (align === 'end') {
        left = triggerRect.right - (menuRect?.width || 0);
      }

      // Prevent overflow on right edge
      if (left + (menuRect?.width || 0) > viewportWidth) {
        left = viewportWidth - (menuRect?.width || 0) - 8;
      }

      // Prevent overflow on left edge
      if (left < 8) {
        left = 8;
      }

      // Check if menu fits below trigger
      const spaceBelow = viewportHeight - triggerRect.bottom - sideOffset;
      const spaceAbove = triggerRect.top - sideOffset;

      if (spaceBelow < maxHeight && spaceAbove > spaceBelow) {
        // Position above trigger
        top = triggerRect.top - (menuRect?.height || maxHeight) - sideOffset;
      }

      // Calculate max height based on available space
      const availableHeight = Math.max(spaceBelow, spaceAbove) - 16;
      const calculatedMaxHeight = Math.min(maxHeight, availableHeight);

      setPosition({ top, left, maxHeight: calculatedMaxHeight });
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, align, sideOffset, maxHeight]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target as Node;
      const dropdown = menuRef.current?.parentElement;

      if (dropdown && !dropdown.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const menuContent = (
    <div
      ref={menuRef}
      className={`
        fixed
        bg-white border border-gray-200
        rounded-xl shadow-lg
        py-1
        overflow-y-auto
        animate-in fade-in slide-in-from-top-2
        ${className}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxHeight: `${position.maxHeight}px`,
        zIndex: tokens.zIndex.dropdown,
      }}
      role="listbox"
    >
      {children}
    </div>
  );

  return createPortal(menuContent, document.body);
};

/**
 * DropdownItem
 * Single selectable item in dropdown
 */
interface DropdownItemProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  onSelect?: (value: string) => void;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  value,
  children,
  icon,
  disabled = false,
  className = '',
  onSelect: customOnSelect,
}) => {
  const { selectedValue, onSelect, setIsOpen } = useDropdownContext();
  const isSelected = selectedValue === value;

  const handleClick = (): void => {
    if (disabled) return;

    if (customOnSelect) {
      customOnSelect(value);
    } else if (onSelect) {
      onSelect(value);
    }

    setIsOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2
        text-sm text-left
        hover:bg-gray-100
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${isSelected ? 'bg-violet-50 text-violet-700' : 'text-gray-700'}
        ${className}
      `}
      role="option"
      aria-selected={isSelected}
    >
      {/* Icon */}
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}

      {/* Content */}
      <span className="flex-1">{children}</span>

      {/* Selected indicator */}
      {isSelected && <Check className="w-4 h-4 text-violet-600" />}
    </button>
  );
};

/**
 * DropdownGroup
 * Grouped section with optional label
 */
interface DropdownGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export const DropdownGroup: React.FC<DropdownGroupProps> = ({
  label,
  children,
  className = '',
}) => {
  return (
    <div className={`py-1 ${className}`} role="group" aria-label={label}>
      {label && (
        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * DropdownSeparator
 * Visual separator between groups
 */
export const DropdownSeparator: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return <div className={`my-1 border-t border-gray-200 ${className}`} role="separator" />;
};

/**
 * DropdownLabel
 * Non-interactive label item
 */
interface DropdownLabelProps {
  children: ReactNode;
  className?: string;
}

export const DropdownLabel: React.FC<DropdownLabelProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`px-3 py-2 text-sm font-medium text-gray-900 ${className}`}>
      {children}
    </div>
  );
};

/**
 * DropdownCheckboxItem
 * Item with checkbox (multi-select)
 */
interface DropdownCheckboxItemProps {
  value: string;
  children: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const DropdownCheckboxItem: React.FC<DropdownCheckboxItemProps> = ({
  value,
  children,
  checked,
  onCheckedChange,
  disabled = false,
  className = '',
}) => {
  const handleClick = (): void => {
    if (disabled) return;
    onCheckedChange(!checked);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2
        text-sm text-left text-gray-700
        hover:bg-gray-100
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}
      `}
      role="menuitemcheckbox"
      aria-checked={checked}
    >
      {/* Checkbox */}
      <span
        className={`
          w-4 h-4 flex items-center justify-center
          border-2 rounded
          ${
            checked
              ? 'bg-violet-500 border-violet-500'
              : 'border-gray-300 bg-white'
          }
        `}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>

      {/* Content */}
      <span className="flex-1">{children}</span>
    </button>
  );
};

export default Dropdown;
