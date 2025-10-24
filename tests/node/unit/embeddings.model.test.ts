import { createAIProvider, init } from '../../../src/index';

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

  it('generuje embedding dla tekstu', async () => {
    const [vec] = await provider.embed('Hello world');
    expect(Array.isArray(vec)).toBe(true);
    expect((vec as number[]).length).toBeGreaterThan(0);
  });

  it('liczy podobieństwo (cosine) > 0.3 dla podobnych tekstów', async () => {
    const a = await provider.similarity('I love programming', 'Coding is fun');
    expect(typeof a).toBe('number');
    expect(a).toBeGreaterThan(0.3);
  });
});


