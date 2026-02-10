# Nuoilon Backend - Copilot Instructions

## Project Overview
NestJS 11 backend with **multi-client architecture** (Web, Telegram, AppScripts, Report) for a fund management/transaction tracking application. Uses TypeORM with PostgreSQL, supports both local and cloud (NeonDB) databases, includes scheduled fund price crawling, and integrates with Supabase Storage for Telegram image uploads.

## Project Structure

```
src/
├── web/                    # Web client module
├── telegram/               # Telegram bot module
├── appscripts/             # Google AppScript integration module
├── report/                 # Report generation module
├── database/               # Database configuration & entities
│   ├── entities/          # Centralized TypeORM entities
│   ├── migrations/        # Database migrations
│   ├── seed/             # Seed data
│   ├── data-source.ts    # TypeORM CLI config
│   └── database.module.ts # Database module
├── common/                # Shared cross-module utilities
│   ├── guards/           # Auth guards (HmacSignatureGuard)
│   ├── decorators/       # Custom decorators
│   ├── filters/          # Exception filters
│   ├── interceptors/     # Response interceptors
│   ├── pipes/            # Validation pipes
│   ├── dto/              # Shared DTOs
│   └── utils/            # Utility functions
├── config/               # App configuration
│   ├── configuration.ts  # Environment config
│   └── swagger.config.ts # Swagger/OpenAPI setup
└── main.ts              # Application entry point

scripts/                  # Standalone utility scripts
docs/                    # Static OpenAPI documentation
```

## Architecture & Module Structure

### Multi-Client Design Pattern
This project serves **four distinct client types**, each with isolated modules and documentation:
- **Web** (`src/web/`) - Standard web application endpoints (Bearer auth)
- **Telegram** (`src/telegram/`) - Telegram bot integration with commands `/hi`, `/reports`, `/upload` (uses SupabaseStorageService)
- **AppScripts** (`src/appscripts/`) - Google AppScript integration (HMAC auth with 5-min window)
- **Report** (`src/report/`) - Monthly investment report generation (ReportImageService for visual reports)

**Critical**: Each module is completely isolated and included separately in Swagger config ([src/config/swagger.config.ts](../src/config/swagger.config.ts)). When adding endpoints, they MUST be placed in the appropriate module or they won't appear in client-specific docs.

### Module Organization Pattern

Each client module follows a **consistent directory structure**:

```
module-name/
├── module-name.module.ts       # NestJS module definition
├── module-name.controller.ts   # HTTP endpoints (routes)
├── module-name.service.ts      # Business logic layer
├── dto/                        # Data Transfer Objects
│   ├── request.dto.ts         # Request validation DTOs
│   └── response.dto.ts        # Response shape DTOs
├── repositories/               # Database access layer
│   └── entity.repository.ts   # Custom repository pattern
└── services/                   # Additional services (optional)
    └── helper.service.ts      # Module-specific helpers
```

**Example**: [src/telegram/](../src/telegram/) demonstrates this pattern completely.

### Repository Pattern
All database access goes through custom repositories (not direct TypeORM repositories):
- **Location**: `*/repositories/*.repository.ts` within each module
- **Pattern**: Injectable class wrapping TypeORM Repository
- **Entities**: Centralized in [src/database/entities/](../src/database/entities/)

**Repository Template**:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityName } from '../../database/entities/entity-name.entity';

@Injectable()
export class EntityNameRepository {
  constructor(
    @InjectRepository(EntityName)
    private readonly repository: Repository<EntityName>,
  ) {}

  async findById(id: string): Promise<EntityName | null> {
    return this.repository.findOne({ where: { id } });
  }
  
  // Add custom query methods here
}
```

### Module Registration Pattern

**Module Template**:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleNameController } from './module-name.controller';
import { ModuleNameService } from './module-name.service';
import { EntityName } from '../database/entities/entity-name.entity';
import { EntityNameRepository } from './repositories/entity-name.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([EntityName]), // Register entities
  ],
  controllers: [ModuleNameController],
  providers: [
    ModuleNameService,
    EntityNameRepository, // Register custom repositories
  ],
})
export class ModuleNameModule {}
```

**Key Points**:
1. Import entities via `TypeOrmModule.forFeature([...])`
2. Register repositories in `providers` array (not exports unless shared)
3. Controller handles HTTP, Service contains business logic, Repository handles DB
4. Keep entities in `src/database/entities/`, not within modules

## Database Configuration

### Dual-Mode Connection Strategy
Database connection adapts based on environment ([src/database/data-source.ts](../src/database/data-source.ts), [src/database/database.module.ts](../src/database/database.module.ts)):
- **Cloud mode**: `DATABASE_URL` present → enables SSL, uses connection URL (NeonDB)
- **Local mode**: `DATABASE_URL` absent → uses `DB_HOST`, `DB_PORT`, etc., no SSL

**Never** mix both modes. Both `data-source.ts` (TypeORM CLI) and `database.module.ts` (runtime) implement this pattern identically.

