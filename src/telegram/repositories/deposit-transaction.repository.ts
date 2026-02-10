import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositTransaction } from '../../database/entities/deposit-transaction.entity';

@Injectable()
export class DepositTransactionRepository {
  constructor(
    @InjectRepository(DepositTransaction)
    private readonly repository: Repository<DepositTransaction>,
  ) {}

  async getTotalCapital(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('deposit')
      .select('COALESCE(SUM(deposit.capital), 0)', 'total')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  async getTransactionCount(): Promise<number> {
    return this.repository.count();
  }

  async getDistinctMonths(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder('deposit')
      .select("TO_CHAR(deposit.transactionDate, 'YYYY-MM')", 'month')
      .distinct(true)
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string }>();

    return result.map((item) => item.month);
  }

  async hasTransactionsForMonth(month: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('deposit')
      .where("TO_CHAR(deposit.transactionDate, 'YYYY-MM') = :month", {
        month,
      })
      .getCount();

    return count > 0;
  }
}
