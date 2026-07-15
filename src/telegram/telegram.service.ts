import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { Update } from 'telegraf/types';
import { OcrResultCallbackDto } from './dto/ocr-result-callback.dto';
import { OcrResultResponseDto } from './dto/ocr-result-response.dto';
import { OcrErrorCallbackDto } from './dto/ocr-error-callback.dto';
import { ReportImageService } from './services/report-image.service';
import { TelegramConversationService } from './services/telegram-conversation.service';
import { TelegramCommandsService } from './services/telegram-commands.service';
import { TelegramDepositService } from './services/telegram-deposit.service';
import { TelegramCertificateService } from './services/telegram-certificate.service';
import { TelegramPhotoService } from './services/telegram-photo.service';
import { TelegramOcrService } from './services/telegram-ocr.service';
import { PublishOcrJobDto } from './dto/publish-ocr-job-dto';

/**
 * Main Telegram service that coordinates all bot functionality
 * Delegates specific commands and flows to specialized services
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;
  private readonly webhookUrl: string;
  private isGeneratingReport = false;
  private allowedUserIds: Set<number> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly reportImageService: ReportImageService,
    private readonly conversationService: TelegramConversationService,
    private readonly commandsService: TelegramCommandsService,
    private readonly depositService: TelegramDepositService,
    private readonly certificateService: TelegramCertificateService,
    private readonly photoService: TelegramPhotoService,
    private readonly telegramOcrService: TelegramOcrService,
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

  onModuleInit() {
    if (!this.bot) {
      this.logger.warn(
        'Telegram bot is not initialized. Skipping webhook setup.',
      );
      return;
    }

    this.initializeUserWhitelist();
    this.setupTextMessageHandler();

    // Start conversation cleanup interval
    this.conversationService.startCleanup();

    if (this.webhookUrl) {
      try {
        // await this.setWebhook();
      } catch (error) {
        this.logger.error('Error setting up webhook on module init:', error);
      }
    } else {
      this.logger.warn(
        'TELEGRAM_WEBHOOK_URL is not set. Webhook not configured.',
      );
    }
  }

  /**
   * Initialize user whitelist from environment configuration
   */
  private initializeUserWhitelist() {
    const whitelistEnv = this.configService.get<string>(
      'telegram.allowedUserIds',
    );

    if (whitelistEnv) {
      const userIds = whitelistEnv
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));

      this.allowedUserIds = new Set(userIds);
      this.logger.log(
        `Telegram user whitelist enabled: ${userIds.length} user(s)`,
      );
    } else {
      this.allowedUserIds = null;
      this.logger.log('Telegram user whitelist disabled: allowing all users');
    }
  }

  /**
   * Check if user is allowed to use protected commands
   */
  private isUserAllowed(userId: number): boolean {
    if (this.allowedUserIds === null) {
      return true;
    }
    return this.allowedUserIds.has(userId);
  }

  /**
   * Setup all bot commands and callback handlers
   */
  private setupCommands() {
    // === BASIC COMMANDS ===

    // /hi command
    this.bot.command('hi', async (ctx: Context) => {
      await this.commandsService.handleHiCommand(ctx);
    });

    // /reports command
    this.bot.command('reports', async (ctx: Context) => {
      await this.commandsService.handleReportsCommand(ctx);
    });

    // /crypto command
    this.bot.command('crypto', async (ctx: Context) => {
      await this.commandsService.handleCryptoCommand(ctx);
    });

    // /upload command
    this.bot.command('upload', async (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return ctx.reply('Unable to identify user.');
      this.photoService.startUploadSession(userId);
      await ctx.reply('Vui lòng gửi hình ảnh để upload lên Supabase Storage.');
    });

    // /report_image command
    this.bot.command('report_image', async (ctx: Context) => {
      await this.handleReportImageCommand(ctx);
    });

    // /input command - Start transaction input flow
    this.bot.command('input', async (ctx: Context) => {
      try {
        const userId = ctx.from?.id;
        if (!userId) {
          return ctx.reply('❌ Không thể xác định người dùng.');
        }

        if (!this.isUserAllowed(userId)) {
          this.logger.warn(`Unauthorized user attempted /input: ${userId}`);
          return ctx.reply('❌ Bạn không có quyền sử dụng lệnh này.');
        }

        // Check for duplicate conversation
        if (this.conversationService.hasConversation(userId)) {
          return ctx.reply(
            '⚠️ Bạn đang có giao dịch chưa hoàn thành. Nhập /cancel để hủy hoặc tiếp tục nhập liệu.',
          );
        }

        await ctx.reply('Chọn loại giao dịch:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 Nạp tiền', callback_data: 'input_deposit' }],
              [
                {
                  text: '🛒 Mua chứng chỉ quỹ',
                  callback_data: 'input_certificate',
                },
              ],
            ],
          },
        });

        this.logger.log(`User ${userId} initiated /input command`);
      } catch (error) {
        this.logger.error('Error in /input command:', error);
        await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    });

    // /cancel command
    this.bot.command('cancel', async (ctx: Context) => {
      await this.commandsService.handleCancelCommand(ctx);
    });

    // === DEPOSIT FLOW CALLBACK HANDLERS ===

    this.bot.action('input_deposit', async (ctx) => {
      await this.depositService.startDepositFlow(ctx);
    });

    this.bot.action('deposit_date_today', async (ctx) => {
      await this.depositService.handleTodayDate(ctx);
    });

    this.bot.action('deposit_date_custom', async (ctx) => {
      await this.depositService.handleCustomDate(ctx);
    });

    // === CERTIFICATE FLOW CALLBACK HANDLERS ===

    this.bot.action('input_certificate', async (ctx) => {
      await this.certificateService.startCertificateFlow(ctx);
    });

    this.bot.action('certificate_date_today', async (ctx) => {
      await this.certificateService.handleTodayDate(ctx);
    });

    this.bot.action('certificate_date_custom', async (ctx) => {
      await this.certificateService.handleCustomDate(ctx);
    });

    this.bot.action(/^ocr_confirm_[^_]+$/, async (ctx) => {
      await this.telegramOcrService.handleUserConfirmation(ctx, this.bot);
    });

    this.bot.action(/^ocr_reject_[^_]+$/, async (ctx) => {
      await this.telegramOcrService.handleUserRejection(ctx, this.bot);
    });

    // Error handler
    this.bot.catch((err: any, ctx: Context) => {
      this.logger.error(`Error for ${ctx.updateType}:`, err);
    });
  }

  /**
   * Setup text message handler - Routes to appropriate flow handler
   */
  private setupTextMessageHandler() {
    this.bot.on(message('text'), async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const conversation = this.conversationService.getConversation(userId);
      if (!conversation) {
        // Not in a conversation, ignore message
        return;
      }

      try {
        const text = ctx.message.text;

        if (conversation.type === 'deposit') {
          await this.depositService.handleTextInput(
            ctx,
            userId,
            conversation,
            text,
          );
        } else if (conversation.type === 'certificate') {
          await this.certificateService.handleTextInput(
            ctx,
            userId,
            conversation,
            text,
          );
        }
      } catch (error) {
        this.logger.error('Error in text message handler:', error);
        await ctx.reply(
          '❌ Đã xảy ra lỗi. Vui lòng thử lại hoặc nhập /cancel để hủy.',
        );
      }
    });
  }

  /**
   * Setup photo handler - Delegates to photo service
   */
  private setupPhotoHandler() {
    this.bot.on(message('photo'), async (ctx) => {
      await this.photoService.handlePhoto(ctx);
    });
  }

  /**
   * Handle /report_image command - Generate visual investment report
   */
  private async handleReportImageCommand(ctx: Context): Promise<void> {
    if (this.isGeneratingReport) {
      await ctx.reply(
        '⏳ Hệ thống đang bận xử lí báo cáo, vui lòng thử lại sau ít phút.',
      );
      return;
    }

    try {
      this.isGeneratingReport = true;
      await ctx.reply('📸 Đang tạo báo cáo ảnh, xin chờ...');

      const result = await this.reportImageService.generateReportImage();

      // send photo
      await ctx.replyWithPhoto({ source: result.buffer });
    } catch (error) {
      this.logger.error('Error generating report image:', error);
      await ctx.reply('❌ Không thể tạo báo cáo ảnh, thử lại sau.');
    } finally {
      this.isGeneratingReport = false;
    }
  }

  /**
   * Set Telegram webhook
   */
  private async setWebhook() {
    try {
      await this.bot.telegram.setWebhook(this.webhookUrl);
      this.logger.log(`Webhook set to: ${this.webhookUrl}`);
    } catch (error) {
      this.logger.error('Failed to set webhook:', error);
      throw error;
    }
  }

  /**
   * Handle incoming Telegram updates
   */
  async handleUpdate(update: Update) {
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      this.logger.error('Error handling update:', error);
      throw error;
    }
  }

  /**
   * OCR worker callback: persist OCR result + send Telegram confirmation buttons
   */
  async handleOcrResultCallback(
    jobId: string,
    dto: OcrResultCallbackDto,
  ): Promise<OcrResultResponseDto> {
    return this.telegramOcrService.handleOcrResult(this.bot, jobId, dto);
  }

  async handleOcrErrorCallback(
    jobId: string,
    dto: OcrErrorCallbackDto,
  ): Promise<{
    success: boolean;
    jobId: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    retried: boolean;
    message: string;
  }> {
    return this.telegramOcrService.handleOcrError(this.bot, jobId, dto);
  }

  /**
   * Clean up resources on module destroy
   */
  onModuleDestroy(): void {
    this.conversationService.stopCleanup();
  }

  /**
   * Upload image via REST API (for testing purposes)
   * Delegates to photo service
   */
  async uploadImageViaRest(
    file: Express.Multer.File,
    userId?: string,
    description?: string,
  ): Promise<{ webUrl: string; uploadLog: any }> {
    return this.photoService.uploadImageViaRest(file, userId, description);
  }

  async startOcrJob(payload: PublishOcrJobDto): Promise<void> {
    return this.telegramOcrService.startOcrJob(payload);
  }

  /**
   * Get bot instance
   */
  getBot(): Telegraf {
    return this.bot;
  }
}
