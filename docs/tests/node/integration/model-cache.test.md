# Dokumentacja Testu: ModelCache (Node + ORT)

**Plik:** `tests/node/integration/model-cache.test.ts`
**Typ:** Integration (Poziom 2 - System)
**Tagi:** `cache, core`

## 1. Cel (Goal)
ModelCache integration tests - tests model caching, expiration, and statistics

## 2. Zakres (Scope)
Test weryfikuje poprawność działania komponentu/modułu w następujących aspektach:
*   **tworzy cache instance**
*   **cacheuje modele po załadowaniu**
*   **cacheuje różne typy modeli**
*   **zwraca undefined dla nieistniejących modeli**
*   **handles cache statistics**
*   **handles cache invalidation**
*   **handles cache clearing**
*   **handles cache expiration**
*   **handles cache size limits**
*   **handles cache hit/miss tracking**

## 3. Metodologia (How)
*   **Środowisko:** Node.js (ONNX Runtime).
*   **Zależności:** Prawdziwe modele (Real Capabilities).
*   **Dane:** Fixtures (tests/fixtures).

## 4. Uzasadnienie (Why)
Test ten weryfikuje zdolność biblioteki do współpracy z rzeczywistym modelem AI. Jest krytyczny dla zapewnienia, że funkcje ML faktycznie działają.
