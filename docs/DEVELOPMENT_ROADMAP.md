# LXRT - Raport Rozwojowy dla Lidera Projektu
**Data:** 2026-01-21  
**Źródło:** Integracja z frameworkiem Stagehand (browser automation)  
**Autor:** AI Assistant (Antigravity)

---

## Podsumowanie Wykonawcze

Podczas integracji LXRT z Stagehand zidentyfikowano **12 konkretnych obszarów** wymagających poprawy. Poniżej przedstawiono szczegółową listę z uzasadnieniami i przykładami z rzeczywistego kodu.

---

## PRIORYTET KRYTYCZNY 🔴

### 1. Brak funkcji `countTokens()`

**Problem:**  
Nie ma możliwości sprawdzenia ile tokenów zajmuje tekst przed wysłaniem do modelu. Prowadzi to do nieprzewidywalnych obcięć lub błędów "context overflow".

**Uzasadnienie:**  
Podczas ekstrakcji treści ze strony `stallman.org` otrzymaliśmy 11,894 znaków. Nie wiedząc ile to tokenów, musieliśmy arbitralnie obciąć do 1500 znaków, tracąc potencjalnie ważne dane.

**Jak to obeszliśmy:**
```typescript
// WORKAROUND: Ręczne obcinanie bez wiedzy o tokenach
const text = sectionContent.text.slice(0, 1500); // Arbitralna wartość!

// Ręczne ostrzeżenie
if (sectionContent.charCount > 1500) {
    console.warn(`⚠️ WARNING: Input truncated from ${sectionContent.charCount} to 1500 chars`);
}
```

**Proponowane API:**
```typescript
const tokenCount = await provider.countTokens(text);
const contextWindow = provider.getContextWindow(); // np. 4096

if (tokenCount > contextWindow - 512) { // -512 na odpowiedź
    text = text.slice(0, estimateCharsForTokens(contextWindow - 512));
}
```

**Estymowany nakład:** 2-3 dni

---

### 2. Wolny inference na CPU/WASM

**Problem:**  
Generowanie 64 tokenów trwa ~17 sekund na CPU. Dla responsywnych aplikacji to za wolno.

**Uzasadnienie:**  
Nasz cel było <10s. Nawet po agresywnej optymalizacji (zmniejszenie modelu, tokenów, inputu) nie udało się zejść poniżej 17s.

**Dane benchmarkowe:**
| Konfiguracja | Czas |
|--------------|------|
| Phi-3 (3.8B), 512 tokenów, 4000 znaków | ~5 minut |
| Qwen 0.5B, 128 tokenów, 1500 znaków | 31.32s |
| Qwen 0.5B, 64 tokeny, 500 znaków | **17.56s** |

**Jak to obeszliśmy:**
```typescript
// Zmniejszenie wszystkiego co możliwe
{ maxTokens: 64 }  // zamiast 512
sectionContent.text.slice(0, 500)  // zamiast 4000
model: 'Xenova/Qwen1.5-0.5B-Chat'  // zamiast Phi-3
```

**Propozycja rozwiązania:**
1. **WebGPU backend** - 10-50x przyspieszenie (priorytet!)
2. **SIMD optimizations** dla WASM
3. **Speculative decoding** dla szybszego generowania

**Estymowany nakład:** 2-4 tygodnie

---

### 3. Brak `getContextWindow()`

**Problem:**  
Nie ma sposobu na programowe sprawdzenie rozmiaru okna kontekstowego modelu.

**Uzasadnienie:**  
Każdy model ma inny limit (Qwen: 4096, Phi-3: 4096, Llama: 8192). Bez tej informacji nie można dynamicznie dostosować inputu.

**Jak to obeszliśmy:**
```typescript
// WORKAROUND: Hardkodowany limit
const MAX_INPUT_CHARS = 1500; // Zgadujemy że to bezpieczne
```

