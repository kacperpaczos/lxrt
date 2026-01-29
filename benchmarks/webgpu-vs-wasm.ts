
import { createAIProvider, gpuDetector } from '../dist/index.js';

async function runBenchmark() {
    console.log('🚀 Starting WebGPU vs WASM Benchmark');

    // 1. Detect GPU
    const caps = await gpuDetector.detect();
    console.log('Canvas capabilities:', caps);

    if (!caps.webgpuAvailable) {
        console.warn('⚠️ WebGPU not available, skipping WebGPU part of benchmark');
    }

    const prompt = 'Explain quantum computing in one sentence.';
    const model = 'Xenova/Qwen1.5-0.5B-Chat';

    // 2. Run WASM Benchmark
    console.log('\nBenchmarking WASM...');
    const wasmProvider = createAIProvider({
        llm: { model, device: 'wasm', dtype: 'q8' }
    });

    const startWasm = performance.now();
    await wasmProvider.chat([{ role: 'user', content: prompt }]);
    const endWasm = performance.now();
    console.log(`⏱️ WASM Time: ${(endWasm - startWasm).toFixed(2)}ms`);

    // 3. Run WebGPU Benchmark (if available)
    if (caps.webgpuAvailable) {
        console.log('\nBenchmarking WebGPU...');
        const webgpuProvider = createAIProvider({
            llm: { model, device: 'webgpu', dtype: 'fp32' } // fp32 usually better for webgpu or q4f16
        });

        // Warmup
        console.log('Heating up GPU...');
        await webgpuProvider.chat([{ role: 'user', content: 'hi' }]);

        const startGpu = performance.now();
        await webgpuProvider.chat([{ role: 'user', content: prompt }]);
        const endGpu = performance.now();
        console.log(`⏱️ WebGPU Time: ${(endGpu - startGpu).toFixed(2)}ms`);

        const speedup = (endWasm - startWasm) / (endGpu - startGpu);
        console.log(`\n⚡ Speedup: ${speedup.toFixed(2)}x`);
    }
}

runBenchmark().catch(console.error);
