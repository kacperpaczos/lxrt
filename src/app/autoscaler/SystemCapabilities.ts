/**
 * System Capabilities Detection
 *
 * Detects available system resources including:
 * - RAM (total and available)
 * - Platform (Browser vs Node.js)
 * - GPU availability (via BackendSelector)
 */

import { BackendSelector } from '../backend/BackendSelector';

export interface SystemCapabilities {
  platform: 'browser' | 'node';
  totalRAM: number; // in bytes
  hasWebGPU: boolean;
  cores: number;
}

export class SystemCapabilitiesDetector {
  private capabilities: SystemCapabilities | null = null;
  private backendSelector: BackendSelector;

  constructor(backendSelector: BackendSelector) {
    this.backendSelector = backendSelector;
  }

  /**
   * Detect system capabilities
   */
  async detect(): Promise<SystemCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const env = this.backendSelector.detectEnvironment();
    const platform = env.isBrowser ? 'browser' : 'node';
    const hasWebGPU = env.hasWebGPU;
    const cores = env.cores;

    let totalRAM = 0;

    if (platform === 'browser') {
      // Browser RAM detection
      // @ts-ignore - deviceMemory is experimental
      if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
        // deviceMemory returns approx RAM in GB (0.25, 0.5, 1, 2, 4, 8)
        // Convert to bytes
        // @ts-ignore
        totalRAM = (navigator.deviceMemory as number) * 1024 * 1024 * 1024;
      } else {
        // Fallback for browsers without deviceMemory API
        // Assume conservative default (4GB) if unknown, to avoid over-selecting
        totalRAM = 4 * 1024 * 1024 * 1024;
      }
    } else {
      // Node.js RAM detection
      try {
        // Dynamic import to avoid bundling 'os' in browser build
        // Use eval/Function workaround or specific bundler ignore if needed
        // But here we rely on standard conditional import patterns
        if (
          typeof process !== 'undefined' &&
          process.versions &&
          process.versions.node
        ) {
          const os = await import('os');
          totalRAM = os.totalmem();
        }
      } catch (e) {
        // Fallback if os module import fails
        console.warn('[SystemCapabilities] Failed to detect Node.js RAM:', e);
        totalRAM = 4 * 1024 * 1024 * 1024; // 4GB default
      }
    }

    this.capabilities = {
      platform,
      totalRAM,
      hasWebGPU,
      cores,
    };

    return this.capabilities;
  }

  /**
   * Get detected capabilities (cached)
   */
  getCapabilities(): SystemCapabilities | null {
    return this.capabilities;
  }
}
