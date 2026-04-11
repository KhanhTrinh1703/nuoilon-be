import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { FundPriceRepository } from '../repositories/fund-price.repository';
import { appendCrawlerLog } from '../utils/logger.util';

interface CryptoTarget {
  /** Key stored in fund_prices.name */
  name: string;
  /** Binance trading pair symbol, e.g. BTCUSDT */
  binanceSymbol: string;
}

@Injectable()
export class CryptoPriceCrawlerService {
  /** Add new cryptos here — no other code changes needed */
  private readonly targets: CryptoTarget[] = [
    { name: 'BTC', binanceSymbol: 'BTCUSDT' },
  ];

  private readonly binanceApiBaseUrl: string;

  constructor(
    private readonly fundPriceRepository: FundPriceRepository,
    private readonly configService: ConfigService,
  ) {
    this.binanceApiBaseUrl = this.configService.get<string>(
      'crypto.binanceApiBaseUrl',
    )!;
  }

  // Runs every 15 minutes, 7 days a week
  @Cron('*/15 * * * *')
  async handleCron(): Promise<void> {
    await Promise.allSettled(
      this.targets.map((target) => this.crawlOne(target)),
    );
  }

  private async crawlOne(target: CryptoTarget): Promise<void> {
    const url = `${this.binanceApiBaseUrl}?symbol=${target.binanceSymbol}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Binance API responded with status ${response.status}`);
      }

      const data = (await response.json()) as { symbol: string; price: string };

      const price = parseFloat(data.price);

      if (Number.isNaN(price) || price <= 0) {
        throw new Error(`Invalid price value: ${data.price}`);
      }

      await this.fundPriceRepository.upsertFundPrice(target.name, price);
      await appendCrawlerLog(
        'SUCCESS',
        `Crawled ${target.name} price: ${price}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await appendCrawlerLog('ERROR', `${target.name} crawl failed: ${message}`);
    }
  }
}
