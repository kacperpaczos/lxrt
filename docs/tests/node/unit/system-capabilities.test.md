# Dokumentacja Testu: SystemCapabilitiesDetector

**Plik:** `tests/node/unit/system-capabilities.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `none`

## 1. Cel (Goal)
Brak opisu w nagłówku pliku.

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should detect browser environment correctly**
*   **should detect node environment correctly**
*   **should use fallback RAM for browser if deviceMemory missing**
*   **should cache detection results**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
