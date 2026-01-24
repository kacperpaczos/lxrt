# Dokumentacja Testu: Token Counting & Context Window

**Plik:** `tests/node/unit/token-counting.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `none`

## 1. Cel (Goal)
Brak opisu w nagłówku pliku.

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should throw ValidationError when model is not configured**
*   **should throw ModelNotLoadedError when model is configured but not loaded**
*   **should throw ValidationError when model is not configured**
*   **should throw ModelNotLoadedError when not loaded**
*   **should correctly map family-based context windows**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
