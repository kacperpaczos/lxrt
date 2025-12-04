import { OpenAIAdapter } from '../../../../src/adapters/OpenAIAdapter';
import { createAIProvider, init } from '../../../../src/index';

describe('OpenAI Adapter (Node + ORT)', () => {
  let adapter: OpenAIAdapter;
  let provider: any;

  beforeAll(async () => {
    await init();
    
    provider = createAIProvider({
      llm: { model: 'Xenova/gpt2', dtype: 'fp32', device: 'cpu', maxTokens: 30 },
      embedding: { model: 'Xenova/all-MiniLM-L6-v2', dtype: 'fp32', device: 'cpu' },
    });
    
    await provider.warmup('llm');
    await provider.warmup('embedding');
    
    adapter = new OpenAIAdapter(provider);
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('tworzy adapter z providerem', () => {
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(OpenAIAdapter);
  });

  it('handles chat completions', async () => {
    const response = await adapter.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      max_tokens: 20,
    });

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
    const response = await adapter.createCompletion({
      model: 'text-davinci-003',
      prompt: 'The future of AI is',
      max_tokens: 15,
    });

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
    const response = await adapter.createEmbeddings({
      model: 'text-embedding-ada-002',
      input: 'Hello world',
    });

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
    const response = await adapter.createEmbeddings({
      model: 'text-embedding-ada-002',
      input: ['Hello world', 'Goodbye world'],
    });

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
    const response = await adapter.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 2+2?' }
      ],
      max_tokens: 10,
      temperature: 0.7,
      top_p: 0.9,
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    
    const choice = response.choices[0];
    expect(choice.message.content).toBeDefined();
    expect(typeof choice.message.content).toBe('string');
    
    console.log(`✅ OpenAI with params: "${choice.message.content}"`);
  });

  it('handles streaming responses', async () => {
    const response = await adapter.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Count to 3' }
      ],
      max_tokens: 20,
      stream: true,
    });

    expect(response).toBeDefined();
    // Streaming response should be different format
    expect(response).toHaveProperty('choices');
    
    console.log(`✅ OpenAI Streaming: ${JSON.stringify(response).substring(0, 100)}...`);
  });
});

