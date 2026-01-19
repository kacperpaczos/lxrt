# Architektura LXRT

LXRT to biblioteka TypeScript do uruchamiania modeli AI w jednolitej infrastrukturze. Ten dokument opisuje architekturę systemu, relacje między komponentami i przepływ danych.

---

## Diagram Architektury Głównej

```mermaid
graph TB
    subgraph "Warstwa Publicznego API"
        CP[createAIProvider]
        AI[AIProvider]
        OAI[OpenAIAdapter]
        LC[LangChainLLM / LangChainEmbeddings]
    end
    
    subgraph "Warstwa Modeli"
        LLM[LLMModel]
        TTS[TTSModel]
        STT[STTModel]
        EMB[EmbeddingModel]
        OCR[OCRModel]
        BM[BaseModel]
    end
    
    subgraph "Warstwa Usług"
        MM[ModelManager]
        MC[ModelCache]
        VS[VectorizationService]
        VPR[VoiceProfileRegistry]
    end
    
    subgraph "Warstwa Infrastruktury"
        BS[BackendSelector]
        WP[WorkerPool]
        VDB[VectorStore - IndexedDB]
        EE[EventEmitter]
    end
    
    subgraph "Biblioteki Zewnętrzne"
        TF["@huggingface/transformers"]
        TS["tesseract.js"]
    end
    
    CP --> AI
    AI --> MM
    AI --> VS
    AI --> EE
    
    OAI --> AI
    LC --> AI
    
    MM --> LLM & TTS & STT & EMB & OCR
    MM --> MC
    
    LLM & TTS & STT & EMB --> BS
    LLM & TTS & STT & EMB --> TF
    OCR --> TS
    
    TTS --> VPR
    
    VS --> VDB
    VS --> EMB
    
    WP --> LLM & TTS & STT
```

---

## Struktura Katalogów i Relacje

```
src/
├── index.ts                    # Główny punkt eksportu
│
├── adapters/                   # Adaptery kompatybilności
│   ├── OpenAIAdapter.ts        # → używa AIProvider
│   ├── LangChainAdapter.ts     # → używa AIProvider
│   └── index.ts
│
├── app/                        # Logika aplikacji
│   ├── AIProvider.ts           # Fasada główna → ModelManager, VectorizationService
│   ├── ModelManager.ts         # Zarządzanie modelami → Models, ModelCache
│   ├── init.ts                 # Inicjalizacja globalna
│   ├── state.ts                # Stan globalny, rejestr modeli
│   │
│   ├── backend/
│   │   └── BackendSelector.ts  # Wybór WebGPU/WASM → używany przez Models
│   │
│   ├── cache/
│   │   └── ModelCache.ts       # Cache modeli w pamięci
│   │
│   ├── autoscaler/
│   │   └── AutoScaler.ts       # Automatyczne skalowanie zasobów
│   │
│   └── vectorization/
│       ├── VectorizationService.ts  # Główny serwis → VectorStore, Adapters
│       └── adapters/
│           ├── EmbeddingAdapter.ts      # Interfejs bazowy
│           ├── AudioEmbeddingAdapter.ts # Audio → STT → Embedding
│           ├── ImageEmbeddingAdapter.ts # Obrazy
│           └── VideoAsAudioAdapter.ts   # Video → Audio
│
├── core/                       # Typy i encje domenowe
│   ├── types.ts                # Wszystkie typy interfejsów
│   ├── VoiceProfile.ts         # Definicja profilu głosowego
│   └── VoiceProfileRegistry.ts # Rejestr profili → używany przez TTSModel
│
├── domain/                     # Kontrakty i błędy
│   ├── errors/index.ts         # ValidationError, ModelLoadError, etc.
│   ├── models/index.ts         # Interfejsy ILLMModel, ITTSModel, etc.
│   ├── config/Config.ts        # Konfiguracja runtime
│   └── logging/Logger.ts       # Interfejs loggera
│
├── infra/                      # Infrastruktura techniczna
│   ├── events/EventEmitter.ts  # System zdarzeń → używany przez AIProvider
│   ├── logging/defaultLogger.ts
│   │
│   ├── resource/
│   │   ├── ResourceUsageEstimator.ts    # Interfejs
│   │   └── LocalResourceUsageEstimator.ts
│   │
│   ├── vectorstore/
│   │   ├── VectorStore.ts              # Interfejs
│   │   └── LocalVectorStoreIndexedDB.ts # Implementacja IndexedDB
│   │
│   └── workers/
│       ├── WorkerPool.ts       # Pula Web Workers
│       ├── AIProviderWorker.ts # Worker dla AI
│       └── llm.worker.ts       # Skrypt workera
│
├── models/                     # Implementacje modeli AI
│   ├── BaseModel.ts            # Klasa bazowa
│   ├── LLMModel.ts             # → Transformers.js, BackendSelector
│   ├── TTSModel.ts             # → Transformers.js, VoiceProfileRegistry
│   ├── STTModel.ts             # → Transformers.js (Whisper)
│   ├── EmbeddingModel.ts       # → Transformers.js
│   └── OCRModel.ts             # → Tesseract.js
│
├── ui/                         # Bindingi UI
│   ├── react/
│   │   ├── useAIProvider.ts    # Hook React → AIProvider
│   │   ├── useChat.ts          # Hook chatu
│   │   └── useVectorization.ts # Hook wektoryzacji
│   │
│   └── vue/
│       ├── useAIProvider.ts    # Composable Vue
│       ├── useChat.ts
│       └── useVectorization.ts
│
└── utils/                      # Narzędzia pomocnicze
    ├── AudioConverter.ts       # Konwersja audio
    └── ProgressTracker.ts      # Śledzenie postępu
```

