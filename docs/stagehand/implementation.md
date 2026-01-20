# Implementacja Techniczna

## Klasa `LxrtLLMProvider`

Jest to serce integracji. Klasa ta dziedziczy po abstrakcyjnej klasie `LLMClient` z pakietu `@browserbasehq/stagehand`.

### Kluczowe Wyzwania

1. **Obsługa Structured Outputs**:
   Stagehand polega na zwracaniu przez LLM ściśle określonych struktur JSON. Lokalne modele często wymagają specjalnego promptingu ("json mode"), aby wygenerować poprawny JSON zgodny ze schematem Zod.
   *Rozwiązanie*: Konwersja Zod -> JSON Schema i wstrzyknięcie instrukcji do promptu systemowego.

2. **Mapowanie Wiadomości**:
   Dostosowanie formatu wiadomości Stagehand (bogaty obiekt) do formatu LXRT (prosta lista wiadomości).

### Kod Adaptera

Poniżej znajduje się pełna implementacja adaptera:

```typescript
import { LLMClient, toJsonSchema } from '@browserbasehq/stagehand';
import type { CreateChatCompletionOptions, LLMParsedResponse, AvailableModel } from '@browserbasehq/stagehand';
import { AIProvider } from 'lxrt';

export class LxrtLLMProvider extends LLMClient {
    private provider: AIProvider;

    constructor(provider: AIProvider, modelName: AvailableModel = 'local-llm') {
        super(modelName, "You are a helpful AI assistant running locally via LXRT.");
        this.provider = provider;
    }

    async createChatCompletion<T>(
        options: CreateChatCompletionOptions
    ): Promise<LLMParsedResponse<T> | any> {
        const { messages, response_model } = options.options;
        
        let systemPrompt = "You are a helpful assistant.";
        if (response_model) {
            const jsonSchema = toJsonSchema(response_model.schema as any);
            systemPrompt += `\nOutput strictly valid JSON strictly matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
        }

        // Mapowanie wiadomości Stagehand -> LXRT
        const mappedMessages = messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        }));

        // Dodanie instrukcji systemowej
        mappedMessages.unshift({ role: 'system', content: systemPrompt });

        // Wywołanie modelu
        const response = await this.provider.chat(mappedMessages, {
            maxTokens: options.options.maxOutputTokens || 1024,
            temperature: 0.7,
        });

        // Parsowanie wyniku (prosta ekstrakcja JSON z Markdown)
        if (response_model) {
            try {
                const content = response.content;
                // Szukanie bloku JSON w markdown
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
                const jsonString = jsonMatch ? jsonMatch[1] : content;
                return { data: JSON.parse(jsonString) };
            } catch (e) {
                console.error("Failed to parse JSON:", response.content);
                throw new Error("Failed to parse structured output.");
            }
        }
        
        return {
            id: 'lxrt-' + Date.now(),
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: response.content } }]
        };
    }
}
```
