/**
 * @tags concurrency, core
 * @description Integration test: Verify loadingPromise prevents duplicate concurrent loads
 */
import { createAIProvider, init } from '../../../src/index';

jest.setTimeout(120000);

describe('Concurrent Model Loading', () => {
    beforeAll(async () => {
        await init();
    });

    it('should handle multiple concurrent warmup calls without duplicate loading', async () => {
        const provider = createAIProvider({
            embedding: {
                model: 'Xenova/all-MiniLM-L6-v2',
                dtype: 'fp32',
                device: 'cpu',
            },
        });

        // Fire 3 concurrent warmup calls
        const warmupPromises = [
            provider.warmup('embedding'),
            provider.warmup('embedding'),
            provider.warmup('embedding'),
        ];

        // All should resolve without error
        await expect(Promise.all(warmupPromises)).resolves.not.toThrow();

        // Model should be ready
        expect(provider.isReady('embedding')).toBe(true);

        // Status should show loaded
        const status = provider.getStatus('embedding');
        expect(status.loaded).toBe(true);
        expect(status.loading).toBe(false);

        await provider.dispose();
        console.log('✅ Concurrent warmup handled correctly');
    });

    it('should not reload model if already loaded', async () => {
        const provider = createAIProvider({
            embedding: {
                model: 'Xenova/all-MiniLM-L6-v2',
                dtype: 'fp32',
                device: 'cpu',
            },
        });

        // First warmup
        await provider.warmup('embedding');
        expect(provider.isReady('embedding')).toBe(true);

        // Second warmup should return immediately
        const start = Date.now();
        await provider.warmup('embedding');
        const elapsed = Date.now() - start;

        // Should be very fast since model is already loaded
        expect(elapsed).toBeLessThan(100);

        await provider.dispose();
        console.log('✅ Already-loaded model not reloaded');
    });
});
