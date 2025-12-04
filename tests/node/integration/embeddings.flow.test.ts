/**
 * @tags embedding, flow, text
 * @description Embeddings flow integration test - tests full embed/similarity/findSimilar lifecycle
 */
import { createAIProvider, init } from '../../../src/index';
import { createTestLogger, measureAsync } from './helpers/test-logger';

describe('Integration: Embeddings flow (Node + ORT)', () => {
  const logger = createTestLogger('Embeddings Flow');
  
  const provider = createAIProvider({
    embedding: {
      model: 'Xenova/all-MiniLM-L6-v2',
      dtype: 'fp32',
      device: 'cpu',
    },
  });

  beforeAll(async () => {
    logger.logTestStart('Embeddings flow integration test');
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

  it('warmup → embed → similarity → dispose', async () => {
    // Test embedding generation
    const embedText = 'Hello world';
    logger.logInput('embedText', embedText);
    
    logger.logStep('Generating embedding');
    logger.logApiCall('provider.embed()', { text: embedText });
    
    const [vec1] = await measureAsync(logger, 'embed', () => provider.embed(embedText));
    
    logger.logOutput('vec1.length', vec1.length);
    expect(Array.isArray(vec1)).toBe(true);
    expect(vec1.length).toBeGreaterThan(0);

    // Test similarity calculation
    const text1 = 'Hello world';
    const text2 = 'Hi there';
    logger.logInput('similarityTexts', { text1, text2 });
    
    logger.logStep('Calculating similarity');
    logger.logApiCall('provider.similarity()', { text1, text2 });
    
    const similarity = await measureAsync(logger, 'similarity', () => 
      provider.similarity(text1, text2)
    );
    
    logger.logOutput('similarity', similarity);
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThan(0);

    // Test findSimilar
    const query = 'Hello world';
    const candidates = [
      'Completely different text',
      'Hello from another dimension',
      'Random words here',
    ];
    
    logger.logInput('findSimilarQuery', query);
    logger.logInput('findSimilarCandidates', candidates);
    
    logger.logStep('Finding most similar text');
    logger.logApiCall('provider.findSimilar()', { query, candidatesCount: candidates.length });
    
    const result = await measureAsync(logger, 'findSimilar', () => 
      provider.findSimilar(query, candidates)
    );

    logger.logOutput('findSimilarResult', result);
    
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('similarity');
    expect(result).toHaveProperty('index');
    expect(typeof result.similarity).toBe('number');
    
    console.log(`✅ Flow completed:`);
    console.log(`   - Embed: ${vec1.length} dimensions`);
    console.log(`   - Similarity: ${similarity.toFixed(4)}`);
    console.log(`   - FindSimilar: "${result.text}" (similarity: ${result.similarity.toFixed(4)}, index: ${result.index})`);
  }, 120000);
});
