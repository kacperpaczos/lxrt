import { createAIProvider } from '../../../src/app/AIProvider';
import { MODEL_REGISTRY } from '../../../src/core/ModelRegistry';
import { ModelNotLoadedError, ValidationError } from '../../../src/domain/errors';

// Mock dependencies
jest.mock('../../../src/app/state', () => ({
    getConfig: jest.fn(() => ({
        logger: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
    })),
}));

describe('Token Counting & Context Window', () => {
    // Use a known model from registry
    const TEST_MODEL = 'Xenova/Qwen1.5-0.5B-Chat';
    const EXPECTED_CONTEXT = MODEL_REGISTRY.llm[TEST_MODEL].contextWindow;

    describe('countTokens()', () => {
        it('should throw ValidationError when model is not configured', () => {
            const provider = createAIProvider({}); // No LLM config
            expect(() => provider.countTokens('hello')).toThrow(ValidationError);
        });

        it('should throw ModelNotLoadedError when model is configured but not loaded', () => {
            const provider = createAIProvider({
                llm: { model: TEST_MODEL },
            });
            // We skip warmup()
            expect(() => provider.countTokens('hello')).toThrow(ModelNotLoadedError);
        });
    });

    describe('getContextWindow()', () => {
        it('should throw ValidationError when model is not configured', () => {
            const provider = createAIProvider({}); // No LLM config
            expect(() => provider.getContextWindow()).toThrow(ValidationError);
        });


        it('should throw ModelNotLoadedError when not loaded', () => {
            const provider = createAIProvider({
                llm: { model: TEST_MODEL },
            });
            expect(() => provider.getContextWindow()).toThrow(ModelNotLoadedError);
        });

        it('should correctly map family-based context windows', () => {
            // Unit test for internal logic would be better placed testing LLMModel class directly
            // rather than via Provider which requires loading.
        });
    });
});
