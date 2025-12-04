import { createAIProvider, init } from '../../../../src/index';

describe('Embeddings Model (Node + ORT)', () => {
  const provider = createAIProvider({
    embedding: {
      model: 'Xenova/all-MiniLM-L6-v2',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    await init();
    await provider.warmup('embedding');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('generates embedding dla tekstu', async () => {
    const [vec] = await provider.embed('Hello world');
    expect(Array.isArray(vec)).toBe(true);
    expect((vec as number[]).length).toBeGreaterThan(0);
  });

  it('calculates similarity (cosine) > 0.3 for similar texts', async () => {
    const a = await provider.similarity('I love programming', 'Coding is fun');
    expect(typeof a).toBe('number');
    expect(a).toBeGreaterThan(0.3);
  });
});

