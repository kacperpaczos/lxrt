/**
 * Vercel AI SDK Adapter
 * Provides compatibility with Vercel AI SDK streaming
 */

import { AIProvider } from '../app/AIProvider';
import { Message } from '../core/types';

/**
 * Vercel AI SDK Message interface
 */
export interface VercelMessage {
    role: 'system' | 'user' | 'assistant' | 'function' | 'data' | 'tool';
    content: string;
    id?: string;
    createdAt?: Date;
}

/**
 * Adapter for Vercel AI SDK 'useChat' and streaming
 */
export class VercelAdapter {
    private provider: AIProvider;

    constructor(provider: AIProvider) {
        this.provider = provider;
    }

    /**
     * Create a ReadableStream for Vercel AI SDK
     * Compatible with 'AIStream' and 'StreamingTextResponse'
     */
    async createStreamResponse(
        messages: VercelMessage[],
        options?: {
            temperature?: number;
            topP?: number;
            maxTokens?: number;
        }
    ): Promise<ReadableStream> {
        const lxrtMessages: Message[] = messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
        }));

        const iterator = this.provider.stream(lxrtMessages, {
            temperature: options?.temperature,
            topP: options?.topP,
            maxTokens: options?.maxTokens,
        });

        const encoder = new TextEncoder();

        return new ReadableStream({
            async start(controller) {
                try {
                    for await (const token of iterator) {
                        controller.enqueue(encoder.encode(token));
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });
    }

    /**
     * Completion method compatible with Vercel AI SDK 'generateText' (simplified)
     */
    async generateText(
        prompt: string,
        options?: {
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<{ text: string }> {
        const text = await this.provider.complete(prompt, options);
        return { text };
    }
}
