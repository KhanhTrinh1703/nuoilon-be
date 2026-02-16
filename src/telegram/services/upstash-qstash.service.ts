import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@upstash/qstash';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { OcrResultCallbackDto } from '../dto/ocr-result-callback.dto';

export interface PublishOcrJobPayload {
  jobId: string;
  idempotencyKey: string;
  chatId: number;
  userId: number;
}

@Injectable()
export class UpstashQstashService {
  private readonly logger = new Logger(UpstashQstashService.name);
  private readonly client: Client | null = null;
  private readonly serverEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      token: this.configService.get<string>('qstash.token'),
    });
    this.serverEndpoint = this.configService.get<string>('serverUrl') ?? '';
  }

  async publishOcrJob(payload: PublishOcrJobPayload): Promise<void> {
    await this.sendMessage('/api/v1/telegram/ocr-job/start', payload);
  }

  async publishOcrResult(
    jobId: string,
    payload: OcrResultCallbackDto,
  ): Promise<void> {
    await this.sendMessage(`/api/v1/telegram/ocr-job/${jobId}/result`, payload);
  }

  async sendMessage(path: string, payload: any) {
    if (!this.client) {
      this.logger.error('QStash client is not initialized');
      throw new Error('QStash not configured');
    }

    const url = `${this.serverEndpoint}${path}`;
    const timestamp = Date.now().toString();
    const body = JSON.stringify(payload);
    const signature = this.generateSignature(path, timestamp, body);

    this.logger.debug(
      `Sending message to QStash: ${url} with payload: ${body}`,
    );

    try {
      await this.client.publish({
        destination: url,
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
        body: body,
        delay: 10,
        retry: 3,
      });

      this.logger.debug('Message published to QStash successfully');
    } catch (error) {
      this.logger.error('Failed to publish message to QStash', error);
      throw error;
    }
  }

  private generateSignature(
    path: string,
    timestamp: string,
    body: string,
  ): string {
    const secret = this.configService.get<string>('security.activeSecret');
    if (!secret) {
      throw new Error('ACTIVE_SECRET not configured');
    }

    const stringToSign = this.buildStringToSign(path, timestamp, body);
    return this.computeHmacSignature(secret, stringToSign);
  }

  private buildStringToSign(
    path: string,
    timestamp: string,
    body: string,
  ): string {
    const method = 'POST';
    const query = ''; // No query params in the path

    // Build string: METHOD\nPATH\nQUERY\nTIMESTAMP\nBODY
    return [method, path, query, timestamp, body].join('\n');
  }

  private computeHmacSignature(secret: string, data: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}
