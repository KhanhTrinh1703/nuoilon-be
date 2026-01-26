import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { TelegramEnabledGuard } from '../common/guards/telegram-enabled.guard';
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
}
