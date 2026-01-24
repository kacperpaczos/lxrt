# Dokumentacja Testu: Integration: Multimodal flow (Node + ORT)

**Plik:** `tests/node/integration/multimodal.flow.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `stt, llm, tts, flow, multimodal, audio`

## 1. Cel (Goal)
Multimodal flow integration tests - tests STT→LLM→TTS chains

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **STT processes audio correctly**
*   **STT → LLM conversation**
*   **STT → LLM → TTS roundtrip**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
