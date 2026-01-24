# Dokumentacja Testu: LangChain Adapter (Node + ORT)

**Plik:** `tests/node/integration/adapters/langchain.adapter.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `adapter, langchain`

## 1. Cel (Goal)
LangChain Adapter integration tests - tests LangChain-compatible interface

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **tworzy adapter z providerem**
*   **handles LLM chain**
*   **handles embedding chain**
*   **handles batch embeddings**
*   **handles streaming**
*   **handles różne parametry**
*   **handles conversation memory**
*   **handles różne typy inputów**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
