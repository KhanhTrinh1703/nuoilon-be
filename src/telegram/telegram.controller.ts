import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { TelegramEnabledGuard } from '../common/guards/telegram-enabled.guard';
import { DisableInProductionGuard } from '../common/guards/disable-in-production.guard';
import { HmacSignatureGuard } from '../common/guards/hmac-signature.guard';
import { UploadImageDto } from './dto/upload-image.dto';
import { GetSignedUrlDto } from './dto/get-signed-url.dto';
import { SignedUrlResponseDto } from './dto/signed-url-response.dto';
import { OcrResultCallbackDto } from './dto/ocr-result-callback.dto';
import { OcrResultResponseDto } from './dto/ocr-result-response.dto';
import { OcrErrorCallbackDto } from './dto/ocr-error-callback.dto';
import type { Update } from 'telegraf/types';
import {
  IMAGE_FILE_ALLOWED_MIME_TYPES,
  IMAGE_FILE_MAX_SIZE_BYTES,
} from '../common/constants/file-upload.constants';

@ApiTags('telegram')
@Controller({ path: 'telegram', version: '1' })
@UseGuards(TelegramEnabledGuard)
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Telegram webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Update processed successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 503, description: 'Telegram service is unavailable' })
  async handleWebhook(@Body() update: Update) {
    this.logger.debug(`Received update: ${JSON.stringify(update)}`);

    try {
      await this.telegramService.handleUpdate(update);
      return { success: true };
    } catch (error) {
      this.logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(DisableInProductionGuard)
  @ApiOperation({
    summary: 'Test image upload endpoint',
    description:
      'Upload an image file to Supabase Storage for testing purposes. No authentication required beyond basic service availability check.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file with optional metadata',
    type: UploadImageDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Missing or invalid image file' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  @ApiResponse({ status: 503, description: 'Telegram service is unavailable' })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: IMAGE_FILE_MAX_SIZE_BYTES }),
          new FileTypeValidator({
            fileType: IMAGE_FILE_ALLOWED_MIME_TYPES.join('|'),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadImageDto,
  ) {
    this.logger.debug(
      `Upload image request: userId=${dto.userId}, description=${dto.description}`,
    );

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.telegramService.uploadImageViaRest(
        file,
        dto.userId,
        dto.description,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error('Error uploading image:', error);
      throw error;
    }
  }

  @Post('ocr-jobs/signed-url')
  @UseGuards(HmacSignatureGuard)
  @ApiSecurity('HMAC-Signature')
  @ApiOperation({
    summary: 'Get signed URL for OCR job image (worker-only)',
    description:
      'Worker uses HMAC auth to request a signed download URL for the uploaded image by Telegram file_unique_id (idempotencyKey).',
  })
  @ApiBody({ type: GetSignedUrlDto })
  @ApiResponse({ status: 200, type: SignedUrlResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing HMAC signature',
  })
  @ApiResponse({ status: 404, description: 'OCR job not found' })
  async getOcrJobSignedUrl(
    @Body() dto: GetSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    return this.telegramService.getOcrJobSignedUrl(dto);
  }

  @Post('ocr-jobs/:jobId/result')
  @UseGuards(HmacSignatureGuard)
  @ApiSecurity('HMAC-Signature')
  @ApiOperation({
    summary: 'OCR worker callback to submit parsed OCR result for confirmation',
    description:
      'Accepts OCR result payload from Python worker, sets OCR job status to NEED_CONFIRM, and sends Telegram inline confirm/reject buttons to the original user chat.',
  })
  @ApiBody({ type: OcrResultCallbackDto })
  @ApiResponse({
    status: 201,
    description: 'OCR result accepted and confirmation message sent',
    type: OcrResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid job state or payload' })
  @ApiResponse({ status: 401, description: 'Missing/invalid HMAC headers' })
  @ApiResponse({ status: 404, description: 'OCR job not found' })
  async handleOcrResultCallback(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Body() dto: OcrResultCallbackDto,
  ): Promise<OcrResultResponseDto> {
    return await this.telegramService.handleOcrResultCallback(jobId, dto);
  }

  @Post('ocr-jobs/:jobId/error')
  @UseGuards(HmacSignatureGuard)
  @ApiSecurity('HMAC-Signature')
  @ApiOperation({
    summary:
      'OCR worker callback to report processing error and trigger retry/final failure',
    description:
      'Increments OCR attempt count, stores last error, republishes immediately when attempts remain, or marks FAILED and notifies user when max attempts reached.',
  })
  @ApiBody({ type: OcrErrorCallbackDto })
  @ApiResponse({
    status: 201,
    description: 'OCR error processed (retry queued or job failed)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        jobId: { type: 'string' },
        status: { type: 'string' },
        attempts: { type: 'number' },
        maxAttempts: { type: 'number' },
        retried: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid job state or payload' })
  @ApiResponse({ status: 401, description: 'Missing/invalid HMAC headers' })
  @ApiResponse({ status: 404, description: 'OCR job not found' })
  async handleOcrErrorCallback(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Body() dto: OcrErrorCallbackDto,
  ): Promise<{
    success: boolean;
    jobId: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    retried: boolean;
    message: string;
  }> {
    return await this.telegramService.handleOcrErrorCallback(jobId, dto);
  }
}
