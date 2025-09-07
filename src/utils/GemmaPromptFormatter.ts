import type { ChatMessage } from '@/types/medical.types';

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
      if (message.role === 'system') {
        systemPrompt = message.content;
      } else if (message.role === 'user') {
        userContent = message.content;
      } else if (message.role === 'assistant' || message.role === 'model') {
        gemmaPrompt += `<start_of_turn>model\n${message.content}<end_of_turn>\n`;
      }
    }

    const combinedUserContent = systemPrompt && userContent 
      ? `${systemPrompt}\n\n${userContent}`
      : systemPrompt || userContent;

    gemmaPrompt = `<start_of_turn>user\n${combinedUserContent}<end_of_turn>\n<start_of_turn>model\n${gemmaPrompt}`;

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

  static createGemmaRequest(messages: ChatMessage[], modelName: string, options: Record<string, unknown> = {}) {
    if (this.isGemmaModel(modelName)) {
      const formatted = this.formatForGemma(messages);
      
      // For Gemma models, convert the formatted prompt back to a single user message
      // This works with LMStudio's chat/completions endpoint
      return {
        model: modelName,
        messages: [
          { role: 'user' as const, content: formatted.prompt }
        ],
        ...options
      };
    }
    
    // For non-Gemma models, use the original messages
    return {
      model: modelName,
      messages,
      ...options
    };
  }
}