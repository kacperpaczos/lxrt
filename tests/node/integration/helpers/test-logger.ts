/**
 * Test Logger - Debug logging helper for integration tests
 * 
 * Provides detailed logging of:
 * - Input/output data
 * - Timing measurements
 * - Memory usage
 * - Test lifecycle events
 * 
 * Logs are ALWAYS written to file: test-logs/test-run-<timestamp>.log
 * Console output is enabled with: DEBUG_TESTS=true npm test
 */

import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import * as path from 'node:path';

export interface TestLoggerOptions {
  /** Enable console output (default: false, use DEBUG_TESTS=true) */
  consoleOutput?: boolean;
  /** Enable file logging (default: true) */
  fileOutput?: boolean;
  showMemory?: boolean;
  showTiming?: boolean;
  maxOutputLength?: number;
}

export interface TimingResult {
  operation: string;
  durationMs: number;
  startTime: number;
  endTime: number;
}

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

// Global log file path - shared across all logger instances
let globalLogFile: string | null = null;

function getLogFilePath(): string {
  if (!globalLogFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logDir = path.join(process.cwd(), 'test-logs');
    
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    
    globalLogFile = path.join(logDir, `test-run-${timestamp}.log`);
    
    // Write header to log file
    const header = [
      '═'.repeat(80),
      `TEST RUN LOG - ${new Date().toISOString()}`,
      `Node: ${process.version}`,
      `Platform: ${process.platform} ${process.arch}`,
      '═'.repeat(80),
      '',
    ].join('\n');
    
    writeFileSync(globalLogFile, header);
  }
  return globalLogFile;
}

const DEFAULT_OPTIONS: TestLoggerOptions = {
  consoleOutput: process.env.DEBUG_TESTS === 'true',
  fileOutput: true,
  showMemory: true,
  showTiming: true,
  maxOutputLength: 500,
};

