import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { ExcelTransaction } from '../database/entities/excel-transaction.entity';
import { DepositTransaction } from '../database/entities/deposit-transaction.entity';
import { CertificateTransaction } from '../database/entities/certificate-transaction.entity';
import { FundPrice } from '../database/entities/fund-price.entity';
import { UploadLog } from '../database/entities/upload-log.entity';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { DepositTransactionRepository } from './repositories/deposit-transaction.repository';
import { CertificateTransactionRepository } from './repositories/certificate-transaction.repository';
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
      DepositTransaction,
      CertificateTransaction,
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
    DepositTransactionRepository,
    CertificateTransactionRepository,
    FundPriceRepository,
    UploadLogRepository,
    MonthlyInvestmentReportRepository,
    SupabaseStorageService,
    ReportImageService,
  ],
})
export class TelegramModule {}
