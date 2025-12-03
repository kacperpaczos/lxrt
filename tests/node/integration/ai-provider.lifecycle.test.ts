import { createAIProvider, init } from '../../../src/index';

jest.setTimeout(300000);

describe('AIProvider lifecycle (Node + ORT)', () => {
  let provider: ReturnType<typeof createAIProvider>;

  beforeAll(async () => {
    await init();
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
    await provider.warmup('llm');
    await provider.warmup('embedding');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('warms up LLM before inference and keeps it ready', async () => {
    expect(provider.isReady('llm')).toBe(true);

    const status = provider.getStatus('llm');
    expect(status.loaded).toBe(true);
    expect(status.model).toBe('Xenova/gpt2');

    const response = await provider.chat('Say hello after warmup.');
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });

  it('provides embeddings after explicit warmup', async () => {
    expect(provider.isReady('embedding')).toBe(true);

    const status = provider.getStatus('embedding');
    expect(status.loaded).toBe(true);
    expect(status.model).toBe('Xenova/all-MiniLM-L6-v2');

    const vectors = await provider.embed(['Warmup check', 'Vector test']);
    expect(vectors).toHaveLength(2);
    expect(vectors[0].length).toBeGreaterThan(0);
  });

  it('reports statuses for every configured modality', () => {
    const statuses = provider.getAllStatuses();

    const llmStatus = statuses.find(s => s.modality === 'llm');
    expect(llmStatus).toBeDefined();
    expect(llmStatus?.loaded).toBe(true);
    expect(llmStatus?.model).toBe('Xenova/gpt2');

    const embeddingStatus = statuses.find(s => s.modality === 'embedding');
    expect(embeddingStatus).toBeDefined();
    expect(embeddingStatus?.loaded).toBe(true);
    expect(embeddingStatus?.model).toBe('Xenova/all-MiniLM-L6-v2');
  });

  it('unloads models and reloads them on demand', async () => {
    await provider.unload('embedding');

    expect(provider.isReady('embedding')).toBe(false);

    const unloadedStatus = provider.getStatus('embedding');
    expect(unloadedStatus.loaded).toBe(false);

    await provider.warmup('embedding');
    expect(provider.isReady('embedding')).toBe(true);
  });

  it('updates configuration and reloads affected models', async () => {
    await provider.updateConfig({
      llm: {
        model: 'Xenova/gpt2',
        dtype: 'fp32',
        device: 'cpu',
        maxTokens: 32,
      },
    });

    await provider.warmup('llm');
    const status = provider.getStatus('llm');
    expect(status.loaded).toBe(true);
    expect(status.model).toBe('Xenova/gpt2');

    const response = await provider.chat('Config updated warmup test');
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });
});

