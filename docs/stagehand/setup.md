# Konfiguracja i Uruchomienie

## Wymagania
- **Node.js**: Wersja >= 22 (rekomendowane z uwagi na Stagehand).
- **LXRT**: Wersja v0.6.0 lub nowsza.
- **Przeglądarka**: Chromium (może być zainstalowana systemowo lub przez Playwright).

## Instalacja

W katalogu swojego projektu zainstaluj wymagane pakiety:

```bash
npm install lxrt @browserbasehq/stagehand zod dotenv
```

> **Uwaga dot. ESM**: LXRT jest dystrybuowane jako moduł ESM. Podczas uruchamiania w Node.js może być wymagane użycie flagi `--experimental-specifier-resolution=node` lub loadera `tsx`.

## Przykład Konfiguracji (`index.ts`)

Poniższy przykład pokazuje jak poprawnie skonfigurować Stagehand V3 z LXRT.

```typescript
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { init, createAIProvider } from 'lxrt';
import { LxrtLLMProvider } from './LxrtLLMProvider.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
    // 1. Inicjalizacja biblioteki LXRT (KLUCZOWE!)
    await init();

    // 2. Utworzenie providera AI
    const provider = createAIProvider({
        llm: {
            model: 'Xenova/Qwen1.5-0.5B-Chat', // Dla produkcji sugerowane: Qwen 2.5 3B+
            dtype: 'q4',
            device: 'cpu' // 'webgpu' jeśli dostępne
        }
    });

    console.log("Loading model...");
    await provider.warmup('llm');

    // 3. Konfiguracja Stagehand (API V3)
    const stagehand = new Stagehand({
        env: "LOCAL",
        llmClient: new LxrtLLMProvider(provider),
        // Konfiguracja widoczności przeglądarki
        localBrowserLaunchOptions: {
            headless: false, 
            viewport: { width: 1280, height: 720 }
        }
    });

    await stagehand.init();

    // 4. Dostęp do strony (API V3)
    const page = stagehand.context.pages()[0];
    await page.goto("https://example.com");

    const data = await stagehand.extract(
        "Extract the title and description.",
        z.object({
            title: z.string(),
            description: z.string()
        })
    );

    console.log(data);
    await stagehand.close();
}
```

### Zmienne Środowiskowe
Jeśli Stagehand nie wykrywa automatycznie Chromium, ustaw zmienną `CHROME_PATH`:

```bash
export CHROME_PATH=/path/to/chrome
# Przykład automagicznego znalezienia ścieżki Playwright:
# export CHROME_PATH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | head -1)
```
