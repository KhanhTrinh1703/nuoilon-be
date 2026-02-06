import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { chromium, Browser } from 'playwright';
import { FundPriceRepository } from '../repositories/fund-price.repository';
import { appendCrawlerLog } from '../utils/logger.util';

@Injectable()
export class FundPriceCrawlerService {
  private readonly fundName = 'E1VFVN30';
  private readonly crawlUrl =
    'https://cafef.vn/du-lieu/hose/e1vfvn30-quy-etf-vfmvn30.chn';

  constructor(private readonly fundPriceRepository: FundPriceRepository) {}

  @Cron('*/5 * * * *')
  async handleCron(): Promise<void> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        timeout: 10000,
      });

      const page = await browser.newPage();

      await page.goto(this.crawlUrl, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      await page.waitForSelector('#real-time__price', {
        timeout: 10000,
      });

      const priceText = await page.locator('#real-time__price').textContent();

      if (!priceText) {
        throw new Error('Price element found but no text content available');
      }

      const price = parseFloat(priceText.trim());

      if (Number.isNaN(price) || price === 0) {
        throw new Error(`Invalid price value: ${priceText}`);
      }

      await this.fundPriceRepository.upsertFundPrice(this.fundName, price);
      await appendCrawlerLog(
        'SUCCESS',
        `Crawled ${this.fundName} price: ${price}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await appendCrawlerLog('ERROR', `Crawl failed: ${message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
