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
import {
  SystemCapabilitiesDetector,
  SystemCapabilities,
} from './SystemCapabilities';
import { ModelSelector } from './ModelSelector';
import { getConfig } from '../state';

export class AutoScaler {
  private backendSelector: BackendSelector;
  private capabilitiesDetector: SystemCapabilitiesDetector;
  private modelSelector: ModelSelector;

  constructor(backendSelector?: BackendSelector) {
    this.backendSelector = backendSelector || new BackendSelector();
    this.capabilitiesDetector = new SystemCapabilitiesDetector(
      this.backendSelector
    );
    this.modelSelector = new ModelSelector();
  }

  /**
   * Main model configuration scaling method
   */
  async autoScale(
    modality: Modality,
    config: ModelConfig
  ): Promise<ModelConfig> {
    const cfg = config as Partial<
      LLMConfig & TTSConfig & STTConfig & EmbeddingConfig
    > & {
      performanceMode?: 'auto' | 'fast' | 'quality';
      autoTune?: boolean;
    };

    // If neither performanceMode='auto' nor autoTune=true, don't scale
    if (!this.shouldAutoScale(cfg)) {
      return config;
    }

    // Detect capabilities (lazy load)
    const capabilities = await this.capabilitiesDetector.detect();

    // 1. Model Selection (Phase 1)
    // If autoTune is enabled, try to select better model
    let scaledConfig = { ...cfg } as ModelConfig;

    if (cfg.autoTune) {
      const logger = getConfig().logger;
      logger.debug('[AutoScaler] Tuning model selection', {
        modality,
        capabilities,
      });

      scaledConfig = this.modelSelector.selectBestModel(
        modality,
        scaledConfig,
        capabilities
      );
    }

    // 2. Device/DType scaling (Phase 2+)
    const partialConfig = scaledConfig as Partial<
      LLMConfig & TTSConfig & STTConfig & EmbeddingConfig
    >;

    // Select device if not provided
    if (!partialConfig.device) {
      partialConfig.device = this.selectDevice(capabilities);
    }

    // Select dtype if not provided
    if (!partialConfig.dtype) {
      partialConfig.dtype = this.selectDType(capabilities);
    }

    // Select maxTokens for LLM if not provided
    if (modality === 'llm') {
      const llmConfig = scaledConfig as LLMConfig;
      if (llmConfig.maxTokens == null) {
        llmConfig.maxTokens = this.selectMaxTokens(modality, capabilities);
      }
    }

    // Remove autoTune flag from result as it's not part of standard config interface
    // (though our type definition allows it, it's cleaner to treat it as a directive)

    return scaledConfig;
  }

  /**
   * Checks if configuration should be automatically scaled
   */
  private shouldAutoScale(config: {
    performanceMode?: string;
    autoTune?: boolean;
  }): boolean {
    return config.performanceMode === 'auto' || !!config.autoTune;
  }

  /**
   * Selects optimal device based on environment
   */
  private selectDevice(caps: SystemCapabilities): Device {
    if (caps.platform === 'browser') {
      return caps.hasWebGPU ? 'webgpu' : 'cpu'; // cpu actually means wasm in browser context usually
    } else {
      return 'cpu';
    }
  }

  /**
   * Selects optimal data type based on capabilities
   */
  private selectDType(caps: SystemCapabilities): DType {
    // Phase 2: Will implement smarter selection
    // For now stick to q4 or q8
    if (caps.hasWebGPU && caps.totalRAM > 4 * 1024 * 1024 * 1024) {
      return 'q8'; // Better quality if GPU + >4GB RAM
    }
    return 'q4'; // Default safe for most
  }

  /**
   * Selects maximum number of tokens for LLM
   */
  private selectMaxTokens(
    modality: Modality,
    caps: SystemCapabilities
  ): number | undefined {
    // Phase 5: Will implement smarter limits
    if (modality === 'llm') {
      // Conservative default for low RAM systems
      if (caps.totalRAM < 2 * 1024 * 1024 * 1024) {
        return 512;
      }
    }
    return undefined;
  }

  /**
   * Sets new BackendSelector (mainly for tests)
   */
  setBackendSelector(backendSelector: BackendSelector): void {
    this.backendSelector = backendSelector;
    // Re-create detector with new selector
    this.capabilitiesDetector = new SystemCapabilitiesDetector(
      this.backendSelector
    );
  }
}
