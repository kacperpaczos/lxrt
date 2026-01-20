# Scenariusze Użycia

Oto przykłady zastosowań integracji Stagehand z lokalnym modelem LXRT.

## A. Ad-hoc Web Scraping (Ekstrakcja Danych)

Pobieranie ustrukturyzowanych danych ze stron, które nie posiadają API, a ich struktura HTML jest zmienna.

**Przykład:** Pobieranie cen produktów z lokalnego sklepu e-commerce.

- **Prompt**: "Znajdź nazwę produktu i cenę na tej stronie."
- **Schema**: `{ product: string, price: number }`
- **Zaleta LXRT**: Możesz scrapować tysiące stron bez kosztów za tokeny i bez obawy o prywatność danych analizowanych przez API.

## B. Inteligentne Testy E2E (Self-healing Tests)

Testy, które są odporne na zmiany w UI (np. zmiana ID przycisku czy klasy CSS). Zamiast selektorów CSS (`#submit-btn`), używamy intencji (`Click the login button`).

**Przykład:** Testowanie procesu logowania po redesignie.

- **Action**: `stagehand.act("Click the login button")`
- **Zaleta**: Test przejdzie nawet jeśli przycisk zmienił kolor, położenie i klasę, o ile nadal wygląda jak przycisk logowania (analiza DOM wstawiana do LLM pozwala na zrozumienie semantyki elementu).

## C. Automatyzacja Procesów Biznesowych (RPA)

Wypełnianie formularzy danymi z plików lokalnych.

**Przykład:** Automatyczne wypełnianie zgłoszeń w wewnętrznym systemie firmowym.

- **Flow**: Odczyt CSV -> `stagehand.page.goto(intranet)` -> `stagehand.act("Fill the form with...")`.
- **Zaleta**: Dane wrażliwe (np. dane osobowe pracowników, dane finansowe) nigdy nie opuszczają komputera, co ułatwia zgodność z RODO/GDPR.
