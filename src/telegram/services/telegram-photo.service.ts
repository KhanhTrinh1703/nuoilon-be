/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';
import { extname } from 'path';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Context } from 'telegraf';
import { SupabaseStorageService } from './supabase-storage.service';
import { UploadLogRepository } from '../repositories/upload-log.repository';

/**
 * Service for handling photo uploads in Telegram bot
 * Manages photo validation, upload to Supabase, and logging
 */
@Injectable()
export class TelegramPhotoService {
  private static readonly MAX_UPLOADS_PER_DAY = 20;
  private readonly logger = new Logger(TelegramPhotoService.name);
  private pendingUploads = new Set<number>();

  constructor(
    private readonly supabaseStorageService: SupabaseStorageService,
    private readonly uploadLogRepository: UploadLogRepository,
  ) {}

  /**
   * Mark user as ready to upload a photo
   */
  startUploadSession(userId: number): void {
    this.pendingUploads.add(userId);
  }

  /**
   * Check if user has an active upload session
   */
  hasUploadSession(userId: number): boolean {
    return this.pendingUploads.has(userId);
  }

  /**
   * Remove upload session for user
   */
  endUploadSession(userId: number): void {
    this.pendingUploads.delete(userId);
  }

  /**
   * Handle photo message from Telegram
   */
  async handlePhoto(ctx: Context): Promise<void> {
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

      if (uploadsToday >= TelegramPhotoService.MAX_UPLOADS_PER_DAY) {
        this.pendingUploads.delete(userId);
        ctx.reply(
          "You've reached your daily upload limit (20 files). Try again tomorrow.",
        );
        return;
      }

      // Get photo from message
      if (!ctx.message || !('photo' in ctx.message)) {
        ctx.reply('No photo found in the message.');
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

      // upload to Supabase Storage
      const { webUrl } = await this.supabaseStorageService.uploadImage({
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

      ctx.reply(`Upload successful: ${filename}`);
      this.pendingUploads.delete(userId);
    } catch (err) {
      this.logger.error('Photo upload failed', err);
      if (err instanceof BadRequestException) {
        // Surface validation message to user
        const msg = err.message || 'Invalid file';
        ctx.reply(`❌ File validation failed: ${msg}`);
      } else {
        ctx.reply('Upload failed. Please try again later.');
      }
    }
  }

  /**
   * Upload image via REST API (for testing purposes)
   * @param file - Multer file object from Express
   * @param userId - Optional user ID for tracking (defaults to 'test-user')
   * @param description - Optional description for the upload
   */
  async uploadImageViaRest(
    file: Express.Multer.File,
    userId?: string,
    description?: string,
  ): Promise<{ webUrl: string; uploadLog: any }> {
    try {
      const effectiveUserId = userId || 'test-user';
      const buffer = file.buffer;
      const mimeType = file.mimetype;
      const filename = file.originalname || `upload_${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { webUrl } = await this.supabaseStorageService.uploadImage({
        buffer,
        filename,
        mimeType,
        fileSize: buffer.length,
      });

      // Create upload log
      const uploadLog = await this.uploadLogRepository.createUploadLog({
        telegramUserId: effectiveUserId,
        telegramMessageId: `rest_${Date.now()}`,
        originalName: filename,
        mimeType,
        fileSize: buffer.length,
        storageUrl: webUrl,
      });

      this.logger.log(
        `REST API upload successful for user ${effectiveUserId}: ${webUrl}`,
      );

      return {
        webUrl,
        uploadLog: {
          id: uploadLog.id,
          userId: effectiveUserId,
          filename,
          size: buffer.length,
          url: webUrl,
          description: description || null,
          uploadedAt: uploadLog.uploadedAt,
        },
      };
    } catch (error) {
      this.logger.error('REST API upload failed:', error);
      throw error;
    }
  }
}
