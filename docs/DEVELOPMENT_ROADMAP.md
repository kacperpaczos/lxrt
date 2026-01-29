# LXRT - Development Roadmap

**Ostatnia aktualizacja:** 2026-01-29  
**Status:** Aktywny rozwój

---

## 📋 DO ZROBIENIA (TODO)

### 🟡 Wysokie

#### Abort/Cancel dla Inference
**Problem:** Nie można przerwać trwającego inference w pełni (częściowo zaimplementowane w LLMModel).

**Status:** Częściowo done — `AbortSignal` w `ChatOptions`, brakuje pełnej propagacji do pipeline.

**Nakład:** 3-5 dni

---

#### JSON Mode
**Problem:** Brak gwarancji że model zwróci poprawny JSON.

**Proponowane API:**
```typescript
const response = await provider.chat(messages, {
    responseFormat: { 
        type: "json_object",
        schema: z.object({ talks: z.array(...) })
    }
});
```

**Nakład:** 1 tydzień

---

#### Function Calling
**Problem:** Brak natywnego wsparcia dla tool/function calling.

**Proponowane API:**
```typescript
const response = await provider.chat(messages, {
    tools: [{
        type: "function",
        function: {
            name: "extract_event",
            parameters: { type: "object", properties: {...} }
        }
    }]
});
```

**Nakład:** 2 tygodnie

---

## ✅ ZAKOŃCZONE (DONE)

### Krytyczne (P0)
- [x] **WebGPU Backend** — Full WebGPU acceleration support (10-50x speedup)
- [x] **countTokens()** — `provider.countTokens(text)`
- [x] **getContextWindow()** — `provider.getContextWindow()`
- [x] **Interface Consistency** — `ILLMModel` z `countTokens` i `getContextWindow`
- [x] **Spin-Lock Removal** — Promise-based `loadingPromise` we wszystkich modelach
- [x] **ModelManager Concurrency** — Race condition fix z deferred promise

### Wysokie (P1)
- [x] **AbortSignal Support** — `signal?: AbortSignal` w `ChatOptions`

### Średnie (P2)
- [x] **Adaptery Integracji** — LangChain (`@lxrt/langchain`), Vercel AI SDK (`@lxrt/vercel-ai`), Stagehand (`@lxrt/stagehand`)
- [x] **CLI Zarządzania Modelami** — `lxrt pull`/`list`/`remove`
- [x] **VectorizationService Enhancements** — PDF (`pdf-parse`), DOCX (`mammoth`), Smart TextSplitter
- [x] **Logger Cleanup** — LogBus integration
- [x] **Fix Path Aliases** — `tsc-alias` w build pipeline
- [x] **Fix ONNX Conflict** — Usunięto bezpośrednią zależność
- [x] **Typy Eventów** — `ProgressEvent`, `ReadyEvent` wyeksportowane
- [x] **Docs Streaming** — Dokumentacja `provider.stream()`
- [x] **Model Registry & Types** — Type-safe model selection
- [x] **Robust Integration Testing** — Golden datasets, semantic assertions
- [x] **Test Quality Review** — 3-tier architecture, fixtures
- [x] **Stagehand Interface** — `StagehandAdapter` z OpenAI-compatible API
- [x] **JSDOM Refactor** — Dynamic `await import('jsdom')`
- [x] **Unit Tests** — STT, TTS, OCR model tests
- [x] **Integration Tests** — `concurrent-load.test.ts`, `abort-signal.test.ts`
- [x] **Job Cancellation w Hooks** — AbortController w React/Vue

### Niskie (P3)
- [x] **Model Persistence Test** — `model-persistence.test.ts`
- [x] **LogBus** — `src/core/logging/LogBus.ts` z subscribe()
- [x] **ErrorPattern Enum** — 10 patternów + `LxrtError` base class
- [x] **BaseModel implements IModel**
- [x] **StagehandAdapter typed** — Usunięto `any`
- [x] **Refactor Error to ModelNotLoadedError**
- [x] **Unify Error Strings** — Error message constants
- [x] **GitHub Actions CI** — `.github/workflows/ci.yml`

### Auto-Tuning System (Fazy 0-5)
- [x] **Faza 0:** Model Presets (`chat-light`, `embedding-quality`)
- [x] **Faza 1:** Model Selection (auto-wybór na podstawie RAM, GPU)
- [x] **Faza 2:** DType Selection (auto kwantyzacja fp16/q8/q4)
- [x] **Faza 3:** Performance Mode (fast/balanced/quality)
- [x] **Faza 4:** WASM Threads (thread count optimization)
- [x] **Faza 5:** Context/Tokens Limits (OOM prevention)

---

## 📊 Podsumowanie

| Kategoria | Do zrobienia | Zakończone |
|-----------|--------------|------------|
| 🔴 Krytyczne | 0 | 6 |
| 🟡 Wysokie | 3 | 1 |
| 🟢 Średnie | 0 | 18 |
| 🔵 Niskie | 0 | 8 |
| **Razem** | **3** | **33** |
