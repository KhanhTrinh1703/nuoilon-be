import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, GenerateContentResponse, Part } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { GeminiOcrResponseDto } from '../dto/gemini-result-dto';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

@Injectable()
export class GeminiOcrService {
  private readonly logger = new Logger(GeminiOcrService.name);
  private genAIClient: GoogleGenAI | null = null;
  private readonly model: string;
  private readonly ocrPromptTemplate: string | null;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.model =
      this.configService.get<string>('gemini.model') || 'gemini-2.5-flash-lite';
    this.ocrPromptTemplate = this.loadOcrPromptTemplate();
    this.temperature =
      this.configService.get<number>('gemini.temperature') ?? 0.0;
    this.maxOutputTokens =
      this.configService.get<number>('gemini.maxOutputTokens') ?? 1024;
    this.initializeClient();
  }

  async performOcr(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<GeminiOcrResponseDto> {
    this.assertReady();
    try {
      const imagePart = this.fileToGenerativePart(imageBuffer, mimeType);
      const prompt = this.ocrPromptTemplate ?? '';

      const response = await this.genAIClient!.models.generateContent({
        model: this.model,
        config: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
        },
        contents: [imagePart, { text: prompt }],
      });

      return this.parseResponse(response);
    } catch (error) {
      this.logger.error('Error performing OCR with Gemini', error);
      throw new Error('Gemini OCR service error');
    }
  }

  // This method is for testing purposes only
  async testPerformOcr(): Promise<GeminiOcrResponseDto> {
    const response = await axios.get('your-test-image-url-here', {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data as ArrayBufferLike);
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    const mimeType = fileTypeResult?.mime ?? 'image/jpeg';
    return this.performOcr(buffer, mimeType);
  }

  private fileToGenerativePart(fileBuffer: Buffer, mimeType: string): Part {
    return {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };
  }

  private initializeClient(): void {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      this.logger.warn(
        'Gemini API key not configured; Gemini OCR service will not work',
      );
      return;
    }

    this.genAIClient = new GoogleGenAI({ apiKey });
  }

  private loadOcrPromptTemplate(): string | null {
    try {
      return readFileSync('src/telegram/prompts/ocr-prompt.txt', 'utf-8');
    } catch (error) {
      this.logger.warn('Failed to load OCR prompt template', error);
      return null;
    }
  }

  private assertReady(): void {
    if (!this.genAIClient) {
      this.logger.error('Gemini client is not initialized');
      throw new Error('Gemini OCR service not configured');
    }
  }

  private parseResponse(
    response: GenerateContentResponse,
  ): GeminiOcrResponseDto {
    try {
      // Extract text content from Gemini response
      const textContent = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        this.logger.warn('No text content in Gemini response');
        return { type: 'undefined' };
      }

      // Parse JSON from response text
      const parsed = this.extractJson(
        textContent,
      ) as unknown as GeminiOcrResponseDto;

      // Discriminate based on type field
      if (parsed.type === 'deposit') {
        return {
          type: 'deposit',
          amount: parsed.amount || '',
          currency: parsed.currency || null,
          confidence: Number(parsed.confidence) || 0,
        };
      }

      if (parsed.type === 'certificate') {
        return {
          type: 'certificate',
          matched_price: Number(parsed.matched_price) || 0,
          matched_quantity: Number(parsed.matched_quantity) || 0,
          confidence: Number(parsed.confidence) || 0,
        };
      }

      return { type: 'undefined' };
    } catch (error) {
      this.logger.error('Error parsing Gemini OCR response', error);
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
      throw new Error(`Invalid JSON from Gemini: ${cleaned}`);
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new Error('Gemini JSON response must be an object');
    }

    return payload as Record<string, unknown>;
  }
}
