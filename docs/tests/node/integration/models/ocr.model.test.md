# Dokumentacja Testu: OCR Model (Node + ORT)

**Plik:** `tests/node/integration/models/ocr.model.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `ocr, model, core, image`

## 1. Cel (Goal)
OCR Model integration tests - tests text recognition with TrOCR

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **recognizes text from image**
*   **zwraca metadane rozpoznawania**
*   **handles różne formaty obrazów**
*   **.**
*   **handles opcje OCR**
*   **handles obrazy bez tekstu**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
