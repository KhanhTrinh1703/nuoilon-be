<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Nuoilon Backend

## Overview
Nuoilon is a multi-client NestJS 11 backend that tracks fund transactions and NAV, exposes client-specific APIs (Web, Telegram, Google AppScripts), and now streams Telegram photos directly to Supabase Storage.

## Features
- Multi-client modules with isolated Swagger documentation for each surface.
- Telegram bot commands `/hi`, `/reports`, `/upload` with localized responses.
- `/upload` streams Telegram images to Firebase Storage, renames them to `{timestamp}_{telegramUserId}_{originalName}`, validates JPEG/PNG/GIF/WebP files up to 25MB, and enforces 20 uploads per user per day.
- File validation guarantees only JPEG/PNG/GIF/WebP files under 25MB reach Supabase Storage, and the public REST `/telegram/upload-image` endpoint shares the exact same rules.
- Repository-driven TypeORM data access writing to PostgreSQL/NeonDB.

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Nuoilon Backend

## Overview
Nuoilon is a multi-client NestJS 11 backend for fund transaction tracking, reporting, Telegram automation, and OCR-assisted transaction extraction.

## Features
- Multi-client modules with isolated Swagger documentation for each surface.
- Telegram bot commands `/hi`, `/reports`, `/upload`, `/input` with Vietnamese responses.
- OCR pipeline via RabbitMQ + Python worker for Telegram image uploads.
- Inline Telegram confirmation/rejection for OCR results before saving to DB.
- Repository-driven TypeORM data access with PostgreSQL/NeonDB.
- Static OpenAPI export under `docs/` for sharing API references.
- Configurable dual database mode (`DATABASE_URL` or local DB vars).

## Tech Stack
- Node.js 20+, TypeScript 5.7
- NestJS 11, Telegraf 4.16
- TypeORM 0.3 + PostgreSQL/Neon
- RabbitMQ (`amqplib`) for OCR job queue
- class-validator/class-transformer, Swagger, ESLint

## Getting Started
1. Install dependencies:

```bash
npm install
```

2. Create `.env` from template:

```bash
cp .env.example .env
```

3. Configure DB + Telegram + Supabase + RabbitMQ in `.env`.

4. Run migrations:

```bash
npm run migration:run
```

5. Start API in dev mode:

```bash
npm run start:dev
```

## Required Environment Variables

```dotenv
PORT=3000
NODE_ENV=development
APP_MODE=web

# Local DB (omit when DATABASE_URL is set)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nuoilon
DB_SYNCHRONIZE=false
DB_LOGGING=true
DB_MIGRATIONS_RUN=false

# Cloud DB (optional alternative)
# DATABASE_URL=postgresql://.../dbname?sslmode=require

# Security
ACTIVE_SECRET=replace-me

# Telegram
TELEGRAM_BOT_TOKEN=bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/v1/telegram/webhook

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=telegram-uploads
SUPABASE_UPLOAD_FOLDER=images

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=direct
RABBITMQ_QUEUE=ocr-ocr_jobs

# OCR
OCR_MAX_ATTEMPTS=2
```

## OCR Integration Flow
1. User uploads image from Telegram `/upload`.
2. Backend saves image to Supabase and creates `ocr_jobs` record.
3. Backend publishes job to RabbitMQ queue `ocr-ocr_jobs`.
4. Python worker requests signed URL and processes OCR.
5. Worker posts OCR result to `/api/v1/telegram/ocr-jobs/:jobId/result`.
6. Backend sends Vietnamese review message with inline buttons.
7. User confirms/rejects:
   - Confirm -> save to `deposit_transactions` or `certificate_transactions`.
   - Reject -> mark OCR job as rejected.
8. Worker error callback retries immediately up to `OCR_MAX_ATTEMPTS`.

## OCR Worker Endpoints (HMAC-protected)
- `POST /api/v1/telegram/ocr-jobs/signed-url`
- `POST /api/v1/telegram/ocr-jobs/:jobId/result`
- `POST /api/v1/telegram/ocr-jobs/:jobId/error`

Headers:
- `X-Timestamp`
- `X-Signature`

## Documentation
- Main docs index: `docs/index.html`
- OCR integration guide: `docs/OCR_INTEGRATION.md`
- Swagger endpoints:
  - `/api/docs/web`
  - `/api/docs/telegram`
  - `/api/docs/appscripts`
  - `/api/docs/report`
  - `/api/docs` (aggregate)

## Database & Migrations
Use migrations only (`DB_SYNCHRONIZE=false`).

```bash
npm run migration:generate -- src/database/migrations/Name
npm run migration:run
npm run migration:revert
```

## Useful Commands

```bash
npm run start:dev
npm run typecheck
npm run lint
npm run docs:generate
npm run docs:serve
npm run telegram:setup
```

## Telegram Notes
- `/upload` validates JPEG/PNG/GIF/WebP under 25MB and enforces daily per-user limits.
- OCR user-facing messages are in Vietnamese.
- Confirmation callback buttons are token-protected to prevent replay misuse.

## Troubleshooting
- Webhook not receiving updates: verify `TELEGRAM_WEBHOOK_URL` is HTTPS + reachable.
- HMAC 401 errors: verify `ACTIVE_SECRET` and canonical signature payload.
- OCR retries not published: verify RabbitMQ env vars + broker connectivity.
- Docs generation fails: ensure DB is reachable because app context is fully bootstrapped.
