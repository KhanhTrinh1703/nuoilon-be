import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { ExcelTransaction } from '../database/entities/excel-transaction.entity';
import { FundPrice } from '../database/entities/fund-price.entity';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { FundPriceRepository } from '../schedule/repositories/fund-price.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcelTransaction, FundPrice]),
    ConfigModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService, ExcelTransactionRepository, FundPriceRepository],
})
export class TelegramModule {}
