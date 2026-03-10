import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstashQstashService } from '../../common/services/messaging/upstash-qstash.service';
import { signRequest } from '../../common/utils/hmac-signer.util';
import {
  AppscriptCertificatePayloadDto,
  AppscriptDepositPayloadDto,
  AppscriptOcrPayloadDto,
} from '../dto/appscript-ocr-payload.dto';
import { OcrResultCallbackDto } from '../dto/ocr-result-callback.dto';
import { PublishOcrJobDto } from '../dto/publish-ocr-job-dto';

@Injectable()
export class TelegramQstashService {
  private readonly logger = new Logger(TelegramQstashService.name);

  constructor(
    private readonly qstashService: UpstashQstashService,
    private readonly configService: ConfigService,
  ) {}

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

  async publishOcrResultToAppScript(
    transactionType: 'deposit' | 'certificate',
    data:
      | Omit<AppscriptDepositPayloadDto, 'transactionType'>
      | Omit<AppscriptCertificatePayloadDto, 'transactionType'>,
  ): Promise<void> {
    const appscriptUrl = this.configService.get<string>('appscript.webAppUrl');
    if (!appscriptUrl) {
      this.logger.warn(
        'APPSCRIPT_WEB_APP_URL not configured; skipping AppScript publish',
      );
      return;
    }

    const secret = this.configService.get<string>('security.activeSecret');
    if (!secret) {
      this.logger.warn(
        'ACTIVE_SECRET not configured; skipping AppScript publish',
      );
      return;
    }

    const payload: AppscriptOcrPayloadDto =
      transactionType === 'deposit'
        ? {
            transactionType: 'deposit',
            ...(data as Omit<AppscriptDepositPayloadDto, 'transactionType'>),
          }
        : {
            transactionType: 'certificate',
            ...(data as Omit<
              AppscriptCertificatePayloadDto,
              'transactionType'
            >),
          };

    const body = JSON.stringify(payload);

    const parsedUrl = new URL(appscriptUrl);
    const path = parsedUrl.pathname;
    const query = parsedUrl.search.replace(/^\?/, '');

    const { timestamp, signature } = signRequest({
      method: 'POST',
      path,
      query,
      body,
      secret,
    });

    await this.qstashService.sendToExternalUrl(appscriptUrl, payload, {
      headers: {
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
    });

    this.logger.log(
      `OCR result published to AppScript: transactionType=${transactionType}`,
    );
  }
}
