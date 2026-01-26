import * as dotenv from 'dotenv';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

async function main() {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set in .env file');
    process.exit(1);
  }

  console.log('Checking current webhook status...\n');

  try {
    // Get webhook info
    const infoResponse: AxiosResponse<TelegramResponse<WebhookInfo>> =
      await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`,
      );

    console.log('Current webhook info:');
    console.log(JSON.stringify(infoResponse.data.result, null, 2));
    console.log('\n');

    if (WEBHOOK_URL) {
      console.log(`Setting webhook to: ${WEBHOOK_URL}\n`);

      // Set webhook
      const setResponse: AxiosResponse<TelegramResponse<boolean>> =
        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
          {
            url: WEBHOOK_URL,
          },
        );

      if (setResponse.data.ok) {
        console.log('Webhook set successfully!');
        console.log(JSON.stringify(setResponse.data, null, 2));
      } else {
        console.error('Failed to set webhook:');
        console.error(JSON.stringify(setResponse.data, null, 2));
      }
    } else {
      console.log('TELEGRAM_WEBHOOK_URL is not set. Skipping webhook setup.');
      console.log(
        'The application will attempt to set it automatically on startup.',
      );
    }

    // Get bot info
    console.log('\n Bot Information:');
    const meResponse: AxiosResponse<TelegramResponse<BotInfo>> =
      await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    console.log(JSON.stringify(meResponse.data.result, null, 2));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

void main();
