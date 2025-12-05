/**
 * @tags llm, model, core, text
 * @description LLM Model integration tests - tests text generation with GPT-2
 */
import { createAIProvider, init } from '../../../../src/index';
import { createTestLogger, measureAsync, TEST_TAGS } from '../helpers/test-logger';

describe('LLM Model (Node + ORT)', () => {
  const logger = createTestLogger('LLM Model');
  
  const provider = createAIProvider({
    llm: {
      model: 'Xenova/gpt2',
      dtype: 'fp32',
      device: 'cpu',
      maxTokens: 50,
    },
  });

  beforeAll(async () => {
    logger.logTestStart('LLM Model integration tests');
    logger.logStep('Initializing transformers');
    await measureAsync(logger, 'init', () => init());
    
    logger.logModelLoad('llm', 'Xenova/gpt2', { dtype: 'fp32', device: 'cpu', maxTokens: 50 });
    await measureAsync(logger, 'warmup-llm', () => provider.warmup('llm'));
  });

  afterAll(async () => {
    logger.logStep('Disposing provider');
    await provider.dispose();
    logger.logTestEnd(true);
  });

  it('generates text from prompt', async () => {
    const prompt = 'Hello, how are you?';
    logger.logInput('prompt', prompt);
    logger.logApiCall('provider.chat()', { prompt });
    
    const response = await measureAsync(logger, 'chat', () => provider.chat(prompt));
    
    logger.logOutput('response', response);
    
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(typeof response.content).toBe('string');
    expect(response.content.length).toBeGreaterThan(0);
    
    console.log(`✅ LLM generated: "${response.content}"`);
  });

  it('generates różne odpowiedzi dla różnych promptów', async () => {
    const prompt1 = 'The weather is';
    const prompt2 = 'I love programming because';
    
    logger.logInput('prompt1', prompt1);
    logger.logInput('prompt2', prompt2);
    
    logger.logApiCall('provider.chat()', { prompt: prompt1 });
    const response1 = await measureAsync(logger, 'chat-prompt1', () => provider.chat(prompt1));
    
    logger.logApiCall('provider.chat()', { prompt: prompt2 });
    const response2 = await measureAsync(logger, 'chat-prompt2', () => provider.chat(prompt2));
    
    logger.logOutput('response1', response1);
    logger.logOutput('response2', response2);
    
    expect(response1.content).toBeDefined();
    expect(response2.content).toBeDefined();
    expect(response1.content).not.toBe(response2.content);
    
    console.log(`✅ Prompt 1: "${response1.content}"`);
    console.log(`✅ Prompt 2: "${response2.content}"`);
  });

  it('respects maxTokens limit', async () => {
    const longPrompt = 'Write a very long story about a dragon';
    logger.logInput('longPrompt', longPrompt);
    logger.logApiCall('provider.chat()', { prompt: longPrompt, expectedBehavior: 'maxTokens: 50 limit' });
    
    const response = await measureAsync(logger, 'chat-long', () => provider.chat(longPrompt));
    
    logger.logOutput('response', response);
    logger.logOutput('response.length', response.content.length);
    
    expect(response.content).toBeDefined();
    // GPT-2 with maxTokens: 50 should generate roughly 50 tokens, which is ~200 characters
    expect(response.content.length).toBeLessThanOrEqual(300); // Allow some margin for tokenization differences
    
    console.log(`✅ Limited response: "${response.content}"`);
  });

  it('handles różne style generowania', async () => {
    const creativePrompt = 'Once upon a time, in a magical forest';
    const technicalPrompt = 'The algorithm works by';
    
    logger.logInput('creativePrompt', creativePrompt);
    logger.logInput('technicalPrompt', technicalPrompt);
    
    logger.logApiCall('provider.chat()', { prompt: creativePrompt, style: 'creative' });
    const creativeResponse = await measureAsync(logger, 'chat-creative', () => provider.chat(creativePrompt));
    
    logger.logApiCall('provider.chat()', { prompt: technicalPrompt, style: 'technical' });
    const technicalResponse = await measureAsync(logger, 'chat-technical', () => provider.chat(technicalPrompt));
    
    logger.logOutput('creativeResponse', creativeResponse);
    logger.logOutput('technicalResponse', technicalResponse);
    
    expect(creativeResponse.content).toBeDefined();
    expect(technicalResponse.content).toBeDefined();
    
    // Both should be different styles
    expect(creativeResponse.content).not.toBe(technicalResponse.content);
    
    console.log(`✅ Creative: "${creativeResponse.content}"`);
    console.log(`✅ Technical: "${technicalResponse.content}"`);
  });
});
