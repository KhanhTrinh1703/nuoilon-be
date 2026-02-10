import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyInvestmentReport } from '../database/entities/monthly-investment-report.entity';
import { DepositTransaction } from '../database/entities/deposit-transaction.entity';
import { CertificateTransaction } from '../database/entities/certificate-transaction.entity';
import { FundPrice } from '../database/entities/fund-price.entity';
import { MonthlyInvestmentReportRepository } from './repositories/monthly-investment-report.repository';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { DisableInProductionGuard } from '../common/guards/disable-in-production.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonthlyInvestmentReport,
      DepositTransaction,
      CertificateTransaction,
      FundPrice,
    ]),
  ],
  controllers: [ReportController],
  providers: [
    MonthlyInvestmentReportRepository,
    ReportService,
    DisableInProductionGuard,
  ],
  exports: [ReportService],
})
export class ReportModule {}
