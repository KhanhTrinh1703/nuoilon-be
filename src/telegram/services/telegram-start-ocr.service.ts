import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

import { PublishOcrJobDto } from '../dto/publish-ocr-job-dto';
import { GeminiService } from '../../common/services/ai/gemini.service';
import { OcrJobRepository } from '../repositories/ocr-job.repository';
import { SupabaseStorageService } from '../../common/services/storage/supabase-storage.service';
import { TelegramQstashService } from './telegram-qstash.service';

@Injectable()
export class TelegramStartOcrService {
  private readonly logger = new Logger(TelegramStartOcrService.name);

  constructor(
    private readonly geminiOcrService: GeminiService,
    private readonly ocrJobRepository: OcrJobRepository,
    private readonly supabaseStorageService: SupabaseStorageService,
    private readonly telegramQstashService: TelegramQstashService,
  ) {}

  async startOcrJob(payload: PublishOcrJobDto): Promise<void> {
    this.logger.debug(
      `Starting OCR job with payload: ${JSON.stringify(payload)}`,
    );

    const signedUrl = await this.getSignedUrlForImage(payload.idempotencyKey);
    const { buffer, mimeType } =
      await this.downloadImageFromSupabase(signedUrl);
    const ocrResult = await this.geminiOcrService.performOcr(buffer, mimeType);

    await this.telegramQstashService.publishOcrResult(payload.jobId, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      resultJson: ocrResult as unknown as Record<string, unknown>,
    });
  }

  private async getSignedUrlForImage(idempotencyKey: string): Promise<string> {
    const job =
      await this.ocrJobRepository.findByIdempotencyKey(idempotencyKey);

    if (!job) {
      throw new NotFoundException('OCR job not found');
    }

    const signed = await this.supabaseStorageService.createSignedUrl(
      job.storageBucket,
      job.storagePath,
    );

    return signed.signedUrl;
  }

  private async downloadImageFromSupabase(
    signedUrl: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await axios.get(signedUrl, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data as ArrayBufferLike);
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    const mimeType = fileTypeResult?.mime ?? 'image/jpeg';
    return { buffer, mimeType };
  }
}
