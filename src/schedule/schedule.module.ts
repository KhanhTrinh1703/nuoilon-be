import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundPrice } from '../database/entities/fund-price.entity';
import { FundPriceCrawlerService } from './services/fund-price-crawler.service';
import { CryptoPriceCrawlerService } from './services/bitcoin-price-crawler.service';
import { FundPriceRepository } from './repositories/fund-price.repository';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    TypeOrmModule.forFeature([FundPrice]),
    CryptoModule,
  ],
  providers: [
    FundPriceCrawlerService,
    CryptoPriceCrawlerService,
    FundPriceRepository,
  ],
})
export class ScheduleModule {}
