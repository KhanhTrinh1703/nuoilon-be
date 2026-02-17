import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Receiver } from '@upstash/qstash';

@Injectable()
export class UpstashSignatureGuard implements CanActivate {
  private readonly receiver: Receiver;
  private readonly logger = new Logger(UpstashSignatureGuard.name);

  constructor(configService: ConfigService) {
    this.receiver = new Receiver({
      currentSigningKey: configService.get<string>('qstash.currentSigningKey'),
      nextSigningKey: configService.get<string>('qstash.nextSigningKey'),
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['upstash-signature'] as string;
    const body = request.body ? JSON.stringify(request.body) : '';

    try {
      await this.receiver.verify({
        body,
        signature,
        url: `${request.protocol}://${request.get('host')}${request.originalUrl}`,
      });
    } catch (error) {
      this.logger.error('Error verifying Upstash signature', error as Error);
      throw new UnauthorizedException('Error verifying Upstash signature');
    }

    return true;
  }
}
