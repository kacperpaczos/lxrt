<div align="center">

# LXRT — Local AI Infrastructure

`transformers.js` · `llm` · `tts/stt` · `embeddings` · `ocr` · `vectorization` · `web-workers`

[![npm version](https://img.shields.io/npm/v/lxrt.svg)](https://www.npmjs.com/package/lxrt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

**TypeScript library for running AI models in a unified infrastructure**

</div>

---

## Why LXRT?

| Feature | Description |
|-------|------|
| 🔒 **Local-first** | Privacy, lower costs, lower latency |
| 🎯 **Unified Infrastructure Layer** | Models, cache, workers, backend (WebGPU/WASM/Node), progress, vector store |
| 🔌 **Ready-made Integrations** | OpenAI-compatible, LangChain, React/Vue hooks |
| 🎭 **Multi-modal** | LLM, TTS, STT, Embeddings, OCR, audio/video/image vectorization for RAG |
| 🚀 **WebGPU Ready** | Automatic hardware acceleration (10-50x faster) in the browser |
| 📝 **TypeScript-first** | Full typing, clean API |

---

## Installation

```bash
npm install lxrt @huggingface/transformers
# or yarn / pnpm
```

## CLI (Model Management)

LXRT provides a CLI tool for managing local models:

```bash
# Download model from Hugging Face Hub (with progress bar)
npx lxrt pull Xenova/Qwen1.5-0.5B-Chat --dtype q4

# List downloaded models
npx lxrt list

# Remove model
npx lxrt remove Xenova/Qwen1.5-0.5B-Chat
```

---

## Quick Start

### Basic LLM Chat

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
  { role: 'user', content: 'Hello, LXRT!' }
]);
console.log(reply.content);
```

### Multi-modal Configuration

```typescript
const provider = createAIProvider({
  llm: { model: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4' },
  tts: { model: 'Xenova/speecht5_tts', dtype: 'fp32' },
  stt: { model: 'Xenova/whisper-tiny', dtype: 'fp32', language: 'en' },
  embedding: { model: 'Xenova/all-MiniLM-L6-v2', dtype: 'fp32' },
  ocr: { language: ['eng'] },
});
```

---

## Key Features

### 💬 LLM / Chat

```typescript
// Chat with history
const response = await provider.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is TypeScript?' },
]);

// Streaming
for await (const token of provider.stream('Tell me a story')) {
  process.stdout.write(token);
}

