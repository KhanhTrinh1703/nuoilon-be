# Nuoilon Backend

## Overview
Nuoilon is a multi-client NestJS 11 backend for fund transaction tracking, reporting, Telegram bot, and OCR-assisted transaction extraction.

## Features
- Multi-client modules with isolated Swagger documentation for each surface.
- Google Apps Script integration for bidirectional sync between Google Spreadsheets and PostgreSQL database with HMAC-authenticated endpoints.
- Telegram bot commands `/hi`, `/reports`, `/upload`, `/input` with Vietnamese responses.
- Asynchronous OCR pipeline using Upstash QStash for job queuing and Google Gemini AI for processing.
- AI-powered document extraction from Vietnamese financial documents using Gemini API.
- Supabase Storage integration for secure image upload and management with signed URLs.
- Repository-driven TypeORM data access with PostgreSQL/NeonDB.
- Static OpenAPI export under `docs/` for sharing API references.
- Configurable dual database mode (`DATABASE_URL` or local DB vars).

## Tech Stack
- **Backend**: Node.js 20+, TypeScript 5.7, NestJS 11
- **Telegram Bot**: Telegraf 4.16
- **Database**: TypeORM 0.3 + PostgreSQL/NeonDB
- **Message Queue**: Upstash QStash for serverless HTTP-based job delivery
- **AI/OCR**: Google Gemini API for intelligent document extraction
- **Storage**: Supabase Storage for secure image hosting with signed URLs
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger/OpenAPI
- **Code Quality**: ESLint, Prettier

## Getting Started
1. Install dependencies:

```bash
npm install
```

2. Create `.env` from template:

```bash
cp .env.example .env
```

3. Configure DB + Telegram + Supabase + QStash + Gemini in `.env`.

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
SERVER_URL=http://localhost:3000

# Environment (development | production | test)
NODE_ENV=development

# Application Mode (web | schedule)
# web: Full API server with all modules (default)
# schedule: Only database and scheduled tasks, no HTTP endpoints
APP_MODE=web

# ========================================
# Database Configuration - Dual Mode
# ========================================
# Choose ONE of the following configurations:

# Option 1: Local Development (PostgreSQL)
# Use these individual parameters for local development
# SSL is NOT required for local connections
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=username
DB_PASSWORD=password
DB_NAME=dbname
DB_SYNCHRONIZE=false
DB_LOGGING=true
DB_MIGRATIONS_RUN=false

# Option 2: Cloud Deployment (NeonDB)
# Use DATABASE_URL for cloud environments (GitHub Actions, Vercel)
# When DATABASE_URL is set, it takes priority over individual parameters
# SSL is automatically enabled for DATABASE_URL connections
# DATABASE_URL=postgresql://username:password@ep-xxx-xxx.neon.tech/dbname?sslmode=require

# Security Configuration
ACTIVE_SECRET=your-secret-key-here-change-in-production

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook
# Optional: User whitelist for /input command (comma-separated user IDs, empty = allow all)
# TELEGRAM_ALLOWED_USER_IDS=123456789,987654321

# Supabase (Telegram /upload)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=telegram-uploads
SUPABASE_UPLOAD_FOLDER=images

# OCR
OCR_MAX_ATTEMPTS=2

# QSTASH
QSTASH_URL=url_here
QSTASH_TOKEN=token_here
QSTASH_CURRENT_SIGNING_KEY=current_sig_key
QSTASH_NEXT_SIGNING_KEY=next_sig_key

# Gemini
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite,gemini-3-flash-preview
GEMINI_TEMPERATURE=0.0
GEMINI_MAX_OUTPUT_TOKENS=1024
```

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
```

## Troubleshooting
- **Webhook not receiving updates**: Verify `TELEGRAM_WEBHOOK_URL` is HTTPS and publicly reachable.
- **HMAC 401 errors**: Verify `ACTIVE_SECRET` matches between backend and worker, check timestamp is within 5-minute window.
- **QStash signature verification fails**: Verify `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` are correctly set.
- **OCR jobs not being processed**: Check `OCR_WORKER_ENDPOINT` is reachable and `QSTASH_TOKEN` is valid.
- **Gemini API errors**: Verify `GEMINI_API_KEY` is valid and quota is not exceeded.
- **Supabase upload fails**: Check `SUPABASE_SERVICE_ROLE_KEY` permissions and bucket exists.
- **Docs generation fails**: Ensure DB is reachable because app context is fully bootstrapped.
