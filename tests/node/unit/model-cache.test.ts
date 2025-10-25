import { ModelCache } from '../../../src/app/cache/ModelCache';
import { createAIProvider, init } from '../../../src/index';

describe('ModelCache (Node + ORT)', () => {
  let cache: ModelCache;
  let provider: any;

  beforeAll(async () => {
    await init();
    
    provider = createAIProvider({
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 20 },
      embedding: { model: 'Xenova/all-MiniLM-L6-v2', dtype: 'fp32', device: 'cpu' },
    });

    // Use the actual cache from ModelManager instead of creating a separate one
    cache = (provider as any).modelManager.getCache();
  });

  afterAll(async () => {
    await provider.dispose();
  });

  beforeEach(() => {
    // Don't clear cache - use the actual ModelManager cache
  });

  it('tworzy cache instance', () => {
    expect(cache).toBeDefined();
    expect(cache).toBeInstanceOf(ModelCache);
  });

  it('cacheuje modele po załadowaniu', async () => {
    await provider.warmup('llm');

    const isCached = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    expect(isCached).toBe(true);

    const cachedModel = cache.get('llm', { model: 'Xenova/gpt2' });
    expect(cachedModel).toBeDefined();
  });

  it('cacheuje różne typy modeli', async () => {
    await provider.warmup('llm');
    await provider.warmup('embedding');

    expect(cache.hasByConfig('llm', { model: 'Xenova/gpt2' })).toBe(true);
    expect(cache.hasByConfig('embedding', { model: 'Xenova/all-MiniLM-L6-v2' })).toBe(true);

    const llmModel = cache.get('llm', { model: 'Xenova/gpt2' });
    const embeddingModel = cache.get('embedding', { model: 'Xenova/all-MiniLM-L6-v2' });

    expect(llmModel).toBeDefined();
    expect(embeddingModel).toBeDefined();
  });

  it('zwraca undefined dla nieistniejących modeli', () => {
    const nonExistent = cache.get('llm', { model: 'non-existent-model' });
    expect(nonExistent).toBeUndefined();

    const hasNonExistent = cache.hasByConfig('llm', { model: 'non-existent-model' });
    expect(hasNonExistent).toBe(false);
  });

  it('handles cache statistics', async () => {
    await provider.warmup('llm');
    
    const stats = cache.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalModels).toBeGreaterThan(0);
    expect(stats.modelsByType).toBeDefined();
    expect(stats.modelsByType.llm).toBeGreaterThan(0);
  });

  it('handles cache invalidation', async () => {
    await provider.warmup('llm');

    expect(cache.hasByConfig('llm', { model: 'Xenova/gpt2' })).toBe(true);

    cache.invalidate('llm', 'Xenova/gpt2');
    expect(cache.hasByConfig('llm', { model: 'Xenova/gpt2' })).toBe(false);
  });

  it('handles cache clearing', async () => {
    await provider.warmup('llm');
    await provider.warmup('embedding');
    
    expect(cache.getStats().totalModels).toBeGreaterThan(0);
    
    cache.clear();
    expect(cache.getStats().totalModels).toBe(0);
  });

  it('handles cache expiration', async () => {
    await provider.warmup('llm');

    // Set expiration time
    cache.setExpiration('llm', 'Xenova/gpt2', 100); // 100ms

    expect(cache.hasByConfig('llm', { model: 'Xenova/gpt2' })).toBe(true);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(cache.hasByConfig('llm', { model: 'Xenova/gpt2' })).toBe(false);
  });

  it('handles cache size limits', async () => {
    cache.setMaxSize(2);
    
    await provider.warmup('llm');
    await provider.warmup('embedding');
    
    const stats = cache.getStats();
    expect(stats.totalModels).toBeLessThanOrEqual(2);
  });

  it('handles cache hit/miss tracking', async () => {
    await provider.warmup('llm');

    // Cache hit
    const hit1 = cache.get('llm', { model: 'Xenova/gpt2' });
    expect(hit1).toBeDefined();

    // Cache miss
    const miss = cache.get('llm', { model: 'non-existent' });
    expect(miss).toBeUndefined();

    const stats = cache.getStats();
    expect(stats.hits).toBeGreaterThan(0);
    expect(stats.misses).toBeGreaterThan(0);
  });
});
