# Dokumentacja Testu: ModelSelector

**Plik:** `tests/node/unit/model-selector.test.ts`
**Typ:** Unit (Poziom 1 - Logic)
**Tagi:** `none`

## 1. Cel (Goal)
Brak opisu w nagłówku pliku.

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **should select HEAVY model for high-end system**
*   **should select MEDIUM model for mid-range system**
*   **should select LIGHT model for low-end system**
*   **should handle completion intent**
*   **should handle default intent**
*   **should ignore other modalities**
*   **should select FP16 for WebGPU with High RAM**
*   **should select Q8 for WebGPU with Low RAM**
*   **should select Q4 for CPU/WASM (default)**
*   **should select Q8 for Node with High RAM**
*   **should respect existing dtype preference**
*   **should select QUALITY for WebGPU + High RAM**
*   **should select BALANCED for WebGPU + Mid/Low RAM**
*   **should select FAST for Browser CPU**
*   **should select BALANCED for Node Standard**
*   **should respect manual setting**
*   **should use half cores (max 4) for Browser WASM**
*   **should ensure at least 1 thread for Browser**
*   **should cap threads at 4 for Browser even if many cores**
*   **should use cores-1 for Node**
*   **should respect manual threads setting**
*   **should limit tokens to 1024 for VERY Low RAM (<2GB)**
*   **should limit tokens to 2048 for Low RAM (2-4GB)**
*   **should NOT limit tokens for High RAM (>4GB)**
*   **should respect manual maxTokens setting**
*   **should ignore non-llm modalities**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (Jest Single Context).
*   **Zależności:** Mockowane (Izolacja logiczna).
*   **Dane:** Dane statyczne/generowane w teście.

## 4. Uzasadnienie (Why)
Test ten jest niezbędny do weryfikacji logiki biznesowej bez narzutu czasowego. Pozwala na szybkie wykrywanie regresji w kodzie.
