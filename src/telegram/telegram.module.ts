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
import { OcrJob } from '../database/entities/ocr-job.entity';
import { ExcelTransactionRepository } from './repositories/excel-transaction.repository';
import { DepositTransactionRepository } from './repositories/deposit-transaction.repository';
import { CertificateTransactionRepository } from './repositories/certificate-transaction.repository';
import { FundPriceRepository } from './repositories/fund-price.repository';
import { UploadLogRepository } from './repositories/upload-log.repository';
import { OcrJobRepository } from './repositories/ocr-job.repository';
import { MonthlyInvestmentReport } from '../database/entities/monthly-investment-report.entity';
import { MonthlyInvestmentReportRepository } from '../report/repositories/monthly-investment-report.repository';
import { SupabaseStorageService } from './services/supabase-storage.service';
import { ReportImageService } from './services/report-image.service';
import { TelegramConversationService } from './services/telegram-conversation.service';
import { TelegramCommandsService } from './services/telegram-commands.service';
import { TelegramDepositService } from './services/telegram-deposit.service';
import { TelegramCertificateService } from './services/telegram-certificate.service';
import { TelegramPhotoService } from './services/telegram-photo.service';
import { TelegramOcrService } from './services/telegram-ocr.service';
import { RabbitMQPublisherService } from './services/rabbitmq-publisher.service';
import { UpstashQstashService } from './services/upstash-qstash.service';
import { GeminiOcrService } from './services/gemini-ocr.service';
import { TelegramStartOcrService } from './services/telegram-start-ocr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExcelTransaction,
      DepositTransaction,
      CertificateTransaction,
      FundPrice,
      UploadLog,
      OcrJob,
      MonthlyInvestmentReport,
    ]),
    ConfigModule,
  ],
  controllers: [TelegramController],
  providers: [
    // Main service
    TelegramService,

    // Feature-specific services
    TelegramConversationService,
    TelegramCommandsService,
    TelegramDepositService,
    TelegramCertificateService,
    TelegramPhotoService,
    TelegramOcrService,

    // Repositories
    ExcelTransactionRepository,
    DepositTransactionRepository,
    CertificateTransactionRepository,
    FundPriceRepository,
    UploadLogRepository,
    OcrJobRepository,
    MonthlyInvestmentReportRepository,

    // Utility services
    SupabaseStorageService,
    ReportImageService,
    UpstashQstashService,
    GeminiOcrService,
    TelegramStartOcrService,
    RabbitMQPublisherService,
  ],
})
export class TelegramModule {}
