import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { Context, Telegraf } from 'telegraf';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import { OcrJob, OcrJobStatus } from '../../database/entities/ocr-job.entity';
import { OcrErrorCallbackDto } from '../dto/ocr-error-callback.dto';
import { OcrResultCallbackDto } from '../dto/ocr-result-callback.dto';
import { OcrResultResponseDto } from '../dto/ocr-result-response.dto';
import { PublishOcrJobDto } from '../dto/publish-ocr-job-dto';
import { GeminiService } from '../../common/services/ai/gemini.service';
import { SupabaseStorageService } from '../../common/services/storage/supabase-storage.service';
import { CertificateTransactionRepository } from '../repositories/certificate-transaction.repository';
import { DepositTransactionRepository } from '../repositories/deposit-transaction.repository';
import { OcrJobRepository } from '../repositories/ocr-job.repository';
import { TelegramQstashService } from './telegram-qstash.service';

interface OcrCallbackData {
  action: 'confirm' | 'reject';
  jobId: string;
  // token: string;
}

@Injectable()
export class TelegramOcrService {
  private readonly logger = new Logger(TelegramOcrService.name);

  constructor(
    private readonly ocrJobRepository: OcrJobRepository,
    private readonly depositTransactionRepository: DepositTransactionRepository,
    private readonly certificateTransactionRepository: CertificateTransactionRepository,
    private readonly telegramQstashService: TelegramQstashService,
    private readonly geminiOcrService: GeminiService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  /**
   * Start OCR job by downloading image and processing with Gemini.
   * @param payload OCR job payload containing jobId and idempotencyKey.
   * @returns void
   * @example
   * await telegramOcrService.startOcrJob(payload);
   */
  async startOcrJob(payload: PublishOcrJobDto): Promise<void> {
    this.logger.debug(
      `Starting OCR job with payload: ${JSON.stringify(payload)}`,
    );

    const signedUrl = await this.getSignedUrlForImage(payload.idempotencyKey);
    const { buffer, mimeType } =
      await this.downloadImageFromSupabase(signedUrl);
    const ocrResult = await this.geminiOcrService.performOcr(buffer, mimeType);

    await this.telegramQstashService.publishOcrResult(payload.jobId, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      resultJson: ocrResult as unknown as Record<string, unknown>,
    });
  }

