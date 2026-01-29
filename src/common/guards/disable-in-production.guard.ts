// ...existing code...
import { Injectable, CanActivate, NotFoundException } from '@nestjs/common';

@Injectable()
export class DisableInProductionGuard implements CanActivate {
  canActivate(): boolean {
    const env = process.env.NODE_ENV ?? 'development';
    if (env === 'production') {
      // hide endpoint in production by returning 404
      throw new NotFoundException();
    }
    return true;
  }
}
