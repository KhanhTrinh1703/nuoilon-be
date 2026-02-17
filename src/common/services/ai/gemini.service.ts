import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, GenerateContentResponse, Part } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GeminiOcrResponseDto } from './dto/gemini-ocr-response.dto';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import { randomInt } from 'crypto';
import {
  GreetingSchema,
  GeminiGreetingResponseDto,
} from './dto/gemini-greeting-response.dto';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAIClient: GoogleGenAI | null = null;
  private readonly ocrPromptTemplate: string | null;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly models: string[];

  constructor(private readonly configService: ConfigService) {
    this.models = this.configService.get<string[]>('gemini.models') || [];
    this.ocrPromptTemplate = this.loadPromptTemplate('ocr-prompt.txt');
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
        model: this.models[randomInt(0, this.models.length)],
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

  async getCertificatePrice(): Promise<Record<string, unknown>> {
    this.assertReady();
    try {
      const prompts = this.loadPromptTemplate('price-prompt.txt');
      const response = await this.genAIClient!.models.generateContent({
        model: this.models[randomInt(0, this.models.length)],
        contents: [{ text: prompts ?? '' }],
        config: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          tools: [{ urlContext: {} }],
        },
      });
      const textContent = response.candidates?.[0]?.content?.parts?.[0]?.text;

      const parsed = this.extractJson(textContent!) as unknown as Record<
        string,
        unknown
      >;
      return parsed;
    } catch (error) {
      this.logger.error('Error fetching Gemini model info', error);
      throw new Error('Gemini API error');
    }
  }

  async greet(): Promise<GeminiGreetingResponseDto> {
    this.assertReady();
    try {
      const prompts = this.loadPromptTemplate('greeting-prompt.txt');
      const response = await this.genAIClient!.models.generateContent({
        model: this.models[randomInt(0, this.models.length)],
        contents: [{ text: prompts ?? '' }],
        config: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
        },
      });
      const textContent =
        response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = this.extractJson(textContent);
      return GreetingSchema.parse(parsed);
    } catch (error) {
      this.logger.error('Error greeting Gemini', error);
      return {
        message: 'Chào mấy con gà, mấy con gà làm đếch gì biết về tài chính!',
      };
    }
  }

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
    if (!this.genAIClient) {
      this.logger.error('Gemini client is not initialized');
      throw new Error('Gemini OCR service not configured');
    }
  }

  private parseResponse(
    response: GenerateContentResponse,
  ): GeminiOcrResponseDto {
    try {
      const textContent = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        this.logger.warn('No text content in Gemini response');
        return { type: 'undefined' };
      }

      const parsed = this.extractJson(textContent);
      const parsedRec = parsed;
      const typeVal = parsedRec['type'];
      const type = typeof typeVal === 'string' ? typeVal : '';

      if (type === 'deposit') {
        const amountVal = parsedRec['amount'];
        let amount = '';
        if (typeof amountVal === 'string') {
          amount = amountVal;
        } else if (typeof amountVal === 'number') {
          amount = String(amountVal);
        }

        const currencyRaw = parsedRec['currency'];
        let currency: string | null = null;
        if (currencyRaw === null) {
          currency = null;
        } else if (typeof currencyRaw === 'string') {
          currency = currencyRaw;
        } else if (typeof currencyRaw === 'number') {
          currency = String(currencyRaw);
        }

        const confidenceVal = parsedRec['confidence'];
        let confidence = 0;
        if (typeof confidenceVal === 'number') {
          confidence = confidenceVal;
        } else {
          confidence = Number(confidenceVal ?? 0);
        }

        return {
          type: 'deposit',
          amount,
          currency,
          confidence: Number.isNaN(confidence) ? 0 : confidence,
        };
      }

      if (type === 'certificate') {
        const mpVal = parsedRec['matched_price'];
        const mqVal = parsedRec['matched_quantity'];
        const confVal = parsedRec['confidence'];

        const matched_price =
          typeof mpVal === 'number' ? mpVal : Number(mpVal ?? 0);
        const matched_quantity =
          typeof mqVal === 'number' ? mqVal : Number(mqVal ?? 0);
        const confidence =
          typeof confVal === 'number' ? confVal : Number(confVal ?? 0);

        return {
          type: 'certificate',
          matched_price: Number.isNaN(matched_price) ? 0 : matched_price,
          matched_quantity: Number.isNaN(matched_quantity)
            ? 0
            : matched_quantity,
          confidence: Number.isNaN(confidence) ? 0 : confidence,
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
