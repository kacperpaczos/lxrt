# Dokumentacja Testu: OpenAI Adapter (Unit)

**Plik:** `tests/node/unit/adapters/openai.unit.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `unit, adapter, openai`

## 1. Cel (Goal)
Unit tests for OpenAI Adapter (Logic only, no real models)

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should map OpenAI request to AIProvider.chat call**
*   **should handle system messages by prepending to prompt**
*   **should map single input string to embed call**
*   **should map array input to embed call**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
