/**
 * @tags cache, core
 * @description ModelCache integration tests - tests model caching, expiration, and statistics
 */
import { ModelCache } from '../../../src/app/cache/ModelCache';
import { createAIProvider, init } from '../../../src/index';
import { createTestLogger, measureAsync } from './helpers/test-logger';

describe('ModelCache (Node + ORT)', () => {
  const logger = createTestLogger('ModelCache');
  let cache: ModelCache;
  let provider: any;

  beforeAll(async () => {
    logger.logTestStart('ModelCache integration tests');
    logger.logStep('Initializing transformers');
    await measureAsync(logger, 'init', () => init());
    
    logger.logStep('Creating provider with LLM and Embedding');
    provider = createAIProvider({
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 20 },
      embedding: { model: 'Xenova/all-MiniLM-L6-v2', dtype: 'fp32', device: 'cpu' },
    });

    // Use the actual cache from ModelManager instead of creating a separate one
    cache = (provider as any).modelManager.getCache();
    logger.logOutput('cacheInstance', 'Retrieved from ModelManager');
  });

  afterAll(async () => {
    logger.logStep('Disposing provider');
    await provider.dispose();
    logger.logTestEnd(true);
  });

  beforeEach(() => {
    // Don't clear cache - tests will manage their own cache state
    logger.logStep('Test case starting');
  });

  it('tworzy cache instance', () => {
    logger.logApiCall('cache check');
    logger.logOutput('cache', cache);
    logger.logOutput('cacheType', cache.constructor.name);
    
    expect(cache).toBeDefined();
    expect(cache).toBeInstanceOf(ModelCache);
    
    console.log(`✅ Cache instance created`);
  });

  it('cacheuje modele po załadowaniu', async () => {
    logger.logStep('Warming up LLM model');
    logger.logApiCall('provider.warmup()', { modality: 'llm' });
    
    await measureAsync(logger, 'warmup-llm', () => provider.warmup('llm'));

    logger.logApiCall('cache.hasByConfig()', { type: 'llm', model: 'Xenova/gpt2' });
    const isCached = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('isCached', isCached);
    expect(isCached).toBe(true);

    logger.logApiCall('cache.get()', { type: 'llm', model: 'Xenova/gpt2' });
    const cachedModel = cache.get('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('cachedModel', cachedModel ? 'found' : 'not found');
    expect(cachedModel).toBeDefined();
    
    console.log(`✅ Model cached after warmup`);
  });

  it('cacheuje różne typy modeli', async () => {
    logger.logStep('Warming up both models');
    
    await measureAsync(logger, 'warmup-llm', () => provider.warmup('llm'));
    await measureAsync(logger, 'warmup-embedding', () => provider.warmup('embedding'));

    logger.logApiCall('cache.hasByConfig()', { checks: ['llm', 'embedding'] });
    
    const hasLlm = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    const hasEmbedding = cache.hasByConfig('embedding', { model: 'Xenova/all-MiniLM-L6-v2' });
    
    logger.logOutput('hasLlm', hasLlm);
    logger.logOutput('hasEmbedding', hasEmbedding);
    
    expect(hasLlm).toBe(true);
    expect(hasEmbedding).toBe(true);

    const llmModel = cache.get('llm', { model: 'Xenova/gpt2' });
    const embeddingModel = cache.get('embedding', { model: 'Xenova/all-MiniLM-L6-v2' });

    logger.logOutput('llmModel', llmModel ? 'found' : 'not found');
    logger.logOutput('embeddingModel', embeddingModel ? 'found' : 'not found');
    
    expect(llmModel).toBeDefined();
    expect(embeddingModel).toBeDefined();
    
    console.log(`✅ Multiple model types cached`);
  });

  it('zwraca undefined dla nieistniejących modeli', () => {
    logger.logApiCall('cache.get()', { type: 'llm', model: 'non-existent-model' });
    
    const nonExistent = cache.get('llm', { model: 'non-existent-model' });
    logger.logOutput('nonExistent', nonExistent);
    expect(nonExistent).toBeUndefined();

    logger.logApiCall('cache.hasByConfig()', { type: 'llm', model: 'non-existent-model' });
    
    const hasNonExistent = cache.hasByConfig('llm', { model: 'non-existent-model' });
    logger.logOutput('hasNonExistent', hasNonExistent);
    expect(hasNonExistent).toBe(false);
    
    console.log(`✅ Non-existent model returns undefined`);
  });

  it('handles cache statistics', async () => {
    logger.logStep('Getting cache statistics');
    
    await provider.warmup('llm');
    
    logger.logApiCall('cache.getStats()');
    const stats = cache.getStats();
    logger.logOutput('stats', stats);
    
    expect(stats).toBeDefined();
    expect(stats.totalModels).toBeGreaterThan(0);
    expect(stats.modelsByType).toBeDefined();
    expect(stats.modelsByType.llm).toBeGreaterThan(0);
    
    console.log(`✅ Cache stats: ${stats.totalModels} models, LLM: ${stats.modelsByType.llm}`);
  });

  it('handles cache invalidation', async () => {
    logger.logStep('Testing cache invalidation');
    
    await provider.warmup('llm');

    logger.logApiCall('cache.hasByConfig() before invalidation');
    const beforeInvalidation = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('beforeInvalidation', beforeInvalidation);
    expect(beforeInvalidation).toBe(true);

    logger.logApiCall('cache.invalidate()', { type: 'llm', model: 'Xenova/gpt2' });
    cache.invalidate('llm', 'Xenova/gpt2');
    
    logger.logApiCall('cache.hasByConfig() after invalidation');
    const afterInvalidation = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('afterInvalidation', afterInvalidation);
    expect(afterInvalidation).toBe(false);
    
    console.log(`✅ Cache invalidation works`);
  });

  it('handles cache clearing', async () => {
    logger.logStep('Testing cache clearing');
    
    await provider.warmup('llm');
    await provider.warmup('embedding');
    
    logger.logApiCall('cache.getStats() before clear');
    const statsBefore = cache.getStats();
    logger.logOutput('totalModelsBefore', statsBefore.totalModels);
    expect(statsBefore.totalModels).toBeGreaterThan(0);
    
    logger.logApiCall('cache.clear()');
    cache.clear();
    
    logger.logApiCall('cache.getStats() after clear');
    const statsAfter = cache.getStats();
    logger.logOutput('totalModelsAfter', statsAfter.totalModels);
    expect(statsAfter.totalModels).toBe(0);
    
    console.log(`✅ Cache clear works: ${statsBefore.totalModels} → ${statsAfter.totalModels}`);
  });

  it('handles cache expiration', async () => {
    logger.logStep('Testing cache expiration');
    
    // Clear cache and reload model to ensure clean state
    cache.clear();
    await provider.warmup('llm');

    // Check if model is in cache before setting expiration
    logger.logApiCall('cache.hasByConfig() before expiration set');
    const isInCache = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('isInCacheBeforeExpiration', isInCache);
    console.log(`Model in cache before expiration: ${isInCache}`);
    
    // Set expiration time
    const expirationMs = 200;
    logger.logApiCall('cache.setExpiration()', { type: 'llm', model: 'Xenova/gpt2', ms: expirationMs });
    cache.setExpiration('llm', 'Xenova/gpt2', expirationMs);

    logger.logApiCall('cache.hasByConfig() immediately after expiration set');
    const stillCached = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('stillCached', stillCached);
    expect(stillCached).toBe(true);

    // Wait with margin for timer and lazy-eviction
    logger.logStep(`Waiting ${expirationMs + 100}ms for expiration`);
    await new Promise(resolve => setTimeout(resolve, 300));

    logger.logApiCall('cache.hasByConfig() after expiration');
    const afterExpiration = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('afterExpiration', afterExpiration);
    expect(afterExpiration).toBe(false);
    
    console.log(`✅ Cache expiration works after ${expirationMs}ms`);
  });

  it('handles cache size limits', async () => {
    logger.logStep('Testing cache size limits');
    
    logger.logApiCall('cache.setMaxSize()', { maxSize: 2 });
    cache.setMaxSize(2);
    
    await provider.warmup('llm');
    await provider.warmup('embedding');
    
    logger.logApiCall('cache.getStats()');
    const stats = cache.getStats();
    logger.logOutput('totalModels', stats.totalModels);
    
    expect(stats.totalModels).toBeLessThanOrEqual(2);
    
    console.log(`✅ Cache respects size limit: ${stats.totalModels} <= 2`);
  });

  it('handles cache hit/miss tracking', async () => {
    logger.logStep('Testing hit/miss tracking');
    
    // Clear cache and reload model to ensure clean state
    cache.clear();
    await provider.warmup('llm');

    // Check if model is in cache
    logger.logApiCall('cache.hasByConfig()');
    const isInCache = cache.hasByConfig('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('isInCache', isInCache);
    console.log(`Model in cache: ${isInCache}`);
    
    // Cache hit
    logger.logApiCall('cache.get() - expecting hit');
    const hit1 = cache.get('llm', { model: 'Xenova/gpt2' });
    logger.logOutput('hit1', hit1 ? 'HIT' : 'MISS');
    console.log(`Cache get result: ${!!hit1}`);
    expect(hit1).toBeDefined();

    // Cache miss
    logger.logApiCall('cache.get() - expecting miss');
    const miss = cache.get('llm', { model: 'non-existent' });
    logger.logOutput('miss', miss ? 'HIT' : 'MISS');
    expect(miss).toBeUndefined();

    logger.logApiCall('cache.getStats()');
    const stats = cache.getStats();
    logger.logOutput('hits', stats.hits);
    logger.logOutput('misses', stats.misses);
    
    expect(stats.hits).toBeGreaterThan(0);
    expect(stats.misses).toBeGreaterThan(0);
    
    console.log(`✅ Hit/miss tracking: ${stats.hits} hits, ${stats.misses} misses`);
  });
});
