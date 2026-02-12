export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  appMode: process.env.APP_MODE || 'web',
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
});
