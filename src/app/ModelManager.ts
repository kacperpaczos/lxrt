/**
 * Model Manager for managing all AI models
 */

import type {
  Modality,
  ModelConfig,
  LLMConfig,
  TTSConfig,
  STTConfig,
  EmbeddingConfig,
  OCRConfig,
  ModelStatus,
} from '../core/types';
import { ModelCache } from './cache/ModelCache';
import { BaseModel } from '../models/BaseModel';
import { LLMModel } from '../models/LLMModel';
import { TTSModel } from '../models/TTSModel';
import { STTModel } from '../models/STTModel';
import { EmbeddingModel } from '../models/EmbeddingModel';
import { OCRModel } from '../models/OCRModel';
import { EventEmitter } from '@infra/events/EventEmitter';
import { getConfig } from './state';
import { ModelUnavailableError } from '@domain/errors';
import { AutoScaler } from './autoscaler/AutoScaler';
import { BackendSelector } from './backend/BackendSelector';
import { resolveModelId } from '../core/ModelPresets';

export interface ModelManagerOptions {
  skipCache?: boolean;
}

export class ModelManager {
  private cache: ModelCache;
  private models: Map<Modality, BaseModel>;
  private configs: Map<Modality, ModelConfig>;
  private eventEmitter: EventEmitter;
  private autoScaler: AutoScaler;
  private backendSelector: BackendSelector;

  constructor(eventEmitter: EventEmitter, options?: ModelManagerOptions) {
    this.cache = new ModelCache({ skipCache: options?.skipCache });
    this.models = new Map();
    this.configs = new Map();
    this.eventEmitter = eventEmitter;
    this.backendSelector = new BackendSelector();
    this.autoScaler = new AutoScaler(this.backendSelector);
  }

  /**
   * Load a model for a specific modality
   */
  async loadModel(modality: Modality, config: ModelConfig): Promise<BaseModel> {
    // Check if model is already loaded with the same config
    const existingModel = this.models.get(modality);
    if (existingModel && this.isSameConfig(modality, config)) {
      // Ensure cache is populated even if model remained loaded while cache was cleared
      const cached = this.cache.get(modality, config);
      if (!cached) {
        const pipeline = existingModel.getRawPipeline();
        this.cache.set(modality, config, pipeline);
      }
      return existingModel;
    }

    // Sprawdź, czy TTS ma ustawioną flagę skip - zwróć dummy model
    if (modality === 'tts' && (config as TTSConfig).skip) {
      // Utwórz dummy model, który będzie ignorował wszystkie wywołania
      const dummyModel = new TTSModel(
        config as TTSConfig,
        this.backendSelector
      );
      this.models.set(modality, dummyModel);
      this.configs.set(modality, config);
      return dummyModel;
    }

    // Resolve preset to actual model ID
    const resolvedConfig = this.resolvePreset(modality, config);

    // Auto-scaler: optionally adjust config based on capabilities and performanceMode
    // Auto-scaler: optionally adjust config based on capabilities and performanceMode
    const scaledConfig = await this.autoScaler.autoScale(
      modality,
      resolvedConfig
    );

    // Check cache using scaled config (consistent with what we store)
    console.log(`[ModelManager] Checking cache for ${modality}:`, scaledConfig);
    const cached = this.cache.get(modality, scaledConfig);
    if (cached) {
      const model = this.createModelInstance(modality, scaledConfig);
      // Restore from cache - cache.get() returns pipeline directly, not {pipeline: ...}
      model.setPipeline(cached);
      this.models.set(modality, model);
      this.configs.set(modality, scaledConfig);
      return model;
    }
    if (scaledConfig !== config) {
      const logger = getConfig().logger;
      logger.debug('[lxrt] autoscale', {
        modality,
        from: config,
        to: scaledConfig,
      });
    }

    // Create and load new model
    const model = this.createModelInstance(modality, scaledConfig);

    // Create progress callback
    const progressCallback = (progress: {
      status: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    }) => {
      // Map status to expected enum values
      const mappedStatus = this.mapStatus(progress.status);
      this.eventEmitter.emit('progress', {
        modality,
        model: (scaledConfig as ModelConfig).model!,
        file: progress.file,
        progress: progress.progress,
        loaded: progress.loaded,
        total: progress.total,
        status: mappedStatus,
      });
    };

    try {
      await model.load(progressCallback);

      // Cache the model
      const pipeline = model.getRawPipeline();
      console.log(`[ModelManager] Caching model ${modality}:`, {
        modelName: (scaledConfig as ModelConfig).model,
        hasPipeline: !!pipeline,
        pipelineType: typeof pipeline,
      });
      this.cache.set(modality, scaledConfig, pipeline);

      // Store in active models
      this.models.set(modality, model);
      this.configs.set(modality, scaledConfig);

      // Emit ready event
      this.eventEmitter.emit('ready', {
        modality,
        model: (scaledConfig as ModelConfig).model!,
      });

      return model;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.eventEmitter.emit('error', {
        modality,
        error: err,
      });
      throw error;
    }
  }

