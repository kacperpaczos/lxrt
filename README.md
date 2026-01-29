<div align="center">

# LXRT — Lokalna Infrastruktura AI

`transformers.js` · `llm` · `tts/stt` · `embeddings` · `ocr` · `vectorization` · `web-workers`

[![npm version](https://img.shields.io/npm/v/lxrt.svg)](https://www.npmjs.com/package/lxrt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

**Biblioteka TypeScript do uruchamiania modeli AI w jednolitej infrastrukturze**

</div>

---

## Dlaczego LXRT?

| Cecha | Opis |
|-------|------|
| 🔒 **Local-first** | Prywatność, niższe koszty, niższe opóźnienia |
| 🎯 **Jedna warstwa infrastruktury** | Modele, cache, workery, backend (WebGPU/WASM/Node), progress, vector store |
| 🔌 **Gotowe integracje** | OpenAI-compatible, LangChain, React/Vue hooks |
| 🎭 **Multi-modalne** | LLM, TTS, STT, Embeddings, OCR, audio/video/image vectorization dla RAG |
| 🚀 **WebGPU Ready** | Automatyczna akceleracja sprzętowa (10-50x faster) w przeglądarce |
| 📝 **TypeScript-first** | Pełne typowanie, czyste API |

---

## Instalacja

```bash
npm install lxrt @huggingface/transformers
# lub yarn / pnpm
```

## CLI (Zarządzanie Modelami)

LXRT udostępnia narzędzie wiersza poleceń do zarządzania lokalnymi modelami:

```bash
# Pobranie modelu z Hugging Face Hub (z paskiem postępu)
npx lxrt pull Xenova/Qwen1.5-0.5B-Chat --dtype q4

# Lista pobranych modeli
npx lxrt list

# Usunięcie modelu
npx lxrt remove Xenova/Qwen1.5-0.5B-Chat
```

---

## Szybki Start

### Podstawowy chat z LLM

```typescript
import { createAIProvider } from 'lxrt';

const provider = createAIProvider({
  llm: {
    model: 'onnx-community/Qwen2.5-0.5B-Instruct',
    dtype: 'q4',
  },
  backend: { prefer: 'webgpu', fallback: 'wasm' },
});

const reply = await provider.chat([
  { role: 'user', content: 'Cześć, LXRT!' }
]);
console.log(reply.content);
```

### Multi-modalna konfiguracja

```typescript
const provider = createAIProvider({
  llm: { model: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4' },
  tts: { model: 'Xenova/speecht5_tts', dtype: 'fp32' },
  stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', language: 'pl' },
  embedding: { model: 'Xenova/all-MiniLM-L6-v2', dtype: 'fp32' },
  ocr: { language: ['pol', 'eng'] },
});
```

---

## Kluczowe Możliwości

### 💬 LLM / Chat

```typescript
// Chat z historią
const response = await provider.chat([
  { role: 'system', content: 'Jesteś pomocnym asystentem.' },
  { role: 'user', content: 'Czym jest TypeScript?' },
]);

// Streaming
for await (const token of provider.stream('Opowiedz historię')) {
  process.stdout.write(token);
}

// JSON Mode
const jsonRel = await provider.chat('Wymień 3 miasta w JSON', {
  responseFormat: { type: 'json_object' }
});

// Function Calling
const tools = [{
  type: 'function',
  function: {
    name: 'get_weather',
    parameters: { type: 'object', properties: { location: { type: 'string' } } }
  }
}];
const toolRes = await provider.chat('Jaka pogoda w Warszawie?', { tools });
console.log(toolRes.toolCalls); // [{ name: 'get_weather', arguments: '{"location":"Warszawa"}' }]

```

### 🔊 TTS (Text-to-Speech)

```typescript
const audio = await provider.speak('Witaj świecie!', {
  voiceProfile: 'professional-female',
});
```

### 🎤 STT (Speech-to-Text)

```typescript
const text = await provider.listen(audioBlob, {
  language: 'pl',
});
```

### 📸 OCR

```typescript
const result = await provider.recognize(imageFile, {
  language: ['pol', 'eng'],
  autoLanguage: true,
});
console.log(result.text);
```

### 🧮 Embeddingi i Wyszukiwanie Semantyczne

```typescript
// Embeddingi
const vectors = await provider.embed(['tekst 1', 'tekst 2']);

// Podobieństwo
const score = await provider.similarity('Kocham programowanie', 'Uwielbiam kodować');

// Wyszukiwanie
const result = await provider.findSimilar('Kot na macie', dokumenty);
```

### 📊 Wektoryzacja (RAG)

Wsparcie dla plików tekstowych, **PDF** oraz **DOCX**:

```typescript
await provider.initializeVectorization({ storage: 'indexeddb' });

// Automatyczna ekstrakcja tekstu z PDF/DOCX
await provider.indexFiles([
    new File([pdfBlob], "dokument.pdf", { type: "application/pdf" }),
    new File([docxBlob], "pismo.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
]);

const results = await provider.queryVectors('Jak działa AI?');
```

### 🎯 Model Registry i Type Safety

LXRT zapewnia **type-safe model registry** z auto-completion dla wspieranych modeli:

```typescript
import { createAIProvider, type SupportedLLM, MODEL_REGISTRY, getModelInfo } from 'lxrt';

// ✅ Auto-completion dla znanych modeli
const model: SupportedLLM = 'Xenova/Qwen1.5-0.5B-Chat';

// ✅ Nadal można używać dowolnych stringów
const customModel = 'my-org/my-custom-model';

// Pobranie informacji o modelu
const info = getModelInfo('llm', 'Xenova/Qwen1.5-0.5B-Chat');
console.log(info?.contextWindow); // 32768
console.log(info?.family); // 'qwen'

// Przeglądanie wszystkich modeli
console.log(MODEL_REGISTRY.llm);
console.log(MODEL_REGISTRY.embedding);
```

### 🏷️ Model Presets (Semantic Naming)

LXRT oferuje **presety** - semantyczne nazwy dla modeli, ułatwiające wybór odpowiedniego rozwiązania bez znania konkretnych ID.

```typescript
const provider = createAIProvider({
  // Zamiast 'Xenova/Qwen1.5-0.5B-Chat'
  llm: { model: 'chat-light' },
  
  // Zamiast 'Xenova/all-MiniLM-L6-v2'
  embedding: { model: 'embedding-quality' },
  
  // Działa też 'fast', 'balanced', 'quality'
  stt: { model: 'fast' }
});
```

**Dostępne presety (LLM):**
- `tiny` (<1GB, GPT-2)
- `chat-light` (~2GB, Qwen 1.5 0.5B)
- `chat-medium` (~4GB, Phi-3 Mini)
- `chat-heavy` (>4GB, Gemma 2B)
- `fast` / `balanced` / `quality`

### 🎛️ Auto-Tuning (Inteligentny Wybór Modelu)

LXRT potrafi **automatycznie dobrać najlepszy model** na podstawie Twojego sprzętu (RAM, GPU). Wystarczy dodać flagę `autoTune: true`:

```typescript
const provider = createAIProvider({
  llm: { 
    model: 'chat', // ogólna intencja
    autoTune: true // pozwól na automatyczny dobór
  }
});

// Wynik autotuningu:
// - High-end PC (32GB RAM + GPU) -> 'chat-heavy' (Gemma 2B)
// - Laptop (8GB RAM) -> 'chat-medium' (Phi-3 Mini)
// - Słaby sprzęt / Browser -> 'chat-light' (Qwen 0.5B)
```

### 🔢 Liczenie Tokenów i Context Window

```typescript
const provider = createAIProvider({
  llm: { model: 'Xenova/Qwen1.5-0.5B-Chat' }
});

await provider.warmup('llm');

// Sprawdź rozmiar okna kontekstowego
const contextWindow = provider.getContextWindow(); // 32768

// Policz tokeny w tekście
const text = 'To jest przykładowy tekst do analizy.';
const tokenCount = provider.countTokens(text); // ~12

// Upewnij się że tekst mieści się w oknie
if (tokenCount > contextWindow - 512) {
  // Obetnij tekst aby zmieścił się w limicie
  console.warn('Tekst za długi, obcinanie...');
}
```

---

## Adaptery

### OpenAI-compatible

```typescript
import { OpenAIAdapter } from 'lxrt';

const client = new OpenAIAdapter(provider);
const resp = await client.chat.completions.create({
  model: 'local-llm',
  messages: [{ role: 'user', content: 'Cześć!' }],
});
```

### ✅ Vercel AI SDK

Adapter umożliwia użycie LXRT jako dostawcy w Vercel AI SDK (streaming response):

```typescript
import { createVercelProvider } from 'lxrt/adapters';
import { streamText } from 'ai';

const provider = createVercelProvider(lxrtProvider);
const result = await streamText({
  model: provider.languageModel('local-model'),
  prompt: 'Dlaczego niebo jest niebieskie?',
});
```

### 🎭 Stagehand (Browser Automation)

Użyj LXRT do sterowania przeglądarką w Stagehand:

```typescript
import { StagehandAdapter } from 'lxrt/adapters';

const model = new StagehandAdapter(provider, 'Xenova/Qwen1.5-0.5B-Chat');
// Użyj 'model' w konfiguracji Stagehand
```

### 🦜🔗 LangChain

```typescript
import { createLangChainLLM } from 'lxrt/adapters';

const llm = createLangChainLLM(provider);
const res = await llm.invoke('Opowiedz żart o kotach');
```

---

## React / Vue

### React Hook

```tsx
import { useChat } from 'lxrt/react';

function Chat() {
  const { messages, sendMessage, isLoading } = useChat();
  
  return (
    <div>
      {messages.map((m, i) => <div key={i}>{m.content}</div>)}
      <button onClick={() => sendMessage('Cześć!')}>Wyślij</button>
    </div>
  );
}
```

### Vue Composable

```typescript
import { useChat } from 'lxrt/vue';

const { messages, sendMessage, isLoading } = useChat();
await sendMessage('Cześć!');
```

---

## Postęp Ładowania

```typescript
provider.on('progress', ({ modality, file, progress }) => {
  console.log(`Ładowanie ${modality}: ${file} (${progress}%)`);
});

provider.on('ready', ({ modality }) => {
  console.log(`✓ ${modality} gotowy`);
});
```

---

## Konfiguracja

| Opcja | Wartości | Opis |
|-------|----------|------|
| **Backend** | `webgpu` / `wasm` / `node` | Auto-fallback |
| **DType** | `fp32` / `fp16` / `q8` / `q4` / `q4f16` | Precyzja modelu |
| **Cache** | Automatyczny | Przechowywanie i ponowne użycie modeli |
| **Workers** | Web Workers | Ciężkie obliczenia poza main thread |
| **Vector Store** | IndexedDB | Lokalne przechowywanie dla RAG |

---

## Architektura

```
┌─────────────────────────────────────────────────────┐
│                    AIProvider                        │
│  (fasada główna - chat/speak/listen/embed/ocr)      │
├──────────────┬──────────────┬───────────────────────┤
│   Models     │   Services   │    Infrastructure     │
├──────────────┼──────────────┼───────────────────────┤
│ LLMModel     │ ModelManager │ BackendSelector       │
│ TTSModel     │ ModelCache   │ WorkerPool            │
│ STTModel     │ Vectorize-   │ VectorStore (IDB)     │
│ EmbeddingM.  │ tionService  │ EventEmitter          │
│ OCRModel     │              │                       │
└──────────────┴──────────────┴───────────────────────┘
        │                              │
        ▼                              ▼
   Transformers.js              Tesseract.js
```

Szczegółowy opis: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Dokumentacja

| Dokument | Opis |
|----------|------|
| [API.md](./API.md) | Pełna dokumentacja API |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architektura i relacje między komponentami |
| [WEBGPU_GUIDE.md](./docs/WEBGPU_GUIDE.md) | Przewodnik po akceleracji WebGPU |
| [EXAMPLES.md](./EXAMPLES.md) | Przykłady użycia |

---

## Przykłady

Katalog [`examples/`](./examples/) zawiera:

- `basic.js` - Podstawowe użycie
- `multimodal.js` - LLM + TTS + STT + Embeddings
- `agent-integration.js` - Integracja z agentami AI
- `ocr-basic.js` - Rozpoznawanie tekstu OCR
- `tts-voice-profiles.js` - Profile głosowe TTS
- `react-chat-example.tsx` - Hook React
- `vue-chat-example.vue` - Composable Vue
- `worker-chat.html` - Web Workers

---

## Wymagania

- Node.js >= 24.13.0
- Przeglądarka z WebGPU (opcjonalnie, fallback do WASM)

### Peer Dependencies

```json
{
  "@huggingface/transformers": "^3.0.0"
}
```

---

## Licencja

MIT © [Kacper Paczos](https://github.com/kacperpaczos)

---

## Linki

- [GitHub](https://github.com/kacperpaczos/lxrt)
- [npm](https://www.npmjs.com/package/lxrt)
- [Zgłoś problem](https://github.com/kacperpaczos/lxrt/issues)
