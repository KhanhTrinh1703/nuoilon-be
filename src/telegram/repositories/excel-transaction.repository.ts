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
      .getRawOne<{ distinctmonths: string }>();

    return parseInt(result?.distinctmonths ?? '0') || 0;
  }
}
