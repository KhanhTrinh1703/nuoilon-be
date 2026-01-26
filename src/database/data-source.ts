import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Determine connection mode based on DATABASE_URL presence
const databaseUrl = process.env.DATABASE_URL;

let dataSourceOptions: DataSourceOptions;

if (databaseUrl) {
  // Cloud mode: Use DATABASE_URL with SSL (NeonDB)
  dataSourceOptions = {
    type: 'postgres',
    url: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true' || false,
  };
} else {
  // Local mode: Use individual parameters without SSL
  dataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'appscript',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true' || false,
  };
}

export const AppDataSource = new DataSource(dataSourceOptions);
