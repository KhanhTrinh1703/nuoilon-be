/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { Update } from 'telegraf/types';
import { randomUUID } from 'crypto';
import { OcrJobStatus } from '../database/entities/ocr-job.entity';
import { OcrResultCallbackDto } from './dto/ocr-result-callback.dto';
import { OcrResultResponseDto } from './dto/ocr-result-response.dto';
import { OcrJobRepository } from './repositories/ocr-job.repository';
import { ReportImageService } from './services/report-image.service';
import { TelegramConversationService } from './services/telegram-conversation.service';
import { TelegramCommandsService } from './services/telegram-commands.service';
import { TelegramDepositService } from './services/telegram-deposit.service';
import { TelegramCertificateService } from './services/telegram-certificate.service';
import { TelegramPhotoService } from './services/telegram-photo.service';
import { SupabaseStorageService } from './services/supabase-storage.service';
import { TelegramOcrService } from './services/telegram-ocr.service';
import { GetSignedUrlDto } from './dto/get-signed-url.dto';
import { SignedUrlResponseDto } from './dto/signed-url-response.dto';

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
    private readonly ocrJobRepository: OcrJobRepository,
    private readonly telegramOcrService: TelegramOcrService,
    private readonly supabaseStorageService: SupabaseStorageService,
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

    this.initializeUserWhitelist();
    this.setupTextMessageHandler();

    // Start conversation cleanup interval
    this.conversationService.startCleanup();

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
        .map((s) => Number(s.trim()))
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
    this.bot.command('hi', (ctx: Context) => {
      this.commandsService.handleHiCommand(ctx);
    });

    // /reports command
    this.bot.command('reports', async (ctx: Context) => {
      await this.commandsService.handleReportsCommand(ctx);
    });

    // /upload command
    this.bot.command('upload', (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return ctx.reply('Unable to identify user.');
      this.photoService.startUploadSession(userId);
      ctx.reply('Vui lòng gửi hình ảnh để upload lên Supabase Storage.');
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
        ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.');
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
      ctx.reply('Báo cáo đang được tạo, thử lại sau.');
      return;
    }

    try {
      this.isGeneratingReport = true;
      ctx.reply('📸 Đang tạo báo cáo ảnh, xin chờ...');

      const result = await this.reportImageService.generateReportImage();

      // send photo
      await ctx.replyWithPhoto({ source: result.buffer });
    } catch (error) {
      this.logger.error('Error generating report image:', error);
      ctx.reply('❌ Không thể tạo báo cáo ảnh, thử lại sau.');
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
    const job = await this.ocrJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`OCR job not found: ${jobId}`);
    }

    if (
      job.status === OcrJobStatus.CONFIRMED ||
      job.status === OcrJobStatus.REJECTED
    ) {
      throw new BadRequestException('OCR job is already finalized');
    }

    const confirmToken = randomUUID();

    const updatedJob = await this.ocrJobRepository.markNeedConfirm(jobId, {
      resultJson: dto.resultJson,
      confirmToken,
    });

    if (!updatedJob) {
      throw new NotFoundException(`OCR job not found after update: ${jobId}`);
    }

    const chatId = Number(updatedJob.tgChatId);
    if (isNaN(chatId)) {
      throw new BadRequestException('Invalid chat id stored on OCR job');
    }

    const sentMessage = await this.telegramOcrService.sendNeedConfirmMessage(
      this.bot,
      chatId,
      updatedJob.id,
      confirmToken,
      dto.resultJson,
      dto.warnings,
    );

    await this.ocrJobRepository.updateSentMessageId(
      updatedJob.id,
      String(sentMessage.message_id),
    );

    return {
      success: true,
      jobId: updatedJob.id,
      status: OcrJobStatus.NEED_CONFIRM,
      tgSentMessageId: String(sentMessage.message_id),
    };
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

  /**
   * Worker endpoint helper: resolve OCR job by idempotencyKey and return signed URL.
   */
  async getOcrJobSignedUrl(
    dto: GetSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    const job = await this.ocrJobRepository.findByIdempotencyKey(
      dto.idempotencyKey,
    );

    if (!job) {
      throw new NotFoundException('OCR job not found');
    }

    const signed = await this.supabaseStorageService.createSignedUrl(
      job.storageBucket,
      job.storagePath,
    );

    return {
      signedUrl: signed.signedUrl,
      expiresAt: signed.expiresAt,
    };
  }

  /**
   * Get bot instance
   */
  getBot(): Telegraf {
    return this.bot;
  }
}
