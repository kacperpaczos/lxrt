import { VercelAdapter, VercelMessage } from '../../../../src/adapters/VercelAdapter';
import { AIProvider } from '../../../../src/app/AIProvider';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Polyfill for TextEncoder/TextDecoder/ReadableStream in Jest environment
Object.assign(global, { TextEncoder, TextDecoder, ReadableStream });

// Mock AIProvider
jest.mock('../../../../src/app/AIProvider');

describe('VercelAdapter', () => {
    let provider: jest.Mocked<AIProvider>;
    let adapter: VercelAdapter;

    beforeEach(() => {
        provider = new AIProvider({} as any) as jest.Mocked<AIProvider>;
        adapter = new VercelAdapter(provider);
    });

    describe('createStreamResponse', () => {
        it('should return ReadableStream', async () => {
            async function* mockStream() {
                yield 'Chunk1';
                yield 'Chunk2';
            }
            provider.stream.mockImplementation(() => mockStream());

            const messages: VercelMessage[] = [{ role: 'user', content: 'Hi' }];
            const stream = await adapter.createStreamResponse(messages, {
                temperature: 0.5,
            });

            expect(stream).toBeInstanceOf(ReadableStream);
            expect(provider.stream).toHaveBeenCalledWith(
                [{ role: 'user', content: 'Hi' }],
                expect.objectContaining({ temperature: 0.5 })
            );
        });

        it('should stream data correctly', async () => {
            async function* mockStream() {
                yield 'A';
                yield 'B';
            }
            provider.stream.mockImplementation(() => mockStream());

            const stream = await adapter.createStreamResponse([]);
            const reader = stream.getReader();
            const decoder = new TextDecoder();

            let result = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += decoder.decode(value);
            }

            expect(result).toBe('AB');
        });
    });

    describe('generateText', () => {
        it('should generate text completion', async () => {
            provider.complete.mockResolvedValue('Completion text');

            const result = await adapter.generateText('Prompt');

            expect(result).toEqual({ text: 'Completion text' });
            expect(provider.complete).toHaveBeenCalledWith('Prompt', undefined);
        });
    });
});
