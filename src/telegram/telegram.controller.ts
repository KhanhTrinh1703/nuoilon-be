import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { TelegramEnabledGuard } from '../common/guards/telegram-enabled.guard';
import { UploadImageDto } from './dto/upload-image.dto';
import type { Update } from 'telegraf/types';

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
        webUrl: {
          type: 'string',
          example: 'https://example.supabase.co/storage/v1/object/...',
        },
        uploadLog: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            userId: { type: 'string', example: 'test-user' },
            filename: { type: 'string', example: 'test-image.jpg' },
            size: { type: 'number', example: 152048 },
            url: { type: 'string' },
            description: { type: 'string', nullable: true },
            uploadedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No file uploaded' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  @ApiResponse({ status: 503, description: 'Telegram service is unavailable' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
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
}
