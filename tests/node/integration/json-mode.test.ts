/**
 * @tags json, function-calling, integration
 * @description Integration test: Verify JSON Mode and Tools plumbing
 */
import { createAIProvider, init } from '../../../src/index';

jest.setTimeout(180000);

describe('JSON Mode & Function Calling', () => {
    beforeAll(async () => {
        await init();
    });

    it('should handle JSON Mode request without crashing', async () => {
        const provider = createAIProvider({
            llm: {
                model: 'Xenova/gpt2',
                dtype: 'fp32',
                device: 'cpu',
                maxTokens: 50,
            },
        });

        const response = await provider.chat('List 3 fruits in JSON.', {
            responseFormat: { type: 'json_object' }
        });

        // gpt2 is too dumb to actually produce JSON usually, but we check plumbing
        expect(response).toBeDefined();
        expect(response.content).toBeDefined();

        await provider.dispose();
    });

    it('should handle Tools request without crashing', async () => {
        const provider = createAIProvider({
            llm: {
                model: 'Xenova/gpt2',
                dtype: 'fp32',
                device: 'cpu',
                maxTokens: 50,
            },
        });

        const tools = [{
            type: 'function' as const,
            function: {
                name: 'get_weather',
                description: 'Get weather',
                parameters: { type: 'object', properties: { location: { type: 'string' } } }
            }
        }];

        const response = await provider.chat('What is the weather in Warsaw?', {
            tools: tools
        });

        expect(response).toBeDefined();
        // Check if toolCalls field is present (even if undefined/empty) on type, though runtime it might differ
        // We just ensure no crash

        await provider.dispose();
    });
});
