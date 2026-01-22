import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { setupSwaggerDocs } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

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
