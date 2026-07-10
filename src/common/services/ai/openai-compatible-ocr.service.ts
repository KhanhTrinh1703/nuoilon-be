import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { GeminiOcrResponseDto, GeminiOcrResponseSchema } from './dto';

interface OpenAIMessage {
  role: string;
  content: unknown;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

@Injectable()
export class OpenAICompatibleOcrService implements OnModuleInit {
  private readonly logger = new Logger(OpenAICompatibleOcrService.name);
  private readonly ocrPromptTemplate: string | null;
  private baseUrl: string | null = null;
  private apiKey: string | null = null;
  private model: string | null = null;
  private readonly maxOutputTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.ocrPromptTemplate = this.loadPromptTemplate('ocr-prompt.txt');
    this.maxOutputTokens =
      this.configService.get<number>('llmProvider.maxOutputTokens') ?? 1024;
  }

  onModuleInit() {
    this.baseUrl =
      this.configService.get<string>('llmProvider.baseUrl') ?? null;
    this.apiKey = this.configService.get<string>('llmProvider.apiKey') ?? null;
    this.model = this.configService.get<string>('llmProvider.model') ?? null;

    if (!this.baseUrl || !this.apiKey || !this.model) {
      this.logger.warn(
        'OpenAI-compatible LLM provider not fully configured; OCR via this provider will not work',
      );
    }
  }

  async performOcr(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<GeminiOcrResponseDto> {
    this.assertReady();
    try {
      const base64Image = imageBuffer.toString('base64');
      const prompt = this.ocrPromptTemplate ?? '';

      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ];

      const response = await axios.post<OpenAIResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: this.maxOutputTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return this.parseResponse(response.data);
    } catch (error) {
      this.logger.error(
        'Error performing OCR with OpenAI-compatible provider',
        error,
      );
      throw new Error('OpenAI-compatible OCR service error');
    }
  }

  private parseResponse(response: OpenAIResponse): GeminiOcrResponseDto {
    try {
      const textContent = response.choices?.[0]?.message?.content;

      if (!textContent) {
        this.logger.warn('No text content in OpenAI-compatible response');
        return { type: 'undefined' };
      }

      const parsed = this.extractJson(textContent);
      const result = GeminiOcrResponseSchema.safeParse(parsed);

      if (!result.success) {
        this.logger.warn(
          'Failed to validate OpenAI-compatible OCR response',
          result.error.issues,
        );
        return { type: 'undefined' };
      }

      return result.data;
    } catch (error) {
      this.logger.error('Error parsing OpenAI-compatible OCR response', error);
      return { type: 'undefined' };
    }
  }

  private extractJson(text: string): Record<string, unknown> {
    let cleaned = text.trim();
    const fencedMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (fencedMatch) {
      cleaned = fencedMatch[1];
    }

    let payload: unknown;
    try {
      payload = JSON.parse(cleaned);
    } catch {
      throw new Error(`Invalid JSON from LLM provider`);
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new Error('LLM provider JSON response must be an object');
    }

    return payload as Record<string, unknown>;
  }

  private loadPromptTemplate(fileName: string): string | null {
    try {
      const filePath = join(__dirname, 'prompts', fileName);
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      this.logger.warn('Failed to load prompt template', error);
      return null;
    }
  }

  private assertReady(): void {
    if (!this.baseUrl || !this.apiKey || !this.model) {
      throw new Error('OpenAI-compatible OCR provider not configured');
    }
  }
}
