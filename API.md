# API Reference - LXRT

Pełna dokumentacja API biblioteki LXRT.

---

## Spis Treści

1. [Inicjalizacja](#inicjalizacja)
2. [AIProvider](#aiprovider)
3. [Modele](#modele)
4. [Adaptery](#adaptery)
5. [Typy](#typy)
6. [Zdarzenia](#zdarzenia)
7. [Błędy](#błędy)

---

## Inicjalizacja

### `createAIProvider(config)`

Tworzy instancję AIProvider z podaną konfiguracją.

```typescript
import { createAIProvider } from 'lxrt';

const provider = createAIProvider({
  llm: {
    model: 'onnx-community/Qwen2.5-0.5B-Instruct',
    dtype: 'q4',
    maxTokens: 100,
    temperature: 0.7,
  },
  tts: {
    model: 'Xenova/speecht5_tts',
    dtype: 'fp32',
  },
  stt: {
    model: 'Xenova/whisper-tiny',
    dtype: 'fp32',
  },
  embedding: {
    model: 'Xenova/all-MiniLM-L6-v2',
    dtype: 'fp32',
  },
  ocr: {
    language: ['eng', 'pol'],
  },
});
```

**Parametry:**

| Pole | Typ | Opis |
|------|-----|------|
| `llm` | `LLMConfig` | Konfiguracja modelu LLM |
| `tts` | `TTSConfig` | Konfiguracja syntezatora mowy |
| `stt` | `STTConfig` | Konfiguracja rozpoznawania mowy |
| `embedding` | `EmbeddingConfig` | Konfiguracja embeddingów |
| `ocr` | `OCRConfig` | Konfiguracja OCR |

---

## AIProvider

Główna klasa fasadowa biblioteki.

### Metody LLM

#### `chat(messages, options?)`

Rozmowa z modelem LLM z obsługą historii wiadomości.

```typescript
// Prosty tekst
const response = await provider.chat('Cześć, jak się masz?');

// Z historią wiadomości
const response = await provider.chat([
  { role: 'system', content: 'Jesteś pomocnym asystentem.' },
  { role: 'user', content: 'Co to jest TypeScript?' },
]);

console.log(response.content); // Odpowiedź modelu
console.log(response.usage);   // { promptTokens, completionTokens, totalTokens }
```

**Parametry:**

| Nazwa | Typ | Opis |
|-------|-----|------|
| `messages` | `Message[] \| string` | Wiadomości lub pojedynczy tekst |
| `options` | `ChatOptions` | Opcje generacji |

**ChatOptions:**

| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `maxTokens` | `number` | 100 | Maksymalna liczba tokenów |
| `temperature` | `number` | 0.7 | Kreatywność (0-1) |
| `topP` | `number` | 0.9 | Nucleus sampling |
| `topK` | `number` | 50 | Top-K sampling |
| `repetitionPenalty` | `number` | 1.0 | Kara za powtórzenia |
| `stopSequences` | `string[]` | - | Sekwencje zatrzymania |
| `systemPrompt` | `string` | - | Prompt systemowy |

**Zwraca:** `Promise<ChatResponse>`

---

#### `complete(prompt, options?)`

Generacja tekstu bez historii.

```typescript
const text = await provider.complete('Napisz wiersz o:', {
  maxTokens: 50,
  temperature: 0.9,
});
```

**Zwraca:** `Promise<string>`

---

#### `stream(messages, options?)`

Streaming odpowiedzi token po tokenie (AsyncGenerator).

**Parametry:**

| Nazwa | Typ | Opis |
|-------|-----|------|
| `messages` | `Message[] \| string` | Wiadomości lub pojedynczy tekst |
| `options` | `ChatOptions` | Opcje generacji (jak w `chat()`) |

**Zwraca:** `AsyncGenerator<string>` - kolejne tokeny odpowiedzi

**Podstawowy przykład:**

```typescript
for await (const token of provider.stream('Opowiedz historię')) {
  process.stdout.write(token);
}
```

**Z timeout i error handling:**

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  let fullResponse = '';
  for await (const token of provider.stream(messages)) {
    process.stdout.write(token);
    fullResponse += token;
  }
  console.log('\n\nFull response:', fullResponse);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Streaming anulowany (timeout)');
  } else {
    console.error('Błąd streamingu:', error);
  }
} finally {
  clearTimeout(timeout);
}
```

**Zbieranie odpowiedzi do stringa:**

```typescript
const tokens: string[] = [];
for await (const token of provider.stream('Napisz wiersz')) {
  tokens.push(token);
}
const fullText = tokens.join('');
```

---

### Metody TTS (Text-to-Speech)

#### `speak(text, options?)`

Synteza mowy z tekstu.

```typescript
const audioBlob = await provider.speak('Witaj świecie!', {
  voiceProfile: 'professional-female',
  speed: 1.0,
});

// Zapisz do pliku lub odtwórz
const url = URL.createObjectURL(audioBlob);
const audio = new Audio(url);
audio.play();
```

**TTSOptions:**

| Pole | Typ | Opis |
|------|-----|------|
| `speaker` | `string \| Float32Array` | ID mówcy lub embedding |
| `voiceProfile` | `string` | ID profilu głosowego |
| `speed` | `number` | Prędkość mowy |
| `pitch` | `number` | Wysokość głosu |
| `emotion` | `VoiceEmotion` | Emocja głosu |
| `format` | `'wav' \| 'mp3' \| 'ogg'` | Format wyjściowy |

**Zwraca:** `Promise<Blob>`

---

### Metody STT (Speech-to-Text)

#### `listen(audio, options?)`

Transkrypcja audio na tekst.

```typescript
// Z Blob
const text = await provider.listen(audioBlob);

// Z URL
const text = await provider.listen('https://example.com/audio.mp3');

// Z Float32Array
const text = await provider.listen(audioData, {
  language: 'pl',
  task: 'transcribe',
});
```

**STTOptions:**

| Pole | Typ | Opis |
|------|-----|------|
| `language` | `string` | Język audio (np. 'pl', 'en') |
| `task` | `'transcribe' \| 'translate'` | Zadanie |
| `timestamps` | `boolean` | Zwróć znaczniki czasowe |

**Zwraca:** `Promise<string>`

---

### Metody OCR

#### `recognize(image, options?)`

Rozpoznawanie tekstu z obrazu.

```typescript
const result = await provider.recognize(imageFile, {
  language: ['pol', 'eng'],
  autoLanguage: true,
});

console.log(result.text);       // Rozpoznany tekst
console.log(result.confidence); // Pewność (0-1)
console.log(result.words);      // Słowa z pozycjami
```

**OCROptions:**

| Pole | Typ | Opis |
|------|-----|------|
| `language` | `string \| string[]` | Język(i) OCR |
| `autoLanguage` | `boolean` | Automatyczne wykrywanie języka |
| `includeBbox` | `boolean` | Zwróć bounding boxy |
| `includeConfidence` | `boolean` | Zwróć pewność słów |

**OCRResult:**

```typescript
interface OCRResult {
  text: string;
  confidence: number;
  words?: Array<{
    text: string;
    bbox: { x0, y0, x1, y1 };
    confidence: number;
  }>;
  detectedLanguages?: Array<{ lang: string; score: number }>;
}
```

---

### Metody Embeddings

#### `embed(text, options?)`

Generacja embeddingów dla tekstu.

```typescript
const embeddings = await provider.embed(['Tekst 1', 'Tekst 2']);
console.log(embeddings[0].length); // 384 (wymiar wektora)
```

**Zwraca:** `Promise<number[][]>`

---

#### `similarity(text1, text2)`

Oblicza podobieństwo kosinusowe między tekstami.

```typescript
const score = await provider.similarity(
  'Kocham programowanie',
  'Uwielbiam kodować'
);
console.log(score); // 0.85 (podobne znaczenie)
```

**Zwraca:** `Promise<number>` (0-1)

---

#### `findSimilar(query, texts, options?)`

Znajduje najbardziej podobny tekst z listy.

```typescript
const result = await provider.findSimilar('Kot na macie', [
  'Pies w parku',
  'Kocur na dywanie',
  'Samochód na parkingu',
]);

console.log(result.text);       // 'Kocur na dywanie'
console.log(result.similarity); // 0.92
console.log(result.index);      // 1
```

---

### Metody Wektoryzacji (RAG)

#### `initializeVectorization(config)`

Inicjalizuje serwis wektoryzacji.

```typescript
await provider.initializeVectorization({
  storage: 'indexeddb',
  preferAcceleration: 'webgpu',
});
```

---

#### `indexFiles(files)`

Indeksuje pliki w bazie wektorowej.

```typescript
const result = await provider.indexFiles([file1, file2, file3]);
console.log(result.indexed); // ['id1', 'id2']
console.log(result.failed);  // ['file3.pdf']
```

---

#### `queryVectors(input, modality?, options?)`

Wyszukuje podobne wektory.

```typescript
const results = await provider.queryVectors('Jak działa AI?', 'text', {
  k: 5,
});
console.log(results.ids);    // ['doc1', 'doc2', ...]
console.log(results.scores); // [0.95, 0.87, ...]
```

---

#### `vectorize(file, options?)` / `vectorizeWithProgress()`

Wektoryzacja z obsługą postępu.

```typescript
for await (const progress of provider.vectorizeWithProgress(audioFile)) {
  console.log(`${progress.stage}: ${progress.stageProgress * 100}%`);
}
```

---

### Metody Zarządzania

#### `warmup(modality?)`

Wstępne ładowanie modelu.

```typescript
await provider.warmup('llm');  // Ładuje tylko LLM
await provider.warmup();       // Ładuje wszystkie skonfigurowane modele
```

---

#### `unload(modality?)`

Zwalnia zasoby modelu.

```typescript
await provider.unload('tts');
```

---

#### `isReady(modality)`

Sprawdza czy model jest gotowy.

```typescript
if (provider.isReady('llm')) {
  await provider.chat('...');
}
```

---

#### `getStatus(modality)` / `getAllStatuses()`

Pobiera status modeli.

```typescript
const status = provider.getStatus('llm');
// { modality: 'llm', loaded: true, loading: false, model: '...' }

const all = provider.getAllStatuses();
```

---

---

#### `dispose()`

Zwalnia wszystkie zasoby.

```typescript
await provider.dispose();
```

---

### Metody Token Management

#### `countTokens(text)`

Zlicza tokeny w tekście używając tokenizera modelu LLM.

**Wymagania:** Model musi być załadowany (`warmup('llm')`).

```typescript
await provider.warmup('llm');
const count = provider.countTokens('Przykładowy tekst');
console.log(count); // np. 5
```

**Zwraca:** `number`

---

#### `getContextWindow()`

Zwraca rozmiar okna kontekstowego modelu LLM.

**Wskazówka:** Użyj tej wartości, aby upewnić się, że Twój prompt (historia + nowe wiadomości) mieści się w limicie modelu.

```typescript
const contextSize = provider.getContextWindow();
console.log(contextSize); // np. 32768
```

**Zwraca:** `number` (tokeny)

---

## Adaptery

### OpenAIAdapter

Adapter kompatybilny z API OpenAI.

```typescript
import { OpenAIAdapter } from 'lxrt';

const client = new OpenAIAdapter(provider);

const response = await client.chat.completions.create({
  model: 'local-llm',
  messages: [{ role: 'user', content: 'Cześć!' }],
  max_tokens: 100,
});

console.log(response.choices[0].message.content);
```

---

### LangChainLLM / LangChainEmbeddings

Integracja z LangChain.

```typescript
import { createLangChainLLM, createLangChainEmbeddings } from 'lxrt';

const llm = createLangChainLLM(provider);
const embeddings = createLangChainEmbeddings(provider);

// Użycie z LangChain
const result = await llm.invoke('Opowiedz żart');
```

---

## Typy

### Modalności

```typescript
type Modality = 'llm' | 'tts' | 'stt' | 'embedding' | 'ocr';
type VectorModality = 'text' | 'audio' | 'image' | 'video';
```

### Urządzenia i precyzja

```typescript
type Device = 'cpu' | 'gpu' | 'webgpu';
type DType = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
```

### Message (format OpenAI)

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}
```

### Konfiguracje modeli

```typescript
interface LLMConfig {
  model: string;
  dtype?: DType;
  device?: Device;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repetitionPenalty?: number;
}

interface EmbeddingConfig {
  model: string;
  dtype?: DType;
  pooling?: 'mean' | 'cls';
  normalize?: boolean;
}
```

---

## Zdarzenia

### Rejestracja

```typescript
provider.on('progress', (data) => { ... });
provider.once('ready', (data) => { ... });
provider.off('error', handler);
```

### Typy zdarzeń

| Zdarzenie | Payload | Opis |
|-----------|---------|------|
| `progress` | `ProgressEventData` | Postęp ładowania modelu |
| `ready` | `ReadyEventData` | Model załadowany |
| `error` | `ErrorEventData` | Błąd modelu |
| `unload` | `UnloadEventData` | Model zwolniony |

---

## Błędy

```typescript
import {
  ValidationError,
  ModelLoadError,
  ModelNotLoadedError,
  ModelUnavailableError,
  InferenceError,
  InitializationError,
  ConfigurationError,
} from 'lxrt';
```

| Błąd | Kiedy |
|------|-------|
| `ValidationError` | Nieprawidłowe parametry |
| `ModelLoadError` | Błąd ładowania modelu |
| `ModelNotLoadedError` | Model nie załadowany |
| `InferenceError` | Błąd podczas inferencji |
| `ConfigurationError` | Błędna konfiguracja |

---

## Powiązane pliki źródłowe

- `src/core/types.ts` - Definicje typów
- `src/app/AIProvider.ts` - Implementacja AIProvider
- `src/adapters/OpenAIAdapter.ts` - Adapter OpenAI
- `src/adapters/LangChainAdapter.ts` - Adapter LangChain