---

## Przepływ Danych

### 1. Inicjalizacja AIProvider

```mermaid
sequenceDiagram
    participant U as Użytkownik
    participant CP as createAIProvider
    participant AI as AIProvider
    participant MM as ModelManager
    participant MC as ModelCache
    participant BS as BackendSelector
    
    U->>CP: createAIProvider(config)
    CP->>AI: new AIProvider(config)
    AI->>MM: new ModelManager(config)
    MM->>MC: new ModelCache()
    AI->>BS: new BackendSelector()
    AI-->>U: provider instance
```

### 2. Wywołanie chat()

```mermaid
sequenceDiagram
    participant U as Użytkownik
    participant AI as AIProvider
    participant MM as ModelManager
    participant LLM as LLMModel
    participant TF as Transformers.js
    
    U->>AI: chat(messages, options)
    AI->>MM: getLLMModel()
    MM->>LLM: load() [jeśli nie załadowany]
    LLM->>TF: pipeline("text-generation")
    TF-->>LLM: pipeline
    LLM->>TF: generate(prompt)
    TF-->>LLM: response
    LLM-->>AI: ChatResponse
    AI-->>U: { content, usage }
```

### 3. Wektoryzacja dla RAG

```mermaid
sequenceDiagram
    participant U as Użytkownik
    participant AI as AIProvider
    participant VS as VectorizationService
    participant EA as EmbeddingAdapter
    participant EM as EmbeddingModel
    participant VDB as VectorStore
    
    U->>AI: indexFiles(files)
    AI->>VS: indexFiles(files)
    
    loop dla każdego pliku
        VS->>EA: embed(content)
        EA->>EM: embed(text)
        EM-->>EA: Float32Array
        EA-->>VS: vector
        VS->>VDB: store(id, vector, metadata)
    end
    
    VS-->>AI: { indexed, failed }
    AI-->>U: result
```

---

## Kluczowe Relacje Między Komponentami

### AIProvider → Modele

| Metoda AIProvider | Model | Metoda Modelu |
|-------------------|-------|---------------|
| `chat()` | LLMModel | `chat()` |
| `complete()` | LLMModel | `complete()` |
| `stream()` | LLMModel | `stream()` |
| `speak()` | TTSModel | `synthesize()` |
| `listen()` | STTModel | `transcribe()` |
| `recognize()` | OCRModel | `recognize()` |
| `embed()` | EmbeddingModel | `embed()` |

### Dziedziczenie Modeli

