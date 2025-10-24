import { createAIProvider, init } from '../../../src/index';

describe('LLM Model (Node + ORT)', () => {
  const provider = createAIProvider({
    llm: {
      model: 'Xenova/gpt2',
      dtype: 'fp32',
      device: 'cpu',
      maxTokens: 50,
    },
  });

  beforeAll(async () => {
    await init();
    await provider.warmup('llm');
  });

  afterAll(async () => {
    await provider.dispose();
  });

  it('generuje tekst z promptu', async () => {
    const response = await provider.chat('Hello, how are you?');
    
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(typeof response.content).toBe('string');
    expect(response.content.length).toBeGreaterThan(0);
    
    console.log(`✅ LLM generated: "${response.content}"`);
  });

  it('generuje różne odpowiedzi dla różnych promptów', async () => {
    const prompt1 = 'The weather is';
    const prompt2 = 'I love programming because';
    
    const response1 = await provider.chat(prompt1);
    const response2 = await provider.chat(prompt2);
    
    expect(response1.content).toBeDefined();
    expect(response2.content).toBeDefined();
    expect(response1.content).not.toBe(response2.content);
    
    console.log(`✅ Prompt 1: "${response1.content}"`);
    console.log(`✅ Prompt 2: "${response2.content}"`);
  });

  it('respektuje maxTokens limit', async () => {
    const longPrompt = 'Write a very long story about a dragon';
    const response = await provider.chat(longPrompt);
    
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeLessThanOrEqual(200); // Should be limited by maxTokens
    
    console.log(`✅ Limited response: "${response.content}"`);
  });

  it('obsługuje różne style generowania', async () => {
    const creativePrompt = 'Once upon a time, in a magical forest';
    const technicalPrompt = 'The algorithm works by';
    
    const creativeResponse = await provider.chat(creativePrompt);
    const technicalResponse = await provider.chat(technicalPrompt);
    
    expect(creativeResponse.content).toBeDefined();
    expect(technicalResponse.content).toBeDefined();
    
    // Both should be different styles
    expect(creativeResponse.content).not.toBe(technicalResponse.content);
    
    console.log(`✅ Creative: "${creativeResponse.content}"`);
    console.log(`✅ Technical: "${technicalResponse.content}"`);
  });
});
