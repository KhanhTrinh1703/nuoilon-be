import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class HmacSignatureGuard implements CanActivate {
  private readonly ALLOWED_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const timestamp = request.headers['x-timestamp'] as string;
    const signature = request.headers['x-signature'] as string;

    if (!timestamp || !signature) {
      throw new UnauthorizedException(
        'Missing required headers: X-Timestamp and X-Signature',
      );
    }

    // Validate timestamp
    this.validateTimestamp(timestamp);

    // Validate signature
    this.validateSignature(request, timestamp, signature);

    return true;
  }

  private validateTimestamp(timestamp: string): void {
    const requestTime = parseInt(timestamp, 10);

    if (isNaN(requestTime)) {
      throw new UnauthorizedException('Invalid timestamp format');
    }

    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - requestTime);

    if (timeDiff > this.ALLOWED_TIME_WINDOW_MS) {
      throw new UnauthorizedException(
        'Request timestamp outside allowed window',
      );
    }
  }

  private validateSignature(
    request: Request,
    timestamp: string,
    receivedSignature: string,
  ): void {
    const secret = this.configService.get<string>('security.activeSecret');

    if (!secret) {
      throw new Error('ACTIVE_SECRET not configured');
    }

    const stringToSign = this.buildStringToSign(request, timestamp);
    const expectedSignature = this.computeHmacSignature(secret, stringToSign);

    if (!this.secureCompare(expectedSignature, receivedSignature)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private buildStringToSign(request: Request, timestamp: string): string {
    const method = request.method.toUpperCase();
    const path = request.path;
    const query = request.url.includes('?') ? request.url.split('?')[1] : '';
    const body = request.body ? JSON.stringify(request.body) : '';

    // Build string: METHOD\nPATH\nQUERY\nTIMESTAMP\nBODY
    const parts = [method, path, query, timestamp, body];
    return parts.join('\n');
  }

  private computeHmacSignature(secret: string, data: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf-8'),
      Buffer.from(b, 'utf-8'),
    );
  }
}
