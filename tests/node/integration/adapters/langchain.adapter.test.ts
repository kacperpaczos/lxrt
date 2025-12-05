/**
 * @tags adapter, langchain
 * @description LangChain Adapter integration tests - tests LangChain-compatible interface
 */
import { LangChainAdapter } from '../../../../src/adapters/LangChainAdapter';
import { createAIProvider, init } from '../../../../src/index';
import { createTestLogger, measureAsync } from '../helpers/test-logger';

describe('LangChain Adapter (Node + ORT)', () => {
  const logger = createTestLogger('LangChain Adapter');
  let adapter: LangChainAdapter;
  let provider: any;

  beforeAll(async () => {
    logger.logTestStart('LangChain Adapter integration tests');
    logger.logStep('Initializing transformers');
    await measureAsync(logger, 'init', () => init());
    
    logger.logStep('Creating provider with LLM and Embedding');
    provider = createAIProvider({
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 30 },
      embedding: { model: 'Xenova/all-MiniLM-L6-v2', dtype: 'fp32', device: 'cpu' },
    });
    
    logger.logModelLoad('llm', 'Xenova/gpt2', { dtype: 'fp32', device: 'cpu', maxTokens: 30 });
    logger.logModelLoad('embedding', 'Xenova/all-MiniLM-L6-v2', { dtype: 'fp32', device: 'cpu' });
    
    await measureAsync(logger, 'warmup-llm', () => provider.warmup('llm'));
    await measureAsync(logger, 'warmup-embedding', () => provider.warmup('embedding'));
    
    logger.logStep('Creating LangChain adapter');
    adapter = new LangChainAdapter(provider);
    logger.logOutput('adapter', adapter.constructor.name);
  });

  afterAll(async () => {
    logger.logStep('Disposing provider');
    await provider.dispose();
    logger.logTestEnd(true);
  });

  it('tworzy adapter z providerem', () => {
    logger.logApiCall('adapter check');
    logger.logOutput('adapter', adapter);
    logger.logOutput('adapterType', adapter.constructor.name);
    
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(LangChainAdapter);
    
    console.log(`✅ LangChain adapter created`);
  });

  it('handles LLM chain', async () => {
    const prompt = 'What is the capital of France?';
    logger.logInput('prompt', prompt);
    
    logger.logApiCall('adapter.invoke()', { prompt });
    
    const result = await measureAsync(logger, 'invoke', () => adapter.invoke(prompt));
    
    logger.logOutput('result', result);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    
    console.log(`✅ LangChain LLM: "${result}"`);
  });

  it('handles embedding chain', async () => {
    const text = 'Hello world';
    logger.logInput('text', text);
    
    logger.logApiCall('adapter.embedQuery()', { text });
    
    const result = await measureAsync(logger, 'embedQuery', () => adapter.embedQuery(text));
    
    logger.logOutput('resultLength', result.length);
    logger.logOutput('resultSample', `[${result.slice(0, 3).join(', ')}, ...]`);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('number');
    
    console.log(`✅ LangChain Embedding: ${result.length} dimensions`);
  });

  it('handles batch embeddings', async () => {
    const texts = ['Hello world', 'Goodbye world', 'How are you?'];
    logger.logInput('texts', texts);
    
    logger.logApiCall('adapter.embedDocuments()', { textsCount: texts.length });
    
    const result = await measureAsync(logger, 'embedDocuments', () => adapter.embedDocuments(texts));
    
    logger.logOutput('resultCount', result.length);
    logger.logOutput('dimensionsPerVector', result[0]?.length);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    
    result.forEach((embedding, index) => {
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
      expect(typeof embedding[0]).toBe('number');
      
      console.log(`✅ LangChain Embedding ${index + 1}: ${embedding.length} dimensions`);
    });
  });

  it('handles streaming', async () => {
    const prompt = 'Tell me a short story';
    logger.logInput('prompt', prompt);
    
    logger.logApiCall('adapter.stream()', { prompt });
    
    const result = await measureAsync(logger, 'stream', () => adapter.stream(prompt));
    
    logger.logOutput('resultType', typeof result[Symbol.asyncIterator]);
    
    expect(result).toBeDefined();
    // Should return an async iterator
    expect(typeof result[Symbol.asyncIterator]).toBe('function');
    
    const chunks: string[] = [];
    logger.logStep('Collecting stream chunks');
    
    for await (const chunk of result) {
      expect(typeof chunk).toBe('string');
      chunks.push(chunk);
    }
    
    logger.logOutput('chunksCount', chunks.length);
    
    expect(chunks.length).toBeGreaterThan(0);
    const fullText = chunks.join('');
    expect(fullText.length).toBeGreaterThan(0);
    
    console.log(`✅ LangChain Streaming: "${fullText}"`);
  });

  it('handles różne parametry', async () => {
    const prompt = 'Count to 3';
    const options = { temperature: 0.7, maxTokens: 20 };
    
    logger.logInput('prompt', prompt);
    logger.logInput('options', options);
    
    logger.logApiCall('adapter.invoke()', { prompt, options });
    
    const result = await measureAsync(logger, 'invoke-params', () => 
      adapter.invoke(prompt, options)
    );
    
    logger.logOutput('result', result);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    
    console.log(`✅ LangChain with params: "${result}"`);
  });

  it('handles conversation memory', async () => {
    logger.logStep('Testing conversation memory');
    
    const input1 = 'My name is John';
    const input2 = 'What is my name?';
    
    logger.logInput('input1', input1);
    logger.logApiCall('adapter.invoke()', { prompt: input1, context: 'memory test 1' });
    
    const response1 = await measureAsync(logger, 'invoke-memory1', () => adapter.invoke(input1));
    logger.logOutput('response1', response1);
    
    logger.logInput('input2', input2);
    logger.logApiCall('adapter.invoke()', { prompt: input2, context: 'memory test 2' });
    
    const response2 = await measureAsync(logger, 'invoke-memory2', () => adapter.invoke(input2));
    logger.logOutput('response2', response2);
    
    expect(response1).toBeDefined();
    expect(response2).toBeDefined();
    expect(typeof response1).toBe('string');
    expect(typeof response2).toBe('string');
    
    console.log(`✅ LangChain Memory 1: "${response1}"`);
    console.log(`✅ LangChain Memory 2: "${response2}"`);
  });

  it('handles różne typy inputów', async () => {
    const stringInput = 'Hello world';
    const objectInput = { text: 'Hello world', type: 'greeting' };
    
    logger.logInput('stringInput', stringInput);
    logger.logInput('objectInput', objectInput);
    
    logger.logApiCall('adapter.invoke()', { input: 'string type' });
    const stringResult = await measureAsync(logger, 'invoke-string', () => 
      adapter.invoke(stringInput)
    );
    logger.logOutput('stringResult', stringResult);
    
    logger.logApiCall('adapter.invoke()', { input: 'object type' });
    const objectResult = await measureAsync(logger, 'invoke-object', () => 
      adapter.invoke(objectInput)
    );
    logger.logOutput('objectResult', objectResult);
    
    expect(stringResult).toBeDefined();
    expect(objectResult).toBeDefined();
    expect(typeof stringResult).toBe('string');
    expect(typeof objectResult).toBe('string');
    
    console.log(`✅ LangChain String: "${stringResult}"`);
    console.log(`✅ LangChain Object: "${objectResult}"`);
  });
});
