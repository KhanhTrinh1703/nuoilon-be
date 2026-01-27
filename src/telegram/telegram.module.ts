import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { ExcelTransaction } from '../database/entities/excel-transaction.entity';
import { FundPrice } from '../database/entities/fund-price.entity';
import { UploadLog } from '../database/entities/upload-log.entity';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { FundPriceRepository } from './repositories/fund-price.repository';
import { UploadLogRepository } from './repositories/upload-log.repository';
import { OneDriveService } from './services/onedrive.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcelTransaction, FundPrice, UploadLog]),
    ConfigModule,
  ],
  controllers: [TelegramController],
  providers: [
    TelegramService,
    ExcelTransactionRepository,
    FundPriceRepository,
    UploadLogRepository,
    OneDriveService,
  ],
})
export class TelegramModule {}
