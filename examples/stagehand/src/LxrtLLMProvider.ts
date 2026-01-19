import { LLMClient, toJsonSchema } from '@browserbasehq/stagehand';
import type { CreateChatCompletionOptions, LLMParsedResponse, AvailableModel } from '@browserbasehq/stagehand';
import { AIProvider } from 'lxrt';

export class LxrtLLMProvider extends LLMClient {
    private provider: AIProvider;

    constructor(provider: AIProvider, modelName: AvailableModel = 'local-llm') {
        super(modelName, "You are a helpful AI assistant running locally via LXRT.");
        this.provider = provider;
        this.hasVision = false; // Set to true if using visual model?
    }

    async createChatCompletion<T>(
        options: CreateChatCompletionOptions
    ): Promise<LLMParsedResponse<T> | any> {
        const { messages, response_model, tools, tool_choice, image } = options.options;

        // Konwersja formatu wiadomości Stagehand -> LXRT
        // Stagehand używa formatu zbliżonego do OpenAI
        // Ale image jest osobno w options? Sprawdźmy typy.
        // Typy mówią: ChatMessageContent = string | (ChatMessageImageContent | ChatMessageTextContent)[];
        // LXRT obsługuje Message[]

        // Jeśli mamy response_model, musimy wymusić JSON
        let systemPrompt = "You are a helpful assistant.";
        if (this.userProvidedInstructions) {
            systemPrompt += " " + this.userProvidedInstructions;
        }

        if (response_model) {
            const jsonSchema = toJsonSchema(response_model.schema as any);
            systemPrompt += `\nOutput strictly valid JSON strictly matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
        }

        // Dodanie system prompt jeśli nie ma
        const mappedMessages = messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) // Uproszczenie dla content array
        }));

        // Wstawienie system promptu
        if (mappedMessages.length > 0 && mappedMessages[0].role !== 'system') {
            mappedMessages.unshift({ role: 'system', content: systemPrompt });
        } else if (mappedMessages.length > 0 && mappedMessages[0].role === 'system') {
            mappedMessages[0].content += "\n" + systemPrompt;
        } else {
            mappedMessages.unshift({ role: 'system', content: systemPrompt });
        }

        // Wywołanie LXRT
        const response = await this.provider.chat(mappedMessages, {
            maxTokens: options.options.maxOutputTokens || 1024,
            temperature: options.options.temperature || 0.7,
            // stopSequences?
        });

        let content = response.content;

        // Jeśli image... to LXRT musi to obsłużyć jako multimodal (TODO)

        if (response_model) {
            // Próba wyciągnięcia JSONa
            try {
                // Proste czyszczenie markdowna ```json ... ```
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
                const jsonString = jsonMatch ? jsonMatch[1] : content;
                const data = JSON.parse(jsonString);

                return {
                    data: data as T,
                    usage: {
                        prompt_tokens: 0, // TODO: get from LXRT if available
                        completion_tokens: 0,
                        total_tokens: 0
                    }
                };
            } catch (e) {
                console.error("Failed to parse JSON from LXRT output:", content);
                throw new Error("Failed to parse structured output from model.");
            }
        }

        // Standardowa odpowiedź
        return {
            id: 'lxrt-' + Date.now(),
            object: 'chat.completion',
            created: Date.now(),
            model: this.modelName,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: content,
                        tool_calls: []
                    },
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            }
        } as any;
    }
}
