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
import type {
  VectorizationStage,
  VectorizationProgressEventData,
  VectorModality,
  JobStatus,
} from '../core/types';

export interface ProgressData {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
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

type StageWeights = Record<string, number>;

interface StageProgressMetadata {
  message?: string;
  itemsProcessed?: number;
  bytesProcessed?: number;
  chunksTotal?: number;
  partialResult?: {
    indexedIds?: string[];
    failedItems?: string[];
  };
  warnings?: string[];
}

type StageStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled';

interface StageState {
  name: string;
  weight: number;
  progress: number; // 0-1
  status: StageStatus;
  startedAt?: number;
  completedAt?: number;
  metadata?: StageProgressMetadata;
}

interface JobRecord {
  id: string;
  input: unknown;
  inputMeta: VectorizationProgressEventData['inputMeta'];
  options?: unknown;
  stageWeights: StageWeights;
  stageOrder: string[];
  stages: StageState[];
  status: JobStatus;
  stageIndex: number;
  createdAt: number;
  completedAt?: number;
  progress: number;
  result?: unknown;
  error?: { stage: string; message: string };
}

export interface ProgressTrackerJob {
  id: string;
  status: JobStatus;
  progress: number;
  stageIndex: number;
  stageOrder: string[];
  stages: StageState[];
  input: unknown;
  inputMeta: VectorizationProgressEventData['inputMeta'];
  createdAt: number;
  completedAt?: number;
  result?: unknown;
  error?: { stage: string; message: string };
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
  private jobs = new Map<string, JobRecord>();
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
   * Subscribe to tracker events with automatic cleanup
   */
  subscribe<T = unknown>(
    event: string,
    handler: (data: T) => void
  ): () => void {
    // EventEmitter expects generic handler, cast is safe for typed events
    const wrappedHandler = (data: unknown) => handler(data as T);
    super.on(event, wrappedHandler);
    return () => {
      super.off(event, wrappedHandler);
    };
  }

