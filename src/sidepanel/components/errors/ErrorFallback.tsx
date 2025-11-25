/**
 * ErrorFallback Component
 *
 * User-friendly error screen displayed when ErrorBoundary catches an error
 * Provides error details and recovery options
 */

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import type { ErrorFallbackProps } from './ErrorBoundary';
import Button from '../buttons/Button';

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, resetError }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyError = async (): Promise<void> => {
    const errorText = `
Error: ${error?.name || 'Unknown Error'}
Message: ${error?.message || 'No message'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy error:', e);
    }
  };

  const handleReload = (): void => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50/50 to-pink-50/40 p-8">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-rose-200/60 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border-b border-rose-200/60 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-rose-900">
                Something went wrong
              </h1>
              <p className="text-sm text-rose-700 mt-1">
                The application encountered an unexpected error
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-rose-900 mb-2">Error Details</h2>
            <p className="text-sm text-rose-700 font-mono break-words">
              {error?.message || 'An unknown error occurred'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={resetError}
              variant="primary"
              size="md"
              fullWidth
              startIcon={<RefreshCw />}
            >
              Try Again
            </Button>
            <Button
              onClick={handleReload}
              variant="outline"
              size="md"
              fullWidth
            >
              Reload Page
            </Button>
          </div>

          {/* Technical Details Toggle */}
          <div className="border-t border-gray-200 pt-4">
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              size="md"
              fullWidth
              endIcon={showDetails ? <ChevronUp /> : <ChevronDown />}
              className="!justify-between"
            >
              Technical Details
            </Button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                {/* Error Stack */}
                {error?.stack && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">
                      Stack Trace
                    </h3>
                    <pre className="text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {/* Component Stack */}
                {errorInfo?.componentStack && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">
                      Component Stack
                    </h3>
                    <pre className="text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                {/* Copy Button */}
                <Button
                  onClick={handleCopyError}
                  variant="outline"
                  size="md"
                  fullWidth
                  startIcon={<Copy className={copied ? 'text-emerald-600' : ''} />}
                  isSuccess={copied}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  {copied ? 'Copied!' : 'Copy Error Details'}
                </Button>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              What can you do?
            </h3>
            <ul className="text-sm text-blue-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Click "Try Again" to attempt recovery without reloading</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Click "Reload Page" for a fresh start</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Copy error details to report the issue</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  If the problem persists, check the browser console (F12) for more
                  information
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
