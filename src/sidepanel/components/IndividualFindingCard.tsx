import React, { useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  Heart,
  Check,
  Square
} from 'lucide-react';
import type { BatchPatientReviewFinding } from '@/types/medical.types';

interface IndividualFindingCardProps {
  finding: BatchPatientReviewFinding;
  index: number;
  isCompleted: boolean;
  onToggleComplete: (index: number) => void;
  className?: string;
  useBrightDesign?: boolean; // Toggle between subtle and bright design
}

export const IndividualFindingCard: React.FC<IndividualFindingCardProps> = ({
  finding,
  index,
  isCompleted,
  onToggleComplete,
  className = '',
  useBrightDesign = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'Immediate':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'Soon':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'Routine':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    if (isCompleted) {
      return useBrightDesign
        ? 'border-white bg-gradient-bright opacity-60'
        : 'border-gray-200 bg-gray-50 opacity-60';
    }

    if (useBrightDesign) {
      // Bright design: white card with colored border
      switch (urgency) {
        case 'Immediate':
          return 'border-rose-300 bg-gradient-bright-rose';
        case 'Soon':
          return 'border-amber-300 bg-gradient-bright-amber';
        case 'Routine':
          return 'border-emerald-300 bg-gradient-bright-emerald';
        default:
          return 'border-white bg-gradient-bright';
      }
    } else {
      // Subtle design (original)
      switch (urgency) {
        case 'Immediate':
          return 'border-red-200 bg-red-50';
        case 'Soon':
          return 'border-orange-200 bg-orange-50';
        case 'Routine':
          return 'border-green-200 bg-green-50';
        default:
          return 'border-gray-200 bg-gray-50';
      }
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    if (isCompleted) {
      return 'bg-gray-100 text-gray-600';
    }
    switch (urgency) {
      case 'Immediate':
        return 'bg-red-100 text-red-800';
      case 'Soon':
        return 'bg-orange-100 text-orange-800';
      case 'Routine':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleToggleComplete = () => {
    onToggleComplete(index);
  };

  const borderWidth = useBrightDesign ? 'border-bright' : 'border-2';
  const borderRadius = useBrightDesign ? 'rounded-bright' : 'rounded-lg';
  const shadow = useBrightDesign ? 'shadow-bright-card hover:shadow-bright-elevated' : '';

  return (
    <div
      className={`${borderWidth} ${borderRadius} ${shadow} transition-all duration-200 ${getUrgencyColor(finding.urgency)} ${className} ${isCompleted ? 'transform scale-[0.98]' : ''}`}
    >
      {/* Finding Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Completion Checkbox */}
            <button
              onClick={handleToggleComplete}
              className="flex-shrink-0 p-1 rounded-md hover:bg-white/50 transition-colors"
              title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            >
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
            
            <div className="flex items-center space-x-2">
              {getUrgencyIcon(finding.urgency)}
              <span className={`font-semibold text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                Finding {index + 1}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyBadgeColor(finding.urgency)}`}>
              {finding.urgency}
            </span>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {isExpanded ? 'Collapse' : 'Details'}
            </button>
          </div>
        </div>

        {/* Finding Summary */}
        <div className="mb-3">
          <h5 className={`font-medium text-sm mb-1 ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
            Clinical Finding
          </h5>
          <p className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
            {finding.finding}
          </p>
        </div>

        {/* Recommended Action - Always Visible */}
        <div className="mb-3">
          <h5 className={`font-medium text-sm mb-1 ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
            Recommended Action
          </h5>
          <p className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-indigo-700'}`}>
            {finding.recommendedAction}
          </p>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div>
              <h5 className={`font-medium text-sm mb-1 ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                Australian Guideline
              </h5>
              <p className={`text-sm font-medium ${isCompleted ? 'text-gray-400' : 'text-blue-700'}`}>
                {finding.australianGuideline}
              </p>
            </div>

            <div>
              <h5 className={`font-medium text-sm mb-1 ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                Clinical Reasoning
              </h5>
              <p className={`text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>
                {finding.clinicalReasoning}
              </p>
            </div>

            {finding.heartFoundationLink && (
              <div>
                <a
                  href={finding.heartFoundationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center space-x-1 text-sm hover:underline ${
                    isCompleted 
                      ? 'text-gray-400 pointer-events-none' 
                      : 'text-red-600 hover:text-red-700'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Heart Foundation Resource</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completion Status Footer */}
      {isCompleted && (
        <div className="px-4 py-2 bg-green-100 border-t border-green-200">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-700 text-xs font-medium">
              Action completed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};