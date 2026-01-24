
/**
 * @tags unit, adapter, stagehand
 * @description Unit tests for Stagehand Adapter (OpenAI Client Interface)
 */
import { StagehandAdapter } from '../../../../src/adapters/StagehandAdapter';
import { AIProvider } from '../../../../src/app/AIProvider';

// Mock AIProvider
const mockChat = jest.fn();
const mockEmbed = jest.fn();

describe('Stagehand Adapter (Unit)', () => {
    let adapter: StagehandAdapter;
    let mockProvider: jest.Mocked<AIProvider>;

    beforeEach(() => {
        mockChat.mockReset();
        mockEmbed.mockReset();

        mockProvider = {
            chat: mockChat,
            embed: mockEmbed,
            config: { llm: { model: 'mock-model' } },
        } as unknown as jest.Mocked<AIProvider>;

        adapter = new StagehandAdapter(mockProvider);
    });

    it('should expose chat.completions.create structure', () => {
        expect(adapter.chat).toBeDefined();
        expect(adapter.chat.completions).toBeDefined();
        expect(typeof adapter.chat.completions.create).toBe('function');
    });

    it('should delegate chat completion to provider', async () => {
        const request = {
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Stagehand test' }]
        };

        mockChat.mockResolvedValue({
            content: 'Response',
            usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }
        });

        const response = await adapter.chat.completions.create(request as any);

        expect(mockChat).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ content: 'Stagehand test' })]),
            expect.anything()
        );

        expect(response.choices[0].message.content).toBe('Response');
    });
});
