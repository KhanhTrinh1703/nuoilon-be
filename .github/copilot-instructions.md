# Nuoilon Backend - Copilot Instructions

## Project Overview
NestJS backend with **multi-client architecture** (Web, Telegram, AppScripts) for a fund management/transaction tracking application. Uses TypeORM with PostgreSQL, supports both local and cloud (NeonDB) databases, and includes scheduled fund price crawling.

## Architecture & Module Structure

### Multi-Client Design Pattern
This project serves **three distinct client types**, each with isolated modules and documentation:
- **Web** (`src/web/`) - Standard web application endpoints (Bearer auth)
- **Telegram** (`src/telegram/`) - Telegram bot integration (Bearer auth)  
- **AppScripts** (`src/appscripts/`) - Google AppScript integration (HMAC auth)
- **Report** (`src/report/`) - For generating reports

**Critical**: Each module is completely isolated and included separately in Swagger config ([src/config/swagger.config.ts](../src/config/swagger.config.ts)). When adding endpoints, they MUST be placed in the appropriate module or they won't appear in client-specific docs.

### Repository Pattern
All database access goes through repositories (not direct TypeORM repositories):
- Repositories live in `*/repositories/*.repository.ts` within each module
- Example: [src/appscripts/repositories/excel-transaction.repository.ts](../src/appscripts/repositories/excel-transaction.repository.ts)
- Register repositories as providers in module definitions

### Security: HMAC Signature Authentication
AppScripts module uses HMAC-SHA256 signature validation ([src/common/guards/hmac-signature.guard.ts](../src/common/guards/hmac-signature.guard.ts)):
- Requires `X-Timestamp` and `X-Signature` headers
- Timestamp window: 5 minutes
- String format: `METHOD\nPATH\nQUERY\nTIMESTAMP\nBODY`
- Secret: `ACTIVE_SECRET` env var

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

## Development Workflows

### Essential Commands
```bash
npm run start:dev          # Watch mode with hot reload
npm run typecheck          # TypeScript type checking without compilation
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting
npm run test               # Unit tests
npm run test:e2e           # End-to-end tests
```

### Adding New Features
1. **Choose correct module** (web/telegram/appscripts) based on client type
2. Create DTOs with `class-validator` decorators for validation
3. Add Swagger decorators (`@ApiProperty()`, `@ApiOperation()`, etc.)
4. Implement repository if database access needed
5. Register repository in module providers array
6. For appscripts: Apply `@UseGuards(HmacSignatureGuard)` if HMAC required

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

# Database (Cloud)
DATABASE_URL=postgresql://...  # NeonDB connection string

# OR Database (Local)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nuoilon

# Security
ACTIVE_SECRET=your-hmac-secret
```

## Common Gotchas
- **Module isolation**: Endpoints missing from Swagger? Check module is included in `setupSwaggerDocs()`
- **Database mode**: Switching local↔cloud requires removing/adding `DATABASE_URL`, not changing other vars
- **HMAC timing**: 5-minute window is strict; check system clock sync
- **Entity paths**: Use glob patterns (`**/*.entity{.ts,.js}`) to support both dev (ts) and prod (js)
