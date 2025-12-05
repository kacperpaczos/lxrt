/**
 * BackendSelector - Selects optimal backend for AI operations
 * Follows Single Responsibility Principle
 *
 * This utility provides a centralized way to select the best backend
 * for AI operations based on system capabilities and performance.
 *
 * @author transformers-router
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

export interface BackendInfo {
  type: string;
  available: boolean;
  performance: {
    score: number;
    memory: number;
    speed: number;
  };
  settings: Record<string, unknown>;
  fallback?: string;
  error?: string;
}

export interface BackendConfig {
  type: string;
  settings: Record<string, unknown>;
  optimized: boolean;
}

export interface BackendMetrics {
  type: string;
  performance: {
    score: number;
    memory: number;
    speed: number;
  };
  usage: {
    total: number;
    average: number;
    peak: number;
  };
}

export interface BackendMonitor {
  type: string;
  active: boolean;
  startTime: Date;
  metrics: BackendMetrics;
  recordUsage(duration: number, load: number): void;
  getStats(): BackendMetrics;
  stop(): void;
}

export interface BackendSelectorOptions {
  preferGPU?: boolean;
  maxMemory?: number;
  minPerformance?: number;
  fallbackOrder?: string[];
}

/**
 * BackendSelector - Selects optimal backend for AI operations
 */
export class BackendSelector extends EventEmitter {
  private backends = new Map<string, BackendInfo>();
  private monitors = new Map<string, BackendMonitor>();
  private options: BackendSelectorOptions;

  constructor(options: BackendSelectorOptions = {}) {
    super();
    this.options = {
      preferGPU: options.preferGPU || false,
      maxMemory: options.maxMemory || 8192,
      minPerformance: options.minPerformance || 0.5,
      fallbackOrder: options.fallbackOrder || ['gpu', 'cpu', 'wasm'],
    };

    this.initializeBackends();
  }

  /**
   * Detect available backends
   */
  detectAvailableBackends(): string[] {
    const available: string[] = [];

    // Always available
    available.push('cpu');
    available.push('wasm');

    // Check for GPU availability
    if (this.isGPUAvailable()) {
      available.push('gpu');
    }

    // Check for other specialized backends
    if (this.isWebGPUAvailable()) {
      available.push('webgpu');
    }

    return available;
  }

  /**
   * Select best backend
   */
  selectBackend(preferred: string, fallbackOrder?: string[]): BackendInfo {
    const order = fallbackOrder ||
      this.options.fallbackOrder || ['gpu', 'cpu', 'wasm'];

    // Try preferred backend first
    if (this.isBackendAvailable(preferred)) {
      return this.getBackendInfo(preferred);
    }

    // Try fallback order
    for (const backend of order) {
      if (this.isBackendAvailable(backend)) {
        const info = this.getBackendInfo(backend);
        info.fallback = preferred;
        return info;
      }
    }

    // Default to CPU
    return this.getBackendInfo('cpu');
  }

