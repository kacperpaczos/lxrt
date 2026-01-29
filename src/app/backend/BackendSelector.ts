/**
 * Backend Selector - backend selection and configuration for AI models
 *
 * Contains environment detection logic, fallback order determination,
 * and ONNX backend configuration (SIMD, threads, backendHint).
 */

import type { Device } from '../../core/types';

export interface EnvironmentInfo {
  isBrowser: boolean;
  hasWebGPU: boolean;
  cores: number;
}

export interface ONNXBackends {
  backendHint?: string;
  wasm?: {
    simd?: boolean;
    numThreads?: number;
  };
}

export interface TransformersEnv {
  backends?: {
    onnx?: ONNXBackends;
  };
}

export class BackendSelector {
  private environmentInfo: EnvironmentInfo | null = null;

  /**
   * Detects environment and system capabilities
   */
  detectEnvironment(): EnvironmentInfo {
    if (this.environmentInfo) {
      return this.environmentInfo;
    }

    const isBrowser =
      typeof window !== 'undefined' && typeof navigator !== 'undefined';
    let hasWebGPU = false;
    let cores = 2;

    if (isBrowser) {
      // Check WebGPU support
      hasWebGPU = 'gpu' in navigator;

      // Get CPU core count
      cores = navigator.hardwareConcurrency || 2;
    }

    this.environmentInfo = {
      isBrowser,
      hasWebGPU,
      cores,
    };

    return this.environmentInfo;
  }

  /**
   * Determines backend fallback order based on environment and desired device
   */
  getDeviceFallbackOrder(desiredDevice: Device | 'wasm'): string[] {
    const env = this.detectEnvironment();

    if (env.isBrowser) {
      // In browser: prefer WebGPU, fallback to WASM, never CPU
      if (desiredDevice === 'webgpu') {
        return env.hasWebGPU ? ['webgpu', 'wasm'] : ['wasm'];
      }
      if (desiredDevice === 'wasm') {
        return ['wasm'];
      }
      // If someone specified 'cpu' in browser, force WASM
      return ['wasm'];
    } else {
      // Node.js: allow fallback to CPU
      if (desiredDevice === 'webgpu') {
        return ['webgpu', 'cpu'];
      }
      if (desiredDevice === 'gpu') {
        return ['gpu', 'cpu'];
      }
      if (desiredDevice === 'cpu') {
        return ['cpu'];
      }
      // For other values, add fallback to CPU
      return [desiredDevice, 'cpu'];
    }
  }

  /**
   * Configures ONNX backend for given device
   */
  configureONNXBackend(device: string, env: TransformersEnv): void {
    if (!env?.backends?.onnx) {
      return;
    }

    const onnxBackends = env.backends.onnx as ONNXBackends;
    const environmentInfo = this.detectEnvironment();

    if (device === 'wasm') {
      // WASM backend configuration
      if ('backendHint' in onnxBackends) {
        onnxBackends.backendHint = 'wasm';
      }

      if (onnxBackends.wasm) {
        onnxBackends.wasm.simd = true;
        onnxBackends.wasm.numThreads = Math.min(
          4,
          Math.max(1, environmentInfo.cores - 1)
        );
      }
    } else if (device === 'webgpu') {
      // WebGPU backend configuration
      if ('backendHint' in onnxBackends) {
        onnxBackends.backendHint = 'webgpu';
      }
    }
  }

  /**
   * Converts device for pipeline API
   * 'wasm' → 'cpu' (pipeline API doesn't recognize 'wasm')
   */
  getPipelineDevice(device: string): Device {
    return device === 'wasm' ? 'cpu' : (device as Device);
  }

  /**
   * Resets environment info cache (mainly for tests)
   */
  resetEnvironmentCache(): void {
    this.environmentInfo = null;
  }
}
