/**
 * Vectorization Service - main facade for multimedia embeddings
 */

import type {
  VectorModality,
  VectorizationServiceConfig,
  VectorDocMeta,
  QueryOptions,
  ResourceUsageSnapshot,
  VectorizeOptions,
  QueryVectorizeOptions,
  VectorizationProgressEventData,
  VectorizationStage,
  ChunkingOptions,
} from '../../core/types';
import { LocalVectorStoreIndexedDB } from '../../infra/vectorstore/LocalVectorStoreIndexedDB';
import { LocalResourceUsageEstimator } from '../../infra/resource/LocalResourceUsageEstimator';
import { AudioEmbeddingAdapter } from './adapters/AudioEmbeddingAdapter';
import { ImageEmbeddingAdapter } from './adapters/ImageEmbeddingAdapter';
import { VideoAsAudioAdapter } from './adapters/VideoAsAudioAdapter';
import { TextEmbeddingAdapter } from './adapters/TextEmbeddingAdapter';
import { ExternalEmbeddingBackendMock } from '../backend/external/ExternalEmbeddingBackendMock';
import type { VectorStore } from '../../infra/vectorstore/VectorStore';
import type { ResourceUsageEstimator } from '../../infra/resource/ResourceUsageEstimator';
import type { EmbeddingAdapter } from './adapters/EmbeddingAdapter';
import { ProgressTracker } from '../../utils/ProgressTracker';
import { EmbeddingModel } from '../../models/EmbeddingModel';

import { Readability } from '@mozilla/readability';

export interface VectorizationResult {
  indexed: string[];
  failed: string[];
}

export interface QueryResult {
  ids: string[];
  scores: number[];
  metadata?: VectorDocMeta[];
}

/**
 * VectorizationService - Main facade for multimodal embeddings.
 *
 * Provides a unified interface for vectorizing text, audio, images, and video
 * content. Supports chunking, progress tracking, and vector storage.
 *
 * @example
 * ```typescript
 * const service = new VectorizationService(config, embeddingModel);
 * await service.initialize();
 *
 * for await (const progress of service.vectorizeWithProgress(file)) {
 *   console.log(`Stage: ${progress.stage}, Progress: ${progress.progress}`);
 * }
 * ```
 */
export class VectorizationService {
  private config: VectorizationServiceConfig;
  private initialized = false;
  private vectorStore: VectorStore;
  private resourceEstimator: ResourceUsageEstimator;
  private adapters: Map<VectorModality, EmbeddingAdapter> = new Map();
  private externalMock?: ExternalEmbeddingBackendMock;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private progressTracker: ProgressTracker;
  private embeddingModel?: EmbeddingModel;

  /**
   * Creates a new VectorizationService instance.
   *
   * @param config - Service configuration including storage type and thresholds
   * @param embeddingModel - Optional pre-configured EmbeddingModel instance
   */
  constructor(
    config: VectorizationServiceConfig,
    embeddingModel?: EmbeddingModel
  ) {
    this.config = config;
    this.embeddingModel = embeddingModel;
    this.vectorStore = new LocalVectorStoreIndexedDB();
    this.resourceEstimator = new LocalResourceUsageEstimator(
      config.quotaThresholds || { warn: 0.7, high: 0.85, critical: 0.95 }
    );
    this.progressTracker = new ProgressTracker();

    // Setup external mock if enabled
    if (config.externalMock?.enabled) {
      this.externalMock = new ExternalEmbeddingBackendMock(config.externalMock);
    }
  }

