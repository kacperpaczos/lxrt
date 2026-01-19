# LXRT + Stagehand Integration Guide

## 1. Wprowadzenie

Integracja **LXRT** z frameworkiem **Stagehand** umożliwia tworzenie inteligentnych, w pełni lokalnych agentów przeglądarkowych. Dzięki wykorzystaniu lokalnych modeli LLM (poprzez silnik LXRT oparty na Transformers.js i ONNX Runtime), możemy automatyzować przeglądarkę, ekstrahować dane i testować aplikacje webowe bez przesyłania danych do chmury i bez ponoszenia kosztów API zewnętrznych dostawców (jak OpenAI czy Anthropic).

### Kluczowe zalety:
- **Prywatność**: Żadne dane ze strony ani prompty nie opuszczają lokalnej maszyny.
- **Koszt**: Zerowy koszt inferencji (działa na Twoim CPU/GPU).
- **Niezależność**: Brak zależności od dostępności zewnętrznych usług i limitów rate-limiting.
- **Szybkość**: W przypadku małych modeli (np. Qwen 0.5B) i akceleracji WebGPU, czas reakcji może być bardzo krótki.

---

## 2. Architektura Rozwiązania

Rozwiązanie opiera się na stworzeniu niestandardowego dostawcy LLM (`LxrtLLMProvider`), który implementuje interfejs klienta wymagany przez Stagehand, ale pod spodem deleguje zadania do silnika LXRT.

### Diagram Komponentów i Przepływu Danych

```mermaid
graph TD
    subgraph "Stagehand Framework"
        SH[Stagehand V3]
        LLMC[Abstract LLMClient]
        
        SH -->|uses| LLMC
    end

    subgraph "Integracja (Lokalna)"
        LXP[LxrtLLMProvider]
        
        LLMC <|-- LXP
    end

    subgraph "LXRT Library"
        AIP[AIProvider]
        OA[OpenAI Adapter Interface]
        ENG[Inference Engine\n(Transformers.js)]
        
        LXP -->|delegates calls| AIP
        AIP -->|manages| ENG
    end

    subgraph "Hardware / Runtime"
        ONNX[ONNX Runtime]
        HW[CPU / WebGPU]
        
        ENG -->|executes| ONNX
        ONNX -->|runs on| HW
    end

    SH -- 1. Instruction & DOM --> LXP
    LXP -- 2. Formatted Prompt --> AIP
    AIP -- 3. Inference --> ONNX
    ONNX -- 4. Generated Tokens --> AIP
    AIP -- 5. Text Response --> LXP
    LXP -- 6. Structured JSON --> SH
```

### Sekwencja Działania

1. **Inicjalizacja**: Użytkownik tworzy instancję `AIProvider` (LXRT) z wybranym modelem (np. `Qwen2.5-0.5B`) i przekazuje ją do konstruktora `LxrtLLMProvider`.
2. **Setup Stagehand**: `LxrtLLMProvider` jest przekazywany do konfiguracji `Stagehand` jako `llmClient`.
3. **Akcja**: Użytkownik wywołuje np. `stagehand.extract()`.
4. **Przetwarzanie**:
   - Stagehand analizuje DOM i tworzy prompt z instrukcją.
   - Wywołuje `llmClient.createChatCompletion()`.
   - `LxrtLLMProvider` odbiera zapytanie, formatuje je dla modelu (dodając instrukcje JSON schema jeśli wymagane) i wywołuje `provider.chat()`.
   - LXRT generuje odpowiedź lokalnie.
5. **Wynik**: `LxrtLLMProvider` parsuje odpowiedź (często wyciągając JSON z bloku kodu) i zwraca ją do Stagehand w oczekiwanym formacie.

---

## 3. Implementacja Techniczna

### Klasa `LxrtLLMProvider`

Jest to serce integracji. Klasa ta dziedziczy po abstrakcyjnej klasie `LLMClient` z pakietu `@browserbasehq/stagehand`.

**Kluczowe wyzwania rozwiązane w implementacji:**

1. **Obsługa Structured Outputs**:
   Stagehand mocno polega na zwracaniu przez LLM ściśle określonych struktur JSON (zdefiniowanych przez Zod schema). Większość lokalnych małych modeli (SLM) nie wspiera natywnego "function calling" na poziomie API w taki sposób jak GPT-4.
   *Rozwiązanie*: `LxrtLLMProvider` konwertuje schemat Zod do JSON Schema i dokleja go do promptu systemowego z instrukcją "Output strictly valid JSON...". Następnie parsuje odpowiedź tekstową modelu ("json mode" via prompt engineering).

2. **Mapowanie Wiadomości**:
   Różnice w formacie wiadomości między Stagehand (OpenAI-like z dodatkami) a LXRT (uproszczone Message[]).
   *Rozwiązanie*: Prosta transformacja w locie wewnątrz metody `createChatCompletion`.

