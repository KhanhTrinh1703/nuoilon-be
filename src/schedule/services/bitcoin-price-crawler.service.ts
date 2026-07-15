import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  CryptoPriceService,
  CryptoTarget,
} from '../../crypto/crypto-price.service';
import { FundPriceRepository } from '../repositories/fund-price.repository';
import { appendCrawlerLog } from '../utils/logger.util';

@Injectable()
export class CryptoPriceCrawlerService {
  constructor(
    private readonly cryptoPriceService: CryptoPriceService,
    private readonly fundPriceRepository: FundPriceRepository,
  ) {}

  // Runs every 15 minutes, 7 days a week
  @Cron('*/15 * * * *')
  async handleCron(): Promise<void> {
    await Promise.allSettled(
      this.cryptoPriceService
        .getTargets()
        .map((target) => this.crawlOne(target)),
    );
  }

  private async crawlOne(target: CryptoTarget): Promise<void> {
    try {
      const price = await this.cryptoPriceService.getPrice(
        target.binanceSymbol,
      );

      await this.fundPriceRepository.upsertFundPrice(target.name, price);
      await appendCrawlerLog(
        'SUCCESS',
        `Crawled ${target.name} price: ${price}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await appendCrawlerLog(
        'ERROR',
        `${target.name} crawl failed: ${message}`,
      );
    }
  }
}
