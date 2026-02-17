import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@upstash/qstash';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { QstashSendOptions } from './dto/qstash-message.dto';

@Injectable()
export class UpstashQstashService {
  private readonly logger = new Logger(UpstashQstashService.name);
  private readonly client: Client | null;
  private readonly serverEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('qstash.token');
    const server = this.configService.get<string>('serverUrl') ?? '';
    this.serverEndpoint = server;

    if (!token) {
      this.logger.warn('QStash token not configured; QStash disabled');
      this.client = null;
      return;
    }

    this.client = new Client({ token });
  }

  async sendMessage(
    path: string,
    payload: unknown,
    options?: QstashSendOptions,
  ): Promise<void> {
    if (!this.client) {
      this.logger.error('QStash client is not initialized');
      throw new Error('QStash not configured');
    }

    const url = `${this.serverEndpoint}${path}`;
    const timestamp = Date.now().toString();
    const body = JSON.stringify(payload);
    const signature = this.generateSignature(path, timestamp, body);

    this.logger.debug(`Sending message to QStash: ${url} with payload`);

    try {
      await this.client.publish({
        destination: url,
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Signature': signature,
          ...(options?.headers ?? {}),
        },
        body,
        delay: options?.delay ?? 0,
        retry: options?.retry ?? 0,
      });

      this.logger.debug('Message published to QStash successfully');
    } catch (error) {
      this.logger.error('Failed to publish message to QStash', error as Error);
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
    const query = '';
    return [method, path, query, timestamp, body].join('\n');
  }

  private computeHmacSignature(secret: string, data: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}
