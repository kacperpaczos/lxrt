import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { init, createAIProvider } from 'lxrt';
import { LxrtLLMProvider } from './LxrtLLMProvider.js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function main() {
    // 1. Inicjalizacja biblioteki LXRT
    await init();

    // 2. Utworzenie providera AI - MAŁY MODEL DLA SZYBKOŚCI
    const provider = createAIProvider({
        llm: {
            model: 'Xenova/Qwen1.5-0.5B-Chat', // Mały model (~0.5B) dla szybkiej odpowiedzi
            dtype: 'q4',
            device: 'cpu'
        }
    });

    // 2a. Progress tracking
    provider.on('progress', (data) => {
        const percent = data.progress?.toFixed(1) ?? '?';
        const file = data.file ?? 'unknown';
        const status = data.status ?? 'loading';
        let sizeInfo = '';
        if (data.loaded && data.total) {
            const loadedMB = (data.loaded / 1024 / 1024).toFixed(1);
            const totalMB = (data.total / 1024 / 1024).toFixed(1);
            sizeInfo = ` (${loadedMB}/${totalMB} MB)`;
        }
        process.stdout.write(`\r[${status}] ${file}: ${percent}%${sizeInfo}     `);
    });

    provider.on('ready', (data) => {
        console.log(`\n✅ Model ${data.model} loaded and ready!`);
    });

    console.log("⏳ Loading model...");
    await provider.warmup('llm');

    // 3. Konfiguracja Stagehand
    const stagehand = new Stagehand({
        env: "LOCAL",
        llmClient: new LxrtLLMProvider(provider),
        localBrowserLaunchOptions: {
            headless: false,
            viewport: { width: 1280, height: 720 }
        },
        verbose: 1
    });

    await stagehand.init();
    const page = stagehand.context.pages()[0];
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

    try {
        console.log("🌐 Navigating to stallman.org...");
        await page.goto("https://stallman.org/");
        console.log(`📍 URL: ${page.url()}`);

        // ========== AGENT LOGIC ==========
        // Krok 1: Znajdź i kliknij link do sekcji
        console.log("\n🤖 Looking for #upcoming-talks...");

        const anchorLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="#upcoming"]'));
            if (links.length > 0) {
                const link = links[0] as HTMLAnchorElement;
                return {
                    href: link.href,
                    text: link.textContent?.trim() || '',
                    selector: `a[href="${link.getAttribute('href')}"]`
                };
            }
            return null;
        });

        if (anchorLink) {
            console.log(`✅ Found: "${anchorLink.text}"`);
            await page.locator(anchorLink.selector).click();
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Krok 2: Wyciągnij treść (OGRANICZONA DO 1500 znaków)
        console.log("\n🧹 Extracting content...");

        const sectionContent = await page.evaluate(() => {
            let targetElement: Element | null =
                document.getElementById('upcoming-talks') ||
                document.querySelector('a[name="upcoming-talks"]');

            if (targetElement) {
                let text = targetElement.textContent || '';
                let current: Element | null = targetElement;
                let siblingsFound = 0;

                for (let i = 0; i < 10 && current; i++) {
                    current = current.nextElementSibling;
                    if (current) {
                        siblingsFound++;
                        text += '\n' + (current.textContent || '');
                        if (current.querySelector('a[name]') || current.id) break;
                    }
                }

                if (siblingsFound === 0 && targetElement.parentElement) {
                    current = targetElement.parentElement;
                    if (current.textContent) text = current.textContent;
                    for (let i = 0; i < 10 && current; i++) {
                        current = current.nextElementSibling;
                        if (current) {
                            text += '\n' + (current.textContent || '');
                            if (current.tagName.match(/^H[1-3]$/) || current.querySelector('a[name]')) break;
                        }
                    }
                }

                return {
                    found: true,
                    text: text.replace(/\s+/g, ' ').trim().slice(0, 1500), // OGRANICZENIE DO 1500 znaków
                    charCount: text.length
                };
            }

            return {
                found: false,
                text: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
                charCount: document.body.innerText.length
            };
        });

        console.log(`📄 Extracted: ${sectionContent.charCount} chars (using first 1500)`);

        // Ostrzeżenie o przekroczeniu limitu
        if (sectionContent.charCount > 1500) {
            console.warn(`⚠️ WARNING: Input truncated from ${sectionContent.charCount} to 1500 chars`);
        }

        // Krok 3: Wywołaj LLM ze STREAMINGIEM
        console.log("\n👀 Asking LLM (streaming)...\n");

        const prompt = `Extract first event: ${sectionContent.text.slice(0, 500)}
Format: Date - Location - Title`;

        // STREAMING - pokazuj tokeny w czasie rzeczywistym
        process.stdout.write("📝 ");
        let fullResponse = '';

        for await (const token of provider.stream([
            { role: 'system', content: 'Extract one event. Very brief.' },
            { role: 'user', content: prompt }
        ], { maxTokens: 64 })) { // TYLKO 64 tokeny
            process.stdout.write(token);
            fullResponse += token;
        }

        console.log("\n\n✅ Done!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        console.log("🔒 Closing...");
        await stagehand.close();
        process.exit(0);
    }
}

main().catch(console.error);
