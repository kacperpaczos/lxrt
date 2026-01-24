# Dokumentacja Testu: Embeddings Model (Node + ORT)

**Plik:** `tests/node/integration/models/embeddings.model.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `embedding, model, core, text`

## 1. Cel (Goal)
Embeddings Model integration tests - tests vector generation with MiniLM

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **generates embedding dla tekstu**
*   **calculates similarity (cosine) > 0.3 for similar texts**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
