
import {
    getModelInfo,
    isKnownModel,
    MODEL_REGISTRY,
    SupportedLLM,
} from '../../../src/core/ModelRegistry';
import { LLMModel } from '../../../src/models/LLMModel';
import type { LLMConfig } from '../../../src/core/types';

describe('Model Registry', () => {
    it('should identify known models', () => {
        expect(isKnownModel('llm', 'Xenova/Qwen1.5-0.5B-Chat')).toBe(true);
        expect(isKnownModel('llm', 'unknown-model')).toBe(false);
    });

    it('should retrive model info', () => {
        const info = getModelInfo('llm', 'Xenova/Qwen1.5-0.5B-Chat');
        expect(info).toBeDefined();
        if (info && 'contextWindow' in info) {
            expect(info.contextWindow).toBe(32768);
            expect(info.family).toBe('qwen');
        }
    });

    it('should provide type-safety for known models', () => {
        const model: SupportedLLM = 'Xenova/Qwen1.5-0.5B-Chat';
        expect(model).toBe('Xenova/Qwen1.5-0.5B-Chat');
    });

    it('should retrieve helper info', () => {
        const { getModelRequirements, getModelFamily } = require('../../../src/core/ModelRegistry');

        const reqs = getModelRequirements('llm', 'Xenova/Qwen1.5-0.5B-Chat');
        expect(reqs).toEqual({ minRam: 2048 });

        const family = getModelFamily('Xenova/Qwen1.5-0.5B-Chat');
        expect(family).toBe('qwen');

        expect(getModelFamily('unknown')).toBeUndefined();
    });
});

describe('LLMModel Integration', () => {
    it('should use registry for context window lookup', () => {
        const config: LLMConfig = {
            model: 'Xenova/Qwen1.5-0.5B-Chat', // Known in registry
        };
        const model = new LLMModel(config);
        expect(model.getContextWindow()).toBe(32768);
    });

    it('should use fallback for family matching', () => {
        const config: LLMConfig = {
            model: 'Xenova/My-Custom-Qwen1.5-FineTune', // Unknown but has family in name
        };
        const model = new LLMModel(config);
        expect(model.getContextWindow()).toBe(32768);
    });

    it('should use hardcoded fallback for unknown models', () => {
        const config: LLMConfig = {
            model: 'mistralai/Mistral-7B-v0.1', // Not in registry, but caught by hardcoded if
        };
        const model = new LLMModel(config);
        expect(model.getContextWindow()).toBe(8192);
    });
});