  /**
   * Get a loaded model
   */
  getModel(modality: Modality): BaseModel | undefined {
    return this.models.get(modality);
  }

  /**
   * Get model or load it if not loaded
   */
  async getOrLoadModel(
    modality: Modality,
    config: ModelConfig
  ): Promise<BaseModel> {
    const existing = this.getModel(modality);
    if (existing && this.isSameConfig(modality, config)) {
      return existing;
    }
    return this.loadModel(modality, config);
  }

  /**
   * Unload a model
   */
  async unloadModel(modality: Modality): Promise<void> {
    const model = this.models.get(modality);
    if (model) {
      await model.unload();
      this.models.delete(modality);
      this.configs.delete(modality);

      this.eventEmitter.emit('unload', {
        modality,
      });
    }
  }

  /**
   * Check if a model is loaded
   */
  isLoaded(modality: Modality): boolean {
    const model = this.models.get(modality);
    return model?.isLoaded() ?? false;
  }

  /**
   * Get model status
   */
  getStatus(modality: Modality): ModelStatus {
    const model = this.models.get(modality);
    const config = this.configs.get(modality);

    if (!model) {
      return {
        modality,
        loaded: false,
        loading: false,
      };
    }

    return {
      modality,
      loaded: model.isLoaded(),
      loading: model.isLoading(),
      model: config?.model,
    };
  }

  /**
   * Get all model statuses
   */
  getAllStatuses(): ModelStatus[] {
    const modalities: Modality[] = ['llm', 'tts', 'stt', 'embedding'];
    return modalities.map(modality => this.getStatus(modality));
  }

  /**
   * Clear all models and cache
   */
  async clearAll(): Promise<void> {
    const modalities = Array.from(this.models.keys());
    await Promise.all(modalities.map(modality => this.unloadModel(modality)));
    this.cache.clear();
  }

  /**
   * Dispose and release all resources (for tests and shutdown)
   */
  async dispose(): Promise<void> {
    try {
      await this.clearAll();
    } finally {
      this.cache.dispose();
    }
  }

  /**
   * Clear cache only (keep loaded models)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Create model instance based on modality
   */
  private createModelInstance(
    modality: Modality,
    config: ModelConfig
  ): BaseModel {
    switch (modality) {
      case 'llm':
        return new LLMModel(config as LLMConfig, this.backendSelector);
      case 'tts':
        return new TTSModel(config as TTSConfig, this.backendSelector);
      case 'stt':
        return new STTModel(config as STTConfig, this.backendSelector);
      case 'embedding':
        return new EmbeddingModel(
          config as EmbeddingConfig,
          this.backendSelector
        );
      case 'ocr':
        return new OCRModel(config as OCRConfig, this.backendSelector);
      default:
        throw new ModelUnavailableError(
          `Unknown modality: ${modality}`,
          modality,
          modality
        );
    }
  }

  /**
   * Check if config is the same as currently loaded
   */
  private isSameConfig(modality: Modality, config: ModelConfig): boolean {
    const currentConfig = this.configs.get(modality);
    if (!currentConfig) {
      return false;
    }
    return currentConfig.model === config.model;
  }

  /**
   * Get BackendSelector instance for use by models
   */
  getBackendSelector(): BackendSelector {
    return this.backendSelector;
  }

  /**
   * Get ModelCache instance (for testing)
   */
  getCache(): ModelCache {
    return this.cache;
  }

  /**
   * Resolve preset name to actual model ID
   */
  private resolvePreset(modality: Modality, config: ModelConfig): ModelConfig {
    if (!config.model) {
      return config;
    }

    const resolvedModelId = resolveModelId(modality, config.model);

    // If model ID changed (was a preset), create new config with resolved ID
    if (resolvedModelId !== config.model) {
      const logger = getConfig().logger;
      logger.debug('[lxrt] preset resolved', {
        modality,
        preset: config.model,
        modelId: resolvedModelId,
      });

      return {
        ...config,
        model: resolvedModelId,
      };
    }

    return config;
  }

  /**
   * Map status string to expected enum values
   */
  private mapStatus(
    status: string
  ): 'downloading' | 'loading' | 'ready' | 'error' {
    switch (status.toLowerCase()) {
      case 'downloading':
      case 'download':
        return 'downloading';
      case 'loading':
      case 'load':
      case 'initializing':
        return 'loading';
      case 'ready':
      case 'complete':
      case 'success':
        return 'ready';
      case 'error':
      case 'failed':
      case 'fail':
        return 'error';
      default:
        return 'loading'; // fallback
    }
  }
}
