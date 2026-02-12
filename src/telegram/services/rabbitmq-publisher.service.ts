/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await, prettier/prettier */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import type { Options } from 'amqplib';

export interface PublishOcrJobPayload {
  jobId: string;
  idempotencyKey: string;
  chatId: number;
  userId: number;
}

@Injectable()
export class RabbitMQPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQPublisherService.name);

  private readonly rabbitmqUrl: string;
  private readonly exchangeName: string;
  private readonly queueName: string;

  private connection: any = null;
  private channel: any = null;

  constructor(private readonly configService: ConfigService) {
    this.rabbitmqUrl = this.configService.get<string>('rabbitmq.url') ?? '';
    this.exchangeName =
      this.configService.get<string>('rabbitmq.exchange') ?? '';
    this.queueName = this.configService.get<string>('rabbitmq.queue') ?? '';

    if (!this.rabbitmqUrl) {
      this.logger.warn('RABBITMQ_URL not configured; RabbitMQ publisher disabled');
      return;
    }

    if (!this.exchangeName || !this.queueName) {
      this.logger.warn(
        'RabbitMQ exchange/queue not configured (RABBITMQ_EXCHANGE, RABBITMQ_QUEUE); RabbitMQ publisher disabled',
      );
      return;
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.rabbitmqUrl || !this.exchangeName || !this.queueName) {
      return;
    }

    try {
      this.connection = await amqplib.connect(this.rabbitmqUrl);
      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
      });
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });

      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchangeName, 'direct', {
        durable: true,
      });

      await this.channel.assertQueue(this.queueName, {
        durable: true,
      });

      await this.channel.bindQueue(
        this.queueName,
        this.exchangeName,
        this.queueName,
      );

      this.logger.log(
        `RabbitMQ publisher initialized (exchange=${this.exchangeName}, queue=${this.queueName})`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to initialize RabbitMQ publisher: ${this.formatError(err)}`,
      );

      try {
        if (this.channel) {
          await this.channel.close();
        }
      } catch (closeErr: unknown) {
        this.logger.warn(
          `Failed to close RabbitMQ channel after init error: ${this.formatError(closeErr)}`,
        );
      } finally {
        this.channel = null;
      }

      try {
        if (this.connection) {
          await this.connection.close();
        }
      } catch (closeErr: unknown) {
        this.logger.warn(
          `Failed to close RabbitMQ connection after init error: ${this.formatError(closeErr)}`,
        );
      } finally {
        this.connection = null;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
    } catch (err: unknown) {
      this.logger.warn('Failed to close RabbitMQ channel', err as Error);
    } finally {
      this.channel = null;
    }

    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch (err: unknown) {
      this.logger.warn('Failed to close RabbitMQ connection', err as Error);
    } finally {
      this.connection = null;
    }
  }

  async publishOcrJob(payload: PublishOcrJobPayload): Promise<void> {
    if (!this.channel) {
      this.logger.error('RabbitMQ channel is not initialized');
      throw new Error('RabbitMQ publisher not initialized');
    }

    const message = Buffer.from(JSON.stringify(payload));

    const publishOptions: Options.Publish = {
      contentType: 'application/json',
      persistent: true,
    };

    const ok = this.channel.publish(
      this.exchangeName,
      this.queueName,
      message,
      publishOptions,
    );

    if (!ok) {
      this.logger.warn(
        `RabbitMQ publish returned false (exchange=${this.exchangeName}, routingKey=${this.queueName})`,
      );
    }

    this.logger.log(
      `Published OCR job to RabbitMQ (jobId=${payload.jobId}, idempotencyKey=${payload.idempotencyKey})`,
    );
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) {
      return err.stack ?? err.message;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
}
