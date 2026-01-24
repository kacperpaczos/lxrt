# Dokumentacja Testu: ProgressTracker (Node + ORT)

**Plik:** `tests/node/unit/progress-tracker.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `none`

## 1. Cel (Goal)
Brak opisu w nagłówku pliku.

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **tworzy tracker instance**
*   **handles progress events**
*   **progress**
*   **handles error events**
*   **error**
*   **handles complete events**
*   **complete**
*   **handles multiple listeners**
*   **handles listener removal**
*   **handles once listeners**
*   **handles progress tracking**
*   **handles progress chaining**
*   **handles progress error handling**
*   **handles progress cleanup**
*   **handles progress statistics**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
