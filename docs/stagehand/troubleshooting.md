# Ograniczenia i Rozwiązywanie Problemów

## Typowe Problemy

### 1. Błędy importu (`ERR_MODULE_NOT_FOUND`)
**Objaw**: Błąd `Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...` podczas uruchamiania.
**Przyczyna**: Node.js w trybie ESM wymaga rozszerzeń `.js` w importach.
**Rozwiązanie**:
- Upewnij się, że LXRT jest zbudowane (`npm run build`).
- Użyj flagi `--experimental-specifier-resolution=node` lub odpowiedniego loadera (np. `tsx`).

### 2. Model nie generuje poprawnego JSON
**Objaw**: Błąd `Failed to parse structured output` lub `SyntaxError`.
**Przyczyna**: Małe modele (poniżej 3B parametrów) mają trudności z generowaniem złożonych struktur JSON.
**Rozwiązanie**:
- **Zmień model**: Użyj modelu 3B+ (np. `Qwen2.5-3B-Instruct`, `Phi-3-mini`).
- **Uprość schema**: Jeśli to możliwe, zmniejsz złożoność oczekiwanego obiektu JSON.
- **Dodaj przykłady**: W promptcie systemowym (w kodzie adaptera) można dodać więcej przykładów expected output.

### 3. Przeglądarka się nie uruchamia
**Objaw**: `ChromePathNotSetError` lub błąd Playwright.
**Rozwiązanie**:
- Upewnij się, że masz Chromium: `npx playwright install chromium`.
- Ustaw zmienną środowiskową: `export CHROME_PATH=/ścieżka/do/chrome`.

### 4. Wydajność
**Objaw**: Wolne działanie modelu.
**Rozwiązanie**:
- Użyj modeli kwantyzowanych (`q4`).
- Włącz akcelerację WebGPU (jeśli sprzęt pozwala).
- Rozważ użycie mniejszego modelu, jeśli zadanie jest proste (np. klasyfikacja tekstu, a nie ekstrakcja JSON).

### 5. Brak Vision (Obrazu)
**Objaw**: Stagehand "nie widzi" układu wizualnego, tylko tekst (DOM).
**Przyczyna**: Obecna implementacja przykładu używa modelu tekstowego (`provider.chat`), więc `stagehand` przekazuje tylko tekstową reprezentację DOM (Accessibility Tree).
**Rozwiązanie**:
- LXRT wspiera modele Vision-Language (VLM). Można rozszerzyć `LxrtLLMProvider` o obsługę obrazów (przekazywanie screenshotów do modelu VLM via LXRT).
