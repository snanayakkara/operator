/**
 * Structured logging utility for Xestro EMR Assistant
 * Provides development and production-appropriate logging levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  component?: string;
  operation?: string;
  patientId?: string;
  timestamp?: number;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private isDevelopment: boolean = true;

  private constructor() {
    // Detect environment - use chrome extension environment detection
    this.isDevelopment = chrome?.runtime?.getManifest()?.name?.includes('dev') ?? true;
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    return `${timestamp} [${levelStr}] ${message}${contextStr}`;
  }

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
      console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
    }
  }

  // Convenience methods for medical operations
  public medical(operation: string, message: string, context?: LogContext): void {
    this.info(message, { ...context, component: 'medical', operation });
  }

  public agent(agentName: string, message: string, context?: LogContext): void {
    this.debug(message, { ...context, component: 'agent', agent: agentName });
  }

  public transcription(message: string, context?: LogContext): void {
    this.debug(message, { ...context, component: 'transcription' });
  }

  public emr(message: string, context?: LogContext): void {
    this.debug(message, { ...context, component: 'emr' });
  }

  public batch(message: string, context?: LogContext): void {
    this.info(message, { ...context, component: 'batch-processing' });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions for backward compatibility
export const log = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);