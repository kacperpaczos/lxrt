/**
 * Integration test with real models
 * Requires internet connection to download models
 */

import { EmbeddingModel } from '../../../src/models/EmbeddingModel';
import type { EmbeddingConfig } from '../../../src/core/types';
import type { RuntimeConfig } from '../../../src/domain/config/Config';
import { setConfig, markInitialized } from '../../../src/app/state';

describe('Real Model Integration', () => {
    // Increase timeout for model download
    jest.setTimeout(300000); // 5 minutes

    beforeAll(() => {
        // Initialize application state to avoid "Library not initialized" error
        const config: RuntimeConfig = {
            env: 'node',
            gpu: false,
            models: {},
            optimization: {
                memory: {
                    maxModelSize: 1024 * 1024 * 1024,
                    mp3Compression: false,
                    ttl: 0
                },
                performance: {
                    quantization: true,
                    threads: 1
                }
            },
            logger: {
                debug: jest.fn(), // Mock logger methods
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            } as any
        };
        setConfig(config);
        markInitialized();
    });

    it('should load real Xenova/all-MiniLM-L6-v2 and generate embeddings', async () => {
        const config: EmbeddingConfig = {
            model: 'Xenova/all-MiniLM-L6-v2',
            quantized: true,
            device: 'cpu' // Force CPU for Node environment
        };

        const model = new EmbeddingModel(config);

        console.log('Loading real model (may take time)...');
        try {
            await model.load((progress) => {
                if (progress.status === 'progress') {
                    // Less verbose
                } else {
                    console.log(`Loading: ${progress.status} - ${progress.progress || 0}%`);
                }
            });
        } catch (e) {
            console.error('Model load failed:', e);
            throw e;
        }

        expect(model.isLoaded()).toBe(true);

        const text = 'Hello world, this is a test of semantic search.';
        const embeddings = await model.embed(text);

        expect(embeddings).toBeDefined();
        expect(embeddings.length).toBe(1);
        expect(embeddings[0].length).toBe(384); // MiniLM dimension

        // Check if values are not all zeros or NaNs
        const hasValues = embeddings[0].some(v => v !== 0);
        expect(hasValues).toBe(true);

        console.log('Embedding generated successfully:', embeddings[0].slice(0, 5));
    });
});
