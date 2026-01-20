# LXRT + Stagehand Integration Guide

## Wprowadzenie

Integracja **LXRT** z frameworkiem **Stagehand** umożliwia tworzenie inteligentnych, w pełni lokalnych agentów przeglądarkowych. Dzięki wykorzystaniu lokalnych modeli LLM (poprzez silnik LXRT oparty na Transformers.js i ONNX Runtime), możemy automatyzować przeglądarkę, ekstrahować dane i testować aplikacje webowe bez przesyłania danych do chmury i bez ponoszenia kosztów API zewnętrznych dostawców.

### Kluczowe zalety:
- **Prywatność**: Żadne dane ze strony ani prompty nie opuszczają lokalnej maszyny.
- **Koszt**: Zerowy koszt inferencji (działa na Twoim CPU/GPU).
- **Niezależność**: Brak zależności od dostępności zewnętrznych usług i limitów rate-limiting.
- **Szybkość**: W przypadku małych modeli (np. Qwen 0.5B) i akceleracji WebGPU, czas reakcji może być bardzo krótki.

## Architektura Rozwiązania

Rozwiązanie opiera się na stworzeniu niestandardowego dostawcy LLM (`LxrtLLMProvider`), który implementuje interfejs klienta wymagany przez Stagehand, ale pod spodem deleguje zadania do silnika LXRT.

### Diagram Komponentów

```mermaid
graph TD
    subgraph "Stagehand Framework"
        SH[Stagehand V3]
        LLMC[Abstract LLMClient]
        
        SH -->|uses| LLMC
    end

    subgraph "Integracja (Lokalna)"
        LXP[LxrtLLMProvider]
        
        LLMC <|-- LXP
    end

    subgraph "LXRT Library"
        AIP[AIProvider]
        OA[OpenAI Adapter Interface]
        ENG[Inference Engine\n(Transformers.js)]
        
        LXP -->|delegates calls| AIP
        AIP -->|manages| ENG
    end

    subgraph "Hardware / Runtime"
        ONNX[ONNX Runtime]
        HW[CPU / WebGPU]
        
        ENG -->|executes| ONNX
        ONNX -->|runs on| HW
    end

    SH -- 1. Instruction & DOM --> LXP
    LXP -- 2. Formatted Prompt --> AIP
    AIP -- 3. Inference --> ONNX
    ONNX -- 4. Generated Tokens --> AIP
    AIP -- 5. Text Response --> LXP
    LXP -- 6. Structured JSON --> SH
```

### Sekwencja Działania

1. **Inicjalizacja**: Użytkownik tworzy instancję `AIProvider` (LXRT) z wybranym modelem.
2. **Setup Stagehand**: `LxrtLLMProvider` jest przekazywany do konfiguracji `Stagehand`.
3. **Akcja**: Użytkownik wywołuje np. `stagehand.extract()`.
4. **Przetwarzanie**: Stagehand tworzy prompt, `LxrtLLMProvider` formatuje go i wysyła do LXRT.
5. **Wynik**: LXRT generuje odpowiedź, która jest zwracana do Stagehand jako JSON.

## Dokumentacja

- [Konfiguracja i Uruchomienie](./setup.md)
- [Implementacja Techniczna](./implementation.md)
- [Scenariusze Użycia](./use-cases.md)
- [Rozwiązywanie Problemów](./troubleshooting.md)
