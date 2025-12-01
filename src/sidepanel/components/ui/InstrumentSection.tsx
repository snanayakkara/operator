/**
 * InstrumentSection Component
 *
 * Standardized section pattern for instrument panel aesthetic:
 * - Header row: Title + meta + tags (left) | Segmented actions (right)
 * - Body: Content with consistent padding
 * - 1px separator between sections
 * - Optional hover toolbar on body right edge
 */

import React, { memo, ReactNode } from 'react';
import { SegmentedControl, SegmentOption } from './SegmentedControl';
import { Tag, TagProps } from './Tag';

interface InstrumentSectionProps {
  /** Section title */
  title: string;
  /** Optional subtitle/meta text */
  meta?: string;
  /** Tags to display in header */
  tags?: Array<{
    label: string;
    color?: TagProps['color'];
    variant?: TagProps['variant'];
  }>;
  /** Segmented control options for header actions */
  actions?: SegmentOption[];
  /** Handler for action selection */
  onAction?: (id: string) => void;
  /** Currently selected/success action ID */
  selectedActionId?: string;
  /** Section body content */
  children: ReactNode;
  /** Optional hover toolbar content */
  toolbar?: ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether to show bottom border */
  showBorder?: boolean;
  /** Compact mode - reduced padding */
  compact?: boolean;
}

export const InstrumentSection: React.FC<InstrumentSectionProps> = memo(({
  title,
  meta,
  tags = [],
  actions,
  onAction,
  selectedActionId,
  children,
  toolbar,
  className = '',
  showBorder = true,
  compact = false
}) => {
  return (
    <div className={`group relative ${className}`}>
      {/* Header row */}
      <div className={`flex items-center justify-between gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
        {/* Left: Title + meta + tags */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-gray-900 truncate">
            {title}
          </h3>
          {meta && (
            <span className="text-[10px] text-gray-500 truncate">
              {meta}
            </span>
          )}
          {tags.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {tags.map((tag, index) => (
                <Tag
                  key={index}
                  color={tag.color || 'gray'}
                  variant={tag.variant || 'subtle'}
                  size="xs"
                >
                  {tag.label}
                </Tag>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        {actions && actions.length > 0 && onAction && (
          <div className="flex-shrink-0">
              <SegmentedControl
                options={actions}
                onChange={onAction}
                successId={selectedActionId}
                size="sm"
              />
            </div>
          )}
      </div>

      {/* Body */}
      <div className={`relative ${compact ? 'px-2 pb-2' : 'px-3 pb-3'}`}>
        {children}

        {/* Hover toolbar */}
        {toolbar && (
          <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {toolbar}
          </div>
        )}
      </div>

      {/* Bottom border */}
      {showBorder && (
        <div className="h-px bg-gray-200" />
      )}
    </div>
  );
});

InstrumentSection.displayName = 'InstrumentSection';

export default InstrumentSection;
