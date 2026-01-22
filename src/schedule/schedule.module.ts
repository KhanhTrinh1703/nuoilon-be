import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { FundPriceCrawlerService } from './fund-price-crawler.service';
import { FundPriceRepository } from './repositories/fund-price.repository';

@Module({
  imports: [NestScheduleModule.forRoot()],
  providers: [FundPriceCrawlerService, FundPriceRepository],
})
export class ScheduleModule {}
