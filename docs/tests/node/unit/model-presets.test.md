# Dokumentacja Testu: Model Presets

**Plik:** `tests/node/unit/model-presets.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `none`

## 1. Cel (Goal)
Brak opisu w nagłówku pliku.

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should resolve LLM presets to model IDs**
*   **should resolve embedding presets**
*   **should resolve STT presets**
*   **should pass through known model IDs**
*   **should pass through custom model IDs**
*   **should identify valid presets**
*   **should return false for non-presets**
*   **should list all LLM presets**
*   **should list all embedding presets**
*   **should provide type-safe preset names**
*   **should have all modalities**
*   **should have default presets for all modalities**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
