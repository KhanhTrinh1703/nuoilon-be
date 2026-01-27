# Telegram Bot Setup Guide

This guide will help you set up and configure the Telegram webhook bot for the Nuoilon project.

## Prerequisites

- Node.js installed
- PostgreSQL database running
- A Telegram bot created via [@BotFather](https://t.me/botfather)
- A publicly accessible HTTPS URL (for webhook)

## Installation

The required dependencies are already installed:
- `telegraf` - Telegram bot framework

## Configuration

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook
```

**Important:**
# Telegram Bot Setup Guide

This guide walks through configuring the Telegram webhook bot, enabling OneDrive uploads, and validating the `/upload` workflow end-to-end.

## Prerequisites
- Node.js 20+
- PostgreSQL database (local or NeonDB)
- Telegram bot created via [@BotFather](https://t.me/botfather)
- Public HTTPS endpoint (ngrok/localtunnel) for webhook testing
- Azure AD application with Microsoft Graph `Files.ReadWrite.All` application permission

## Environment Variables

```bash
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/v1/telegram/webhook

ONEDRIVE_CLIENT_ID=<azure-app-client-id>
ONEDRIVE_CLIENT_SECRET=<azure-app-client-secret>
ONEDRIVE_TENANT_ID=<azure-tenant-id>
ONEDRIVE_USER_ID=<onedrive-email-or-user-id>
ONEDRIVE_UPLOAD_FOLDER=BotUploads
```

`ONEDRIVE_UPLOAD_FOLDER` defaults to `BotUploads` and is created automatically if missing.

## OneDrive & Azure Setup
1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations → **New registration**. Allow both organizational and personal Microsoft accounts.
2. After creation, capture the **Application (client) ID** and **Directory (tenant) ID**.
3. Under **Certificates & secrets**, create a new client secret and copy its **Value** (shows once).
4. Navigate to **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions** → add `Files.ReadWrite.All`. Click **Grant admin consent**.
5. Determine the OneDrive user principal:
   - Use the Microsoft account email, or
   - Run `GET https://graph.microsoft.com/v1.0/me` in [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) and copy the `id`.
6. Fill the `ONEDRIVE_*` variables, restart the NestJS app, and watch logs for the OneDrive initialization banner.

## Webhook Registration
- On startup, `TelegramService` calls `setWebhook` when `TELEGRAM_WEBHOOK_URL` is populated.
- To verify:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

- Manual setup fallback:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/v1/telegram/webhook"}'
```

## Commands

| Command | Description |
|---------|-------------|
| `/hi` | Sends a playful greeting. |
| `/reports` | Aggregates investment metrics (months, capital, CCQ, NAV) and returns a localized Markdown summary. |
| `/upload` | Prompts for an image (JPG/PNG/GIF/WebP), enforces 20 uploads per user per day, pushes the photo to OneDrive, logs the upload, and replies with the OneDrive link. |

## `/upload` Flow
1. User sends `/upload`.
2. Bot responds with instructions and waits for a `photo` update.
3. Highest-resolution photo variant is downloaded via `ctx.telegram.getFileLink`.
4. MIME type is validated (`image/jpeg`, `image/png`, `image/gif`, `image/webp`).
5. Filename becomes `{timestamp}_{telegramUserId}_{originalName}`.
6. `OneDriveService` uploads using Microsoft Graph (simple upload ≤4 MB, resumable upload otherwise).
7. Entry saved to `upload_logs` with Telegram IDs, names, MIME, size, and OneDrive URL.
8. Bot replies with success + OneDrive link.
9. Failures surface descriptive errors (daily limit exceeded, invalid MIME, download failure, OneDrive failure).

## Rate Limiting & Audit Trail