```mermaid
classDiagram
    class BaseModel {
        +modality: string
        +config: ModelConfig
        +loaded: boolean
        +load()
        +dispose()
    }
    
    class LLMModel {
        +chat(messages)
        +complete(prompt)
        +stream(messages)
    }
    
    class TTSModel {
        +synthesize(text)
    }
    
    class STTModel {
        +transcribe(audio)
    }
    
    class EmbeddingModel {
        +embed(texts)
    }
    
    class OCRModel {
        +recognize(image)
    }
    
    BaseModel <|-- LLMModel
    BaseModel <|-- TTSModel
    BaseModel <|-- STTModel
    BaseModel <|-- EmbeddingModel
    BaseModel <|-- OCRModel
```

### VectorizationService → Adaptery

```mermaid
classDiagram
    class EmbeddingAdapter {
        <<interface>>
        +embed(content)
        +getModality()
    }
    
    class AudioEmbeddingAdapter {
        -sttModel: STTModel
        -embeddingModel: EmbeddingModel
        +embed(audio)
    }
    
    class ImageEmbeddingAdapter {
        -embeddingModel: EmbeddingModel
        +embed(image)
    }
    
    class VideoAsAudioAdapter {
        -audioAdapter: AudioEmbeddingAdapter
        +embed(video)
    }
    
    EmbeddingAdapter <|.. AudioEmbeddingAdapter
    EmbeddingAdapter <|.. ImageEmbeddingAdapter
    EmbeddingAdapter <|.. VideoAsAudioAdapter
    
    VideoAsAudioAdapter --> AudioEmbeddingAdapter
```

---

## Wybór Backendu

```mermaid
flowchart TD
    Start[Żądanie ładowania modelu] --> DetectEnv{Detekcja środowiska}
    
    DetectEnv --> |Przeglądarka| BrowserCheck{WebGPU dostępne?}
    DetectEnv --> |Node.js| NodeCheck{GPU dostępne?}
    
    BrowserCheck --> |Tak| WebGPU[Użyj WebGPU]
    BrowserCheck --> |Nie| WASM[Użyj WASM]
    
    NodeCheck --> |Tak| GPU[Użyj GPU]
    NodeCheck --> |Nie| CPU[Użyj CPU]
    
    WebGPU --> LoadModel[Załaduj model]
    WASM --> LoadModel
    GPU --> LoadModel
    CPU --> LoadModel
```

---

## System Zdarzeń

AIProvider emituje następujące zdarzenia:

| Zdarzenie | Payload | Kiedy |
|-----------|---------|-------|
| `progress` | `{ modality, file, progress, loaded, total }` | Podczas ładowania modelu |
| `ready` | `{ modality }` | Po załadowaniu modelu |
| `error` | `{ modality, error }` | Przy błędzie |

```typescript
provider.on('progress', ({ modality, file, progress }) => {
  console.log(`${modality}: ${file} (${progress}%)`);
});

provider.on('ready', ({ modality }) => {
  console.log(`${modality} gotowy!`);
});
```

---

## Web Workers

WorkerPool zarządza pulą workerów dla ciężkich operacji:

```mermaid
graph LR
    subgraph Main Thread
        AI[AIProvider]
        WP[WorkerPool]
    end
    
    subgraph Workers
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
        W4[Worker N]
    end
    
    AI --> WP
    WP --> W1 & W2 & W3 & W4
    
    W1 --> |postMessage| AI
    W2 --> |postMessage| AI
    W3 --> |postMessage| AI
    W4 --> |postMessage| AI
```

**Rozmiar puli**: `min(8, navigator.hardwareConcurrency || 4)`

---

## IndexedDB Vector Store

VectorStore przechowuje embeddingi lokalnie w IndexedDB:

| Store | Klucz | Wartość |
|-------|-------|---------|
| `vectors` | `id` | `{ vector: Float32Array, metadata: VectorDocMeta }` |

**Operacje:**
- `store(id, vector, metadata)` - zapis wektora
- `search(queryVector, topK)` - wyszukiwanie najbliższych wektorów
- `delete(ids)` - usuwanie wektorów

---

## Powiązane Pliki

- `src/index.ts` - Główny punkt eksportu
- `src/app/AIProvider.ts` - Fasada główna
- `src/app/ModelManager.ts` - Zarządzanie modelami
- `src/app/vectorization/VectorizationService.ts` - Wektoryzacja
- `src/app/backend/BackendSelector.ts` - Wybór backendu
- `src/infra/workers/WorkerPool.ts` - Pula workerów
