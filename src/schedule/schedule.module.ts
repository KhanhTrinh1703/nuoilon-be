import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundPrice } from '../database/entities/fund-price.entity';
import { FundPriceCrawlerService } from './services/fund-price-crawler.service';
import { CryptoPriceCrawlerService } from './services/bitcoin-price-crawler.service';
import { FundPriceRepository } from './repositories/fund-price.repository';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    TypeOrmModule.forFeature([FundPrice]),
  ],
  providers: [FundPriceCrawlerService, CryptoPriceCrawlerService, FundPriceRepository],
})
export class ScheduleModule {}
