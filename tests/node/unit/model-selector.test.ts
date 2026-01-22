
import { ModelSelector } from '../../../src/app/autoscaler/ModelSelector';
import { SystemCapabilities } from '../../../src/app/autoscaler/SystemCapabilities';
import { LLMConfig } from '../../../src/core/types';
import { LLM_PRESETS } from '../../../src/core/ModelPresets';

describe('ModelSelector', () => {
    let selector: ModelSelector;

    // Helper system caps
    const heavySystem: SystemCapabilities = {
        platform: 'browser',
        hasWebGPU: true,
        totalRAM: 16 * 1024 * 1024 * 1024, // 16GB
        cores: 8
    };

    const mediumSystem: SystemCapabilities = {
        platform: 'browser',
        hasWebGPU: false, // fallback to CPU/WASM
        totalRAM: 8 * 1024 * 1024 * 1024, // 8GB
        cores: 4
    };

    const lightSystem: SystemCapabilities = {
        platform: 'browser',
        hasWebGPU: false,
        totalRAM: 2 * 1024 * 1024 * 1024, // 2GB
        cores: 2
    };

    beforeEach(() => {
        selector = new ModelSelector();
    });

    describe('selectBestModel', () => {
        it('should select HEAVY model for high-end system', () => {
            const config: LLMConfig = { model: 'chat-light' }; // User requested generic light
            // But let's assume Intent logic: we want to select best based on system, 
            // mapping generic 'chat' intent.
            // Wait, our implementation maps 'chat-*' to intent 'chat'.

            const result = selector.selectBestModel('llm', config, heavySystem) as LLMConfig;
            expect(result.model).toBe(LLM_PRESETS['chat-heavy']);
        });

        it('should select MEDIUM model for mid-range system', () => {
            const config: LLMConfig = { model: 'chat-heavy' }; // User requested heavy

            const result = selector.selectBestModel('llm', config, mediumSystem) as LLMConfig;
            // Should downgrade to avoid OOM
            // 8GB RAM but no GPU -> medium usually safe
            expect(result.model).toBe(LLM_PRESETS['chat-medium']);
        });

        it('should select LIGHT model for low-end system', () => {
            const config: LLMConfig = { model: 'chat-medium' };

            const result = selector.selectBestModel('llm', config, lightSystem) as LLMConfig;
            expect(result.model).toBe(LLM_PRESETS['chat-light']);
        });

        it('should handle completion intent', () => {
            const config: LLMConfig = { model: 'completion-medium' };

            // High RAM -> medium
            const heavyResult = selector.selectBestModel('llm', config, heavySystem) as LLMConfig;
            expect(heavyResult.model).toBe(LLM_PRESETS['completion-medium']);

            // Low RAM -> light
            const lightResult = selector.selectBestModel('llm', config, lightSystem) as LLMConfig;
            expect(lightResult.model).toBe(LLM_PRESETS['completion-light']);
        });

        it('should handle default intent', () => {
            const config: LLMConfig = { model: 'default' };

            const heavyResult = selector.selectBestModel('llm', config, heavySystem) as LLMConfig;
            expect(heavyResult.model).toBe(LLM_PRESETS['medium']);

            const lightResult = selector.selectBestModel('llm', config, lightSystem) as LLMConfig;
            expect(lightResult.model).toBe(LLM_PRESETS['light']);
        });

        it('should ignore other modalities', () => {
            const config = { model: 'some-embedding' };
            // @ts-ignore
            const result = selector.selectBestModel('embedding', config, heavySystem);
            expect(result).toBe(config); // No changess
        });
    });
});
