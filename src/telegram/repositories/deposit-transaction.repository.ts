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

  async upsertTransaction(data: {
    transactionDate: string;
    capital: number;
    transactionId: string;
  }): Promise<DepositTransaction> {
    const existing = await this.repository.findOne({
      where: { transactionId: data.transactionId },
    });

    if (existing) {
      Object.assign(existing, {
        transactionDate: new Date(data.transactionDate),
        capital: data.capital,
      });
      return await this.repository.save(existing);
    }

    const transaction = this.repository.create({
      transactionDate: new Date(data.transactionDate),
      capital: data.capital,
      transactionId: data.transactionId,
    });

    return await this.repository.save(transaction);
  }

  async upsertFromOcr(data: {
    transactionDate: string;
    amount: number;
    transactionId: string;
  }): Promise<DepositTransaction> {
    return this.upsertTransaction({
      transactionDate: data.transactionDate,
      capital: data.amount,
      transactionId: data.transactionId,
    });
  }
}
