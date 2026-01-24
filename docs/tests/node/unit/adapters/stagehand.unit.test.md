# Dokumentacja Testu: Stagehand Adapter (Unit)

**Plik:** `tests/node/unit/adapters/stagehand.unit.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `unit, adapter, stagehand`

## 1. Cel (Goal)
Unit tests for Stagehand Adapter (OpenAI Client Interface)

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should expose chat.completions.create structure**
*   **should delegate chat completion to provider**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