**Proponowane API:**
```typescript
const model = await provider.getModelInfo();
console.log(model.contextWindow); // 4096
console.log(model.maxTokens); // 2048
```

**Estymowany nakład:** 1-2 dni

---

## PRIORYTET WYSOKI 🟡

### 4. Brak Abort/Cancel dla inference

**Problem:**  
Nie można przerwać trwającego inference. Użytkownik musi czekać nawet jeśli chce anulować.

**Uzasadnienie:**  
W aplikacji Stagehand, jeśli użytkownik zamknie przeglądarkę w trakcie generowania, proces nadal działa w tle.

**Jak to obeszliśmy:**
```typescript
// Brak obejścia - musieliśmy czekać lub zabić proces
process.exit(0); // Brutalne rozwiązanie
```

**Proponowane API:**
```typescript
const controller = new AbortController();
const response = await provider.chat(messages, { 
    signal: controller.signal 
});

// Timeout po 10s
setTimeout(() => controller.abort(), 10000);
```

**Estymowany nakład:** 3-5 dni

---

### 5. Brak JSON Mode

**Problem:**  
Nie ma gwarancji że model zwróci poprawny JSON. Trzeba parsować regex i obsługiwać błędy.

**Uzasadnienie:**  
Stagehand wymaga strukturalnych odpowiedzi (schematy Zod). Małe modele (0.5B) często generują niepoprawny JSON.

**Jak to obeszliśmy:**
```typescript
// WORKAROUND: Regex parsing z fallbackiem
try {
    const jsonMatches = response.content.match(/\{[\s\S]*?\}/g);
    if (jsonMatches) {
        for (const match of jsonMatches) {
            try {
                const parsed = JSON.parse(match);
                if (parsed.talks && parsed.talks.length > 0) {
                    return parsed;
                }
            } catch (e) { /* ignore */ }
        }
    }
} catch (parseError) {
    console.log("⚠️ Could not parse as JSON");
}
```

**Proponowane API:**
```typescript
const response = await provider.chat(messages, {
    responseFormat: { 
        type: "json_object",
        schema: z.object({ talks: z.array(...) }) // Zod schema
    }
});
// Gwarantowany poprawny JSON lub error
```

**Estymowany nakład:** 1 tydzień

---

### 6. Brak Function Calling

**Problem:**  
Nie ma natywnego wsparcia dla tool/function calling, które jest standardem w nowoczesnych LLM API.

**Uzasadnienie:**  
Stagehand używa function calling do sterowania przeglądarką (click, type, extract). Musieliśmy to emulować w prompcie.

**Jak to obeszliśmy:**
```typescript
// WORKAROUND: Instrukcje w prompcie zamiast narzędzi
const prompt = `Extract first event: ${text}
Format: Date - Location - Title`;
// Zamiast:
// tools: [{ name: "extract_event", parameters: {...} }]
```

**Proponowane API:**
```typescript
const response = await provider.chat(messages, {
    tools: [{
        type: "function",
        function: {
            name: "extract_event",
            description: "Extracts event from text",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string" },
                    location: { type: "string" }
                }
            }
        }
    }]
});

if (response.tool_calls) {
    const call = response.tool_calls[0];
    console.log(call.function.arguments); // { date: "Jan 23", location: "Atlanta" }
}
```

**Estymowany nakład:** 2 tygodnie

---

## PRIORYTET ŚREDNI 🟢

### 7. Problemy z Path Aliases w Build

**Problem:**  
Po kompilacji TypeScript, aliasy (`@domain/*`) nie są rozwiązywane, powodując błędy importu.

**Uzasadnienie:**  
Przy pierwszym uruchomieniu przykładu Stagehand otrzymaliśmy błąd:
```
Cannot find module '@domain/errors'
```

**Jak to naprawiliśmy:**
```json
// package.json - musieliśmy dodać tsc-alias
"scripts": {
    "build": "tsc && tsc-alias"  // Dodatkowy krok!
}
```

