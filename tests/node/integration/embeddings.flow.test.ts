import { createAIProvider } from '../../../src/index';

describe('Integration: Embeddings flow (Node + ORT)', () => {
  const provider = createAIProvider({
    embedding: {
      model: 'Xenova/all-MiniLM-L6-v2',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    await provider.warmup('embedding');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('warmup → embed → similarity → dispose', async () => {
    // Test embedding generation
    const [vec1] = await provider.embed('Hello world');
    expect(Array.isArray(vec1)).toBe(true);
    expect(vec1.length).toBeGreaterThan(0);

    // Test similarity calculation
    const similarity = await provider.similarity('Hello world', 'Hi there');
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThan(0);

    // Test findSimilar
    const result = await provider.findSimilar('Hello world', [
      'Completely different text',
      'Hello from another dimension',
      'Random words here',
    ]);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('similarity');
    expect(result).toHaveProperty('index');
    expect(typeof result.similarity).toBe('number');
  }, 120000);
});
