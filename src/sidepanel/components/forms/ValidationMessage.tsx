/**
 * ValidationMessage Component
 *
 * Displays consistent validation feedback for form fields
 * Supports error, warning, success, and info states with icons
 */

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { tokens } from '@/utils/design-tokens';

export type ValidationMessageType = 'error' | 'warning' | 'success' | 'info';

interface ValidationMessageProps {
  type: ValidationMessageType;
  message: string;
  className?: string;
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  className = '',
}) => {
  if (!message) return null;

  const config = {
    error: {
      icon: AlertCircle,
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      iconColor: 'text-rose-500',
    },
    warning: {
      icon: AlertTriangle,
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-500',
    },
    success: {
      icon: CheckCircle2,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-500',
    },
    info: {
      icon: Info,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
    },
  };

  const { icon: Icon, textColor, bgColor, borderColor, iconColor } = config[type];

  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-lg border ${bgColor} ${borderColor} ${className}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <p className={`text-sm ${textColor} flex-1`}>{message}</p>
    </div>
  );
};

/**
 * Inline ValidationMessage variant (minimal styling for below-input use)
 */
export const InlineValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  className = '',
}) => {
  if (!message) return null;

  const config = {
    error: {
      icon: AlertCircle,
      textColor: 'text-rose-600',
      iconColor: 'text-rose-500',
    },
    warning: {
      icon: AlertTriangle,
      textColor: 'text-amber-700',
      iconColor: 'text-amber-500',
    },
    success: {
      icon: CheckCircle2,
      textColor: 'text-emerald-600',
      iconColor: 'text-emerald-500',
    },
    info: {
      icon: Info,
      textColor: 'text-blue-600',
      iconColor: 'text-blue-500',
    },
  };

  const { icon: Icon, textColor, iconColor } = config[type];

  return (
    <div
      className={`flex items-start gap-1.5 mt-1 ${className}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <p className={`text-xs ${textColor}`}>{message}</p>
    </div>
  );
};

/**
 * Field-level validation wrapper
 * Combines input field with inline validation message
 */
interface FieldValidationWrapperProps {
  children: React.ReactNode;
  error?: string;
  warning?: string;
  success?: string;
  helperText?: string;
  className?: string;
}

export const FieldValidationWrapper: React.FC<FieldValidationWrapperProps> = ({
  children,
  error,
  warning,
  success,
  helperText,
  className = '',
}) => {
  // Priority: error > warning > success > helperText
  const validationMessage = error || warning || success;
  const validationType: ValidationMessageType | undefined = error
    ? 'error'
    : warning
    ? 'warning'
    : success
    ? 'success'
    : undefined;

  return (
    <div className={`w-full ${className}`}>
      {children}
      {validationMessage && validationType && (
        <InlineValidationMessage type={validationType} message={validationMessage} />
      )}
      {!validationMessage && helperText && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default ValidationMessage;
