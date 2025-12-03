/**
 * StatusBadge - Reusable status indicator component
 *
 * Displays the current status of an optimization step with appropriate
 * color coding and icons.
 */

import React from 'react';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

export type StepStatus = 'not-started' | 'ready' | 'in-progress' | 'complete' | 'blocked';

interface StatusBadgeProps {
  status: StepStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'complete':
        return {
          icon: CheckCircle,
          label: 'Complete',
          className: 'bg-teal-100 text-teal-700 border-teal-300'
        };
      case 'ready':
        return {
          icon: CheckCircle,
          label: 'Ready',
          className: 'bg-emerald-100 text-emerald-700 border-emerald-300'
        };
      case 'in-progress':
        return {
          icon: Clock,
          label: 'In Progress',
          className: 'bg-blue-100 text-blue-700 border-blue-300'
        };
      case 'blocked':
        return {
          icon: XCircle,
          label: 'Blocked',
          className: 'bg-red-100 text-red-700 border-red-300'
        };
      case 'not-started':
      default:
        return {
          icon: AlertCircle,
          label: 'Not Started',
          className: 'bg-gray-100 text-gray-600 border-gray-300'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.className} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};
