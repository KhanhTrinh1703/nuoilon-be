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
import { MonthlyInvestmentReport } from '../database/entities/monthly-investment-report.entity';
import { MonthlyInvestmentReportRepository } from '../report/repositories/monthly-investment-report.repository';
import { SupabaseStorageService } from './services/supabase-storage.service';
import { ReportImageService } from './services/report-image.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExcelTransaction,
      FundPrice,
      UploadLog,
      MonthlyInvestmentReport,
    ]),
    ConfigModule,
  ],
  controllers: [TelegramController],
  providers: [
    TelegramService,
    ExcelTransactionRepository,
    FundPriceRepository,
    UploadLogRepository,
    MonthlyInvestmentReportRepository,
    SupabaseStorageService,
    ReportImageService,
  ],
})
export class TelegramModule {}
