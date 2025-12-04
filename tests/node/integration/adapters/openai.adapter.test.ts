/**
 * @tags adapter, openai
 * @description OpenAI Adapter integration tests - tests OpenAI-compatible interface
 */
import { OpenAIAdapter } from '../../../../src/adapters/OpenAIAdapter';
import { createAIProvider, init } from '../../../../src/index';
import { createTestLogger, measureAsync } from '../helpers/test-logger';

describe('OpenAI Adapter (Node + ORT)', () => {
  const logger = createTestLogger('OpenAI Adapter');
  let adapter: OpenAIAdapter;
  let provider: any;

  beforeAll(async () => {
    logger.logTestStart('OpenAI Adapter integration tests');
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
    
    logger.logStep('Creating OpenAI adapter');
    adapter = new OpenAIAdapter(provider);
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
    expect(adapter).toBeInstanceOf(OpenAIAdapter);
    
    console.log(`✅ OpenAI adapter created`);
  });

  it('handles chat completions', async () => {
    const request = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      max_tokens: 20,
    };
    
    logger.logInput('request', request);
    logger.logApiCall('adapter.createChatCompletion()', { model: request.model, messagesCount: request.messages.length });
    
    const response = await measureAsync(logger, 'createChatCompletion', () => 
      adapter.createChatCompletion(request)
    );

    logger.logOutput('response', response);
    
    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(Array.isArray(response.choices)).toBe(true);
    expect(response.choices.length).toBeGreaterThan(0);
    
    const choice = response.choices[0];
    expect(choice.message).toBeDefined();
    expect(choice.message.content).toBeDefined();
    expect(typeof choice.message.content).toBe('string');
    
    console.log(`✅ OpenAI Chat: "${choice.message.content}"`);
  });

  it('handles text completions', async () => {
    const request = {
      model: 'text-davinci-003',
      prompt: 'The future of AI is',
      max_tokens: 15,
    };
    
    logger.logInput('request', request);
    logger.logApiCall('adapter.createCompletion()', { model: request.model, prompt: request.prompt });
    
    const response = await measureAsync(logger, 'createCompletion', () => 
      adapter.createCompletion(request)
    );

    logger.logOutput('response', response);
    
    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(Array.isArray(response.choices)).toBe(true);
    expect(response.choices.length).toBeGreaterThan(0);
    
    const choice = response.choices[0];
    expect(choice.text).toBeDefined();
    expect(typeof choice.text).toBe('string');
    
    console.log(`✅ OpenAI Completion: "${choice.text}"`);
  });

  it('handles embeddings', async () => {
    const request = {
      model: 'text-embedding-ada-002',
      input: 'Hello world',
    };
    
    logger.logInput('request', request);
    logger.logApiCall('adapter.createEmbeddings()', { model: request.model, input: request.input });
    
    const response = await measureAsync(logger, 'createEmbeddings', () => 
      adapter.createEmbeddings(request)
    );

    logger.logOutput('dataCount', response.data.length);
    logger.logOutput('embeddingDimensions', response.data[0]?.embedding?.length);
    
    expect(response).toBeDefined();
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
    
    const embedding = response.data[0];
    expect(embedding.embedding).toBeDefined();
    expect(Array.isArray(embedding.embedding)).toBe(true);
    expect(embedding.embedding.length).toBeGreaterThan(0);
    
    console.log(`✅ OpenAI Embedding: ${embedding.embedding.length} dimensions`);
  });

  it('handles batch embeddings', async () => {
    const request = {
      model: 'text-embedding-ada-002',
      input: ['Hello world', 'Goodbye world'],
    };
    
    logger.logInput('request', request);
    logger.logApiCall('adapter.createEmbeddings()', { model: request.model, inputCount: request.input.length });
    
    const response = await measureAsync(logger, 'createEmbeddings-batch', () => 
      adapter.createEmbeddings(request)
    );

    logger.logOutput('dataCount', response.data.length);
    
    expect(response).toBeDefined();
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(2);
    
    response.data.forEach((embedding, index) => {
      expect(embedding.embedding).toBeDefined();
      expect(Array.isArray(embedding.embedding)).toBe(true);
      expect(embedding.embedding.length).toBeGreaterThan(0);
      
      console.log(`✅ Embedding ${index + 1}: ${embedding.embedding.length} dimensions`);
    });
  });

  it('handles different model parameters', async () => {
    const request = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 2+2?' }
      ],
      max_tokens: 10,
      temperature: 0.7,
      top_p: 0.9,
    };
    
    logger.logInput('request', request);
    logger.logApiCall('adapter.createChatCompletion()', { 
      model: request.model, 
      temperature: request.temperature,
      top_p: request.top_p 
    });
    
    const response = await measureAsync(logger, 'createChatCompletion-params', () => 
      adapter.createChatCompletion(request)
    );

    logger.logOutput('response', response);
    
    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    
    const choice = response.choices[0];
    expect(choice.message.content).toBeDefined();
    expect(typeof choice.message.content).toBe('string');
    
    console.log(`✅ OpenAI with params: "${choice.message.content}"`);
  });

  it('handles streaming responses', async () => {
    const request = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Count to 3' }
      ],
      max_tokens: 20,
      stream: true,
    };
    
    logger.logInput('request', request);
    logger.logApiCall('adapter.createChatCompletion()', { model: request.model, stream: true });
    
    const response = await measureAsync(logger, 'createChatCompletion-stream', () => 
      adapter.createChatCompletion(request)
    );

    logger.logOutput('response', response);
    
    expect(response).toBeDefined();
    // Streaming response should be different format
    expect(response).toHaveProperty('choices');
    
    console.log(`✅ OpenAI Streaming: ${JSON.stringify(response).substring(0, 100)}...`);
  });
});
