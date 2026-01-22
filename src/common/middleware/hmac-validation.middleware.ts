import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HmacSignatureGuard } from '../guards/hmac-signature.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

@Injectable()
export class HmacValidationMiddleware implements NestMiddleware {
  private hmacGuard: HmacSignatureGuard;

  constructor(private readonly configService: ConfigService) {
    this.hmacGuard = new HmacSignatureGuard(configService);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const context = new ExecutionContextHost([req, res]);

    try {
      this.hmacGuard.canActivate(context);
      next();
    } catch (error) {
      next(error);
    }
  }
}
