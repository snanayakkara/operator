/**
 * CardWithActions Component
 *
 * Standardized card layout with header actions pattern.
 * Title on the left, segmented control actions on the right.
 */

import React, { memo } from 'react';
import { ActionSegmentedControl } from './SegmentedControl';

export type CardVariant = 'default' | 'warning' | 'success' | 'info' | 'error';

interface CardWithActionsProps {
  /** Card title */
  title: string;
  /** Optional subtitle or metadata */
  subtitle?: string;
  /** Visual variant for header tint */
  variant?: CardVariant;
  /** Card content */
  children: React.ReactNode;
  /** Action handlers */
  onCopy?: () => void;
  onInsert?: () => void;
  onEdit?: () => void;
  onTrain?: () => void;
  onDownload?: () => void;
  onReprocess?: () => void;
  onPatient?: () => void;
  onSkip?: () => void;
  /** Success states for feedback */
  copiedRecently?: boolean;
  insertedRecently?: boolean;
  /** Which actions to show */
  actions?: ('copy' | 'insert' | 'edit' | 'train' | 'download' | 'reprocess' | 'patient' | 'skip')[];
  /** Optional custom header content (replaces segmented control) */
  headerActions?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Max height for scrollable body (e.g., "200px" or "50vh") */
  maxBodyHeight?: string;
  /** Hide the header border */
  noBorder?: boolean;
}

const variantStyles: Record<CardVariant, { header: string; border: string }> = {
  default: {
    header: 'bg-gray-50',
    border: 'border-gray-200'
  },
  warning: {
    header: 'bg-amber-50',
    border: 'border-amber-200'
  },
  success: {
    header: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  info: {
    header: 'bg-sky-50',
    border: 'border-sky-200'
  },
  error: {
    header: 'bg-rose-50',
    border: 'border-rose-200'
  }
};

export const CardWithActions: React.FC<CardWithActionsProps> = memo(({
  title,
  subtitle,
  variant = 'default',
  children,
  onCopy,
  onInsert,
  onEdit,
  onTrain,
  onDownload,
  onReprocess,
  onPatient,
  onSkip,
  copiedRecently = false,
  insertedRecently = false,
  actions = ['copy', 'insert'] as ('copy' | 'insert' | 'edit' | 'train' | 'download' | 'reprocess' | 'patient' | 'skip')[],
  headerActions,
  className = '',
  maxBodyHeight,
  noBorder = false
}) => {
  const styles = variantStyles[variant];
  const hasActions = actions.length > 0 && (onCopy || onInsert || onEdit || onTrain || onDownload || onReprocess || onPatient || onSkip);

  return (
    <div className={`bg-white rounded-lg border ${styles.border} overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-3 py-2 ${styles.header} ${!noBorder ? 'border-b ' + styles.border : ''}`}>
        <div className="flex items-center justify-between gap-2">
          {/* Title section */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            )}
          </div>

          {/* Actions */}
          {headerActions || (hasActions && (
            <ActionSegmentedControl
              onCopy={onCopy}
              onInsert={onInsert}
              onEdit={onEdit}
              onTrain={onTrain}
              onDownload={onDownload}
              onReprocess={onReprocess}
              onPatient={onPatient}
              onSkip={onSkip}
              copiedRecently={copiedRecently}
              insertedRecently={insertedRecently}
              actions={actions}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div
        className={`p-3 ${maxBodyHeight ? 'overflow-y-auto' : ''}`}
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
});

CardWithActions.displayName = 'CardWithActions';

/**
 * SimpleCard Component
 *
 * Basic card without header actions, just content.
 */
interface SimpleCardProps {
  title?: string;
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const SimpleCard: React.FC<SimpleCardProps> = memo(({
  title,
  variant = 'default',
  children,
  className = '',
  noPadding = false
}) => {
  const styles = variantStyles[variant];

  return (
    <div className={`bg-white rounded-lg border ${styles.border} overflow-hidden ${className}`}>
      {title && (
        <div className={`px-3 py-2 ${styles.header} border-b ${styles.border}`}>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className={noPadding ? '' : 'p-3'}>
        {children}
      </div>
    </div>
  );
});

SimpleCard.displayName = 'SimpleCard';

export default CardWithActions;
