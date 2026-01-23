import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

async function main() {
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env file');
    process.exit(1);
  }

  console.log('🔍 Checking current webhook status...\n');

  try {
    // Get webhook info
    const infoResponse = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    
    console.log('Current webhook info:');
    console.log(JSON.stringify(infoResponse.data.result, null, 2));
    console.log('\n');

    if (WEBHOOK_URL) {
      console.log(`🔧 Setting webhook to: ${WEBHOOK_URL}\n`);
      
      // Set webhook
      const setResponse = await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
        {
          url: WEBHOOK_URL,
        }
      );

      if (setResponse.data.ok) {
        console.log('✅ Webhook set successfully!');
        console.log(JSON.stringify(setResponse.data, null, 2));
      } else {
        console.error('❌ Failed to set webhook:');
        console.error(JSON.stringify(setResponse.data, null, 2));
      }
    } else {
      console.log('ℹ️  TELEGRAM_WEBHOOK_URL is not set. Skipping webhook setup.');
      console.log('   The application will attempt to set it automatically on startup.');
    }

    // Get bot info
    console.log('\n📱 Bot Information:');
    const meResponse = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    );
    console.log(JSON.stringify(meResponse.data.result, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

main();
