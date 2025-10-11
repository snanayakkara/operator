import type { ChatMessage, LMStudioRequest } from '@/types/medical.types';

export interface GemmaFormattedPrompt {
  prompt: string;
  isGemmaFormat: boolean;
}

export class GemmaPromptFormatter {
  private static readonly GEMMA_MODEL_PATTERNS = [
    /gemma/i,
    /medgemma/i
  ];

  static isGemmaModel(modelName: string): boolean {
    return this.GEMMA_MODEL_PATTERNS.some(pattern => pattern.test(modelName));
  }

  static formatForGemma(messages: ChatMessage[]): GemmaFormattedPrompt {
    if (messages.length === 0) {
      return {
        prompt: '<start_of_turn>user\n<end_of_turn>\n<start_of_turn>model\n',
        isGemmaFormat: true
      };
    }

    let gemmaPrompt = '';
    let systemPrompt = '';
    let userContent = '';

    for (const message of messages) {
      const renderedContent = this.renderContent(message.content);
      if (message.role === 'system') {
        systemPrompt = renderedContent;
      } else if (message.role === 'user') {
        userContent = renderedContent;
      } else if (message.role === 'assistant' || message.role === 'model') {
        gemmaPrompt += `<start_of_turn>model\n${renderedContent}<end_of_turn>\n`;
      }
    }

    const combinedUserContent = systemPrompt && userContent 
      ? `${systemPrompt}\n\n${userContent}`
      : systemPrompt || userContent;

    // Build the final prompt - include existing model responses if any, otherwise end cleanly
    if (gemmaPrompt.length > 0) {
      // There are existing model responses, include them
      gemmaPrompt = `<start_of_turn>user\n${combinedUserContent}<end_of_turn>\n<start_of_turn>model\n${gemmaPrompt}`;
    } else {
      // No existing model responses, create a clean prompt
      gemmaPrompt = `<start_of_turn>user\n${combinedUserContent}<end_of_turn>\n<start_of_turn>model\n`;
    }

    return {
      prompt: gemmaPrompt,
      isGemmaFormat: true
    };
  }

  static formatMessages(messages: ChatMessage[], modelName: string): GemmaFormattedPrompt | ChatMessage[] {
    if (this.isGemmaModel(modelName)) {
      return this.formatForGemma(messages);
    }
    return messages;
  }

  static createGemmaRequest(messages: ChatMessage[], modelName: string, options: Record<string, unknown> = {}): LMStudioRequest {
    const baseRequest = {
      model: modelName,
      ...options
    } as LMStudioRequest;

    // TEMP DEBUG: Disable Gemma formatting for medgemma-27b-text-it-mlx to test
    if (this.isGemmaModel(modelName) && !modelName.includes('medgemma-27b')) {
      const formatted = this.formatForGemma(messages);
      baseRequest.messages = [
        { role: 'user' as const, content: formatted.prompt }
      ];
      return baseRequest;
    }

    // For non-Gemma models OR medgemma-27b (testing), use the original messages
    baseRequest.messages = messages;
    return baseRequest;
  }

  private static renderContent(content: ChatMessage['content']): string {
    if (typeof content === 'string') {
      return content;
    }

    return content
      .map(part => {
        if (part.type === 'text') {
          return part.text;
        }
        return `[image:${part.image_url.url}]`;
      })
      .join('\n');
  }
}
