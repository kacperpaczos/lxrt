# Dokumentacja Testu: Integration: Embeddings flow (Node + ORT)

**Plik:** `tests/node/integration/embeddings.flow.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `embedding, flow, text`

## 1. Cel (Goal)
Embeddings flow integration test - tests full embed/similarity/findSimilar lifecycle

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **warmup → embed → similarity → dispose**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
