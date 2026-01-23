import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { Update } from 'telegraf/types';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;
  private readonly webhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly excelTransactionRepository: ExcelTransactionRepository,
  ) {
    this.botToken = this.configService.get<string>('telegram.botToken') ?? '';
    this.webhookUrl = this.configService.get<string>('telegram.webhookUrl') ?? '';

    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
    }

    this.bot = new Telegraf(this.botToken);
    this.setupCommands();
  }

  async onModuleInit() {
    if (this.webhookUrl) {
      await this.setWebhook();
    } else {
      this.logger.warn('TELEGRAM_WEBHOOK_URL is not set. Webhook not configured.');
    }
  }

  private setupCommands() {
    // /hi command
    this.bot.command('hi', (ctx: Context) => {
      const firstName = ctx.from?.first_name || 'User';
      // ctx.reply(`Hello, ${firstName}!`);
      ctx.reply(`Chào mấy con gà, mấy con gà làm đếch gì biết về tài chính!`);
    });

    // /report command
    this.bot.command('reports', async (ctx: Context) => {
      try {
        const totalCapital = await this.excelTransactionRepository.getTotalCapital();
        const count = await this.excelTransactionRepository.getTransactionCount();

        const message = `📊 Fund Report\n\n` +
          `Total Capital: ${totalCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `Total Transactions: ${count}`;

        ctx.reply(message);
      } catch (error) {
        this.logger.error('Error generating report:', error);
        ctx.reply('❌ Error generating report. Please try again later.');
      }
    });

    // /upload command
    this.bot.command('upload', (ctx: Context) => {
      ctx.reply('Please upload your file.');
    });

    // Error handling
    this.bot.catch((err: any, ctx: Context) => {
      this.logger.error(`Error for ${ctx.updateType}:`, err);
    });
  }

  private async setWebhook() {
    try {
      await this.bot.telegram.setWebhook(this.webhookUrl);
      this.logger.log(`Webhook set to: ${this.webhookUrl}`);
    } catch (error) {
      this.logger.error('Failed to set webhook:', error);
      throw error;
    }
  }

  async handleUpdate(update: Update) {
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      this.logger.error('Error handling update:', error);
      throw error;
    }
  }

  getBot(): Telegraf {
    return this.bot;
  }
}

