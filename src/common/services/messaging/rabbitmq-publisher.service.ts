/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-explicit-any,prettier/prettier */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { Channel, Connection } from 'amqplib';
import { RabbitMqPublishOptions } from './dto/rabbitmq-message.dto';

@Injectable()
export class RabbitMQPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQPublisherService.name);

  private readonly rabbitmqUrl: string;
  private readonly exchangeName: string;
  private readonly queueName: string;

  private connection: Connection | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {
    this.rabbitmqUrl = this.configService.get<string>('rabbitmq.url') ?? '';
    this.exchangeName = this.configService.get<string>('rabbitmq.exchange') ?? '';
    this.queueName = this.configService.get<string>('rabbitmq.queue') ?? '';

    if (!this.rabbitmqUrl || !this.exchangeName || !this.queueName) {
      this.logger.warn('RabbitMQ not fully configured; publisher disabled');
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.rabbitmqUrl || !this.exchangeName || !this.queueName) {
      return;
    }

    try {
      // amqplib types can vary depending on environment; use unknown cast then assert
      const conn = (await (amqplib.connect as any)(this.rabbitmqUrl)) as unknown as Connection;
      this.connection = conn;
      if (this.connection) {
        // createChannel may exist on the connection object; call it via any
        const ch = await (this.connection as any).createChannel();
        this.channel = ch as Channel;
      }

      if (this.channel) {
        await this.channel.assertExchange(
          this.exchangeName,
          'direct',
          { durable: true },
        );
        await this.channel.assertQueue(this.queueName, { durable: true });
        this.logger.log('Connected to RabbitMQ and initialized channel');
      }
    } catch (err: unknown) {
      this.logger.error(
        `Failed to connect to RabbitMQ: ${this.formatError(err)}`,
      );
      this.connection = null;
      this.channel = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        // some channel implementations have close
        if (typeof (this.channel as any).close === 'function') {
          await (this.channel as any).close();
        }
      }

      if (this.connection) {
        if (typeof (this.connection as any).close === 'function') {
          await (this.connection as any).close();
        }
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Error closing RabbitMQ connection: ${this.formatError(err)}`,
      );
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }

  async publishMessage(
    payload: Record<string, unknown>,
    options?: RabbitMqPublishOptions,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.error('RabbitMQ channel not initialized');
      throw new Error('RabbitMQ not configured');
    }

    try {
      const buffer = Buffer.from(JSON.stringify(payload));
      const publishOptions = {
        persistent: options?.persistent ?? true,
        contentType: options?.contentType ?? 'application/json',
      } as amqplib.Options.Publish;

      this.channel.publish(this.exchangeName, this.queueName, buffer, publishOptions);

      this.logger.debug(`Published message to ${this.exchangeName}/${this.queueName}`);
      // ensure function contains at least one await for lint rules
      await Promise.resolve();
    } catch (err: unknown) {
      this.logger.error(
        `Failed to publish message: ${this.formatError(err)}`,
      );
      throw err;
    }
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
