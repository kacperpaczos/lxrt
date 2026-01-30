# LXRT: Product Strategy & Analysis

> **Status:** Draft / Accepted for v0.7.x
> **Date:** 2026-01-30
> **Owner:** Product Management

---

## 1. Executive Summary: The "Local-First" AI Infrastructure

LXRT aims to be the standard "Infrastructure Layer" for local AI in TypeScript environments, unifying LLM, TTS, STT, Embeddings, and OCR under a single, type-safe API.

**Verdict:** **PLATFORM-READY (BETA)** / **EARLY ADOPTERS**
The core promise of "Unified Local AI" is technically valid but functionally fragile. It is not yet a "drop-in" production solution for enterprise, but it is a highly capable foundation for edge-computing and privacy-focused applications.

---

## 2. Feature Inventory: Promises vs. Reality

| Feature | Promised (Docs/Marketing) | Implemented | Reality Check / Gap Analysis |
| :--- | :--- | :--- | :--- |
| **LLM Inference** | WebGPU massive speedup (10-50x) | ✅ Implemented | **Browser:** Excellent. **Node:** Placeholder only (`GpuDetector` stub). Node users are stuck with CPU/WASM. |
| **Multi-modal** | LLM, TTS, STT, Embedding, OCR | ✅ Implemented | API is unified, but relies heavily on specific model architectures (Whisper, SpeechT5). OCR is Tesseract.js wrapper (solid but separate ecosystem). |
| **Unified API** | One `AIProvider` for everything | ✅ Implemented | **Success.** The facade works well. `warmup('llm')` vs `chat()` logic is clean. |
| **Vector/RAG** | PDF/DOCX support, Local Vector Store | ⚠️ Partial | `VectorizationService` exists and handles PDF/DOCX, but is tightly coupled to `IndexedDB`. No abstraction for other stores (e.g., PGVector, SQLite) yet. |
| **Tool Use** | Function Calling, JSON Mode | ✅ Implemented | Basic regex/parsing implementation in `LLMModel`. Works for simple cases, likely fragile for complex nested JSON. |
| **Integration** | Vercel AI SDK, Stagehand, LangChain | ✅ Implemented | Adapters exist but are thin wrappers. `StagehandAdapter` blindly delegates to `OpenAIAdapter`. |

---

## 3. Product Quality Assessment

### 🏗️ Architecture & Evolvability (Score: 3/5)
*   **Strengths:** Clear separation of `App` (Facade), `Domain` (Logic), and `Infra` (Workers/Store).
*   **Weaknesses:**
    *   **God Object:** `src/core/types.ts` (500+ lines) couples every domain configuration together. Modifying `LLMConfig` forces a rebuild of the entire type system.
    *   **Direct Instantiation:** `ModelManager` creates `new LLMModel(...)` directly. Hard to unit test or swap implementations without Dependency Injection.

### 🛠️ Developer Experience (DX) (Score: 4/5)
*   **Strengths:**
    *   **Type-Safety:** Excellent usage of TypeScript. `SupportedLLM` and string literal unions make discovery easy.
    *   **Presets:** `chat-light`, `chat-heavy` are brilliant abstractions for non-AI experts.
    *   **Events:** Rich event system (`progress`, `ready`) is perfect for UI loaders.
*   **Weaknesses:**
    *   **Engine Requirement:** `Node >= 24.13` is an extremely aggressive constraint, severely limiting adoption in standard enterprise environments (usually Node 18/20 LTS).

### 🛡️ Reliability & Stability (Score: 3/5)
*   **Strengths:** `loadingPromises` map prevents race conditions during async model loading.
*   **Weaknesses:**
    *   **Error Swallowing:** Adapters (e.g., `OpenAIAdapter`) often catch specific errors and re-throw generic `Error` objects, hiding the root cause (OOM, missing file, etc.) from the user.
    *   **Memory Management:** Loading multiple modalities (LLM + TTS + Embedding) in a browser tab will likely crash (OOM) on standard hardware. No built-in memory pressure manager.

---

## 4. Problem-Solution Fit

### Target Persona
1.  **The "Privacy-First" App Dev:** Building local note-taking apps (Obsidian plugins), personal assistants, or medical/legal data processors where data cannot leave the device.
2.  **The "Zero-Cost" Prototyper:** Wants to test RAG pipelines without paying OpenAI API tokens.

### Barriers to Adoption
1.  **Hardware Lottery:** WebGPU support varies wildly across browsers/OS. The library needs better fallback messaging ("Your GPU is unsupported, falling back to slow WASM").
2.  **Node Version:** Requiring Node 24 is a dealbreaker for most backend deployments.
3.  **Model Download Size:** Downloading 2GB+ models inside a browser cache is flaky UX.

---

## 5. Strategic Roadmap & TODOs

### Phase 1: Quick Wins (Stabilization)
*   [ ] **[Critical] Decouple `types.ts`:** Split into domains (`@domain/llm`, `@domain/tts`) to stop the "God Object" growth.
*   [ ] **[DX] Node LTS Support:** Investigate if Node 24 is truly required or if we can polyfill for Node 22 (LTS). This opens 90% of the market.
*   [ ] **[Reliability] Memory Manager:** Implement a simple `MemoryBudget` service that unloads the Embedding model before loading the LLM if RAM is tight.

### Phase 2: Mid-Term (Architecture)
*   [ ] **Dependency Injection:** Refactor `ModelManager` to accept a `ModelFactory`. Enables testing and swapping `transformers.js` for other backends (e.g., `llama.cpp` bindings) in the future.
*   [ ] **Vector Store Abstraction:** Interface `IVectorStore` to allow swapping `IndexedDB` for `SQLite` or `pgvector`.
*   [ ] **Node.js WebGPU:** Implement the actual `@gpu` bindings for Node.js to fulfill the "Universal" promise.

### Phase 3: Long-Term (Expansion)
*   [ ] **Agentic Runtime:** Build "Long-term Memory" and "Plan-Execute" agent loops directly into the core, leveraging the local latency advantage.
*   [ ] **Plugin System:** Allow community to add new modalities (e.g., "Depth Estimation " or "MusicGen") without forking the repo.

---
**See also:**
- [High Level Interfaces](./concepts/HIGH_LEVEL_INTERFACES.md) - Future "Composite" primitives.
- [Development Roadmap](./DEVELOPMENT_ROADMAP.md) - Active tasks.
