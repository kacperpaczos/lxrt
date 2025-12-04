/**
 * @tags lifecycle, core
 * @description AIProvider lifecycle integration tests - tests warmup/unload/config management
 */
import { createAIProvider, init } from '../../../src/index';
import { createTestLogger, measureAsync } from './helpers/test-logger';

jest.setTimeout(300000);

describe('AIProvider lifecycle (Node + ORT)', () => {
  const logger = createTestLogger('AIProvider Lifecycle');
  let provider: ReturnType<typeof createAIProvider>;

  beforeAll(async () => {
    logger.logTestStart('AIProvider lifecycle integration tests');
    logger.logStep('Initializing transformers');
    await measureAsync(logger, 'init', () => init());
    
    logger.logStep('Creating provider with LLM and Embedding');
    provider = createAIProvider({
      llm: {
        model: 'Xenova/gpt2',
        dtype: 'fp32',
        device: 'cpu',
        maxTokens: 48,
      },
      embedding: {
        model: 'Xenova/all-MiniLM-L6-v2',
        dtype: 'fp32',
        device: 'cpu',
      },
    });

    // Explicit warmup shows how models are fetched and loaded before tests
    logger.logModelLoad('llm', 'Xenova/gpt2', { dtype: 'fp32', device: 'cpu', maxTokens: 48 });
    logger.logModelLoad('embedding', 'Xenova/all-MiniLM-L6-v2', { dtype: 'fp32', device: 'cpu' });
    
    await measureAsync(logger, 'warmup-llm', () => provider.warmup('llm'));
    await measureAsync(logger, 'warmup-embedding', () => provider.warmup('embedding'));
  });

  afterAll(async () => {
    logger.logStep('Disposing provider');
    await provider.dispose();
    logger.logTestEnd(true);
  });

  it('warms up LLM before inference and keeps it ready', async () => {
    logger.logStep('Checking LLM readiness');
    logger.logApiCall('provider.isReady()', { modality: 'llm' });
    
    const isReady = provider.isReady('llm');
    logger.logOutput('isReady', isReady);
    expect(isReady).toBe(true);

    logger.logApiCall('provider.getStatus()', { modality: 'llm' });
    const status = provider.getStatus('llm');
    logger.logOutput('status', status);
    
    expect(status.loaded).toBe(true);
    expect(status.model).toBe('Xenova/gpt2');

    logger.logStep('Testing inference after warmup');
    const prompt = 'Say hello after warmup.';
    logger.logInput('prompt', prompt);
    logger.logApiCall('provider.chat()', { prompt });
    
    const response = await measureAsync(logger, 'chat', () => provider.chat(prompt));
    logger.logOutput('response', response);
    
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    
    console.log(`✅ LLM ready and responding: "${response.content.substring(0, 50)}..."`);
  });

  it('provides embeddings after explicit warmup', async () => {
    logger.logStep('Checking Embedding readiness');
    logger.logApiCall('provider.isReady()', { modality: 'embedding' });
    
    const isReady = provider.isReady('embedding');
    logger.logOutput('isReady', isReady);
    expect(isReady).toBe(true);

    logger.logApiCall('provider.getStatus()', { modality: 'embedding' });
    const status = provider.getStatus('embedding');
    logger.logOutput('status', status);
    
    expect(status.loaded).toBe(true);
    expect(status.model).toBe('Xenova/all-MiniLM-L6-v2');

    const texts = ['Warmup check', 'Vector test'];
    logger.logInput('texts', texts);
    logger.logApiCall('provider.embed()', { texts });
    
    const vectors = await measureAsync(logger, 'embed', () => provider.embed(texts));
    logger.logOutput('vectorsCount', vectors.length);
    logger.logOutput('vector0Length', vectors[0].length);
    
    expect(vectors).toHaveLength(2);
    expect(vectors[0].length).toBeGreaterThan(0);
    
    console.log(`✅ Embeddings ready: ${vectors.length} vectors, ${vectors[0].length} dimensions each`);
  });

  it('reports statuses for every configured modality', () => {
    logger.logStep('Getting all statuses');
    logger.logApiCall('provider.getAllStatuses()');
    
    const statuses = provider.getAllStatuses();
    logger.logOutput('statuses', statuses);

    const llmStatus = statuses.find(s => s.modality === 'llm');
    logger.logOutput('llmStatus', llmStatus);
    expect(llmStatus).toBeDefined();
    expect(llmStatus?.loaded).toBe(true);
    expect(llmStatus?.model).toBe('Xenova/gpt2');

    const embeddingStatus = statuses.find(s => s.modality === 'embedding');
    logger.logOutput('embeddingStatus', embeddingStatus);
    expect(embeddingStatus).toBeDefined();
    expect(embeddingStatus?.loaded).toBe(true);
    expect(embeddingStatus?.model).toBe('Xenova/all-MiniLM-L6-v2');
    
    console.log(`✅ All statuses reported: ${statuses.length} modalities`);
  });

  it('unloads models and reloads them on demand', async () => {
    logger.logStep('Unloading embedding model');
    logger.logApiCall('provider.unload()', { modality: 'embedding' });
    
    await measureAsync(logger, 'unload', () => provider.unload('embedding'));

    logger.logApiCall('provider.isReady()', { modality: 'embedding' });
    const isReadyAfterUnload = provider.isReady('embedding');
    logger.logOutput('isReadyAfterUnload', isReadyAfterUnload);
    expect(isReadyAfterUnload).toBe(false);

    logger.logApiCall('provider.getStatus()', { modality: 'embedding' });
    const unloadedStatus = provider.getStatus('embedding');
    logger.logOutput('unloadedStatus', unloadedStatus);
    expect(unloadedStatus.loaded).toBe(false);

    logger.logStep('Reloading embedding model');
    logger.logApiCall('provider.warmup()', { modality: 'embedding' });
    
    await measureAsync(logger, 'warmup-reload', () => provider.warmup('embedding'));
    
    logger.logApiCall('provider.isReady()', { modality: 'embedding' });
    const isReadyAfterReload = provider.isReady('embedding');
    logger.logOutput('isReadyAfterReload', isReadyAfterReload);
    expect(isReadyAfterReload).toBe(true);
    
    console.log(`✅ Model unload/reload cycle completed`);
  });

  it('updates configuration and reloads affected models', async () => {
    const newConfig = {
      llm: {
        model: 'Xenova/gpt2',
        dtype: 'fp32',
        device: 'cpu',
        maxTokens: 32,
      },
    };
    
    logger.logStep('Updating configuration');
    logger.logInput('newConfig', newConfig);
    logger.logApiCall('provider.updateConfig()', { config: newConfig });
    
    await measureAsync(logger, 'updateConfig', () => provider.updateConfig(newConfig));

    logger.logStep('Warming up with new config');
    logger.logApiCall('provider.warmup()', { modality: 'llm' });
    
    await measureAsync(logger, 'warmup-updated', () => provider.warmup('llm'));
    
    logger.logApiCall('provider.getStatus()', { modality: 'llm' });
    const status = provider.getStatus('llm');
    logger.logOutput('status', status);
    
    expect(status.loaded).toBe(true);
    expect(status.model).toBe('Xenova/gpt2');

    const prompt = 'Config updated warmup test';
    logger.logInput('prompt', prompt);
    logger.logApiCall('provider.chat()', { prompt });
    
    const response = await measureAsync(logger, 'chat-updated', () => provider.chat(prompt));
    logger.logOutput('response', response);
    
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    
    console.log(`✅ Config update successful, model responding`);
  });
});
