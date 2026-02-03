import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonthlyInvestmentReportRepository } from './repositories/monthly-investment-report.repository';
import { FundPrice } from '../database/entities/fund-price.entity';
import { MonthlyReportResponseDto } from './dto/monthly-report-response.dto';
import { MonthlyInvestmentReport } from '../database/entities/monthly-investment-report.entity';

@Injectable()
export class ReportService {
  constructor(
    private readonly monthlyInvestmentReportRepository: MonthlyInvestmentReportRepository,
    @InjectRepository(FundPrice)
    private readonly fundPriceRepository: Repository<FundPrice>,
  ) {}

  async generateMonthlyReport(
    month: string,
    fundName: string,
  ): Promise<MonthlyReportResponseDto> {
    const normalizedMonth = this.normalizeMonth(month);
    const trimmedFundName = fundName.trim();

    const aggregates =
      await this.monthlyInvestmentReportRepository.calculateMonthlyAggregates(
        normalizedMonth,
      );

    const fundPrice = await this.fundPriceRepository.findOne({
      where: { name: trimmedFundName },
    });

    if (!fundPrice) {
      throw new NotFoundException(
        `Fund price not found for ${trimmedFundName}. Make sure crawl-fund-price script ran successfully.`,
      );
    }

    const latestFundPrice = Number(fundPrice.price);
    const certificatesValue =
      aggregates.totalCertificates * latestFundPrice * 1000;

    const report = await this.monthlyInvestmentReportRepository.upsertReport({
      reportMonth: normalizedMonth,
      fundName: trimmedFundName,
      totalInvestment: aggregates.totalInvestment,
      totalCertificates: aggregates.totalCertificates,
      latestFundPrice,
      certificatesValue,
    });

    return this.toResponse(report);
  }

  async getMonthlyReport(
    month: string,
    fundName: string,
  ): Promise<MonthlyReportResponseDto> {
    const report =
      await this.monthlyInvestmentReportRepository.findByMonthAndFund(
        this.normalizeMonth(month),
        fundName.trim(),
      );

    if (!report) {
      throw new NotFoundException(
        `Monthly investment report was not found for ${month} (${fundName}).`,
      );
    }

    return this.toResponse(report);
  }

  private normalizeMonth(month: string): string {
    const trimmed = month.trim();
    if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(trimmed)) {
      throw new BadRequestException('Month must follow YYYY-MM format.');
    }
    return trimmed;
  }

  private toResponse(
    report: MonthlyInvestmentReport,
  ): MonthlyReportResponseDto {
    return {
      reportMonth: report.reportMonth,
      fundName: report.fundName,
      totalInvestment: Number(report.totalInvestment),
      totalCertificates: Number(report.totalCertificates),
      latestFundPrice: Number(report.latestFundPrice),
      certificatesValue: Number(report.certificatesValue),
      updatedAt: report.updatedAt.toISOString(),
    };
  }
}
