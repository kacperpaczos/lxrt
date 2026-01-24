# Dokumentacja Testu: TTS Model (Node + ORT)

**Plik:** `tests/node/integration/models/tts.model.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `tts, model, core, audio`

## 1. Cel (Goal)
TTS Model integration tests - tests text-to-speech with SpeechT5

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **generates audio from text**
*   **generates różne audio dla różnych tekstów**
*   **handles różne speaker embeddings**
*   **generates audio dla długich tekstów**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
