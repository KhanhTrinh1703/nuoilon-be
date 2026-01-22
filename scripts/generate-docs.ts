import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { setupSwaggerDocs } from '../src/config/swagger.config';

/**
 * Generate OpenAPI documentation files
 *
 * NOTE: This script requires a database connection because:
 * - NestJS creates the full application context including all modules
 * - Services have repository dependencies that are injected via TypeORM
 * - The database connection is established but NOT actually used for doc generation
 *
 * The docs are generated purely from TypeScript metadata (decorators on
 * controllers and DTOs), not from querying the database.
 */
async function generateDocs() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  // Use the same Swagger setup as the main application
  setupSwaggerDocs(app);

  console.log('✅ OpenAPI JSON files generated successfully!');
  console.log('📁 Location: docs/');
  console.log('   - openapi-web.json');
  console.log('   - openapi-telegram.json');
  console.log('   - openapi-appscripts.json');
  console.log('   - openapi-complete.json');

  await app.close();
  process.exit(0);
}

generateDocs().catch((err) => {
  console.error('Error generating docs:', err);
  process.exit(1);
});
