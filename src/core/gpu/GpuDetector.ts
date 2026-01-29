/**
 * GPU Detection Service
 * Centralizes logic for detecting WebGPU support in Browser and Node.js
 */

export interface GpuCapabilities {
    webgpuAvailable: boolean;
    adapterInfo?: Record<string, unknown>;
    isNode: boolean;
    backend?: 'webgpu' | 'dawn' | null;
}

export class GpuDetector {
    private static instance: GpuDetector;
    private capabilities: GpuCapabilities | null = null;

    public constructor() { }

    public static getInstance(): GpuDetector {
        if (!GpuDetector.instance) {
            GpuDetector.instance = new GpuDetector();
        }
        return GpuDetector.instance;
    }

    /**
     * Check for WebGPU support
     * Caches the result after the first check.
     */
    public async detect(): Promise<GpuCapabilities> {
        if (this.capabilities) {
            return this.capabilities;
        }

        const isBrowser =
            typeof window !== 'undefined' && typeof navigator !== 'undefined';

        // Default capabilities
        const caps: GpuCapabilities = {
            webgpuAvailable: false,
            isNode: !isBrowser,
            backend: null
        };

        if (isBrowser) {
            // Browser detection
            const nav = navigator as unknown as {
                gpu?: { requestAdapter?: () => Promise<unknown> };
            };

            if (nav.gpu) {
                try {
                    const adapter = await (nav.gpu.requestAdapter?.() || Promise.resolve(null));
                    if (adapter) {
                        caps.webgpuAvailable = true;
                        caps.backend = 'webgpu';
                        // Try to get adapter info if available
                        // Note: getInfo() is standard but might vary in older implementations
                        // We use 'unknown' casting to avoid TypeScript errors without explicit types
                        if (typeof (adapter as any).requestAdapterInfo === 'function') {
                            try {
                                caps.adapterInfo = await (adapter as any).requestAdapterInfo();
                            } catch (e) { /* ignore */ }
                        } else if ((adapter as any).info) {
                            caps.adapterInfo = (adapter as any).info;
                        }
                    }
                } catch (e) {
                    console.warn('[GpuDetector] WebGPU detection error:', e);
                    caps.webgpuAvailable = false;
                }
            }
        } else {
            // Node.js detection (placeholder for Phase 4)
            // Future: check for @aspect-build/dawn or other bindings
        }

        this.capabilities = caps;
        return caps;
    }

    /**
     * Synchronous check if we suspect WebGPU is supported (browser API presence).
     * Note: Doesn't guarantee actual hardware availability (requires async adapter request).
     */
    public supportsWebGPUApi(): boolean {
        if (typeof navigator !== 'undefined') {
            return !!(navigator as unknown as { gpu?: unknown }).gpu;
        }
        return false;
    }
}

export const gpuDetector = GpuDetector.getInstance();
