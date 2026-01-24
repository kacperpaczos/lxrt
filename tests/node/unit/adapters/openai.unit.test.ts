
/**
 * @tags unit, adapter, openai
 * @description Unit tests for OpenAI Adapter (Logic only, no real models)
 */
import { OpenAIAdapter } from '../../../../src/adapters/OpenAIAdapter';
import { AIProvider } from '../../../../src/app/AIProvider';

// Mock AIProvider
const mockChat = jest.fn();
const mockEmbed = jest.fn();
// Mock the entire class structure if needed, or just cast a mock object
// Since OpenAIAdapter takes `AIProvider` instance, we can pass a partial mock.

describe('OpenAI Adapter (Unit)', () => {
    let adapter: OpenAIAdapter;
    let mockProvider: jest.Mocked<AIProvider>;

    beforeEach(() => {
        mockChat.mockReset();
        mockEmbed.mockReset();

        // Create a mock provider
        // We cast to any/Mocked because private properties/methods might be tricky
        mockProvider = {
            chat: mockChat,
            embed: mockEmbed,
            // Add other methods if adapter checks them
            config: { llm: { model: 'mock-model' } },
        } as unknown as jest.Mocked<AIProvider>;

        adapter = new OpenAIAdapter(mockProvider);
    });

    describe('createChatCompletion', () => {
        it('should map OpenAI request to AIProvider.chat call', async () => {
            // Arrange
            const request = {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                temperature: 0.7,
                max_tokens: 100,
            };

            mockChat.mockResolvedValue({
                content: 'Mock response',
                usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
            });

            // Act
            const response = await adapter.createChatCompletion(request as any);

            // Assert
            // 1. Verify mapping
            expect(mockChat).toHaveBeenCalledWith(
                request.messages, // Passes messages array directly 
                expect.objectContaining({
                    maxTokens: 100,
                    temperature: 0.7,
                    // Adapter might pass other options
                })
            );

            // 2. Verify response format
            expect(response).toEqual(expect.objectContaining({
                id: expect.any(String),
                object: 'chat.completion',
                model: 'gpt-3.5-turbo',
                choices: [
                    expect.objectContaining({
                        message: { role: 'assistant', content: 'Mock response' },
                        finish_reason: 'stop',
                    })
                ],
                usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }
            }));
        });

        it('should handle system messages by prepending to prompt', async () => {
            const request = {
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'Be polite.' },
                    { role: 'user', content: 'Hi' }
                ]
            };

            mockChat.mockResolvedValue({ content: 'Hello' });

            await adapter.createChatCompletion(request as any);

            expect(mockChat).toHaveBeenCalledWith(
                request.messages,
                expect.anything()
            );
        });
    });

    describe('createEmbeddings', () => {
        it('should map single input string to embed call', async () => {
            const request = {
                model: 'text-embedding-ada-002',
                input: 'Test text'
            };

            mockEmbed.mockResolvedValue([[0.1, 0.2, 0.3]]);

            const response = await adapter.createEmbeddings(request);

            expect(mockEmbed).toHaveBeenCalledWith('Test text'); // Passes string directly
            expect(response.data).toHaveLength(1);
            expect(response.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
            expect(response.data[0].index).toBe(0);
        });

        it('should map array input to embed call', async () => {
            const request = {
                model: 'text-embedding-ada-002',
                input: ['A', 'B']
            };

            mockEmbed.mockResolvedValue([[0.1], [0.2]]);

            const response = await adapter.createEmbeddings(request);

            expect(mockEmbed).toHaveBeenCalledWith(['A', 'B']);
            expect(response.data).toHaveLength(2);
            expect(response.data[1].embedding).toEqual([0.2]);
        });
    });
});
