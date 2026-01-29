/**
 * ONNX Runtime Configuration for WebGPU
 */

import { Device } from '../types';

export interface SessionOptions {
    executionProviders?: string[];
    logSeverityLevel?: 0 | 1 | 2 | 3 | 4;
    logVerbosityLevel?: number;
    graphOptimizationLevel?: 'disabled' | 'basic' | 'extended' | 'all';
    enableCpuMemArena?: boolean;
    enableMemPattern?: boolean;
    enableProfiling?: boolean;
    preferredOutputLocation?: 'cpu' | 'gpu-buffer';
    [key: string]: unknown;
}

export class OnnxConfigurator {
    /**
     * Get optimized session options for the target device
     */
    public static getSessionOptions(device: Device, profiling: boolean = false): SessionOptions {
        const options: SessionOptions = {
            logSeverityLevel: 3, // Error
            logVerbosityLevel: 0,
            graphOptimizationLevel: 'all',
            enableCpuMemArena: true,
            enableMemPattern: true,
            enableProfiling: profiling,
        };

        if (device === 'webgpu') {
            // WebGPU specific optimizations
            options.executionProviders = ['webgpu'];
            // Keep tensors on GPU as much as possible to avoid CPU-GPU sync
            options.preferredOutputLocation = 'gpu-buffer';

            // Disable CPU memory arena when using WebGPU to reduce memory pressure?
            // Usually enableCssMemArena=false is suggested for WASM/WebGPU builds 
            // if we want to save system RAM, but might impact perf.
            // Let's stick to defaults unless proven otherwise.
        } else if (device === 'wasm') {
            options.executionProviders = ['wasm'];
        }

        return options;
    }
}
