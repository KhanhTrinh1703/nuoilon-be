import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { WebModule } from '../web/web.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AppscriptsModule } from '../appscripts/appscripts.module';

/**
 * Setup Swagger documentation for all client types
 * Creates separate documentation for Web, Telegram, AppScript, and Complete API
 * Also exports OpenAPI JSON files for static documentation
 */
export function setupSwaggerDocs(app: INestApplication): void {
  // Web Client Documentation
  const webConfig = new DocumentBuilder()
    .setTitle('Nuoilon API - Web Client')
    .setDescription('API documentation for Web applications')
    .setVersion('1.0')
    .addTag('web', 'Web client endpoints')
    .addBearerAuth()
    .build();

  const webDocument = SwaggerModule.createDocument(app, webConfig, {
    include: [WebModule],
  });
  SwaggerModule.setup('api/docs/web', app, webDocument, {
    customSiteTitle: 'Nuoilon API - Web',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Telegram Client Documentation
  const telegramConfig = new DocumentBuilder()
    .setTitle('Nuoilon API - Telegram Bot')
    .setDescription('API documentation for Telegram bot integration')
    .setVersion('1.0')
    .addTag('telegram', 'Telegram bot endpoints')
    .addBearerAuth()
    .build();

  const telegramDocument = SwaggerModule.createDocument(app, telegramConfig, {
    include: [TelegramModule],
  });
  SwaggerModule.setup('api/docs/telegram', app, telegramDocument, {
    customSiteTitle: 'Nuoilon API - Telegram',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // AppScript (HMAC) Client Documentation
  const appscriptConfig = new DocumentBuilder()
    .setTitle('Nuoilon API - AppScript (HMAC)')
    .setDescription(
      'API documentation for Google AppScript integration with HMAC authentication',
    )
    .setVersion('1.0')
    .addTag('appscripts', 'AppScript endpoints with HMAC signature validation')
    .addApiKey(
      { type: 'apiKey', name: 'X-Signature', in: 'header' },
      'HMAC-Signature',
    )
    .build();

  const appscriptDocument = SwaggerModule.createDocument(app, appscriptConfig, {
    include: [AppscriptsModule],
  });
  SwaggerModule.setup('api/docs/appscripts', app, appscriptDocument, {
    customSiteTitle: 'Nuoilon API - AppScript',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Complete API Documentation (All endpoints)
  const completeConfig = new DocumentBuilder()
    .setTitle('Nuoilon API - Complete Documentation')
    .setDescription('Complete API documentation for all clients')
    .setVersion('1.0')
    .addTag('web', 'Web client endpoints')
    .addTag('telegram', 'Telegram bot endpoints')
    .addTag('appscripts', 'AppScript endpoints with HMAC signature validation')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'X-Signature', in: 'header' },
      'HMAC-Signature',
    )
    .build();

  const completeDocument = SwaggerModule.createDocument(app, completeConfig);
  SwaggerModule.setup('api/docs', app, completeDocument, {
    customSiteTitle: 'Nuoilon API - Complete',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Export OpenAPI JSON files for static documentation
  exportOpenApiJsonFiles({
    web: webDocument,
    telegram: telegramDocument,
    appscripts: appscriptDocument,
    complete: completeDocument,
  });

  // Log available documentation URLs
  logDocumentationUrls();
}

/**
 * Export OpenAPI JSON files to docs directory
 */
function exportOpenApiJsonFiles(documents: {
  web: any;
  telegram: any;
  appscripts: any;
  complete: any;
}): void {
  const docsDir = path.join(process.cwd(), 'docs');

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(docsDir, 'openapi-web.json'),
    JSON.stringify(documents.web, null, 2),
  );
  fs.writeFileSync(
    path.join(docsDir, 'openapi-telegram.json'),
    JSON.stringify(documents.telegram, null, 2),
  );
  fs.writeFileSync(
    path.join(docsDir, 'openapi-appscripts.json'),
    JSON.stringify(documents.appscripts, null, 2),
  );
  fs.writeFileSync(
    path.join(docsDir, 'openapi-complete.json'),
    JSON.stringify(documents.complete, null, 2),
  );
}

/**
 * Log documentation URLs to console
 */
function logDocumentationUrls(): void {
  console.log('📚 API Documentation available at:');
  console.log('   - Complete: http://localhost:3000/api/docs');
  console.log('   - Web: http://localhost:3000/api/docs/web');
  console.log('   - Telegram: http://localhost:3000/api/docs/telegram');
  console.log('   - AppScript: http://localhost:3000/api/docs/appscripts');
  console.log('📄 OpenAPI JSON files exported to /docs directory');
}
