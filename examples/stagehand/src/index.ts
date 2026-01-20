import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { init, createAIProvider } from 'lxrt';
import { LxrtLLMProvider } from './LxrtLLMProvider.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

async function main() {
    console.log("🚀 Initializing LXRT...");

    // Initialize LXRT library first
    await init();

    // 1. Initialize LXRT AI Provider
    const provider = createAIProvider({
        llm: {
            model: 'Xenova/Qwen1.5-0.5B-Chat', // Small, fast model for testing
            dtype: 'q4', // Quantized for speed
            device: 'cpu' // Use CPU for compatibility, or 'webgpu' if available
        }
    });

    console.log("⏳ Loading model (this may take a while first time)...");
    await provider.warmup('llm');
    console.log("✅ Model loaded!");

    // 2. Initialize Stagehand with custom LLM client
    console.log("🚀 Initializing Stagehand...");
    const stagehand = new Stagehand({
        env: "LOCAL",
        llmClient: new LxrtLLMProvider(provider),
        localBrowserLaunchOptions: {
            headless: false, // Widoczna przeglądarka dla weryfikacji!
            viewport: { width: 1280, height: 720 }
        },
        verbose: 1 // Szczegółowe logi
    });

    await stagehand.init();

    // Get page reference for V3 API
    const page = stagehand.context.pages()[0];

    try {
        console.log("🌐 Navigating to example.com...");
        await page.goto("https://example.com");

        console.log("👀 Extracting data...");
        const data = await stagehand.extract(
            "Extract the title and the first paragraph text of the page.",
            z.object({
                title: z.string().describe("The main title of the page"),
                description: z.string().describe("The text content of the first paragraph")
            })
        );

        console.log("📝 Result:", data);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        console.log("🔒 Closing...");
        await stagehand.close();
        process.exit(0);
    }
}

main().catch(console.error);
