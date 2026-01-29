import {
    LangChainAdapter,
    createLangChainLLM,
    createLangChainEmbeddings,
} from '../../../../src/adapters/LangChainAdapter';
import { AIProvider } from '../../../../src/app/AIProvider';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder in Jest environment
Object.assign(global, { TextEncoder, TextDecoder });
jest.mock('../../../../src/app/AIProvider');

describe('LangChainAdapter', () => {
    let provider: jest.Mocked<AIProvider>;
    let adapter: LangChainAdapter;

    beforeEach(() => {
        provider = new AIProvider({} as any) as jest.Mocked<AIProvider>;
        provider.getConfig.mockReturnValue({ llm: { model: 'test-model' } } as any);
        adapter = new LangChainAdapter(provider);
    });

    describe('LLM', () => {
        it('should complete prompt', async () => {
            provider.complete.mockResolvedValue('Hello world');

            const result = await adapter.invoke('Hi');

            expect(provider.complete).toHaveBeenCalledWith('Hi', expect.anything());
            expect(result).toBe('Hello world');
        });

        it('should call with correct params', async () => {
            provider.complete.mockResolvedValue('Response');

            await adapter.invoke('Prompt', { temperature: 0.7, maxTokens: 100 });

            expect(provider.complete).toHaveBeenCalledWith(
                'Prompt',
                expect.objectContaining({
                    temperature: 0.7,
                    maxTokens: 100,
                })
            );
        });

        it('should stream response', async () => {
            // Create explicit async generator
            const mockGenerator = async function* () {
                yield 'Hello';
                yield ' ';
                yield 'World';
            };

            provider.stream.mockReturnValue(mockGenerator());

            const chunks: string[] = [];
            // Use messages array to trigger streaming path in adapter
            const messages = [{ role: 'user', content: 'Hi' }];
            for await (const chunk of adapter.stream(messages)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual(['Hello', ' ', 'World']);
        });
    });

    describe('Embeddings', () => {
        it('should embed query', async () => {
            provider.embed.mockResolvedValue([[0.1, 0.2, 0.3]]);

            const result = await adapter.embedQuery('Hello');

            expect(provider.embed).toHaveBeenCalledWith('Hello');
            expect(result).toEqual([0.1, 0.2, 0.3]);
        });

        it('should embed documents', async () => {
            provider.embed.mockResolvedValue([
                [0.1, 0.2],
                [0.3, 0.4],
            ]);

            const result = await adapter.embedDocuments(['Doc1', 'Doc2']);

            expect(provider.embed).toHaveBeenCalledWith(['Doc1', 'Doc2']);
            expect(result).toHaveLength(2);
        });
    });

    describe('Factories', () => {
        it('should create LLM', () => {
            const llm = createLangChainLLM(provider);
            expect(llm).toBeDefined();
            expect(llm.llmType).toBe('lxrt');
        });

        it('should create Embeddings', () => {
            const embeddings = createLangChainEmbeddings(provider);
            expect(embeddings).toBeDefined();
        });
    });
});
