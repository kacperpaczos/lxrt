/**
 * Text Embedding Adapter using EmbeddingModel
 */

import type { EmbeddingAdapter, EmbeddingResult } from './EmbeddingAdapter';
import type { VectorModality } from '../../../core/types';
import type { EmbeddingModel } from '../../../models/EmbeddingModel';

export class TextEmbeddingAdapter implements EmbeddingAdapter {
  constructor(private embeddingModel: EmbeddingModel) {}

  getSupportedModalities(): VectorModality[] {
    return ['text'];
  }

  canHandle(file: File): boolean {
    return (
      file.type.startsWith('text/') ||
      file.type === 'application/json' ||
      file.type === 'application/pdf'
    ); // PDF support depends on extraction
  }

  async initialize(): Promise<void> {
    // EmbeddingModel is managed by ModelManager, so we expect it to be initialized
    // or lazy-loaded when called. We can trigger load here just in case.
    await this.embeddingModel.load();
  }

  async process(file: File): Promise<EmbeddingResult> {
    const startTime = performance.now();

    // Note: For full file processing, we should ideally extract text first.
    // This adapter receives the raw file. VectorizationService mostly handles extraction,
    // but if we are here, we might need to handle it or assume VectorizationService
    // calls processText for text content.

    // However, the interface defines process(file).
    // We'll read the file as text for now (simple text files).
    const text = await file.text();

    const vector = await this.processText(text);

    return {
      vector,
      metadata: {
        modality: 'text',
        originalSize: file.size,
        processingTimeMs: performance.now() - startTime,
      },
    };
  }

  async processText(text: string): Promise<Float32Array> {
    const embeddings = await this.embeddingModel.embed(text, {
      pooling: 'mean',
      normalize: true,
    });

    return new Float32Array(embeddings[0]);
  }

  async dispose(): Promise<void> {
    // We don't dispose the model here as it's shared/managed by ModelManager
  }
}
