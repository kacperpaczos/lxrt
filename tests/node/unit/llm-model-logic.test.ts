
import { LLMModel } from '../../../src/models/LLMModel';

// Mock getTransformers to avoid loading heavy dependencies
jest.mock('../../../src/models/BaseModel', () => {
    return {
        BaseModel: class MockBaseModel {
            config: any;
            constructor(modality: any, config: any) {
                this.config = config;
            }
        }
    }
});

describe('LLMModel (Direct Logic)', () => {
    describe('getContextWindow()', () => {
        // Helper to check context window for a given model ID
        const checkModel = (modelId: string, expected: number) => {
            // We cast to any to access the method since we are testing logic on a semi-mocked class
            const model = new LLMModel({ model: modelId });
            // By default getContextWindow uses registry or heuristics
            // We need to make sure MODEL_REGISTRY is available (it is imported in LLMModel)
            expect(model.getContextWindow()).toBe(expected);
        };

        it('should return correct value for Qwen', () => {
            checkModel('Xenova/Qwen1.5-0.5B-Chat', 32768);
        });

        it('should return correct value for Phi-3', () => {
            checkModel('Xenova/Phi-3-mini-4k-instruct', 4096);
            // Logic: registry has 4096
        });

        it('should use heuristics for unknown models', () => {
            checkModel('unknown/llama-3-8b', 8192); // Heuristic for 'llama-3'
            checkModel('unknown/gemma-2b', 8192); // Heuristic for 'gemma'
            checkModel('unknown/random-model', 2048); // Default fallback
        });
    });
});
