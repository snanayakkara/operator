/**
 * StreamingParser - Server-Sent Events (SSE) parser for OpenAI-compatible streaming
 *
 * Handles parsing of text/event-stream responses from LMStudio and other
 * OpenAI-compatible endpoints for real-time token streaming.
 */

export interface StreamingChunk {
  content: string;
  finished: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class StreamingParser {
  /**
   * Parse SSE data chunks and extract content deltas
   */
  static parseSSEChunk(rawChunk: string): StreamingChunk[] {
    const results: StreamingChunk[] = [];

    // Split by line breaks and process data: lines
    const lines = rawChunk.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine.startsWith('data: ')) {
        continue;
      }

      const data = trimmedLine.slice(6).trim(); // Remove 'data: ' prefix

      // Handle [DONE] marker
      if (data === '[DONE]') {
        results.push({ content: '', finished: true });
        continue;
      }

      // Skip empty data lines
      if (!data) {
        continue;
      }

      try {
        const parsed = JSON.parse(data);

        // Extract content delta from OpenAI-compatible response
        const contentDelta = parsed.choices?.[0]?.delta?.content;

        if (contentDelta) {
          results.push({
            content: contentDelta,
            finished: false
          });
        }

        // Check for usage information (typically comes at the end)
        const usage = parsed.usage;
        if (usage && !contentDelta) {
          results.push({
            content: '',
            finished: true,
            usage
          });
        }

      } catch (parseError) {
        // Silently ignore malformed JSON chunks (common in SSE streams)
        continue;
      }
    }

    return results;
  }

  /**
   * Create a ReadableStream processor for streaming responses
   */
  static createStreamProcessor(
    onToken: (delta: string) => void,
    onComplete: (fullText: string, usage?: any) => void,
    onError: (error: Error) => void
  ) {
    let fullText = '';
    let buffer = '';

    return new TransformStream({
      transform(chunk: Uint8Array, controller) {
        const text = new TextDecoder().decode(chunk);
        buffer += text;

        // Process complete frames (ending with \n\n)
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || ''; // Keep incomplete frame in buffer

        for (const frame of frames) {
          if (!frame.trim()) continue;

          try {
            const chunks = StreamingParser.parseSSEChunk(frame);

            for (const chunk of chunks) {
              if (chunk.finished) {
                onComplete(fullText, chunk.usage);
                return;
              }

              if (chunk.content) {
                fullText += chunk.content;
                onToken(chunk.content);
              }
            }
          } catch (error) {
            onError(error as Error);
            return;
          }
        }

        controller.enqueue(chunk);
      },

      flush() {
        // Process any remaining buffer content
        if (buffer.trim()) {
          try {
            const chunks = StreamingParser.parseSSEChunk(buffer);
            for (const chunk of chunks) {
              if (chunk.finished) {
                onComplete(fullText, chunk.usage);
                return;
              }
              if (chunk.content) {
                fullText += chunk.content;
                onToken(chunk.content);
              }
            }
          } catch (error) {
            // Ignore errors in final flush
          }
        }

        // Ensure completion is called even if no [DONE] was received
        onComplete(fullText);
      }
    });
  }

  /**
   * Simple line-by-line SSE processor for basic streaming
   */
  static async processStreamResponse(
    response: Response,
    onToken: (delta: string) => void,
    onComplete: (fullText: string, usage?: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!response.body) {
      onError(new Error('No response body for streaming'));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              onComplete(fullText);
              return;
            }

            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              const contentDelta = parsed.choices?.[0]?.delta?.content;

              if (contentDelta) {
                fullText += contentDelta;
                onToken(contentDelta);
              }

              // Check for usage info
              const usage = parsed.usage;
              if (usage && !contentDelta) {
                onComplete(fullText, usage);
                return;
              }

            } catch (parseError) {
              // Ignore malformed JSON
              continue;
            }
          }
        }
      }

      // Complete if no [DONE] was received
      onComplete(fullText);

    } catch (error) {
      onError(error as Error);
    } finally {
      reader.releaseLock();
    }
  }
}