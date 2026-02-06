import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExcelTransaction } from '../../database/entities/excel-transaction.entity';

@Injectable()
export class ExcelTransactionRepository {
  constructor(
    @InjectRepository(ExcelTransaction)
    private readonly repository: Repository<ExcelTransaction>,
  ) {}

  async getTotalCapital(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.capital)', 'total')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  async getTransactionCount(): Promise<number> {
    return this.repository.count();
  }

  async getTotalNumberOfFundCertificates(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.numberOfFundCertificate)', 'total')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  async getDistinctMonthsCount(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('transaction')
      .select(
        "COUNT(DISTINCT(TO_CHAR(transaction.transactionDate, 'YYYY-MM')))",
        'distinctMonths',
      )
      .where('transaction.transactionDate IS NOT NULL')
      .getRawOne<{ distinctMonths: string }>();

    return parseInt(result?.distinctMonths ?? '0') || 0;
  }

  async hasTransactionsForMonth(month: string): Promise<boolean> {
    const [year, monthValue] = month.split('-');
    const startDate = new Date(
      Date.UTC(Number(year), Number(monthValue) - 1, 1, 0, 0, 0, 0),
    );
    const endDate = new Date(
      Date.UTC(Number(year), Number(monthValue), 1, 0, 0, 0, 0),
    );

    const count = await this.repository
      .createQueryBuilder('transaction')
      .where('transaction.transactionDate IS NOT NULL')
      .andWhere('transaction.transactionDate >= :startDate', { startDate })
      .andWhere('transaction.transactionDate < :endDate', { endDate })
      .getCount();

    return count > 0;
  }
}