  /**
   * Create a child tracker that forwards events
   */
  createProgress(operationId: string): ProgressTracker {
    const tracker = new ProgressTracker(this.options);

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
   * ===========================
   * Legacy stage-based helpers
   * ===========================
   */

  /**
   * Update progress
   */
  update(
    stage: string,
    progress: number,
    message: string,
    metadata?: Record<string, unknown>
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
    metadata?: Record<string, unknown>
  ): void {
    this.update(stage, 100, message, metadata);
    this.stats.completedOperations++;
    this.emit('complete', { stage, message, metadata });
  }

  /**
   * Mark operation as error
   */
  error(stage: string, error: Error, metadata?: Record<string, unknown>): void {
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

    const cutoff = now.getTime() - 3600000; // 1 hour
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        job.completedAt &&
        job.completedAt < cutoff &&
        (job.status === 'completed' ||
          job.status === 'error' ||
          job.status === 'cancelled')
      ) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * ===========================
   * Vectorization-aware helpers
   * ===========================
   */

  /**
   * Get default stage weights for modality
   */
  getStageWeights(modality?: VectorModality | string): StageWeights {
    const normalizedModality = (modality || 'text') as VectorModality;
    const heavierExtraction =
      normalizedModality === 'audio' || normalizedModality === 'video';

    const weights: StageWeights = {
      queued: 2,
      initializing: 10,
      extracting: heavierExtraction ? 22 : 15,
      sanitizing: normalizedModality === 'text' ? 10 : 5,
      chunking: 10,
      embedding: 30,
      upserting: 9,
      finalizing: 2,
    };

    return { ...weights };
  }

  /**
   * Create a new vectorization job
   */
  createJob(
    input: unknown,
    options?: { modality?: VectorModality },
    stageWeights?: StageWeights
  ): string {
    const modality = options?.modality ?? this.detectModalityFromInput(input);
    const weights = stageWeights || this.getStageWeights(modality);
    const jobId = this.generateJobId();
    const stageStates = Object.entries(weights).map(([name, weight]) => ({
      name,
      weight: Math.max(weight, 0.0001),
      progress: 0,
      status: 'pending' as StageStatus,
    }));

    const job: JobRecord = {
      id: jobId,
      input,
      inputMeta: this.buildInputMeta(input, modality),
      options,
      stageWeights: { ...weights },
      stageOrder: stageStates.map(stage => stage.name),
      stages: stageStates,
      status: 'queued',
      stageIndex: -1,
      createdAt: Date.now(),
      progress: 0,
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Cancel job processing
   */
  cancelJob(jobId: string, reason = 'Job cancelled'): void {
    const job = this.getJob(jobId);
    job.status = 'cancelled';
    job.completedAt = Date.now();
    const stage = this.getCurrentStage(job) ?? this.ensureStage(job, 'queued');
    stage.status = 'cancelled';
    stage.metadata = {
      ...(stage.metadata || {}),
      warnings: [...(stage.metadata?.warnings || []), reason],
      message: reason,
    };
    const event = this.buildStageEvent(job, stage);
    this.emit('stage:progress', event);
    this.emit('stage:end', event);
    this.emit('warning', { jobId, reason });
  }

  /**
   * Start a stage for a job
   */
  startStage(jobId: string, stageName: string): void {
    const job = this.getJob(jobId);
    const stage = this.ensureStage(job, stageName);

    job.status = 'running';
    job.stageIndex = job.stageOrder.indexOf(stage.name);
    stage.status = 'running';
    stage.startedAt = Date.now();

    const event = this.buildStageEvent(job, stage, undefined, 0);
    this.emit('stage:start', event);
    this.emit('stage:progress', event);
  }

  /**
   * Complete current stage
   */
  completeStage(jobId: string): void {
    const job = this.getJob(jobId);
    const stage = this.getCurrentStage(job);
    if (!stage) {
      return;
    }

    stage.status = 'completed';
    stage.progress = 1;
    stage.completedAt = Date.now();

    const event = this.buildStageEvent(job, stage);
    this.emit('stage:progress', event);
    this.emit('stage:end', event);
  }

  /**
   * Update stage progress (0-1)
   */
  updateProgress(
    jobId: string,
    stageProgress: number,
    metadata?: StageProgressMetadata
  ): void {
    const job = this.getJob(jobId);
    const stage = this.getCurrentStage(job);
    if (!stage) {
      return;
    }

    stage.status = stage.status === 'pending' ? 'running' : stage.status;
    stage.progress = this.clampProgress(stageProgress);
    if (metadata) {
      stage.metadata = {
        ...(stage.metadata || {}),
        ...metadata,
      };
    }

    const event = this.buildStageEvent(job, stage, metadata);
    job.progress = event.progress;
    this.emit('stage:progress', event);
  }

  /**
   * Complete job
   */
  completeJob(jobId: string, result?: unknown): void {
    const job = this.getJob(jobId);
    job.status = 'completed';
    job.result = result;
    job.completedAt = Date.now();
    job.progress = 1;

    const stage =
      this.getCurrentStage(job) ?? this.ensureStage(job, 'finalizing');
    stage.status = 'completed';
    stage.progress = 1;
    stage.completedAt = Date.now();

    const event = this.buildStageEvent(job, stage);
    this.emit('stage:progress', event);
    this.emit('stage:end', event);
    this.emit('job:complete', { jobId, result });
  }

  /**
   * Complete job with error
   */
  completeWithError(jobId: string, stageName: string, message: string): void {
    const job = this.getJob(jobId);
    const stage = this.ensureStage(job, stageName);

    stage.status = 'error';
    stage.progress = 0;
    stage.completedAt = Date.now();

    job.status = 'error';
    job.error = { stage: stageName, message };
    job.completedAt = Date.now();

    const event = this.buildStageEvent(job, stage, {
      warnings: [message],
    });
    event.error = {
      stage: stage.name as VectorizationStage,
      message,
    };

    this.emit('stage:progress', event);
    this.emit('stage:end', event);
    this.emit('error', { jobId, stage: stage.name, message });
  }

  /**
   * Create snapshot of job state
   */
  getJobStatus(jobId: string): ProgressTrackerJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      return undefined;
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stageIndex: job.stageIndex,
      stageOrder: [...job.stageOrder],
      stages: job.stages.map(stage => ({ ...stage })),
      input: job.input,
      inputMeta: job.inputMeta,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      result: job.result,
      error: job.error,
    };
  }

  /**
   * Get metadata extracted from input
   */
  getInputMeta(input: unknown): VectorizationProgressEventData['inputMeta'] {
    return this.buildInputMeta(input, this.detectModalityFromInput(input));
  }

  /**
   * Build snapshot for a specific stage without emitting events
   */
  getStageEvent(
    jobId: string,
    stageName: VectorizationStage,
    overrideStageProgress?: number
  ): VectorizationProgressEventData {
    const job = this.getJob(jobId);
    const stage = this.ensureStage(job, stageName);
    return this.buildStageEvent(job, stage, undefined, overrideStageProgress);
  }

  /**
   * Helpers
   */
  private getJob(jobId: string): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`ProgressTracker job ${jobId} not found`);
    }
    return job;
  }

  private ensureStage(job: JobRecord, stageName: string): StageState {
    let stage = job.stages.find(s => s.name === stageName);
    if (!stage) {
      stage = {
        name: stageName,
        weight: 1,
        progress: 0,
        status: 'pending',
      };
      job.stages.push(stage);
      job.stageOrder.push(stageName);
    }
    return stage;
  }

  private getCurrentStage(job: JobRecord): StageState | undefined {
    if (job.stageIndex >= 0 && job.stageIndex < job.stageOrder.length) {
      const stageName = job.stageOrder[job.stageIndex];
      return this.ensureStage(job, stageName);
    }
    return undefined;
  }

  private buildStageEvent(
    job: JobRecord,
    stage: StageState,
    metadata?: StageProgressMetadata,
    overrideStageProgress?: number
  ): VectorizationProgressEventData {
    const stageProgress =
      overrideStageProgress !== undefined
        ? this.clampProgress(overrideStageProgress)
        : stage.progress;
    const stageIndex = job.stageOrder.indexOf(stage.name);
    const totalStages = job.stageOrder.length || 1;
    const progress = this.calculateJobProgress(job);

    const event: VectorizationProgressEventData = {
      jobId: job.id,
      inputMeta: job.inputMeta,
      stage: stage.name as VectorizationStage,
      stageIndex: stageIndex === -1 ? 0 : stageIndex,
      totalStages,
      stageProgress,
      progress,
      itemsProcessed: stage.metadata?.itemsProcessed,
      bytesProcessed: stage.metadata?.bytesProcessed,
      chunksTotal: stage.metadata?.chunksTotal,
      message: stage.metadata?.message || metadata?.message,
      partialResult: metadata?.partialResult || stage.metadata?.partialResult,
      warnings: metadata?.warnings || stage.metadata?.warnings,
    };

    if (metadata?.itemsProcessed !== undefined) {
      event.itemsProcessed = metadata.itemsProcessed;
    }
    if (metadata?.bytesProcessed !== undefined) {
      event.bytesProcessed = metadata.bytesProcessed;
    }
    if (metadata?.chunksTotal !== undefined) {
      event.chunksTotal = metadata.chunksTotal;
    }
    if (metadata?.message) {
      event.message = metadata.message;
    }
    if (metadata?.partialResult) {
      event.partialResult = metadata.partialResult;
    }
    if (metadata?.warnings) {
      event.warnings = metadata.warnings;
    }

    if (job.error) {
      event.error = {
        stage: job.error.stage as VectorizationStage,
        message: job.error.message,
      };
    }

    return event;
  }

  private calculateJobProgress(job: JobRecord): number {
    const totalWeight =
      job.stages.reduce((sum, stage) => sum + stage.weight, 0) || 1;
    const weighted =
      job.stages.reduce(
        (sum, stage) => sum + stage.progress * stage.weight,
        0
      ) / totalWeight;
    job.progress = this.clampProgress(weighted);
    return job.progress;
  }

  private generateJobId(): string {
    return `job_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  private detectModalityFromInput(input: unknown): VectorModality {
    if (typeof File !== 'undefined' && input instanceof File) {
      if (input.type.startsWith('audio/')) return 'audio';
      if (input.type.startsWith('image/')) return 'image';
      if (input.type.startsWith('video/')) return 'video';
      return 'text';
    }

    if (typeof input === 'string') {
      return 'text';
    }

    return 'text';
  }

  private buildInputMeta(
    input: unknown,
    modality: VectorModality
  ): VectorizationProgressEventData['inputMeta'] {
    if (typeof File !== 'undefined' && input instanceof File) {
      return {
        modality: modality,
        mime: input.type || this.mimeFromModality(modality),
        sizeBytes: input.size,
      };
    }

    if (typeof Blob !== 'undefined' && input instanceof Blob) {
      return {
        modality: modality,
        mime: (input as Blob).type || this.mimeFromModality(modality),
        sizeBytes: input.size,
      };
    }

    if (typeof input === 'string') {
      return {
        modality: 'text',
        mime: input.startsWith('http') ? 'text/html' : 'text/plain',
        sizeBytes: input.length,
        url: input.startsWith('http') ? input : undefined,
      };
    }

    if (input instanceof ArrayBuffer) {
      return {
        modality,
        mime: 'application/octet-stream',
        sizeBytes: input.byteLength,
      };
    }

    return {
      modality,
      mime: this.mimeFromModality(modality),
      sizeBytes: 0,
    };
  }

  private mimeFromModality(modality: VectorModality): string {
    switch (modality) {
      case 'audio':
        return 'audio/wav';
      case 'image':
        return 'image/png';
      case 'video':
        return 'video/mp4';
      default:
        return 'text/plain';
    }
  }

  private clampProgress(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }
}
