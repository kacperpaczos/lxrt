import { LangChainAdapter } from '../../../src/adapters/LangChainAdapter';
import { createAIProvider, init } from '../../../src/index';

describe('LangChain Adapter (Node + ORT)', () => {
  let adapter: LangChainAdapter;
  let provider: any;

  beforeAll(async () => {
    await init();
    
    provider = createAIProvider({
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 30 },
      embedding: { model: 'Xenova/all-MiniLM-L6-v2', dtype: 'fp32', device: 'cpu' },
    });
    
    await provider.warmup('llm');
    await provider.warmup('embedding');
    
    adapter = new LangChainAdapter(provider);
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('tworzy adapter z providerem', () => {
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(LangChainAdapter);
  });

  it('handles LLM chain', async () => {
    const result = await adapter.invoke('What is the capital of France?');
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    
    console.log(`✅ LangChain LLM: "${result}"`);
  });

  it('handles embedding chain', async () => {
    const result = await adapter.embedQuery('Hello world');
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('number');
    
    console.log(`✅ LangChain Embedding: ${result.length} dimensions`);
  });

  it('handles batch embeddings', async () => {
    const texts = ['Hello world', 'Goodbye world', 'How are you?'];
    const result = await adapter.embedDocuments(texts);
    
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
    const result = await adapter.stream('Tell me a short story');
    
    expect(result).toBeDefined();
    // Should return an async iterator
    expect(typeof result[Symbol.asyncIterator]).toBe('function');
    
    const chunks: string[] = [];
    for await (const chunk of result) {
      expect(typeof chunk).toBe('string');
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBeGreaterThan(0);
    const fullText = chunks.join('');
    expect(fullText.length).toBeGreaterThan(0);
    
    console.log(`✅ LangChain Streaming: "${fullText}"`);
  });

  it('handles różne parametry', async () => {
    const result = await adapter.invoke('Count to 3', {
      temperature: 0.7,
      maxTokens: 20,
    });
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    
    console.log(`✅ LangChain with params: "${result}"`);
  });

  it('handles conversation memory', async () => {
    // Test conversation with memory
    const response1 = await adapter.invoke('My name is John');
    const response2 = await adapter.invoke('What is my name?');
    
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
    
    const stringResult = await adapter.invoke(stringInput);
    const objectResult = await adapter.invoke(objectInput);
    
    expect(stringResult).toBeDefined();
    expect(objectResult).toBeDefined();
    expect(typeof stringResult).toBe('string');
    expect(typeof objectResult).toBe('string');
    
    console.log(`✅ LangChain String: "${stringResult}"`);
    console.log(`✅ LangChain Object: "${objectResult}"`);
  });
});
