import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import { setupSwaggerDocs } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const appMode = process.env.APP_MODE ?? 'web';

  logger.log(`APP_MODE=${appMode}`);

  // Set global prefix
  app.setGlobalPrefix('api', {
    exclude: ['/', 'favicon.ico', 'favicon.png'],
  });

  // Enable versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Setup Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    setupSwaggerDocs(app);
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