**Propozycja:**
- Rozważyć użycie `tsup` lub `esbuild` zamiast raw `tsc`
- Lub dołączyć `tsc-alias` jako dependency i zautomatyzować

**Estymowany nakład:** 0.5 dnia

---

### 8. Konflikt wersji ONNX Runtime

**Problem:**  
LXRT wymaga `onnxruntime-node@1.23.0`, ale `@huggingface/transformers` wymaga `1.21.0`.

**Uzasadnienie:**  
Przy instalacji otrzymaliśmy ostrzeżenia o konflikcie, a później błędy ładowania modelu:
```
Protobuf parsing failed
```

**Jak to naprawiliśmy:**
```bash
# Usunięcie nadmiarowej zależności
npm uninstall onnxruntime-node
# Użycie wersji z @huggingface/transformers
```

**Propozycja:**
- Usunąć bezpośrednią zależność `onnxruntime-node` z package.json
- Polegać na wersji dostarczanej przez `@huggingface/transformers`

**Estymowany nakład:** 0.5 dnia

---

### 9. Brak typów dla Event Payloads

**Problem:**  
Eventy `progress` i `ready` nie mają wyeksportowanych typów TypeScript.

**Uzasadnienie:**  
IDE nie podpowiada dostępnych pól, co utrudnia development.

**Jak to obeszliśmy:**
```typescript
// Zgadywanie struktury na podstawie logów
provider.on('progress', (data) => {
    const percent = data.progress?.toFixed(1) ?? '?';  // Nie wiemy czy istnieje!
    const file = data.file ?? 'unknown';
    const status = data.status ?? 'loading';
    // ...
});
```

**Proponowane typy:**
```typescript
// Eksportować z biblioteki:
export interface ProgressEvent {
    modality: 'llm' | 'embeddings' | 'vision';
    model: string;
    file: string;
    progress: number; // 0-100
    loaded: number;   // bytes
    total: number;    // bytes
    status: 'downloading' | 'loading' | 'ready';
}

export interface ReadyEvent {
    modality: 'llm' | 'embeddings' | 'vision';
    model: string;
}
```

**Estymowany nakład:** 0.5 dnia

---

### 10. Dokumentacja Streaming API

**Problem:**  
Brak dokumentacji jak używać `provider.stream()`.

**Uzasadnienie:**  
Musieliśmy szukać w kodzie źródłowym (`grep_search stream`) aby znaleźć że ta funkcja istnieje.

**Jak to odkryliśmy:**
```bash
# Szukanie w źródłach
grep -r "stream" src/app/AIProvider.ts
# Znaleźliśmy: async *stream(
```

**Propozycja:**
Dodać do dokumentacji:
```markdown
## Streaming Responses

```typescript
for await (const token of provider.stream(messages, options)) {
    process.stdout.write(token);
}
```
```

**Estymowany nakład:** 0.5 dnia

---

### 11. Brak przykładów integracji

**Problem:**  
Brak oficjalnych przykładów integracji z popularnymi frameworkami.

**Uzasadnienie:**  
Musieliśmy od zera pisać `LxrtLLMProvider` dla Stagehand, zgadując jak mapować API.

**Jak to zrobiliśmy:**
```typescript
// Napisaliśmy własny adapter (109 linii kodu)
export class LxrtLLMProvider implements LLMClient {
    async createChatCompletion(options) {
        // Mapowanie Stagehand -> LXRT
        const messages = options.messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : '...'
        }));
        // ...
    }
}
```

**Propozycja:**
Stworzyć oficjalne adaptery:
- `@lxrt/stagehand` - adapter dla Stagehand
- `@lxrt/langchain` - adapter dla LangChain.js
- `@lxrt/vercel-ai` - adapter dla Vercel AI SDK

**Estymowany nakład:** 1 tydzień per adapter

---

### 12. Brak CLI do zarządzania modelami

