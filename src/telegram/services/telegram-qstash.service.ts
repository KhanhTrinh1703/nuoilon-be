import { Injectable } from '@nestjs/common';
import { UpstashQstashService } from '../../common/services/messaging/upstash-qstash.service';
import { OcrResultCallbackDto } from '../dto/ocr-result-callback.dto';
import { PublishOcrJobDto } from '../dto/publish-ocr-job-dto';

@Injectable()
export class TelegramQstashService {
  constructor(private readonly qstashService: UpstashQstashService) {}

  async publishOcrJob(payload: PublishOcrJobDto): Promise<void> {
    await this.qstashService.sendMessage(
      '/api/v1/telegram/ocr-jobs/start',
      payload,
    );
  }

  async publishOcrResult(
    jobId: string,
    payload: OcrResultCallbackDto,
  ): Promise<void> {
    await this.qstashService.sendMessage(
      `/api/v1/telegram/ocr-jobs/${jobId}/result`,
      payload,
    );
  }

  async sendMessage(path: string, payload: unknown): Promise<void> {
    await this.qstashService.sendMessage(path, payload);
  }
}