export class TestLogger {
  private testName: string;
  private options: TestLoggerOptions;
  private timers: Map<string, number> = new Map();
  private timingResults: TimingResult[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private logBuffer: string[] = [];

  constructor(testName: string, options: Partial<TestLoggerOptions> = {}) {
    this.testName = testName;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private get shouldConsole(): boolean {
    return this.options.consoleOutput ?? false;
  }

  private get shouldFile(): boolean {
    return this.options.fileOutput ?? true;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMemory(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  private truncate(value: string, maxLength?: number): string {
    const limit = maxLength ?? this.options.maxOutputLength ?? 500;
    if (value.length <= limit) return value;
    return value.substring(0, limit) + `... [truncated, total: ${value.length} chars]`;
  }

  private stringify(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (value instanceof Blob) return `Blob(${value.size} bytes, type: ${value.type})`;
    if (value instanceof ArrayBuffer) return `ArrayBuffer(${value.byteLength} bytes)`;
    if (value instanceof Float32Array) return `Float32Array(${value.length} elements)`;
    if (value instanceof Uint8Array) return `Uint8Array(${value.length} bytes)`;
    if (Array.isArray(value)) {
      if (value.length > 10) {
        return `Array(${value.length} items) [${value.slice(0, 3).map(v => this.stringify(v)).join(', ')}, ...]`;
      }
      return `[${value.map(v => this.stringify(v)).join(', ')}]`;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /**
   * Write log entry to file and optionally console
   */
  private log(message: string): void {
    const line = message;
    
    // Always buffer for summary
    this.logBuffer.push(line);
    
    // Write to file
    if (this.shouldFile) {
      try {
        appendFileSync(getLogFilePath(), line + '\n');
      } catch (err) {
        // Silently ignore file write errors
      }
    }
    
    // Write to console if enabled
    if (this.shouldConsole) {
      console.log(line);
    }
  }

  /**
   * Log test start
   */
  logTestStart(description?: string): void {
    this.log(`\n${'═'.repeat(60)}`);
    this.log(`[${this.formatTimestamp()}] 🧪 TEST START: ${this.testName}`);
    if (description) {
      this.log(`   Description: ${description}`);
    }
    this.log(`${'═'.repeat(60)}`);
    this.logMemory('test-start');
  }

  /**
   * Log test end
   */
  logTestEnd(success: boolean = true): void {
    const status = success ? '✅ PASS' : '❌ FAIL';
    this.log(`\n[${this.formatTimestamp()}] ${status}: ${this.testName}`);
    this.logMemory('test-end');
    this.printSummary();
    this.log(`${'═'.repeat(60)}\n`);
  }

  /**
   * Log input data
   */
  logInput(label: string, value: unknown): void {
    const formatted = this.truncate(this.stringify(value));
    this.log(`\n[${this.formatTimestamp()}] 📥 INPUT [${label}]:`);
    this.log(`   ${formatted.split('\n').join('\n   ')}`);
  }

  /**
   * Log output data
   */
  logOutput(label: string, value: unknown): void {
    const formatted = this.truncate(this.stringify(value));
    this.log(`\n[${this.formatTimestamp()}] 📤 OUTPUT [${label}]:`);
    this.log(`   ${formatted.split('\n').join('\n   ')}`);
  }

  /**
   * Log a step in the test
   */
  logStep(step: string, details?: string): void {
    this.log(`\n[${this.formatTimestamp()}] 🔹 STEP: ${step}`);
    if (details) {
      this.log(`   ${details}`);
    }
  }

  /**
   * Log model loading
   */
  logModelLoad(modelType: string, modelName: string, config?: Record<string, unknown>): void {
    this.log(`\n[${this.formatTimestamp()}] 🤖 MODEL LOAD: ${modelType}`);
    this.log(`   Model: ${modelName}`);
    if (config) {
      this.log(`   Config: ${JSON.stringify(config)}`);
    }
  }

  /**
   * Log API call
   */
  logApiCall(method: string, args?: Record<string, unknown>): void {
    this.log(`\n[${this.formatTimestamp()}] 🔌 API CALL: ${method}`);
    if (args) {
      const formatted = this.truncate(this.stringify(args));
      this.log(`   Args: ${formatted}`);
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
    this.log(`\n[${this.formatTimestamp()}] ⏱️ TIMER START: ${operation}`);
  }

  /**
   * Stop timing an operation and log result
   */
  stopTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (startTime === undefined) {
      this.log(`⚠️ Timer '${operation}' was not started`);
      return 0;
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    this.timingResults.push({
      operation,
      durationMs,
      startTime,
      endTime,
    });

    this.timers.delete(operation);

    if (this.options.showTiming) {
      this.log(`[${this.formatTimestamp()}] ⏱️ TIMER STOP: ${operation} - ${durationMs.toFixed(2)}ms`);
    }

    return durationMs;
  }

  /**
   * Log timing directly (without start/stop)
   */
  logTiming(operation: string, durationMs: number): void {
    this.timingResults.push({
      operation,
      durationMs,
      startTime: 0,
      endTime: durationMs,
    });

    if (this.options.showTiming) {
      this.log(`\n[${this.formatTimestamp()}] ⏱️ TIMING [${operation}]: ${durationMs.toFixed(2)}ms`);
    }
  }

  /**
   * Log memory usage
   */
  logMemory(label?: string): MemorySnapshot | null {
    if (!this.options.showMemory) return null;

    const memory = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
    };

    this.memorySnapshots.push(snapshot);

    this.log(`\n[${this.formatTimestamp()}] 💾 MEMORY${label ? ` [${label}]` : ''}:`);
    this.log(`   Heap Used:  ${this.formatMemory(snapshot.heapUsed)}`);
    this.log(`   Heap Total: ${this.formatMemory(snapshot.heapTotal)}`);
    this.log(`   RSS:        ${this.formatMemory(snapshot.rss)}`);
    this.log(`   External:   ${this.formatMemory(snapshot.external)}`);

    return snapshot;
  }

  /**
   * Log error
   */
  logError(error: unknown, context?: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    this.log(`\n[${this.formatTimestamp()}] ❌ ERROR${context ? ` [${context}]` : ''}:`);
    this.log(`   Message: ${errorMessage}`);
    if (stack) {
      this.log(`   Stack: ${stack}`);
    }
  }

  /**
   * Log warning
   */
  logWarning(message: string): void {
    this.log(`\n[${this.formatTimestamp()}] ⚠️ WARNING: ${message}`);
  }

  /**
   * Print test summary
   */
  printSummary(): void {
    this.log(`\n${'─'.repeat(40)}`);
    this.log(`📊 TEST SUMMARY: ${this.testName}`);
    this.log(`${'─'.repeat(40)}`);

    // Timing summary
    if (this.timingResults.length > 0) {
      this.log(`\n⏱️ Timing Results:`);
      const totalTime = this.timingResults.reduce((sum, t) => sum + t.durationMs, 0);
      this.timingResults.forEach(t => {
        const percentage = ((t.durationMs / totalTime) * 100).toFixed(1);
        this.log(`   ${t.operation}: ${t.durationMs.toFixed(2)}ms (${percentage}%)`);
      });
      this.log(`   TOTAL: ${totalTime.toFixed(2)}ms`);
    }

    // Memory summary
    if (this.memorySnapshots.length >= 2) {
      const first = this.memorySnapshots[0];
      const last = this.memorySnapshots[this.memorySnapshots.length - 1];
      const heapDiff = last.heapUsed - first.heapUsed;
      const rssDiff = last.rss - first.rss;

      this.log(`\n💾 Memory Delta:`);
      this.log(`   Heap: ${heapDiff >= 0 ? '+' : ''}${this.formatMemory(heapDiff)}`);
      this.log(`   RSS:  ${rssDiff >= 0 ? '+' : ''}${this.formatMemory(rssDiff)}`);
    }

    // Log file location (always show this in console)
    if (this.shouldFile) {
      const logFile = getLogFilePath();
      console.log(`\n📁 Full log: ${logFile}`);
    }
  }

  /**
   * Get all timing results
   */
  getTimingResults(): TimingResult[] {
    return [...this.timingResults];
  }

  /**
   * Get all memory snapshots
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Reset logger state
   */
  reset(): void {
    this.timers.clear();
    this.timingResults = [];
    this.memorySnapshots = [];
    this.logBuffer = [];
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return getLogFilePath();
  }
}

/**
 * Create a test logger instance
 */
export function createTestLogger(testName: string, options?: Partial<TestLoggerOptions>): TestLogger {
  return new TestLogger(testName, options);
}

/**
 * Helper to measure async operation timing
 */
export async function measureAsync<T>(
  logger: TestLogger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  logger.startTimer(operation);
  try {
    const result = await fn();
    logger.stopTimer(operation);
    return result;
  } catch (error) {
    logger.stopTimer(operation);
    throw error;
  }
}

/**
 * Test tags for filtering
 */
export const TEST_TAGS = {
  // Model types
  LLM: 'llm',
  STT: 'stt',
  TTS: 'tts',
  OCR: 'ocr',
  EMBEDDING: 'embedding',
  
  // Categories
  MODEL: 'model',
  FLOW: 'flow',
  ADAPTER: 'adapter',
  CACHE: 'cache',
  LIFECYCLE: 'lifecycle',
  
  // Features
  CORE: 'core',
  AUDIO: 'audio',
  IMAGE: 'image',
  TEXT: 'text',
} as const;

export type TestTag = typeof TEST_TAGS[keyof typeof TEST_TAGS];
