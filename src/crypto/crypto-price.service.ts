import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CryptoTarget {
  /** Key stored in fund_prices.name */
  name: string;
  /** Binance trading pair symbol, e.g. BTCUSDT */
  binanceSymbol: string;
}

export interface CryptoPrice {
  name: string;
  price: number;
}

@Injectable()
export class CryptoPriceService {
  /** Add new cryptos here — no other code changes needed */
  private readonly targets: CryptoTarget[] = [
    { name: 'BTC', binanceSymbol: 'BTCUSDT' },
  ];

  private readonly binanceApiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.binanceApiBaseUrl = this.configService.get<string>(
      'crypto.binanceApiBaseUrl',
    )!;
  }

  getTargets(): CryptoTarget[] {
    return this.targets;
  }

  async getPrice(binanceSymbol: string): Promise<number> {
    const url = `${this.binanceApiBaseUrl}?symbol=${binanceSymbol}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Binance API responded with status ${response.status}`);
    }

    const data = (await response.json()) as { symbol: string; price: string };
    const price = parseFloat(data.price);

    if (Number.isNaN(price) || price <= 0) {
      throw new Error(`Invalid price value: ${data.price}`);
    }

    return price;
  }

  async getAllPrices(): Promise<CryptoPrice[]> {
    return Promise.all(
      this.targets.map(async (target) => ({
        name: target.name,
        price: await this.getPrice(target.binanceSymbol),
      })),
    );
  }
}
