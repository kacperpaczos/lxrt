
import { GpuDetector } from '../../../src/core/gpu/GpuDetector';

describe('GpuDetector', () => {
    const originalNavigator = global.navigator;
    const originalWindow = global.window;

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        // Restore global objects
        if (originalNavigator) {
            Object.defineProperty(global, 'navigator', {
                value: originalNavigator,
                writable: true
            });
        } else {
            // @ts-ignore
            delete global.navigator;
        }

        if (originalWindow) {
            Object.defineProperty(global, 'window', {
                value: originalWindow,
                writable: true
            });
        } else {
            // @ts-ignore
            delete global.window;
        }
    });

    it('should detect WebGPU when available', async () => {
        // Mock window to pass isBrowser check
        Object.defineProperty(global, 'window', {
            value: {},
            writable: true
        });

        // Mock navigator.gpu
        const mockInfo = { vendor: 'mock-vendor', architecture: 'mock-arch' };
        const mockAdapter = {
            isMockAdapter: true,
            requestAdapterInfo: jest.fn().mockResolvedValue(mockInfo)
        };
        const mockGpu = {
            requestAdapter: jest.fn().mockResolvedValue(mockAdapter),
        };

        Object.defineProperty(global, 'navigator', {
            value: { gpu: mockGpu },
            writable: true
        });

        const detector = new GpuDetector();
        const caps = await detector.detect();

        expect(caps.webgpuAvailable).toBe(true);
        expect(caps.adapterInfo).toEqual(mockInfo);
        expect(detector.supportsWebGPUApi()).toBe(true);
    });

    it('should handle missing navigator (Node.js environment)', async () => {
        // Ensure navigator is undefined (Node.js default)
        // @ts-ignore
        delete global.navigator;
        // @ts-ignore
        delete global.window;

        const detector = new GpuDetector();
        const caps = await detector.detect();

        expect(caps.webgpuAvailable).toBe(false);
        expect(detector.supportsWebGPUApi()).toBe(false);
    });

    it('should handle navigator without gpu property', async () => {
        // Browser environment but no WebGPU
        Object.defineProperty(global, 'window', {
            value: {},
            writable: true
        });
        Object.defineProperty(global, 'navigator', {
            value: {},
            writable: true
        });

        const detector = new GpuDetector();
        const caps = await detector.detect();

        expect(caps.webgpuAvailable).toBe(false);
    });

    it('should handle requestAdapter returning null', async () => {
        Object.defineProperty(global, 'window', {
            value: {},
            writable: true
        });
        const mockGpu = {
            requestAdapter: jest.fn().mockResolvedValue(null),
        };

        Object.defineProperty(global, 'navigator', {
            value: { gpu: mockGpu },
            writable: true
        });

        const detector = new GpuDetector();
        const caps = await detector.detect();

        expect(caps.webgpuAvailable).toBe(false);
    });

    it('should handle requestAdapter throwing error', async () => {
        Object.defineProperty(global, 'window', {
            value: {},
            writable: true
        });
        const mockGpu = {
            requestAdapter: jest.fn().mockRejectedValue(new Error('GPU error')),
        };

        Object.defineProperty(global, 'navigator', {
            value: { gpu: mockGpu },
            writable: true
        });

        // implementation swallows error and returns result with available=false
        // We can suppress console.warn to keep output clean, but let's just assert result
        const spy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        const detector = new GpuDetector();
        const caps = await detector.detect();

        expect(caps.webgpuAvailable).toBe(false);

        spy.mockRestore();
    });
});
