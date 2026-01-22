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

## Podsumowanie Priorytetów

| # | Zadanie | Priorytet | Nakład | Wpływ |
|---|---------|-----------|--------|-------|
| 1 | `countTokens()` | 🔴 Krytyczny | 2-3 dni | Wysoki |
| 2 | WebGPU backend | 🔴 Krytyczny | 2-4 tyg | Bardzo wysoki |
| 3 | `getContextWindow()` | 🔴 Krytyczny | 1-2 dni | Wysoki |
| 4 | Abort/Cancel | 🟡 Wysoki | 3-5 dni | Średni |
| 5 | JSON Mode | 🟡 Wysoki | 1 tydzień | Wysoki |
| 6 | Function Calling | 🟡 Wysoki | 2 tygodnie | Wysoki |
| 7 | Fix path aliases | 🟢 Średni | 0.5 dnia | Niski |
| 8 | Fix ONNX conflict | 🟢 Średni | 0.5 dnia | Niski |
| 9 | Typy eventów | 🟢 Średni | 0.5 dnia | Niski |
| 10 | Docs streaming | 🟢 Średni | 0.5 dnia | Niski |
| 11 | Adaptery integracji | 🟢 Średni | 3 tygodnie | Średni |
| 12 | CLI zarządzania | 🟢 Średni | 1 tydzień | Średni |
| 13 | Model Registry & Types | 🟢 Średni | 2-3 dni | Średni |

**Sugerowana kolejność na następny cykl:**
1. Fix ONNX conflict + path aliases (szybkie wygrane)
2. `countTokens()` + `getContextWindow()` (krytyczne dla UX)
3. Abort/Cancel + typy eventów
4. Dokumentacja streaming + przykłady
5. WebGPU (długoterminowy, ale game-changer)

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