**Problem:**  
Nie ma sposobu na pre-download modeli przed uruchomieniem aplikacji.

**Uzasadnienie:**  
Pierwszy start aplikacji trwa długo (pobieranie modelu). W produkcji chcemy mieć modele już pobrane.

**Jak to obeszliśmy:**
```typescript
// Model pobiera się przy pierwszym warmup()
await provider.warmup('llm'); // Tutaj dopiero ściąga ~1GB
```

**Proponowane CLI:**
```bash
# Pre-download modeli
npx lxrt pull Xenova/Qwen1.5-0.5B-Chat --dtype q4

# Lista pobranych modeli
npx lxrt list

# Usuń model z cache
npx lxrt remove Xenova/Phi-3-mini-4k-instruct
```

**Estymowany nakład:** 1 tydzień

---

### 13. Brak Registry i Type-Safety dla modeli

**Problem:**  
Wszystkie konfiguracje modeli (`LLMConfig`, `STTConfig`) używają typu `string` dla pola `model`. Brak weryfikacji czy model istnieje oraz brak autouzupełniania w IDE.

**Uzasadnienie:**  
Programista musi znać dokładne ID modelu z Hugging Face (np. `Xenova/whisper-tiny`). Literówka powoduje błąd dopiero w runtime (przy próbie pobrania).

**Jak to obeszliśmy:**  
Ręczne wpisywanie stringów bez walidacji.

**Proponowane rozwiązanie (Model Registry):**
Implementacja podejścia "Registry + Type-Safety":
- **Registry:** Centralny plik `src/core/ModelRegistry.ts` z definicjami przetestowanych modeli.
- **Typy:** `type SupportedLLM = keyof typeof MODEL_REGISTRY.llm`.
- **Hybrid types:** `model: SupportedLLM | (string & {})` - zapewnia autouzupełnianie dla znanych modeli, zachowując możliwość wpisania dowolnego stringa.

**Estymowany nakład:** 2-3 dni

---

### 14. Robust Integration Testing (Prawdziwe modele + Determinizm)

**Problem:**
Testy integracyjne (np. STT -> LLM) są "flaky" (niestabilne) z powodu niedoskonałości małych modeli (Whisper Tiny) na syntetycznych danych lub szumie. Workaroundy (jak `if text == '!!!'`) są tymczasowe.

**Rozwiązanie (Jak):**
1.  **Golden Datasets:** Stworzenie repozytorium prawdziwych próbek audio (human voice, clear speech) zamiast generowanych/pustych.
2.  **Semantic Assertions:** Weryfikacja poprawności nie przez `text.length > 0`, ale przez podobieństwo semantyczne (np. czy odpowiedź LLM ma sens w kontekście).
3.  **Determinizm:** Ustawienie `seed` dla modeli (jeśli wspierane) oraz `temperature=0` w testach.

**Estymowany nakład:** 2-3 dni

---

## Podsumowanie Priorytetów

| # | Zadanie | Priorytet | Nakład | Wpływ |
|---|---------|-----------|--------|-------|
| 1 | `countTokens()` | 🔴 Krytyczny | ✅ DONE | Wysoki |
| 2 | WebGPU backend | 🔴 Krytyczny | 2-4 tyg | Bardzo wysoki |
| 3 | `getContextWindow()` | 🔴 Krytyczny | ✅ DONE | Wysoki |
| 4 | Abort/Cancel | 🟡 Wysoki | 3-5 dni | Średni |
| 5 | JSON Mode | 🟡 Wysoki | 1 tydzień | Wysoki |
| 6 | Function Calling | 🟡 Wysoki | 2 tygodnie | Wysoki |
| 7 | Fix path aliases | 🟢 Średni | ✅ DONE | Niski |
| 8 | Fix ONNX conflict | 🟢 Średni | ✅ DONE | Niski |
| 9 | Typy eventów | 🟢 Średni | ✅ DONE | Niski |
| 10 | Docs streaming | 🟢 Średni | ✅ DONE | Niski |
| 11 | Adaptery integracji | 🟢 Średni | 3 tygodnie | Średni |
| 12 | CLI zarządzania | 🟢 Średni | 1 tydzień | Średni |
| 13 | Model Registry & Types | 🟢 Średni | ✅ DONE | Średni |
| 14 | **Robust Integration Testing** | 🟢 Średni | ✅ DONE | Średni |
| 15 | Refactor `Error` to `ModelNotLoadedError` | 🟢 Niski | ✅ DONE | Niski |
| 16 | Unify error strings (constants) | 🟢 Niski | ✅ DONE | Niski |
| 17 | **Test Quality Review & Rewrite** | 🟢 Średni | ✅ DONE | Średni |
| 18 | **Stagehand Interface** | 🟢 Średni | ✅ DONE | Wysoki |

