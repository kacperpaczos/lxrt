import type { InitOptions, RuntimeConfig } from '@domain/config/Config';
import { setConfig, isInitialized, markInitialized, resetState } from './state';
import { createDefaultLogger } from '@infra/logging/defaultLogger';

export async function init(options: InitOptions = {}): Promise<void> {
  if (isInitialized()) return;

  const logger = options.logger ?? createDefaultLogger(!!options.debug);
  const config: RuntimeConfig = { debug: !!options.debug, logger };
  setConfig(config);

  // Initialize ONNX Runtime for Node.js
  if (typeof window === 'undefined') {
    // Node.js environment - import onnxruntime-node
    try {
      await import('onnxruntime-node');
      // Configure ONNX Runtime
      config.logger.debug('ONNX Runtime Node initialized');
    } catch {
      config.logger.warn(
        'ONNX Runtime Node not available, falling back to WASM'
      );
    }
  }

  // Initialize model registry
  if (options.models && Array.isArray(options.models)) {
    for (const modelName of options.models) {
      // For now, we'll register models by name - in a real implementation,
      // this would load model configurations from a registry or config file
      config.logger.debug(`Registering model: ${modelName}`);
      // Placeholder - in a full implementation, this would load actual model configs
    }
  }

  config.logger.info('Library initialized successfully');
  markInitialized();
}

export async function dispose(): Promise<void> {
  resetState();
}
