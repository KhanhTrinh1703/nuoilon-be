import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { chromium, Browser, Page } from 'playwright';
import { FundPriceRepository } from './repositories/fund-price.repository';

@Injectable()
export class FundPriceCrawlerService {
  private readonly logger = new Logger(FundPriceCrawlerService.name);
  private readonly FUND_NAME = 'E1VFVN30';
  private readonly CRAWL_URL =
    'https://cafef.vn/du-lieu/hose/e1vfvn30-quy-etf-vfmvn30.chn';

  constructor(private readonly fundPriceRepository: FundPriceRepository) {}

  @Cron('15 9,13,15 * * *', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async crawlFundPrice(): Promise<void> {
    this.logger.log('Starting fund price crawl...');

    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
      });

      const page: Page = await browser.newPage();
      await page.goto(this.CRAWL_URL, { waitUntil: 'networkidle' });

      // Wait for the price element to be loaded with actual content
      await page.waitForSelector('#real-time__price', { timeout: 10000 });

      const priceText: string | null = await page
        .locator('#real-time__price')
        .textContent();

      if (!priceText) {
        this.logger.error('Price element found but no text content available');
        return;
      }

      const price: number = parseFloat(priceText.trim());

      if (isNaN(price)) {
        this.logger.error(`Failed to parse price: ${priceText}`);
        return;
      }

      await this.fundPriceRepository.upsertFundPrice(this.FUND_NAME, price);

      this.logger.log(
        `Successfully updated fund price for ${this.FUND_NAME}: ${price}`,
      );
    } catch (error) {
      this.logger.error('Error crawling fund price:', error);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
