import { Injectable } from '@nestjs/common';
import { GeminiService } from 'src/common/services/ai/gemini.service';
import { FundPriceRepository } from './repositories/fund-price.repository';
import { FundPrice } from 'src/database/entities/fund-price.entity';

@Injectable()
export class WebService {
  private readonly fundName = 'E1VFVN30';

  constructor(
    private readonly geminiService: GeminiService,
    private readonly fundPriceRepository: FundPriceRepository,
  ) {}

  async crawlFundPrices(): Promise<FundPrice> {
    const result = await this.geminiService.getCertificatePrice();
    return await this.fundPriceRepository.upsertFundPrice(
      this.fundName,
      result.price,
    );
  }
}
