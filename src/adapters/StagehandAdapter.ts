/**
 * Stagehand Adapter
 * Wraps AIProvider to mimic the OpenAI SDK Client interface required by Stagehand.
 */

import { AIProvider } from '../app/AIProvider';
import { OpenAIAdapter } from './OpenAIAdapter';
import type {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
} from '../core/types';

export class StagehandAdapter {
  private openaiAdapter: OpenAIAdapter;
  public chat: {
    completions: {
      create: (
        params: OpenAIChatCompletionRequest
      ) => Promise<OpenAIChatCompletionResponse>;
    };
  };
  public embeddings: {
    create: (params: {
      input: string | string[];
      model?: string;
    }) => Promise<any>;
  };

  /**
   * @param provider The backend AIProvider instance
   */
  constructor(provider: AIProvider) {
    this.openaiAdapter = new OpenAIAdapter(provider);

    // Bind methods to maintain 'this' context
    this.chat = {
      completions: {
        create: this.createChatCompletion.bind(this),
      },
    };

    this.embeddings = {
      create: this.createEmbeddings.bind(this),
    };
  }

  private async createChatCompletion(
    params: OpenAIChatCompletionRequest
  ): Promise<OpenAIChatCompletionResponse> {
    // Delegate to existing OpenAI logic
    return this.openaiAdapter.createChatCompletion(params);
  }

  private async createEmbeddings(params: {
    input: string | string[];
    model?: string;
  }): Promise<any> {
    return this.openaiAdapter.createEmbeddings(params);
  }
}