### Migration Workflow
```bash
# Generate migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Create empty migration
npm run migration:create -- src/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

**Important**: Always set `synchronize: false` in production. Use migrations only.

### Telegram Bot Integration
This project includes a fully-featured Telegram bot ([src/telegram/telegram.service.ts](../src/telegram/telegram.service.ts)):
- **Commands**: `/hi` (greeting), `/reports` (investment summary), `/upload` (image upload)
- **Image Upload**: Uses SupabaseStorageService to stream images to Supabase Storage
  - File validation: JPEG/PNG/GIF/WebP only, max 25MB
  - Daily limit: 20 uploads per user (tracked via UploadLogRepository)
  - Filenames: `{timestamp}_{telegramUserId}_{originalName}`
- **Report Generation**: ReportImageService generates visual investment reports
- **Webhook Mode**: Use `npm run telegram:setup` to configure webhook for production

## Documentation Generation

### Swagger Multi-Documentation Setup
Four separate Swagger instances are configured ([src/config/swagger.config.ts](../src/config/swagger.config.ts)):
1. `/api/docs/web` - Web module only
2. `/api/docs/telegram` - Telegram module only  
3. `/api/docs/appscripts` - AppScripts module only (shows HMAC auth)
4. `/api/docs/report` - Report module only
5. `/api/docs` - Complete API (all modules)

Export to JSON happens automatically on startup via `exportOpenApiJsonFiles()`.

### Generate Static Docs
```bash
# Generate OpenAPI JSON files (requires DB connection)
npm run docs:generate

# Serve static docs locally
npm run docs:serve
```

**Note**: `docs:generate` needs database connection because NestJS bootstraps full app context (see [scripts/generate-docs.ts](../scripts/generate-docs.ts) comment).

## Utility Scripts

Key scripts in `scripts/` directory:

```bash
# Crawl and update latest fund prices (E1VFVN30)
npm run build && node dist/scripts/crawl-fund-price.js

# Generate monthly investment reports
npm run build && node dist/scripts/generate-monthly-report.js

# Setup Telegram bot webhook for production
npm run telegram:setup

# Fetch historical fund price data
npm run build && node dist/scripts/run-get-historical.js
```

**Important**: Scripts must be built first (`npm run build`) before execution in production mode.

## Development Workflows

### Essential Commands
```bash
npm run start:dev          # Watch mode with hot reload
npm run typecheck          # TypeScript type checking without compilation
npm run lint               # ESLint with auto-fix
#npm run format             # Prettier formatting
#npm run test               # Unit tests
#npm run test:e2e           # End-to-end tests
```

### Adding New Features
1. **Choose correct module** (web/telegram/appscripts/report) based on client type
2. **Create DTOs** in `dto/` folder with `class-validator` decorators and `@ApiProperty()` for Swagger
3. **Implement repository** (if database access needed):
   - Create repository class in `repositories/` folder
   - Inject TypeORM repository in constructor
   - Add custom query methods
   - Register in module's `providers` array
4. **Add business logic** to service layer (`*.service.ts`)
5. **Add controller endpoints** with proper Swagger decorators (`@ApiOperation()`, `@ApiResponse()`, etc.)
6. **Register entities** via `TypeOrmModule.forFeature([EntityName])` in module imports
7. **For AppScripts module**: Apply `@UseGuards(HmacSignatureGuard)` decorator to protected endpoints

**Example workflow**:
```typescript
// 1. Create entity in src/database/entities/
// 2. Generate migration: npm run migration:generate -- src/database/migrations/AddEntityName
// 3. Create repository in module's repositories/ folder
// 4. Register in module: TypeOrmModule.forFeature([EntityName]) + add repository to providers
// 5. Inject repository into service, implement business logic
// 6. Add controller endpoints
```

## TypeScript Configuration
- **Module system**: Node.js ESM (`"module": "nodenext"`)
- **Target**: ES2023
- **Strict mode**: Partial (`strictNullChecks: true`, but `noImplicitAny: false`)
- **Decorators**: Enabled for NestJS (`experimentalDecorators`, `emitDecoratorMetadata`)


## Code Style & Linting
- **ESLint**: TypeScript-ESLint with type checking enabled
- **Prettier**: Single quotes, trailing commas, auto line endings
- Config: [eslint.config.mjs](../eslint.config.mjs), [.prettierrc](../.prettierrc)
- Suppress warnings: `@typescript-eslint/no-floating-promises: 'warn'`

## Environment Variables
Required in `.env`:
```
# Server
PORT=3000
NODE_ENV=development

# Database (Cloud mode - use ONE of these approaches)
DATABASE_URL=postgresql://...  # NeonDB connection string with SSL

# OR Database (Local mode - omit DATABASE_URL when using these)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nuoilon
DB_SYNCHRONIZE=false
DB_LOGGING=true
DB_MIGRATIONS_RUN=false

# Security (for HMAC auth in AppScripts module)
ACTIVE_SECRET=your-hmac-secret

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/v1/telegram/webhook

# Supabase Storage (for Telegram /upload command)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=telegram-uploads
SUPABASE_UPLOAD_FOLDER=images
```

## Github Copilot Instructions
Check coding guidelines instructions
- **NestJS Instructions**: `.github/instructions/nestjs.instructions.md`
- **TypeScript Instructions**: `.github/instructions/typescript-5-es2022.md`
- **Docker Instructions**: `.github/instructions/containerization-docker-best-practices.instructions.md`

## Common Gotchas
- **Module isolation**: Endpoints missing from Swagger? Check module is included in `setupSwaggerDocs()`
- **Database mode**: Switching local↔cloud requires removing/adding `DATABASE_URL`, not changing other vars
- **HMAC timing**: 5-minute window is strict; check system clock sync
- **Entity paths**: Use glob patterns (`**/*.entity{.ts,.js}`) to support both dev (ts) and prod (js)
