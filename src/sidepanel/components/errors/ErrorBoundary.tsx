/**
 * ErrorBoundary Component
 *
 * Global error boundary to catch React errors and display fallback UI
 * Prevents blank screens and provides user-friendly error recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorFallback from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to extension error tracking (if implemented)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // Future: Send to error tracking service
    // For now, just log with context
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('Error Log:', JSON.stringify(errorLog, null, 2));

    // Store in localStorage for debugging (limit to last 10 errors)
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem('operator_error_logs') || '[]'
      ) as unknown[];
      const updatedErrors = [errorLog, ...existingErrors].slice(0, 10);
      localStorage.setItem('operator_error_logs', JSON.stringify(updatedErrors));
    } catch (e) {
      console.error('Failed to save error log:', e);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use custom FallbackComponent if provided
      const FallbackComponent = this.props.FallbackComponent || ErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
