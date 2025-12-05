/**
 * @tags embedding, model, core, text
 * @description Embeddings Model integration tests - tests vector generation with MiniLM
 */
import { createAIProvider, init } from '../../../../src/index';
import { createTestLogger, measureAsync } from '../helpers/test-logger';

describe('Embeddings Model (Node + ORT)', () => {
  const logger = createTestLogger('Embeddings Model');
  
  const provider = createAIProvider({
    embedding: {
      model: 'Xenova/all-MiniLM-L6-v2',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    logger.logTestStart('Embeddings Model integration tests');
    logger.logStep('Initializing transformers');
    await measureAsync(logger, 'init', () => init());
    
    logger.logModelLoad('embedding', 'Xenova/all-MiniLM-L6-v2', { dtype: 'fp32', device: 'cpu' });
    await measureAsync(logger, 'warmup-embedding', () => provider.warmup('embedding'));
  });

  afterAll(async () => {
    logger.logStep('Disposing provider');
    await provider.dispose();
    logger.logTestEnd(true);
  });

  it('generates embedding dla tekstu', async () => {
    const text = 'Hello world';
    logger.logInput('text', text);
    
    logger.logApiCall('provider.embed()', { text });
    
    const [vec] = await measureAsync(logger, 'embed', () => provider.embed(text));
    
    logger.logOutput('vectorLength', (vec as number[]).length);
    logger.logOutput('vectorSample', `[${(vec as number[]).slice(0, 5).join(', ')}, ...]`);
    
    expect(Array.isArray(vec)).toBe(true);
    expect((vec as number[]).length).toBeGreaterThan(0);
    
    console.log(`✅ Embedding generated: ${(vec as number[]).length} dimensions`);
  });

  it('calculates similarity (cosine) > 0.3 for similar texts', async () => {
    const text1 = 'I love programming';
    const text2 = 'Coding is fun';
    
    logger.logInput('text1', text1);
    logger.logInput('text2', text2);
    
    logger.logApiCall('provider.similarity()', { text1, text2 });
    
    const similarity = await measureAsync(logger, 'similarity', () => 
      provider.similarity(text1, text2)
    );
    
    logger.logOutput('similarity', similarity);
    
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThan(0.3);
    
    console.log(`✅ Similarity: ${similarity.toFixed(4)} (expected > 0.3)`);
  });
});