**Sugerowana kolejność na następny cykl:**
1. Fix ONNX conflict + path aliases (szybkie wygrane)
2. `countTokens()` + `getContextWindow()` (krytyczne dla UX)
3. **Robust Integration Testing** (blokuje CI/CD)
4. **Stagehand Interface** (Ważne dla integracji)
5. **Test Quality Review** (Dług techniczny)
6. Abort/Cancel + typy eventów
5. Dokumentacja streaming + przykłady
6. WebGPU (długoterminowy, ale game-changer)

---

## Przyszłe Rozszerzenia - Auto-Tuning System

### Implementacja w Fazach (patrz: autotuning_plan.md)

#### Faza 0: Model Presets ✅ ZAKOŃCZONE
**Status:** Implementacja statycznych presetów (`chat-light`, `embedding-quality`)  
**Cel:** Foundation dla auto-tuningu - semantic naming dla modeli  
**Nakład:** 1-2 dni

#### Faza 1-5: Auto-Tuning (Priorytetowe)

| # | Funkcja | Priorytet | Nakład | Opis |
|---|---------|-----------|--------|------|
| 1 | **Model Selection** | 🔴 Bardzo wysoki | ✅ ZAKOŃCZONE | Auto-wybór modelu na podstawie RAM, GPU, platform |
| 2 | **DType Selection** | 🔴 Wysoki | ✅ ZAKOŃCZONE | Auto kwantyzacja (fp16/q8/q4) na podstawie zasobów |
| 3 | **Performance Mode** | 🟡 Średni | ✅ ZAKOŃCZONE | Auto fast/balanced/quality w zależności od środowiska |
| 4 | **WASM Threads** | ✅ Już działa | ✅ ZAKOŃCZONE | Ulepszenia istniejącej logiki thread count |
| 5 | **Context/Tokens Limits** | 🟢 Niski | ✅ ZAKOŃCZONE | Auto-limitowanie dla słabych systemów (OOM prevention) |

**Total Faza 1-5:** ~8-12 dni roboczych


### Specyfikacja Refaktoryzacji (Zadania #15, #16)

#### Zadanie #15: Refactor `Error` to `ModelNotLoadedError`

**Cel:** Umożliwienie programistycznej obsługi błędów (np. auto-warmup po złapaniu błędu).

**Wymagania:**
1.  Stworzyć klasę `ModelNotLoadedError` w `src/domain/errors.ts`:
    ```typescript
    export class ModelNotLoadedError extends BaseError {
      constructor(
        message: string,
        public modality: Modality,
        public modelId?: string
      ) {
        super(message);
        this.name = 'ModelNotLoadedError';
      }
    }
    ```
2.  **Use Cases (Gdzie użyć):**
    *   `AIProvider.countTokens()` - gdy config istnieje, ale model nie loaded.
    *   `AIProvider.getContextWindow()`
    *   `AIProvider.chat()`, `speak()`, `listen()` - zastąpić obecne `ValidationError` lub generic `Error` tam, gdzie sprawdzany jest stan załadowania.

