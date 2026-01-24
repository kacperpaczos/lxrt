# Dokumentacja Testu: LLM Model (Node + ORT)

**Plik:** `tests/node/integration/models/llm.model.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `llm, model, core, text`

## 1. Cel (Goal)
LLM Model integration tests - tests text generation with GPT-2

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **generates text from prompt**
*   **generates różne odpowiedzi dla różnych promptów**
*   **respects maxTokens limit**
*   **handles różne style generowania**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
