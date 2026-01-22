/**
 * Model Selector
 *
 * Auto-selects the best model variant based on system capabilities.
 * Implements the decision matrix for Auto-Tuning logic.
 */

import type { Modality, ModelConfig, LLMConfig } from '../../core/types';
import type { SystemCapabilities } from './SystemCapabilities';
import { LLM_PRESETS } from '../../core/ModelPresets';

export class ModelSelector {
  /**
   * Select best model based on capabilities
   */
  selectBestModel(
    modality: Modality,
    config: ModelConfig,
    capabilities: SystemCapabilities
  ): ModelConfig {
    // Only auto-tune if requested and if model is a preset or we are tuning generic requests
    // Currently we mainly focus on LLM tuning based on presets like 'chat' (which maps to 'chat-light' static)
    // But Auto-Tuning overrides static resolution.

    // For Phase 1, we assume user passed a preset like 'chat-light' OR generic intent
    // BUT since we don't have generic intent presets yet (like just 'chat'),
    // we analyze the *preset string* to determine intent.

    // If autoTune is false (default), return as is
    // Note: Config type doesn't have autoTune yet, so we assume it will be passed or handled by caller.
    // Here we just implement the selection logic assuming we WANT to select.

    if (modality === 'llm') {
      return this.selectLLM(config as LLMConfig, capabilities);
    }

    // For other modalities, we currently return as-is (Phase 1 focus on LLM)
    return config;
  }

  private selectLLM(config: LLMConfig, caps: SystemCapabilities): LLMConfig {
    const modelId = config.model;

    // Determine intent from model string
    // e.g. 'chat-light' -> intent: chat
    // e.g. 'completion-medium' -> intent: completion

    let intent: 'chat' | 'completion' | 'generic' = 'generic';

    if (
      modelId.includes('chat') ||
      modelId.includes('Instruct') ||
      modelId.includes('instruct')
    ) {
      intent = 'chat';
    } else if (modelId.includes('completion')) {
      intent = 'completion';
    }

    // Decision Matrix
    // RAM limits (bytes)
    const RAM_4GB = 4 * 1024 * 1024 * 1024;
    const RAM_8GB = 8 * 1024 * 1024 * 1024;

    let selectedModel: string = modelId;

    if (intent === 'chat') {
      if (caps.hasWebGPU && caps.totalRAM >= RAM_8GB) {
        // High-end: Use heavy chat model
        selectedModel = LLM_PRESETS['chat-heavy']; // Gemma 2B
      } else if (caps.totalRAM >= RAM_4GB) {
        // Mid-range: Use medium chat model
        selectedModel = LLM_PRESETS['chat-medium']; // Phi-3 Mini
      } else {
        // Low-end: Use light chat model
        selectedModel = LLM_PRESETS['chat-light']; // Qwen 0.5B
      }
    } else if (intent === 'completion') {
      if (caps.totalRAM >= RAM_4GB) {
        selectedModel = LLM_PRESETS['completion-medium'];
      } else {
        selectedModel = LLM_PRESETS['completion-light'];
      }
    } else {
      // Generic / Unknown intent - stick to what was provided or safely downgrade if OOM risk
      // Safety fallback: if very low RAM (<2GB) and model is unknown/heavy, maybe warn or switch?
      // For now, we only upgrade/downgrade known intents.

      // But if we are in 'generic' intent (e.g. user passed 'default'), use balanced logic
      if (modelId === 'default' || modelId === LLM_PRESETS['default']) {
        if (caps.totalRAM >= RAM_4GB) {
          selectedModel = LLM_PRESETS['medium'];
        } else {
          selectedModel = LLM_PRESETS['light'];
        }
      }
    }

    return {
      ...config,
      model: selectedModel,
    };
  }
}