#### Zadanie #16: Unify Error Strings

**Cel:** Uniknięcie literówek i niespójnych komunikatów ("Model not loaded" vs "Load model first").

**Wymagania:**
1.  Utworzyć `src/core/error-messages.ts`:
    ```typescript
    export const ERRORS = {
      MODEL: {
        NOT_LOADED: (modality: string) => 
          `Model for ${modality} must be loaded. Call warmup('${modality}') first.`,
        NOT_CONFIGURED: (modality: string) =>
          `${modality} not configured. Add config to createAIProvider().`,
      },
      // ...
    } as const;
    ```
2.  Zastąpić hardcoded stringi w `AIProvider.ts` i `LLMModel.ts`.

---

#### Przyszłe Ulepszenia (Później)

| # | Funkcja | Priorytet | Nakład | Opis |
|---|---------|-----------|--------|------|
| 6 | **Batch Size Tuning** | 🟡 Średni | 2-3 dni | Automatyczny batch size dla embeddings na podstawie RAM/GPU |
| 7 | **Cache Strategy** | 🟢 Niski | 3-5 dni | Inteligentne zarządzanie cache (eviction, quota management) |
| 8 | **Inference Params** | 🟢 Niski | 1-2 dni | Auto-tuning temperature, topK, topP dla różnych use-cases |

**Przykładowe API po auto-tuningu:**
```typescript
const provider = createAIProvider({
  llm: {
    preset: 'chat',      // intencja użytkownika
    autoTune: true       // auto: model + dtype + performance
  }
});

// System automatycznie wybiera:
// - Model: chat-light/medium/heavy na podstawie RAM & GPU  
// - DType: fp16/q8/q4 na podstawie capabilities
// - Performance: fast/balanced/quality
// - Threads: optimal count
// - MaxTokens: safe limits
```

**Więcej:** Szczegóły implementacji w `autotuning_plan.md` (artifact)

---

## Audyt Techniczny — Plan Działania (2026-01-28)

### Metryki Wyjściowe
- **Source LoC:** 13,388 | **Test LoC:** 4,176 | **Test Ratio:** 0.31 (target ≥0.5)
- **Explicit `any` w production:** 6 lokalizacji
- **TODOs w krytycznych ścieżkach:** 4
- **Debug console.log w production:** 150
- **Spin-lock polling patterns:** 7 lokalizacji

---

### 🔴 P0 — Krytyczne (ZAKOŃCZONE ✅)

- [x] **Rozszerzyć `ILLMModel` o brakujące metody**
  - **Plik:** `src/domain/models/index.ts` L22-32
  - **Co:** Dodano `countTokens(text: string): number` i `getContextWindow(): number`
  - **Status:** ✅ DONE — Usunięto `(model as any)` bypass w `AIProvider.ts`

- [x] **Zastąpić spin-lock polling Promise chaining**
  - **Pliki:** `LLMModel.ts`, `STTModel.ts`, `TTSModel.ts`, `OCRModel.ts`, `EmbeddingModel.ts`, `BaseModel.ts`
  - **Co:** Zamieniono `while (this.loading) { await setTimeout(100) }` na `loadingPromise` pattern
  - **Status:** ✅ DONE — Dodano również `loadingPromises` Map w `ModelManager` dla pełnej synchronizacji

---

### 🟡 P1 — Wysokie (ZAKOŃCZONE ✅)

- [x] **Dodać `AbortSignal` support do inference**
  - **Pliki:** `src/core/types.ts`, `src/models/LLMModel.ts`
  - **Co:** Dodano `signal?: AbortSignal` do `ChatOptions` i `CompletionOptions`
  - **Status:** ✅ DONE — Przekazuje `abort_signal` do Transformers.js pipeline

