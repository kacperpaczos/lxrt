/**
 * OCR Model for optical character recognition (Transformers.js)
 */

import type { OCRConfig, OCROptions, OCRResult } from '../core/types';
import { BaseModel } from './BaseModel';
import { ModelLoadError, InferenceError } from '@domain/errors';
import type { BackendSelector } from '../app/backend/BackendSelector';
// No longer needed - using Transformers.js pipeline instead

let transformersModule: typeof import('@huggingface/transformers') | null =
  null;

async function getTransformers() {
  if (!transformersModule) {
    transformersModule = await import('@huggingface/transformers');
  }
  return transformersModule;
}

export class OCRModel extends BaseModel<OCRConfig> {
  private backendSelector?: BackendSelector;
  private worker: any = null;

  constructor(config: OCRConfig, backendSelector?: BackendSelector) {
    super('ocr', config);
    this.backendSelector = backendSelector;
  }

  /**
   * Load the OCR model (initialize Tesseract worker)
   */
  async load(
    _progressCallback?: (progress: {
      status: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    }) => void
  ): Promise<void> {
    if (this.loaded) {
      if (typeof console !== 'undefined' && console.log) {
        console.log('[OCRModel] load(): early-return, already loaded');
      }
      return;
    }

    if (this.loading) {
      if (typeof console !== 'undefined' && console.log) {
        console.log('[OCRModel] load(): waiting for concurrent load');
      }
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (typeof console !== 'undefined' && console.log) {
        console.log('[OCRModel] load(): concurrent load finished');
      }
      return;
    }

    this.loading = true;

    try {
      // Try to use Transformers.js OCR pipeline instead of Tesseract.js
      // This provides better Node.js compatibility
      const { pipeline } = await getTransformers();

      this.pipeline = await pipeline('image-to-text', this.config.model, {
        device: this.config.device || 'cpu',
        dtype: this.config.dtype || 'fp32',
      });

      if (typeof console !== 'undefined' && console.log) {
        console.log('[OCRModel] load(): Transformers.js OCR pipeline loaded');
      }

      this.loaded = true;
      this.loading = false;

      if (typeof console !== 'undefined' && console.log) {
        console.log('[OCRModel] load(): completed');
      }
    } catch (error) {
      this.loading = false;
      const modelError = new ModelLoadError(
        `Failed to load OCR model: ${error instanceof Error ? error.message : String(error)}`,
        this.config.model || 'tesseract',
        'ocr'
      );
      if (typeof console !== 'undefined' && console.error) {
        console.error('[OCRModel] load(): error', modelError);
      }
      throw modelError;
    }
    return Promise.resolve();
  }

  /**
   * Recognize text from image
   */
  async recognize(
    image: string | Blob | File | Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    await this.ensureLoaded();

    try {
      // Use Transformers.js OCR pipeline instead of Tesseract
      const pipeline = this.getPipeline() as (
        input: any,
        opts?: any
      ) => Promise<{ generated_text: string }>;

      const result = await pipeline(image, options);

      // Extract text from Transformers.js result
      const text = result.generated_text || '';

      // For simplicity, provide basic metadata
      // In a full implementation, you'd extract more detailed info from the pipeline result
      return {
        text,
        confidence: 0.8, // Placeholder confidence
        words: [],
        lines: [],
        usedLanguage: options.language || this.config.language || 'eng',
        detectedLanguages: [],
      };
    } catch (error) {
      const inferenceError = new InferenceError(
        `OCR recognition failed: ${error instanceof Error ? error.message : String(error)}`,
        'ocr'
      );
      if (typeof console !== 'undefined' && console.error) {
        console.error('[OCRModel] recognize(): error', inferenceError);
      }
      throw inferenceError;
    }
  }

  /**
   * Unload the model and free resources
   */
  async unload(): Promise<void> {
    // Transformers.js pipeline doesn't need special cleanup
    await super.unload();
  }

  /**
   * Get the underlying pipeline
   */
  protected getPipeline(): any {
    if (!this.pipeline) {
      throw new InferenceError('OCR pipeline not loaded', 'ocr');
    }
    return this.pipeline;
  }
}