  /**
   * Get backend configuration
   */
  getBackendConfig(type: string): BackendConfig {
    const info = this.getBackendInfo(type);

    return {
      type: info.type,
      settings: info.settings,
      optimized: info.performance.score > (this.options.minPerformance || 0.5),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(type: string): BackendMetrics {
    const info = this.getBackendInfo(type);
    const monitor = this.monitors.get(type);

    return {
      type: info.type,
      performance: info.performance,
      usage: monitor
        ? monitor.getStats().usage
        : {
            total: 0,
            average: 0,
            peak: 0,
          },
    };
  }

  /**
   * Compare backends
   */
  compareBackends(types: string[]): BackendMetrics[] {
    return types
      .map(type => this.getPerformanceMetrics(type))
      .sort((a, b) => b.performance.score - a.performance.score);
  }

  /**
   * Optimize backend for specific use case
   */
  optimizeBackend(
    type: string,
    requirements: {
      modelType: string;
      modelSize: string;
      deviceMemory: number;
    }
  ): BackendConfig {
    const baseConfig = this.getBackendConfig(type);
    const optimizedSettings = { ...baseConfig.settings };

    // Optimize based on model type
    if (requirements.modelType === 'llm') {
      optimizedSettings.batchSize = Math.min(
        4,
        Math.floor(requirements.deviceMemory / 2048)
      );
      optimizedSettings.attentionCache = true;
    } else if (requirements.modelType === 'vision') {
      optimizedSettings.imageSize =
        requirements.modelSize === 'large' ? 512 : 224;
      optimizedSettings.batchSize = 1;
    }

    // Optimize based on model size
    if (requirements.modelSize === 'large') {
      optimizedSettings.precision = 'fp16';
      optimizedSettings.memoryOptimization = true;
    } else {
      optimizedSettings.precision = 'fp32';
    }

    // Optimize based on available memory
    if (requirements.deviceMemory < 4096) {
      optimizedSettings.memoryOptimization = true;
      optimizedSettings.batchSize = 1;
    }

    return {
      type: baseConfig.type,
      settings: optimizedSettings,
      optimized: true,
    };
  }

  /**
   * Start monitoring a backend
   */
  startMonitoring(type: string): BackendMonitor {
    const monitor: BackendMonitor = {
      type,
      active: true,
      startTime: new Date(),
      metrics: {
        type,
        performance: this.getBackendInfo(type).performance,
        usage: {
          total: 0,
          average: 0,
          peak: 0,
        },
      },
      recordUsage: (duration: number, load: number) => {
        if (!monitor.active) return;

        monitor.metrics.usage.total += duration;
        monitor.metrics.usage.average =
          monitor.metrics.usage.total /
          (Date.now() - monitor.startTime.getTime());
        monitor.metrics.usage.peak = Math.max(monitor.metrics.usage.peak, load);

        this.emit('backendUsage', { type, duration, load });
      },
      getStats: () => ({
        ...monitor.metrics,
        usage: {
          total: monitor.metrics.usage.total,
          average: monitor.metrics.usage.average,
          peak: monitor.metrics.usage.peak,
        },
      }),
      stop: () => {
        monitor.active = false;
        this.emit('backendStopped', { type });
      },
    };

    this.monitors.set(type, monitor);
    this.emit('backendStarted', { type });

    return monitor;
  }

  /**
   * Clear all data
   */
  clear(): void {
    // Stop all monitors
    for (const monitor of this.monitors.values()) {
      monitor.stop();
    }

    this.monitors.clear();
    this.backends.clear();
  }

  /**
   * Dispose of the selector
   */
  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }

  /**
   * Initialize backends
   */
  private initializeBackends(): void {
    const backends = this.detectAvailableBackends();

    for (const type of backends) {
      this.backends.set(type, this.createBackendInfo(type));
    }
  }

  /**
   * Create backend info
   */
  private createBackendInfo(type: string): BackendInfo {
    const available = this.isBackendAvailable(type);
    const performance = this.calculatePerformance(type);

    return {
      type,
      available,
      performance,
      settings: this.getDefaultSettings(type),
      error: available ? undefined : `Backend ${type} not available`,
    };
  }

  /**
   * Check if backend is available
   */
  private isBackendAvailable(type: string): boolean {
    switch (type) {
      case 'cpu':
        return true;
      case 'wasm':
        return true;
      case 'gpu':
        return this.isGPUAvailable();
      case 'webgpu':
        return this.isWebGPUAvailable();
      default:
        return false;
    }
  }

  /**
   * Get backend info
   */
  private getBackendInfo(type: string): BackendInfo {
    return this.backends.get(type) || this.createBackendInfo(type);
  }

  /**
   * Check if GPU is available
   */
  private isGPUAvailable(): boolean {
    // Check for WebGL support
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    }

    // Node.js environment - assume GPU available
    return true;
  }

  /**
   * Check if WebGPU is available
   */
  private isWebGPUAvailable(): boolean {
    if (typeof window !== 'undefined') {
      return 'gpu' in navigator;
    }

    return false;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformance(type: string): {
    score: number;
    memory: number;
    speed: number;
  } {
    switch (type) {
      case 'gpu':
        return { score: 0.9, memory: 8192, speed: 0.95 };
      case 'cpu':
        return { score: 0.7, memory: 4096, speed: 0.6 };
      case 'wasm':
        return { score: 0.5, memory: 2048, speed: 0.4 };
      case 'webgpu':
        return { score: 0.8, memory: 6144, speed: 0.85 };
      default:
        return { score: 0.3, memory: 1024, speed: 0.3 };
    }
  }

  /**
   * Get default settings for backend
   */
  private getDefaultSettings(type: string): Record<string, unknown> {
    switch (type) {
      case 'gpu':
        return {
          precision: 'fp16',
          batchSize: 4,
          memoryOptimization: true,
        };
      case 'cpu':
        return {
          precision: 'fp32',
          batchSize: 1,
          numThreads: 4,
        };
      case 'wasm':
        return {
          precision: 'fp32',
          batchSize: 1,
          numThreads: 1,
        };
      case 'webgpu':
        return {
          precision: 'fp16',
          batchSize: 2,
          memoryOptimization: true,
        };
      default:
        return {};
    }
  }
}
