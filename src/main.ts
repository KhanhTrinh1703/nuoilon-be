import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { HmacValidationMiddleware } from './common/middleware/hmac-validation.middleware';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Apply HMAC validation middleware to appscripts routes
  const configService = app.get(ConfigService);
  app.use(
    '/api/appscripts/*',
    (req: Request, res: Response, next: NextFunction) => {
      const middleware = new HmacValidationMiddleware(configService);
      middleware.use(req, res, next);
    },
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
