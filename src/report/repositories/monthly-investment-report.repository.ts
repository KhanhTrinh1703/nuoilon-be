import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MonthlyInvestmentReport } from '../../database/entities/monthly-investment-report.entity';
import { ExcelTransaction } from '../../database/entities/excel-transaction.entity';

@Injectable()
export class MonthlyInvestmentReportRepository extends Repository<MonthlyInvestmentReport> {
  constructor(private readonly dataSource: DataSource) {
    super(MonthlyInvestmentReport, dataSource.createEntityManager());
  }

  async calculateMonthlyAggregates(month: string): Promise<{
    capitalInMonth: number;
    certificatesInMonth: number;
    totalCapital: number;
    totalCertificates: number;
  }> {
    const { startDate, endDate } = this.buildDateRange(month);

    const monthlyRaw = await this.dataSource
      .getRepository(ExcelTransaction)
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.capital), 0)', 'capitalInMonth')
      .addSelect(
        'COALESCE(SUM(transaction.numberOfFundCertificate), 0)',
        'certificatesInMonth',
      )
      .where('transaction.transactionDate IS NOT NULL')
      .andWhere('transaction.transactionDate >= :startDate', { startDate })
      .andWhere('transaction.transactionDate < :endDate', { endDate })
      .getRawOne<{ capitalInMonth: string; certificatesInMonth: string }>();

    const cumulativeRaw = await this.dataSource
      .getRepository(ExcelTransaction)
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.capital), 0)', 'totalCapital')
      .addSelect(
        'COALESCE(SUM(transaction.numberOfFundCertificate), 0)',
        'totalCertificates',
      )
      .where('transaction.transactionDate IS NOT NULL')
      .andWhere('transaction.transactionDate < :endDate', { endDate })
      .getRawOne<{ totalCapital: string; totalCertificates: string }>();

    return {
      capitalInMonth: parseFloat(monthlyRaw?.capitalInMonth ?? '0'),
      certificatesInMonth: parseFloat(monthlyRaw?.certificatesInMonth ?? '0'),
      totalCapital: parseFloat(cumulativeRaw?.totalCapital ?? '0'),
      totalCertificates: parseFloat(cumulativeRaw?.totalCertificates ?? '0'),
    };
  }

  async upsertReport(payload: {
    reportMonth: string;
    fundName: string;
    totalCapital: number;
    totalCertificates: number;
    capitalInMonth: number;
    certificatesInMonth: number;
    latestFundPrice: number;
  }): Promise<MonthlyInvestmentReport> {
    const existing = await this.findOne({
      where: { reportMonth: payload.reportMonth, fundName: payload.fundName },
    });

    if (existing) {
      existing.totalCapital = payload.totalCapital;
      existing.totalCertificates = payload.totalCertificates;
      existing.capitalInMonth = payload.capitalInMonth;
      existing.certificatesInMonth = payload.certificatesInMonth;
      existing.latestFundPrice = payload.latestFundPrice;
      return this.save(existing);
    }

    return this.save(this.create(payload));
  }

  async findByMonthAndFund(
    reportMonth: string,
    fundName: string,
  ): Promise<MonthlyInvestmentReport | null> {
    return this.findOne({ where: { reportMonth, fundName } });
  }

  async findLastNMonthsReports(
    fundName: string,
    limit = 12,
  ): Promise<MonthlyInvestmentReport[]> {
    const effectiveLimit = limit > 0 ? limit : 1;

    return this.createQueryBuilder('report')
      .where('report.fundName = :fundName', { fundName })
      .orderBy('report.reportMonth', 'DESC')
      .limit(effectiveLimit)
      .getMany();
  }

  private buildDateRange(month: string): { startDate: Date; endDate: Date } {
    const [yearValue, monthValue] = month.split('-');
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;

    const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

    return { startDate, endDate };
  }
}
