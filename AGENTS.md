# AGENTS.md

## Project Overview

**nuoilon-be** is a NestJS 11 backend for tracking fund and crypto investments. Clients: a Telegram bot, a Web API, and Google Apps Script. PostgreSQL via TypeORM; async OCR of transaction screenshots via Upstash QStash + Gemini (or an OpenAI-compatible LLM).

Stack: Node.js 20, TypeScript 5.7, NestJS 11, TypeORM 0.3 (Postgres / NeonDB), Telegraf 4, `@nestjs/schedule`, Supabase Storage, Upstash QStash, `@google/genai`, Jest 30 + Supertest. Deployed on Vercel (web) and Docker (schedule).

## Repository Map

```
src/
├── app.module.ts      # Picks modules by APP_MODE (see below)
├── config/            # configuration.ts (env → typed config keys), swagger.config.ts
├── database/          # data-source.ts, entities/, migrations/
├── common/            # @Global CommonServicesModule: Gemini, OCR, Supabase, QStash; guards/
├── web/               # Fund-price crawl trigger (QStash-signed)
├── telegram/          # Bot (webhook), conversations, OCR job lifecycle, report images
├── appscripts/        # Google Apps Script sync endpoints (HMAC)
├── report/            # Monthly investment reports
├── crypto/            # Binance price service + GET /crypto/prices
└── schedule/          # @Cron crawlers (fund prices, crypto); APP_MODE=schedule only
scripts/               # Standalone ts-node scripts run by GitHub Actions
docker/  docs/         # Dockerfiles; Redoc HTML + OpenAPI JSON for GitHub Pages
```

Commands live in `package.json` `scripts`; env vars in [.env.example](.env.example) and `src/config/configuration.ts`.

## Architecture

### APP_MODE
- `web` (default): AppScripts, Telegram, Web, Report, Crypto modules.
- `schedule`: Schedule module only; no HTTP surface. Runs in its own container ([docker/Dockerfile.schedule](docker/Dockerfile.schedule)).

`DatabaseModule` and `CommonServicesModule` load in both modes. `CommonServicesModule` is `@Global()`, so shared services inject anywhere without importing it.

### Routes
Global prefix `api` + URI versioning: every route is `/api/v1/<module>/...` (only `/` and the favicons are excluded). Swagger serves at `/api/docs` (complete) and `/api/docs/{web,telegram,appscripts,report}`, and is **off when `NODE_ENV=production`**.

### Auth: one guard per caller
| Caller | Guard | Header |
|---|---|---|
| Google Apps Script, OCR worker error callback | `HmacSignatureGuard` (`ACTIVE_SECRET`) | `X-Signature`, `X-Timestamp` |
| QStash callbacks, scheduled crawl trigger | `UpstashSignatureGuard` | `Upstash-Signature` |
| Telegram | webhook handled by Telegraf; `/input` whitelisted by `TELEGRAM_ALLOWED_USER_IDS` | none |
| Dev/test endpoints (`upload-image`, `test-*`, `report/monthly`) | `DisableInProductionGuard` (404 in production) | none |

There is no Bearer-token auth. Every new debug or test endpoint gets `DisableInProductionGuard`.

### Data access
- Each feature module owns its repository classes under `<module>/repositories/`, even when several wrap the same entity (`fund-price.repository.ts` exists in `web/`, `telegram/`, `schedule/`). Add a repository to the module that uses it.
- Controllers call services; services call repositories.

### OCR pipeline
1. User sends a photo after `/upload`; `TelegramPhotoService` stores it in Supabase.
2. `TelegramQstashService` publishes to `POST /api/v1/telegram/ocr-jobs/start`.
3. `OcrService` runs the provider chosen by `OCR_PROVIDER` (`gemini` | `llm`); `llm` falls back to Gemini on failure. Gemini picks a random model from `GEMINI_MODELS` per call.
4. The result goes to `ocr-jobs/:jobId/result`; failures to `ocr-jobs/:jobId/error`, which republishes the job until `OCR_MAX_ATTEMPTS`, then notifies the user.
5. The user confirms or rejects via inline buttons (`ocr_confirm_*` / `ocr_reject_*`) before transactions are saved.

## Conventions

- **Imports**: use relative paths inside `src/`. `src/...` imports compile and pass Jest (mapped in `moduleNameMapper`) but fail at runtime in `dist/` and on Vercel.
- **Schema changes**: edit the entity, then `npm run migration:generate -- src/database/migrations/<Name>`; review the generated SQL. `synchronize` stays `false` everywhere. Pushing to `main` runs `migration:run` against production before the Vercel deploy, so a migration merged to `main` is a production change.
- **Postgres triggers** (e.g. average cost on `excel_transactions` → `fund_prices`) live only in hand-written migrations; check them when changing those tables.
- **Prompts** are `.txt` files in `src/common/services/ai/prompts/`, copied to `dist/` via `nest-cli.json` assets. A new prompt file in another folder needs a new asset entry.
- **DTOs** validate with `class-validator` and document with `@ApiProperty`.
- **API docs**: `deploy-docs.yml` regenerates `docs/openapi-*.json` (gitignored) on push to `main`. After changing routes or DTOs, run `npm run docs:generate` locally to confirm generation still succeeds.
- **TypeScript**: `strictNullChecks` on, `noImplicitAny` off.

## Testing

- Unit tests: `*.spec.ts` next to the source.
- E2E tests: `test/*.e2e-spec.ts`. These are boundary tests (guards, webhooks) that build a module with only the controller under test and mocked services. They never import `AppModule`, which needs a real DB and external services.
- Done means `npm run lint`, `npm run build`, `npm test`, and `npm run test:e2e` all pass. That is exactly what `pr-check.yml` runs.

## Git Flow

Feature branch → PR into `develop` → PR `develop` into `main`. Pushing to `main` deploys (migrations, Vercel, docs).

## Docs

Reach for these when working in the matching area:
- Telegram commands and webhook setup: [docs/TELEGRAM_BOT_SETUP.md](docs/TELEGRAM_BOT_SETUP.md)
- OCR internals: [docs/OCR_INTEGRATION.md](docs/OCR_INTEGRATION.md)
- Shared services: [docs/COMMON_SERVICES.md](docs/COMMON_SERVICES.md)
- Cron jobs and schedule container: [docs/SCHEDULE_MODULE.md](docs/SCHEDULE_MODULE.md), [docker/SCHEDULE_DOCKER.md](docker/SCHEDULE_DOCKER.md)
- Swagger decorators and static docs: [docs/DOCUMENTATION_SETUP.md](docs/DOCUMENTATION_SETUP.md), [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)
- CI/CD and secrets: [docs/GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md)
- Local Docker: [docker/DOCKER_SETUP.md](docker/DOCKER_SETUP.md)
