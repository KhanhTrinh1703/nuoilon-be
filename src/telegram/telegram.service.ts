/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';
import { extname } from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { Update } from 'telegraf/types';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { FundPriceRepository } from './repositories/fund-price.repository';
import { FirebaseStorageService } from './services/firebase-storage.service';
import { UploadLogRepository } from './repositories/upload-log.repository';

@Injectable()
export class TelegramService implements OnModuleInit {
  private static readonly MAX_UPLOADS_PER_DAY = 20;
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;
  private readonly webhookUrl: string;
  private pendingUploads = new Set<number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly excelTransactionRepository: ExcelTransactionRepository,
    private readonly fundPriceRepository: FundPriceRepository,
    private readonly firebaseStorageService: FirebaseStorageService,
    private readonly uploadLogRepository: UploadLogRepository,
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
    this.setupPhotoHandler();
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
      ctx.reply('Chào mấy con gà, mấy con gà làm đếch gì biết về tài chính!');
    });

    // /reports command
    this.bot.command('reports', async (ctx: Context) => {
      try {
        const investmentMonths =
          await this.excelTransactionRepository.getDistinctMonthsCount();
        const totalCapital =
          await this.excelTransactionRepository.getTotalCapital();
        const fundCertificates =
          await this.excelTransactionRepository.getTotalNumberOfFundCertificates();

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

        const formatNumber = (num: number) =>
          num.toLocaleString('vi-VN', {
            maximumFractionDigits: 0,
          });

        const formatDecimalNumber = (num: number) =>
          num.toLocaleString('vi-VN', {
            maximumFractionDigits: 2,
          });

        const formatTimestamp = (date: Date) =>
          date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
          });

        const message =
          `📊 *BÁO CÁO QUỸ ĐẦU TƯ*\n\n` +
          `- *Số tháng đầu tư:* ${investmentMonths}\n` +
          `- *Tổng vốn đầu tư:* ${formatNumber(totalCapital)} VNĐ\n` +
          `- *Số CCQ:* ${formatNumber(fundCertificates)}\n` +
          `- *Giá CCQ:* ${formatNumber(Number(fundPrice.price) * 1000)} VNĐ\n` +
          `- *Giá trị NAV:* ${formatNumber(navValue)} VNĐ\n` +
          `${profitLoss >= 0 ? '✅ *Lợi nhuận:*' : '❌ *Lỗ:*'} ${formatDecimalNumber(Math.abs(profitLoss))}%\n\n` +
          `_Giá CCQ cập nhật lúc ${formatTimestamp(fundPrice.updatedAt)}_`;

        ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.logger.error('Error generating report:', error);
        ctx.reply('❌ Lỗi khi tạo báo cáo. Vui lòng thử lại sau.');
      }
    });

    // /upload command
    this.bot.command('upload', (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return ctx.reply('Unable to identify user.');
      this.pendingUploads.add(userId);
      ctx.reply('Vui lòng gửi hình ảnh để upload lên Firebase Storage.');
    });

    this.bot.catch((err: any, ctx: Context) => {
      this.logger.error(`Error for ${ctx.updateType}:`, err);
    });
  }

  private setupPhotoHandler() {
    this.bot.on(message('photo'), async (ctx) => {
      try {
        const userId = ctx.from?.id;
        if (!userId) return;

        if (!this.pendingUploads.has(userId)) {
          // ignore unsolicited photos
          return;
        }

        // enforce daily limit
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const uploadsToday =
          await this.uploadLogRepository.countUploadsForUserBetween(
            String(userId),
            start,
            end,
          );

        if (uploadsToday >= TelegramService.MAX_UPLOADS_PER_DAY) {
          this.pendingUploads.delete(userId);
          ctx.reply(
            "You've reached your daily upload limit (20 files). Try again tomorrow.",
          );
          return;
        }

        const photos = ctx.message.photo ?? [];
        if (!photos.length) {
          ctx.reply('No photo found in the message.');
          return;
        }

        // select highest resolution (last in array)
        const best = photos[photos.length - 1];
        const fileId = best.file_id;

        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await axios.get(fileLink.href, {
          responseType: 'arraybuffer',
        });

        const buffer = Buffer.from(response.data);
        const mimeType =
          response.headers['content-type'] || 'application/octet-stream';
        const ext = extname(fileLink.pathname || '') || '.jpg';
        const filename = `${Date.now()}_${userId}${ext}`;

        // upload to Firebase Storage
        const { webUrl } = await this.firebaseStorageService.uploadImage({
          buffer,
          filename,
          mimeType,
          fileSize: buffer.length,
        });

        // create upload log
        await this.uploadLogRepository.createUploadLog({
          telegramUserId: String(userId),
          telegramMessageId: String(ctx.message.message_id),
          originalName: filename,
          mimeType,
          fileSize: buffer.length,
          storageUrl: webUrl,
        });

        ctx.reply(`Upload successful: ${webUrl}`);
        this.pendingUploads.delete(userId);
      } catch (err) {
        this.logger.error('Photo upload failed', err);
        ctx.reply('Upload failed. Please try again later.');
      }
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
