import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MonthlyInvestmentReport } from '../../database/entities/monthly-investment-report.entity';
import { DepositTransaction } from '../../database/entities/deposit-transaction.entity';
import { CertificateTransaction } from '../../database/entities/certificate-transaction.entity';

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

    const depositRepository = this.dataSource.getRepository(DepositTransaction);
    const certificateRepository = this.dataSource.getRepository(
      CertificateTransaction,
    );

    const capitalInMonthRaw = await depositRepository
      .createQueryBuilder('deposit')
      .select('COALESCE(SUM(deposit.capital), 0)', 'total')
      .where('deposit.transactionDate >= :startDate', { startDate })
      .andWhere('deposit.transactionDate < :endDate', { endDate })
      .getRawOne<{ total: string }>();

    const certificatesInMonthRaw = await certificateRepository
      .createQueryBuilder('cert')
      .select('COALESCE(SUM(cert.numberOfCertificates), 0)', 'total')
      .where('cert.transactionDate >= :startDate', { startDate })
      .andWhere('cert.transactionDate < :endDate', { endDate })
      .getRawOne<{ total: string }>();

    const totalCapitalRaw = await depositRepository
      .createQueryBuilder('deposit')
      .select('COALESCE(SUM(deposit.capital), 0)', 'total')
      .where('deposit.transactionDate < :endDate', { endDate })
      .getRawOne<{ total: string }>();

    const totalCertificatesRaw = await certificateRepository
      .createQueryBuilder('cert')
      .select('COALESCE(SUM(cert.numberOfCertificates), 0)', 'total')
      .where('cert.transactionDate < :endDate', { endDate })
      .getRawOne<{ total: string }>();

    return {
      capitalInMonth: parseFloat(capitalInMonthRaw?.total ?? '0'),
      certificatesInMonth: parseFloat(certificatesInMonthRaw?.total ?? '0'),
      totalCapital: parseFloat(totalCapitalRaw?.total ?? '0'),
      totalCertificates: parseFloat(totalCertificatesRaw?.total ?? '0'),
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
