import {
  Injectable,
  CanActivate,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramEnabledGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(): boolean {
    const botToken = this.configService.get<string>('telegram.botToken');
    const webhookUrl = this.configService.get<string>('telegram.webhookUrl');

    if (!botToken || !webhookUrl) {
      throw new ServiceUnavailableException(
        'Telegram service is unavailable. Bot token or webhook URL is not configured.',
      );
    }

    return true;
  }
}
