# Dokumentacja Testu: AIProvider lifecycle (Node + ORT)

**Plik:** `tests/node/integration/ai-provider.lifecycle.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `lifecycle, core`

## 1. Cel (Goal)
AIProvider lifecycle integration tests - tests warmup/unload/config management

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **warms up LLM before inference and keeps it ready**
*   **provides embeddings after explicit warmup**
*   **reports statuses for every configured modality**
*   **unloads models and reloads them on demand**
*   **updates configuration and reloads affected models**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
