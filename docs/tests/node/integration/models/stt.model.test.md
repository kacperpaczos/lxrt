# Dokumentacja Testu: STT Model (Node + ORT)

**Plik:** `tests/node/integration/models/stt.model.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `stt, model, core, audio`

## 1. Cel (Goal)
STT Model integration tests - tests speech-to-text with Whisper

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **transcribes short WAV from fixtures**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
