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
- `TELEGRAM_BOT_TOKEN`: Get this from BotFather when you create your bot
- `TELEGRAM_WEBHOOK_URL`: Must be HTTPS and publicly accessible (e.g., https://yourdomain.com/telegram/webhook)

### 2. Setting Up the Webhook

When the application starts, it will automatically set the webhook URL with Telegram. The webhook endpoint is:

```
POST /telegram/webhook
```

### 3. Testing Locally

For local development, you can use tools like:
- [ngrok](https://ngrok.com/) - Create a public HTTPS tunnel
- [localtunnel](https://localtunnel.github.io/www/) - Alternative tunneling service

Example with ngrok:
```bash
# Start ngrok
ngrok http 3000

# Use the HTTPS URL from ngrok as your TELEGRAM_WEBHOOK_URL
# Example: https://abc123.ngrok.io/telegram/webhook
```

## Bot Commands

The bot supports the following commands:

### `/hi`
Greets the user with their first name.

**Example:**
```
User: /hi
Bot: Hello, John!
```

### `/report`
Shows fund report with total capital and transaction count from the database.

**Example:**
```
User: /report
Bot: 📊 Fund Report

Total Capital: 1,250,000.00
Total Transactions: 45
```

### `/upload`
Prompts user to upload a file (functionality to be implemented).

**Example:**
```
User: /upload
Bot: Please upload your file.
```

## Architecture

### Files Structure

```
src/telegram/
├── telegram.module.ts              # Module configuration
├── telegram.controller.ts          # Webhook endpoint handler
├── telegram.service.ts             # Bot logic and commands
└── repositories/
    └── excel-transaction.repository.ts  # Database queries
```

### How It Works

1. **Webhook Registration**: When the app starts, `TelegramService` registers the webhook URL with Telegram
2. **Receiving Updates**: Telegram sends updates to `/telegram/webhook` endpoint
3. **Processing Updates**: `TelegramController` receives the update and passes it to `TelegramService`
4. **Command Handling**: `TelegramService` processes commands and responds accordingly

## Development

### Adding New Commands

Edit `src/telegram/telegram.service.ts` and add new command handlers in the `setupCommands()` method:

```typescript
this.bot.command('yourcommand', async (ctx: Context) => {
  // Your command logic here
  ctx.reply('Your response');
});
```

### Database Queries

Add new queries to `ExcelTransactionRepository` as needed:

```typescript
async yourNewQuery(): Promise<any> {
  return this.repository
    .createQueryBuilder('transaction')
    // Your query logic
    .getMany();
}
```

## Troubleshooting

### Webhook Not Working

1. **Check if webhook is set correctly:**
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

2. **Check application logs** for webhook setup errors

3. **Verify HTTPS**: Telegram requires HTTPS for webhooks (not HTTP)

### Bot Not Responding

1. Check if `TELEGRAM_BOT_TOKEN` is correct
2. Verify the webhook URL is accessible from the internet
3. Check application logs for errors
4. Ensure database is running and accessible

### Manual Webhook Setup

If automatic setup fails, you can manually set the webhook:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/telegram/webhook"}'
```

## Security Considerations

1. **Never commit** your `.env` file with real credentials
2. **Use HTTPS** for webhook URL (required by Telegram)
3. Consider adding **webhook validation** to ensure requests are from Telegram
4. **Rate limiting** should be implemented in production

## Production Deployment

1. Ensure your domain has a valid SSL certificate
2. Set environment variables in your hosting platform
3. The webhook will be automatically configured on application start
4. Monitor logs for any webhook-related errors

## References

- [Telegraf Documentation](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Webhooks Guide](https://core.telegram.org/bots/webhooks)

## Future Enhancements

- [ ] Implement file upload handling for `/upload` command
- [ ] Add more detailed calculations for `/report` command
- [ ] Add user authentication
- [ ] Implement webhook signature verification
- [ ] Add rate limiting
- [ ] Add command /start with welcome message
