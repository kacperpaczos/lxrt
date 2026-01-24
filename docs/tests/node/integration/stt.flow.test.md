# Dokumentacja Testu: Integration: STT flow (Node + ORT)

**Plik:** `tests/node/integration/stt.flow.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `stt, flow, audio`

## 1. Cel (Goal)
STT flow integration test - tests full speech-to-text lifecycle

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **warmup → listen → dispose**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
