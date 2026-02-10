import { chromium, Browser, Page } from 'playwright';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { FundPrice } from '../src/database/entities/fund-price.entity';

dotenv.config();

async function crawlFundPrice() {
  const databaseUrl = process.env.DATABASE_URL;

  const dataSourceOptions = databaseUrl
    ? {
        type: 'postgres' as const,
        url: databaseUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'appscript',
      };

  const dataSource = new DataSource({
    ...dataSourceOptions,
    entities: [FundPrice],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    console.log('✅ Browser launched');

    const page: Page = await browser.newPage();

    const crawlUrl =
      'https://cafef.vn/du-lieu/hose/e1vfvn30-quy-etf-vfmvn30.chn';
    console.log(`📍 Navigating to ${crawlUrl}...`);

    await page.goto(crawlUrl, {
      waitUntil: 'networkidle',
    });

    console.log('⏳ Waiting for price element...');
    await page.waitForSelector('#real-time__price', {
      timeout: 10000,
    });

    const priceText: string | null = await page
      .locator('#real-time__price')
      .textContent();

    if (!priceText) {
      throw new Error('Price element found but no text content available');
    }

    let price = parseFloat(priceText.trim());

    if (isNaN(price) || price === 0) {
      throw new Error(`Invalid price value: ${priceText}`);
    }

    // add 1000 VND buffer
    if (price < 1000) {
      price = price * 1000;
    }

    console.log(`💰 Crawled price: ${price}`);

    // Upsert to database
    const fundPriceRepo = dataSource.getRepository(FundPrice);
    const fundName = 'E1VFVN30';

    const existingPrice = await fundPriceRepo.findOne({
      where: { name: fundName },
    });

    if (existingPrice) {
      existingPrice.price = price;
      await fundPriceRepo.save(existingPrice);
      console.log('✏️  Price updated in database');
    } else {
      const newPrice = fundPriceRepo.create({
        name: fundName,
        price,
      });
      await fundPriceRepo.save(newPrice);
      console.log('🆕 New price created in database');
    }

    console.log('✅ Crawl completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Crawl failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔌 Browser closed');
    }
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

void crawlFundPrice();
