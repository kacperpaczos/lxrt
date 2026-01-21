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

    // 2. Utworzenie providera AI
    const provider = createAIProvider({
        llm: {
            model: 'Xenova/Phi-3-mini-4k-instruct', // Mocniejszy model (3.8B)
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
    // Get page reference for V3 API
    const page = stagehand.context.pages()[0];

    // Proxy browser console logs to Node process
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

    try {
        console.log("🌐 Navigating to stallman.org...");
        await page.goto("https://stallman.org/");
        console.log(`📍 Current URL: ${page.url()}`);
        console.log(`📑 Page Title: ${await page.title()}`);

        // ========== AGENT LOGIC ==========
        // Krok 1: Znajdź i kliknij link do sekcji #upcoming-talks
        console.log("\n🤖 AGENT: Looking for anchor link to #upcoming-talks...");

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
            console.log(`✅ AGENT: Found anchor link: "${anchorLink.text}" -> ${anchorLink.href}`);
            console.log(`🖱️  AGENT: Clicking to scroll to section...`);
            await page.locator(anchorLink.selector).click();
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log(`✅ AGENT: Scrolled to section.`);
        } else {
            console.log(`⚠️ AGENT: No anchor link found, proceeding with full page...`);
        }

        // Krok 2: Wyciągnij treść z sekcji
        console.log("\n🧹 AGENT: Extracting content from target section...");

        const sectionContent = await page.evaluate(() => {
            // Znajdź sekcję upcoming-talks
            let targetElement: Element | null =
                document.getElementById('upcoming-talks') ||
                document.querySelector('a[name="upcoming-talks"]');

            if (targetElement) {
                let text = targetElement.textContent || '';
                let current: Element | null = targetElement;
                let siblingsFound = 0;

                // First pass: try direct siblings
                for (let i = 0; i < 15 && current; i++) {
                    current = current.nextElementSibling;
                    if (current) {
                        siblingsFound++;
                        const siblingText = current.textContent || '';
                        text += '\n' + siblingText;
                        if (current.querySelector('a[name]') || (current.id && current.id !== 'upcoming-talks')) {
                            break;
                        }
                    }
                }

                // Second pass: if no siblings found, try parent's siblings
                if (siblingsFound === 0 && targetElement.parentElement) {
                    console.log(`DEBUG: No direct siblings for ${targetElement.tagName}, trying parent ${targetElement.parentElement.tagName}...`);
                    current = targetElement.parentElement;

                    // Add parent text if it contains more than just the anchor
                    if (current.textContent && current.textContent.length > (targetElement.textContent?.length || 0) + 10) {
                        text = current.textContent; // Use parent full text
                    }

                    for (let i = 0; i < 20 && current; i++) {
                        current = current.nextElementSibling;
                        if (current) {
                            const siblingText = current.textContent || '';
                            text += '\n' + siblingText;

                            // Stop if we hit another header or anchor
                            if (current.tagName.match(/^H[1-3]$/) ||
                                current.querySelector('a[name]') ||
                                (current.id && current.id !== 'upcoming-talks')) {
                                break;
                            }
                        }
                    }
                }

                return {
                    found: true,
                    sectionId: (targetElement as HTMLElement).id || (targetElement as HTMLAnchorElement).name || 'anchor',
                    text: text.replace(/\s+/g, ' ').trim().slice(0, 4000),
                    charCount: text.length
                };
            }

            // Fallback: cały body
            return {
                found: false,
                sectionId: 'body',
                text: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 4000),
                charCount: document.body.innerText.length
            };
        });

        console.log(`📄 Section found: ${sectionContent.found} (ID: ${sectionContent.sectionId})`);
        console.log(`📄 Extracted: ${sectionContent.charCount} chars`);
        console.log(`\n--- SECTION CONTENT (first 1500 chars) ---\n${sectionContent.text.slice(0, 1500)}\n--- END ---\n`);

        // Krok 3: Wywołaj LLM
        console.log("👀 AGENT: Asking LLM to extract talks from section...");

        const prompt = `Summarize the upcoming talks mentioned in the text below.
List them in a simple format:
- Date: Location (Details)

Identify ANY event mentioned, even if the date is incomplete.

TEXT TO PREOCESS:
${sectionContent.text}`;

        const response = await provider.chat([
            { role: 'system', content: 'Summarize text and list events.' },
            { role: 'user', content: prompt }
        ], { maxTokens: 512 });

        console.log("📝 Model Output:\n", response.content);

        // Opcjonalnie: proste wykrywanie dat/linii
        const lines = response.content.split('\n').filter((l: string) => l.includes(':') || l.includes('January') || l.includes('Friday'));
        if (lines.length > 0) {
            console.log("✅ Extracted events found:");
            lines.forEach((l: string) => console.log(`   * ${l.trim()}`));
        } else {
            console.log("⚠️ Raw output shown above");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        console.log("🔒 Closing...");
        await stagehand.close();
        process.exit(0);
    }
}

main().catch(console.error);