// JSON Mode
const jsonRel = await provider.chat('List 3 cities in JSON', {
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
const toolRes = await provider.chat('What is the weather in Warsaw?', { tools });
console.log(toolRes.toolCalls); // [{ name: 'get_weather', arguments: '{"location":"Warszawa"}' }]

```

### 🔊 TTS (Text-to-Speech)

```typescript
const audio = await provider.speak('Hello world!', {
  voiceProfile: 'professional-female',
});
```

### 🎤 STT (Speech-to-Text)

```typescript
const text = await provider.listen(audioBlob, {
  language: 'en',
});
```

### 📸 OCR (Text Recognition)

```typescript
const result = await provider.recognize(imageFile, {
  language: ['eng'],
  autoLanguage: true,
});
console.log(result.text);
```

### 🧮 Embeddings and Semantic Search

```typescript
// Embeddings
const vectors = await provider.embed(['text 1', 'text 2']);

// Similarity
const score = await provider.similarity('I love programming', 'I like coding');

// Search
const result = await provider.findSimilar('Cat on mat', documents);
```

### 📊 Vectorization (RAG)

Support for text files, **PDF** and **DOCX**:

```typescript
await provider.initializeVectorization({ storage: 'indexeddb' });

// Automatic text extraction from PDF/DOCX
await provider.indexFiles([
    new File([pdfBlob], "document.pdf", { type: "application/pdf" }),
    new File([docxBlob], "letter.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
]);

const results = await provider.queryVectors('How does AI work?');
```

### 🎯 Model Registry and Type Safety

LXRT provides a **type-safe model registry** with auto-completion for supported models:

```typescript
import { createAIProvider, type SupportedLLM, MODEL_REGISTRY, getModelInfo } from 'lxrt';

// ✅ Auto-completion for known models
const model: SupportedLLM = 'Xenova/Qwen1.5-0.5B-Chat';

// ✅ You can still use arbitrary strings
const customModel = 'my-org/my-custom-model';

// Get model info
const info = getModelInfo('llm', 'Xenova/Qwen1.5-0.5B-Chat');
console.log(info?.contextWindow); // 32768
console.log(info?.family); // 'qwen'

// Browse all models
console.log(MODEL_REGISTRY.llm);
console.log(MODEL_REGISTRY.embedding);
```

### 🏷️ Model Presets (Semantic Naming)

LXRT offers **presets** - semantic names for models, simplifying choice without knowing specific IDs.

```typescript
const provider = createAIProvider({
  // Instead of 'Xenova/Qwen1.5-0.5B-Chat'
  llm: { model: 'chat-light' },
  
  // Instead of 'Xenova/all-MiniLM-L6-v2'
  embedding: { model: 'embedding-quality' },
  
  // Also works with 'fast', 'balanced', 'quality'
  stt: { model: 'fast' }
});
```

**Available presets (LLM):**
- `tiny` (<1GB, GPT-2)
- `chat-light` (~2GB, Qwen 1.5 0.5B)
- `chat-medium` (~4GB, Phi-3 Mini)
- `chat-heavy` (>4GB, Gemma 2B)
- `fast` / `balanced` / `quality`

### 🎛️ Auto-Tuning (Smart Model Selection)

LXRT can **automatically select the best model** based on your hardware (RAM, GPU). Just add the `autoTune: true` flag:

```typescript
const provider = createAIProvider({
  llm: { 
    model: 'chat', // general intent
    autoTune: true // allow automatic selection
  }
});

// Auto-tuning result:
// - High-end PC (32GB RAM + GPU) -> 'chat-heavy' (Gemma 2B)
// - Laptop (8GB RAM) -> 'chat-medium' (Phi-3 Mini)
// - Low-end hardware / Browser -> 'chat-light' (Qwen 0.5B)
```

### 🔢 Token Counting and Context Window

```typescript
const provider = createAIProvider({
  llm: { model: 'Xenova/Qwen1.5-0.5B-Chat' }
});

await provider.warmup('llm');

// Check context window size
const contextWindow = provider.getContextWindow(); // 32768

// Count tokens in text
const text = 'This is a sample text for analysis.';
const tokenCount = provider.countTokens(text); // ~10

// Ensure text fits within the window
if (tokenCount > contextWindow - 512) {
  // Truncate text to fit limit
  console.warn('Text too long, truncating...');
}
```

---

## Adapters

### OpenAI-compatible

```typescript
import { OpenAIAdapter } from 'lxrt';

const client = new OpenAIAdapter(provider);
const resp = await client.chat.completions.create({
  model: 'local-llm',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### ✅ Vercel AI SDK

Adapter allows using LXRT as a provider in Vercel AI SDK (streaming response):

```typescript
import { createVercelProvider } from 'lxrt/adapters';
import { streamText } from 'ai';

const provider = createVercelProvider(lxrtProvider);
const result = await streamText({
  model: provider.languageModel('local-model'),
  prompt: 'Why is the sky blue?',
});
```

### 🎭 Stagehand (Browser Automation)

Use LXRT to control the browser in Stagehand:

```typescript
import { StagehandAdapter } from 'lxrt/adapters';

const model = new StagehandAdapter(provider, 'Xenova/Qwen1.5-0.5B-Chat');
// Use 'model' in Stagehand configuration
```

### 🦜🔗 LangChain

```typescript
import { createLangChainLLM } from 'lxrt/adapters';

const llm = createLangChainLLM(provider);
const res = await llm.invoke('Tell me a joke about cats');
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
      <button onClick={() => sendMessage('Hello!')}>Send</button>
    </div>
  );
}
```

### Vue Composable

```typescript
import { useChat } from 'lxrt/vue';

const { messages, sendMessage, isLoading } = useChat();
await sendMessage('Hello!');
```

---

## Loading Progress

```typescript
provider.on('progress', ({ modality, file, progress }) => {
  console.log(`Loading ${modality}: ${file} (${progress}%)`);
});

provider.on('ready', ({ modality }) => {
  console.log(`✓ ${modality} ready`);
});
```

---

## Configuration

| Option | Values | Description |
|-------|----------|------|
| **Backend** | `webgpu` / `wasm` / `node` | Auto-fallback |
| **DType** | `fp32` / `fp16` / `q8` / `q4` / `q4f16` | Model Precision |
| **Cache** | Automatic | Caching and reusing models |
| **Workers** | Web Workers | Heavy computations off main thread |
| **Vector Store** | IndexedDB | Local storage for RAG |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AIProvider                        │
│  (main facade - chat/speak/listen/embed/ocr)        │
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

Detailed description: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Documentation

| Document | Description |
|----------|------|
| [API.md](./API.md) | Full API Documentation |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture and component relationships |
| [WEBGPU_GUIDE.md](./docs/WEBGPU_GUIDE.md) | WebGPU Acceleration Guide |
| [EXAMPLES.md](./EXAMPLES.md) | Usage Examples |

---

## Examples

The [`examples/`](./examples/) directory contains:

- `basic.js` - Basic usage
- `multimodal.js` - LLM + TTS + STT + Embeddings
- `agent-integration.js` - Integration with AI agents
- `ocr-basic.js` - Text recognition (OCR)
- `tts-voice-profiles.js` - TTS Voice profiles
- `react-chat-example.tsx` - React Hook
- `vue-chat-example.vue` - Vue Composable
- `worker-chat.html` - Web Workers

---

## Requirements

- Node.js >= 24.13.0
- Browser with WebGPU (optional, fallback to WASM)

### Peer Dependencies

```json
{
  "@huggingface/transformers": "^3.0.0"
}
```

---

## License

MIT © [Kacper Paczos](https://github.com/kacperpaczos)

---

## Links

- [GitHub](https://github.com/kacperpaczos/lxrt)
- [npm](https://www.npmjs.com/package/lxrt)
- [Report an issue](https://github.com/kacperpaczos/lxrt/issues)
