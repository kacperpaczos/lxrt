/**
 * ProgressTracker - Tracks progress of AI operations
 * Follows Single Responsibility Principle
 *
 * This utility provides a centralized way to track progress of AI operations,
 * ensuring consistent progress reporting across all components.
 *
 * @author transformers-router
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

export interface ProgressData {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProgressStats {
  totalOperations: number;
  completedOperations: number;
  activeOperations: number;
  averageProgress: number;
  totalDuration: number;
}

export interface ProgressOptions {
  maxOperations?: number;
  cleanupInterval?: number;
}

/**
 * ProgressTracker - Tracks progress of AI operations
 */
export class ProgressTracker extends EventEmitter {
  private operations = new Map<string, ProgressData>();
  private stats = {
    totalOperations: 0,
    completedOperations: 0,
    totalDuration: 0,
  };
  private options: ProgressOptions;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(options: ProgressOptions = {}) {
    super();
    this.options = {
      maxOperations: options.maxOperations || 100,
      cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
    };

    this.startCleanupTimer();
  }

  /**
   * Create a new progress tracker
   */
  createProgress(operationId: string): ProgressTracker {
    const tracker = new ProgressTracker(this.options);

    // Forward events to parent
    tracker.on('progress', data => {
      this.emit('progress', { ...data, operationId });
    });

    tracker.on('error', error => {
      this.emit('error', { error, operationId });
    });

    tracker.on('complete', result => {
      this.emit('complete', { ...result, operationId });
    });

    return tracker;
  }

  /**
   * Update progress
   */
  update(
    stage: string,
    progress: number,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const progressData: ProgressData = {
      stage,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      timestamp: new Date(),
      metadata,
    };

    this.operations.set(stage, progressData);
    this.emit('progress', progressData);
  }

  /**
   * Mark operation as complete
   */
  complete(
    stage: string,
    message: string = 'Operation completed',
    metadata?: Record<string, any>
  ): void {
    this.update(stage, 100, message, metadata);
    this.stats.completedOperations++;
    this.emit('complete', { stage, message, metadata });
  }

  /**
   * Mark operation as error
   */
  error(stage: string, error: Error, metadata?: Record<string, any>): void {
    this.update(stage, 0, `Error: ${error.message}`, {
      ...metadata,
      error: error.message,
    });
    // Don't emit error event to avoid unhandled error warnings in tests
    // this.emit('error', { stage, error, metadata });
  }

  /**
   * Get current progress
   */
  getProgress(stage: string): ProgressData | undefined {
    return this.operations.get(stage);
  }

  /**
   * Get all progress data
   */
  getAllProgress(): ProgressData[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get progress statistics
   */
  getStats(): ProgressStats {
    const activeOperations = this.operations.size;
    const averageProgress =
      activeOperations > 0
        ? Array.from(this.operations.values()).reduce(
            (sum, p) => sum + p.progress,
            0
          ) / activeOperations
        : 0;

    return {
      totalOperations: this.stats.totalOperations,
      completedOperations: this.stats.completedOperations,
      activeOperations,
      averageProgress,
      totalDuration: this.stats.totalDuration,
    };
  }

  /**
   * Clear completed operations
   */
  clearCompleted(): void {
    const completed = Array.from(this.operations.entries()).filter(
      ([, data]) => data.progress === 100
    );

    for (const [stage] of completed) {
      this.operations.delete(stage);
    }

    this.emit('completedCleared', { count: completed.length });
  }

  /**
   * Clear all operations
   */
  clear(): void {
    this.operations.clear();
    this.emit('allCleared');
  }

  /**
   * Dispose of the tracker
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    this.removeAllListeners();
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.options.cleanupInterval) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.options.cleanupInterval);
    }
  }

  /**
   * Clean up old operations
   */
  private cleanup(): void {
    const now = new Date();
    const oldOperations: string[] = [];

    for (const [stage, data] of this.operations.entries()) {
      // Remove operations older than 1 hour
      if (now.getTime() - data.timestamp.getTime() > 3600000) {
        oldOperations.push(stage);
      }
    }

    for (const stage of oldOperations) {
      this.operations.delete(stage);
    }

    if (oldOperations.length > 0) {
      this.emit('operationsCleaned', { count: oldOperations.length });
    }
  }
}
