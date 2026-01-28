/**
 * @tags caching, persistence, core
 * @description Integration test: Verify model caching prevents duplicate downloads
 */
import { createAIProvider, init } from '../../../src/index';

jest.setTimeout(120000);

describe('Model Persistence / Caching', () => {
    beforeAll(async () => {
        await init();
    });

    it('should not re-download model on consecutive warmup calls', async () => {
        const provider = createAIProvider({
            embedding: {
                model: 'Xenova/all-MiniLM-L6-v2',
                dtype: 'fp32',
                device: 'cpu',
            },
        });

        // First warmup - may download if not cached
        console.log('📥 First warmup (may download)...');
        const startFirst = Date.now();
        await provider.warmup('embedding');
        const firstDuration = Date.now() - startFirst;
        console.log(`✅ First warmup: ${firstDuration}ms`);

        expect(provider.isReady('embedding')).toBe(true);

        // Second warmup - should use cache, be much faster
        console.log('📦 Second warmup (should use cache)...');
        const startSecond = Date.now();
        await provider.warmup('embedding');
        const secondDuration = Date.now() - startSecond;
        console.log(`✅ Second warmup: ${secondDuration}ms`);

        expect(provider.isReady('embedding')).toBe(true);

        // Second warmup should be significantly faster (at least 10x)
        // First load of a model can take 2-10 seconds, cached should be <100ms
        const speedRatio = firstDuration / Math.max(secondDuration, 1);
        console.log(`📊 Speed ratio: ${speedRatio.toFixed(1)}x`);

        // If first took long (download), second should be much faster
        if (firstDuration > 1000) {
            expect(secondDuration).toBeLessThan(firstDuration / 5);
        }

        await provider.dispose();
        console.log('✅ Model persistence verified');
    });

    it('should share loaded model between concurrent provider instances', async () => {
        // Create two providers with same config
        const provider1 = createAIProvider({
            embedding: {
                model: 'Xenova/all-MiniLM-L6-v2',
                dtype: 'fp32',
                device: 'cpu',
            },
        });

        const provider2 = createAIProvider({
            embedding: {
                model: 'Xenova/all-MiniLM-L6-v2',
                dtype: 'fp32',
                device: 'cpu',
            },
        });

        // Warmup first provider
        await provider1.warmup('embedding');
        expect(provider1.isReady('embedding')).toBe(true);

        // Second provider warmup should be instant (using shared model cache)
        const start = Date.now();
        await provider2.warmup('embedding');
        const duration = Date.now() - start;

        expect(provider2.isReady('embedding')).toBe(true);
        console.log(`📊 Second provider warmup: ${duration}ms`);

        // Should be very fast since model is already loaded
        expect(duration).toBeLessThan(500);

        await provider1.dispose();
        await provider2.dispose();
        console.log('✅ Model sharing between providers verified');
    });
});
