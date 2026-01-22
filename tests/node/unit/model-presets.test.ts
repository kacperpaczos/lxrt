import {
    resolveModelId,
    isPreset,
    getAvailablePresets,
    MODEL_PRESETS,
    type LLMPreset,
    type EmbeddingPreset,
} from '../../../src/core/ModelPresets';

describe('Model Presets', () => {
    describe('resolveModelId', () => {
        it('should resolve LLM presets to model IDs', () => {
            expect(resolveModelId('llm', 'chat-light')).toBe('Xenova/Qwen1.5-0.5B-Chat');
            expect(resolveModelId('llm', 'chat-medium')).toBe('Xenova/Phi-3-mini-4k-instruct');
            expect(resolveModelId('llm', 'chat-heavy')).toBe('Xenova/gemma-2b-it');
            expect(resolveModelId('llm', 'fast')).toBe('Xenova/TinyLlama-1.1B-Chat-v1.0');
            expect(resolveModelId('llm', 'balanced')).toBe('Xenova/Qwen1.5-0.5B-Chat');
            expect(resolveModelId('llm', 'quality')).toBe('Xenova/Phi-3-mini-4k-instruct');
        });

        it('should resolve embedding presets', () => {
            expect(resolveModelId('embedding', 'light')).toBe('Xenova/all-MiniLM-L6-v2');
            expect(resolveModelId('embedding', 'quality')).toBe('Xenova/bge-m3');
            expect(resolveModelId('embedding', 'default')).toBe('Xenova/all-MiniLM-L6-v2');
        });

        it('should resolve STT presets', () => {
            expect(resolveModelId('stt', 'tiny')).toBe('Xenova/whisper-tiny');
            expect(resolveModelId('stt', 'medium')).toBe('Xenova/whisper-small');
        });

        it('should pass through known model IDs', () => {
            expect(resolveModelId('llm', 'Xenova/gpt2')).toBe('Xenova/gpt2');
            expect(resolveModelId('embedding', 'Xenova/all-MiniLM-L6-v2')).toBe(
                'Xenova/all-MiniLM-L6-v2'
            );
        });

        it('should pass through custom model IDs', () => {
            expect(resolveModelId('llm', 'my-org/custom-model')).toBe('my-org/custom-model');
            expect(resolveModelId('embedding', 'other-org/embeddings')).toBe(
                'other-org/embeddings'
            );
        });
    });

    describe('isPreset', () => {
        it('should identify valid presets', () => {
            expect(isPreset('llm', 'chat-light')).toBe(true);
            expect(isPreset('llm', 'fast')).toBe(true);
            expect(isPreset('embedding', 'quality')).toBe(true);
        });

        it('should return false for non-presets', () => {
            expect(isPreset('llm', 'Xenova/gpt2')).toBe(false);
            expect(isPreset('llm', 'custom-model')).toBe(false);
        });
    });

    describe('getAvailablePresets', () => {
        it('should list all LLM presets', () => {
            const presets = getAvailablePresets('llm');
            expect(presets).toContain('tiny');
            expect(presets).toContain('light');
            expect(presets).toContain('chat-light');
            expect(presets).toContain('fast');
            expect(presets).toContain('default');
        });

        it('should list all embedding presets', () => {
            const presets = getAvailablePresets('embedding');
            expect(presets).toContain('light');
            expect(presets).toContain('quality');
            expect(presets).toContain('default');
        });
    });

    describe('Type safety', () => {
        it('should provide type-safe preset names', () => {
            const llmPreset: LLMPreset = 'chat-light';
            expect(llmPreset).toBe('chat-light');

            const embeddingPreset: EmbeddingPreset = 'quality';
            expect(embeddingPreset).toBe('quality');
        });
    });

    describe('MODEL_PRESETS registry', () => {
        it('should have all modalities', () => {
            expect(MODEL_PRESETS.llm).toBeDefined();
            expect(MODEL_PRESETS.embedding).toBeDefined();
            expect(MODEL_PRESETS.stt).toBeDefined();
            expect(MODEL_PRESETS.tts).toBeDefined();
            expect(MODEL_PRESETS.ocr).toBeDefined();
        });

        it('should have default presets for all modalities', () => {
            expect(MODEL_PRESETS.llm.default).toBeDefined();
            expect(MODEL_PRESETS.embedding.default).toBeDefined();
            expect(MODEL_PRESETS.stt.default).toBeDefined();
            expect(MODEL_PRESETS.tts.default).toBeDefined();
            expect(MODEL_PRESETS.ocr.default).toBeDefined();
        });
    });
});
