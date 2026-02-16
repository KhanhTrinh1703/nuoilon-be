import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@upstash/qstash';
import { ConfigService } from '@nestjs/config';

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

  async sendMessage(path: string, payload: Record<string, unknown>) {
    if (!this.client) {
      this.logger.error('QStash client is not initialized');
      throw new Error('QStash not configured');
    }
    const url = `${this.serverEndpoint}${path}`;
    this.logger.debug(
      `Sending message to QStash: ${url} with payload: ${JSON.stringify(payload)}`,
    );
    try {
      await this.client.publishJSON({
        url,
        body: { ...payload },
        retry: 3,
        delay: 10,
      });
      this.logger.debug('Message published to QStash successfully');
    } catch (error) {
      this.logger.error('Failed to publish message to QStash', error);
      throw error;
    }
  }
}
