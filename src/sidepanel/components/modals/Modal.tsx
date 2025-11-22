/**
 * Modal Component
 *
 * Base modal component with consistent backdrop, z-index, and keyboard handling
 * Provides standardized layout sections (header, body, footer)
 */

import React, { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { tokens } from '@/utils/design-tokens';
import Button, { IconButton } from '../buttons/Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Modal size
   */
  size?: ModalSize;

  /**
   * Modal title (displayed in header)
   */
  title?: string;

  /**
   * Modal content
   */
  children: ReactNode;

  /**
   * Footer content (typically action buttons)
   */
  footer?: ReactNode;

  /**
   * Whether to show the close button
   */
  showCloseButton?: boolean;

  /**
   * Whether clicking backdrop closes modal
   */
  closeOnBackdropClick?: boolean;

  /**
   * Whether pressing Escape closes modal
   */
  closeOnEscape?: boolean;

  /**
   * Additional classes for modal container
   */
  className?: string;

  /**
   * Additional classes for modal content
   */
  contentClassName?: string;

  /**
   * Custom header content (overrides title)
   */
  header?: ReactNode;

  /**
   * Disable scroll locking
   */
  disableScrollLock?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  title,
  children,
  footer,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  contentClassName = '',
  header,
  disableScrollLock = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Size configurations
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  // Lock scroll when modal opens
  useEffect(() => {
    if (!isOpen || disableScrollLock) return;

    previousActiveElement.current = document.activeElement;

    // Lock scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.body.style.overflow = originalOverflow;

      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, disableScrollLock]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: tokens.zIndex.modal }}
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-white rounded-2xl shadow-2xl
          flex flex-col
          ${size === 'full' ? 'h-[95vh]' : 'max-h-[90vh]'}
          transform transition-all
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || header || showCloseButton) && (
          <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200">
            {header ? (
              header
            ) : title ? (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-gray-900 flex-1"
              >
                {title}
              </h2>
            ) : (
              <div className="flex-1" />
            )}

            {showCloseButton && (
              <IconButton
                onClick={onClose}
                icon={X}
                variant="ghost"
                size="sm"
                aria-label="Close modal"
                className="ml-4 text-gray-400 hover:text-gray-600"
              />
            )}
          </div>
        )}

        {/* Body */}
        <div
          className={`
            flex-1 overflow-y-auto px-6 py-5
            ${contentClassName}
          `}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
};

/**
 * ConfirmModal Component
 * Pre-configured modal for confirmation dialogs
 */
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
}) => {
  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700'
      : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
            size="md"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
            size="md"
            isLoading={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-700">{message}</p>
    </Modal>
  );
};

/**
 * AlertModal Component
 * Pre-configured modal for alerts
 */
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  buttonText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'OK',
}) => {
  const variantConfig = {
    info: {
      headerClass: 'bg-blue-50 border-blue-200',
      titleClass: 'text-blue-900',
      buttonClass: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
    },
    success: {
      headerClass: 'bg-emerald-50 border-emerald-200',
      titleClass: 'text-emerald-900',
      buttonClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
    },
    warning: {
      headerClass: 'bg-amber-50 border-amber-200',
      titleClass: 'text-amber-900',
      buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
    },
    error: {
      headerClass: 'bg-rose-50 border-rose-200',
      titleClass: 'text-rose-900',
      buttonClass: 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700',
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      header={
        <div className={`w-full -mx-6 -mt-5 px-6 py-4 border-b ${config.headerClass}`}>
          <h2 className={`text-xl font-semibold ${config.titleClass}`}>{title}</h2>
        </div>
      }
      footer={
        <Button
          onClick={onClose}
          variant={
            variant === 'success' ? 'success' :
            variant === 'error' ? 'danger' :
            variant === 'warning' ? 'primary' :
            'primary'
          }
          size="md"
        >
          {buttonText}
        </Button>
      }
    >
      <p className="text-gray-700">{message}</p>
    </Modal>
  );
};

export default Modal;
