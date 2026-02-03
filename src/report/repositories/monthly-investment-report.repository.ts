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
    totalInvestment: number;
    totalCertificates: number;
  }> {
    const { startDate, endDate } = this.buildDateRange(month);

    const raw = await this.dataSource
      .getRepository(ExcelTransaction)
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.capital), 0)', 'totalInvestment')
      .addSelect(
        'COALESCE(SUM(transaction.numberOfFundCertificate), 0)',
        'totalCertificates',
      )
      .where('transaction.transactionDate IS NOT NULL')
      .andWhere('transaction.transactionDate >= :startDate', { startDate })
      .andWhere('transaction.transactionDate < :endDate', { endDate })
      .getRawOne<{ totalInvestment: string; totalCertificates: string }>();

    return {
      totalInvestment: parseFloat(raw?.totalInvestment ?? '0'),
      totalCertificates: parseFloat(raw?.totalCertificates ?? '0'),
    };
  }

  async upsertReport(payload: {
    reportMonth: string;
    fundName: string;
    totalInvestment: number;
    totalCertificates: number;
    latestFundPrice: number;
    certificatesValue: number;
  }): Promise<MonthlyInvestmentReport> {
    const existing = await this.findOne({
      where: { reportMonth: payload.reportMonth, fundName: payload.fundName },
    });

    if (existing) {
      existing.totalInvestment = payload.totalInvestment;
      existing.totalCertificates = payload.totalCertificates;
      existing.latestFundPrice = payload.latestFundPrice;
      existing.certificatesValue = payload.certificatesValue;
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

  private buildDateRange(month: string): { startDate: Date; endDate: Date } {
    const [yearValue, monthValue] = month.split('-');
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;

    const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

    return { startDate, endDate };
  }
}
