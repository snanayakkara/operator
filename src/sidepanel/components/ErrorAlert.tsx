import React from 'react';
import { AlertTriangle, X, RotateCcw, Edit3, CheckCircle } from 'lucide-react';
import { Button, IconButton } from './buttons';

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
                  <IconButton
                    icon={<X />}
                    onClick={onDismiss}
                    variant="ghost"
                    size="sm"
                    aria-label="Dismiss warning"
                    className="text-amber-600 hover:text-amber-800"
                  />
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
                  <Button
                    onClick={onEditTranscription}
                    variant="ghost"
                    size="sm"
                    startIcon={<Edit3 />}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800"
                  >
                    Edit Transcription
                  </Button>
                )}

                {onRetry && (
                  <Button
                    onClick={onRetry}
                    variant="ghost"
                    size="sm"
                    startIcon={<RotateCcw />}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800"
                  >
                    Retry
                  </Button>
                )}

                {onAcceptWarning && (
                  <Button
                    onClick={onAcceptWarning}
                    variant="ghost"
                    size="sm"
                    startIcon={<CheckCircle />}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800"
                  >
                    Accept
                  </Button>
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
                  <IconButton
                    icon={<X />}
                    onClick={onDismiss}
                    variant="ghost"
                    size="sm"
                    aria-label="Dismiss error"
                    className="text-red-600 hover:text-red-800"
                  />
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
                  <Button
                    onClick={onRetry}
                    variant="ghost"
                    size="sm"
                    startIcon={<RotateCcw />}
                    className="bg-red-100 hover:bg-red-200 text-red-800"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};