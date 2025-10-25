/**
 * AutoScaler - automatic scaling of AI model configurations
 *
 * Selects optimal device, dtype and maxTokens settings based on
 * system capabilities and performance mode.
 */

import type {
  Modality,
  ModelConfig,
  LLMConfig,
  TTSConfig,
  STTConfig,
  EmbeddingConfig,
  Device,
  DType,
} from '../../core/types';
import { BackendSelector } from '../backend/BackendSelector';

export class AutoScaler {
  private backendSelector: BackendSelector;

  constructor(backendSelector?: BackendSelector) {
    this.backendSelector = backendSelector || new BackendSelector();
  }

  /**
   * Main model configuration scaling method
   */
  autoScale(modality: Modality, config: ModelConfig): ModelConfig {
    const cfg = config as Partial<
      LLMConfig & TTSConfig & STTConfig & EmbeddingConfig
    > & {
      performanceMode?: 'auto' | 'fast' | 'quality';
    };

    // If performanceMode is not 'auto', don't scale
    if (!this.shouldAutoScale(cfg)) {
      return config;
    }

    // Create new configuration with default values
    const scaledConfig: Partial<
      LLMConfig & TTSConfig & STTConfig & EmbeddingConfig
    > = {
      ...cfg,
    };

    // Select device if not provided
    if (!scaledConfig.device) {
      scaledConfig.device = this.selectDevice();
    }

    // Select dtype if not provided
    if (!scaledConfig.dtype) {
      scaledConfig.dtype = this.selectDType();
    }

    // Select maxTokens for LLM if not provided
    if (modality === 'llm') {
      const llmConfig = scaledConfig as LLMConfig;
      if (llmConfig.maxTokens == null) {
        llmConfig.maxTokens = this.selectMaxTokens(modality);
      }
    }

    return scaledConfig as ModelConfig;
  }

  /**
   * Checks if configuration should be automatically scaled
   */
  private shouldAutoScale(
    config: Partial<LLMConfig & TTSConfig & STTConfig & EmbeddingConfig>
  ): boolean {
    // TTS doesn't have performanceMode, so don't scale automatically
    if ('speaker' in config || 'sampleRate' in config) {
      return false;
    }
    return config.performanceMode === 'auto';
  }

  /**
   * Selects optimal device based on environment
   */
  private selectDevice(): Device {
    const env = this.backendSelector.detectEnvironment();

    if (env.isBrowser) {
      return env.hasWebGPU ? 'webgpu' : 'cpu';
    } else {
      return 'cpu';
    }
  }

  /**
   * Selects optimal data type
   */
  private selectDType(): DType {
    return 'q4';
  }

  /**
   * Selects maximum number of tokens for LLM
   */
  private selectMaxTokens(modality: Modality): number | undefined {
    if (modality === 'llm') {
      return 20;
    }
    return undefined;
  }

  /**
   * Sets new BackendSelector (mainly for tests)
   */
  setBackendSelector(backendSelector: BackendSelector): void {
    this.backendSelector = backendSelector;
  }
}
