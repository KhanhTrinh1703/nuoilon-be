import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiOcrResponseDto } from './dto';
import { GeminiService } from './gemini.service';
import { OpenAICompatibleOcrService } from './openai-compatible-ocr.service';

export type OcrProvider = 'gemini' | 'llm';

export interface OcrResult {
  provider: OcrProvider;
  model: string;
  resultJson: GeminiOcrResponseDto;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly activeProvider: OcrProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly openAICompatibleOcrService: OpenAICompatibleOcrService,
  ) {
    const configured =
      this.configService.get<string>('ocr.provider') ?? 'gemini';
    this.activeProvider = configured === 'llm' ? 'llm' : 'gemini';

    this.logger.log(`OCR provider set to: ${this.activeProvider}`);
  }

  async performOcr(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (this.activeProvider === 'llm') {
      try {
        const model =
          this.configService.get<string>('llmProvider.model') ?? 'unknown';
        const resultJson = await this.openAICompatibleOcrService.performOcr(
          imageBuffer,
          mimeType,
        );
        return { provider: 'llm', model, resultJson };
      } catch (error) {
        this.logger.warn(
          'LLM OCR provider failed; falling back to Gemini OCR provider',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    const models = this.configService.get<string[]>('gemini.models') ?? [];
    const model = models[0] ?? 'gemini';
    const resultJson = await this.geminiService.performOcr(
      imageBuffer,
      mimeType,
    );
    return { provider: 'gemini', model, resultJson };
  }
}