  /**
   * Handle OCR worker result callback, persist data, and request user confirmation.
   * @param bot Telegram bot instance.
   * @param jobId OCR job identifier.
   * @param dto OCR result payload.
   * @returns Confirmation status and sent message id.
   * @example
   * await telegramOcrService.handleOcrResult(bot, jobId, dto);
   */
  async handleOcrResult(
    bot: Telegraf,
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
      provider: dto.provider,
      model: dto.model,
      warnings: dto.warnings,
      confirmToken,
    });

    if (!updatedJob) {
      throw new NotFoundException(`OCR job not found after update: ${jobId}`);
    }

    const chatId = Number(updatedJob.tgChatId);
    if (isNaN(chatId)) {
      throw new BadRequestException(
        `Invalid tgChatId on OCR job ${jobId}: ${updatedJob.tgChatId}`,
      );
    }

    const sentMessage = await this.sendNeedConfirmMessage(
      bot,
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
   * Handle OCR worker error callback and schedule retry or finalize failure.
   * @param bot Telegram bot instance.
   * @param jobId OCR job identifier.
   * @param dto OCR error payload.
   * @returns Current OCR job state and retry metadata.
   * @example
   * await telegramOcrService.handleOcrError(bot, jobId, dto);
   */
  async handleOcrError(
    bot: Telegraf,
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
    const job = await this.ocrJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`OCR job not found: ${jobId}`);
    }

    if (
      job.status === OcrJobStatus.CONFIRMED ||
      job.status === OcrJobStatus.REJECTED ||
      job.status === OcrJobStatus.FAILED
    ) {
      throw new BadRequestException('OCR job is already finalized');
    }

    const composedError = dto.errorCode
      ? `[${dto.errorCode}] ${dto.errorMessage}`
      : dto.errorMessage;

    const incremented = await this.ocrJobRepository.incrementAttempts(jobId);
    if (!incremented) {
      throw new NotFoundException(
        `OCR job not found after increment: ${jobId}`,
      );
    }

    const withError = await this.ocrJobRepository.updateLastError(
      jobId,
      composedError,
    );

    if (!withError) {
      throw new NotFoundException(
        `OCR job not found after error update: ${jobId}`,
      );
    }

    const attempts = withError.attempts;
    const maxAttempts = withError.maxAttempts;

    if (attempts < maxAttempts) {
      await this.ocrJobRepository.updateStatus(jobId, OcrJobStatus.PENDING);

      // Republish immediately for retry
      try {
        await this.telegramQstashService.publishOcrJob({
          jobId: withError.id,
          idempotencyKey: withError.tgFileUniqueId,
          chatId: Number(withError.tgChatId),
          userId: Number(withError.tgUserId),
        });
      } catch (err) {
        this.logger.error(
          'Failed to republish OCR job for retry',
          err as Error,
        );
      }

      return {
        success: true,
        jobId: withError.id,
        status: OcrJobStatus.PENDING,
        attempts,
        maxAttempts,
        retried: true,
        message: 'OCR retry scheduled',
      };
    }

    const failedJob = await this.ocrJobRepository.markFailed(
      jobId,
      composedError,
    );
    if (!failedJob) {
      throw new NotFoundException(
        `OCR job not found after markFailed: ${jobId}`,
      );
    }

    await this.sendErrorMessage(
      bot,
      Number(failedJob.tgChatId),
      '❌ Không thể xử lý ảnh sau 2 lần thử. Vui lòng thử lại hoặc nhập thủ công.',
    );

    this.logger.error(
      `OCR job failed permanently: jobId=${failedJob.id}, attempts=${attempts}/${maxAttempts}, error=${composedError}`,
    );

    return {
      success: true,
      jobId: failedJob.id,
      status: OcrJobStatus.FAILED,
      attempts,
      maxAttempts,
      retried: false,
      message: `OCR failed after ${maxAttempts} attempts`,
    };
  }

  /**
   * Handle user confirmation callback from Telegram inline button.
   * @param ctx Telegram callback context.
   * @param bot Telegram bot instance.
   * @returns void
   * @example
   * await telegramOcrService.handleUserConfirmation(ctx, bot);
   */
  async handleUserConfirmation(ctx: Context, bot: Telegraf): Promise<void> {
    await ctx.answerCbQuery();

    try {
      const callbackData = this.extractOcrCallbackData(ctx, 'confirm');
      if (!callbackData) {
        await ctx.reply('❌ Dữ liệu xác nhận không hợp lệ.');
        return;
      }

      const job = await this.ocrJobRepository.findById(callbackData.jobId);
      if (!job) {
        await ctx.reply('❌ Không tìm thấy OCR job.');
        return;
      }

      if (job.status === OcrJobStatus.CONFIRMED) {
        await ctx.reply('⚠️ Giao dịch này đã được xác nhận trước đó.');
        return;
      }

      if (job.status === OcrJobStatus.REJECTED) {
        await ctx.reply('⚠️ Giao dịch này đã bị từ chối trước đó.');
        return;
      }

      if (job.status !== OcrJobStatus.NEED_CONFIRM) {
        await ctx.reply('❌ OCR job chưa sẵn sàng để xác nhận.');
        return;
      }

      // if (!job.confirmToken || job.confirmToken !== callbackData.token) {
      //   await ctx.reply('❌ Token xác nhận không hợp lệ hoặc đã hết hạn.');
      //   return;
      // }

      const resultJson =
        (job.ocrResultJson as Record<string, unknown> | null) ?? undefined;

      if (!resultJson) {
        throw new BadRequestException(
          `Missing OCR resultJson for job ${job.id}`,
        );
      }

      const transactionType = this.resolveTransactionType(resultJson);

      const transactionSourceId = `ocr_${job.id}`;
      let transactionRecordId: string;
      const transactionDate = format(new Date(), 'yyyy-MM-dd');

      if (transactionType === 'deposit') {
        const amount = this.parseRequiredNumber(
          resultJson.amount ?? resultJson.capital,
          'amount',
        );

        const saved = await this.depositTransactionRepository.upsertFromOcr({
          transactionDate: transactionDate,
          amount: amount,
          transactionId: transactionSourceId,
        });

        transactionRecordId = saved.id;
      } else {
        const numberOfCertificates = this.parseRequiredNumber(
          resultJson.matched_quantity,
          'numberOfCertificates',
        );

        const price = this.parseRequiredNumber(
          resultJson.matched_price,
          'price',
        );

        const saved = await this.certificateTransactionRepository.upsertFromOcr(
          {
            transactionDate: transactionDate,
            numberOfCertificates: numberOfCertificates,
            price: price,
            transactionId: transactionSourceId,
          },
        );

        transactionRecordId = saved.id;
      }

      await this.ocrJobRepository.markConfirmed(
        job.id,
        transactionRecordId,
        new Date(),
      );

      await this.editDecisionMessage(
        bot,
        job,
        '✅ Đã xác nhận và lưu giao dịch',
      );

      this.logger.log(
        `OCR job confirmed: jobId=${job.id}, transactionType=${transactionType}, transactionRecordId=${transactionRecordId}`,
      );
    } catch (error) {
      this.logger.error('Error handling OCR confirm callback:', error);
      await ctx.reply('❌ Không thể xác nhận OCR lúc này. Vui lòng thử lại.');
    }
  }

  /**
   * Handle user rejection callback from Telegram inline button.
   * @param ctx Telegram callback context.
   * @param bot Telegram bot instance.
   * @returns void
   * @example
   * await telegramOcrService.handleUserRejection(ctx, bot);
   */
  async handleUserRejection(ctx: Context, bot: Telegraf): Promise<void> {
    await ctx.answerCbQuery();

    try {
      const callbackData = this.extractOcrCallbackData(ctx, 'reject');
      if (!callbackData) {
        await ctx.reply('❌ Dữ liệu từ chối không hợp lệ.');
        return;
      }

      const job = await this.ocrJobRepository.findById(callbackData.jobId);
      if (!job) {
        await ctx.reply('❌ Không tìm thấy OCR job.');
        return;
      }

      if (job.status === OcrJobStatus.REJECTED) {
        await ctx.reply('⚠️ OCR job này đã bị từ chối trước đó.');
        return;
      }

      if (job.status === OcrJobStatus.CONFIRMED) {
        await ctx.reply('⚠️ OCR job này đã được xác nhận trước đó.');
        return;
      }

      if (job.status !== OcrJobStatus.NEED_CONFIRM) {
        await ctx.reply('❌ OCR job chưa sẵn sàng để từ chối.');
        return;
      }

      // if (!job.confirmToken || job.confirmToken !== callbackData.token) {
      //   await ctx.reply('❌ Token từ chối không hợp lệ hoặc đã hết hạn.');
      //   return;
      // }

      await this.ocrJobRepository.markRejected(job.id, new Date());
      await this.editDecisionMessage(bot, job, '❌ Đã hủy bỏ');

      this.logger.log(`OCR job rejected: jobId=${job.id}`);
    } catch (error) {
      this.logger.error('Error handling OCR reject callback:', error);
      await ctx.reply('❌ Không thể từ chối OCR lúc này. Vui lòng thử lại.');
    }
  }

  /**
   * Send OCR confirmation message with inline buttons to the user.
   * @param bot Telegram bot instance.
   * @param chatId Telegram chat id.
   * @param jobId OCR job identifier.
   * @param confirmToken Confirmation token stored in the OCR job.
   * @param resultJson OCR result payload.
   * @param warnings OCR warning list (optional).
   * @returns Telegram sendMessage result metadata.
   * @example
   * await telegramOcrService.sendNeedConfirmMessage(bot, chatId, jobId, token, resultJson);
   */
  async sendNeedConfirmMessage(
    bot: Telegraf,
    chatId: number,
    jobId: string,
    confirmToken: string,
    resultJson: Record<string, unknown>,
    warnings?: string[],
  ): Promise<{ message_id: number }> {
    const message = this.formatOcrResultMessage(resultJson, warnings);

    const sentMessage = await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Xác nhận',
              callback_data: `ocr_confirm_${jobId}`,
            },
          ],
          [
            {
              text: '❌ Hủy bỏ',
              callback_data: `ocr_reject_${jobId}`,
            },
          ],
        ],
      },
    });

    this.logger.log(
      `Sent OCR confirmation message for job=${jobId} to chat=${chatId}, messageId=${sentMessage.message_id}`,
    );

    return { message_id: sentMessage.message_id };
  }

  /**
   * Build a user-facing OCR result message from raw OCR payload.
   * @param resultJson OCR result payload.
   * @param warnings OCR warning list (optional).
   * @returns Markdown formatted message body.
   * @example
   * const message = telegramOcrService.formatOcrResultMessage(resultJson, warnings);
   */
  formatOcrResultMessage(
    resultJson: Record<string, unknown>,
    warnings?: string[],
  ): string {
    const rawType = this.toSafeString(resultJson.type).toLowerCase();
    const typeLabel = this.mapTransactionType(rawType);

    const confidence = this.toSafeNumber(resultJson.confidence);
    const confidenceText =
      confidence !== null ? `${confidence.toLocaleString('vi-VN')}` : 'N/A';

    const lines: string[] = ['🧾 *Kết quả OCR*', ''];

    if (rawType === 'deposit') {
      const amount = this.formatCurrency(resultJson.amount);
      const currency = this.toSafeString(resultJson.currency) || 'N/A';

      lines.push(`📋 *Loại:* ${typeLabel}`);
      lines.push(`💰 *Số tiền:* ${amount}`);
      lines.push(`💱 *Tiền tệ:* ${currency}`);
      lines.push(`🎯 *Độ tin cậy:* ${confidenceText}`);
    } else if (rawType === 'certificate') {
      const matchedPrice = this.toSafeNumber(resultJson.matched_price);
      const matchedQuantity = this.toSafeNumber(resultJson.matched_quantity);

      lines.push(`📋 *Loại:* ${typeLabel}`);
      lines.push(
        `💵 *Giá khớp:* ${
          matchedPrice !== null ? matchedPrice.toLocaleString('vi-VN') : 'N/A'
        }`,
      );
      lines.push(
        `🎫 *SL khớp:* ${
          matchedQuantity !== null
            ? matchedQuantity.toLocaleString('vi-VN')
            : 'N/A'
        }`,
      );
      lines.push(`🎯 *Độ tin cậy:* ${confidenceText}`);
    } else {
      lines.push('📋 *Loại:* Không xác định');
    }

    if (warnings && warnings.length > 0) {
      lines.push('');
      lines.push('⚠️ *Cảnh báo OCR:*');
      for (const warning of warnings) {
        lines.push(`- ${warning}`);
      }
    }

    lines.push('');
    lines.push('Vui lòng kiểm tra và chọn *Xác nhận* hoặc *Từ chối*.');

    return lines.join('\n');
  }

  /**
   * Resolve transaction type from OCR payload and normalize to domain values.
   * @param resultJson OCR result payload.
   * @returns Normalized transaction type.
   * @example
   * const type = telegramOcrService.resolveTransactionType(resultJson);
   */
  resolveTransactionType(
    resultJson: Record<string, unknown>,
  ): 'deposit' | 'certificate' {
    const raw = this.toSafeString(resultJson.type).toLowerCase();

    if (raw === 'deposit' || raw === 'certificate') {
      return raw;
    }

    throw new BadRequestException(
      `Unsupported transactionType: ${resultJson.type as string}`,
    );
  }

  private async sendErrorMessage(
    bot: Telegraf,
    chatId: number,
    message: string,
  ): Promise<void> {
    if (isNaN(chatId)) {
      this.logger.warn(
        `Skip error message due to invalid chat id: chatId=${chatId}`,
      );
      return;
    }

    await bot.telegram.sendMessage(chatId, message);
  }

  private extractOcrCallbackData(
    ctx: Context,
    expectedAction: 'confirm' | 'reject',
  ): OcrCallbackData | null {
    const callbackQuery = ctx.callbackQuery;
    if (
      !callbackQuery ||
      !('data' in callbackQuery) ||
      typeof callbackQuery.data !== 'string'
    ) {
      return null;
    }

    const raw = callbackQuery.data;
    const parts = raw.split('_');
    if (parts.length !== 3) {
      return null;
    }

    const [prefix, action, jobId] = parts;

    if (prefix !== 'ocr') {
      return null;
    }

    if (action !== expectedAction) {
      return null;
    }

    if (!jobId) {
      return null;
    }

    return {
      action: expectedAction,
      jobId,
      // token,
    };
  }

  private async editDecisionMessage(
    bot: Telegraf,
    job: OcrJob,
    text: string,
  ): Promise<void> {
    const chatId = Number(job.tgChatId);
    const messageId = Number(job.tgSentMessageId);

    if (isNaN(chatId) || isNaN(messageId)) {
      this.logger.warn(
        `Skip OCR message edit due to invalid chat/message id: jobId=${job.id}, tgChatId=${job.tgChatId}, tgSentMessageId=${job.tgSentMessageId}`,
      );
      return;
    }

    await bot.telegram.editMessageText(chatId, messageId, undefined, text, {
      reply_markup: {
        inline_keyboard: [],
      },
    });
  }

  private parseRequiredNumber(value: unknown, field: string): number {
    const parsed = this.toSafeNumber(value);
    if (parsed === null) {
      throw new BadRequestException(`Invalid OCR number for field: ${field}`);
    }

    return parsed;
  }

  private mapTransactionType(transactionType: string): string {
    if (transactionType === 'deposit') {
      return 'Gửi tiền';
    }

    if (transactionType === 'certificate') {
      return 'Mua chứng chỉ quỹ';
    }

    return transactionType || 'Không xác định';
  }

  private formatCurrency(value: unknown): string {
    const amount = this.toSafeNumber(value);
    if (amount === null) {
      return 'N/A';
    }

    return `${amount.toLocaleString('vi-VN')} VND`;
  }

  private toSafeString(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  }

  private toSafeNumber(value: unknown): number | null {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/[,\s]/g, '');
      const parsed = Number(normalized);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private async getSignedUrlForImage(idempotencyKey: string): Promise<string> {
    const job =
      await this.ocrJobRepository.findByIdempotencyKey(idempotencyKey);

    if (!job) {
      throw new NotFoundException('OCR job not found');
    }

    const signed = await this.supabaseStorageService.createSignedUrl(
      job.storageBucket,
      job.storagePath,
    );

    return signed.signedUrl;
  }

  private async downloadImageFromSupabase(
    signedUrl: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await axios.get(signedUrl, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data as ArrayBufferLike);
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    const mimeType = fileTypeResult?.mime ?? 'image/jpeg';
    return { buffer, mimeType };
  }
}
