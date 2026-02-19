import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WebController } from './web.controller';
import { WebService } from './web.service';
import { FundPriceRepository } from './repositories/fund-price.repository';
import { FundPrice } from 'src/database/entities/fund-price.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FundPrice]), ConfigModule],
  controllers: [WebController],
  providers: [WebService, FundPriceRepository],
})
export class WebModule {}