  /**
   * Initialize the service and all dependencies.
   *
   * Must be called before using any vectorization methods.
   * Initializes vector store, resource estimator, and modality adapters.
   *
   * @throws Error if initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize vector store
      await this.vectorStore.initialize();

      // Initialize resource estimator
      await this.resourceEstimator.initialize();

      // Initialize adapters
      await this.initializeAdapters();

      // Setup event forwarding
      this.setupEventForwarding();

      this.initialized = true;
    } catch (error) {
      this.resourceEstimator.emit('vector:error', {
        stage: 'preprocess',
        error: `Initialization failed: ${error}`,
      });
      throw error;
    }
  }

  /**
   * Vectorize input with detailed progress tracking.
   *
   * Processes input through extraction, sanitization, chunking, embedding,
   * and storage stages. Yields progress events at each stage.
   *
   * @param input - File, URL string, or ArrayBuffer to vectorize
   * @param options - Vectorization options including modality and chunking settings
   * @yields Progress events with stage information and completion percentage
   * @returns Final result with indexed and failed document IDs
   *
   * @example
   * ```typescript
   * for await (const progress of service.vectorizeWithProgress(file, { modality: 'text' })) {
   *   updateProgressBar(progress.progress);
   * }
   * ```
   */
  async *vectorizeWithProgress(
    input: File | string | ArrayBuffer,
    options: VectorizeOptions = {}
  ): AsyncGenerator<VectorizationProgressEventData, VectorizationResult> {
    await this.ensureInitialized();

    const modality = options.modality || this.detectModalityFromInput(input);
    const stageWeights = this.progressTracker.getStageWeights(modality);
    const jobId = this.progressTracker.createJob(input, options, stageWeights);

    // Setup progress forwarding
    const unsubscribe = this.progressTracker.subscribe(
      'stage:progress',
      event => {
        this.emit('vectorization:progress', event);
      }
    );

    try {
      // Check signal for cancellation
      if (options.signal?.aborted) {
        this.progressTracker.cancelJob(jobId);
        throw new Error('Operation cancelled');
      }

      // Stage 1: Initializing
      this.progressTracker.startStage(jobId, 'initializing');
      yield this.getProgressEvent(jobId, 'initializing', 0.1);

      // Initialize adapter if needed
      const adapter = this.getAdapter(modality);
      if (adapter) {
        await adapter.initialize();
      }

      this.progressTracker.completeStage(jobId);
      yield this.getProgressEvent(jobId, 'initializing', 1);

      // Stage 2: Extracting
      this.progressTracker.startStage(jobId, 'extracting');
      yield this.getProgressEvent(jobId, 'extracting', 0.1);

      let extractedContent: string | ArrayBuffer;
      let extractedMetadata: Record<string, unknown> = {};

      if (typeof input === 'string' && input.startsWith('http')) {
        extractedContent = await this.extractFromUrl(input);
        extractedMetadata = { url: input };
      } else if (input instanceof File) {
        extractedContent = await this.extractFromFile(input, modality);
        extractedMetadata = { fileName: input.name, sizeBytes: input.size };
      } else {
        extractedContent = input;
      }

      this.progressTracker.completeStage(jobId);
      yield this.getProgressEvent(jobId, 'extracting', 1);

      // Stage 3: Sanitizing (for text content)
      if (typeof extractedContent === 'string') {
        this.progressTracker.startStage(jobId, 'sanitizing');
        yield this.getProgressEvent(jobId, 'sanitizing', 0.5);

        extractedContent = this.sanitizeText(extractedContent);

        this.progressTracker.completeStage(jobId);
        yield this.getProgressEvent(jobId, 'sanitizing', 1);
      }

      // Stage 4: Chunking
      this.progressTracker.startStage(jobId, 'chunking');
      yield this.getProgressEvent(jobId, 'chunking', 0.1);

      const chunks = await this.chunkContent(
        extractedContent,
        options.chunking,
        modality
      );
      this.progressTracker.updateProgress(jobId, 0.5, {
        chunksTotal: chunks.length,
      });

      this.progressTracker.completeStage(jobId);
      yield this.getProgressEvent(jobId, 'chunking', 1);

      // Stage 5: Embedding
      this.progressTracker.startStage(jobId, 'embedding');
      yield this.getProgressEvent(jobId, 'embedding', 0.1);

      const embeddings = await this.embedChunks(chunks, modality, jobId);
      this.progressTracker.updateProgress(jobId, 0.5, {
        itemsProcessed: embeddings.length,
      });

      this.progressTracker.completeStage(jobId);
      yield this.getProgressEvent(jobId, 'embedding', 1);

      // Stage 6: Upserting
      this.progressTracker.startStage(jobId, 'upserting');
      yield this.getProgressEvent(jobId, 'upserting', 0.1);

      const result = await this.upsertEmbeddings(
        embeddings,
        modality,
        input,
        extractedMetadata,
        jobId
      );
      this.progressTracker.updateProgress(jobId, 0.5, {
        itemsProcessed: result.indexed.length,
        partialResult: { indexedIds: result.indexed },
      });

      this.progressTracker.completeStage(jobId);
      yield this.getProgressEvent(jobId, 'upserting', 1);

      // Stage 7: Finalizing
      this.progressTracker.startStage(jobId, 'finalizing');
      yield this.getProgressEvent(jobId, 'finalizing', 0.5);

      this.progressTracker.completeJob(jobId, result);
      yield this.getProgressEvent(jobId, 'finalizing', 1);

      return result;
    } catch (error) {
      this.progressTracker.completeWithError(
        jobId,
        'embedding',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    } finally {
      unsubscribe();
    }
  }

  /**
   * Query with progress tracking
   */
  async *queryWithProgress(
    input: string | File | ArrayBuffer,
    options: QueryVectorizeOptions = {}
  ): AsyncGenerator<VectorizationProgressEventData, QueryResult> {
    await this.ensureInitialized();

    const modality = options.modality || this.detectModalityFromInput(input);
    const jobId = this.progressTracker.createJob(input, options, {
      queued: 0,
      initializing: 10,
      extracting: 20,
      embedding: 50,
      upserting: 18,
      finalizing: 2,
    });

    const unsubscribe = this.progressTracker.subscribe(
      'stage:progress',
      event => {
        this.emit('vectorization:progress', event);
      }
    );

    try {
      // Stage 1: Initializing
      this.progressTracker.startStage(jobId, 'initializing');
      yield this.getProgressEvent(jobId, 'initializing', 1);
      this.progressTracker.completeStage(jobId);

      // Stage 2: Extracting (if file input)
      if (input instanceof File || input instanceof ArrayBuffer) {
        this.progressTracker.startStage(jobId, 'extracting');
        yield this.getProgressEvent(jobId, 'extracting', 1);
        this.progressTracker.completeStage(jobId);
      }

      // Stage 3: Embedding query
      this.progressTracker.startStage(jobId, 'embedding');
      yield this.getProgressEvent(jobId, 'embedding', 0.5);

      let queryVector: Float32Array;
      if (typeof input === 'string') {
        queryVector = await this.embedText(input, modality);
      } else {
        queryVector = await this.embedFile(input, modality);
      }

      this.progressTracker.updateProgress(jobId, 1, { itemsProcessed: 1 });
      this.progressTracker.completeStage(jobId);
      yield this.getProgressEvent(jobId, 'embedding', 1);

      // Stage 4: Searching
      this.progressTracker.startStage(jobId, 'upserting'); // Using upserting as search stage
      yield this.getProgressEvent(jobId, 'upserting', 0.5);

      const results = await this.vectorStore.query(queryVector, options);

      this.progressTracker.updateProgress(jobId, 1, {
        itemsProcessed: results.length,
      });
      this.progressTracker.completeStage(jobId);
      yield this.getProgressEvent(jobId, 'upserting', 1);

      // Stage 5: Finalizing
      this.progressTracker.startStage(jobId, 'finalizing');
      yield this.getProgressEvent(jobId, 'finalizing', 1);

      const result: QueryResult = {
        ids: results.map(r => r.id),
        scores: results.map(r => r.score),
        metadata: results.map(r => r.metadata),
      };

      this.progressTracker.completeJob(jobId);
      yield this.getProgressEvent(jobId, 'finalizing', 1);

      return result;
    } catch (error) {
      this.progressTracker.completeWithError(
        jobId,
        'embedding',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    } finally {
      unsubscribe();
    }
  }

  /**
   * Index files and extract embeddings
   */
  async indexFiles(
    files: File[],
    meta?: Partial<VectorDocMeta>
  ): Promise<VectorizationResult> {
    await this.ensureInitialized();

    const result: VectorizationResult = {
      indexed: [],
      failed: [],
    };

    const endMeasurement = this.resourceEstimator.startMeasurement('indexing');

    try {
      for (const file of files) {
        try {
          const fileMeta: VectorDocMeta = {
            id: this.generateId(),
            modality: this.detectModality(file),
            mime: file.type,
            sizeBytes: file.size,
            createdAt: Date.now(),
            ...meta,
          };

          // Process file through appropriate adapter
          const adapter = this.getAdapter(fileMeta.modality);
          if (!adapter) {
            throw new Error(
              `No adapter available for modality: ${fileMeta.modality}`
            );
          }

          // Use external mock if enabled, otherwise local adapter
          let embeddingResult;
          if (this.externalMock) {
            const request = {
              id: fileMeta.id,
              data: file,
              modality: fileMeta.modality,
              metadata: fileMeta,
            };
            const response = await this.externalMock.processEmbedding(request);
            embeddingResult = {
              vector: new Float32Array(response.vector),
              metadata: {
                modality: response.modality,
                processingTimeMs: response.processingTimeMs,
              },
            };
          } else {
            embeddingResult = await adapter.process(file);
          }

          // Store in vector store
          await this.vectorStore.upsert([
            {
              id: fileMeta.id,
              vector: embeddingResult.vector,
              metadata: fileMeta,
            },
          ]);

          result.indexed.push(file.name);

          // Emit events
          this.emit('vector:indexed', {
            count: 1,
            modality: fileMeta.modality,
          });
        } catch (error) {
          result.failed.push(file.name);
          this.emit('vector:error', {
            stage: 'embed',
            error: `Failed to process ${file.name}: ${error}`,
            metadata: { fileName: file.name },
          });
        }
      }

      // Get usage snapshot and emit
      const usage = await this.resourceEstimator.getUsageSnapshot();
      this.resourceEstimator.emitResourceUsage(usage);
    } finally {
      endMeasurement();
    }

    return result;
  }

  /**
   * Query for similar vectors
   */
  async query(
    input: string | File,
    modality?: VectorModality,
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    await this.ensureInitialized();

    const endMeasurement = this.resourceEstimator.startMeasurement('querying');

    try {
      let queryVector: Float32Array;
      let queryModality = modality;

      if (typeof input === 'string') {
        // Text query - use appropriate adapter
        if (!queryModality) {
          throw new Error('Modality must be specified for text queries');
        }

        const adapter = this.getAdapter(queryModality);
        if (!adapter) {
          throw new Error(
            `No adapter available for modality: ${queryModality}`
          );
        }

        if (adapter.processText) {
          queryVector = await adapter.processText(input);
        } else {
          throw new Error(
            `Text processing not supported for modality: ${queryModality}`
          );
        }
      } else {
        // File query
        const fileModality = this.detectModality(input);
        queryModality = queryModality || fileModality;

        const adapter = this.getAdapter(queryModality);
        if (!adapter) {
          throw new Error(
            `No adapter available for modality: ${queryModality}`
          );
        }

        const embeddingResult = await adapter.process(input);
        queryVector = embeddingResult.vector;
      }

      // Query vector store
      const results = await this.vectorStore.query(queryVector, options);

      // Emit events
      this.emit('vector:queried', {
        k: options.k || 10,
        modality: queryModality,
      });

      // Get usage snapshot
      const usage = await this.resourceEstimator.getUsageSnapshot();
      this.resourceEstimator.emitResourceUsage(usage);

      return {
        ids: results.map(r => r.id),
        scores: results.map(r => r.score),
        metadata: results.map(r => r.metadata),
      };
    } catch (error) {
      this.emit('vector:error', {
        stage: 'query',
        error: `Query failed: ${error}`,
      });
      throw error;
    } finally {
      endMeasurement();
    }
  }

  /**
   * Delete vectors by IDs
   */
  async delete(ids: string[]): Promise<void> {
    await this.ensureInitialized();

    const endMeasurement = this.resourceEstimator.startMeasurement('deletion');

    try {
      await this.vectorStore.delete(ids);
      this.emit('vector:deleted', { count: ids.length });

      // Get usage snapshot
      const usage = await this.resourceEstimator.getUsageSnapshot();
      this.resourceEstimator.emitResourceUsage(usage);
    } catch (error) {
      this.emit('vector:error', {
        stage: 'store',
        error: `Delete failed: ${error}`,
      });
      throw error;
    } finally {
      endMeasurement();
    }
  }

  /**
   * Get current resource usage snapshot
   */
  async getUsageSnapshot(): Promise<ResourceUsageSnapshot> {
    return await this.resourceEstimator.getUsageSnapshot();
  }

  /**
   * Register event listener
   */
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners
      .get(event)!
      .add(handler as unknown as (data: unknown) => void);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(handler as unknown as (data: unknown) => void);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  /**
   * Close and cleanup resources
   */
  async close(): Promise<void> {
    // Close vector store
    await this.vectorStore.close();

    // Close resource estimator
    await this.resourceEstimator.close();

    // Dispose adapters
    for (const adapter of this.adapters.values()) {
      await adapter.dispose();
    }
    this.adapters.clear();

    // Clear event listeners
    this.eventListeners.clear();

    this.initialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async initializeAdapters(): Promise<void> {
    // Initialize all adapters
    const adapters: EmbeddingAdapter[] = [
      new AudioEmbeddingAdapter(),
      new ImageEmbeddingAdapter(),
      new VideoAsAudioAdapter(),
    ];

    if (this.embeddingModel) {
      adapters.push(new TextEmbeddingAdapter(this.embeddingModel));
    }

    for (const adapter of adapters) {
      await adapter.initialize();
      // Map first supported modality to adapter
      const modalities = adapter.getSupportedModalities();
      for (const modality of modalities) {
        this.adapters.set(modality, adapter);
      }
    }
  }

  private getAdapter(modality: VectorModality): EmbeddingAdapter | undefined {
    return this.adapters.get(modality);
  }

  private detectModality(file: File): VectorModality {
    if (file.type.startsWith('audio/')) {
      return 'audio';
    } else if (file.type.startsWith('image/')) {
      return 'image';
    } else if (file.type.startsWith('video/')) {
      return 'video';
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  }

  private generateId(): string {
    return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper methods for progress tracking
  private getProgressEvent(
    jobId: string,
    stage: VectorizationStage,
    stageProgress: number
  ): VectorizationProgressEventData {
    return this.progressTracker.getStageEvent(jobId, stage, stageProgress);
  }

  private detectModalityFromInput(
    input: File | string | ArrayBuffer
  ): VectorModality {
    if (input instanceof File) {
      return this.detectModality(input);
    } else if (typeof input === 'string') {
      if (input.startsWith('http')) {
        return 'text'; // Assume HTML
      } else {
        return 'text';
      }
    } else {
      return 'text';
    }
  }

  private async extractFromUrl(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`
        );
      }
      const html = await response.text();
      const { JSDOM } = await import('jsdom');
      const dom = new JSDOM(html, { url });
      const reader = new Readability(
        dom.window.document as unknown as Document
      );
      const article = reader.parse();
      return article?.textContent || '';
    } catch (error) {
      throw new Error(`Failed to extract content from URL ${url}: ${error}`);
    }
  }

  private async extractFromFile(
    file: File,
    modality: VectorModality
  ): Promise<string | ArrayBuffer> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    // PDF extraction
    if (ext === 'pdf') {
      try {
        // Dynamic import with type assertion for compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParseModule = (await import('pdf-parse')) as any;
        const pdfParse =
          typeof pdfParseModule === 'function'
            ? pdfParseModule
            : pdfParseModule.default || pdfParseModule;
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdfParse(buffer);
        return data.text as string;
      } catch (error) {
        throw new Error(`Failed to extract PDF content: ${error}`);
      }
    }

    // DOCX extraction
    if (ext === 'docx') {
      try {
        const mammoth = await import('mammoth');
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value;
      } catch (error) {
        throw new Error(`Failed to extract DOCX content: ${error}`);
      }
    }

    // Plain text files
    if (
      ext === 'txt' ||
      ext === 'md' ||
      ext === 'json' ||
      ext === 'csv' ||
      modality === 'text'
    ) {
      return await file.text();
    }

    // Binary files (images, audio, video) - return as ArrayBuffer
    return await file.arrayBuffer();
  }

  private sanitizeText(text: string): string {
    // Basic text sanitization - remove extra whitespace, normalize
    return text.replace(/\s+/g, ' ').trim();
  }

  private async chunkContent(
    content: string | ArrayBuffer,
    chunkingOptions?: ChunkingOptions,
    _modality?: VectorModality
  ): Promise<string[]> {
    if (typeof content !== 'string') {
      // For binary content, return as single chunk
      return ['binary_data'];
    }

    const chunkSize = chunkingOptions?.chunkSize || 1000;
    const overlap = chunkingOptions?.chunkOverlap || 200;
    const chunks: string[] = [];

    // Split by paragraphs first, then by sentences if needed
    const separators = ['\n\n', '\n', '. ', ', ', ' '];

    let text = content;
    let currentChunk = '';

    const splitText = (
      txt: string,
      sepIndex: number = 0
    ): string[] => {
      if (sepIndex >= separators.length) {
        // No more separators, split by character
        const result: string[] = [];
        for (let i = 0; i < txt.length; i += chunkSize - overlap) {
          result.push(txt.slice(i, i + chunkSize));
        }
        return result;
      }

      const sep = separators[sepIndex];
      const parts = txt.split(sep);

      if (parts.length === 1) {
        // Separator not found, try next
        return splitText(txt, sepIndex + 1);
      }

      return parts.flatMap((part, i) =>
        i < parts.length - 1 ? [part + sep] : [part]
      );
    };

    const textParts = splitText(text);

    for (const part of textParts) {
      if (currentChunk.length + part.length <= chunkSize) {
        currentChunk += part;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }

        // If part is larger than chunkSize, split it further
        if (part.length > chunkSize) {
          const subChunks = splitText(part, 1);
          for (const subChunk of subChunks) {
            if (subChunk.length <= chunkSize) {
              chunks.push(subChunk.trim());
            } else {
              // Final fallback: hard split
              for (let i = 0; i < subChunk.length; i += chunkSize - overlap) {
                chunks.push(subChunk.slice(i, i + chunkSize).trim());
              }
            }
          }
          currentChunk = '';
        } else {
          // Add overlap from previous chunk
          const overlapStart = Math.max(0, currentChunk.length - overlap);
          currentChunk = currentChunk.slice(overlapStart) + part;
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  private async embedChunks(
    chunks: string[],
    _modality: VectorModality,
    jobId: string
  ): Promise<Float32Array[]> {
    const embeddings: Float32Array[] = [];

    // Use EmbeddingModel if available
    if (this.embeddingModel) {
      // Ensure model is loaded (load() handles check internally)
      await this.embeddingModel.load((progress: { progress?: number }) => {
        this.progressTracker.updateProgress(jobId, -1, {
          message: `Loading model: ${progress.progress}%`,
        });
      });

      // Process in batches to update progress
      const batchSize = 4;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        // Update progress
        this.progressTracker.updateProgress(jobId, (i + 1) / chunks.length, {
          itemsProcessed: i + 1,
          message: `Embedding chunk ${i + 1}/${chunks.length}`,
        });

        try {
          const batchEmbeddings = await this.embeddingModel.embed(batch, {
            pooling: 'mean',
            normalize: true,
          });

          batchEmbeddings.forEach((emb: number[]) =>
            embeddings.push(new Float32Array(emb))
          );
        } catch (error) {
          throw new Error(`Failed to embed batch: ${error}`);
        }
      }
    } else {
      // Fallback to dummy embeddings if model is missing (for tests or mocked env)
      for (let i = 0; i < chunks.length; i++) {
        this.progressTracker.updateProgress(jobId, (i + 1) / chunks.length, {
          itemsProcessed: i + 1,
          message: `Embedding chunk ${i + 1}/${chunks.length} (Mock)`,
        });

        const dummyEmbedding = new Float32Array(384);
        dummyEmbedding.fill((0.1 * (i + 1)) / chunks.length);
        embeddings.push(dummyEmbedding);
      }
    }

    return embeddings;
  }

  private async embedText(
    text: string,
    _modality: VectorModality
  ): Promise<Float32Array> {
    if (this.embeddingModel) {
      await this.embeddingModel.load();
      const result = await this.embeddingModel.embed(text);
      return new Float32Array(result[0]);
    }

    // Fallback
    const embedding = new Float32Array(384);
    embedding.fill(0.5);
    return embedding;
  }

  private async embedFile(
    file: File | ArrayBuffer,
    modality: VectorModality
  ): Promise<Float32Array> {
    // For file embedding, use the appropriate adapter
    const adapter = this.getAdapter(modality);
    if (!adapter) {
      // Fallback or error
      if (this.embeddingModel && modality === 'text' && file instanceof File) {
        const text = await file.text();
        const result = await this.embeddingModel.embed(text);
        return new Float32Array(result[0]);
      }

      const embedding = new Float32Array(384);
      embedding.fill(0.7);
      return embedding;
    }

    if (file instanceof File) {
      const result = await adapter.process(file);
      return result.vector;
    } else {
      throw new Error(
        'ArrayBuffer embedding not fully supported without file context'
      );
    }
  }

  private async upsertEmbeddings(
    embeddings: Float32Array[],
    _modality: VectorModality,
    input: File | string | ArrayBuffer,
    _metadata: Record<string, unknown>,
    jobId: string
  ): Promise<VectorizationResult> {
    const result: VectorizationResult = { indexed: [], failed: [] };

    for (let i = 0; i < embeddings.length; i++) {
      this.progressTracker.updateProgress(jobId, (i + 1) / embeddings.length, {
        itemsProcessed: i + 1,
        message: `Upserting chunk ${i + 1}/${embeddings.length}`,
      });

      const docId = this.generateId();
      const docMeta: VectorDocMeta = {
        id: docId,
        modality: _modality,
        mime: this.getMimeFromInput(input),
        sizeBytes: this.getSizeFromInput(input),
        createdAt: Date.now(),
        ..._metadata,
      };

      try {
        await this.vectorStore.upsert([
          {
            id: docId,
            vector: embeddings[i],
            metadata: docMeta,
          },
        ]);

        result.indexed.push(docId);
      } catch {
        result.failed.push(`chunk_${i}`);
      }
    }

    return result;
  }

  private getMimeFromInput(input: File | string | ArrayBuffer): string {
    if (input instanceof File) {
      return input.type;
    } else if (typeof input === 'string') {
      return input.startsWith('http') ? 'text/html' : 'text/plain';
    } else {
      return 'application/octet-stream';
    }
  }

  private getSizeFromInput(input: File | string | ArrayBuffer): number {
    if (input instanceof File) {
      return input.size;
    } else if (typeof input === 'string') {
      return input.length;
    } else {
      return input.byteLength;
    }
  }

  private setupEventForwarding(): void {
    // Forward resource estimator events
    this.resourceEstimator.on('resource:usage', data => {
      this.emit('resource:usage', data);
    });

    this.resourceEstimator.on('resource:quota-warning', data => {
      this.emit('resource:quota-warning', data);
    });

    this.resourceEstimator.on('vector:error', data => {
      this.emit('vector:error', data);
    });

    this.resourceEstimator.on('vector:indexed', data => {
      this.emit('vector:indexed', data);
    });

    this.resourceEstimator.on('vector:queried', data => {
      this.emit('vector:queried', data);
    });

    this.resourceEstimator.on('vector:deleted', data => {
      this.emit('vector:deleted', data);
    });

    // Forward progress tracker events
    this.progressTracker.on('stage:progress', data => {
      this.emit('vectorization:progress', data);
    });

    this.progressTracker.on('stage:start', data => {
      this.emit('vectorization:stage:start', data);
    });

    this.progressTracker.on('stage:end', data => {
      this.emit('vectorization:stage:end', data);
    });

    this.progressTracker.on('warning', data => {
      this.emit('vectorization:warning', data);
    });

    this.progressTracker.on('error', data => {
      this.emit('vectorization:error', data);
    });
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}
