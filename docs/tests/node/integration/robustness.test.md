# Dokumentacja Testu: Robustness (Mocked Failures)

**Plik:** `tests/node/integration/robustness.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `integration, robustness`

## 1. Cel (Goal)
Robustness integration tests using mocks to simulate failures

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should wrap internal errors in ModelLoadError**
*   **should validate empty input for chat**
*   **should validate invalid audio data for listen**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
