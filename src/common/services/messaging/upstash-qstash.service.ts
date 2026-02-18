import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@upstash/qstash';
import { ConfigService } from '@nestjs/config';
import { QstashSendOptions } from './dto/qstash-message.dto';

@Injectable()
export class UpstashQstashService {
  private readonly logger = new Logger(UpstashQstashService.name);
  private readonly client: Client | null;
  private readonly serverEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('qstash.token');
    const qstashUrl = this.configService.get<string>('qstash.url');
    const server = this.configService.get<string>('serverUrl') ?? '';
    this.serverEndpoint = server;

    if (!token) {
      this.logger.warn('QStash token not configured; QStash disabled');
      this.client = null;
      return;
    }

    this.client = new Client({ baseUrl: qstashUrl, token });
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
    this.logger.debug(
      `Sending message to QStash: ${url} with payload ${JSON.stringify(payload)}`,
    );

    try {
      await this.client.publishJSON({
        url: url,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
        body: payload,
        delay: options?.delay ?? 0,
        retry: options?.retry ?? 1,
      });

      this.logger.debug('Message published to QStash successfully');
    } catch (error) {
      this.logger.error('Failed to publish message to QStash', error as Error);
      throw error;
    }
  }
}