**Przykładowy kod adaptera:**

```typescript
export class LxrtLLMProvider extends LLMClient {
  constructor(provider: AIProvider, modelName = 'local-llm') {
    super(modelName, "You are a helpful AI assistant...");
    this.provider = provider;
  }

  async createChatCompletion(options) {
    const { messages, response_model } = options.options;
    
    // 1. Wstrzykiwanie schematu JSON do promptu
    if (response_model) {
        const schema = toJsonSchema(response_model.schema);
        /* Append instruction to system prompt */
    }

    // 2. Wywołanie LXRT
    const response = await this.provider.chat(mappedMessages, { ... });

    // 3. Parsowanie wyniku
    if (response_model) {
        return { data: JSON.parse(extractedJson) };
    }
    
    return { ...standardResponse };
  }
}
```

---

## 4. Potencjalne Scenariusze Użycia (Use Cases)

### A. Ad-hoc Web Scraping (Ekstrakcja Danych)
Pobieranie ustrukturyzowanych danych ze stron, które nie posiadają API, a ich struktura HTML jest zmienna.

**Przykład:** Pobieranie cen produktów z lokalnego sklepu e-commerce.
*   **Prompt**: "Znajdź nazwę produktu i cenę na tej stronie."
*   **Schema**: `{ product: string, price: number }`
*   **Zaleta LXRT**: Możesz scrapować tysiące stron bez kosztów za tokeny.

### B. Inteligentne Testy E2E (Self-healing Tests)
Testy, które są odporne na zmiany w UI (np. zmiana ID przycisku czy klasy CSS). Zamiast selektorów CSS (`#submit-btn`), używamy intencji (`Click the login button`).

**Przykład:** Testowanie procesu logowania po redesignie.
*   **Action**: `stagehand.act("Click the login button")`
*   **Zaleta**: Test przejdzie nawet jeśli przycisk zmienił kolor, położenie i klasę, o ile nadal wygląda jak przycisk logowania (analiza DOM/tekstu przez LLM).

### C. Automatyzacja Procesów Biznesowych (RPA)
Wypełnianie formularzy danymi z plików lokalnych.

**Przykład:** Automatyczne wypełnianie zgłoszeń w wewnętrznym systemie firmowym.
*   **Flow**: Odczyt CSV -> `stagehand.page.goto(intranet)` -> `stagehand.act("Fill the form with...")`.
*   **Zaleta**: Dane wrażliwe (np. dane osobowe pracowników) nigdy nie opuszczają komputera (RODO/GDPR compliance out-of-the-box).

---

## 5. Konfiguracja i Uruchomienie

### Wymagania
- Node.js >= 22 (rekomendowane z uwagi na Stagehand).
- LXRT v0.6.0+.
- Przeglądarka Chromium (instalowana przez Playwright).

### Instalacja w projekcie

```bash
npm install lxrt @browserbasehq/stagehand zod dotenv
```

> **Uwaga dot. ESM**: LXRT jest dystrybuowane jako moduł ESM. Podczas uruchamiania w Node.js może być wymagane użycie flagi `--experimental-specifier-resolution=node` lub odpowiedniego loadera (np. through `tsx`), aby poprawnie rozwiązywać importy plików `.js`.

### Przykład `package.json`

```json
{
  "type": "module",
  "scripts": {
    "start": "node --experimental-specifier-resolution=node dist/index.js"
  }
}
```

---

## 6. Ograniczenia i Rozwiązywanie Problemów

| Problem | Opis | Rozwiązanie |
|---------|------|-------------|
| **Błędy importu** (`ERR_MODULE_NOT_FOUND`) | Node.js w trybie ESM wymaga rozszerzeń `.js` w importach, których build LXRT może nie dodawać. | Użyj flagi `--experimental-specifier-resolution=node` przy uruchamianiu skryptu. |
| **Wydajność** | Lokalne modele są wolniejsze niż API chmurowe na słabszym sprzęcie. | Użyj modeli kwantyzowanych (`q4`), włącz akcelerację WebGPU (jeśli dostępna) lub mniejszych modeli (np. `Qwen 0.5B` zamiast `7B`). |
| **Dokładność (Hallucinations)** | Małe modele (0.5B - 3B) mogą mieć trudności ze skomplikowanymi instrukcjami JSON. | Dopracuj prompt systemowy, używaj prostszych schematów Zod, rozważ model `Phi-3` lub `Gemma-2B`. |
| **Brak Vision** | Obecna implementacja przykładu używa modelu tekstowego (`provider.chat`), więc `stagehand` "widzi" tylko tekstową reprezentację DOM (Accessibility Tree), a nie screenshoty. | LXRT wspiera modele Vision-Language (VLM). Można rozszerzyć `LxrtLLMProvider` o obsługę obrazów (przekazywanie screenshotów do modelu VLM via LXRT). |
