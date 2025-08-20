import React from 'react';
import { AlertTriangle, X, RotateCcw, Edit3, CheckCircle } from 'lucide-react';

interface ErrorAlertProps {
  warnings?: string[];
  errors?: string[];
  onDismiss?: () => void;
  onRetry?: () => void;
  onEditTranscription?: () => void;
  onAcceptWarning?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  warnings = [],
  errors = [],
  onDismiss,
  onRetry,
  onEditTranscription,
  onAcceptWarning,
  className = ''
}) => {
  const hasWarnings = warnings.length > 0;
  const hasErrors = errors.length > 0;
  
  if (!hasWarnings && !hasErrors) {
    return null;
  }

  return (
    <div className={`glass rounded-2xl p-4 ${className}`}>
      {/* Warnings */}
      {hasWarnings && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-amber-800 text-sm font-medium">Content Warning</h3>
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-amber-600 hover:text-amber-800 transition-colors"
                    title="Dismiss warning"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {warnings.map((warning, index) => (
                <p key={index} className="text-amber-700 text-xs leading-relaxed mb-2 last:mb-0">
                  {warning}
                </p>
              ))}
              
              {/* Warning Actions */}
              <div className="flex flex-wrap gap-2 mt-3">
                {onEditTranscription && (
                  <button
                    onClick={onEditTranscription}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Transcription</span>
                  </button>
                )}
                
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
                
                {onAcceptWarning && (
                  <button
                    onClick={onAcceptWarning}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Accept</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-red-800 text-sm font-medium">Processing Error</h3>
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {errors.map((error, index) => (
                <p key={index} className="text-red-700 text-xs leading-relaxed mb-2 last:mb-0">
                  {error}
                </p>
              ))}
              
              {/* Error Actions */}
              <div className="flex flex-wrap gap-2 mt-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};