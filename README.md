<div align="center">

# LXRT — Local AI Router & Toolkit

`local ai` · `transformers.js` · `llm` · `tts/stt` · `embeddings` · `ocr` · `vectorization` · `web workers`

</div>

## Why LXRT?
- Local-first: privacy, lower cost, lower latency.
- One infra layer: models, cache, workers, backend selection (WebGPU/WASM/Node), progress, vector store.
- Ready integrations: OpenAI-compatible, LangChain, React/Vue hooks.
- Multimodal: LLM, TTS, STT, Embeddings, OCR, audio/video/image vectorization for RAG.
- TypeScript-first: full typings, clear API.

## Install
```bash
npm install lxrt @huggingface/transformers
# or yarn/pnpm equivalents
```

## Quick start (LLM + cache + worker)
```ts
import { createAIProvider } from 'lxrt';

const provider = createAIProvider({
  llm: { model: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4' },
  backend: { prefer: 'webgpu', fallback: 'wasm' },
});

const reply = await provider.chat([
  { role: 'user', content: 'Hello, LXRT!' }
]);
console.log(reply);
```

## Key capabilities
- **LLM / Chat**: local models, backend autoscaling, model cache.
- **TTS / STT / OCR**: text↔speech, speech recognition, OCR with workers and progress events.
- **Embeddings & Vectorization**: text, audio, image, video → vectors for RAG; local vector store (IndexedDB).
- **OpenAI-compatible & LangChain**: drop-in for existing clients.
- **React / Vue**: hooks/composables `useAIProvider`, `useChat`, `useVectorization`.
- **Workers + Progress**: heavy work off the main thread, progress events.

## Examples

### Embeddings (text)
```ts
const vec = await provider.embed(['hello world']);
```

### Vectorization (file)
```ts
const result = await provider.vectorize(file, { modality: 'audio' });
console.log(result.vector, result.metadata);
```

### OpenAI-compatible
```ts
import { OpenAIAdapter } from 'lxrt';

const client = new OpenAIAdapter(provider);
const resp = await client.chat.completions.create({
  model: 'local-llm',
  messages: [{ role: 'user', content: 'Hi!' }],
});
```

### LangChain
```ts
import { createLangChainLLM } from 'lxrt';

const llm = createLangChainLLM(provider);
const res = await llm.invoke('Tell me a joke about cats');
```

### React (hook)
```tsx
import { useChat } from 'lxrt/react';
const { messages, sendMessage, isLoading } = useChat();

await sendMessage('Hi LXRT!');
```

### Vue (composable)
```ts
import { useChat } from 'lxrt/vue';
const { messages, sendMessage, isLoading } = useChat();
```

## Model download & progress
```ts
provider.on('progress', ({ file, progress }) => {
  console.log(`Downloading ${file}: ${progress}%`);
});
```

## Configuration (quick view)
- **Backend**: `webgpu` / `wasm` / `node` (auto-fallback).
- **Cache**: automatic storage and reuse of models.
- **Workers**: all heavy computation in Web Workers; UI stays responsive.
- **Vector Store**: local IndexedDB for RAG/semantic search.

## License
MIT
