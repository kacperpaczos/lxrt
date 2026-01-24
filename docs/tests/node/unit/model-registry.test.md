# Dokumentacja Testu: Model Registry

**Plik:** `tests/node/unit/model-registry.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `none`

## 1. Cel (Goal)
Brak opisu w nagłówku pliku.

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should identify known models**
*   **should retrive model info**
*   **should provide type-safety for known models**
*   **should retrieve helper info**
*   **should use registry for context window lookup**
*   **should use fallback for family matching**
*   **should use hardcoded fallback for unknown models**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
