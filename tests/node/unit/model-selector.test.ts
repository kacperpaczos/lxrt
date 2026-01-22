
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
        });
    });

    describe('selectBestDType', () => {
        it('should select FP16 for WebGPU with High RAM', () => {
            const config: LLMConfig = { model: 'chat-light' };
            const result = selector.selectBestDType('llm', config, heavySystem) as LLMConfig;
            expect(result.dtype).toBe('fp16');
        });

        it('should select Q8 for WebGPU with Low RAM', () => {
            const config: LLMConfig = { model: 'chat-light' };
            // Override heavy system to be GPU but low RAM for this test
            const gpuLowRam: SystemCapabilities = { ...heavySystem, totalRAM: 2 * 1024 * 1024 * 1024 };

            const result = selector.selectBestDType('llm', config, gpuLowRam) as LLMConfig;
            expect(result.dtype).toBe('q8');
        });

        it('should select Q4 for CPU/WASM (default)', () => {
            const config: LLMConfig = { model: 'chat-light' };
            const result = selector.selectBestDType('llm', config, lightSystem) as LLMConfig;
            expect(result.dtype).toBe('q4');
        });

        it('should select Q8 for Node with High RAM', () => {
            const config: LLMConfig = { model: 'chat-light' };
            const nodeHighRam: SystemCapabilities = {
                platform: 'node',
                hasWebGPU: false,
                totalRAM: 8 * 1024 * 1024 * 1024,
                cores: 8
            };

            const result = selector.selectBestDType('llm', config, nodeHighRam) as LLMConfig;
            expect(result.dtype).toBe('q8');
        });

        it('should respect existing dtype preference', () => {
            const config: LLMConfig = { model: 'chat-light', dtype: 'q4' };
            const result = selector.selectBestDType('llm', config, heavySystem) as LLMConfig;
            expect(result.dtype).toBe('q4');
        });
    });

    describe('selectPerformanceMode', () => {
        it('should select QUALITY for WebGPU + High RAM', () => {
            const config: LLMConfig = { model: 'chat', performanceMode: 'auto' };
            const result = selector.selectPerformanceMode('llm', config, heavySystem) as LLMConfig;
            expect(result.performanceMode).toBe('quality');
        });

        it('should select BALANCED for WebGPU + Mid/Low RAM', () => {
            const config: LLMConfig = { model: 'chat', performanceMode: 'auto' };
            // Override heavy system to be GPU but low RAM for this test
            const gpuLowRam: SystemCapabilities = { ...heavySystem, totalRAM: 4 * 1024 * 1024 * 1024 };

            const result = selector.selectPerformanceMode('llm', config, gpuLowRam) as LLMConfig;
            expect(result.performanceMode).toBe('balanced');
        });

        it('should select FAST for Browser CPU', () => {
            const config: LLMConfig = { model: 'chat', performanceMode: 'auto' };
            const result = selector.selectPerformanceMode('llm', config, lightSystem) as LLMConfig;
            expect(result.performanceMode).toBe('fast');
        });

        it('should select BALANCED for Node Standard', () => {
            const config: LLMConfig = { model: 'chat', performanceMode: 'auto' };
            const nodeStandard: SystemCapabilities = {
                platform: 'node',
                hasWebGPU: false,
                totalRAM: 8 * 1024 * 1024 * 1024,
                cores: 8
            };

            const result = selector.selectPerformanceMode('llm', config, nodeStandard) as LLMConfig;
            expect(result.performanceMode).toBe('balanced');
        });

        it('should respect manual setting', () => {
            const config: LLMConfig = { model: 'chat', performanceMode: 'fast' };
            const result = selector.selectPerformanceMode('llm', config, heavySystem) as LLMConfig;
            expect(result.performanceMode).toBe('fast');
        });
    });

    describe('selectBestThreads', () => {
        it('should use half cores (max 4) for Browser WASM', () => {
            const config: LLMConfig = { model: 'chat' };
            // 8 cores -> 4 threads
            const result = selector.selectBestThreads('llm', config, heavySystem) as LLMConfig;
            expect(result.threads).toBe(4);
        });

        it('should ensure at least 1 thread for Browser', () => {
            const config: LLMConfig = { model: 'chat' };
            // 1 core? obscure but possible
            const singleCore: SystemCapabilities = { ...lightSystem, cores: 1 };
            const result = selector.selectBestThreads('llm', config, singleCore) as LLMConfig;
            expect(result.threads).toBe(1);
        });

        it('should cap threads at 4 for Browser even if many cores', () => {
            const config: LLMConfig = { model: 'chat' };
            // 32 cores -> still 4 threads to avoid UI block
            const superPc: SystemCapabilities = { ...heavySystem, cores: 32 };
            const result = selector.selectBestThreads('llm', config, superPc) as LLMConfig;
            expect(result.threads).toBe(4);
        });

        it('should use cores-1 for Node', () => {
            const config: LLMConfig = { model: 'chat' };
            // 8 cores -> 7 threads
            const node8: SystemCapabilities = { ...heavySystem, platform: 'node', cores: 8 };
            const result = selector.selectBestThreads('llm', config, node8) as LLMConfig;
            expect(result.threads).toBe(7);
        });

        it('should respect manual threads setting', () => {
            const config: LLMConfig = { model: 'chat', threads: 2 };
            const result = selector.selectBestThreads('llm', config, heavySystem) as LLMConfig;
            expect(result.threads).toBe(2);
        });
    });

    describe('selectMaxTokens', () => {
        it('should limit tokens to 1024 for VERY Low RAM (<2GB)', () => {
            const config: LLMConfig = { model: 'chat' };
            const lowRAM: SystemCapabilities = { ...lightSystem, totalRAM: 1.5 * 1024 * 1024 * 1024 };
            const result = selector.selectMaxTokens('llm', config, lowRAM) as LLMConfig;
            expect(result.maxTokens).toBe(1024);
        });

        it('should limit tokens to 2048 for Low RAM (2-4GB)', () => {
            const config: LLMConfig = { model: 'chat' };
            const midRAM: SystemCapabilities = { ...lightSystem, totalRAM: 3 * 1024 * 1024 * 1024 };
            const result = selector.selectMaxTokens('llm', config, midRAM) as LLMConfig;
            expect(result.maxTokens).toBe(2048);
        });

        it('should NOT limit tokens for High RAM (>4GB)', () => {
            const config: LLMConfig = { model: 'chat' };
            const result = selector.selectMaxTokens('llm', config, heavySystem) as LLMConfig;
            expect(result.maxTokens).toBeUndefined(); // Let model default apply
        });

        it('should respect manual maxTokens setting', () => {
            const config: LLMConfig = { model: 'chat', maxTokens: 4096 };
            const lowRAM: SystemCapabilities = { ...lightSystem, totalRAM: 1 * 1024 * 1024 * 1024 };
            const result = selector.selectMaxTokens('llm', config, lowRAM) as LLMConfig;
            expect(result.maxTokens).toBe(4096);
        });

        it('should ignore non-llm modalities', () => {
            const config = { model: 'tts-1' };
            // @ts-ignore
            const result = selector.selectMaxTokens('tts', config, lightSystem);
            expect(result).toBe(config);
        });
    });
});
