# Przykłady Użycia LXRT

Kompletny zbiór przykładów użycia biblioteki LXRT od podstaw do zaawansowanych scenariuszy.

---

## Spis Treści

1. [Szybki Start](#szybki-start)
2. [Chat i LLM](#chat-i-llm)
3. [Synteza Mowy (TTS)](#synteza-mowy-tts)
4. [Rozpoznawanie Mowy (STT)](#rozpoznawanie-mowy-stt)
5. [OCR (Rozpoznawanie Tekstu)](#ocr-rozpoznawanie-tekstu)
6. [Embeddingi i Wyszukiwanie](#embeddingi-i-wyszukiwanie)
7. [Wektoryzacja (RAG)](#wektoryzacja-rag)
8. [Adaptery (OpenAI, LangChain)](#adaptery)
9. [React Hooks](#react-hooks)
10. [Vue Composables](#vue-composables)
11. [Web Workers](#web-workers)
12. [Integracja z Agentami](#integracja-z-agentami)
13. [Integracja ze Stagehand](#integracja-ze-stagehand)

---

## Szybki Start

### Minimalna konfiguracja

```typescript
import { createAIProvider } from 'lxrt';

const provider = createAIProvider({
  llm: {
    model: 'onnx-community/Qwen2.5-0.5B-Instruct',
    dtype: 'q4',
  },
});

const response = await provider.chat('Cześć! Kim jesteś?');
console.log(response.content);

// Zwolnij zasoby po zakończeniu
await provider.dispose();
```

### Pełna konfiguracja multi-modalna

```typescript
import { createAIProvider } from 'lxrt';

const provider = createAIProvider({
  llm: {
    model: 'onnx-community/Qwen2.5-0.5B-Instruct',
    dtype: 'q4',
    maxTokens: 150,
    temperature: 0.7,
  },
  tts: {
    model: 'Xenova/speecht5_tts',
    dtype: 'fp32',
  },
  stt: {
    model: 'Xenova/whisper-tiny',
    dtype: 'fp32',
    language: 'pl',
  },
  embedding: {
    model: 'Xenova/all-MiniLM-L6-v2',
    dtype: 'fp32',
    normalize: true,
  },
  ocr: {
    language: ['pol', 'eng'],
  },
});

// Śledzenie postępu ładowania
provider.on('progress', ({ modality, file, progress }) => {
  console.log(`Ładowanie ${modality}: ${file} (${progress}%)`);
});

provider.on('ready', ({ modality }) => {
  console.log(`✓ ${modality} gotowy`);
});
```

---

## Chat i LLM

### Prosty chat

```typescript
// Pojedyncza wiadomość
const response = await provider.chat('Wyjaśnij czym jest TypeScript');
console.log(response.content);
```

### Chat z historią

```typescript
const messages = [
  { role: 'system', content: 'Jesteś ekspertem od programowania.' },
  { role: 'user', content: 'Co to jest React?' },
  { role: 'assistant', content: 'React to biblioteka JavaScript...' },
  { role: 'user', content: 'A czym różni się od Vue?' },
];

const response = await provider.chat(messages, {
  maxTokens: 200,
  temperature: 0.7,
});
```

### Streaming odpowiedzi

```typescript
async function streamChat() {
  console.log('AI: ');
  
  for await (const token of provider.stream('Opowiedz krótką historię')) {
    process.stdout.write(token);
  }
  
  console.log('\n--- Koniec ---');
}
```

### Generacja tekstu (completion)

```typescript
const poem = await provider.complete(
  'Napisz haiku o programowaniu:\n',
  {
    maxTokens: 50,
    temperature: 0.9,
    stopSequences: ['\n\n'],
  }
);
```

---

## Synteza Mowy (TTS)

### Podstawowa synteza

```typescript
const audioBlob = await provider.speak('Witaj w świecie sztucznej inteligencji!');

// Odtwórz w przeglądarce
const audio = new Audio(URL.createObjectURL(audioBlob));
audio.play();
```

### Profil głosowy

```typescript
import { voiceProfileRegistry } from 'lxrt';

// Zarejestruj własny profil
voiceProfileRegistry.register({
  id: 'moj-lektor',
  name: 'Mój Lektor',
  gender: 'male',
  age: 'adult',
  style: 'narrative',
  parameters: {
    speed: 0.9,
    pitch: 0.95,
  },
});

const audio = await provider.speak('Dawno, dawno temu...', {
  voiceProfile: 'moj-lektor',
});
```

### Zapisz do pliku (Node.js)

```typescript
import fs from 'fs';

const audioBlob = await provider.speak('Tekst do syntezy');
const buffer = Buffer.from(await audioBlob.arrayBuffer());
fs.writeFileSync('output.wav', buffer);
```

---

## Rozpoznawanie Mowy (STT)

### Z pliku audio

```typescript
// Z URL
const text = await provider.listen('https://example.com/audio.mp3');

// Z Blob (np. z nagrania mikrofonu)
const text = await provider.listen(audioBlob, {
  language: 'pl',
});
```

### Transkrypcja z tłumaczeniem

```typescript
// Tłumaczenie na angielski
const englishText = await provider.listen(polishAudioBlob, {
  task: 'translate',
});
```

### Nagrywanie z mikrofonu (przeglądarka)

```typescript
async function recordAndTranscribe() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    const text = await provider.listen(audioBlob, { language: 'pl' });
    console.log('Transkrypcja:', text);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // 5 sekund
}
```

---

## OCR (Rozpoznawanie Tekstu)

### Podstawowe rozpoznawanie

```typescript
const result = await provider.recognize(imageFile);
console.log(result.text);
console.log(`Pewność: ${(result.confidence * 100).toFixed(1)}%`);
```

### Wielojęzyczne OCR

```typescript
const result = await provider.recognize(imageFile, {
  language: ['pol', 'eng'],
  autoLanguage: true,
});

console.log('Wykryte języki:', result.detectedLanguages);
console.log('Użyty język:', result.usedLanguage);
```

### OCR z pozycjami słów

```typescript
const result = await provider.recognize(documentImage, {
  includeBbox: true,
  includeConfidence: true,
});

result.words?.forEach((word) => {
  console.log(`"${word.text}" @ [${word.bbox.x0}, ${word.bbox.y0}]`);
});
```

### OCR z Canvas

```typescript
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;

canvas.toBlob(async (blob) => {
  if (blob) {
    const result = await provider.recognize(blob);
    console.log(result.text);
  }
}, 'image/png');
```

---

## Embeddingi i Wyszukiwanie

### Generacja embeddingów

```typescript
const embeddings = await provider.embed([
  'Programowanie to sztuka',
  'Muzyka to sztuka',
  'Matematyka to nauka',
]);

console.log(`Wymiar wektora: ${embeddings[0].length}`); // 384
```

### Podobieństwo semantyczne

```typescript
const score = await provider.similarity(
  'Kocham pizzę',
  'Uwielbiam włoskie jedzenie'
);
console.log(`Podobieństwo: ${(score * 100).toFixed(1)}%`); // ~75%
```

### Wyszukiwanie semantyczne

```typescript
const documents = [
  'JavaScript jest językiem skryptowym',
  'Python służy do machine learning',
  'TypeScript dodaje typy do JavaScript',
  'React to biblioteka UI',
];

const result = await provider.findSimilar(
  'Jak dodać typowanie do JS?',
  documents
);

console.log('Najbliższy:', result.text);  // TypeScript...
console.log('Wynik:', result.similarity); // 0.89
```

---

## Wektoryzacja (RAG)

### Inicjalizacja

```typescript
await provider.initializeVectorization({
  storage: 'indexeddb',
  preferAcceleration: 'webgpu',
});
```

### Indeksowanie plików

```typescript
const files = [
  new File(['Treść dokumentu 1'], 'doc1.txt'),
  new File(['Treść dokumentu 2'], 'doc2.txt'),
];

const result = await provider.indexFiles(files);
console.log('Zindeksowano:', result.indexed);
console.log('Błędy:', result.failed);
```

### Wyszukiwanie

```typescript
const results = await provider.queryVectors('Jak działa AI?', 'text', {
  k: 5,
  scoreThreshold: 0.7,
});

results.ids.forEach((id, i) => {
  console.log(`${i + 1}. ${id} (wynik: ${results.scores[i].toFixed(2)})`);
});
```

### Wektoryzacja z postępem

```typescript
const audioFile = new File([audioData], 'podcast.mp3', { type: 'audio/mp3' });

for await (const progress of provider.vectorizeWithProgress(audioFile, {
  modality: 'audio',
  audioMode: 'stt',
})) {
  console.log(`[${progress.stage}] ${(progress.progress * 100).toFixed(1)}%`);
  
  if (progress.message) {
    console.log(`  → ${progress.message}`);
  }
}
```

---

## Adaptery

### OpenAI Adapter

```typescript
import { OpenAIAdapter } from 'lxrt';

const client = new OpenAIAdapter(provider);

// Standardowe API OpenAI
const response = await client.chat.completions.create({
  model: 'local-llm',
  messages: [
    { role: 'system', content: 'Jesteś pomocnikiem.' },
    { role: 'user', content: 'Cześć!' },
  ],
  max_tokens: 100,
  temperature: 0.7,
});

console.log(response.choices[0].message.content);
console.log('Użycie:', response.usage);
```

### LangChain Adapter

```typescript
import { createLangChainLLM, createLangChainEmbeddings } from 'lxrt';

// LLM
const llm = createLangChainLLM(provider);
const result = await llm.invoke('Opowiedz żart o programistach');

// Embeddingi
const embeddings = createLangChainEmbeddings(provider);
const vectors = await embeddings.embedDocuments([
  'Dokument 1',
  'Dokument 2',
]);
```

---

## React Hooks

### useAIProvider

```tsx
import { useAIProvider } from 'lxrt/react';

function App() {
  const { provider, isLoading, error } = useAIProvider({
    llm: { model: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4' },
  });

  if (isLoading) return <div>Ładowanie modelu...</div>;
  if (error) return <div>Błąd: {error.message}</div>;

  return <ChatComponent provider={provider} />;
}
```

### useChat

```tsx
import { useChat } from 'lxrt/react';

function ChatComponent() {
  const { messages, sendMessage, isLoading } = useChat();

  const handleSubmit = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i} className={msg.role}>
          {msg.content}
        </div>
      ))}
      {isLoading && <div>AI pisze...</div>}
    </div>
  );
}
```

### useVectorization

```tsx
import { useVectorization } from 'lxrt/react';

function FileIndexer() {
  const { indexFiles, progress, isProcessing } = useVectorization();

  const handleFiles = async (files: FileList) => {
    const result = await indexFiles(Array.from(files));
    console.log('Zindeksowano:', result.indexed);
  };

  return (
    <div>
      <input type="file" multiple onChange={(e) => handleFiles(e.target.files!)} />
      {isProcessing && (
        <progress value={progress?.progress} max={1} />
      )}
    </div>
  );
}
```

---

## Vue Composables

### useChat (Vue)

```vue
<template>
  <div>
    <div v-for="(msg, i) in messages" :key="i" :class="msg.role">
      {{ msg.content }}
    </div>
    <input v-model="input" @keyup.enter="send" :disabled="isLoading" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChat } from 'lxrt/vue';

const { messages, sendMessage, isLoading } = useChat();
const input = ref('');

async function send() {
  if (input.value.trim()) {
    await sendMessage(input.value);
    input.value = '';
  }
}
</script>
```

---

## Web Workers

### Przetwarzanie w tle

```typescript
import { createAIProviderWorker } from 'lxrt';

// Tworzenie providera w Web Worker
const workerProvider = createAIProviderWorker({
  llm: { model: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4' },
});

// Użycie identyczne jak zwykły provider
const response = await workerProvider.chat('Cześć!');
```

### Pula workerów

```typescript
import { WorkerPool } from 'lxrt';

const pool = new WorkerPool('./llm.worker.js', 4);

// Równoległe przetwarzanie
const results = await Promise.all([
  pool.execute('chat', { message: 'Pytanie 1' }),
  pool.execute('chat', { message: 'Pytanie 2' }),
  pool.execute('chat', { message: 'Pytanie 3' }),
]);

// Statystyki
console.log(pool.getStats());
// { total: 4, available: 1, busy: 3, queued: 0, active: 3 }

// Zamknięcie
pool.terminate();
```

---

## Integracja z Agentami

### Prosty Agent AI

```typescript
class SimpleAgent {
  constructor(private provider: AIProvider) {}

  async execute(task: string): Promise<string> {
    const response = await this.provider.chat([
      { role: 'system', content: 'Jesteś pomocnym asystentem AI.' },
      { role: 'user', content: task },
    ]);
    return response.content;
  }
}

const agent = new SimpleAgent(provider);
const result = await agent.execute('Napisz email z podziękowaniem');
```

### RAG Agent

```typescript
class RAGAgent {
  constructor(
    private provider: AIProvider,
    private documents: string[]
  ) {}

  async ask(question: string): Promise<string> {
    // 1. Znajdź podobne dokumenty
    const relevant = await this.provider.findSimilar(question, this.documents);
    
    // 2. Użyj kontekstu do odpowiedzi
    const response = await this.provider.chat([
      {
        role: 'system',
        content: `Odpowiadaj na podstawie kontekstu:\n${relevant.text}`,
      },
      { role: 'user', content: question },
    ]);
    
    return response.content;
  }
}

const ragAgent = new RAGAgent(provider, [
  'LXRT to biblioteka do lokalnego AI...',
  'Transformers.js pozwala na uruchamianie modeli w przeglądarce...',
]);

const answer = await ragAgent.ask('Jak uruchomić model AI lokalnie?');
```

---


---

## Integracja ze Stagehand

### Uruchomienie Stagehand z lokalnym modelem

Przykład pokazuje jak użyć LXRT jako dostawcy LLM dla frameworku [Stagehand](https://github.com/browserbase/stagehand), umożliwiając w pełni lokalną automatyzację przeglądarki.

Pełny kod źródłowy znajduje się w `examples/stagehand/`. Szczegółowy opis architektury i możliwości znajdziesz w [dokumentacji integracji](docs/stagehand/INTEGRATION_GUIDE.md).

```typescript
import { Stagehand } from '@browserbasehq/stagehand';
import { createAIProvider } from 'lxrt';
import { LxrtLLMProvider } from './LxrtLLMProvider'; // Twój adapter
import { z } from 'zod';

// 1. Inicjalizacja LXRT
const provider = createAIProvider({
  llm: { model: 'Xenova/Qwen1.5-0.5B-Chat', dtype: 'q4' }
});
await provider.warmup('llm');

// 2. Konfiguracja Stagehand z lokalnym klientem
const stagehand = new Stagehand({
  env: "LOCAL" as any,
  llmClient: new LxrtLLMProvider(provider)
});

// 3. Automatyzacja
await stagehand.init();
await (stagehand as any).page.goto("https://example.com");

const data = await stagehand.extract(
  "Extract the title",
  z.object({ title: z.string() })
);
console.log(data);
await stagehand.close();
```

---

## Powiązane pliki

Zobacz katalog `examples/` w repozytorium:
- `basic.js`
- `multimodal.js`
- `agent-integration.js`
- `react-chat-example.tsx`
- `vue-chat-example.vue`

