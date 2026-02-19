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
  private readonly serverEndpoint: string;

  constructor(configService: ConfigService) {
    this.receiver = new Receiver({
      currentSigningKey: configService.get<string>('qstash.currentSigningKey'),
      nextSigningKey: configService.get<string>('qstash.nextSigningKey'),
    });
    this.serverEndpoint = configService.get<string>('serverUrl') ?? '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['upstash-signature'] as string;
    const body = request.body ? JSON.stringify(request.body) : '';

    try {
      await this.receiver.verify({
        body,
        signature,
        url: `${this.serverEndpoint}${request.originalUrl}`,
      });
    } catch (error) {
      this.logger.error('Error verifying Upstash signature', error as Error);
      throw new UnauthorizedException('Error verifying Upstash signature');
    }

    return true;
  }
}
