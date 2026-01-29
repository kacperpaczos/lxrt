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
  private worker: unknown = null;

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
      this.logger.debug('[OCRModel] load(): early-return, already loaded');
      return;
    }

    if (this.loadingPromise) {
      this.logger.debug('[OCRModel] load(): waiting for concurrent load');
      return this.loadingPromise;
    }

    this.loading = true;

    this.loadingPromise = (async () => {
      try {
        // Try to use Transformers.js OCR pipeline instead of Tesseract.js
        // This provides better Node.js compatibility

        // Use centralized GPU detector
        const { gpuDetector } = await import('../core/gpu');
        const gpuCaps = await gpuDetector.detect();
        const webgpuAdapterAvailable = gpuCaps.webgpuAvailable;

        // Get transformers pipeline factory
        const { pipeline } = await getTransformers();

        // Determine best device
        // TODO: Integrate BackendSelector if needed (currently not injected in OCRModel)
        const desiredDevice = this.config.device;
        let device = desiredDevice || 'cpu';

        if (device === 'webgpu' && !webgpuAdapterAvailable) {
          this.logger.warn(
            '[OCRModel] WebGPU requested but not available, falling back to wasm/cpu'
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          device = 'wasm' as any;
        }

        this.pipeline = await pipeline('image-to-text', this.config.model, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          device: device as any,
          dtype: this.config.dtype || 'fp32',
        });

        this.logger.debug(
          '[OCRModel] load(): Transformers.js OCR pipeline loaded'
        );

        this.loaded = true;
        this.loading = false;

        this.logger.debug('[OCRModel] load(): completed');
      } catch (error) {
        this.loading = false;
        const modelError = new ModelLoadError(
          `Failed to load OCR model: ${error instanceof Error ? error.message : String(error)}`,
          this.config.model || 'tesseract',
          'ocr'
        );
        this.logger.error('[OCRModel] load(): error', {
          error: modelError.message,
        });
        throw modelError;
      } finally {
        this.loading = false;
        this.loadingPromise = null;
        this.logger.debug('[OCRModel] load(): finished');
      }
    })();
    return this.loadingPromise;
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
        input: unknown,
        opts?: unknown
      ) => Promise<{ generated_text: string }>;

      const result = await pipeline(image, options);

      // Extract text from Transformers.js result
      const rawText = result?.generated_text ?? '';
      const text =
        typeof rawText === 'string' && rawText.trim().length > 0
          ? rawText
          : 'N/A';

      // For simplicity, provide basic metadata
      // In a full implementation, you'd extract more detailed info from the pipeline result
      return {
        text,
        confidence: 0.8, // Placeholder confidence
        words: [],
        lines: [],
        usedLanguage: Array.isArray(options.language)
          ? options.language[0]
          : options.language ||
            (Array.isArray(this.config.language)
              ? this.config.language[0]
              : this.config.language) ||
            'eng',
        // Pola zgodne z oczekiwaniami testów
        language: Array.isArray(options.language)
          ? options.language[0]
          : options.language ||
            (Array.isArray(this.config.language)
              ? this.config.language[0]
              : this.config.language) ||
            'eng',
        regions: [],
        detectedLanguages: [],
      };
    } catch (error) {
      const inferenceError = new InferenceError(
        `OCR recognition failed: ${error instanceof Error ? error.message : String(error)}`,
        'ocr'
      );
      this.logger.error('[OCRModel] recognize(): error', {
        error: inferenceError.message,
      });
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
  protected getPipeline(): unknown {
    if (!this.pipeline) {
      throw new InferenceError('OCR pipeline not loaded', 'ocr');
    }
    return this.pipeline;
  }
}