- [ ] **Stworzyć GitHub Actions CI workflow**
  - **Plik:** `.github/workflows/ci.yml` (nowy)
  - **Co:** Build + lint + test:unit + npm audit na każdy PR
  - **Effort:** 1 dzień

- [ ] **Usunąć/zastąpić debug console.log Loggerem**
  - **Zakres:** 150 statements w `src/` (głównie `src/models/`)
  - **Co:** Usunąć lub przekierować do `Logger` interface
  - **Effort:** 1 dzień

---

### 🟢 P2 — Średnie (CZĘŚCIOWO ZAKOŃCZONE)

- [x] **Naprawić conditional import JSDOM**
  - **Plik:** `src/app/vectorization/VectorizationService.ts`
  - **Status:** ✅ DONE — Użyto dynamic `await import('jsdom')`

- [x] **Dodać testy jednostkowe dla modeli**
  - **Pliki:** `tests/node/unit/stt-model.test.ts`, `tts-model.test.ts`, `ocr-model.test.ts`
  - **Status:** ✅ DONE

- [x] **Dodać testy integracyjne dla concurrency**
  - **Pliki:** `tests/node/integration/concurrent-load.test.ts`, `abort-signal.test.ts`
  - **Status:** ✅ DONE

- [ ] **Zaimplementować TODOs w VectorizationService**
  - **Lokalizacje:** L725, L740
  - **Effort:** 3-5 dni

- [ ] **Dodać job cancellation do React/Vue hooks**
  - **Pliki:** `src/ui/react/useVectorization.ts`, `src/ui/vue/useVectorization.ts`
  - **Effort:** 4h

---

### 🔵 P3 — Niskie / Rekomendacje

- [ ] **Weryfikacja cache modeli (Model Persistence Test)**
  - **Cel:** Upewnić się, że LXRT pamięta załadowany model i nie pobiera go za każdym razem
  - **Co:** Dodać integration test sprawdzający że 2x warmup() nie powoduje 2x download
  - **Effort:** 2h

- [ ] **Zaprojektować szynę logów (Logging Bus)**
  - **Cel:** Centralny system logowania dostępny dla developerów i testów
  - **Wymagania:**
    - Interface `LogBus` z metodami `log()`, `warn()`, `error()`, `debug()`
    - Możliwość subskrypcji logów w testach (`logBus.subscribe()`)
    - Integracja z istniejącym `Logger` z `domain/logging/`
  - **Effort:** 1-2 dni

- [ ] **Wprowadzić enum ErrorPattern dla całej aplikacji**
  - **Cel:** Type-safe error patterns zamiast string matching
  - **Wymagania:**
    ```typescript
    export enum ErrorPattern {
      MODEL_NOT_LOADED = 'MODEL_NOT_LOADED',
      MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
      INFERENCE_ABORTED = 'INFERENCE_ABORTED',
      VALIDATION_FAILED = 'VALIDATION_FAILED',
      // ...
    }
    ```
  - **Gdzie użyć:** `src/domain/errors.ts`, wszystkie klasy błędów
  - **Effort:** 0.5 dnia

- [ ] **Dodać `implements IModel` do BaseModel**
  - **Plik:** `src/models/BaseModel.ts` L8
  - **Effort:** 30min

- [ ] **Usunąć pozostałe `any` w StagehandAdapter**
  - **Plik:** `src/adapters/StagehandAdapter.ts` L26, L57
  - **Effort:** 1h

---

## Załączniki

### A. Kod adaptera Stagehand
Lokalizacja: `/home/pyroxar/Pulpit/lxrt/examples/stagehand/src/LxrtLLMProvider.ts`

### B. Zoptymalizowany przykład
Lokalizacja: `/home/pyroxar/Pulpit/lxrt/examples/stagehand/src/index.ts`

### C. Benchmark wyników
- Model: Qwen1.5-0.5B-Chat (q4)
- Czas: 17.56s dla 64 tokenów
- Platform: CPU/WASM (Linux x64)
