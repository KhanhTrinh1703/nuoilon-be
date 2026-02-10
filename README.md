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
- Static OpenAPI export under `docs/` for sharing API references.
- Configurable dual database mode (env switch between local params and `DATABASE_URL`).

## Tech Stack
- Node.js 20+, TypeScript 5.7
- NestJS 11, Telegraf 4.16
- TypeORM 0.3 + PostgreSQL/Neon
- Axios, class-validator/transformer
- ESLint + Prettier + Jest

## Getting Started
1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from the sample and populate secrets:

```bash
cp .env.example .env
```

3. Apply pending migrations (PostgreSQL must be reachable):

```bash
npm run migration:run
```

4. Start the API in watch mode:

```bash
npm run start:dev
```

## Required Environment Variables

```
PORT=3000

# Environment (development | production | test)
NODE_ENV=development

# Application Mode (web | schedule)
# web: Full API server with all modules (default)
# schedule: Only database and scheduled tasks, no HTTP endpoints
APP_MODE=web

# Local database (omit when DATABASE_URL is set)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nuoilon
DB_SYNCHRONIZE=false
DB_LOGGING=true
DB_MIGRATIONS_RUN=false

# Cloud database (NeonDB)
# DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Security Configuration
ACTIVE_SECRET=replace-me

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/v1/telegram/webhook

# Supabase (Telegram /upload)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=telegram-uploads
SUPABASE_UPLOAD_FOLDER=images

```

## Database & Migrations
- Keep `DB_SYNCHRONIZE=false` in all environments; rely on migrations only.
- Generate migrations from entity changes:

```bash
npm run migration:generate -- src/database/migrations/Name
```

- Run or revert migrations:

```bash
npm run migration:run
npm run migration:revert
```

## Telegram Bot Workflow
- `/hi`: playful greeting in Vietnamese.
- `/reports`: aggregates monthly investment stats from `excel_transactions` plus the latest NAV from `fund_prices`, then posts a Markdown summary.
- `/upload`: prompts for an image, validates MIME (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) and file size (≤25MB), enforces 20 uploads per user per day, streams the highest-resolution Telegram photo to Firebase Storage, records the action in `upload_logs`, and replies with either the public URL or `❌ File validation failed: <reason>` when the guardrails are violated.
- Error messages surfaced to users:
  - "You've reached your daily upload limit (20 files). Try again tomorrow."
  - "Upload failed. Please try again later."

## File Upload Validation Rules
Both the REST endpoint (`POST /api/v1/telegram/upload-image`) and the Telegram `/upload` command enforce identical constraints before invoking Supabase Storage:

- **Max file size:** 25MB (26,214,400 bytes).
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- **Allowed extensions:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`.
- **REST responses:** invalid payloads return `400 Bad Request` with either `File size exceeds 25MB limit` or `Only image files are allowed`.
- **Telegram responses:** `/upload` replies with `❌ File validation failed: ...` for violations, while unsolicited photo messages outside the command remain ignored.

## Static Documentation
- Generate JSON + HTML docs (requires database connectivity):

```bash
npm run docs:generate
```

- Serve the docs locally:

```bash
npm run docs:serve
```

Swagger endpoints:

- `/api/docs/web`
- `/api/docs/telegram`
- `/api/docs/appscripts`
- `/api/docs` (aggregate)

## Testing & Quality Gates

```bash
npm run lint
npm run typecheck
```

## Troubleshooting
- **Webhook inactive**: ensure `TELEGRAM_WEBHOOK_URL` is HTTPS and reachable; run `npm run telegram:setup` if needed.
- **Firebase 401/403**: confirm the service account has the Storage Admin role and the bucket rules allow server-side writes.
- **Uploads rejected immediately**: check server time drift; rate limiting uses the server's local date boundaries.
- **Docs generation fails**: verify the database connection string because `npm run docs:generate` boots the full NestJS context.
