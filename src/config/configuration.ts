export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  appMode: process.env.APP_MODE || 'web',
  serverUrl:
    process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`,
  database: {
    // Cloud connection (NeonDB) - takes priority if present
    url: process.env.DATABASE_URL,
    // Local development connection parameters
    type: process.env.DB_TYPE || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nuoilon',
    synchronize: process.env.DB_SYNCHRONIZE === 'true' || false,
    logging: process.env.DB_LOGGING === 'true' || false,
    migrations: ['dist/database/migrations/**/*.js'],
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true' || false,
  },
  security: {
    activeSecret: process.env.ACTIVE_SECRET,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    allowedUserIds: process.env.TELEGRAM_ALLOWED_USER_IDS,
  },
  firebase: {
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    uploadFolder: process.env.FIREBASE_UPLOAD_FOLDER || 'telegram-uploads',
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET,
    uploadFolder: process.env.SUPABASE_UPLOAD_FOLDER || 'images',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: process.env.RABBITMQ_EXCHANGE || 'direct',
    queue: process.env.RABBITMQ_QUEUE || 'ocr-ocr_jobs',
  },
  ocr: {
    maxAttempts: parseInt(process.env.OCR_MAX_ATTEMPTS ?? '2', 10) || 2,
  },
  qstash: {
    url: process.env.QSTASH_URL,
    token: process.env.QSTASH_TOKEN,
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE ?? '0.0') || 0.0,
    maxOutputTokens:
      parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? '1024', 10) || 1024,
  },
});
