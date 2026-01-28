/**
 * LogBus - Centralized logging infrastructure with subscription support
 * Enables test assertions on log output and unified logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  source?: string;
}

export type LogSubscriber = (entry: LogEntry) => void;

/**
 * LogBus interface - Central logging hub
 */
export interface ILogBus {
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;

  /** Subscribe to log entries, returns unsubscribe function */
  subscribe(callback: LogSubscriber): () => void;

  /** Get recent log history */
  getHistory(limit?: number): LogEntry[];

  /** Clear log history */
  clearHistory(): void;

  /** Set source name for log entries */
  withSource(source: string): ILogBus;
}

class LogBusImpl implements ILogBus {
  private subscribers: Set<LogSubscriber> = new Set();
  private history: LogEntry[] = [];
  private maxHistorySize = 1000;
  private sourceName?: string;
  private outputEnabled = true;

  constructor(source?: string) {
    this.sourceName = source;
  }

  log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      source: this.sourceName,
    };

    // Store in history
    this.history.push(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Notify subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(entry);
      } catch {
        // Ignore subscriber errors
      }
    }

    // Output to console (can be configured)
    if (this.outputEnabled) {
      const prefix = this.sourceName ? `[${this.sourceName}]` : '';
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';

      switch (level) {
        case 'debug':
          console.debug(`${prefix} ${message}${contextStr}`);
          break;
        case 'info':
          console.info(`${prefix} ${message}${contextStr}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}${contextStr}`);
          break;
        case 'error':
          console.error(`${prefix} ${message}${contextStr}`);
          break;
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  subscribe(callback: LogSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getHistory(limit?: number): LogEntry[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  withSource(source: string): ILogBus {
    const child = new LogBusImpl(source);
    child.subscribers = this.subscribers;
    child.history = this.history;
    child.outputEnabled = this.outputEnabled;
    return child;
  }

  /** For testing: disable console output */
  setOutputEnabled(enabled: boolean): void {
    this.outputEnabled = enabled;
  }
}

// Global singleton
let globalLogBus: LogBusImpl | null = null;

/**
 * Get the global LogBus instance
 */
export function getLogBus(): ILogBus {
  if (!globalLogBus) {
    globalLogBus = new LogBusImpl();
  }
  return globalLogBus;
}

/**
 * Create a new LogBus with a specific source name
 */
export function createLogBus(source: string): ILogBus {
  return getLogBus().withSource(source);
}

/**
 * Reset the global LogBus (for testing)
 */
export function resetLogBus(): void {
  if (globalLogBus) {
    globalLogBus.clearHistory();
  }
  globalLogBus = null;
}

// Re-export for convenience
export { LogBusImpl };
