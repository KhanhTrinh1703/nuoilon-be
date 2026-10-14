# AGENTS.md

## Project Overview

**nuoilon-be** is a NestJS 11 backend for tracking fund investments. It supports three client integrations — a Telegram bot, a Web API, and Google Apps Script — with PostgreSQL (via TypeORM) and async OCR processing using Google Gemini + Upstash QStash.

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.7
- **Framework**: NestJS 11
- **Database**: PostgreSQL / NeonDB via TypeORM 0.3
- **AI/OCR**: Google Gemini API
- **Storage**: Supabase Storage
- **Messaging**: Upstash QStash (HTTP job queue)
- **Telegram**: Telegraf 4
- **Deployment**: Vercel (web), Docker (local/schedule)
- **Testing**: Jest 30 + Supertest

## Repository Structure

```
src/
├── main.ts                  # Bootstrap; sets up Swagger, global pipes, Telegraf webhook
├── app.module.ts            # Root module; conditionally loads modules by APP_MODE
├── app.controller.ts        # Health check
├── config/                  # Config loader (env vars) + Swagger setup per client
├── database/
│   ├── data-source.ts       # TypeORM DataSource; dual-mode (local params vs DATABASE_URL)
│   ├── entities/            # 8 TypeORM entities (transactions, fund prices, OCR jobs, etc.)
│   └── migrations/          # 13 migration files — always use migrations, never synchronize
├── common/
│   ├── services/ai/         # GeminiService wrapper; prompts in prompts/*.txt
│   ├── services/storage/    # SupabaseStorageService
│   ├── services/messaging/  # UpstashQStashService
│   ├── guards/              # HmacSignatureGuard (AppScript auth)
│   └── middleware/          # HTTP request logging
├── web/                     # Web API (Bearer token auth)
├── telegram/                # Telegram bot (webhook-based); conversation state, OCR flow
├── appscripts/              # Google Apps Script endpoints (HMAC auth)
├── report/                  # Report generation
└── schedule/                # Scheduled jobs (runs when APP_MODE=schedule)
scripts/                     # Standalone scripts: fund price crawler, report generator, etc.
docker/                      # Dockerfiles + docker-compose
docs/                        # Static Redoc HTML + OpenAPI JSON; auto-deployed to GitHub Pages
```

## Development Commands

```bash
npm run start:dev        # Hot-reload dev server (watch mode)
npm run start:debug      # Dev server with debugger
npm run build            # Compile TypeScript to dist/
npm run start:prod       # Run compiled dist/

npm test                 # Unit tests (*.spec.ts)
npm run test:watch       # Watch mode
npm run test:cov         # With coverage
npm run test:e2e         # End-to-end tests

npm run lint             # ESLint
npm run format           # Prettier
npm run typecheck        # tsc --noEmit

npm run migration:run    # Apply pending migrations
npm run migration:revert # Rollback last migration

npm run docs:generate    # Generate OpenAPI JSON specs
npm run docs:serve       # Preview docs at localhost:8080
npm run telegram:setup   # Register Telegram webhook URL
```

## Environment Variables

See [.env.example](.env.example) for the full list. Key groups:

| Group | Variables |
|---|---|
| App | `PORT`, `NODE_ENV`, `APP_MODE` (`web` or `schedule`) |
| Database | `DB_HOST/PORT/USERNAME/PASSWORD/DB_NAME` or `DATABASE_URL` |
| Auth | `ACTIVE_SECRET` (HMAC key for AppScript) |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_ALLOWED_USER_IDS` |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` |
| QStash | `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODELS`, `GEMINI_TEMPERATURE`, `GEMINI_MAX_OUTPUT_TOKENS` |

## Architecture Decisions

### APP_MODE
`app.module.ts` conditionally loads modules:
- `APP_MODE=web` — loads Web, Telegram, AppScript, Report, Schedule modules
- `APP_MODE=schedule` — loads only Database + Schedule modules (no HTTP endpoints)

The schedule container runs independently (see [docker/Dockerfile.schedule](docker/Dockerfile.schedule)).

### Authentication
- **Bearer Token** — Web and Telegram controllers
- **HMAC Signature** — AppScript endpoints via `HmacSignatureGuard` using `ACTIVE_SECRET`

### Database
- Always use migrations (`migration:run`). `synchronize: false` in all environments.
- Dual-mode connection: if `DATABASE_URL` is set, uses NeonDB with SSL; otherwise uses individual `DB_*` params for local Postgres.
- Repository pattern throughout — no direct EntityManager usage in controllers.

### OCR Pipeline
1. User sends photo via Telegram
2. `TelegramPhotoService` uploads image to Supabase Storage
3. `TelegramOcrService` publishes a job to QStash
4. QStash calls back the `/telegram/qstash/ocr` endpoint
5. `GeminiService` processes the image with prompts from `src/common/services/ai/prompts/`
6. Result is saved to `ocr-job` entity and sent back to the Telegram user

### Swagger / API Docs
- Three separate Swagger setups (web, telegram, appscripts) configured in `src/config/swagger.config.ts`
- Static Redoc HTML lives in `docs/` and is deployed to GitHub Pages via `.github/workflows/deploy-docs.yml`
- Regenerate after API changes: `npm run docs:generate`

## Coding Conventions

- **TypeScript strict null checks** are enabled; `noImplicitAny` is off
- **NestJS patterns**: use `@Injectable()` services, `@Controller()` with route decorators, `@Module()` wiring
- **DTOs** use `class-validator` decorators for validation; `class-transformer` for serialization
- **Entities** live in `src/database/entities/`; always generate a migration after entity changes
- **Prompts** for Gemini are `.txt` files in `src/common/services/ai/prompts/` — copied to `dist/` at build time (configured in `nest-cli.json`)
- No `synchronize: true` anywhere — schema changes go through migrations only

## Testing

- Unit tests colocated as `*.spec.ts` alongside source files
- E2E tests in `test/app.e2e-spec.ts`
- Jest config is embedded in `package.json` (`jest` key)
- E2E config: `test/jest-e2e.json`

## CI/CD

GitHub Actions workflows (`.github/workflows/`):

| Workflow | Trigger | Action |
|---|---|---|
| `deploy-vercel.yml` | Push to `main` | Deploy to Vercel |
| `deploy-docs.yml` | Push to `main` | Publish docs to GitHub Pages |
| `pr-check.yml` | Pull request | Lint + type check + tests |
| `fund-price-crawler.yml` | Cron schedule | Run fund price scraper |
| `monthly-investment-report.yml` | Cron schedule | Generate monthly report |

## Docs

- [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) — API URLs, auth methods, key file locations
- [docs/COMMON_SERVICES.md](docs/COMMON_SERVICES.md) — Shared service architecture
- [docs/TELEGRAM_BOT_SETUP.md](docs/TELEGRAM_BOT_SETUP.md) — Bot commands and webhook setup
- [docs/OCR_INTEGRATION.md](docs/OCR_INTEGRATION.md) — OCR pipeline details
- [docs/SCHEDULE_MODULE.md](docs/SCHEDULE_MODULE.md) — Scheduled tasks guide
- [docs/GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md) — CI/CD workflows
- [docker/DOCKER_SETUP.md](docker/DOCKER_SETUP.md) — Docker local development
