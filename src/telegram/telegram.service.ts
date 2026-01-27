/* eslint-disable @typescript-eslint/no-floating-promises */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { Update } from 'telegraf/types';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { FundPriceRepository } from './repositories/fund-price.repository';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;
  private readonly webhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly excelTransactionRepository: ExcelTransactionRepository,
    private readonly fundPriceRepository: FundPriceRepository,
  ) {
    this.botToken = this.configService.get<string>('telegram.botToken') ?? '';
    this.webhookUrl =
      this.configService.get<string>('telegram.webhookUrl') ?? '';

    if (!this.botToken) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not defined in environment variables. Telegram service will be unavailable.',
      );
      return;
    }

    this.bot = new Telegraf(this.botToken);
    this.setupCommands();
  }

  async onModuleInit() {
    if (!this.bot) {
      this.logger.warn(
        'Telegram bot is not initialized. Skipping webhook setup.',
      );
      return;
    }

    if (this.webhookUrl) {
      try {
        await this.setWebhook();
      } catch (error) {
        this.logger.error('Error setting up webhook on module init:', error);
      }
    } else {
      this.logger.warn(
        'TELEGRAM_WEBHOOK_URL is not set. Webhook not configured.',
      );
    }
  }

  private setupCommands() {
    // /hi command
    this.bot.command('hi', (ctx: Context) => {
      // const firstName = ctx.from?.first_name || 'User';
      // ctx.reply(`Hello, ${firstName}!`);
      ctx.reply(`Chào mấy con gà, mấy con gà làm đếch gì biết về tài chính!`);
    });

    // /report command
    this.bot.command('reports', async (ctx: Context) => {
      try {
        // Fetch all metrics
        const investmentMonths =
          await this.excelTransactionRepository.getDistinctMonthsCount();
        const totalCapital =
          await this.excelTransactionRepository.getTotalCapital();
        const fundCertificates =
          await this.excelTransactionRepository.getTotalNumberOfFundCertificates();

        // Fetch fund price
        const fundPrice = await this.fundPriceRepository.findByName('E1VFVN30');

        if (!fundPrice) {
          ctx.reply(
            '❌ Không tìm thấy giá quỹ E1VFVN30. Vui lòng thử lại sau.',
          );
          return;
        }

        // Calculate metrics
        const navValue =
          Number(fundCertificates) * Number(fundPrice.price) * 1000;
        const profitLoss =
          totalCapital > 0 ? (navValue / totalCapital - 1) * 100 : 0;

        // Format numbers with Vietnamese locale
        const formatNumber = (num: number) =>
          num.toLocaleString('vi-VN', {
            maximumFractionDigits: 0,
          });

        // Format timestamp
        const formatTimestamp = (date: Date) => {
          return date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
          });
        };

        const message =
          `📊 *BÁO CÁO QUỸ ĐẦU TƯ*\n\n` +
          `- *Số tháng đầu tư:* ${investmentMonths}\n` +
          `- *Tổng vốn đầu tư:* ${formatNumber(totalCapital)} VNĐ\n` +
          `- *Số CCQ:* ${formatNumber(fundCertificates)}\n` +
          `- *Giá CCQ:* ${formatNumber(Number(fundPrice.price) * 1000)} VNĐ\n` +
          `- *Giá trị NAV:* ${formatNumber(navValue)} VNĐ\n` +
          `${profitLoss >= 0 ? '✅ *Lợi nhuận:*' : '❌ *Lỗ:*'} ${formatNumber(Math.abs(profitLoss))}%\n\n` +
          `_Giá CCQ cập nhật lúc ${formatTimestamp(fundPrice.updatedAt)}_`;

        ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.logger.error('Error generating report:', error);
        ctx.reply('❌ Lỗi khi tạo báo cáo. Vui lòng thử lại sau.');
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
